import json
import uuid
import asyncio
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from app.database import get_db
from app.config import settings
from app.services.ai_providers import ai_registry

logger = logging.getLogger("novamind.proposal_analyzer")

EVALUATION_SYSTEM_INSTRUCTION = """You are an expert impartial technical evaluator for startup and open-source collaboration proposals.

CRITICAL EVALUATION POLICY:
- Judge ONLY the proposal text, explicitly stated technical skills, project proof, and stated availability/deliverables.
- You MUST NOT evaluate, assume, or penalize based on personal names, gender, nationality, location, or any non-technical traits.
- Base all evaluations strictly on merit, technical viability, relevance, and concreteness.

Evaluation Criteria:
1. relevance_score (0-100): How closely do the applicant's stated skills, proposed role, and technical background align with this specific innovation domain?
2. specificity_score (0-100): Does the pitch provide concrete implementation details, architectures, past repositories/projects, or measurable milestones? (Penalize vague 'hi, let me join' or 1-line messages severely).
3. contribution_value_score (0-100): How significantly would their stated contribution advance the prototype or MVP?
4. commitment_score (0-100): Realistic estimation of effort, clarity of deliverables, and schedule/timeline readiness.
5. overall_score (0-100): Weighted score based on the above 4 dimensions.
6. category: Strictly one of:
   - 'HIGH_PRIORITY' (Overall score >= 80, highly relevant, specific deliverables, strong skills match)
   - 'MEDIUM_PRIORITY' (Overall score 60-79, good intent and relevant skills, could use portfolio review)
   - 'LOW_PRIORITY' (Overall score < 40, one-liners, generic greeting, zero technical detail, spam)
   - 'NEEDS_REVIEW' (Overall score 40-59, unconventional or borderline submission requiring founder discussion)
7. summary: 1-2 concise objective sentences summarizing technical fit and readiness.
8. strengths: JSON array of 2 to 4 bullet points highlighting specific technical strengths and assets offered.
9. concerns: JSON array of 1 to 3 bullet points highlighting technical omissions, missing portfolio links, or scope risks.
"""

def heuristic_fallback_analysis(
    pitch_message: str,
    role_type: str,
    idea_category: str,
    skills: List[str]
) -> Dict[str, Any]:
    """Robust deterministic fallback when Gemini API is rate-limited or offline."""
    msg = pitch_message.strip()
    words = msg.split()
    word_count = len(words)
    msg_lower = msg.lower()

    tech_keywords = [
        "built", "code", "github", "prototype", "lab", "dataset", "pytorch",
        "fastapi", "hardware", "research", "materials", "patent", "model",
        "develop", "api", "react", "typescript", "architecture", "docker",
        "embedded", "sensor", "firmware", "testing", "benchmarking", "design"
    ]
    matched = [k for k in tech_keywords if k in msg_lower]

    if (word_count <= 6 and len(matched) == 0) or msg_lower in ["hi", "cool idea", "i want to collaborate", "contact me", "nice", "let's talk", "let me know", "hi cool idea let me know"]:
        overall = 22
        relevance = 25
        specificity = 15
        contribution = 20
        commitment = 20
        category = "LOW_PRIORITY"
        summary = "Flagged as low-effort submission lacking concrete technical architecture, deliverables, or past work."
        strengths = ["Quick enthusiasm expressed"]
        concerns = ["Single-line message lacks technical specifics", "No deliverables, past code, or availability stated"]
    elif len(matched) >= 3 or word_count > 45:
        overall = min(96, 78 + len(matched) * 4 + min(10, word_count // 10))
        relevance = min(98, 80 + len(matched) * 3)
        specificity = min(95, 75 + len(matched) * 4)
        contribution = min(96, 75 + len(matched) * 3)
        commitment = 85
        category = "HIGH_PRIORITY"
        summary = f"Strong technical candidate offering concrete assets ({', '.join(matched[:3])}) and clear implementation scope."
        strengths = [
            f"Demonstrated domain experience in {matched[0] if matched else role_type}",
            "Proposed actionable development milestones",
            "Clear alignment with project requirements"
        ]
        concerns = ["Finalize exact weekly hour commitments during kick-off"]
    elif len(matched) >= 1 or word_count > 20:
        overall = 68
        relevance = 70
        specificity = 65
        contribution = 68
        commitment = 65
        category = "MEDIUM_PRIORITY"
        summary = "Credible builder intent with relevant background; recommend requesting portfolio or GitHub samples."
        strengths = ["Identified key technical needs", "Relevant background skills"]
        concerns = ["Needs deeper technical spec before assignment", "Review sample code repositories"]
    else:
        overall = 48
        relevance = 50
        specificity = 45
        contribution = 48
        commitment = 50
        category = "NEEDS_REVIEW"
        summary = "Exploratory collaboration proposal; requires brief discussion to clarify technical deliverables."
        strengths = ["Interest in contributing to innovation"]
        concerns = ["Unspecified tech stack alignment", "Unclear milestone deliverables"]

    return {
        "overall_score": overall,
        "relevance_score": relevance,
        "specificity_score": specificity,
        "contribution_value_score": contribution,
        "commitment_score": commitment,
        "category": category,
        "summary": summary,
        "strengths": strengths,
        "concerns": concerns,
        "model_version": "heuristic-engine-v2",
        "status": "analyzed"
    }

class CollaborationProposalAnalyzer:
    """Enterprise AI Proposal Screener & Shortlisting Engine."""

    def __init__(self, concurrency_limit: int = 4):
        self.semaphore = asyncio.Semaphore(concurrency_limit)

    async def analyze_single_proposal(
        self,
        collab_id: str,
        idea_id: str,
        idea_title: str,
        idea_category: str,
        idea_context: str,
        pitch_message: str,
        role_type: str,
        requester_skills: List[str],
        force: bool = False
    ) -> Dict[str, Any]:
        """Analyzes a single collaboration proposal with caching and structured schema."""
        now = datetime.now(timezone.utc).isoformat()

        # 1. Caching Check: return existing analysis unless force=True
        if not force:
            with get_db() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM collaboration_analyses WHERE collaboration_id = ?", (collab_id,))
                cached = cursor.fetchone()
                if cached:
                    res = dict(cached)
                    res["strengths"] = json.loads(res.get("strengths") or "[]")
                    res["concerns"] = json.loads(res.get("concerns") or "[]")
                    return res

        async with self.semaphore:
            prompt = f"""Evaluate this builder's collaboration proposal for the following innovation project.

Project Title: "{idea_title}"
Innovation Domain: "{idea_category}"
Project Problem/Blueprint Excerpt: "{idea_context[:400]}"

Candidate Collaboration Proposal:
Proposed Role: "{role_type}"
Pitch Message: "{pitch_message}"
Applicant Stated Skills: {json.dumps(requester_skills or [])}

Respond ONLY with a valid JSON object matching this exact format:
{{
  "overall_score": 85,
  "relevance_score": 90,
  "specificity_score": 80,
  "contribution_value_score": 85,
  "commitment_score": 80,
  "category": "HIGH_PRIORITY",
  "summary": "Concise 1-2 sentence technical assessment.",
  "strengths": ["Key strength 1", "Key strength 2"],
  "concerns": ["Key risk or question 1"]
}}
Category must be exactly one of: 'HIGH_PRIORITY', 'MEDIUM_PRIORITY', 'LOW_PRIORITY', 'NEEDS_REVIEW'."""

            parsed_data = None
            model_version = "gemini-2.5-flash"

            try:
                provider = ai_registry.get_provider()
                raw_response = await provider.generate_text(prompt, EVALUATION_SYSTEM_INSTRUCTION)
                
                # Clean response text from code blocks if present
                clean_text = raw_response.strip()
                if "```json" in clean_text:
                    clean_text = clean_text.split("```json")[1].split("```")[0].strip()
                elif "```" in clean_text:
                    clean_text = clean_text.split("```")[1].split("```")[0].strip()

                parsed = json.loads(clean_text)
                
                # Validate required keys
                overall = int(parsed.get("overall_score", 70))
                category = parsed.get("category", "MEDIUM_PRIORITY")
                if category not in ["HIGH_PRIORITY", "MEDIUM_PRIORITY", "LOW_PRIORITY", "NEEDS_REVIEW"]:
                    category = "HIGH_PRIORITY" if overall >= 80 else "MEDIUM_PRIORITY" if overall >= 60 else "LOW_PRIORITY"

                parsed_data = {
                    "overall_score": max(0, min(100, overall)),
                    "relevance_score": max(0, min(100, int(parsed.get("relevance_score", overall)))),
                    "specificity_score": max(0, min(100, int(parsed.get("specificity_score", overall)))),
                    "contribution_value_score": max(0, min(100, int(parsed.get("contribution_value_score", overall)))),
                    "commitment_score": max(0, min(100, int(parsed.get("commitment_score", overall)))),
                    "category": category,
                    "summary": str(parsed.get("summary", "Technical collaboration proposal evaluation complete.")),
                    "strengths": list(parsed.get("strengths", ["Relevant interest in project"])),
                    "concerns": list(parsed.get("concerns", ["Verify timeline availability"])),
                    "model_version": model_version,
                    "status": "analyzed"
                }
            except Exception as e:
                logger.warning(f"Gemini proposal evaluation failed for collab {collab_id} ({e}). Using intelligent fallback.")
                parsed_data = heuristic_fallback_analysis(pitch_message, role_type, idea_category, requester_skills)

            # Persist to database (collaboration_analyses and update collaborations)
            analysis_id = str(uuid.uuid4())
            with get_db() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                INSERT OR REPLACE INTO collaboration_analyses (
                    id, collaboration_id, idea_id, overall_score, relevance_score,
                    specificity_score, contribution_value_score, commitment_score,
                    category, summary, strengths, concerns, model_version, status,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    analysis_id, collab_id, idea_id,
                    parsed_data["overall_score"],
                    parsed_data["relevance_score"],
                    parsed_data["specificity_score"],
                    parsed_data["contribution_value_score"],
                    parsed_data["commitment_score"],
                    parsed_data["category"],
                    parsed_data["summary"],
                    json.dumps(parsed_data["strengths"]),
                    json.dumps(parsed_data["concerns"]),
                    parsed_data["model_version"],
                    parsed_data["status"],
                    now, now
                ))

                # Sync back to collaborations table for backwards compatibility
                cursor.execute("""
                UPDATE collaborations
                SET ai_seriousness_score = ?, ai_classification = ?, ai_rationale = ?
                WHERE id = ?
                """, (
                    parsed_data["overall_score"],
                    parsed_data["category"].lower(),
                    parsed_data["summary"],
                    collab_id
                ))

            return {
                "id": analysis_id,
                "collaboration_id": collab_id,
                "idea_id": idea_id,
                **parsed_data,
                "created_at": now,
                "updated_at": now
            }

    async def screen_all_proposals(self, idea_id: str, force: bool = False) -> Dict[str, Any]:
        """Asynchronously screens all collaboration proposals for an idea in controlled batches."""
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, title, category, raw_content, structured_data FROM ideas WHERE id = ?", (idea_id,))
            idea = cursor.fetchone()
            if not idea:
                return {"error": "Idea not found", "proposals": []}

            cursor.execute("""
            SELECT c.*, u.username, u.display_name, u.skills, u.bio, u.avatar_url
            FROM collaborations c
            JOIN users u ON c.requester_id = u.id
            WHERE c.idea_id = ?
            ORDER BY c.created_at DESC
            """, (idea_id,))
            proposals = [dict(r) for r in cursor.fetchall()]

        if not proposals:
            return {
                "idea_id": idea_id,
                "total_proposals": 0,
                "analyzed_count": 0,
                "high_priority_count": 0,
                "medium_priority_count": 0,
                "low_priority_count": 0,
                "needs_review_count": 0,
                "proposals": []
            }

        idea_title = idea["title"]
        idea_category = idea["category"]
        idea_context = idea.get("raw_content", "")

        # Process proposals concurrently with controlled semaphore limit
        tasks = []
        for p in proposals:
            skills = json.loads(p.get("skills") or "[]") if isinstance(p.get("skills"), str) else (p.get("skills") or [])
            tasks.append(self.analyze_single_proposal(
                collab_id=p["id"],
                idea_id=idea_id,
                idea_title=idea_title,
                idea_category=idea_category,
                idea_context=idea_context,
                pitch_message=p.get("pitch_message", ""),
                role_type=p.get("role_type", "technical"),
                requester_skills=skills,
                force=force
            ))

        analyses = await asyncio.gather(*tasks)

        # Merge analyses back into proposals
        screened_proposals = []
        for p, analysis in zip(proposals, analyses):
            screened_proposals.append({
                **p,
                "analysis": analysis,
                "ai_seriousness_score": analysis["overall_score"],
                "ai_classification": analysis["category"],
                "ai_rationale": analysis["summary"]
            })

        # Sort descending by overall AI score
        screened_proposals.sort(key=lambda x: x["analysis"]["overall_score"], reverse=True)

        high_count = sum(1 for p in screened_proposals if p["analysis"]["category"] == "HIGH_PRIORITY")
        med_count = sum(1 for p in screened_proposals if p["analysis"]["category"] == "MEDIUM_PRIORITY")
        low_count = sum(1 for p in screened_proposals if p["analysis"]["category"] == "LOW_PRIORITY")
        review_count = sum(1 for p in screened_proposals if p["analysis"]["category"] == "NEEDS_REVIEW")

        return {
            "idea_id": idea_id,
            "total_proposals": len(screened_proposals),
            "analyzed_count": len(screened_proposals),
            "high_priority_count": high_count,
            "medium_priority_count": med_count,
            "low_priority_count": low_count,
            "needs_review_count": review_count,
            "proposals": screened_proposals
        }

proposal_analyzer = CollaborationProposalAnalyzer(concurrency_limit=4)
