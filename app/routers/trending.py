from fastapi import APIRouter
from app.services.trending_service import trending_service

router = APIRouter(prefix="/api/trending", tags=["Trending"])

@router.get("")
def get_trending():
    """Returns multi-tier trending feed based on engagement velocity and time decay."""
    return trending_service.get_trending_feed()
