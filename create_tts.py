# Create TTS file
with open(r'c:\Users\Trova\Lumino ai\backend\tts.py', 'w', encoding='utf-8') as f:
    f.write('''"""TTS Service"""
import logging
from typing import Optional
from config import settings

logger = logging.getLogger(__name__)

class TTSService:
    def __init__(self):
        self.provider = settings.TTS_PROVIDER
        logger.info(f"TTS provider: {self.provider}")
        if self.provider == "openai":
            from openai import AsyncOpenAI
            self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    
    async def synthesize(self, text: str, tone: str = "neutral") -> bytes:
        if self.provider == "openai":
            return await self._synthesize_openai(text, tone)
        raise ValueError(f"Unsupported TTS provider: {self.provider}")
    
    async def _synthesize_openai(self, text: str, tone: str) -> bytes:
        speed_map = {"calm": 0.85, "neutral": 1.0, "energetic": 1.15}
        speed = speed_map.get(tone, 1.0)
        voice = settings.TTS_VOICE
        response = await self.client.audio.speech.create(
            model="tts-1",
            voice=voice,
            input=text,
            speed=speed
        )
        return response.content

_tts_service: Optional[TTSService] = None

def get_tts_service() -> TTSService:
    global _tts_service
    if _tts_service is None:
        _tts_service = TTSService()
    return _tts_service
''')
print("TTS file created successfully!")
