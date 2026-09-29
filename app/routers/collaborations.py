import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, Depends
from app.database import get_db
from app.dependencies import get_current_user, get_optional_user
from app.models.schemas import CollaborationCreateRequest, CollaborationStatusUpdate
from app.services.agent_orchestrator import orchestrator
from app.services.proposal_analyzer import proposal_analyzer

router = APIRouter(prefix="/api/ideas", tags=["Collaborations"])

@router.post("/{idea_id}/collaborate")
async def request_collaboration(idea_id: str, data: CollaborationCreateRequest, optional_user: Optional[Dict[str, Any]] = Depends(get_optional_user)):
    """Submits a collaboration request with preferred role and pitch message."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT user_id, title FROM ideas WHERE id = ?", (idea_id,))
        idea = cursor.fetchone()
        if not idea:
            raise HTTPException(status_code=404, detail="Idea not found")

        # Resolve user
        if optional_user and "id" in optional_user:
            user = optional_user
        else:
            cursor.execute("SELECT * FROM users WHERE id != ? LIMIT 1", (idea["user_id"],))
            collab_u = cursor.fetchone()
            user = dict(collab_u) if collab_u else {"id": "user_collab", "username": "collab_builder"}

        if idea["user_id"] == user["id"]:
            raise HTTPException(status_code=400, detail="You are the author of this concept")

        cursor.execute("SELECT id, status FROM collaborations WHERE idea_id = ? AND requester_id = ?", (idea_id, user["id"]))
        existing = cursor.fetchone()
        if existing:
            raise HTTPException(status_code=400, detail=f"Collaboration request already exists with status: '{existing['status']}'")

        collab_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        cursor.execute("""
        INSERT INTO collaborations (id, idea_id, requester_id, role_type, pitch_message, status, created_at)
        VALUES (?, ?, ?, ?, ?, 'pending', ?)
        """, (collab_id, idea_id, user["id"], data.role_type, data.pitch_message, now))

        # Notify creator
        cursor.execute("""
        INSERT INTO notifications (id, user_id, type, title, message, link, created_at)
        VALUES (?, ?, 'collaboration', 'New Collaboration Proposal', ?, ?, ?)
        """, (
            str(uuid.uuid4()), idea["user_id"],
            f"@{user['username']} wants to collaborate as '{data.role_type.capitalize()}' on '{idea['title']}'",
            f"/idea/{idea_id}", now
        ))

    # Run Agent Collaboration Matching in background
    await orchestrator.dispatch("EVENT_COLLABORATION_REQUEST", {
        "idea_id": idea_id,
        "requester_id": user["id"],
        "role_type": data.role_type
    })

    return {
        "status": "success",
        "id": collab_id,
        "message": "Collaboration proposal sent to creator!"
    }

@router.get("/{idea_id}/collaborations")
def get_idea_collaborations(idea_id: str):
    """Lists collaborations for an idea, joined with rich AI screening analyses."""
    import json
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT c.*, u.username, u.display_name, u.avatar_url, u.skills, u.bio,
               ca.id as analysis_id,
               ca.overall_score,
               ca.relevance_score,
               ca.specificity_score,
               ca.contribution_value_score,
               ca.commitment_score,
               ca.category as ai_category,
               ca.summary as ai_summary,
               ca.strengths as ai_strengths,
               ca.concerns as ai_concerns,
               ca.model_version as ai_model_version,
               ca.status as ai_analysis_status,
               ca.created_at as ai_analyzed_at
        FROM collaborations c
        JOIN users u ON c.requester_id = u.id
        LEFT JOIN collaboration_analyses ca ON ca.collaboration_id = c.id
        WHERE c.idea_id = ?
        ORDER BY c.created_at DESC
        """, (idea_id,))
        rows = cursor.fetchall()

    result = []
    for r in rows:
        d = dict(r)
        analysis_obj = None
        if d.get("overall_score") is not None:
            analysis_obj = {
                "id": d.get("analysis_id"),
                "collaboration_id": d["id"],
                "idea_id": d["idea_id"],
                "overall_score": d["overall_score"],
                "relevance_score": d.get("relevance_score", d["overall_score"]),
                "specificity_score": d.get("specificity_score", d["overall_score"]),
                "contribution_value_score": d.get("contribution_value_score", d["overall_score"]),
                "commitment_score": d.get("commitment_score", d["overall_score"]),
                "category": d.get("ai_category", "MEDIUM_PRIORITY"),
                "summary": d.get("ai_summary", ""),
                "strengths": json.loads(d.get("ai_strengths") or "[]") if isinstance(d.get("ai_strengths"), str) else (d.get("ai_strengths") or []),
                "concerns": json.loads(d.get("ai_concerns") or "[]") if isinstance(d.get("ai_concerns"), str) else (d.get("ai_concerns") or []),
                "model_version": d.get("ai_model_version", "gemini-2.5-flash"),
                "status": d.get("ai_analysis_status", "analyzed"),
                "created_at": d.get("ai_analyzed_at")
            }
            d["ai_seriousness_score"] = d["overall_score"]
            d["ai_classification"] = d.get("ai_category", "medium").lower()
            d["ai_rationale"] = d.get("ai_summary", "")

        d["analysis"] = analysis_obj
        result.append(d)

    return {"collaborations": result}

@router.post("/{idea_id}/collaborations/{collab_id}/analyze")
async def analyze_single_proposal_endpoint(
    idea_id: str,
    collab_id: str,
    force: bool = False,
    user: Dict[str, Any] = Depends(get_current_user)
):
    """Analyzes or re-analyzes a single collaboration proposal with Gemini."""
    import json
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, title, category, raw_content FROM ideas WHERE id = ?", (idea_id,))
        idea = cursor.fetchone()
        if not idea:
            raise HTTPException(status_code=404, detail="Idea not found")

        cursor.execute("""
        SELECT c.*, u.username, u.skills
        FROM collaborations c
        JOIN users u ON c.requester_id = u.id
        WHERE c.id = ? AND c.idea_id = ?
        """, (collab_id, idea_id))
        collab = cursor.fetchone()
        if not collab:
            raise HTTPException(status_code=404, detail="Collaboration proposal not found")

    skills = json.loads(collab.get("skills") or "[]") if isinstance(collab.get("skills"), str) else (collab.get("skills") or [])
    analysis = await proposal_analyzer.analyze_single_proposal(
        collab_id=collab_id,
        idea_id=idea_id,
        idea_title=idea["title"],
        idea_category=idea["category"],
        idea_context=idea.get("raw_content", ""),
        pitch_message=collab.get("pitch_message", ""),
        role_type=collab.get("role_type", "technical"),
        requester_skills=skills,
        force=force
    )

    return {"status": "success", "analysis": analysis}

@router.put("/collaborations/{collab_id}/status")
def update_collaboration_status(collab_id: str, data: CollaborationStatusUpdate, user: Dict[str, Any] = Depends(get_current_user)):
    """Accepts or declines a collaboration proposal with human owner control."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT c.*, i.user_id as author_id, i.title as idea_title
        FROM collaborations c
        JOIN ideas i ON c.idea_id = i.id
        WHERE c.id = ?
        """, (collab_id,))
        collab = cursor.fetchone()
        if not collab:
            raise HTTPException(status_code=404, detail="Collaboration request not found")
        if collab["author_id"] != user["id"] and user["role"] not in ["moderator", "admin"]:
            raise HTTPException(status_code=403, detail="Only idea author can accept/decline collaborators")

        cursor.execute("UPDATE collaborations SET status = ? WHERE id = ?", (data.status, collab_id))

        now = datetime.now(timezone.utc).isoformat()
        if data.status == "accepted":
            # Award reputation points (+50)
            cursor.execute("UPDATE users SET reputation_score = reputation_score + 50 WHERE id = ?", (collab["requester_id"],))

        # Notify requester
        cursor.execute("""
        INSERT INTO notifications (id, user_id, type, title, message, link, created_at)
        VALUES (?, ?, 'collaboration', 'Collaboration Update', ?, ?, ?)
        """, (
            str(uuid.uuid4()), collab["requester_id"],
            f"Your collaboration request for '{collab['idea_title']}' was {data.status}!",
            f"/idea/{collab['idea_id']}", now
        ))

    return {
        "status": "success",
        "collab_status": data.status,
        "message": f"Collaboration proposal {data.status} successfully!"
    }
