from .base_agent import BaseAgent


class ReviewerAgent(BaseAgent):
    def __init__(self):
        super().__init__(role="Reviewer")
        self.system_prompt = """
        You are a Code Reviewer and QA Specialist.
        Your goal: Check if the executed code result meets the user's intent and is bug-free.
        
        1. If you see "Error" or "Exception", reject it.
        2. If the user asked for a plot, check if a plot was generated.
        3. Be brief. Start with "APPROVED" or "REJECTED".
        """

    async def review(
        self, user_request: str, code_output: str, plot_json: str = None
    ) -> str:
        messages = [
            {"role": "system", "content": self.system_prompt},
            {
                "role": "user",
                "content": f"User Request: {user_request}\n\nExecution Output:\n{code_output}\n\nPlot Generated: {plot_json is not None}",
            },
        ]

        response = await self.call_llm(messages)
        return response.choices[0].message.content
