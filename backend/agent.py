import os
import asyncio
import json
from typing import AsyncGenerator, Dict, Any
import pandas as pd
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


class AutoDSAgent:
    def __init__(self):
        self.system_prompt = """You are AutoDS, an intelligent data science assistant. 
        Your goal is to help users analyze data, build models, and visualize results.
        Always explain your thinking process step-by-step."""
        self.current_context = {}

        # Initialize DeepInfra Client
        self.client = OpenAI(
            api_key=os.getenv("DEEPINFRA_API_KEY"),
            base_url="https://api.deepinfra.com/v1/openai",
        )

    def analyze_file(self, file_path: str) -> Dict[str, Any]:
        """Performs initial analysis of the uploaded file."""
        try:
            if file_path.endswith(".csv"):
                df = pd.read_csv(file_path)
            elif file_path.endswith(".xlsx"):
                df = pd.read_excel(file_path)
            else:
                return {"error": "Unsupported file format"}

            summary = {
                "columns": list(df.columns),
                "shape": df.shape,
                "head": df.head(5).to_dict(orient="records"),
                "missing_values": df.isnull().sum().to_dict(),
            }
            self.current_context["active_df"] = file_path
            return summary
        except Exception as e:
            return {"error": str(e)}

    async def process_prompt_stream(
        self, prompt: str
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Calls DeepInfra LLM and streams the response.
        """

        # 1. THINKING (Simulated for UI experience/Agentic workflow)
        yield {
            "type": "thinking",
            "content": f"Initializing Agent workflow for: '{prompt[:20]}...'",
        }
        await asyncio.sleep(0.5)

        yield {"type": "thinking", "content": "Contextualizing with loaded datasets..."}
        await asyncio.sleep(0.5)

        # 2. STATUS UPDATE
        yield {"type": "status", "content": "Querying GLM-4.7 Model..."}

        # 3. LLM INFERENCE
        try:
            messages = [
                {"role": "system", "content": self.system_prompt},
                {"role": "user", "content": prompt},
            ]

            chat_completion = self.client.chat.completions.create(
                model="zai-org/GLM-4.7",
                messages=messages,
                stream=True,
            )

            response_buffer = ""

            for event in chat_completion:
                if event.choices[0].delta.content:
                    chunk = event.choices[0].delta.content
                    response_buffer += chunk
                    # Yield each chunk as a response update
                    yield {
                        "type": "response",
                        "content": response_buffer,  # Sending full buffer or delta?
                        # Frontend expects full content accumulation or replacement?
                        # Based on my handleServerMessage implementation:
                        # setMessages(prev => [...prev, { role: 'assistant', content: data.content }]);
                        # Wait, handleServerMessage APPENDS a new message on "response" type?
                        # Let's check App.tsx logic.
                    }

            # If the loop finishes, we are done
            yield {"type": "done", "content": "Analysis Complete"}

        except Exception as e:
            yield {"type": "error", "content": f"LLM Error: {str(e)}"}
