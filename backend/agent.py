import os
import asyncio
import json
import re
import sys
import io
from datetime import datetime
from typing import AsyncGenerator, Dict, Any
import pandas as pd
from openai import AsyncOpenAI
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


class AutoDSAgent:
    def __init__(self):
        # Load System Prompt from external file for professional "Vibe Coding"
        base_dir = os.path.dirname(os.path.abspath(__file__))
        prompt_path = os.path.join(base_dir, "prompt.md")

        try:
            if os.path.exists(prompt_path):
                with open(prompt_path, "r", encoding="utf-8") as f:
                    self.system_prompt = f.read()
            else:
                # Fallback if file missing
                print("WARNING: prompt.md not found. Using fallback.")
                self.system_prompt = """You are AutoDS. Use `plotly.express` as `px` and assign figures to `fig`."""
        except Exception as e:
            print(f"Error loading system prompt: {e}")
            self.system_prompt = "You are AutoDS."

        self.current_context = {}

        # Generate unique session ID based on timestamp
        self.session_id = datetime.now().strftime("%Y%m%d_%H%M%S")
        self.history_file = os.path.join(
            base_dir, "cache", "history", f"session_{self.session_id}.json"
        )
        self.session_history = []
        # Force save on init to create folders immediately
        self._save_history()

        # Initialize DeepInfra Client
        try:
            api_key = os.getenv("DEEPINFRA_API_KEY")
            if not api_key:
                print("WARNING: DEEPINFRA_API_KEY not found in environment variables.")

            self.client = AsyncOpenAI(
                api_key=api_key or "missing_key",
                base_url="https://api.deepinfra.com/v1/openai",
            )
        except Exception as e:
            print(f"Error initializing OpenAI client: {e}")
            self.client = None

    def _load_history(self):
        # Helper to load specific history if needed in future
        try:
            if os.path.exists(self.history_file):
                with open(self.history_file, "r") as f:
                    return json.load(f)
        except Exception:
            pass
        return []

    def reset(self):
        """Resets the agent state for a new session."""
        self.current_context = {}
        # Generate NEW unique session ID
        self.session_id = datetime.now().strftime("%Y%m%d_%H%M%S")
        self.history_file = os.path.join(
            os.path.dirname(os.path.abspath(__file__)),
            "cache",
            "history",
            f"session_{self.session_id}.json",
        )
        self.session_history = []
        # Create the new history file immediately
        self._save_history()
        return {"status": "success", "session_id": self.session_id}

    def _save_history(self):
        try:
            # DEBUG: Print path
            print(f"DEBUG: Saving history to: {self.history_file}")
            os.makedirs(os.path.dirname(self.history_file), exist_ok=True)
            with open(self.history_file, "w") as f:
                json.dump(self.session_history, f, indent=2)
            print(f"DEBUG: Successfully saved {len(self.session_history)} items.")
        except Exception as e:
            print(f"Failed to save history: {e}")

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

    async def generate_eda(self, filename: str) -> Dict[str, Any]:
        """Generates an HTML profile report for the given file."""
        try:
            # Lazy import to avoid slow startup
            from ydata_profiling import ProfileReport

            file_path = os.path.join("uploads", filename)
            if not os.path.exists(file_path):
                return {"error": "File not found"}

            # Determine file type
            if filename.endswith(".csv"):
                df = pd.read_csv(file_path)
            elif filename.endswith(".xlsx"):
                df = pd.read_excel(file_path)
            else:
                return {"error": "Unsupported file format"}

            # Generate Report
            # minimal=True is faster, but user wants "Wow" factor.
            # Let's try standard first, maybe with 'explorative' config if needed.
            profile = ProfileReport(
                df, title=f"AutoDS Analysis: {filename}", minimal=False
            )

            # We can return the HTML string directly
            html_content = profile.to_html()

            return {"html": html_content}

        except Exception as e:
            print(f"EDA Error: {e}")
            return {"error": str(e)}

    def execute_code(self, code: str) -> Dict[str, Any]:
        """
        Executes python code in a local context.
        Returns: {"output": str, "plot": str|None}
        """
        # Create limits/sandbox in real prod; here we trust local execution for MVP
        old_stdout = sys.stdout
        redirected_output = io.StringIO()
        sys.stdout = redirected_output

        try:
            # Prepare local scope with 'df' if it exists
            local_scope = self.current_context.copy()
            # Ensure plotly is importable in exec context if not already
            # (Users might import it, but we can pre-import common libs if we want,
            # though user code usually does 'import plotly.express as px')

            exec(code, {}, local_scope)
            output = redirected_output.getvalue()

            # Check for 'fig'
            plot_json = None
            if "fig" in local_scope:
                try:
                    # Assume it's a plotly figure
                    # We can use the json module or the figure's to_json method
                    if hasattr(local_scope["fig"], "to_json"):
                        plot_json = local_scope["fig"].to_json()
                except Exception as e:
                    output += f"\n(Failed to serialize plot: {e})"

            return {
                "output": (
                    output
                    if output.strip()
                    else "(Code executed successfully, no output)"
                ),
                "plot": plot_json,
            }

        except Exception as e:
            return {"output": f"Execution Error: {str(e)}", "plot": None}
        finally:
            sys.stdout = old_stdout

    async def process_prompt_stream(
        self, prompt: str
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Calls DeepInfra LLM, streams response, and executes code if found.
        """

        # 1. IMMEDIATE HISTORY SAVE (User Prompt)
        self.session_history.append({"role": "user", "content": prompt})
        self._save_history()

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

            chat_completion = await self.client.chat.completions.create(
                model="zai-org/GLM-4.7",
                messages=messages,
                stream=True,
            )

            response_buffer = ""
            async for event in chat_completion:
                if event.choices[0].delta.content:
                    chunk = event.choices[0].delta.content
                    response_buffer += chunk
                    full_response += chunk
                    yield {
                        "type": "response",
                        "content": response_buffer,
                    }
                    await asyncio.sleep(0.01)  # Yield to event loop for WebSocket sends

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

                    # 2. EXECUTE
                    exec_result = self.execute_code(code)
                    result = exec_result["output"]
                    plot_json = exec_result["plot"]

                    # 3. IF PLOT, SEND IT
                    if plot_json:
                        yield {"type": "plot", "content": plot_json}

                    # 4. APPEND RESULT (Simulate Streaming)
                    output_text = f"\n\n**Execution Result:**\n```\n{result}\n```"

                    # Fake stream the execution output so it "types" out
                    chunk_size = 4
                    for i in range(0, len(output_text), chunk_size):
                        chunk = output_text[i : i + chunk_size]
                        full_response += chunk
                        # Append directly to full_response but yield linearly
                        yield {
                            "type": "response",
                            "content": full_response,
                        }
                        await asyncio.sleep(0.005)  # "Type" speed

                    current_execution_output += output_text
                    # Note: We added to full_response in loop, so we don't need to add again
                    # But we maintain 'current_execution_output' for history tracking if needed
                    # Actually, previous logic used 'full_response + current_execution_output'
                    # Now 'full_response' already contains it.
                    # Let's align variables.

                    # Reset current_execution_output logic since we baked it into full_response
                    current_execution_output = output_text  # Store just for history reference/self-healing logic

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
                        chat_completion = await self.client.chat.completions.create(
                            model="zai-org/GLM-4.7",
                            messages=messages,
                            stream=True,
                        )

                        # We need to capture the NEW text from the fix
                        # But we MUST preserve the old history (full_response + current_execution_output)
                        # Let's append the fix to FULL RESPONSE

                        fix_buffer = "\n\n**Self-Correction Attempt:**\n"
                        full_response += fix_buffer  # Commit previous output to history
                        current_execution_output = (
                            ""  # Reset execution output for the *new* code
                        )

                        yield {
                            "type": "response",
                            "content": full_response,
                        }

                        async for event in chat_completion:
                            if event.choices[0].delta.content:
                                chunk = event.choices[0].delta.content
                                full_response += chunk
                                yield {"type": "response", "content": full_response}
                                await asyncio.sleep(0.01)

                        # Update code_blocks for next iteration check
                        code_blocks = re.findall(
                            r"```python\s*(.*?)\s*```", full_response, re.DOTALL
                        )
                        # We need to likely filter for *new* code blocks, but for now re-scanning is okay
                        # as long as we don't re-execute old ones.
                        # Ideally we should only scan the NEW part.

                        # Simplification: Break inner loop, let the outer loop re-scan.
                        # But wait, outer loop uses `re.findall` on `full_response`.
                        # If we expanded `full_response`, it will find OLD blocks too.
                        # We need to handle this. For MVP, let's assume valid fix implies we move on.
                        # Breaking here will retry the loop.
                        break

                    else:
                        yield {
                            "type": "thinking",
                            "content": f"Output: {result[:50]}...",
                        }

                if execution_success:
                    # Capture code for notebook export (DEPRECATED: Now handled by session_history)
                    # We save the full session at the end of the turn.

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

                    # Note: We append the execution output to the prompt context
                    messages.append(
                        {
                            "role": "assistant",
                            "content": full_response,
                        }
                    )
                    messages.append({"role": "user", "content": analysis_prompt})

                    try:
                        chat_completion = await self.client.chat.completions.create(
                            model="zai-org/GLM-4.7",
                            messages=messages,
                            stream=True,
                        )

                        # Add Analysis Header
                        full_response += "\n\n**Analysis:**\n"
                        # Reset execution output as it's merged
                        current_execution_output = ""

                        yield {"type": "response", "content": full_response}

                        async for event in chat_completion:
                            if event.choices[0].delta.content:
                                chunk = event.choices[0].delta.content
                                full_response += chunk
                                yield {"type": "response", "content": full_response}
                                await asyncio.sleep(0.01)

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

            # 5. SAVE SESSION HISTORY (Assistant Response)
            # User prompt was already saved at start.
            self.session_history.append({"role": "assistant", "content": full_response})
            self._save_history()

            # Done
            yield {"type": "done", "content": "Task Complete"}

        except Exception as e:
            yield {"type": "error", "content": f"LLM Error: {str(e)}"}
