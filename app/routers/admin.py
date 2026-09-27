import json
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, Depends
from app.database import get_db
from app.dependencies import require_admin
from app.services.ai_providers import ai_registry

router = APIRouter(prefix="/api/admin", tags=["Administrator Operations"])

@router.get("/stats")
def get_admin_stats(admin: Dict[str, Any] = Depends(require_admin)):
    """System analytics and platform KPIs."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) as c FROM users")
        total_users = cursor.fetchone()["c"]

        cursor.execute("SELECT COUNT(*) as c FROM ideas")
        total_ideas = cursor.fetchone()["c"]

        cursor.execute("SELECT COUNT(*) as c FROM reactions")
        total_reactions = cursor.fetchone()["c"]

        cursor.execute("SELECT COUNT(*) as c FROM comments")
        total_comments = cursor.fetchone()["c"]

        cursor.execute("SELECT COUNT(*) as c FROM collaborations")
        total_collabs = cursor.fetchone()["c"]

        cursor.execute("SELECT COUNT(*) as c FROM agent_runs")
        total_agent_runs = cursor.fetchone()["c"]

        cursor.execute("SELECT AVG(latency_ms) as avg_latency FROM agent_runs WHERE status = 'success'")
        avg_latency = round(cursor.fetchone()["avg_latency"] or 0, 1)

        cursor.execute("SELECT category, COUNT(*) as count FROM ideas GROUP BY category ORDER BY count DESC LIMIT 6")
        top_categories = [dict(r) for r in cursor.fetchall()]

    return {
        "kpis": {
            "total_users": total_users,
            "total_ideas": total_ideas,
            "total_reactions": total_reactions,
            "total_comments": total_comments,
            "total_collaborations": total_collabs,
            "total_agent_runs": total_agent_runs,
            "avg_agent_latency_ms": avg_latency
        },
        "top_categories": top_categories,
        "active_ai_provider": ai_registry.active_provider_name
    }

@router.get("/users")
def get_all_users(admin: Dict[str, Any] = Depends(require_admin)):
    """User management list."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT id, mobile, username, display_name, role, reputation_score,
               current_streak, is_verified, is_suspended, is_banned, created_at
        FROM users ORDER BY created_at DESC
        """)
        users = [dict(r) for r in cursor.fetchall()]
    return {"users": users}

@router.put("/users/{user_id}/role")
def update_user_role(user_id: str, role: str, admin: Dict[str, Any] = Depends(require_admin)):
    """Promotes or changes a user role (user, moderator, admin)."""
    if role not in ["user", "moderator", "admin"]:
        raise HTTPException(status_code=400, detail="Invalid role specified")
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE users SET role = ? WHERE id = ?", (role, user_id))
    return {"status": "success", "user_id": user_id, "new_role": role}

@router.get("/agents")
def get_agent_registry_and_runs(admin: Dict[str, Any] = Depends(require_admin)):
    """Inspects all 50 registered specialist agents and recent execution telemetry."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM agent_definitions ORDER BY category, name")
        definitions = [dict(r) for r in cursor.fetchall()]

        cursor.execute("""
        SELECT * FROM agent_runs ORDER BY created_at DESC LIMIT 50
        """)
        runs = []
        for r in cursor.fetchall():
            d = dict(r)
            d["input_payload"] = json.loads(d.get("input_payload") or "{}")
            d["output_payload"] = json.loads(d.get("output_payload") or "{}")
            runs.append(d)

    return {
        "definitions": definitions,
        "recent_runs": runs,
        "total_registered": len(definitions)
    }

@router.post("/settings/ai-provider")
def configure_ai_provider(provider_name: str, api_key: Optional[str] = None, admin: Dict[str, Any] = Depends(require_admin)):
    """Switches active AI engine (local or gemini) and updates API key."""
    if provider_name not in ["local", "gemini"]:
        raise HTTPException(status_code=400, detail="Provider must be 'local' or 'gemini'")
    ai_registry.set_active_provider(provider_name, api_key)
    return {"status": "success", "active_provider": provider_name}
