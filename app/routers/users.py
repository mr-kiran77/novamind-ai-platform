import uuid
import json
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, Any, Optional
import aiofiles
from fastapi import APIRouter, HTTPException, Depends, Request, UploadFile, File
from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user, get_optional_user
from app.services.auth_service import auth_service
from app.models.schemas import (
    UserProfileUpdate,
    UserSettingsUpdate,
    PasswordChangeRequest,
    AccountDeleteRequest,
    FeedbackSubmitRequest,
)

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

@router.put("/me")
def update_profile(data: UserProfileUpdate, user: Dict[str, Any] = Depends(get_current_user)):
    """Updates user profile details."""
    with get_db() as conn:
        cursor = conn.cursor()
        fields = []
        values = []

        if data.display_name is not None:
            fields.append("display_name = ?")
            values.append(data.display_name.strip())
        if data.avatar_url is not None:
            fields.append("avatar_url = ?")
            values.append(data.avatar_url.strip())
        if data.bio is not None:
            fields.append("bio = ?")
            values.append(data.bio.strip())
        if data.location is not None:
            fields.append("location = ?")
            values.append(data.location.strip())
        if data.education is not None:
            fields.append("education = ?")
            values.append(data.education.strip())
        if data.occupation is not None:
            fields.append("occupation = ?")
            values.append(data.occupation.strip())
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

    return auth_service.get_user_by_id(user["id"])

@router.get("/me/settings")
def get_user_settings(user: Dict[str, Any] = Depends(get_current_user)):
    """Fetches user preferences and settings, auto-initializing defaults if needed."""
    now = datetime.now(timezone.utc).isoformat()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM user_settings WHERE user_id = ?", (user["id"],))
        row = cursor.fetchone()
        if not row:
            cursor.execute("""
            INSERT INTO user_settings (
                user_id, theme, notify_collaborations, notify_polls,
                notify_reactions, notify_copilot, auto_run_copilot,
                default_jurisdiction, ai_tone, updated_at
            ) VALUES (?, 'dark', 1, 1, 1, 1, 1, '', 'balanced', ?)
            """, (user["id"], now))
            cursor.execute("SELECT * FROM user_settings WHERE user_id = ?", (user["id"],))
            row = cursor.fetchone()

    res = dict(row)
    return {
        "user_id": res["user_id"],
        "theme": res.get("theme", "dark"),
        "notify_collaborations": bool(res.get("notify_collaborations", 1)),
        "notify_polls": bool(res.get("notify_polls", 1)),
        "notify_reactions": bool(res.get("notify_reactions", 1)),
        "notify_copilot": bool(res.get("notify_copilot", 1)),
        "auto_run_copilot": bool(res.get("auto_run_copilot", 1)),
        "default_jurisdiction": res.get("default_jurisdiction", "") or "",
        "ai_tone": res.get("ai_tone", "balanced") or "balanced",
        "updated_at": res.get("updated_at", now)
    }

@router.put("/me/settings")
def update_user_settings(data: UserSettingsUpdate, user: Dict[str, Any] = Depends(get_current_user)):
    """Updates user preferences and settings."""
    now = datetime.now(timezone.utc).isoformat()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT 1 FROM user_settings WHERE user_id = ?", (user["id"],))
        if not cursor.fetchone():
            cursor.execute("""
            INSERT INTO user_settings (
                user_id, theme, notify_collaborations, notify_polls,
                notify_reactions, notify_copilot, auto_run_copilot,
                default_jurisdiction, ai_tone, updated_at
            ) VALUES (?, 'dark', 1, 1, 1, 1, 1, '', 'balanced', ?)
            """, (user["id"], now))

        fields = []
        values = []

        if data.theme is not None:
            if data.theme not in ["dark", "light", "system"]:
                raise HTTPException(status_code=400, detail="Invalid theme choice. Must be 'dark', 'light', or 'system'.")
            fields.append("theme = ?")
            values.append(data.theme)

        if data.notify_collaborations is not None:
            fields.append("notify_collaborations = ?")
            values.append(1 if data.notify_collaborations else 0)

        if data.notify_polls is not None:
            fields.append("notify_polls = ?")
            values.append(1 if data.notify_polls else 0)

        if data.notify_reactions is not None:
            fields.append("notify_reactions = ?")
            values.append(1 if data.notify_reactions else 0)

        if data.notify_copilot is not None:
            fields.append("notify_copilot = ?")
            values.append(1 if data.notify_copilot else 0)

        if data.auto_run_copilot is not None:
            fields.append("auto_run_copilot = ?")
            values.append(1 if data.auto_run_copilot else 0)

        if data.default_jurisdiction is not None:
            fields.append("default_jurisdiction = ?")
            values.append(data.default_jurisdiction.strip())

        if data.ai_tone is not None:
            if data.ai_tone not in ["creative", "balanced", "analytical"]:
                raise HTTPException(status_code=400, detail="Invalid AI tone. Must be 'creative', 'balanced', or 'analytical'.")
            fields.append("ai_tone = ?")
            values.append(data.ai_tone)

        if fields:
            fields.append("updated_at = ?")
            values.append(now)
            values.append(user["id"])
            cursor.execute(f"UPDATE user_settings SET {', '.join(fields)} WHERE user_id = ?", values)

        cursor.execute("SELECT * FROM user_settings WHERE user_id = ?", (user["id"],))
        row = cursor.fetchone()

    res = dict(row)
    return {
        "user_id": res["user_id"],
        "theme": res.get("theme", "dark"),
        "notify_collaborations": bool(res.get("notify_collaborations", 1)),
        "notify_polls": bool(res.get("notify_polls", 1)),
        "notify_reactions": bool(res.get("notify_reactions", 1)),
        "notify_copilot": bool(res.get("notify_copilot", 1)),
        "auto_run_copilot": bool(res.get("auto_run_copilot", 1)),
        "default_jurisdiction": res.get("default_jurisdiction", "") or "",
        "ai_tone": res.get("ai_tone", "balanced") or "balanced",
        "updated_at": res.get("updated_at", now)
    }

@router.post("/me/change-password")
def change_password(data: PasswordChangeRequest, user: Dict[str, Any] = Depends(get_current_user)):
    """Changes password after verifying existing password hash."""
    if data.new_password != data.confirm_password:
        raise HTTPException(status_code=400, detail="New passwords do not match")
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long")

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT password_hash FROM users WHERE id = ?", (user["id"],))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="User not found")

    if not auth_service.verify_password(data.current_password, row["password_hash"]):
        raise HTTPException(status_code=400, detail="Current password does not match")

    new_hash = auth_service.hash_password(data.new_password)
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE users SET password_hash = ? WHERE id = ?", (new_hash, user["id"]))

    return {"status": "success", "message": "Password changed successfully"}

@router.get("/me/sessions")
def get_user_sessions(request: Request, user: Dict[str, Any] = Depends(get_current_user)):
    """Lists active login sessions for the authenticated user."""
    ua = request.headers.get("user-agent", "Browser Session")
    client_ip = request.client.host if request.client else "127.0.0.1"
    now = datetime.now(timezone.utc).isoformat()

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT id, user_agent, ip_address, created_at, last_used_at, is_revoked
        FROM sessions
        WHERE user_id = ? AND is_revoked = 0
        ORDER BY last_used_at DESC
        """, (user["id"],))
        rows = [dict(r) for r in cursor.fetchall()]

        if not rows:
            sess_id = str(uuid.uuid4())
            cursor.execute("""
            INSERT INTO sessions (id, user_id, token_jti, user_agent, ip_address, is_revoked, created_at, last_used_at)
            VALUES (?, ?, ?, ?, ?, 0, ?, ?)
            """, (sess_id, user["id"], "active-session", ua, client_ip, now, now))
            rows = [{
                "id": sess_id,
                "user_agent": ua,
                "ip_address": client_ip,
                "created_at": now,
                "last_used_at": now,
                "is_current": True
            }]
        else:
            for idx, r in enumerate(rows):
                r["is_current"] = (idx == 0)

    return {"sessions": rows}

@router.delete("/me/sessions/{session_id}")
def revoke_session(session_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    """Revokes a specific session belonging to the authenticated user (prevents IDOR)."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM sessions WHERE id = ? AND user_id = ?", (session_id, user["id"]))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Session not found or already revoked")
        cursor.execute("UPDATE sessions SET is_revoked = 1 WHERE id = ? AND user_id = ?", (session_id, user["id"]))

    return {"status": "success", "message": "Session revoked successfully"}

@router.post("/me/sessions/revoke-all-others")
def revoke_other_sessions(user: Dict[str, Any] = Depends(get_current_user)):
    """Revokes all sessions except the current one for security."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        UPDATE sessions SET is_revoked = 1
        WHERE user_id = ? AND id NOT IN (
            SELECT id FROM sessions WHERE user_id = ? AND is_revoked = 0 ORDER BY last_used_at DESC LIMIT 1
        )
        """, (user["id"], user["id"]))

    return {"status": "success", "message": "All other sessions have been revoked"}

@router.post("/me/avatar")
async def upload_avatar(file: UploadFile = File(...), user: Dict[str, Any] = Depends(get_current_user)):
    """Uploads, validates, and updates user profile avatar picture."""
    contents = await file.read()
    allowed_image_exts = [".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"]
    filename = file.filename or "avatar.jpg"
    ext = Path(filename).suffix.lower()

    if ext not in allowed_image_exts:
        raise HTTPException(status_code=400, detail=f"Invalid image format '{ext}'. Allowed: {', '.join(allowed_image_exts)}")

    size_mb = round(len(contents) / (1024 * 1024), 2)
    if size_mb > 5.0:
        raise HTTPException(status_code=400, detail="Avatar image must be smaller than 5 MB")

    unique_name = f"avatar_{user['id']}_{uuid.uuid4().hex[:8]}{ext}"
    dest_path = Path(settings.UPLOAD_DIR) / unique_name

    async with aiofiles.open(dest_path, "wb") as f:
        await f.write(contents)

    avatar_url = f"/static/uploads/{unique_name}"
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE users SET avatar_url = ? WHERE id = ?", (avatar_url, user["id"]))

    updated_user = auth_service.get_user_by_id(user["id"])
    return {
        "status": "success",
        "avatar_url": avatar_url,
        "user": updated_user,
        "message": "Avatar uploaded successfully"
    }

@router.delete("/me/avatar")
def remove_avatar(user: Dict[str, Any] = Depends(get_current_user)):
    """Removes custom profile avatar and reverts to initials/DiceBear avatar."""
    fallback_avatar = f"https://api.dicebear.com/7.x/bottts/svg?seed={user['username']}"
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE users SET avatar_url = ? WHERE id = ?", (fallback_avatar, user["id"]))

    updated_user = auth_service.get_user_by_id(user["id"])
    return {
        "status": "success",
        "avatar_url": fallback_avatar,
        "user": updated_user,
        "message": "Avatar removed"
    }

@router.post("/me/feedback")
def submit_feedback(data: FeedbackSubmitRequest, user: Dict[str, Any] = Depends(get_current_user)):
    """Submits user support feedback, bug report, or feature request to the platform."""
    if not data.message or not data.message.strip():
        raise HTTPException(status_code=400, detail="Feedback message cannot be empty")

    fb_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO user_feedback (id, user_id, category, message, email, rating, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            fb_id, user["id"], data.category, data.message.strip(),
            (data.email or user.get("mobile", "")).strip(), data.rating or 5, now
        ))

    return {
        "status": "success",
        "id": fb_id,
        "message": "Thank you for your feedback! Our engineering team will review it."
    }

@router.delete("/me")
def delete_account(data: AccountDeleteRequest, user: Dict[str, Any] = Depends(get_current_user)):
    """Multi-step verified account deletion with password re-authentication and phrase confirmation."""
    if data.confirm_phrase.strip().upper() != "DELETE":
        raise HTTPException(status_code=400, detail="Please type 'DELETE' to confirm account deletion")

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT password_hash FROM users WHERE id = ?", (user["id"],))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="User account not found")

    if not auth_service.verify_password(data.password, row["password_hash"]):
        raise HTTPException(status_code=400, detail="Incorrect password. Account deletion aborted.")

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM users WHERE id = ?", (user["id"],))

    return {"status": "success", "message": "Your account and all associated data have been permanently removed."}

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
