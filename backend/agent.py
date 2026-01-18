import os
import asyncio
import json
import re
import sys
import io
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
        
        If you need to analyze data, WRITE PYTHON CODE in triple backticks (```python ... ```).
        You have access to a variable `df` which is the currently uploaded dataframe (if any).
        Always explain your plan, then write the code.
        """
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
            # Store DF in memory for execution context
            self.current_context["df"] = df
            self.current_context["active_df_path"] = file_path
            return summary
        except Exception as e:
            return {"error": str(e)}

    def execute_code(self, code: str) -> str:
        """Executes python code in a local context with access to 'df'."""
        # Create limits/sandbox in real prod; here we trust local execution for MVP
        old_stdout = sys.stdout
        redirected_output = io.StringIO()
        sys.stdout = redirected_output

        try:
            # Prepare local scope with 'df' if it exists
            local_scope = self.current_context.copy()
            exec(code, {}, local_scope)
            output = redirected_output.getvalue()
            # Update context if df was modified? For now, assume read-only or in-place
            return (
                output if output.strip() else "(Code executed successfully, no output)"
            )
        except Exception as e:
            return f"Execution Error: {str(e)}"
        finally:
            sys.stdout = old_stdout

    async def process_prompt_stream(
        self, prompt: str
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Calls DeepInfra LLM, streams response, and executes code if found.
        """

        # 1. THINKING
        yield {
            "type": "thinking",
            "content": f"Planning analysis for: '{prompt[:20]}...'",
        }
        await asyncio.sleep(0.5)

        context_msg = "No data loaded."
        if "df" in self.current_context:
            cols = list(self.current_context["df"].columns)
            context_msg = f"Data Loaded. Columns: {cols}. Shape: {self.current_context['df'].shape}"

        yield {"type": "thinking", "content": f"Context: {context_msg}"}
        await asyncio.sleep(0.5)

        # 2. STATUS UPDATE
        yield {"type": "status", "content": "Generating Solution..."}

        # 3. LLM INFERENCE
        full_response = ""
        try:
            messages = [
                {"role": "system", "content": self.system_prompt},
                {"role": "user", "content": f"Context: {context_msg}\nUser: {prompt}"},
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
                    full_response += chunk
                    yield {
                        "type": "response",
                        "content": response_buffer,
                    }

            # 4. CODE EXECUTION CHECK
            code_blocks = re.findall(
                r"```python\s*(.*?)\s*```", full_response, re.DOTALL
            )
            if code_blocks:
                yield {"type": "status", "content": "Executing Code..."}
                yield {
                    "type": "thinking",
                    "content": "Detected Python code. Executing...",
                }

                for code in code_blocks:
                    # Execute
                    result = self.execute_code(code)

                    # Stream result back to user
                    response_buffer += f"\n\n**Execution Result:**\n```\n{result}\n```"
                    yield {"type": "response", "content": response_buffer}

                    yield {
                        "type": "thinking",
                        "content": f"Execution Output: {result[:50]}...",
                    }

            # Done
            yield {"type": "done", "content": "Task Complete"}

        except Exception as e:
            yield {"type": "error", "content": f"LLM Error: {str(e)}"}
