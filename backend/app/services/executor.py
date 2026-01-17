import io
import contextlib
import traceback
import pandas as pd
import matplotlib
matplotlib.use('Agg') # Non-interactive backend
import matplotlib.pyplot as plt
import seaborn as sns
import base64
from typing import Dict, Any, Optional

class CodeExecutor:
    def __init__(self):
        self.state: Dict[str, Any] = {
            "pd": pd,
            "plt": plt,
            "sns": sns,
        }

    def execute(self, code: str) -> Dict[str, Any]:
        stdout = io.StringIO()
        error = None
        plot_base64 = None
        
        try:
            # Clear previous plots
            plt.clf()
            plt.close('all')
            
            with contextlib.redirect_stdout(stdout):
                exec(code, self.state)
            
            # Check if a plot was created
            if plt.get_fignums():
                buf = io.BytesIO()
                plt.savefig(buf, format='png', bbox_inches='tight')
                buf.seek(0)
                plot_base64 = base64.b64encode(buf.read()).decode('utf-8')
                plt.close('all')

        except Exception:
            error = traceback.format_exc()

        return {
            "stdout": stdout.getvalue(),
            "error": error,
            "success": error is None,
            "plot": plot_base64
        }

session_executors: Dict[str, CodeExecutor] = {}

def get_executor(session_id: str) -> CodeExecutor:
    if session_id not in session_executors:
        session_executors[session_id] = CodeExecutor()
    return session_executors[session_id]