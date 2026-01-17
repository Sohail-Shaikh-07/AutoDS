from typing import List, AsyncGenerator
from app.core.llm import llm_client
from app.models.agent import AgentMessage, AgentRequest
from app.agent.prompts import SYSTEM_PROMPT
from app.agent.tools import AGENT_TOOLS
from app.services.executor import get_executor
from app.services.notebook import get_notebook_builder
import json

class AgentOrchestrator:
    def __init__(self, session_id: str):
        self.session_id = session_id
        self.executor = get_executor(session_id)
        self.notebook = get_notebook_builder(session_id)
        self.history: List[dict] = [
            {"role": "system", "content": SYSTEM_PROMPT}
        ]

    async def process_message(self, user_input: str) -> AsyncGenerator[str, None]:
        """
        Main loop: User Input -> LLM -> (Tool Calls -> Execution -> LLM) -> Final Response
        """
        self.history.append({"role": "user", "content": user_input})
        self.notebook.add_markdown(f"### User Request\n{user_input}")
        
        max_iterations = 10
        iteration = 0

        while iteration < max_iterations:
            iteration += 1
            
            response = await llm_client.get_response(
                messages=self.history,
                tools=AGENT_TOOLS,
                stream=False
            )

            message = response.choices[0].message
            
            # OpenAI models sometimes return None content when tool_calls are present
            if message.content is None:
                message.content = ""
            
            # Add assistant message (which might have tool_calls) to history
            self.history.append(message)

            # Check for tool calls
            if message.tool_calls:
                for tool_call in message.tool_calls:
                    if tool_call.function.name == "execute_python":
                        try:
                            arguments = json.loads(tool_call.function.arguments)
                            code = arguments.get("code", "")
                            desc = arguments.get("description", "Executing code...")
                            
                            if not code:
                                raise ValueError("No code generated.")
                        except Exception as e:
                            error_msg = f"Error parsing code: {str(e)}"
                            yield json.dumps({"type": "result", "content": error_msg, "success": False})
                            self.history.append({"role": "tool", "tool_call_id": tool_call.id, "name": "execute_python", "content": error_msg})
                            continue

                        yield json.dumps({
                            "type": "execution",
                            "content": f"### {desc}\n```python\n{code}\n```"
                        })

                        # Execute
                        result = self.executor.execute(code)
                        
                        # Handle Success/Error for Notebook and UI
                        if result["success"]:
                            # If code ran but produced no output, tell the LLM explicitly
                            if not result["stdout"].strip() and not result.get("plot"):
                                result_str = "SYSTEM: Code executed successfully but produced no output. Remember to use print() to see results (e.g., print(df.head()))."
                            else:
                                result_str = result["stdout"]
                                if result.get("plot"):
                                    result_str += "\n[Visual Output Generated]"
                        else:
                            result_str = f"ERROR:\n{result['error']}"
                        
                        # Record in Notebook
                        self.notebook.add_markdown(f"**Action:** {desc}")
                        self.notebook.add_code(code, [result_str] if result_str else [])
                        self.notebook.save()

                        yield json.dumps({
                            "type": "result",
                            "content": result_str,
                            "success": result["success"],
                            "plot": result.get("plot") 
                        })

                        # Feed tool result back to history
                        self.history.append({
                            "role": "tool",
                            "tool_call_id": tool_call.id,
                            "name": "execute_python",
                            "content": result_str
                        })
                
                # Continue the loop for LLM to analyze the results
                continue
            
            else:
                # If no more tool calls and we have content, we are done
                if message.content:
                    self.notebook.add_markdown(f"### Final Insights\n{message.content}")
                    self.notebook.save()

                    yield json.dumps({
                        "type": "final",
                        "content": message.content
                    })
                break
        
        if iteration >= max_iterations:
            yield json.dumps({
                "type": "final",
                "content": "I have reached the maximum number of steps for this task. Please refine your request or let me know if you want me to continue."
            })


