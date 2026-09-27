from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional

class TextLLMProvider(ABC):
    @abstractmethod
    async def generate_text(self, prompt: str, system_instruction: Optional[str] = None) -> str:
        """Generates text from a prompt."""
        pass
    
    @abstractmethod
    async def structure_idea(self, raw_content: str, raw_format: str, context: Optional[str] = None) -> Dict[str, Any]:
        """Structures raw idea content into 22 standard innovation fields."""
        pass

class VisionProvider(ABC):
    @abstractmethod
    async def analyze_image(self, image_bytes: bytes, mime_type: str, prompt: Optional[str] = None) -> Dict[str, Any]:
        """Performs image understanding, OCR, and safety check."""
        pass

class SpeechToTextProvider(ABC):
    @abstractmethod
    async def transcribe_audio(self, audio_bytes: bytes, mime_type: str) -> str:
        """Transcribes speech/audio into text."""
        pass

class EmbeddingProvider(ABC):
    @abstractmethod
    async def get_embedding(self, text: str) -> List[float]:
        """Generates semantic embedding vector for text."""
        pass

class ModerationProvider(ABC):
    @abstractmethod
    async def evaluate_safety(self, text: str, media_type: str = "text") -> Dict[str, Any]:
        """Evaluates content safety, toxicity, spam, and constructive nature."""
        pass

class TextToSpeechProvider(ABC):
    @abstractmethod
    async def synthesize_speech(self, text: str) -> bytes:
        """Synthesizes text into spoken audio."""
        pass

class SearchProvider(ABC):
    @abstractmethod
    async def rank_by_similarity(self, query_vector: List[float], candidate_vectors: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Ranks candidates by semantic similarity."""
        pass
