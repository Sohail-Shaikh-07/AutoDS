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
        self.code_history = []

        # Initialize DeepInfra Client
        try:
            api_key = os.getenv("DEEPINFRA_API_KEY")
            if not api_key:
                print("WARNING: DEEPINFRA_API_KEY not found in environment variables.")
                # We don't crash here, but subsequent calls will fail if key is required

            self.client = OpenAI(
                api_key=api_key or "missing_key",  # Prevent NoneType error immediately
                base_url="https://api.deepinfra.com/v1/openai",
            )
        except Exception as e:
            print(f"Error initializing OpenAI client: {e}")
            self.client = None

    def analyze_file(self, file_path: str) -> Dict[str, Any]:
        """Performs initial analysis of the uploaded file."""
        try:
            if file_path.endswith(".csv"):
                df = pd.read_csv(file_path)
            elif file_path.endswith(".xlsx"):
                df = pd.read_excel(file_path)
            else:
                return {"error": "Unsupported file format"}

            # Sanitize dataframe for JSON serialization (replace NaN with None)
            # df.where(pd.notnull(df), None) is safer than replace in some pandas versions for object conversion
            head_df = df.head(5).astype(object).where(pd.notnull(df.head(5)), None)

            summary = {
                "columns": list(df.columns),
                "shape": df.shape,
                "head": head_df.to_dict(orient="records"),
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

            # 4. CODE EXECUTION & SELF-CORRECTION LOOP
            MAX_RETRIES = 3
            retry_count = 0

            # Initial extraction
            code_blocks = re.findall(
                r"```python\s*(.*?)\s*```", full_response, re.DOTALL
            )

            while code_blocks and retry_count < MAX_RETRIES:
                yield {
                    "type": "status",
                    "content": f"Executing Code (Attempt {retry_count+1})...",
                }

                # We only execute the LAST block if multiple are present, or all?
                # Simplification: Execute all found blocks.
                execution_success = True
                current_execution_output = ""

                for code in code_blocks:
                    yield {"type": "thinking", "content": f"Executing:\n{code[:50]}..."}
                    result = self.execute_code(code)
                    current_execution_output += (
                        f"\n\n**Execution Result:**\n```\n{result}\n```"
                    )

                    if "Execution Error:" in result:
                        execution_success = False
                        yield {
                            "type": "thinking",
                            "content": f"Error detected: {result}",
                        }
                        yield {
                            "type": "status",
                            "content": "Error detected. Attempting Self-Repair...",
                        }

                        # SELF-HEALING: Re-prompt LLM with error
                        repair_prompt = f"""
                        The python code you generated failed with the following error:
                        {result}
                        
                        Please fix the code and output the corrected version in a python code block.
                        Context: {context_msg}
                        """

                        messages.append({"role": "assistant", "content": full_response})
                        messages.append({"role": "user", "content": repair_prompt})

                        # Call LLM again for fix
                        chat_completion = self.client.chat.completions.create(
                            model="zai-org/GLM-4.7",
                            messages=messages,
                            stream=True,
                        )

                        full_response = ""  # Reset for new answer
                        response_buffer = ""  # Reset buffer to stream new answer

                        # Stream the fix to the user
                        yield {
                            "type": "response",
                            "content": f"\n\n**Self-Correction Attempt {retry_count+1}:**\n",
                        }

                        for event in chat_completion:
                            if event.choices[0].delta.content:
                                chunk = event.choices[0].delta.content
                                response_buffer += chunk
                                full_response += chunk
                                yield {"type": "response", "content": response_buffer}

                        # Update code_blocks for next iteration check
                        code_blocks = re.findall(
                            r"```python\s*(.*?)\s*```", full_response, re.DOTALL
                        )
                        break  # Break inner loop to retry outer loop with new code

                    else:
                        yield {
                            "type": "thinking",
                            "content": f"Output: {result[:50]}...",
                        }
                        yield {"type": "response", "content": current_execution_output}

                if execution_success:
                    # Capture code for notebook export
                    for code in code_blocks:
                        self.code_history.append(code)

                    # POST-EXECUTION ANALYSIS
                    yield {"type": "status", "content": "Interpreting Results..."}
                    yield {
                        "type": "thinking",
                        "content": "Code executed. Generating final explanation...",
                    }

                    analysis_prompt = f"""
                    The code executed successfully. 
                    Here is the output:
                    {current_execution_output}
                    
                    Please provide a clear, concise explanation of what this result means for the user's data.
                    """

                    messages.append(
                        {
                            "role": "assistant",
                            "content": full_response + current_execution_output,
                        }
                    )
                    messages.append({"role": "user", "content": analysis_prompt})

                    try:
                        chat_completion = self.client.chat.completions.create(
                            model="zai-org/GLM-4.7",
                            messages=messages,
                            stream=True,
                        )

                        response_buffer = (
                            full_response
                            + current_execution_output
                            + "\n\n**Analysis:**\n"
                        )
                        yield {"type": "response", "content": response_buffer}

                        for event in chat_completion:
                            if event.choices[0].delta.content:
                                chunk = event.choices[0].delta.content
                                response_buffer += chunk
                                yield {"type": "response", "content": response_buffer}

                    except Exception as e:
                        yield {
                            "type": "thinking",
                            "content": f"Error generating summary: {e}",
                        }

                    break  # Exit loop

                retry_count += 1

            if retry_count == MAX_RETRIES:
                yield {
                    "type": "status",
                    "content": "Max retries reached. Execution failed.",
                }
                yield {
                    "type": "response",
                    "content": "\n\n**System:** Could not fix code after multiple attempts.",
                }

            # Done
            yield {"type": "done", "content": "Task Complete"}

        except Exception as e:
            yield {"type": "error", "content": f"LLM Error: {str(e)}"}
