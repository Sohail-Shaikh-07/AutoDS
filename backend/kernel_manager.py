import queue
import time
import os
import io
import base64
from typing import Dict, Any, List
from jupyter_client import KernelManager as JKManager


class KernelManager:
    """
    Manages a persistent IPython kernel for stateful execution.
    """

    def __init__(self):
        self.km = JKManager(kernel_name="python3")
        # This will launch the kernel subprocess
        self.km.start_kernel()
        self.kc = self.km.client()
        self.kc.start_channels()

        # Ensure we can talk to it
        try:
            self.kc.wait_for_ready(timeout=60)
            print("Jupyter Kernel Started.")
        except RuntimeError:
            print("Error parsing kernel connection, or timeout.")
            # Fallback or retry logic could go here

    def execute(self, code: str, timeout: int = 30) -> Dict[str, Any]:
        """
        Executes code in the kernel and captures output (stdout, stderr, plots).
        """
        self.kc.execute(code)

        output_text = ""
        plots = []
        error = None
        execution_count = 0

        # Loop until we get the 'idle' status message
        start_time = time.time()
        while True:
            if time.time() - start_time > timeout:
                error = "Execution timed out."
                break

            try:
                # Get IOPub messages (stdout, display, errors)
                msg = self.kc.get_iopub_msg(timeout=1)
                msg_type = msg["header"]["msg_type"]
                content = msg["content"]

                if msg_type == "stream":
                    output_text += content["text"]

                elif msg_type == "execute_result":
                    # The result of the last line (like REPL)
                    execution_count = content.get("execution_count")
                    data = content.get("data", {})
                    if "text/plain" in data:
                        output_text += str(data["text/plain"]) + "\n"

                elif msg_type == "display_data":
                    # This captures plots (e.g. from plt.show() or direct object display)
                    data = content.get("data", {})
                    # Prioritize Plotly JSON if we figure out how to emit it raw
                    # But typically standard display sends image/png or text/html
                    # For Plotly, we strictly enforce 'fig.to_json()' in our prompt.
                    # If the user code just does `fig.show()`, it might not work in headless kernel
                    # unless we configure the renderer.
                    # We will continue to rely on the agent creating `plot_json` variable
                    pass

                elif msg_type == "error":
                    error_name = content.get("ename", "Error")
                    error_val = content.get("evalue", "")
                    traceback = content.get("traceback", [])
                    # ANSI codes removal might be needed for traceback
                    err_msg = f"{error_name}: {error_val}\n"
                    # Add concise traceback
                    output_text += err_msg
                    error = err_msg

                elif msg_type == "status":
                    if content["execution_state"] == "idle":
                        break
            except queue.Empty:
                continue
            except Exception as e:
                print(f"Kernel loop error: {e}")
                break

        # Post-Execution: Extract special variables directly from kernel
        # (This is safer than parsing stdout)
        # We need to run a quick query to get 'fig' or specific variables if we want
        # But 'kc.execute' is async in nature for the results.
        # The simplest way to get 'plot_json' is to ask the kernel to print it or usage of inspect variables.
        # But wait, we can just Inspect variables!

        plot_json = None
        # We check if 'fig' exists and try to dump it
        # However, sending another execute message right now might conflict if not carefully managed.
        # Ideally, the user code should print the plot json or assign it.
        # Let's rely on the Agent Prompt: "Assign fig = ...".
        # We can try to fetch 'fig.to_json()' specifically.

        # Quick hack: We inject a follow-up code to print fig.to_json() if fig exists
        # BUT we can't easily distinguish its output from previous.
        # Better approach: We run a separate execute for plot extraction.

        try:
            # Blocking execute to check for 'fig'
            # We use a unique marker
            check_code = """
import json
if 'fig' in locals() and hasattr(fig, 'to_json'):
    print("PLOT_START_MARKER")
    print(fig.to_json())
    print("PLOT_END_MARKER")
"""
            self.kc.execute(check_code)
            # Consume output
            while True:
                try:
                    msg = self.kc.get_iopub_msg(timeout=1)
                    if msg["header"]["msg_type"] == "stream":
                        txt = msg["content"]["text"]
                        if "PLOT_START_MARKER" in txt:
                            # Extract JSON
                            start = txt.find("PLOT_START_MARKER") + len(
                                "PLOT_START_MARKER"
                            )
                            end = txt.find("PLOT_END_MARKER")
                            if start != -1 and end != -1:
                                potential_json = txt[start:end].strip()
                                # Clean it up and parse
                                try:
                                    json.loads(potential_json)  # Verification
                                    plot_json = potential_json
                                except:
                                    pass
                    if (
                        msg["header"]["msg_type"] == "status"
                        and msg["content"]["execution_state"] == "idle"
                    ):
                        break
                except:
                    break
        except:
            pass

        return {"output": output_text, "plot": plot_json, "error": error}

    def shutdown(self):
        self.km.shutdown_kernel()
