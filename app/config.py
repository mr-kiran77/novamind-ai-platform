import os
from pathlib import Path
from pydantic_settings import BaseSettings
from typing import List

# Base Directory
BASE_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    # Product Brand & Vision
    APP_NAME: str = "NOVAMIND"
    APP_TAGLINE: str = "AI Innovation & Idea Structuring Platform"
    APP_SLOGAN: str = "Capture ideas before they disappear. Give every idea structure, context, and a path forward."
    VERSION: str = "1.0.0-hackathon"
    ENVIRONMENT: str = "development"
    
    # Server configuration
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # Database
    DATABASE_PATH: str = str(BASE_DIR / "novamind.db")
    
    # Security & Auth
    SECRET_KEY: str = "novamind-super-secret-jwt-key-for-2026-hackathon-security"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Mobile OTP Settings
    DEV_OTP_AUTO_FILL: bool = True
    DEV_OTP_DEFAULT_CODE: str = "123456"
    OTP_EXPIRY_MINUTES: int = 10
    
    # File Storage
    UPLOAD_DIR: str = str(BASE_DIR / "app" / "static" / "uploads")
    MAX_UPLOAD_SIZE_MB: int = 50
    ALLOWED_EXTENSIONS: List[str] = [
        "png", "jpg", "jpeg", "webp", "gif", "svg",
        "mp3", "wav", "m4a", "ogg", "webm",
        "mp4", "mov",
        "pdf", "txt", "md", "docx"
    ]
    
    # AI Providers
    DEFAULT_AI_PROVIDER: str = "local"  # 'local' or 'gemini'
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = "gemini-2.5-flash"
    
    # Feature Flags
    ENABLE_REALTIME_WEBSOCKETS: bool = True
    ENABLE_AUTO_MODERATION: bool = True
    ENABLE_VOICE_ASSISTANT: bool = True
    ENABLE_AGENT_ORCHESTRATOR_LOGGING: bool = True

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()

# Ensure uploads directory exists
Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
