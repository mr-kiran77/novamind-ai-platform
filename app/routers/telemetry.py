from fastapi import APIRouter, Request, BackgroundTasks
from typing import Dict, Any, Optional
from pydantic import BaseModel
from app.services.supabase_sync import supabase_sync

router = APIRouter(prefix="/api", tags=["Telemetry & Supabase"])

class BrowseEventRequest(BaseModel):
    page_url: str
    event_type: Optional[str] = "page_view"
    user_id: Optional[str] = None
    username: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

@router.post("/telemetry/browse")
async def track_browse_event(data: BrowseEventRequest, request: Request, background_tasks: BackgroundTasks):
    """
    Receives real-time browsing events from visitors and users,
    and writes them directly into Supabase in real-time.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"
    user_agent = request.headers.get("user-agent", "web-browser")

    # Record synchronously or in background
    result = supabase_sync.track_browsing_event(
        page_url=data.page_url,
        event_type=data.event_type or "page_view",
        user_id=data.user_id,
        username=data.username,
        metadata=data.metadata,
        ip_address=client_ip,
        user_agent=user_agent
    )
    return result

@router.get("/supabase/status")
def get_supabase_status():
    """
    Returns live connection telemetry, table row counts,
    and real-time sync status from Supabase.
    """
    return supabase_sync.get_supabase_telemetry()

@router.post("/supabase/sync-now")
def trigger_supabase_sync():
    """
    Triggers complete batch synchronization from local data into Supabase cloud database.
    """
    return supabase_sync.sync_all_to_supabase()

@router.get("/telemetry/browsing-history")
def get_browsing_history(limit: int = 50):
    """
    Fetches the latest real-time browsing events stored in Supabase (or local fallback).
    """
    client = supabase_sync.get_client()
    if client:
        try:
            res = client.table("browsing_events").select("*").order("created_at", desc=True).limit(limit).execute()
            return {"source": "supabase", "events": res.data}
        except Exception:
            pass

    # Fallback to local table
    import sqlite3
    from app.config import settings
    try:
        with sqlite3.connect(settings.DATABASE_PATH) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM browsing_events ORDER BY created_at DESC LIMIT ?", (limit,))
            rows = [dict(r) for r in cursor.fetchall()]
            return {"source": "local_sqlite_cache", "events": rows}
    except Exception:
        return {"source": "none", "events": []}
