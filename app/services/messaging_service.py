import uuid
import json
import logging
from datetime import datetime, timezone
from typing import Dict, List, Set, Any
from fastapi import WebSocket
from app.database import get_db

logger = logging.getLogger("novamind.messaging")

class ConnectionManager:
    def __init__(self):
        # Maps user_id -> Set of active WebSocket connections
        self.active_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, user_id: str, websocket: WebSocket):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
        self.active_connections[user_id].add(websocket)
        logger.info(f"User {user_id} connected via WebSocket. Active sessions: {len(self.active_connections[user_id])}")

    def disconnect(self, user_id: str, websocket: WebSocket):
        if user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        logger.info(f"User {user_id} disconnected from WebSocket.")

    async def send_personal_message(self, user_id: str, message: Dict[str, Any]):
        if user_id in self.active_connections:
            dead_sockets = set()
            for ws in self.active_connections[user_id]:
                try:
                    await ws.send_json(message)
                except Exception:
                    dead_sockets.add(ws)
            for ws in dead_sockets:
                self.active_connections[user_id].discard(ws)

    async def broadcast_to_users(self, user_ids: List[str], message: Dict[str, Any]):
        for uid in user_ids:
            await self.send_personal_message(uid, message)

manager = ConnectionManager()

class MessagingService:
    @staticmethod
    def create_conversation(creator_id: str, participant_ids: List[str], conv_type: str = "direct", title: str = "") -> Dict[str, Any]:
        """Creates a new 1-on-1 or group conversation."""
        all_participants = list(set([creator_id] + participant_ids))
        conv_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT INTO conversations (id, type, title, created_by, created_at)
            VALUES (?, ?, ?, ?, ?)
            """, (conv_id, conv_type, title, creator_id, now))
            
            for pid in all_participants:
                cursor.execute("""
                INSERT INTO conversation_members (id, conversation_id, user_id, joined_at)
                VALUES (?, ?, ?, ?)
                """, (str(uuid.uuid4()), conv_id, pid, now))
                
        # Real-Time write to Supabase
        try:
            from app.services.supabase_sync import supabase_sync
            import threading
            threading.Thread(target=supabase_sync.sync_conversation, args=({
                "id": conv_id,
                "type": conv_type,
                "title": title,
                "created_by": creator_id,
                "created_at": now
            },), daemon=True).start()
        except Exception:
            pass

        return {"id": conv_id, "type": conv_type, "title": title, "participants": all_participants}

    @staticmethod
    async def send_message(conversation_id: str, sender_id: str, content: str, media_url: str = "") -> Dict[str, Any]:
        """Saves message to DB and broadcasts to members via WebSockets."""
        msg_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        
        with get_db() as conn:
            cursor = conn.cursor()
            # Verify sender membership
            cursor.execute("""
            SELECT user_id FROM conversation_members WHERE conversation_id = ?
            """, (conversation_id,))
            members = [row["user_id"] for row in cursor.fetchall()]
            if sender_id not in members:
                raise PermissionError("User is not a member of this conversation")

            cursor.execute("""
            INSERT INTO messages (id, conversation_id, sender_id, content, media_url, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """, (msg_id, conversation_id, sender_id, content, media_url, now))
            
            cursor.execute("SELECT username, display_name, avatar_url FROM users WHERE id = ?", (sender_id,))
            sender_info = cursor.fetchone()

        # Real-Time write to Supabase
        try:
            from app.services.supabase_sync import supabase_sync
            import threading
            threading.Thread(target=supabase_sync.sync_message, args=({
                "id": msg_id,
                "conversation_id": conversation_id,
                "sender_id": sender_id,
                "content": content,
                "media_url": media_url,
                "is_deleted": False,
                "created_at": now
            },), daemon=True).start()
            threading.Thread(target=supabase_sync.track_browsing_event, kwargs={
                "page_url": f"/messages/{conversation_id}",
                "event_type": "message_sent",
                "user_id": sender_id,
                "username": sender_info["username"] if sender_info else None,
                "metadata": {"conversation_id": conversation_id}
            }, daemon=True).start()
        except Exception:
            pass

        payload = {
            "type": "chat_message",
            "message": {
                "id": msg_id,
                "conversation_id": conversation_id,
                "sender_id": sender_id,
                "sender_username": sender_info["username"],
                "sender_display_name": sender_info["display_name"],
                "sender_avatar": sender_info["avatar_url"],
                "content": content,
                "media_url": media_url,
                "created_at": now
            }
        }
        await manager.broadcast_to_users(members, payload)
        return payload["message"]

messaging_service = MessagingService()
