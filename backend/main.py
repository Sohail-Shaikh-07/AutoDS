import os
import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict
import pandas as pd
import json
from agent import AutoDSAgent
from fastapi.responses import FileResponse, Response
from notebook_generator import generate_notebook
from pydantic import BaseModel

app = FastAPI(title="AutoDS API")

app.add_middleware(
    CORSMiddleware,
    # Allow both localhost ports and 127.0.0.1
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Agent
agent = AutoDSAgent()


class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)


manager = ConnectionManager()


@app.get("/")
def read_root():
    return {"status": "AutoDS Backend Running"}


@app.websocket("/ws/chat")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            user_prompt = message_data.get("prompt")

            if user_prompt:
                # Notify user that processing started
                await manager.send_personal_message(
                    json.dumps(
                        {"type": "status", "content": "Received prompt. Processing..."}
                    ),
                    websocket,
                )

                # Stream thoughts and final response from Agent
                async for update in agent.process_prompt_stream(user_prompt):
                    await manager.send_personal_message(json.dumps(update), websocket)

    except WebSocketDisconnect:
        manager.disconnect(websocket)
        print("Client disconnected")


@app.post("/upload")
def upload_file(file: UploadFile = File(...)):
    file_location = f"uploads/{file.filename}"
    os.makedirs("uploads", exist_ok=True)
    with open(file_location, "wb+") as file_object:
        # file.file is a SpooledTemporaryFile, read() is sync
        file_object.write(file.file.read())

    # Trigger initial analysis (Sync Pandas operation)
    summary = agent.analyze_file(file_location)

    return {"info": f"file '{file.filename}' saved", "summary": summary}


@app.get("/files/{filename}")
def get_file(filename: str):
    file_path = f"uploads/{filename}"
    if not os.path.exists(file_path):
        return {"error": "File not found"}

    try:
        # LIMIT PREVIEW TO 100 ROWS FOR PERFORMANCE (AI uses full data)
        if filename.endswith(".csv"):
            df = pd.read_csv(file_path, nrows=100)
            # Replace NaNs for JSON safety (same as agent)
            df = df.where(pd.notnull(df), None)
            return {
                "filename": filename,
                "type": "csv",
                "columns": list(df.columns),
                "data": df.to_dict(orient="records"),
            }
        elif filename.endswith(".xlsx"):
            df = pd.read_excel(file_path, nrows=100)
            df = df.where(pd.notnull(df), None)
            return {
                "filename": filename,
                "type": "xlsx",
                "columns": list(df.columns),
                "data": df.to_dict(orient="records"),
            }
        else:
            # For other files, maybe verify text?
            return {"error": "Preview not supported for this file type"}
    except Exception as e:
        return {"error": f"Failed to read file: {str(e)}"}


@app.post("/reset_session")
def reset_session():
    result = agent.reset()
    return result


@app.post("/db/connect")
def connect_db(request: DBConnectRequest):
    result = agent.db_manager.connect(request.dict())
    return result


@app.get("/db/schema")
def get_db_schema():
    result = agent.db_manager.get_schema()
    return result


class DBConnectRequest(BaseModel):
    type: str
    host: str
    port: int
    user: str
    password: str
    database: str


class EDARequest(BaseModel):
    filename: str


@app.post("/generate_eda")
async def generate_eda(request: EDARequest):
    result = await agent.generate_eda(request.filename)
    return result

    return Response(
        content=notebook_json,
        media_type="application/x-ipynb+json",
        headers={"Content-Disposition": "attachment; filename=analysis.ipynb"},
    )


@app.get("/list_files")
def list_files():
    """Returns all available files: Uploads, Models, and Generated Notebooks."""
    files = []

    # 1. Uploads
    if os.path.exists("uploads"):
        for f in os.listdir("uploads"):
            files.append({"name": f, "type": f.split(".")[-1], "category": "dataset"})

    # 2. Models
    if os.path.exists("backend/models"):
        for f in os.listdir("backend/models"):
            files.append({"name": f, "type": "pkl", "category": "model"})

    # 3. Root Notebooks (train.ipynb)
    for f in os.listdir("."):
        if f.endswith(".ipynb"):
            files.append({"name": f, "type": "ipynb", "category": "notebook"})

    return files


@app.get("/download/{filename}")
def download_file(filename: str):
    # Security check needed in prod, simplified for MVP
    # Check locations
    possible_paths = [
        f"uploads/{filename}",
        f"backend/models/{filename}",
        filename,  # Root
    ]

    for path in possible_paths:
        if os.path.exists(path):
            return FileResponse(path, filename=filename)

    return {"error": "File not found"}
