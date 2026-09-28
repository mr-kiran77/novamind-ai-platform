import uuid
import json
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, Depends
from app.database import get_db
from app.dependencies import get_current_user, get_optional_user

router = APIRouter(prefix="/api/ideas", tags=["Polls"])

class PollCreateRequest(BaseModel):
    question: str
    options: List[str]

class PollVoteRequest(BaseModel):
    option_index: int

@router.get("/{idea_id}/poll")
def get_idea_poll(idea_id: str, current_user: Optional[Dict[str, Any]] = Depends(get_optional_user)):
    """Retrieves active poll and current voting statistics for an idea."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM polls WHERE idea_id = ?", (idea_id,))
        poll_row = cursor.fetchone()
        if not poll_row:
            return {"poll": None}

        poll = dict(poll_row)
        options = json.loads(poll.get("options") or "[]")

        # Count votes for each option
        cursor.execute("SELECT option_index, COUNT(*) as vote_count FROM poll_votes WHERE poll_id = ? GROUP BY option_index", (poll["id"],))
        vote_counts = {r["option_index"]: r["vote_count"] for r in cursor.fetchall()}

        total_votes = sum(vote_counts.values())

        user_voted_option = None
        if current_user:
            cursor.execute("SELECT option_index FROM poll_votes WHERE poll_id = ? AND user_id = ?", (poll["id"], current_user["id"]))
            uv = cursor.fetchone()
            if uv:
                user_voted_option = uv["option_index"]

        formatted_options = []
        for idx, opt_text in enumerate(options):
            cnt = vote_counts.get(idx, 0)
            pct = round((cnt / total_votes * 100), 1) if total_votes > 0 else 0.0
            formatted_options.append({
                "index": idx,
                "text": opt_text,
                "vote_count": cnt,
                "percentage": pct
            })

        return {
            "poll": {
                "id": poll["id"],
                "idea_id": poll["idea_id"],
                "question": poll["question"],
                "options": formatted_options,
                "total_votes": total_votes,
                "user_voted_option": user_voted_option,
                "created_at": poll["created_at"]
            }
        }

@router.post("/{idea_id}/poll")
def create_idea_poll(idea_id: str, data: PollCreateRequest, optional_user: Optional[Dict[str, Any]] = Depends(get_optional_user)):
    """Attaches a 2-4 option poll to an innovation idea."""
    user = optional_user or {"id": "user_1", "username": "drmayalin", "display_name": "Dr. Maya Lin"}
    if len(data.options) < 2 or len(data.options) > 4:
        raise HTTPException(status_code=400, detail="Polls must have between 2 and 4 options.")
    if not data.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, user_id FROM ideas WHERE id = ?", (idea_id,))
        idea = cursor.fetchone()
        if not idea:
            raise HTTPException(status_code=404, detail="Idea not found.")

        # Check existing poll
        cursor.execute("SELECT id FROM polls WHERE idea_id = ?", (idea_id,))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="This idea already has an active poll.")

        creator_id = idea["user_id"]
        if optional_user and "id" in optional_user:
            cursor.execute("SELECT id FROM users WHERE id = ?", (optional_user["id"],))
            if cursor.fetchone():
                creator_id = optional_user["id"]

        poll_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        cursor.execute("""
        INSERT INTO polls (id, idea_id, question, options, created_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """, (poll_id, idea_id, data.question.strip(), json.dumps([o.strip() for o in data.options]), creator_id, now))

    return get_idea_poll(idea_id, optional_user)

@router.post("/polls/{poll_id}/vote")
def vote_on_poll(poll_id: str, data: PollVoteRequest, optional_user: Optional[Dict[str, Any]] = Depends(get_optional_user)):
    """Submits or updates a vote on an Instagram-style poll."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM polls WHERE id = ?", (poll_id,))
        poll = cursor.fetchone()
        if not poll:
            raise HTTPException(status_code=404, detail="Poll not found.")

        options = json.loads(poll["options"])
        if data.option_index < 0 or data.option_index >= len(options):
            raise HTTPException(status_code=400, detail="Invalid option index.")

        voter_id = poll["created_by"]
        if optional_user and "id" in optional_user:
            cursor.execute("SELECT id FROM users WHERE id = ?", (optional_user["id"],))
            if cursor.fetchone():
                voter_id = optional_user["id"]
        else:
            cursor.execute("SELECT id FROM users LIMIT 1")
            first_u = cursor.fetchone()
            if first_u:
                voter_id = first_u["id"]

        cursor.execute("SELECT id FROM poll_votes WHERE poll_id = ? AND user_id = ?", (poll_id, voter_id))
        existing = cursor.fetchone()
        now = datetime.now(timezone.utc).isoformat()

        if existing:
            cursor.execute("UPDATE poll_votes SET option_index = ?, created_at = ? WHERE id = ?",
                           (data.option_index, now, existing["id"]))
        else:
            cursor.execute("""
            INSERT INTO poll_votes (id, poll_id, user_id, option_index, created_at)
            VALUES (?, ?, ?, ?, ?)
            """, (str(uuid.uuid4()), poll_id, voter_id, data.option_index, now))

    return get_idea_poll(poll["idea_id"], optional_user)
