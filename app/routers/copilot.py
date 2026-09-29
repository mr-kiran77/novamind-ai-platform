import logging
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from app.dependencies import get_current_user, get_optional_user
from app.database import get_db
from app.models.schemas import CopilotRunRequest
from app.services.copilot_service import idea_copilot

logger = logging.getLogger("novamind.copilot_router")
router = APIRouter(prefix="/api/ideas", tags=["Idea Copilot"])

@router.get("/{idea_id}/copilot")
def get_idea_copilot_status(idea_id: str, current_user: Optional[Dict[str, Any]] = Depends(get_optional_user)):
    """Retrieves the live background state, progress, and synthesized intelligence report for an idea."""
    # Verify idea existence
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, title, category, jurisdiction FROM ideas WHERE id = ?", (idea_id,))
        idea = cursor.fetchone()
        if not idea:
            raise HTTPException(status_code=404, detail="Idea not found.")

    report_record = idea_copilot.get_copilot_report(idea_id)
    if not report_record:
        return {
            "idea_id": idea_id,
            "status": "NOT_STARTED",
            "progress": 0,
            "current_step": "Idea Copilot has not been triggered yet.",
            "jurisdiction": idea.get("jurisdiction") or "",
            "report": None,
            "error_message": ""
        }

    return report_record

@router.post("/{idea_id}/copilot/run")
async def trigger_idea_copilot_run(
    idea_id: str,
    payload: CopilotRunRequest = CopilotRunRequest(),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    user: Dict[str, Any] = Depends(get_current_user)
):
    """Triggers or forces a re-analysis run of Idea Copilot in the background."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, user_id, title, category, jurisdiction FROM ideas WHERE id = ?", (idea_id,))
        idea = cursor.fetchone()
        if not idea:
            raise HTTPException(status_code=404, detail="Idea not found.")

        # Update declared jurisdiction if specified
        if payload.jurisdiction is not None:
            cursor.execute("UPDATE ideas SET jurisdiction = ? WHERE id = ?", (payload.jurisdiction.strip(), idea_id))

    # Trigger pipeline in background without blocking HTTP response
    idea_copilot.update_job_status(
        idea_id=idea_id,
        status="PENDING",
        progress=5,
        current_step="Queued for fresh Idea Copilot research & analysis...",
        jurisdiction=payload.jurisdiction or idea.get("jurisdiction") or ""
    )

    background_tasks.add_task(idea_copilot.run_pipeline, idea_id, user["id"], force=payload.force)

    return {
        "status": "QUEUED",
        "message": "Idea Copilot background analysis triggered successfully.",
        "idea_id": idea_id,
        "force": payload.force
    }
