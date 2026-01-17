from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from app.models.agent import AgentRequest
from app.agent.orchestrator import AgentOrchestrator

router = APIRouter()

@router.post("/chat")
async def chat_endpoint(request: AgentRequest):
    """
    Primary chat endpoint. Streams the agent's thought process and response.
    """
    orchestrator = AgentOrchestrator(session_id=request.session_id)
    
    async def event_generator():
        async for event in orchestrator.process_message(request.prompt):
            yield f"{event}\n"

    return StreamingResponse(event_generator(), media_type="application/x-ndjson")
