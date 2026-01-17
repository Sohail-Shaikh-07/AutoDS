import nbformat as nbf
import os
from datetime import datetime
from app.core.config import settings

class NotebookBuilder:
    def __init__(self, session_id: str):
        self.session_id = session_id
        self.nb = nbf.v4.new_notebook()
        self.nb['cells'] = []
        
        # Add a title and header
        self.add_markdown(f"# AutoDS Analysis Session\n**Session ID:** `{session_id}`\n**Date:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        self.add_markdown("---")

    def add_markdown(self, text: str):
        self.nb['cells'].append(nbf.v4.new_markdown_cell(text))

    def add_code(self, code: str, outputs: list = None):
        cell = nbf.v4.new_code_cell(code)
        if outputs:
            # Simple conversion of stdout strings to nbformat outputs
            cell.outputs = [nbf.v4.new_output('stream', text=o) for o in outputs if isinstance(o, str)]
        self.nb['cells'].append(cell)

    def save(self) -> str:
        """Saves the notebook and returns the file path."""
        os.makedirs(settings.OUTPUT_DIR, exist_ok=True)
        filename = f"analysis_{self.session_id}.ipynb"
        file_path = os.path.join(settings.OUTPUT_DIR, filename)
        
        with open(file_path, 'w', encoding='utf-8') as f:
            nbf.write(self.nb, f)
            
        return file_path

# Store notebook builders per session
session_notebooks = {}

def get_notebook_builder(session_id: str) -> NotebookBuilder:
    if session_id not in session_notebooks:
        session_notebooks[session_id] = NotebookBuilder(session_id)
    return session_notebooks[session_id]
