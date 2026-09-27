import logging
from typing import Dict, Any
from app.services.ai_providers import ai_registry

logger = logging.getLogger("novamind.voice")

class VoiceService:
    @staticmethod
    async def transcribe_audio_bytes(audio_bytes: bytes, mime_type: str) -> str:
        provider = ai_registry.get_provider()
        return await provider.transcribe_audio(audio_bytes, mime_type)

    @staticmethod
    def parse_voice_command(transcript: str) -> Dict[str, Any]:
        """
        Interprets spoken commands into actionable navigation and tasks:
        - 'show ideas' -> Navigate to user profile / my ideas
        - 'capture' -> Open Rapid Capture modal
        - 'trending' -> Navigate to Trending page
        - 'explore' -> Navigate to Discover
        - 'structure' -> Trigger AI structuring on current idea
        """
        text = transcript.lower().strip()
        if "trending" in text or "hot" in text:
            return {"action": "navigate", "target": "trending", "reply": "Navigating to trending innovation feed."}
        elif "capture" in text or "new idea" in text or "record" in text:
            return {"action": "open_modal", "target": "capture_modal", "reply": "Opening rapid idea capture."}
        elif "my ideas" in text or "my profile" in text:
            return {"action": "navigate", "target": "profile", "reply": "Opening your personal idea portfolio."}
        elif "explore" in text or "discover" in text or "search" in text:
            return {"action": "navigate", "target": "discover", "reply": "Opening exploration and semantic search."}
        elif "help" in text or "how does this work" in text:
            return {"action": "open_assistant", "target": "assistant", "reply": "I am Nova, your AI innovation co-pilot. I can help you record, structure, and advance your ideas."}
        else:
            return {"action": "chat", "target": "assistant", "reply": f"Understood: '{transcript}'. Let me assist you with that."}

voice_service = VoiceService()
