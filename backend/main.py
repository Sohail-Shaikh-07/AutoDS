import os
import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict
import pandas as pd
import json
from agent import AutoDSAgent
from fastapi import Response
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
        if filename.endswith(".csv"):
            # Optimization: Only read top 100 rows for preview
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
            # Optimization: Only read top 100 rows
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


class EDARequest(BaseModel):
    filename: str


@app.post("/generate_eda")
async def generate_eda(request: EDARequest):
    result = await agent.generate_eda(request.filename)
    return result


@app.get("/download_notebook")
def download_notebook():
    if not agent.session_history:
        return {"error": "No session history available yet."}

    notebook_json = generate_notebook(agent.session_history)

    return Response(
        content=notebook_json,
        media_type="application/x-ipynb+json",
        headers={"Content-Disposition": "attachment; filename=analysis.ipynb"},
    )
