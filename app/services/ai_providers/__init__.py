from app.config import settings
from app.services.ai_providers.local_provider import local_ai_provider
from app.services.ai_providers.gemini_provider import GeminiAIProvider

class AIProviderRegistry:
    def __init__(self):
        self.active_provider_name = settings.DEFAULT_AI_PROVIDER
        self.local_provider = local_ai_provider
        self.gemini_provider = GeminiAIProvider(settings.GEMINI_API_KEY)

    def set_active_provider(self, provider_name: str, api_key: str = None):
        self.active_provider_name = provider_name
        if api_key:
            self.gemini_provider = GeminiAIProvider(api_key)

    def get_provider(self):
        if self.active_provider_name == "gemini" and self.gemini_provider._is_configured():
            return self.gemini_provider
        return self.local_provider

ai_registry = AIProviderRegistry()
