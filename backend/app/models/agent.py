from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Literal
from datetime import datetime

class AgentMessage(BaseModel):
    role: Literal["user", "assistant", "system", "tool"]
    content: str
    tool_calls: Optional[List[Dict[str, Any]]] = None
    tool_call_id: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.now)

class AgentState(BaseModel):
    session_id: str
    messages: List[AgentMessage] = []
    current_status: str = "idle"  # idle, thinking, executing, done, error
    variables: Dict[str, Any] = {} # Store intermediate data like 'df_summary', 'model_metrics'

class AgentRequest(BaseModel):
    session_id: str
    prompt: str
    files: Optional[List[str]] = None

class AgentResponse(BaseModel):
    type: Literal["thought", "code", "result", "error", "final"]
    content: str
    metadata: Optional[Dict[str, Any]] = None
