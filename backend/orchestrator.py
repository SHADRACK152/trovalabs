"""
Orchestrator - Coordinates ASR → LLM → TTS pipeline with Memory
"""
import logging
from typing import Optional

from asr import ASRService
from llm import LLMService
from tts import TTSService
from memory import get_memory_service
from config import settings

logger = logging.getLogger(__name__)


class Orchestrator:
    """
    Orchestrates the complete voice processing pipeline:
    1. ASR: Convert speech to text
    2. LLM: Generate intelligent response
    3. TTS: Convert response to speech with tone control
    """
    
    def __init__(self):
        """Initialize all service components"""
        self.asr = ASRService()
        self.llm = LLMService()
        self.tts = TTSService()
        self.memory = get_memory_service()
        logger.info("Orchestrator initialized with ASR, LLM, TTS, and Memory services")
    
    async def transcribe_audio(self, audio_bytes: bytes, language: str = "en") -> dict:
        """
        Transcribe audio to text
        
        Args:
            audio_bytes: Raw audio data
            language: Language code
        
        Returns:
            dict with 'text' and optional 'confidence'
        """
        logger.info(f"Transcribing audio ({len(audio_bytes)} bytes, lang={language})")
        result = await self.asr.transcribe(audio_bytes, language)
        logger.info(f"Transcription result: '{result['text'][:100]}...'")
        return result
    
    async def generate_text_response(
        self, 
        text: str, 
        tone: str = "neutral",
        user_id: Optional[str] = None,
        conversation_history: Optional[list] = None,
        use_long_term_memory: bool = True
    ) -> str:
        """
        Generate text-only response from LLM with optional long-term memory
        
        Args:
            text: Input text from user
            tone: Desired tone (calm/neutral/energetic)
            user_id: Optional user identifier for personalization
            conversation_history: Previous conversation messages from current session
            use_long_term_memory: Whether to load and save to long-term memory
        
        Returns:
            Response text from LLM
        """
        # Merge short-term (current session) and long-term (persisted) memory
        full_history = []
        
        if use_long_term_memory and user_id:
            # Load long-term memory first
            long_term_history = self.memory.get_conversation_history(user_id, limit=10)
            if long_term_history:
                logger.info(f"🧠 Loaded {len(long_term_history)} messages from long-term memory")
                full_history.extend(long_term_history)
        
        # Add current session history
        if conversation_history:
            full_history.extend(conversation_history)
        
        logger.info(f"Generating LLM response for: '{text[:50]}...' (tone={tone}, total_history={len(full_history)} msgs)")
        # Query shared global memory for related entries and add to context if present
        try:
            related = []
            if getattr(settings, 'GLOBAL_MEMORY_ENABLED', False):
                related = self.memory.retrieve_related_memory(text, limit=3)
            if related:
                logger.info(f"🧭 Found {len(related)} related global memory entries for query")
                # Convert related entries to assistant messages to provide context
                for r in related:
                    full_history.insert(0, {"role": "assistant", "content": f"Memory (score={r['score']}): {r['content']}"})
        except Exception as e:
            logger.warning(f"Failed to include global memory in prompt: {e}")
        
        # Generate response
        response = await self.llm.generate_response(text, tone, user_id, full_history)
        logger.info(f"LLM response: '{response[:100]}...'")
        
        # Save to long-term memory
        if use_long_term_memory and user_id:
            self.memory.save_message(user_id, "user", text, {"tone": tone})
            self.memory.save_message(user_id, "assistant", response, {"tone": tone})
            logger.debug(f"💾 Saved exchange to long-term memory")
        
        return response
    
    async def generate_response(
        self,
        text: str,
        tone: str = "neutral",
        user_id: Optional[str] = None,
        voice: Optional[str] = None
    ) -> bytes:
        """
        Generate LLM response and convert to speech
        
        Args:
            text: Input text from user
            tone: Desired tone for TTS
            user_id: Optional user identifier
        
        Returns:
            Audio bytes (mp3 format)
        """
        # Step 1: Get LLM response
        response_text = await self.generate_text_response(text, tone, user_id)
        
        # Step 2: Convert to speech with tone
        logger.info(f"Converting to speech with tone={tone}")
        # Use user's preferred voice if available (stored in user profile) or default
        # Use explicit voice if provided by caller; otherwise None
        selected_voice = voice
        audio_bytes = await self.tts.synthesize(response_text, tone, selected_voice)
        logger.info(f"TTS generated {len(audio_bytes)} bytes of audio")
        
        return audio_bytes
    
    async def voice_roundtrip(
        self,
        audio_bytes: bytes,
        tone: str = "neutral",
        language: str = "en",
        user_id: Optional[str] = None,
        voice: Optional[str] = None
    ) -> bytes:
        """
        Complete voice roundtrip: ASR → LLM → TTS
        
        Args:
            audio_bytes: Input audio from user
            tone: Desired response tone
            language: Input language
            user_id: Optional user identifier
        
        Returns:
            Audio bytes with AI response
        """
        logger.info(f"Starting voice roundtrip (audio={len(audio_bytes)}b, tone={tone}, lang={language})")
        
        # Step 1: ASR - Speech to text
        transcription = await self.transcribe_audio(audio_bytes, language)
        user_text = transcription["text"]
        
        # Step 2: LLM - Generate response
        response_text = await self.generate_text_response(user_text, tone, user_id)
        
        # Step 3: TTS - Text to speech
        # Use preferred voice from user profile if present
        selected_voice = voice
        response_audio = await self.tts.synthesize(response_text, tone, selected_voice)
        
        logger.info(f"Voice roundtrip complete: input='{user_text[:50]}...', output='{response_text[:50]}...'")
        return response_audio
    
    async def voice_roundtrip_with_text(
        self,
        audio_bytes: bytes,
        tone: str = "neutral",
        language: str = "en",
        user_id: Optional[str] = None,
        voice: Optional[str] = None
    ) -> dict:
        """
        Complete voice roundtrip with text transcripts included
        
        Args:
            audio_bytes: Input audio from user
            tone: Desired response tone
            language: Input language
            user_id: Optional user identifier
        
        Returns:
            dict with 'audio' (bytes), 'user_text' (str), 'response_text' (str)
        """
        logger.info(f"Starting voice roundtrip with text (audio={len(audio_bytes)}b, tone={tone}, lang={language})")
        
        # Step 1: ASR - Speech to text
        transcription = await self.transcribe_audio(audio_bytes, language)
        user_text = transcription["text"]
        
        # Step 2: LLM - Generate response
        response_text = await self.generate_text_response(user_text, tone, user_id)
        
        # Step 3: TTS - Text to speech
        response_audio = await self.tts.synthesize(response_text, tone, voice)
        
        logger.info(f"Voice roundtrip complete: input='{user_text[:50]}...', output='{response_text[:50]}...'")
        return {
            "audio": response_audio,
            "user_text": user_text,
            "response_text": response_text
        }
