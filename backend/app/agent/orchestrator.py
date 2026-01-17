from typing import List, AsyncGenerator
from app.core.llm import llm_client
from app.models.agent import AgentMessage, AgentRequest
from app.agent.prompts import SYSTEM_PROMPT
import json

class AgentOrchestrator:
    def __init__(self, session_id: str):
        self.session_id = session_id
        self.history: List[dict] = [
            {"role": "system", "content": SYSTEM_PROMPT}
        ]

    async def process_message(self, user_input: str) -> AsyncGenerator[str, None]:
        """
        Main loop: User Input -> LLM -> (Tool Calls) -> Final Response
        Yields JSON strings representing the stream of events.
        """
        
        # 1. Add user message to history
        self.history.append({"role": "user", "content": user_input})
        
        # 2. Call LLM
        response_stream = await llm_client.get_response(
            messages=self.history,
            stream=True
        )

        current_content = ""
        
        # 3. Stream response
        async for chunk in response_stream:
            if chunk.choices[0].delta.content:
                content = chunk.choices[0].delta.content
                current_content += content
                
                # Yield thinking/text update
                yield json.dumps({
                    "type": "thought",
                    "content": content
                })

        # 4. Save assistant response to history
        self.history.append({"role": "assistant", "content": current_content})
        
        # TODO: Handle Tool Calls (Next Step)
