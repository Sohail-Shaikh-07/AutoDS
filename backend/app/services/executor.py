import io
import contextlib
import traceback
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from typing import Dict, Any, Optional

class CodeExecutor:
    def __init__(self):
        # This will hold the variables (like dataframes) across multiple calls in a session
        self.state: Dict[str, Any] = {
            "pd": pd,
            "plt": plt,
            "sns": sns,
        }

    def execute(self, code: str) -> Dict[str, Any]:
        """
        Executes python code and returns the output, errors, and any new state.
        """
        stdout = io.StringIO()
        error = None
        
        try:
            with contextlib.redirect_stdout(stdout):
                # We use exec with our persistent state
                exec(code, self.state)
        except Exception:
            error = traceback.format_exc()

        return {
            "stdout": stdout.getvalue(),
            "error": error,
            "success": error is None
        }

# Global dictionary to store executors per session
session_executors: Dict[str, CodeExecutor] = {}

def get_executor(session_id: str) -> CodeExecutor:
    if session_id not in session_executors:
        session_executors[session_id] = CodeExecutor()
    return session_executors[session_id]
