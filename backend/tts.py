"""TTS Service - FREE version using gTTS"""
import logging
try:
    from backend.text_utils import sanitize_text_for_tts
except Exception:
    # Fallback to local module import when running from backend directory
    from text_utils import sanitize_text_for_tts
from typing import Optional, Literal, cast
import io
import asyncio
import time
from config import settings

logger = logging.getLogger(__name__)


class TTSService:
    def __init__(self):
        self.provider = settings.TTS_PROVIDER
        self.last_request_time = 0
        self.min_request_interval = 2.0  # Minimum 2 seconds between requests
        logger.info(f"TTS provider: {self.provider}")
        if self.provider == "gtts":
            from gtts import gTTS
            self.gTTS = gTTS
            logger.info("Using gTTS (free Google TTS) with rate limiting")
        elif self.provider == "openai":
            from openai import AsyncOpenAI
            self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    
    async def synthesize(self, text: str, tone: str = "neutral", voice: Optional[str] = None) -> bytes:
        """
        Synthesize text to speech with optional voice selection.
        voice: Optional voice name to request from the provider
        """
        # Sanitize text before synthesizing to avoid pronouncing markdown markers
        sanitized_text = sanitize_text_for_tts(text)
        if self.provider == "gtts":
            return await self._synthesize_gtts(sanitized_text, tone, voice)
        elif self.provider == "openai":
            return await self._synthesize_openai(sanitized_text, tone, voice)
        raise ValueError(f"Unsupported TTS provider: {self.provider}")
    
    async def _synthesize_gtts(self, text: str, tone: str, voice: Optional[str]) -> bytes:
        """Synthesize using gTTS (free Google TTS) with rate limiting and retry logic"""
        max_retries = 3
        base_delay = 3  # Start with 3 seconds
        
        for attempt in range(max_retries):
            try:
                # Rate limiting - ensure minimum interval between requests
                current_time = time.time()
                time_since_last = current_time - self.last_request_time
                if time_since_last < self.min_request_interval:
                    wait_time = self.min_request_interval - time_since_last
                    logger.info(f"Rate limiting: waiting {wait_time:.1f}s before request")
                    await asyncio.sleep(wait_time)
                
                # Adjust speech rate based on tone
                slow = (tone == "calm")
                # Map voice to language accent for gTTS when possible
                voice_map = {
                    "emma": "en-GB",
                    "john": "en-GB",
                    "mary": "en-US",
                    "david": "en-US",
                }
                lang = voice_map.get((voice or "").lower(), "en")
                
                logger.info(f"Starting gTTS synthesis (attempt {attempt + 1}/{max_retries}) for {len(text)} characters...")
                
                # Update last request time
                self.last_request_time = time.time()
                
                # Run in thread pool to avoid blocking with timeout
                loop = asyncio.get_event_loop()
                audio_bytes = await asyncio.wait_for(
                    loop.run_in_executor(
                        None, 
                        self._gtts_generate,
                        text,
                        slow,
                        lang
                    ),
                    timeout=30.0  # 30 second timeout
                )
                
                logger.info(f"✅ gTTS generated {len(audio_bytes)} bytes")
                return audio_bytes
                
            except asyncio.TimeoutError:
                logger.error("gTTS timeout after 30 seconds")
                if attempt == max_retries - 1:
                    raise Exception("TTS timed out - text may be too long")
                delay = base_delay * (2 ** attempt)
                logger.info(f"Retrying in {delay}s...")
                await asyncio.sleep(delay)
                
            except Exception as e:
                error_str = str(e)
                logger.error(f"gTTS error (attempt {attempt + 1}/{max_retries}): {error_str}")
                
                # Check if it's a rate limit error (429)
                if "429" in error_str or "Too Many Requests" in error_str:
                    if attempt < max_retries - 1:
                        # Exponential backoff: 3s, 6s, 12s
                        delay = base_delay * (2 ** attempt)
                        logger.warning(f"⏳ Rate limited! Waiting {delay}s before retry...")
                        await asyncio.sleep(delay)
                        continue
                    else:
                        raise Exception("TTS rate limit exceeded. Please wait a moment and try again.")
                else:
                    # For other errors, don't retry
                    raise Exception(f"TTS failed: {error_str}")
        
        # Should never reach here, but just in case
        raise Exception("TTS failed after all retries")
    
    def _gtts_generate(self, text: str, slow: bool, lang: str) -> bytes:
        """Generate TTS audio (runs in thread)"""
        try:
            logger.info("Calling gTTS API...")
            tts = self.gTTS(text=text, lang=lang, slow=slow)
            fp = io.BytesIO()
            logger.info("Writing audio to buffer...")
            tts.write_to_fp(fp)
            fp.seek(0)
            audio_data = fp.read()
            logger.info(f"Generated {len(audio_data)} bytes of audio")
            return audio_data
        except Exception as e:
            logger.error(f"gTTS generation failed: {e}")
            raise
    
    async def _synthesize_openai(self, text: str, tone: str, voice: Optional[str]) -> bytes:
        speed_map = {"calm": 0.85, "neutral": 1.0, "energetic": 1.15}
        speed = speed_map.get(tone, 1.0)
        # Validate configured voice and cast to the Literal union expected by the client.
        allowed_voices = {"alloy", "echo", "fable", "onyx", "nova", "shimmer"}
        # Voice precedence: requested voice parameter -> settings -> default
        requested_voice = voice
        selected_voice = (
            requested_voice if requested_voice in allowed_voices
            else (settings.TTS_VOICE if settings.TTS_VOICE in allowed_voices else "alloy")
        )
        if selected_voice != settings.TTS_VOICE:
            logger.warning(
                "TTS_VOICE %r is not supported, falling back to 'alloy'",
                settings.TTS_VOICE,
            )
        voice_literal = cast(
            Literal["alloy", "echo", "fable", "onyx", "nova", "shimmer"],
            selected_voice,
        )
        response = await self.client.audio.speech.create(
            model="tts-1",
            voice=voice_literal,
            input=text,
            speed=speed,
        )
        return response.content


_tts_service: Optional[TTSService] = None


def get_tts_service() -> TTSService:
    global _tts_service
    if _tts_service is None:
        _tts_service = TTSService()
    return _tts_service
