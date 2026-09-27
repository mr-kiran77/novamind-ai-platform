import uuid
import json
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from app.database import get_db
from app.services.ai_providers import ai_registry

logger = logging.getLogger("novamind.moderation")

class ModerationService:
    @staticmethod
    async def evaluate_content_safety(text: str, content_type: str = "text") -> Dict[str, Any]:
        """
        Executes pre-publication safety pipeline.
        Distinguishes constructive criticism from toxic harassment.
        """
        provider = ai_registry.get_provider()
        safety_result = await provider.evaluate_safety(text, content_type)
        return safety_result

    @staticmethod
    def file_security_check(filename: str, file_bytes: bytes, allowed_extensions: List[str], max_mb: int = 50) -> Dict[str, Any]:
        """Validates file safety, extensions, and size limits."""
        # 1. Size check
        size_mb = len(file_bytes) / (1024 * 1024)
        if size_mb > max_mb:
            return {"is_safe": False, "error": f"File size ({size_mb:.1f} MB) exceeds {max_mb} MB limit."}

        # 2. Extension check
        ext = filename.split(".")[-1].lower() if "." in filename else ""
        if ext not in allowed_extensions:
            return {"is_safe": False, "error": f"File extension '.{ext}' is not permitted."}

        # 3. Path traversal & executable check
        if "/" in filename or "\\" in filename or ".." in filename:
            return {"is_safe": False, "error": "Invalid file path detected."}

        dangerous_headers = [b"MZ", b"\x7fELF", b"<?php", b"<script"]
        for header in dangerous_headers:
            if file_bytes.startswith(header):
                return {"is_safe": False, "error": "File signature matches restricted executable or script format."}

        return {"is_safe": True, "size_mb": round(size_mb, 2), "extension": ext}

    @staticmethod
    def issue_strike(user_id: str, reason: str, severity: str, issued_by: str) -> Dict[str, Any]:
        """Issues a moderation strike/warning and updates user standing."""
        strike_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        
        with get_db() as conn:
            cursor = conn.cursor()
            # Ensure issued_by is a valid user ID, fallback to admin user if issued by automated agent
            cursor.execute("SELECT id FROM users WHERE id = ?", (issued_by,))
            if not cursor.fetchone():
                cursor.execute("SELECT id FROM users WHERE role = 'admin' LIMIT 1")
                admin_row = cursor.fetchone()
                issued_by = admin_row["id"] if admin_row else user_id

            cursor.execute("""
            INSERT INTO moderation_strikes (id, user_id, reason, severity, issued_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """, (strike_id, user_id, reason, severity, issued_by, now))
            
            # Count user strikes
            cursor.execute("SELECT COUNT(*) as count FROM moderation_strikes WHERE user_id = ?", (user_id,))
            strike_count = cursor.fetchone()["count"]
            
            # Progressive Enforcement (1st = warning, 2nd = restricted, 3rd = suspended/banned)
            if severity == "banned" or strike_count >= 3:
                cursor.execute("UPDATE users SET is_banned = 1, is_suspended = 1 WHERE id = ?", (user_id,))
            elif severity == "suspended" or strike_count == 2:
                cursor.execute("UPDATE users SET is_suspended = 1 WHERE id = ?", (user_id,))

            # Notification
            cursor.execute("""
            INSERT INTO notifications (id, user_id, type, title, message, created_at)
            VALUES (?, ?, 'strike', 'Moderation Notice', ?, ?)
            """, (str(uuid.uuid4()), user_id, f"Strike issued ({severity}): {reason}", now))

        return {"strike_id": strike_id, "total_strikes": strike_count, "severity": severity}

    @staticmethod
    def submit_appeal(user_id: str, strike_id: Optional[str], appeal_text: str) -> Dict[str, Any]:
        appeal_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        with get_db() as conn:
            conn.cursor().execute("""
            INSERT INTO moderation_appeals (id, user_id, strike_id, appeal_text, status, created_at)
            VALUES (?, ?, ?, ?, 'pending', ?)
            """, (appeal_id, user_id, strike_id, appeal_text, now))
        return {"appeal_id": appeal_id, "status": "pending"}

    @staticmethod
    def review_appeal(appeal_id: str, reviewer_id: str, status: str, notes: str) -> Dict[str, Any]:
        now = datetime.now(timezone.utc).isoformat()
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            UPDATE moderation_appeals
            SET status = ?, reviewer_id = ?, review_notes = ?
            WHERE id = ?
            """, (status, reviewer_id, notes, appeal_id))
            
            if status == "approved":
                # Restore user privileges if approved
                cursor.execute("SELECT user_id FROM moderation_appeals WHERE id = ?", (appeal_id,))
                row = cursor.fetchone()
                if row:
                    cursor.execute("UPDATE users SET is_suspended = 0, is_banned = 0 WHERE id = ?", (row["user_id"],))
        return {"appeal_id": appeal_id, "status": status}

moderation_service = ModerationService()
