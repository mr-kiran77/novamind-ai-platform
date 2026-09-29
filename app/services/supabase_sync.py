import os
import re
import uuid
import json
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
import sqlite3

from app.config import settings
from app.supabase_client import get_supabase

logger = logging.getLogger("novamind.supabase_sync")

def to_uuid(val: Any) -> str:
    """Deterministically converts any string, int, or UUID into a valid UUID string."""
    if not val:
        return str(uuid.uuid4())
    s = str(val).strip()
    try:
        return str(uuid.UUID(s))
    except Exception:
        # Deterministic UUID5 based on DNS namespace
        return str(uuid.uuid5(uuid.NAMESPACE_DNS, s))

def parse_json_field(val: Any, default=None):
    """Safely converts stringified JSON into a Python dict/list for JSONB columns."""
    if default is None:
        default = []
    if val is None or val == "":
        return default
    if isinstance(val, (dict, list)):
        return val
    try:
        return json.loads(val)
    except Exception:
        return default

class SupabaseSyncEngine:
    """
    NovaMind Real-Time Supabase Cloud Sync Engine.
    Handles dual-write, automatic synchronization, and real-time browsing tracking.
    """

    @staticmethod
    def get_client():
        return get_supabase()

    @staticmethod
    def get_sqlite_conn():
        conn = sqlite3.connect(settings.DATABASE_PATH)
        conn.row_factory = sqlite3.Row
        return conn

    # -------------------------------------------------------------------------
    # REAL-TIME BROWSING & USER ACTIVITY TELEMETRY
    # -------------------------------------------------------------------------
    @classmethod
    def track_browsing_event(
        cls,
        page_url: str,
        event_type: str = "page_view",
        user_id: Optional[str] = None,
        username: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        ip_address: str = "",
        user_agent: str = ""
    ) -> Dict[str, Any]:
        """
        Stores live website browsing, user actions, and page analytics directly in Supabase in real time.
        """
        now = datetime.now(timezone.utc).isoformat()
        event_id = str(uuid.uuid4())
        user_uuid = to_uuid(user_id) if user_id else None

        record = {
            "id": event_id,
            "user_id": user_uuid,
            "username": username or ("anonymous_visitor" if not user_id else f"user_{str(user_id)[-4:]}"),
            "event_type": event_type,
            "page_url": page_url,
            "metadata": metadata or {},
            "ip_address": ip_address or "127.0.0.1",
            "user_agent": (user_agent or "web-browser")[:255],
            "created_at": now
        }

        # 1. Real-time write to Supabase
        client = cls.get_client()
        supabase_ok = False
        supabase_error = None

        if client:
            try:
                # Try inserting into browsing_events
                client.table("browsing_events").insert(record).execute()
                supabase_ok = True
                logger.info(f"Supabase Realtime: tracked {event_type} on {page_url} by {record['username']}")
            except Exception as e:
                supabase_error = str(e)
                # Fallback: also log to sessions table if browsing_events has not been created yet
                try:
                    client.table("sessions").insert({
                        "id": event_id,
                        "user_id": user_uuid,
                        "token_jti": f"{event_type}:{page_url}",
                        "user_agent": (user_agent or "")[:100],
                        "ip_address": (ip_address or "")[:45],
                        "is_revoked": False,
                        "created_at": now,
                        "last_used_at": now
                    }).execute()
                    supabase_ok = True
                except Exception:
                    pass

        # 2. Local SQLite fallback logging
        try:
            with sqlite3.connect(settings.DATABASE_PATH) as conn:
                conn.execute("""
                CREATE TABLE IF NOT EXISTS browsing_events (
                    id TEXT PRIMARY KEY,
                    user_id TEXT,
                    username TEXT,
                    event_type TEXT NOT NULL,
                    page_url TEXT NOT NULL,
                    metadata TEXT,
                    ip_address TEXT,
                    user_agent TEXT,
                    created_at TEXT NOT NULL
                )
                """)
                conn.execute("""
                INSERT INTO browsing_events (id, user_id, username, event_type, page_url, metadata, ip_address, user_agent, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    event_id, str(user_id or ""), record["username"], event_type, page_url,
                    json.dumps(metadata or {}), ip_address, user_agent, now
                ))
        except Exception as e:
            logger.warning(f"Local browsing event logging error: {e}")

        return {
            "status": "success",
            "event_id": event_id,
            "supabase_synced": supabase_ok,
            "supabase_error": supabase_error
        }

    # -------------------------------------------------------------------------
    # REAL-TIME ENTITY SYNC HOOKS (Triggered on User/Idea/Chat actions)
    # -------------------------------------------------------------------------
    @classmethod
    def sync_user(cls, user: Dict[str, Any]) -> bool:
        """Syncs single user to Supabase users table."""
        client = cls.get_client()
        if not client:
            return False
        try:
            u_id = to_uuid(user.get("id"))
            data = {
                "id": u_id,
                "mobile": user.get("mobile") or f"+919800{str(u_id)[-6:]}",
                "username": user.get("username") or f"user_{str(u_id)[-4:]}",
                "display_name": user.get("display_name") or user.get("username") or "Nova Innovator",
                "password_hash": user.get("password_hash") or "bcrypt_managed",
                "role": user.get("role") or "user",
                "avatar_url": user.get("avatar_url") or f"https://api.dicebear.com/7.x/bottts/svg?seed={u_id}",
                "bio": user.get("bio") or "",
                "interests": parse_json_field(user.get("interests"), []),
                "skills": parse_json_field(user.get("skills"), []),
                "location": user.get("location") or "",
                "education": user.get("education") or "",
                "occupation": user.get("occupation") or "",
                "links": parse_json_field(user.get("links"), []),
                "reputation_score": int(user.get("reputation_score") or 50),
                "badges": parse_json_field(user.get("badges"), []),
                "is_verified": bool(user.get("is_verified", False)),
                "is_suspended": bool(user.get("is_suspended", False)),
                "is_banned": bool(user.get("is_banned", False)),
                "created_at": user.get("created_at") or datetime.now(timezone.utc).isoformat()
            }
            client.table("users").upsert(data).execute()
            logger.info(f"Supabase Synced user: @{data['username']} ({u_id})")
            return True
        except Exception as e:
            logger.warning(f"Supabase sync_user failed: {e}")
            return False

    @classmethod
    def sync_idea(cls, idea: Dict[str, Any]) -> bool:
        """Syncs single idea to Supabase ideas table."""
        client = cls.get_client()
        if not client:
            return False
        try:
            i_id = to_uuid(idea.get("id"))
            u_id = to_uuid(idea.get("user_id"))
            raw_struct = idea.get("structured_blueprint") or idea.get("structured_data") or {}
            struct_data = parse_json_field(raw_struct, {})

            data = {
                "id": i_id,
                "user_id": u_id,
                "title": idea.get("title") or "Innovation Concept",
                "raw_content": idea.get("raw_content") or "",
                "raw_format": idea.get("raw_format") or "text",
                "media_urls": parse_json_field(idea.get("media_urls"), []),
                "structured_data": struct_data,
                "category": idea.get("category") or "General",
                "tags": parse_json_field(idea.get("tags"), []),
                "status": idea.get("status") or "published",
                "stage": idea.get("stage") or "raw_thought",
                "view_count": int(idea.get("view_count") or 0),
                "save_count": int(idea.get("save_count") or 0),
                "share_count": int(idea.get("share_count") or 0),
                "safety_score": float(idea.get("safety_score") or 95.0),
                "created_at": idea.get("created_at") or datetime.now(timezone.utc).isoformat(),
                "updated_at": idea.get("updated_at") or datetime.now(timezone.utc).isoformat()
            }
            client.table("ideas").upsert(data).execute()
            logger.info(f"Supabase Synced idea: '{data['title']}' ({i_id})")
            return True
        except Exception as e:
            logger.warning(f"Supabase sync_idea failed: {e}")
            return False

    @classmethod
    def sync_conversation(cls, conv: Dict[str, Any]) -> bool:
        """Syncs conversation and its messages to Supabase."""
        client = cls.get_client()
        if not client:
            return False
        try:
            c_id = to_uuid(conv.get("id"))
            creator_id = to_uuid(conv.get("created_by")) if conv.get("created_by") else None
            data = {
                "id": c_id,
                "type": conv.get("type") or "direct",
                "title": conv.get("title") or "Conversation",
                "created_by": creator_id,
                "created_at": conv.get("created_at") or datetime.now(timezone.utc).isoformat()
            }
            client.table("conversations").upsert(data).execute()
            logger.info(f"Supabase Synced conversation: '{data['title']}' ({c_id})")
            return True
        except Exception as e:
            logger.warning(f"Supabase sync_conversation failed: {e}")
            return False

    @classmethod
    def sync_message(cls, msg: Dict[str, Any]) -> bool:
        """Syncs message to Supabase messages table."""
        client = cls.get_client()
        if not client:
            return False
        try:
            m_id = to_uuid(msg.get("id"))
            c_id = to_uuid(msg.get("conversation_id"))
            s_id = to_uuid(msg.get("sender_id"))
            data = {
                "id": m_id,
                "conversation_id": c_id,
                "sender_id": s_id,
                "content": msg.get("content") or "",
                "media_url": msg.get("media_url") or "",
                "is_deleted": bool(msg.get("is_deleted", False)),
                "created_at": msg.get("created_at") or datetime.now(timezone.utc).isoformat()
            }
            client.table("messages").upsert(data).execute()
            logger.info(f"Supabase Synced message ({m_id}) in conv ({c_id})")
            return True
        except Exception as e:
            logger.warning(f"Supabase sync_message failed: {e}")
            return False

    @classmethod
    def sync_comment(cls, comment: Dict[str, Any]) -> bool:
        """Syncs comment to Supabase comments table."""
        client = cls.get_client()
        if not client:
            return False
        try:
            c_id = to_uuid(comment.get("id"))
            i_id = to_uuid(comment.get("idea_id"))
            u_id = to_uuid(comment.get("user_id"))
            data = {
                "id": c_id,
                "idea_id": i_id,
                "user_id": u_id,
                "content": comment.get("content") or "",
                "discussion_type": comment.get("discussion_type") or "public",
                "comment_type": comment.get("comment_type") or "comment",
                "safety_status": comment.get("safety_status") or "approved",
                "created_at": comment.get("created_at") or datetime.now(timezone.utc).isoformat()
            }
            client.table("comments").upsert(data).execute()
            return True
        except Exception as e:
            logger.warning(f"Supabase sync_comment failed: {e}")
            return False

    @classmethod
    def sync_reaction(cls, reaction: Dict[str, Any]) -> bool:
        """Syncs reaction to Supabase reactions table."""
        client = cls.get_client()
        if not client:
            return False
        try:
            r_id = to_uuid(reaction.get("id"))
            i_id = to_uuid(reaction.get("idea_id"))
            u_id = to_uuid(reaction.get("user_id"))
            data = {
                "id": r_id,
                "idea_id": i_id,
                "user_id": u_id,
                "reaction_type": reaction.get("reaction_type") or "insightful",
                "created_at": reaction.get("created_at") or datetime.now(timezone.utc).isoformat()
            }
            client.table("reactions").upsert(data).execute()
            return True
        except Exception as e:
            logger.warning(f"Supabase sync_reaction failed: {e}")
            return False

    @classmethod
    def sync_otp(cls, otp: Dict[str, Any]) -> bool:
        """Syncs OTP record to Supabase otps table."""
        client = cls.get_client()
        if not client:
            return False
        try:
            o_id = to_uuid(otp.get("id"))
            data = {
                "id": o_id,
                "mobile": otp.get("mobile"),
                "code": otp.get("code"),
                "expires_at": otp.get("expires_at"),
                "verified": bool(otp.get("verified", False)),
                "created_at": otp.get("created_at") or datetime.now(timezone.utc).isoformat()
            }
            client.table("otps").upsert(data).execute()
            return True
        except Exception as e:
            logger.warning(f"Supabase sync_otp failed: {e}")
            return False

    # -------------------------------------------------------------------------
    # COMPREHENSIVE FULL BATCH SYNCHRONIZATION
    # -------------------------------------------------------------------------
    @classmethod
    def sync_all_to_supabase(cls) -> Dict[str, Any]:
        """
        Synchronizes all local SQLite data directly into Supabase cloud database.
        Returns detailed summary counts of synced records and errors if any.
        """
        client = cls.get_client()
        if not client:
            return {"status": "error", "message": "Supabase client is not configured in .env"}

        summary = {
            "status": "completed",
            "synced_counts": {},
            "errors": [],
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

        conn = cls.get_sqlite_conn()
        cursor = conn.cursor()

        # 1. Sync Users
        try:
            cursor.execute("SELECT * FROM users")
            users = [dict(r) for r in cursor.fetchall()]
            user_payloads = []
            for u in users:
                u_id = to_uuid(u["id"])
                user_payloads.append({
                    "id": u_id,
                    "mobile": u.get("mobile") or f"+919800{str(u_id)[-6:]}",
                    "username": u.get("username") or f"user_{str(u_id)[-4:]}",
                    "display_name": u.get("display_name") or u.get("username") or "Nova Innovator",
                    "password_hash": u.get("password_hash") or "bcrypt_managed",
                    "role": u.get("role") or "user",
                    "avatar_url": u.get("avatar_url") or f"https://api.dicebear.com/7.x/bottts/svg?seed={u_id}",
                    "bio": u.get("bio") or "",
                    "interests": parse_json_field(u.get("interests"), []),
                    "skills": parse_json_field(u.get("skills"), []),
                    "location": u.get("location") or "",
                    "education": u.get("education") or "",
                    "occupation": u.get("occupation") or "",
                    "links": parse_json_field(u.get("links"), []),
                    "reputation_score": int(u.get("reputation_score") or 50),
                    "badges": parse_json_field(u.get("badges"), []),
                    "is_verified": bool(u.get("is_verified", False)),
                    "is_suspended": bool(u.get("is_suspended", False)),
                    "is_banned": bool(u.get("is_banned", False)),
                    "created_at": u.get("created_at") or datetime.now(timezone.utc).isoformat()
                })
            if user_payloads:
                client.table("users").upsert(user_payloads).execute()
            summary["synced_counts"]["users"] = len(user_payloads)
        except Exception as e:
            summary["errors"].append(f"users: {e}")

        # 2. Sync Agent Definitions (50 Autonomous Swarm Agents)
        try:
            cursor.execute("SELECT * FROM agent_definitions")
            agents = [dict(r) for r in cursor.fetchall()]
            agent_payloads = []
            for a in agents:
                agent_payloads.append({
                    "id": to_uuid(a["id"]),
                    "name": a["name"],
                    "role": a["role"],
                    "description": a.get("description") or "",
                    "category": a.get("category") or "General",
                    "input_type": a.get("input_type") or "json",
                    "output_type": a.get("output_type") or "json",
                    "is_active": bool(a.get("is_active", True))
                })
            if agent_payloads:
                client.table("agent_definitions").upsert(agent_payloads).execute()
            summary["synced_counts"]["agent_definitions"] = len(agent_payloads)
        except Exception as e:
            summary["errors"].append(f"agent_definitions: {e}")

        # 3. Sync Ideas
        try:
            cursor.execute("SELECT * FROM ideas")
            ideas = [dict(r) for r in cursor.fetchall()]
            idea_payloads = []
            for i in ideas:
                struct_data = parse_json_field(i.get("structured_blueprint") or i.get("structured_data") or "{}", {})
                idea_payloads.append({
                    "id": to_uuid(i["id"]),
                    "user_id": to_uuid(i["user_id"]),
                    "title": i.get("title") or "Untitled Idea",
                    "raw_content": i.get("raw_content") or "",
                    "raw_format": i.get("raw_format") or "text",
                    "media_urls": parse_json_field(i.get("media_urls"), []),
                    "structured_data": struct_data,
                    "category": i.get("category") or "General",
                    "tags": parse_json_field(i.get("tags"), []),
                    "status": i.get("status") or "published",
                    "stage": i.get("stage") or "raw_thought",
                    "view_count": int(i.get("view_count") or 0),
                    "save_count": int(i.get("save_count") or 0),
                    "share_count": int(i.get("share_count") or 0),
                    "safety_score": float(i.get("safety_score") or 95.0),
                    "created_at": i.get("created_at") or datetime.now(timezone.utc).isoformat(),
                    "updated_at": i.get("updated_at") or datetime.now(timezone.utc).isoformat()
                })
            if idea_payloads:
                client.table("ideas").upsert(idea_payloads).execute()
            summary["synced_counts"]["ideas"] = len(idea_payloads)
        except Exception as e:
            summary["errors"].append(f"ideas: {e}")

        # 4. Sync Conversations
        try:
            cursor.execute("SELECT * FROM conversations")
            convs = [dict(r) for r in cursor.fetchall()]
            conv_payloads = []
            for c in convs:
                conv_payloads.append({
                    "id": to_uuid(c["id"]),
                    "type": c.get("type") or "direct",
                    "title": c.get("title") or "Direct Conversation",
                    "created_by": to_uuid(c["created_by"]) if c.get("created_by") else None,
                    "created_at": c.get("created_at") or datetime.now(timezone.utc).isoformat()
                })
            if conv_payloads:
                client.table("conversations").upsert(conv_payloads).execute()
            summary["synced_counts"]["conversations"] = len(conv_payloads)
        except Exception as e:
            summary["errors"].append(f"conversations: {e}")

        # 5. Sync Conversation Members
        try:
            cursor.execute("SELECT * FROM conversation_members")
            cmembers = [dict(r) for r in cursor.fetchall()]
            cmember_payloads = []
            for m in cmembers:
                cmember_payloads.append({
                    "id": to_uuid(m["id"]),
                    "conversation_id": to_uuid(m["conversation_id"]),
                    "user_id": to_uuid(m["user_id"]),
                    "joined_at": m.get("joined_at") or datetime.now(timezone.utc).isoformat(),
                    "last_read_at": m.get("last_read_at")
                })
            if cmember_payloads:
                client.table("conversation_members").upsert(cmember_payloads).execute()
            summary["synced_counts"]["conversation_members"] = len(cmember_payloads)
        except Exception as e:
            summary["errors"].append(f"conversation_members: {e}")

        # 6. Sync Messages
        try:
            cursor.execute("SELECT * FROM messages")
            messages = [dict(r) for r in cursor.fetchall()]
            message_payloads = []
            for msg in messages:
                message_payloads.append({
                    "id": to_uuid(msg["id"]),
                    "conversation_id": to_uuid(msg["conversation_id"]),
                    "sender_id": to_uuid(msg["sender_id"]),
                    "content": msg.get("content") or "",
                    "media_url": msg.get("media_url") or "",
                    "is_deleted": bool(msg.get("is_deleted", False)),
                    "created_at": msg.get("created_at") or datetime.now(timezone.utc).isoformat()
                })
            if message_payloads:
                client.table("messages").upsert(message_payloads).execute()
            summary["synced_counts"]["messages"] = len(message_payloads)
        except Exception as e:
            summary["errors"].append(f"messages: {e}")

        # 7. Sync Comments
        try:
            cursor.execute("SELECT * FROM comments")
            comments = [dict(r) for r in cursor.fetchall()]
            comment_payloads = []
            for cm in comments:
                comment_payloads.append({
                    "id": to_uuid(cm["id"]),
                    "idea_id": to_uuid(cm["idea_id"]),
                    "user_id": to_uuid(cm["user_id"]),
                    "content": cm.get("content") or "",
                    "discussion_type": cm.get("discussion_type") or "public",
                    "comment_type": cm.get("comment_type") or "comment",
                    "safety_status": cm.get("safety_status") or "approved",
                    "created_at": cm.get("created_at") or datetime.now(timezone.utc).isoformat()
                })
            if comment_payloads:
                client.table("comments").upsert(comment_payloads).execute()
            summary["synced_counts"]["comments"] = len(comment_payloads)
        except Exception as e:
            summary["errors"].append(f"comments: {e}")

        # 8. Sync Reactions
        try:
            cursor.execute("SELECT * FROM reactions")
            reactions = [dict(r) for r in cursor.fetchall()]
            reaction_payloads = []
            for rx in reactions:
                reaction_payloads.append({
                    "id": to_uuid(rx["id"]),
                    "idea_id": to_uuid(rx["idea_id"]),
                    "user_id": to_uuid(rx["user_id"]),
                    "reaction_type": rx.get("reaction_type") or "insightful",
                    "created_at": rx.get("created_at") or datetime.now(timezone.utc).isoformat()
                })
            if reaction_payloads:
                client.table("reactions").upsert(reaction_payloads).execute()
            summary["synced_counts"]["reactions"] = len(reaction_payloads)
        except Exception as e:
            summary["errors"].append(f"reactions: {e}")

        # 9. Sync Collaborations
        try:
            cursor.execute("SELECT * FROM collaborations")
            collabs = [dict(r) for r in cursor.fetchall()]
            collab_payloads = []
            for cl in collabs:
                collab_payloads.append({
                    "id": to_uuid(cl["id"]),
                    "idea_id": to_uuid(cl["idea_id"]),
                    "requester_id": to_uuid(cl["requester_id"]),
                    "role_type": cl.get("role_type") or "technical",
                    "pitch_message": cl.get("pitch_message") or "",
                    "status": cl.get("status") or "pending",
                    "ai_seriousness_score": int(cl.get("ai_seriousness_score") or 0),
                    "ai_classification": cl.get("ai_classification") or "pending",
                    "ai_rationale": cl.get("ai_rationale") or "",
                    "created_at": cl.get("created_at") or datetime.now(timezone.utc).isoformat()
                })
            if collab_payloads:
                client.table("collaborations").upsert(collab_payloads).execute()
            summary["synced_counts"]["collaborations"] = len(collab_payloads)
        except Exception as e:
            summary["errors"].append(f"collaborations: {e}")

        # 10. Sync Local Browsing Events
        try:
            cursor.execute("SELECT * FROM browsing_events")
            b_events = [dict(r) for r in cursor.fetchall()]
            b_payloads = []
            for ev in b_events:
                b_payloads.append({
                    "id": to_uuid(ev["id"]),
                    "user_id": to_uuid(ev["user_id"]) if ev.get("user_id") else None,
                    "username": ev.get("username") or "anonymous_visitor",
                    "event_type": ev.get("event_type") or "page_view",
                    "page_url": ev.get("page_url") or "/",
                    "metadata": parse_json_field(ev.get("metadata"), {}),
                    "ip_address": ev.get("ip_address") or "",
                    "user_agent": ev.get("user_agent") or "",
                    "created_at": ev.get("created_at") or datetime.now(timezone.utc).isoformat()
                })
            if b_payloads:
                client.table("browsing_events").upsert(b_payloads).execute()
            summary["synced_counts"]["browsing_events"] = len(b_payloads)
        except Exception as e:
            summary["errors"].append(f"browsing_events: {e}")

        conn.close()
        return summary

    # -------------------------------------------------------------------------
    # LIVE TELEMETRY & ROW COUNTS FOR STATUS ENDPOINT
    # -------------------------------------------------------------------------
    @classmethod
    def get_supabase_telemetry(cls) -> Dict[str, Any]:
        """Fetches live table counts and status directly from Supabase."""
        client = cls.get_client()
        if not client:
            return {
                "connected": False,
                "url": settings.SUPABASE_URL,
                "error": "Supabase not configured in .env"
            }

        table_counts = {}
        target_tables = ["ideas", "users", "conversations", "messages", "comments", "reactions", "agent_definitions", "browsing_events"]
        errors = []

        for t in target_tables:
            try:
                res = client.table(t).select("id", count="exact").limit(1).execute()
                table_counts[t] = res.count if res.count is not None else len(res.data)
            except Exception as e:
                table_counts[t] = 0
                errors.append(f"{t}: {str(e)[:60]}")

        return {
            "connected": True,
            "url": settings.SUPABASE_URL,
            "tables": table_counts,
            "total_records": sum(table_counts.values()),
            "errors": errors if errors else None,
            "realtime_active": True
        }

supabase_sync = SupabaseSyncEngine()
