from fastapi import APIRouter
from typing import Dict, Any
from app.models.schemas import SemanticSearchRequest
from app.services.recommendation_service import recommendation_service
from app.database import get_db

router = APIRouter(prefix="/api/discovery", tags=["Discovery & Search"])

STANDARD_CATEGORIES = [
    "Artificial Intelligence", "Robotics & Hardware", "Energy & Sustainability",
    "Healthcare & Biotech", "Agriculture & Food", "Transportation & Mobility",
    "Space & Aerospace", "Education & EdTech", "Climate & Environment",
    "Cybersecurity & Privacy", "Materials Science", "Nanotechnology",
    "FinTech & Decentralized Systems", "Social Impact", "Quantum Computing",
    "Industrial Automation", "AR / VR / Spatial Computing", "Bioinformatics",
    "Smart Cities & Infrastructure", "Oceanography & Marine Tech", "General"
]

@router.post("/search")
async def semantic_search(data: SemanticSearchRequest):
    """Executes high-dimensional semantic search across structured ideas."""
    results = await recommendation_service.semantic_search(
        query=data.query,
        category=data.category,
        stage=data.stage,
        limit=data.limit
    )
    return {"results": results, "query": data.query, "count": len(results)}

@router.get("/categories")
def get_categories():
    """Returns all innovation categories with active idea counts."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT category, COUNT(*) as count
        FROM ideas
        WHERE status = 'published'
        GROUP BY category
        """)
        counts = {row["category"]: row["count"] for row in cursor.fetchall()}

    category_list = []
    for cat in STANDARD_CATEGORIES:
        category_list.append({
            "name": cat,
            "count": counts.get(cat, 0)
        })
    return {"categories": category_list}
