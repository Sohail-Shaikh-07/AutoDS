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


from databaseManager import DatabaseManager
from rag_manager import RAGManager
from kernel_manager import KernelManager


class AutoDSAgent:
    def __init__(self):
        self.db_manager = DatabaseManager()
        self.rag = RAGManager()
        self.kernel = KernelManager()

        # Load System Prompt from prompt.md
        base_dir = os.path.dirname(os.path.abspath(__file__))
        prompt_path = os.path.join(base_dir, "prompt.md")

        try:
            if os.path.exists(prompt_path):
                with open(prompt_path, "r", encoding="utf-8") as f:
                    self.system_prompt = f.read()
                    # Append SQL Instructions dynamically
                    self.system_prompt += "\n\n# Database Capabilities\n"
                    self.system_prompt += (
                        "You have access to a SQL database via `execute_sql(query)`.\n"
                    )
                    self.system_prompt += (
                        "If a database is connected, you can query tables directly.\n"
                    )
                    self.system_prompt += "ALWAYS prefer `SELECT` queries with aggregations for large insights.\n"
            else:
                # Fallback if file missing
                print("WARNING: prompt.md not found. Using fallback.")
                self.system_prompt = "You are AutoDS."
        except Exception as e:
            print(f"Error loading system prompt: {e}")
            self.system_prompt = "You are AutoDS."

        # self.current_context = {} # Deprecated with Kernel

        # Generate unique session ID based on timestamp
        self.session_id = datetime.now().strftime("%Y%m%d_%H%M%S")
        self.history_file = os.path.join(
            base_dir, "cache", "history", f"session_{self.session_id}.json"
        )

    # ...

    async def analyze_file(self, file_path: str) -> Dict[str, Any]:
        """Performs initial analysis of the uploaded file."""
        try:
            # We still read it here to get summary for LLM context
            if file_path.endswith(".csv"):
                df = pd.read_csv(file_path)
                load_cmd = f"import pandas as pd\ndf = pd.read_csv(r'{file_path}')"
            elif file_path.endswith(".xlsx"):
                df = pd.read_excel(file_path)
                load_cmd = f"import pandas as pd\ndf = pd.read_excel(r'{file_path}')"
            else:
                return {"error": "Unsupported file format"}

            # EXECUTE LOAD IN KERNEL
            print(f"Loading data into Kernel: {file_path}")
            self.kernel.execute(load_cmd)

            head_df = df.head(5).astype(object).where(pd.notnull(df.head(5)), None)

            summary = {
                "columns": list(df.columns),
                "shape": df.shape,
                "head": head_df.to_dict(orient="records"),
                "missing_values": df.isnull().sum().to_dict(),
            }

            # Update Context String
            # self.current_context["df"] = df # No longer needed in memory
            # But we need to track that 'df' is available for the LLM prompt context
            self.active_df_path = file_path
            self.active_df_columns = list(df.columns)
            self.active_df_shape = df.shape
            # ...
            # --- INDEXING FOR RAG ---

            # --- INDEXING FOR RAG ---
            # Create a text representation of columns and types
            schema_text = f"Dataset Columns:\n"
            for col in df.columns:
                dtype = str(df[col].dtype)
                sample = str(df[col].iloc[0]) if not df.empty else "N/A"
                schema_text += f"- {col} (Type: {dtype}, Sample: {sample})\n"

            try:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                loop.run_until_complete(
                    self.rag.add_document(
                        schema_text, {"source": "schema", "session_id": self.session_id}
                    )
                )
                loop.close()
            except Exception as e:
                print(f"RAG Indexing Error: {e}")

            return summary
        except Exception as e:
            return {"error": str(e)}

    # ... generate_eda, execute_sql remain unchanged ...

    def execute_code(self, code: str) -> Dict[str, Any]:
        """
        Executes python code in the Persistent Kernel.
        """
        # We delegate entirely to the kernel
        return self.kernel.execute(code)

    async def process_prompt_stream(
        self, prompt: str
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Calls DeepInfra LLM, streams response, and executes code if found.
        """

        # 1. IMMEDIATE HISTORY SAVE (User Prompt)
        self.session_history.append({"role": "user", "content": prompt})
        self._save_history()

        # 1. THINKING & RETRIEVAL
        yield {
            "type": "thinking",
            "content": f"Planning analysis for: '{prompt[:20]}...'",
        }
        await asyncio.sleep(0.5)

        # RAG RETRIEVAL
        yield {"type": "thinking", "content": "Retrieving context from memory..."}
        try:
            retrieved_docs = await self.rag.query(prompt, self.session_id)
            rag_context = (
                "\n".join(retrieved_docs)
                if retrieved_docs
                else "No relevant context found."
            )
        except Exception as e:
            rag_context = f"Retrieval failed: {e}"

        yield {"type": "thinking", "content": f"RAG Context: {rag_context[:100]}..."}

        context_msg = "No data loaded."
        if hasattr(self, "active_df_path"):
            context_msg = f"Data Loaded (in Kernel). Columns: {self.active_df_columns}. Shape: {self.active_df_shape}"

        # Combine Contexts
        full_context_msg = f"{context_msg}\nRelevant Past Info:\n{rag_context}"
        # ...

        yield {"type": "status", "content": "Generating Solution..."}

        # 3. LLM INFERENCE
        full_response = ""
        try:
            messages = [
                {"role": "system", "content": self.system_prompt},
                {
                    "role": "user",
                    "content": f"Context: {full_context_msg}\nUser: {prompt}",
                },
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

                    # Fake stream output...
                    for i in range(0, len(output_text), 4):
                        chunk = output_text[i : i + 4]
                        full_response += chunk
                        yield {
                            "type": "response",
                            "content": full_response,
                        }
                        await asyncio.sleep(0.005)

                    current_execution_output += output_text

                    if "Execution Error:" in result:
                        execution_success = False
                        yield {
                            "type": "thinking",
                            "content": f"Error detected: {result}",
                        }
                        yield {
                            "type": "status",
                            "content": "Error detected. Performing Deep Reflection...",
                        }

                        # --- ENHANCED SELF-HEALING ---
                        # 1. RAG Query for Error
                        error_context = ""
                        try:
                            docs = await self.rag.query(
                                f"Fix python error: {result}", self.session_id
                            )
                            error_context = "\n".join(docs)
                        except:
                            pass

                        # 2. Reflection Prompt
                        reflection_prompt = f"""
                        STOP. The code failed.
                        Error: {result}
                        
                        Context from Memory: {error_context}
                        
                        Analyze WHY it failed. Is the column name wrong? Syntax error?
                        Explain the mistake briefly, THEN provide the corrected code block.
                        """

                        messages.append({"role": "assistant", "content": full_response})
                        messages.append({"role": "user", "content": reflection_prompt})

                        # Call LLM again for fix
                        chat_completion = await self.client.chat.completions.create(
                            model="zai-org/GLM-4.7",
                            messages=messages,
                            stream=True,
                        )

                        fix_buffer = "\n\n**Self-correction:**\n"
                        full_response += fix_buffer
                        current_execution_output = ""  # Reset for new attempt

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

                        break  # Break inner loop to retry outer loop with new blocks

                    else:
                        yield {
                            "type": "thinking",
                            "content": f"Output: {result[:50]}...",
                        }

                if execution_success:
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

                        full_response += "\n\n**Analysis:**\n"
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
            self.session_history.append({"role": "assistant", "content": full_response})
            self._save_history()

            # Done
            yield {"type": "done", "content": "Task Complete"}

        except Exception as e:
            yield {"type": "error", "content": f"LLM Error: {str(e)}"}
