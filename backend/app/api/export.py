from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from app.services.notebook import get_notebook_builder
import os

router = APIRouter()

@router.get("/export/notebook/{session_id}")
async def export_notebook(session_id: str):
    """
    Returns the generated Jupyter Notebook for a given session.
    """
    builder = get_notebook_builder(session_id)
    file_path = builder.save()
    
    if os.path.exists(file_path):
        return FileResponse(
            path=file_path,
            filename=f"AutoDS_{session_id}.ipynb",
            media_type="application/x-ipynb+json"
        )
    else:
        raise HTTPException(status_code=404, detail="Notebook not found")
