import os
import logging
from typing import Optional
from supabase import create_client, Client
from app.config import settings

logger = logging.getLogger("novamind.supabase")

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "") or os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

_supabase_client: Optional[Client] = None

def get_supabase() -> Optional[Client]:
    """Returns initialized Supabase cloud client if credentials are configured."""
    global _supabase_client
    if _supabase_client:
        return _supabase_client

    if SUPABASE_URL and SUPABASE_KEY:
        try:
            _supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
            logger.info("Supabase cloud client initialized successfully!")
            return _supabase_client
        except Exception as e:
            logger.error(f"Failed to connect to Supabase: {e}")
            return None
    return None

def is_supabase_enabled() -> bool:
    return bool(SUPABASE_URL and SUPABASE_KEY)
