import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List
from fastapi import APIRouter, HTTPException, Depends
from app.database import get_db
from app.dependencies import get_current_user
from app.models.schemas import ConversationCreateRequest, MessageCreateRequest
from app.services.messaging_service import messaging_service

router = APIRouter(prefix="/api/messages", tags=["Private Messaging"])

@router.get("/conversations")
def get_user_conversations(user: Dict[str, Any] = Depends(get_current_user)):
    """Retrieves all active conversations for the authenticated user."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT c.*,
               (SELECT content FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_message,
               (SELECT created_at FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_message_at
        FROM conversations c
        JOIN conversation_members cm ON c.id = cm.conversation_id
        WHERE cm.user_id = ?
        ORDER BY last_message_at DESC
        """, (user["id"],))
        conversations = [dict(r) for r in cursor.fetchall()]

        # Attach participants info
        for conv in conversations:
            cursor.execute("""
            SELECT u.id, u.username, u.display_name, u.avatar_url
            FROM conversation_members cm
            JOIN users u ON cm.user_id = u.id
            WHERE cm.conversation_id = ?
            """, (conv["id"],))
            conv["participants"] = [dict(p) for p in cursor.fetchall()]

    return {"conversations": conversations}

@router.post("/conversations")
def create_conversation(data: ConversationCreateRequest, user: Dict[str, Any] = Depends(get_current_user)):
    """Starts a new direct or group private conversation."""
    return messaging_service.create_conversation(
        creator_id=user["id"],
        participant_ids=data.participant_ids,
        conv_type=data.type,
        title=data.title or ""
    )

@router.get("/conversations/{conv_id}")
def get_conversation_messages(conv_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    """Retrieves message history for a conversation."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT 1 FROM conversation_members WHERE conversation_id = ? AND user_id = ?", (conv_id, user["id"]))
        if not cursor.fetchone():
            raise HTTPException(status_code=403, detail="Access denied to private conversation")

        cursor.execute("""
        SELECT m.*, u.username as sender_username, u.display_name as sender_display_name, u.avatar_url as sender_avatar
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.conversation_id = ? AND m.is_deleted = 0
        ORDER BY m.created_at ASC
        """, (conv_id,))
        messages = [dict(r) for r in cursor.fetchall()]

    return {"messages": messages}

@router.post("/conversations/{conv_id}")
async def send_message(conv_id: str, data: MessageCreateRequest, user: Dict[str, Any] = Depends(get_current_user)):
    """Sends a private message with realtime WebSocket broadcast."""
    try:
        msg = await messaging_service.send_message(
            conversation_id=conv_id,
            sender_id=user["id"],
            content=data.content,
            media_url=data.media_url or ""
        )
        return {"status": "success", "message": msg}
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))

@router.delete("/{message_id}")
def delete_message(message_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    """Deletes sender's own message."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT sender_id FROM messages WHERE id = ?", (message_id,))
        msg = cursor.fetchone()
        if not msg:
            raise HTTPException(status_code=404, detail="Message not found")
        if msg["sender_id"] != user["id"]:
            raise HTTPException(status_code=403, detail="You can only delete your own messages")

        cursor.execute("UPDATE messages SET is_deleted = 1 WHERE id = ?", (message_id,))

    return {"status": "success", "message": "Message deleted"}
