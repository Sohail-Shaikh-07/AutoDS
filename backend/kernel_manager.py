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
        Injected logic captures 'fig' (Plotly) or 'plt' (Matplotlib) automatically.
        """
        # Append Plot Capture Wrapper
        plot_catcher = """
import json
import base64
import io
import matplotlib.pyplot as plt

# Check for Plotly 'fig'
if 'fig' in locals() and hasattr(fig, 'to_json'):
    print("PLOT_JSON_START")
    print(fig.to_json())
    print("PLOT_JSON_END")

# Check for Matplotlib
elif plt.get_fignums():
    try:
        buf = io.BytesIO()
        plt.savefig(buf, format='png', bbox_inches='tight')
        buf.seek(0)
        img_str = base64.b64encode(buf.read()).decode('utf-8')
        print("PLOT_IMG_START")
        print(img_str)
        print("PLOT_IMG_END")
        plt.clf()
    except Exception as e:
        print(f"Plot Save Error: {e}")
"""
        full_code = code + "\n" + plot_catcher

        self.kc.execute(full_code)

        output_text = ""
        plot_data = None
        error = None

        # Loop until we get the 'idle' status message
        start_time = time.time()
        while True:
            if time.time() - start_time > timeout:
                error = "Execution timed out."
                break

            try:
                msg = self.kc.get_iopub_msg(timeout=1)
                msg_type = msg["header"]["msg_type"]
                content = msg["content"]

                if msg_type == "stream":
                    text = content["text"]

                    # Check for Plotly Marker
                    if "PLOT_JSON_START" in text:
                        start = text.find("PLOT_JSON_START") + len("PLOT_JSON_START")
                        end = text.find("PLOT_JSON_END")
                        if start != -1 and end != -1:
                            json_str = text[start:end].strip()
                            try:
                                # Validate JSON
                                json.loads(json_str)
                                plot_data = json_str  # It's already JSON string
                                # Remove from visible output
                                text = (
                                    text.replace("PLOT_JSON_START", "")
                                    .replace("PLOT_JSON_END", "")
                                    .replace(json_str, "")
                                )
                            except:
                                pass

                    # Check for Matplotlib Marker
                    if "PLOT_IMG_START" in text:
                        start = text.find("PLOT_IMG_START") + len("PLOT_IMG_START")
                        end = text.find("PLOT_IMG_END")
                        if start != -1 and end != -1:
                            b64_str = text[start:end].strip()
                            # Format for Frontend: {"type": "png", "data": ...}
                            # But wait, frontend expects Plotly JSON usually.
                            # If we send PNG, we need to wrap it in a structure the frontend understands
                            # OR we send it as a separate type.
                            # For now, let's keep it simple: The frontend 'InteractivePlot' handles Plotly.
                            # We might need a new message type 'image' for PNGs.
                            # BUT, let's stick to the current contract: 'plot' type = Plotly JSON.
                            # If it's an image, let's try to convert to a simple Plotly Image layout?
                            # No, that's complex.
                            # Let's just return the b64 and handle it in Agent.
                            plot_data = {"image": b64_str}

                            text = (
                                text.replace("PLOT_IMG_START", "")
                                .replace("PLOT_IMG_END", "")
                                .replace(b64_str, "")
                            )

                    output_text += text

                elif msg_type == "execute_result":
                    data = content.get("data", {})
                    if "text/plain" in data:
                        output_text += str(data["text/plain"]) + "\n"

                elif msg_type == "error":
                    error_name = content.get("ename", "Error")
                    error_val = content.get("evalue", "")
                    error = f"{error_name}: {error_val}\n"
                    output_text += error

                elif msg_type == "status":
                    if content["execution_state"] == "idle":
                        break
            except queue.Empty:
                continue
            except Exception as e:
                print(f"Kernel loop error: {e}")
                break

        return {"output": output_text.strip(), "plot": plot_data, "error": error}

    def shutdown(self):
        self.km.shutdown_kernel()
