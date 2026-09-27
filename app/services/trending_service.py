import math
import json
from datetime import datetime, timezone
from typing import List, Dict, Any
from app.database import get_db

class TrendingService:
    @staticmethod
    def calculate_trending_score(idea: Dict[str, Any], reactions_count: int, comments_count: int, unique_commenters: int) -> float:
        """
        Computes weighted trending score with time decay and quality weighting.
        """
        # Time decay
        try:
            created_at = datetime.fromisoformat(idea["created_at"])
            now = datetime.now(timezone.utc)
            hours_old = max(0.1, (now - created_at).total_seconds() / 3600.0)
        except Exception:
            hours_old = 1.0

        saves = idea.get("save_count", 0)
        shares = idea.get("share_count", 0)
        views = idea.get("view_count", 0)

        # Engagement points:
        # Meaningful reactions = 3.0 pts, Comments = 4.0 pts, Unique discussion participants = 5.0 pts
        # Saves = 4.5 pts, Shares = 6.0 pts, Views = 0.1 pt
        raw_engagement = (
            (reactions_count * 3.0) +
            (comments_count * 4.0) +
            (unique_commenters * 5.0) +
            (saves * 4.5) +
            (shares * 6.0) +
            (views * 0.1)
        )

        # Quality multiplier from safety score and completeness
        safety_multiplier = max(0.5, idea.get("safety_score", 95.0) / 100.0)

        # Time decay formula: raw_engagement / (hours_old + 2.0)^1.25
        trending_score = (raw_engagement * safety_multiplier) / math.pow(hours_old + 2.0, 1.25)
        return round(trending_score, 3)

    @staticmethod
    def get_trending_feed() -> Dict[str, List[Dict[str, Any]]]:
        """
        Returns categorized trending sections:
        - Rising Now
        - Hot Discussions
        - Emerging Ideas
        - Most Discussed
        - Breakthrough Concepts
        - Collaboration Opportunities
        """
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            SELECT i.*, u.username, u.display_name, u.avatar_url,
                   (SELECT COUNT(*) FROM reactions r WHERE r.idea_id = i.id) as reaction_count,
                   (SELECT COUNT(*) FROM comments c WHERE c.idea_id = i.id) as comment_count,
                   (SELECT COUNT(DISTINCT c.user_id) FROM comments c WHERE c.idea_id = i.id) as unique_commenters,
                   (SELECT COUNT(*) FROM collaborations col WHERE col.idea_id = i.id AND col.status = 'accepted') as collab_count
            FROM ideas i
            JOIN users u ON i.user_id = u.id
            WHERE i.status = 'published'
            """)
            rows = cursor.fetchall()

        processed_ideas = []
        for row in rows:
            idea_dict = dict(row)
            idea_dict["tags"] = json.loads(idea_dict.get("tags") or "[]")
            idea_dict["media_urls"] = json.loads(idea_dict.get("media_urls") or "[]")
            idea_dict["structured_data"] = json.loads(idea_dict.get("structured_data") or "{}")
            score = TrendingService.calculate_trending_score(
                idea_dict,
                idea_dict["reaction_count"],
                idea_dict["comment_count"],
                idea_dict["unique_commenters"]
            )
            idea_dict["trending_score"] = score
            processed_ideas.append(idea_dict)

        # 1. Rising Now (highest trending score)
        rising_now = sorted(processed_ideas, key=lambda x: x["trending_score"], reverse=True)[:8]

        # 2. Hot Discussions (highest comment count)
        hot_discussions = sorted(processed_ideas, key=lambda x: x["comment_count"], reverse=True)[:6]

        # 3. Emerging Ideas (created recently with momentum)
        emerging_ideas = sorted(processed_ideas, key=lambda x: x["created_at"], reverse=True)[:6]

        # 4. Breakthrough Concepts (complexity High or Moonshot, high reactions)
        breakthrough_concepts = [
            i for i in processed_ideas
            if i.get("structured_data", {}).get("estimated_complexity") in ["High", "Moonshot"]
        ]
        if not breakthrough_concepts:
            breakthrough_concepts = sorted(processed_ideas, key=lambda x: x["reaction_count"], reverse=True)[:6]
        else:
            breakthrough_concepts = sorted(breakthrough_concepts, key=lambda x: x["reaction_count"], reverse=True)[:6]

        # 5. Collaboration Opportunities (has collaboration open or suggested)
        collaboration_opportunities = [
            i for i in processed_ideas
            if len(i.get("structured_data", {}).get("potential_collaborators", [])) > 0
        ][:6]

        return {
            "rising_now": rising_now,
            "hot_discussions": hot_discussions,
            "emerging_ideas": emerging_ideas,
            "breakthrough_concepts": breakthrough_concepts,
            "collaboration_opportunities": collaboration_opportunities
        }

trending_service = TrendingService()
