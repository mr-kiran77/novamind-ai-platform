import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, Depends
from app.database import get_db
from app.dependencies import get_current_user
from app.models.schemas import CommentCreateRequest
from app.services.agent_orchestrator import orchestrator
from app.services.moderation_service import moderation_service

router = APIRouter(prefix="/api/ideas", tags=["Comments & Discussions"])

@router.get("/{idea_id}/comments")
def get_idea_comments(idea_id: str):
    """Retrieves threaded discussion comments for an idea."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT c.*, u.username, u.display_name, u.avatar_url, u.reputation_score
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.idea_id = ? AND c.safety_status = 'approved'
        ORDER BY c.created_at ASC
        """, (idea_id,))
        rows = cursor.fetchall()

    comments = [dict(r) for r in rows]
    
    # Organize into threaded hierarchy
    top_level = []
    reply_map = {}
    for c in comments:
        c["replies"] = []
        if not c["parent_id"]:
            top_level.append(c)
        else:
            if c["parent_id"] not in reply_map:
                reply_map[c["parent_id"]] = []
            reply_map[c["parent_id"]].append(c)

    for c in top_level:
        c["replies"] = reply_map.get(c["id"], [])

    return {"comments": top_level, "total_count": len(comments)}

@router.post("/{idea_id}/comments")
async def post_comment(idea_id: str, data: CommentCreateRequest, user: Dict[str, Any] = Depends(get_current_user)):
    """Posts a comment or constructive suggestion with automated safety and toxicity screening."""
    # Run Agent Toxicity & Moderation Pipeline
    agent_res = await orchestrator.dispatch("EVENT_COMMENT_POSTED", {
        "content": data.content,
        "idea_id": idea_id,
        "user_id": user["id"]
    })

    safety_output = agent_res["results"].get("safety", {})
    policy = safety_output.get("policy_decision", "published")

    if policy == "rejected":
        # First offense: issue warning strike
        strike_info = moderation_service.issue_strike(
            user["id"],
            f"Violated community discussion standards: {', '.join(safety_output.get('violations', ['Abusive language']))}",
            "warning",
            "Automated Toxicity Detection Agent"
        )
        raise HTTPException(
            status_code=400,
            detail=f"Comment rejected by Constructive Discussion Guard. Notice: {strike_info['severity'].capitalize()} recorded."
        )

    comment_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT user_id, title FROM ideas WHERE id = ?", (idea_id,))
        idea = cursor.fetchone()
        if not idea:
            raise HTTPException(status_code=404, detail="Idea not found")

        cursor.execute("""
        INSERT INTO comments (id, idea_id, user_id, parent_id, content, discussion_type, comment_type, safety_status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'approved', ?)
        """, (comment_id, idea_id, user["id"], data.parent_id, data.content, data.discussion_type, data.comment_type, now))

        # Award constructive comment points (+10)
        cursor.execute("UPDATE users SET reputation_score = reputation_score + 10 WHERE id = ?", (user["id"],))

        # Notify idea creator
        if idea["user_id"] != user["id"]:
            cursor.execute("""
            INSERT INTO notifications (id, user_id, type, title, message, link, created_at)
            VALUES (?, ?, 'comment', 'New Discussion Comment', ?, ?, ?)
            """, (
                str(uuid.uuid4()), idea["user_id"],
                f"@{user['username']} commented on your idea '{idea['title']}'",
                f"/idea/{idea_id}", now
            ))

    # Real-Time write to Supabase
    try:
        from app.services.supabase_sync import supabase_sync
        import threading
        threading.Thread(target=supabase_sync.sync_comment, args=({
            "id": comment_id,
            "idea_id": idea_id,
            "user_id": user["id"],
            "content": data.content,
            "discussion_type": data.discussion_type,
            "comment_type": data.comment_type,
            "safety_status": "approved",
            "created_at": now
        },), daemon=True).start()
        threading.Thread(target=supabase_sync.track_browsing_event, kwargs={
            "page_url": f"/ideas/{idea_id}",
            "event_type": "comment_posted",
            "user_id": user["id"],
            "username": user.get("username"),
            "metadata": {"idea_id": idea_id, "comment_type": data.comment_type}
        }, daemon=True).start()
    except Exception:
        pass

    return {
        "id": comment_id,
        "idea_id": idea_id,
        "content": data.content,
        "comment_type": data.comment_type,
        "is_constructive": safety_output.get("is_constructive", False),
        "created_at": now,
        "user": {
            "id": user["id"],
            "username": user["username"],
            "display_name": user["display_name"],
            "avatar_url": user["avatar_url"]
        }
    }
