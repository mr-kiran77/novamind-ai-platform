import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Depends
from app.database import get_db
from app.dependencies import get_current_user, require_moderator
from app.models.schemas import ReportCreateRequest, StrikeCreateRequest, AppealCreateRequest, AppealReviewRequest
from app.services.moderation_service import moderation_service

router = APIRouter(prefix="/api/moderation", tags=["Moderation & Safety"])

@router.post("/report")
def create_report(data: ReportCreateRequest, user: Dict[str, Any] = Depends(get_current_user)):
    """Submits a content or user report into the moderation queue."""
    report_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO moderation_reports (id, reporter_id, target_type, target_id, reason, details, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
        """, (report_id, user["id"], data.target_type, data.target_id, data.reason, data.details or "", now))
    return {"status": "success", "report_id": report_id, "message": "Report submitted for moderator review"}

@router.get("/queue")
def get_moderation_queue(mod: Dict[str, Any] = Depends(require_moderator)):
    """Moderator Queue: pending reports and quarantined items."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT r.*, u.username as reporter_username
        FROM moderation_reports r
        JOIN users u ON r.reporter_id = u.id
        WHERE r.status = 'pending'
        ORDER BY r.created_at ASC
        """)
        reports = [dict(r) for r in cursor.fetchall()]

        cursor.execute("""
        SELECT i.*, u.username as creator_username
        FROM ideas i
        JOIN users u ON i.user_id = u.id
        WHERE i.status IN ('quarantine', 'manual_review', 'needs_edit')
        ORDER BY i.created_at ASC
        """)
        quarantined_ideas = [dict(r) for r in cursor.fetchall()]

    return {
        "pending_reports": reports,
        "quarantined_ideas": quarantined_ideas
    }

@router.post("/review/{report_id}")
def review_report(report_id: str, action: str, notes: str = "", mod: Dict[str, Any] = Depends(require_moderator)):
    """Takes moderator action on a report: dismiss, remove_content, warn_user, ban_user."""
    now = datetime.now(timezone.utc).isoformat()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM moderation_reports WHERE id = ?", (report_id,))
        rep = cursor.fetchone()
        if not rep:
            raise HTTPException(status_code=404, detail="Report not found")

        cursor.execute("""
        UPDATE moderation_reports
        SET status = 'action_taken', action_notes = ?, moderator_id = ?
        WHERE id = ?
        """, (f"{action}: {notes}", mod["id"], report_id))

        if action == "remove_content":
            if rep["target_type"] == "idea":
                cursor.execute("UPDATE ideas SET status = 'rejected' WHERE id = ?", (rep["target_id"],))
            elif rep["target_type"] == "comment":
                cursor.execute("UPDATE comments SET safety_status = 'hidden' WHERE id = ?", (rep["target_id"],))

    return {"status": "success", "action": action, "report_id": report_id}

@router.post("/strike")
def issue_strike(data: StrikeCreateRequest, mod: Dict[str, Any] = Depends(require_moderator)):
    """Issues a warning, restriction, or suspension strike to a user."""
    return moderation_service.issue_strike(
        user_id=data.user_id,
        reason=data.reason,
        severity=data.severity,
        issued_by=mod["id"]
    )

@router.post("/appeal")
def submit_appeal(data: AppealCreateRequest, user: Dict[str, Any] = Depends(get_current_user)):
    """Allows user to appeal a moderation strike or restriction."""
    return moderation_service.submit_appeal(
        user_id=user["id"],
        strike_id=data.strike_id,
        appeal_text=data.appeal_text
    )

@router.get("/appeals")
def get_appeals(mod: Dict[str, Any] = Depends(require_moderator)):
    """Retrieves all pending moderation appeals."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT a.*, u.username, u.display_name, s.reason as strike_reason, s.severity as strike_severity
        FROM moderation_appeals a
        JOIN users u ON a.user_id = u.id
        LEFT JOIN moderation_strikes s ON a.strike_id = s.id
        WHERE a.status = 'pending'
        ORDER BY a.created_at ASC
        """)
        appeals = [dict(r) for r in cursor.fetchall()]

    return {"appeals": appeals}

@router.put("/appeals/{appeal_id}")
def review_appeal(appeal_id: str, data: AppealReviewRequest, mod: Dict[str, Any] = Depends(require_moderator)):
    """Approve or reject a moderation appeal."""
    return moderation_service.review_appeal(
        appeal_id=appeal_id,
        reviewer_id=mod["id"],
        status=data.status,
        notes=data.review_notes
    )
