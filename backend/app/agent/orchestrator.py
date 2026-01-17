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
        
        while True:
            response = await llm_client.get_response(
                messages=self.history,
                tools=AGENT_TOOLS,
                stream=False
            )

            message = response.choices[0].message
            self.history.append(message)

            # Check for tool calls
            if message.tool_calls:
                for tool_call in message.tool_calls:
                    if tool_call.function.name == "execute_python":
                        arguments = json.loads(tool_call.function.arguments)
                        code = arguments.get("code")
                        desc = arguments.get("description", "Executing code...")

                        yield json.dumps({
                            "type": "execution",
                            "content": f"### {desc}\n```python\n{code}\n```"
                        })

                        # Execute
                        result = self.executor.execute(code)
                        result_str = result["stdout"] if result["success"] else result["error"]
                        
                        # Record in Notebook
                        self.notebook.add_markdown(f"**Action:** {desc}")
                        self.notebook.add_code(code, [result_str] if result_str else [])

                        yield json.dumps({
                            "type": "result",
                            "content": result_str,
                            "success": result["success"]
                        })

                        self.history.append({
                            "role": "tool",
                            "tool_call_id": tool_call.id,
                            "name": "execute_python",
                            "content": result_str
                        })
                
                continue
            
            else:
                # Final analysis
                self.notebook.add_markdown(f"### Final Insights\n{message.content}")
                self.notebook.save() # Persist changes

                yield json.dumps({
                    "type": "final",
                    "content": message.content
                })
                break


