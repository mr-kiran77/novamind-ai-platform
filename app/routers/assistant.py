from fastapi import APIRouter, Depends
from typing import Dict, Any, Optional
from app.models.schemas import AssistantChatRequest
from app.dependencies import get_current_user
from app.database import get_db
from app.services.agent_orchestrator import orchestrator
from app.services.voice_service import voice_service
from app.services.ai_providers import ai_registry

router = APIRouter(prefix="/api/assistant", tags=["AI Personal Assistant"])

@router.post("/chat")
async def chat_with_assistant(data: AssistantChatRequest, user: Dict[str, Any] = Depends(get_current_user)):
    """Conversational interaction with Nova, the AI Innovation Co-Pilot."""
    context_str = ""
    if data.context_idea_id:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT title, raw_content, category FROM ideas WHERE id = ?", (data.context_idea_id,))
            idea = cursor.fetchone()
            if idea:
                context_str = f"Context idea: '{idea['title']}' ({idea['category']}): {idea['raw_content'][:200]}"

    prompt = f"User @{user['username']} asks: {data.message}. {context_str}"
    
    # Run Agent Orchestrator Assistant Pipeline
    agent_res = await orchestrator.dispatch("EVENT_ASSISTANT_QUERY", {
        "message": prompt,
        "user_id": user["id"]
    })
    
    reply = agent_res.get("results", {}).get("assistant", {}).get("reply")
    if not reply:
        provider = ai_registry.get_provider()
        reply = await provider.generate_text(
            prompt,
            system_instruction="You are Nova, the elite AI Innovation Co-Pilot for Novamind. Give insightful, structured, concise, and inspiring engineering advice. Always be constructive and articulate."
        )

    return {
        "reply": reply,
        "context_used": bool(context_str)
    }

@router.post("/voice-command")
async def handle_voice_command(transcript: str, user: Dict[str, Any] = Depends(get_current_user)):
    """Parses spoken voice command into app action and voice reply."""
    result = voice_service.parse_voice_command(transcript)
    return result
