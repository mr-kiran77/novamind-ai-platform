import json
import logging
from typing import List, Dict, Any, Optional
from app.database import get_db
from app.services.ai_providers import ai_registry

logger = logging.getLogger("novamind.recommendation")

class RecommendationService:
    @staticmethod
    async def semantic_search(
        query: str,
        category: Optional[str] = None,
        stage: Optional[str] = None,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """
        Executes semantic search matching user intent vectors against stored idea embeddings.
        Supports hybrid keyword & semantic ranking.
        """
        provider = ai_registry.get_provider()
        query_vector = await provider.get_embedding(query)
        clean_query = query.lower().strip()

        with get_db() as conn:
            cursor = conn.cursor()
            query_sql = """
            SELECT i.*, u.username, u.display_name, u.avatar_url,
                   (SELECT COUNT(*) FROM reactions r WHERE r.idea_id = i.id) as reaction_count,
                   (SELECT COUNT(*) FROM comments c WHERE c.idea_id = i.id) as comment_count
            FROM ideas i
            JOIN users u ON i.user_id = u.id
            WHERE i.status = 'published'
            """
            params = []
            if category and category.lower() != "all":
                query_sql += " AND (i.category LIKE ? OR i.tags LIKE ?)"
                params.extend([f"%{category}%", f"%{category}%"])
            if stage and stage.lower() != "all":
                query_sql += " AND i.stage = ?"
                params.append(stage)

            cursor.execute(query_sql, params)
            rows = cursor.fetchall()

        candidates = []
        for r in rows:
            item = dict(r)
            item["tags"] = json.loads(item.get("tags") or "[]")
            item["media_urls"] = json.loads(item.get("media_urls") or "[]")
            item["structured_data"] = json.loads(item.get("structured_data") or "{}")
            item["embedding"] = json.loads(item.get("embedding") or "[]")
            
            # Text match boost
            text_corpus = f"{item['title']} {item['raw_content']} {item['category']} {' '.join(item['tags'])}".lower()
            keyword_score = 0.0
            for term in clean_query.split():
                if term in text_corpus:
                    keyword_score += 0.25

            item["keyword_bonus"] = min(0.5, keyword_score)
            candidates.append(item)

        ranked = await provider.rank_by_similarity(query_vector, candidates)

        # Combine similarity score + keyword bonus
        for r in ranked:
            r["final_relevance"] = round(r["similarity_score"] * 0.7 + r.get("keyword_bonus", 0.0) * 0.3, 3)

        ranked.sort(key=lambda x: x["final_relevance"], reverse=True)
        return ranked[:limit]

recommendation_service = RecommendationService()
