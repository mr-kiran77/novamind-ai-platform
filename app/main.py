import os
import json
import logging
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

from app.config import settings
from app.database import init_db
from app.seed_data import seed_all
from app.services.messaging_service import manager
from app.routers import (
    auth, ideas, reactions, comments, collaborations,
    trending, discovery, messages, users, moderation,
    assistant, admin, polls, intelligence
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("novamind")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing Novamind AI Innovation Platform...")
    init_db()
    try:
        await seed_all()
    except Exception as e:
        logger.error(f"Error seeding initial data: {e}")
    logger.info(f"{settings.APP_NAME} online at http://{settings.HOST}:{settings.PORT}")
    yield
    logger.info("Shutting down Novamind platform...")

app = FastAPI(
    title=settings.APP_NAME,
    description=settings.APP_TAGLINE,
    version=settings.VERSION,
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Static Files
static_dir = Path(__file__).resolve().parent / "static"
app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

react_dist_dir = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if react_dist_dir.exists():
    app.mount("/app", StaticFiles(directory=str(react_dist_dir), html=True), name="react_app")

# Include Routers
app.include_router(auth.router)
app.include_router(ideas.router)
app.include_router(reactions.router)
app.include_router(comments.router)
app.include_router(collaborations.router)
app.include_router(trending.router)
app.include_router(discovery.router)
app.include_router(messages.router)
app.include_router(users.router)
app.include_router(moderation.router)
app.include_router(assistant.router)
app.include_router(admin.router)
app.include_router(polls.router)
app.include_router(intelligence.router)

# WebSocket Endpoint for Realtime Communication
@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await manager.connect(user_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()
            payload = json.loads(data)
            action = payload.get("action")
            
            if action == "ping":
                await websocket.send_json({"type": "pong"})
            elif action == "typing":
                # Broadcast typing indicator to conversation recipients
                recipients = payload.get("recipients", [])
                await manager.broadcast_to_users(recipients, {
                    "type": "typing",
                    "conversation_id": payload.get("conversation_id"),
                    "user_id": user_id
                })
    except WebSocketDisconnect:
        manager.disconnect(user_id, websocket)
    except Exception as e:
        logger.error(f"WebSocket error for user {user_id}: {e}")
        manager.disconnect(user_id, websocket)

@app.get("/")
def serve_index():
    """Serves the primary Single-Page Application interface."""
    index_file = static_dir / "index.html"
    return FileResponse(index_file)

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT
    }
