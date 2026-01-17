import shutil
import os
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from app.core.config import settings
from app.services.data_loader import DataLoader
from app.services.executor import get_executor

router = APIRouter()

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    session_id: str = Form(...)
):
    """
    Uploads a dataset, loads it into the session's CodeExecutor as 'df',
    and returns a summary.
    """
    # Ensure upload directory exists
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    
    file_path = os.path.join(settings.UPLOAD_DIR, file.filename)
    
    try:
        # Save file to disk
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Load data
        df = DataLoader.load_file(file_path)
        
        # Inject into Executor State
        executor = get_executor(session_id)
        executor.state["df"] = df
        
        # Generate Profile
        profile = DataLoader.generate_profile(df)
        
        return {
            "filename": file.filename,
            "shape": profile["shape"],
            "columns": profile["columns"],
            "preview": profile["head"],
            "message": "File uploaded and loaded into variable 'df' successfully."
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
