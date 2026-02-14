from typing import List, Dict, Any
from .base_agent import BaseAgent


class PlannerAgent(BaseAgent):
    def __init__(self):
        super().__init__(role="Planner")
        self.system_prompt = """
        You are the Chief Data Scientist Planner.
        Your goal: Break down a complex user request into a sequence of actionable steps for a Python Coder.
        
        Rules:
        1. Output a strictly valid JSON list of strings.
        2. Steps should be atomic (load, clean, analyze, visualize).
        3. Do not write code, just the plan.
        
        Example Input: "Analyze the sales data and forecast for next month."
        Example Output:
        [
            "Load the 'sales.csv' file into a pandas DataFrame.",
            "Check for missing values and clean the 'date' column.",
            "Aggregate sales by month.",
            "Plot the monthly sales trend.",
            "Use a simple linear regression or moving average to forecast next month."
        ]
        """

    async def create_plan(self, user_request: str, data_context: str) -> List[str]:
        messages = [
            {"role": "system", "content": self.system_prompt},
            {
                "role": "user",
                "content": f"Context: {data_context}\n\nRequest: {user_request}",
            },
        ]

        response = await self.call_llm(messages)
        content = response.choices[0].message.content

        # Simple parsing (robustness needed for production)
        try:
            import json

            # Try to find JSON block
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()

            plan = json.loads(content)
            if isinstance(plan, list):
                return plan
            else:
                return [user_request]  # Fallback to single step
        except:
            return [user_request]  # Fallback
