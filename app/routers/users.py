import uuid
import json
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Depends
from app.database import get_db
from app.dependencies import get_current_user, get_optional_user
from app.models.schemas import UserProfileUpdate

router = APIRouter(prefix="/api/users", tags=["Users & Profiles"])

@router.get("/me/dashboard")
def get_user_dashboard(user: Dict[str, Any] = Depends(get_current_user)):
    """Personal innovation dashboard with streaks, badges, analytics, and activities."""
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Aggregate stats
        cursor.execute("SELECT COUNT(*) as idea_count FROM ideas WHERE user_id = ?", (user["id"],))
        idea_count = cursor.fetchone()["idea_count"]

        cursor.execute("""
        SELECT COUNT(r.id) as total_reactions
        FROM reactions r
        JOIN ideas i ON r.idea_id = i.id
        WHERE i.user_id = ?
        """, (user["id"],))
        total_reactions = cursor.fetchone()["total_reactions"]

        cursor.execute("""
        SELECT COUNT(s.id) as total_saves
        FROM saved_ideas s
        JOIN ideas i ON s.idea_id = i.id
        WHERE i.user_id = ?
        """, (user["id"],))
        total_saves = cursor.fetchone()["total_saves"]

        cursor.execute("SELECT COUNT(*) as follower_count FROM follows WHERE following_id = ?", (user["id"],))
        follower_count = cursor.fetchone()["follower_count"]

        cursor.execute("SELECT COUNT(*) as following_count FROM follows WHERE follower_id = ?", (user["id"],))
        following_count = cursor.fetchone()["following_count"]

        cursor.execute("SELECT COUNT(*) as connection_count FROM follows WHERE (follower_id = ? OR following_id = ?) AND is_connection = 1", (user["id"], user["id"]))
        connection_count = cursor.fetchone()["connection_count"]

        # Collaborations pending
        cursor.execute("""
        SELECT c.*, i.title as idea_title, u.username as requester_username
        FROM collaborations c
        JOIN ideas i ON c.idea_id = i.id
        JOIN users u ON c.requester_id = u.id
        WHERE i.user_id = ? AND c.status = 'pending'
        """, (user["id"],))
        pending_collabs = [dict(r) for r in cursor.fetchall()]

        # Notifications
        cursor.execute("""
        SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 10
        """, (user["id"],))
        notifications = [dict(r) for r in cursor.fetchall()]

        # User's recent ideas
        cursor.execute("""
        SELECT id, title, stage, category, created_at, view_count,
               (SELECT COUNT(*) FROM reactions r WHERE r.idea_id = ideas.id) as reaction_count
        FROM ideas WHERE user_id = ? ORDER BY created_at DESC LIMIT 5
        """, (user["id"],))
        recent_ideas = [dict(r) for r in cursor.fetchall()]

    return {
        "user": user,
        "metrics": {
            "idea_count": idea_count,
            "total_reactions": total_reactions,
            "total_saves": total_saves,
            "follower_count": follower_count,
            "following_count": following_count,
            "connection_count": connection_count,
            "reputation_score": user.get("reputation_score", 50),
            "current_streak": user.get("current_streak", 1),
            "longest_streak": user.get("longest_streak", 1)
        },
        "badges": user.get("badges", []),
        "pending_collaborations": pending_collabs,
        "notifications": notifications,
        "recent_ideas": recent_ideas
    }

@router.get("/{username}")
def get_user_profile(username: str, current_user: Optional[Dict[str, Any]] = Depends(get_optional_user)):
    """Public profile view with published ideas, metrics, and badges."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE username = ?", (username.lower().strip(),))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="User profile not found")

        user = dict(row)
        user["interests"] = json.loads(user.get("interests") or "[]")
        user["skills"] = json.loads(user.get("skills") or "[]")
        user["links"] = json.loads(user.get("links") or "[]")
        user["badges"] = json.loads(user.get("badges") or "[]")
        del user["password_hash"]

        # Follow counts
        cursor.execute("SELECT COUNT(*) as c FROM follows WHERE following_id = ?", (user["id"],))
        follower_count = cursor.fetchone()["c"]
        cursor.execute("SELECT COUNT(*) as c FROM follows WHERE follower_id = ?", (user["id"],))
        following_count = cursor.fetchone()["c"]

        # Check if current user is following
        is_following = False
        if current_user:
            cursor.execute("SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?", (current_user["id"], user["id"]))
            is_following = bool(cursor.fetchone())

        # Published ideas
        cursor.execute("""
        SELECT i.*,
               (SELECT COUNT(*) FROM reactions r WHERE r.idea_id = i.id) as reaction_count,
               (SELECT COUNT(*) FROM comments c WHERE c.idea_id = i.id) as comment_count
        FROM ideas i
        WHERE i.user_id = ? AND i.status = 'published'
        ORDER BY i.created_at DESC
        """, (user["id"],))
        ideas = []
        for ir in cursor.fetchall():
            d = dict(ir)
            d["tags"] = json.loads(d.get("tags") or "[]")
            d["media_urls"] = json.loads(d.get("media_urls") or "[]")
            d["structured_data"] = json.loads(d.get("structured_data") or "{}")
            if "embedding" in d:
                del d["embedding"]
            ideas.append(d)

    return {
        "profile": user,
        "follower_count": follower_count,
        "following_count": following_count,
        "is_following": is_following,
        "ideas": ideas
    }

@router.put("/me")
def update_profile(data: UserProfileUpdate, user: Dict[str, Any] = Depends(get_current_user)):
    """Updates user profile details."""
    with get_db() as conn:
        cursor = conn.cursor()
        fields = []
        values = []

        if data.display_name is not None:
            fields.append("display_name = ?")
            values.append(data.display_name)
        if data.avatar_url is not None:
            fields.append("avatar_url = ?")
            values.append(data.avatar_url)
        if data.bio is not None:
            fields.append("bio = ?")
            values.append(data.bio)
        if data.location is not None:
            fields.append("location = ?")
            values.append(data.location)
        if data.education is not None:
            fields.append("education = ?")
            values.append(data.education)
        if data.occupation is not None:
            fields.append("occupation = ?")
            values.append(data.occupation)
        if data.interests is not None:
            fields.append("interests = ?")
            values.append(json.dumps(data.interests))
        if data.skills is not None:
            fields.append("skills = ?")
            values.append(json.dumps(data.skills))
        if data.links is not None:
            fields.append("links = ?")
            values.append(json.dumps(data.links))
        if data.is_private is not None:
            fields.append("is_private = ?")
            values.append(1 if data.is_private else 0)

        if fields:
            values.append(user["id"])
            cursor.execute(f"UPDATE users SET {', '.join(fields)} WHERE id = ?", values)

    from app.services.auth_service import auth_service
    return auth_service.get_user_by_id(user["id"])

@router.post("/{target_user_id}/follow")
def toggle_follow(target_user_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    """Toggles following another innovator."""
    if target_user_id == user["id"]:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM follows WHERE follower_id = ? AND following_id = ?", (user["id"], target_user_id))
        existing = cursor.fetchone()

        now = datetime.now(timezone.utc).isoformat()
        if existing:
            cursor.execute("DELETE FROM follows WHERE id = ?", (existing["id"],))
            # Also reset connection status on reverse
            cursor.execute("UPDATE follows SET is_connection = 0 WHERE follower_id = ? AND following_id = ?", (target_user_id, user["id"]))
            return {"is_following": False, "message": "Unfollowed user"}
        else:
            # Check if target follows user back -> mutual connection!
            cursor.execute("SELECT id FROM follows WHERE follower_id = ? AND following_id = ?", (target_user_id, user["id"]))
            reverse = cursor.fetchone()
            is_conn = 1 if reverse else 0

            cursor.execute("""
            INSERT INTO follows (id, follower_id, following_id, is_connection, created_at)
            VALUES (?, ?, ?, ?, ?)
            """, (str(uuid.uuid4()), user["id"], target_user_id, is_conn, now))

            if reverse:
                cursor.execute("UPDATE follows SET is_connection = 1 WHERE id = ?", (reverse["id"],))

            # Notify target
            cursor.execute("""
            INSERT INTO notifications (id, user_id, type, title, message, link, created_at)
            VALUES (?, ?, 'system', 'New Connection' if ? = 1 else 'New Follower', ?, ?, ?)
            """, (
                str(uuid.uuid4()), target_user_id, is_conn,
                f"@{user['username']} started following you!" if not is_conn else f"You and @{user['username']} are now connected!",
                f"/profile/{user['username']}", now
            ))

            return {"is_following": True, "is_connection": bool(is_conn), "message": "Now following user"}
