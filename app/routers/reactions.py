import uuid
from datetime import datetime, timezone
from typing import Dict, Any
from fastapi import APIRouter, HTTPException, Depends
from app.database import get_db
from app.dependencies import get_current_user
from app.models.schemas import ReactionToggleRequest

router = APIRouter(prefix="/api/ideas", tags=["Reactions"])

VALID_REACTIONS = {
    "like": "❤️ Like",
    "spark": "💡 Spark",
    "insightful": "💡 Insightful",
    "interesting": "🔍 Interesting",
    "creative": "🎨 Creative",
    "useful": "🛠️ Useful",
    "inspiring": "✨ Inspiring",
    "potential": "🚀 Potential",
    "collaborate": "🤝 Want to Collaborate",
    "learned": "📚 Learned Something",
    "solves_problem": "🎯 Solves a Problem"
}

@router.post("/{idea_id}/react")
def toggle_reaction(idea_id: str, data: ReactionToggleRequest, user: Dict[str, Any] = Depends(get_current_user)):
    """Toggles a meaningful positive reaction. Prevents reaction spam."""
    if data.reaction_type not in VALID_REACTIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid reaction. Permitted values: {list(VALID_REACTIONS.keys())}"
        )

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT user_id, title FROM ideas WHERE id = ?", (idea_id,))
        idea = cursor.fetchone()
        if not idea:
            raise HTTPException(status_code=404, detail="Idea not found")

        cursor.execute("SELECT id FROM reactions WHERE idea_id = ? AND user_id = ? AND reaction_type = ?",
                       (idea_id, user["id"], data.reaction_type))
        existing = cursor.fetchone()

        now = datetime.now(timezone.utc).isoformat()
        if existing:
            # Untoggle reaction
            cursor.execute("DELETE FROM reactions WHERE id = ?", (existing["id"],))
            added = False
            message = f"Removed '{VALID_REACTIONS[data.reaction_type]}' reaction"
        else:
            rx_id = str(uuid.uuid4())
            cursor.execute("""
            INSERT INTO reactions (id, idea_id, user_id, reaction_type, created_at)
            VALUES (?, ?, ?, ?, ?)
            """, (rx_id, idea_id, user["id"], data.reaction_type, now))
            added = True
            message = f"Added '{VALID_REACTIONS[data.reaction_type]}' reaction"

            # Real-Time write to Supabase
            try:
                from app.services.supabase_sync import supabase_sync
                import threading
                threading.Thread(target=supabase_sync.sync_reaction, args=({
                    "id": rx_id,
                    "idea_id": idea_id,
                    "user_id": user["id"],
                    "reaction_type": data.reaction_type,
                    "created_at": now
                },), daemon=True).start()
                threading.Thread(target=supabase_sync.track_browsing_event, kwargs={
                    "page_url": f"/ideas/{idea_id}",
                    "event_type": "reaction_added",
                    "user_id": user["id"],
                    "username": user.get("username"),
                    "metadata": {"idea_id": idea_id, "reaction": data.reaction_type}
                }, daemon=True).start()
            except Exception:
                pass

            # Award reputation points to the creator (+5)
            if idea["user_id"] != user["id"]:
                cursor.execute("""
                UPDATE users SET reputation_score = reputation_score + 5 WHERE id = ?
                """, (idea["user_id"],))

                # Notify creator
                cursor.execute("""
                INSERT INTO notifications (id, user_id, type, title, message, link, created_at)
                VALUES (?, ?, 'reaction', 'New Positive Reaction', ?, ?, ?)
                """, (
                    str(uuid.uuid4()), idea["user_id"],
                    f"@{user['username']} reacted with {VALID_REACTIONS[data.reaction_type]} on your idea '{idea['title']}'",
                    f"/idea/{idea_id}", now
                ))

        # Fetch updated reaction counts
        cursor.execute("""
        SELECT reaction_type, COUNT(*) as count
        FROM reactions WHERE idea_id = ? GROUP BY reaction_type
        """, (idea_id,))
        breakdown = {r["reaction_type"]: r["count"] for r in cursor.fetchall()}

        cursor.execute("SELECT reaction_type FROM reactions WHERE idea_id = ? AND user_id = ?", (idea_id, user["id"]))
        user_reactions = [r["reaction_type"] for r in cursor.fetchall()]

    return {
        "status": "success",
        "added": added,
        "reaction_type": data.reaction_type,
        "message": message,
        "breakdown": breakdown,
        "user_reactions": user_reactions
    }

@router.get("/{idea_id}/reactions")
def get_idea_reactions(idea_id: str):
    """Retrieves full reaction breakdown for an idea."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT reaction_type, COUNT(*) as count
        FROM reactions WHERE idea_id = ? GROUP BY reaction_type
        """, (idea_id,))
        breakdown = {r["reaction_type"]: r["count"] for r in cursor.fetchall()}
    return {"idea_id": idea_id, "reactions": breakdown}
