import uuid
import json
import aiofiles
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, Query
from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user, get_optional_user
from app.models.schemas import IdeaCreateRequest, IdeaUpdateRequest, IdeaStageUpdateRequest
from app.services.agent_orchestrator import orchestrator
from app.services.moderation_service import moderation_service
from app.services.ai_providers import ai_registry

router = APIRouter(prefix="/api/ideas", tags=["Ideas"])

@router.post("/upload-media")
async def upload_media(file: UploadFile = File(...), user: Dict[str, Any] = Depends(get_current_user)):
    """Uploads media (audio, video, image, document) with security validation."""
    contents = await file.read()
    check = moderation_service.file_security_check(file.filename, contents, settings.ALLOWED_EXTENSIONS, settings.MAX_UPLOAD_SIZE_MB)
    if not check["is_safe"]:
        raise HTTPException(status_code=400, detail=check["error"])

    file_ext = check["extension"]
    unique_name = f"{uuid.uuid4().hex}_{int(datetime.now().timestamp())}.{file_ext}"
    dest_path = Path(settings.UPLOAD_DIR) / unique_name
    
    async with aiofiles.open(dest_path, "wb") as f:
        await f.write(contents)

    file_url = f"/static/uploads/{unique_name}"
    return {
        "file_url": file_url,
        "filename": file.filename,
        "extension": file_ext,
        "size_mb": check["size_mb"]
    }

@router.post("")
async def create_idea(data: IdeaCreateRequest, user: Dict[str, Any] = Depends(get_current_user)):
    """Rapid Idea Capture endpoint. Triggers multi-agent structuring and safety pipeline."""
    idea_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Run Agent Orchestrator Pipeline
    agent_result = await orchestrator.dispatch("EVENT_IDEA_CAPTURED", {
        "raw_content": data.raw_content,
        "raw_format": data.raw_format,
        "user_id": user["id"]
    })

    moderation_output = agent_result["results"].get("moderation", {})
    policy_decision = moderation_output.get("policy_decision", "published")
    safety_score = moderation_output.get("safety_score", 95.0)

    if policy_decision == "rejected":
        raise HTTPException(
            status_code=400,
            detail=f"Content violates safety guidelines: {', '.join(moderation_output.get('violations', ['Prohibited content']))}"
        )

    # Determine structured data & title
    if data.structure_with_ai and "structured" in agent_result["results"]:
        structured_data = agent_result["results"]["structured"]
        title = data.title or structured_data.get("title", "Untitled Concept")
        category = data.category if data.category != "General" else agent_result["results"].get("category", {}).get("suggested_category", "General")
        tags = list(set((data.tags or []) + agent_result["results"].get("tags", {}).get("tags", [])))
        stage = "structured"
    else:
        structured_data = {}
        title = data.title or data.raw_content[:50] + ("..." if len(data.raw_content) > 50 else "")
        category = data.category or "General"
        tags = data.tags or ["RawThought"]
        stage = "raw_thought"

    # Compute Semantic Embedding
    provider = ai_registry.get_provider()
    embedding = await provider.get_embedding(f"{title} {data.raw_content} {category}")

    status_val = "published" if policy_decision in ["published", "needs_edit"] else "quarantine"

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO ideas (
            id, user_id, title, raw_content, raw_format, media_urls,
            structured_data, category, tags, status, stage, view_count,
            save_count, share_count, embedding, safety_score, moderation_notes,
            created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, ?, ?, ?, ?, ?)
        """, (
            idea_id, user["id"], title, data.raw_content, data.raw_format,
            json.dumps(data.media_urls or []), json.dumps(structured_data),
            category, json.dumps(tags), status_val, stage,
            json.dumps(embedding), safety_score,
            json.dumps(moderation_output.get("violations", [])),
            now, now
        ))

        # Version 1 Record
        cursor.execute("""
        INSERT INTO idea_versions (id, idea_id, version_number, title, content, structured_data, change_summary, created_by, created_at)
        VALUES (?, ?, 1, ?, ?, ?, 'Initial capture', ?, ?)
        """, (str(uuid.uuid4()), idea_id, title, data.raw_content, json.dumps(structured_data), user["id"], now))

        # Update User Reputation & Streak
        today = now[:10]
        cursor.execute("""
        INSERT OR IGNORE INTO user_streaks (id, user_id, activity_date, activity_type)
        VALUES (?, ?, ?, 'capture')
        """, (str(uuid.uuid4()), user["id"], today))

        cursor.execute("""
        UPDATE users
        SET reputation_score = reputation_score + 25,
            current_streak = CASE WHEN last_active_date != ? THEN current_streak + 1 ELSE current_streak END,
            longest_streak = MAX(longest_streak, current_streak),
            last_active_date = ?
        WHERE id = ?
        """, (today, today, user["id"]))

    return {
        "id": idea_id,
        "title": title,
        "status": status_val,
        "stage": stage,
        "structured_data": structured_data,
        "category": category,
        "tags": tags,
        "message": "Idea captured and structured successfully!"
    }

@router.get("")
def get_ideas_feed(
    category: Optional[str] = None,
    raw_format: Optional[str] = None,
    stage: Optional[str] = None,
    limit: int = 20,
    offset: int = 0,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_user)
):
    """Dynamic feed with filtering by category, format, and stage."""
    with get_db() as conn:
        cursor = conn.cursor()
        query = """
        SELECT i.*, u.username, u.display_name, u.avatar_url,
               (SELECT COUNT(*) FROM reactions r WHERE r.idea_id = i.id) as reaction_count,
               (SELECT COUNT(*) FROM comments c WHERE c.idea_id = i.id) as comment_count,
               (SELECT COUNT(*) FROM saved_ideas s WHERE s.idea_id = i.id) as save_count,
               (SELECT COUNT(*) FROM collaborations col WHERE col.idea_id = i.id AND col.status = 'accepted') as collab_count
        FROM ideas i
        JOIN users u ON i.user_id = u.id
        WHERE i.status = 'published'
        """
        params = []
        if category and category.lower() != "all":
            query += " AND i.category = ?"
            params.append(category)
        if raw_format and raw_format.lower() != "all":
            query += " AND i.raw_format = ?"
            params.append(raw_format)
        if stage and stage.lower() != "all":
            query += " AND i.stage = ?"
            params.append(stage)

        query += " ORDER BY i.created_at DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])

        cursor.execute(query, params)
        rows = cursor.fetchall()

    items = []
    user_id = current_user.get("id") if (current_user and isinstance(current_user, dict)) else None
    
    with get_db() as conn:
        cursor = conn.cursor()
        for r in rows:
            d = dict(r)
            d["tags"] = json.loads(d.get("tags") or "[]")
            d["media_urls"] = json.loads(d.get("media_urls") or "[]")
            d["structured_data"] = json.loads(d.get("structured_data") or "{}")
            del d["embedding"]  # Omit large vector from feed list

            # User reaction status & following
            user_reactions = []
            is_saved = False
            is_following = False
            if user_id:
                cursor.execute("SELECT reaction_type FROM reactions WHERE idea_id = ? AND user_id = ?", (d["id"], user_id))
                user_reactions = [row["reaction_type"] for row in cursor.fetchall()]
                cursor.execute("SELECT 1 FROM saved_ideas WHERE idea_id = ? AND user_id = ?", (d["id"], user_id))
                is_saved = bool(cursor.fetchone())
                cursor.execute("SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?", (user_id, d["user_id"]))
                is_following = bool(cursor.fetchone())

            d["user_reactions"] = user_reactions
            d["is_liked"] = "like" in user_reactions
            d["is_saved"] = is_saved
            d["is_following_author"] = is_following

            # Check for attached community poll
            cursor.execute("SELECT * FROM polls WHERE idea_id = ?", (d["id"],))
            p_row = cursor.fetchone()
            if p_row:
                p_dict = dict(p_row)
                p_opts = json.loads(p_dict.get("options") or "[]")
                cursor.execute("SELECT option_index, COUNT(*) as vote_count FROM poll_votes WHERE poll_id = ? GROUP BY option_index", (p_dict["id"],))
                v_counts = {r["option_index"]: r["vote_count"] for r in cursor.fetchall()}
                tot_v = sum(v_counts.values())
                u_vote = None
                if user_id:
                    cursor.execute("SELECT option_index FROM poll_votes WHERE poll_id = ? AND user_id = ?", (p_dict["id"], user_id))
                    uv = cursor.fetchone()
                    if uv:
                        u_vote = uv["option_index"]
                formatted_opts = []
                for idx, opt_text in enumerate(p_opts):
                    cnt = v_counts.get(idx, 0)
                    pct = round((cnt / tot_v * 100), 1) if tot_v > 0 else 0.0
                    formatted_opts.append({"index": idx, "text": opt_text, "vote_count": cnt, "percentage": pct})
                d["poll"] = {
                    "id": p_dict["id"],
                    "idea_id": p_dict["idea_id"],
                    "question": p_dict["question"],
                    "options": formatted_opts,
                    "total_votes": tot_v,
                    "user_voted_option": u_vote,
                    "created_at": p_dict["created_at"]
                }
            else:
                d["poll"] = None

            items.append(d)

    return {"ideas": items, "count": len(items)}

@router.get("/{idea_id}")
def get_idea_detail(idea_id: str, current_user: Optional[Dict[str, Any]] = Depends(get_optional_user)):
    """Full deep-dive detail of an idea with all 22 structured fields and reactions."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT i.*, u.username, u.display_name, u.avatar_url, u.bio,
               (SELECT COUNT(*) FROM reactions r WHERE r.idea_id = i.id) as reaction_count,
               (SELECT COUNT(*) FROM comments c WHERE c.idea_id = i.id) as comment_count,
               (SELECT COUNT(*) FROM saved_ideas s WHERE s.idea_id = i.id) as save_count
        FROM ideas i
        JOIN users u ON i.user_id = u.id
        WHERE i.id = ?
        """, (idea_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Idea concept not found")

        idea = dict(row)
        idea["tags"] = json.loads(idea.get("tags") or "[]")
        idea["media_urls"] = json.loads(idea.get("media_urls") or "[]")
        idea["structured_data"] = json.loads(idea.get("structured_data") or "{}")
        if "embedding" in idea:
            del idea["embedding"]

        # Increment view count
        cursor.execute("UPDATE ideas SET view_count = view_count + 1 WHERE id = ?", (idea_id,))

        # Fetch reactions breakdown
        cursor.execute("""
        SELECT reaction_type, COUNT(*) as count
        FROM reactions WHERE idea_id = ? GROUP BY reaction_type
        """, (idea_id,))
        reaction_breakdown = {r["reaction_type"]: r["count"] for r in cursor.fetchall()}
        idea["reaction_breakdown"] = reaction_breakdown

        # Fetch all collaboration proposals (for AI screening & management)
        cursor.execute("""
        SELECT c.*, u.username, u.display_name, u.avatar_url, u.skills
        FROM collaborations c
        JOIN users u ON c.requester_id = u.id
        WHERE c.idea_id = ?
        ORDER BY c.created_at DESC
        """, (idea_id,))
        all_collabs = [dict(c) for c in cursor.fetchall()]
        idea["collaborations"] = all_collabs
        idea["collaborators"] = [c for c in all_collabs if c.get("status") == "accepted"]

        # Fetch comments
        cursor.execute("""
        SELECT c.*, u.username, u.display_name, u.avatar_url
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.idea_id = ?
        ORDER BY c.created_at ASC
        """, (idea_id,))
        idea["comments"] = [dict(c) for c in cursor.fetchall()]

        # Check for attached community poll
        cursor.execute("SELECT * FROM polls WHERE idea_id = ?", (idea_id,))
        p_row = cursor.fetchone()
        if p_row:
            p_dict = dict(p_row)
            p_opts = json.loads(p_dict.get("options") or "[]")
            cursor.execute("SELECT option_index, COUNT(*) as vote_count FROM poll_votes WHERE poll_id = ? GROUP BY option_index", (p_dict["id"],))
            v_counts = {r["option_index"]: r["vote_count"] for r in cursor.fetchall()}
            tot_v = sum(v_counts.values())
            u_vote = None
            if current_user and isinstance(current_user, dict):
                cursor.execute("SELECT option_index FROM poll_votes WHERE poll_id = ? AND user_id = ?", (p_dict["id"], current_user.get("id")))
                uv = cursor.fetchone()
                if uv:
                    u_vote = uv["option_index"]
            formatted_opts = []
            for idx, opt_text in enumerate(p_opts):
                cnt = v_counts.get(idx, 0)
                pct = round((cnt / tot_v * 100), 1) if tot_v > 0 else 0.0
                formatted_opts.append({"index": idx, "text": opt_text, "vote_count": cnt, "percentage": pct})
            idea["poll"] = {
                "id": p_dict["id"],
                "idea_id": p_dict["idea_id"],
                "question": p_dict["question"],
                "options": formatted_opts,
                "total_votes": tot_v,
                "user_voted_option": u_vote,
                "created_at": p_dict["created_at"]
            }
        else:
            idea["poll"] = None

        # User specific state
        user_reactions = []
        is_saved = False
        is_following = False
        if current_user and isinstance(current_user, dict):
            u_id = current_user.get("id")
            cursor.execute("SELECT reaction_type FROM reactions WHERE idea_id = ? AND user_id = ?", (idea_id, u_id))
            user_reactions = [r["reaction_type"] for r in cursor.fetchall()]
            cursor.execute("SELECT 1 FROM saved_ideas WHERE idea_id = ? AND user_id = ?", (idea_id, u_id))
            is_saved = bool(cursor.fetchone())
            cursor.execute("SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?", (u_id, idea["user_id"]))
            is_following = bool(cursor.fetchone())

        idea["user_reactions"] = user_reactions
        idea["is_liked"] = "like" in user_reactions
        idea["is_saved"] = is_saved
        idea["is_following_author"] = is_following

    return idea

@router.put("/{idea_id}")
def update_idea(idea_id: str, data: IdeaUpdateRequest, user: Dict[str, Any] = Depends(get_current_user)):
    """Allows user to edit every AI-generated field and creates a new version history entry."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM ideas WHERE id = ?", (idea_id,))
        existing = cursor.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Idea not found")
        if existing["user_id"] != user["id"] and user["role"] not in ["moderator", "admin"]:
            raise HTTPException(status_code=403, detail="Only creator can modify this idea")

        cursor.execute("SELECT MAX(version_number) as max_v FROM idea_versions WHERE idea_id = ?", (idea_id,))
        next_v = (cursor.fetchone()["max_v"] or 1) + 1

        new_title = data.title or existing["title"]
        new_category = data.category or existing["category"]
        new_tags = json.dumps(data.tags) if data.tags is not None else existing["tags"]
        new_structured = json.dumps(data.structured_data) if data.structured_data is not None else existing["structured_data"]
        now = datetime.now(timezone.utc).isoformat()

        cursor.execute("""
        UPDATE ideas
        SET title = ?, category = ?, tags = ?, structured_data = ?, updated_at = ?
        WHERE id = ?
        """, (new_title, new_category, new_tags, new_structured, now, idea_id))

        cursor.execute("""
        INSERT INTO idea_versions (id, idea_id, version_number, title, content, structured_data, change_summary, created_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (str(uuid.uuid4()), idea_id, next_v, new_title, existing["raw_content"], new_structured, data.change_summary or "User revised concept", user["id"], now))

    return {"status": "success", "version": next_v, "message": f"Idea updated to version {next_v}"}

@router.put("/{idea_id}/stage")
def update_idea_stage(idea_id: str, data: IdeaStageUpdateRequest, user: Dict[str, Any] = Depends(get_current_user)):
    """Advances the signature Idea Journey milestone."""
    valid_stages = ["raw_thought", "structured", "discussion", "improved", "prototype", "project", "opportunity"]
    if data.stage not in valid_stages:
        raise HTTPException(status_code=400, detail=f"Invalid stage. Must be one of: {valid_stages}")

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT user_id FROM ideas WHERE id = ?", (idea_id,))
        idea = cursor.fetchone()
        if not idea:
            raise HTTPException(status_code=404, detail="Idea not found")
        if idea["user_id"] != user["id"] and user["role"] not in ["moderator", "admin"]:
            raise HTTPException(status_code=403, detail="Unauthorized to change idea journey")

        now = datetime.now(timezone.utc).isoformat()
        cursor.execute("UPDATE ideas SET stage = ?, updated_at = ? WHERE id = ?", (data.stage, now, idea_id))

    return {"status": "success", "stage": data.stage, "message": f"Idea Journey advanced to '{data.stage}'"}

@router.post("/{idea_id}/structure")
async def trigger_idea_structure(idea_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    """On-demand trigger to structure an existing raw idea with AI."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM ideas WHERE id = ?", (idea_id,))
        idea = cursor.fetchone()
        if not idea:
            raise HTTPException(status_code=404, detail="Idea not found")

    provider = ai_registry.get_provider()
    structured = await provider.structure_idea(idea["raw_content"], idea["raw_format"])

    with get_db() as conn:
        cursor = conn.cursor()
        now = datetime.now(timezone.utc).isoformat()
        cursor.execute("""
        UPDATE ideas
        SET structured_data = ?, title = ?, stage = 'structured', updated_at = ?
        WHERE id = ?
        """, (json.dumps(structured), structured.get("title", idea["title"]), now, idea_id))

        cursor.execute("SELECT MAX(version_number) as max_v FROM idea_versions WHERE idea_id = ?", (idea_id,))
        next_v = (cursor.fetchone()["max_v"] or 1) + 1
        cursor.execute("""
        INSERT INTO idea_versions (id, idea_id, version_number, title, content, structured_data, change_summary, created_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 'Structured with AI', ?, ?)
        """, (str(uuid.uuid4()), idea_id, next_v, structured.get("title", idea["title"]), idea["raw_content"], json.dumps(structured), user["id"], now))

    return {"status": "success", "structured_data": structured}

@router.get("/{idea_id}/versions")
def get_idea_versions(idea_id: str):
    """Retrieves full evolution and version history of an idea."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT v.*, u.username, u.display_name
        FROM idea_versions v
        JOIN users u ON v.created_by = u.id
        WHERE v.idea_id = ?
        ORDER BY v.version_number DESC
        """, (idea_id,))
        rows = cursor.fetchall()

    versions = []
    for r in rows:
        d = dict(r)
        d["structured_data"] = json.loads(d.get("structured_data") or "{}")
        versions.append(d)
    return {"versions": versions}

@router.post("/{idea_id}/save")
def toggle_save_idea(idea_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    """Saves or unsaves an idea to user's personal vault."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM saved_ideas WHERE user_id = ? AND idea_id = ?", (user["id"], idea_id))
        existing = cursor.fetchone()
        if existing:
            cursor.execute("DELETE FROM saved_ideas WHERE id = ?", (existing["id"],))
            cursor.execute("UPDATE ideas SET save_count = MAX(0, save_count - 1) WHERE id = ?", (idea_id,))
            return {"is_saved": False, "message": "Idea removed from saved vault"}
        else:
            now = datetime.now(timezone.utc).isoformat()
            cursor.execute("INSERT INTO saved_ideas (id, user_id, idea_id, created_at) VALUES (?, ?, ?, ?)",
                           (str(uuid.uuid4()), user["id"], idea_id, now))
            cursor.execute("UPDATE ideas SET save_count = save_count + 1 WHERE id = ?", (idea_id,))
            return {"is_saved": True, "message": "Idea saved to personal vault"}
