"""
FREE Natural TTS Integration using Multiple Free APIs
Provides human-sounding voices without requiring API keys
"""
import httpx
from typing import Optional
try:
    from backend.text_utils import sanitize_text_for_tts
except Exception:
    # Fallback to local import when running from the backend directory
    from text_utils import sanitize_text_for_tts
import logging
import base64

logger = logging.getLogger(__name__)


class FreeTTS:
    """Free Text-to-Speech service using public APIs"""
    
    # Available voices from different free services
    VOICES = {
        # Google Translate TTS (Free, no API key needed)
        "emma": {"service": "google", "lang": "en-GB", "gender": "female", "description": "British, clear"},
        "mary": {"service": "google", "lang": "en-US", "gender": "female", "description": "American, natural"},
        "sarah": {"service": "google", "lang": "en-AU", "gender": "female", "description": "Australian, friendly"},
        "john": {"service": "google", "lang": "en-GB", "gender": "male", "description": "British, professional"},
        "david": {"service": "google", "lang": "en-US", "gender": "male", "description": "American, deep"},
        
        # TTSFree.com API (Free, no API key)
        "lisa": {"service": "ttsfree", "voice": "en-US-AvaNeural", "gender": "female", "description": "Natural, expressive"},
        "jenny": {"service": "ttsfree", "voice": "en-US-JennyNeural", "gender": "female", "description": "Friendly, warm"},
        "aria": {"service": "ttsfree", "voice": "en-US-AriaNeural", "gender": "female", "description": "Professional, clear"},
        "guy": {"service": "ttsfree", "voice": "en-US-GuyNeural", "gender": "male", "description": "Energetic, modern"},
        "tony": {"service": "ttsfree", "voice": "en-US-TonyNeural", "gender": "male", "description": "Professional, news"},
    }
    
    def __init__(self):
        """Initialize Free TTS service"""
        self.google_base_url = "https://translate.google.com/translate_tts"
        self.ttsfree_url = "https://ttsfree.com/api/tts"
    
    async def synthesize(
        self,
        text: str,
        voice: str = "lisa"
    ) -> bytes:
        """
        Generate speech from text using free APIs
        
        Args:
            text: Text to convert to speech
            voice: Voice name (lisa, jenny, aria, emma, mary, etc.)
            
        Returns:
            Audio bytes (MP3 format)
        """
        sanitized_text = sanitize_text_for_tts(text)
        voice_config = self.VOICES.get(voice.lower(), self.VOICES["lisa"])
        service = voice_config["service"]
        
        if service == "google":
            return await self._synthesize_google(sanitized_text, voice_config)
        elif service == "ttsfree":
            return await self._synthesize_ttsfree(sanitized_text, voice_config)
        else:
            raise ValueError(f"Unknown service: {service}")
    
    async def _synthesize_google(self, text: str, voice_config: dict) -> bytes:
        """Synthesize using Google Translate TTS (Free)"""
        # Split text into chunks (max 200 chars per request)
        chunks = [text[i:i+200] for i in range(0, len(text), 200)]
        audio_chunks = []
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            for chunk in chunks:
                params = {
                    "ie": "UTF-8",
                    "q": chunk,
                    "tl": voice_config["lang"],
                    "client": "tw-ob",
                    "ttsspeed": "1.0"
                }
                
                response = await client.get(self.google_base_url, params=params)
                response.raise_for_status()
                audio_chunks.append(response.content)
        
        # Combine all audio chunks
        return b''.join(audio_chunks)
    
    async def _synthesize_ttsfree(self, text: str, voice_config: dict) -> bytes:
        """Synthesize using TTSFree.com API (Free, Azure Neural voices)"""
        try:
            headers = {
                "Content-Type": "application/json",
                "Origin": "https://ttsfree.com",
                "Referer": "https://ttsfree.com/",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }
            
            data = {
                "text": text,
                "voice": voice_config["voice"],
                "rate": "0",
                "pitch": "0"
            }
            
            async with httpx.AsyncClient(timeout=30.0, follow_redirects=False) as client:
                response = await client.post(self.ttsfree_url, json=data, headers=headers)
                response.raise_for_status()
                
                # API returns base64 encoded audio
                result = response.json()
                if "audio" in result:
                    return base64.b64decode(result["audio"])
                elif "data" in result:
                    return base64.b64decode(result["data"])
                else:
                    # Fallback to raw response
                    return response.content
        except Exception as e:
            logger.warning(f"TTSFree API failed: {e}, falling back to Google TTS")
            # Fallback to Google TTS with similar voice
            fallback_voice = {
                "service": "google",
                "lang": "en-US" if "US" in voice_config.get("voice", "") else "en-GB",
                "gender": voice_config.get("gender", "female"),
                "description": "Fallback voice"
            }
            return await self._synthesize_google(text, fallback_voice)
    
    def get_voice_options(self):
        """Get list of available voices with descriptions"""
        # Return a richer metadata object for each voice including provider and
        # platform-specific voice id (for ttsfree) where applicable.
        # Mark voices as "available" true by default so the frontend can render
        # them and diagnose fallback behavior.
        # and diagnose when voice fallbacks are used.
        result = {}
        for name, config in self.VOICES.items():
            item = {
                "name": name,
                "provider": config.get("service", "free"),
                "gender": config.get("gender", "unknown"),
                "description": config.get("description", ""),
                "available": True,
            }
            # If the entry contains a provider-specific voice id, include it
            if "voice" in config:
                item["voice_id"] = config["voice"]
            result[name] = item
        return result


# Global instance
_free_tts_service = None


def get_free_tts_service() -> FreeTTS:
    """Get or create Free TTS service instance"""
    global _free_tts_service
    if _free_tts_service is None:
        _free_tts_service = FreeTTS()
    return _free_tts_service
