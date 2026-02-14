import os
from openai import AsyncOpenAI
from dotenv import load_dotenv

load_dotenv()


class BaseAgent:
    def __init__(self, role: str):
        self.role = role
        try:
            api_key = os.getenv("DEEPINFRA_API_KEY")
            if not api_key:
                print("WARNING: DEEPINFRA_API_KEY not found.")

            self.client = AsyncOpenAI(
                api_key=api_key or "missing_key",
                base_url="https://api.deepinfra.com/v1/openai",
            )
        except Exception as e:
            print(f"Error initializing OpenAI client: {e}")
            self.client = None

    async def call_llm(self, messages, model="zai-org/GLM-4.7", stream=False):
        try:
            return await self.client.chat.completions.create(
                model=model,
                messages=messages,
                stream=stream,
            )
        except Exception as e:
            print(f"LLM Call Error ({self.role}): {e}")
            raise e
