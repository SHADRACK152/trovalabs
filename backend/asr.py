"""
ASR (Automatic Speech Recognition) Service
Converts speech to text using FREE services
"""
import logging
from typing import Optional
import io
import json
import tempfile
import os
import asyncio

from config import settings

logger = logging.getLogger(__name__)


class ASRService:
    """
    Speech-to-text service supporting multiple providers:
    - SpeechRecognition (free, uses Google)
    - Groq Whisper (FREE, uses Groq API - FAST!)
    - OpenAI Whisper API (paid)
    """
    
    def __init__(self):
        """Initialize ASR service based on configured provider"""
        self.provider = settings.ASR_PROVIDER
        logger.info(f"Initializing ASR service with provider: {self.provider}")

        if self.provider == "speech_recognition":
            import speech_recognition as sr
            self.recognizer = sr.Recognizer()
            logger.info("Using SpeechRecognition (free Google API)")

        elif self.provider == "groq_whisper":
            from openai import AsyncOpenAI
            if not settings.GROQ_API_KEY:
                logger.warning("GROQ_API_KEY not set - ASR will fail")
            # Use Groq's OpenAI-compatible API
            self.client = AsyncOpenAI(
                api_key=settings.GROQ_API_KEY,
                base_url=settings.GROQ_BASE_URL,
            )
            logger.info(f"Using Groq Whisper (FREE) - model: {settings.ASR_MODEL}")

        elif self.provider == "openai_whisper":
            from openai import AsyncOpenAI
            if not settings.OPENAI_API_KEY:
                logger.warning("OPENAI_API_KEY not set - ASR will fail")
            self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

        elif self.provider == "google":
            # TODO: Initialize Google Speech-to-Text client
            logger.info("Google Speech-to-Text - implement when needed")

        elif self.provider == "azure":
            # TODO: Initialize Azure Speech Services client
            logger.info("Azure Speech Services - implement when needed")

        elif self.provider in ("faster_whisper", "faster-whisper"):
            # Initialize provider-specific faster-whisper model
            try:
                from faster_whisper import WhisperModel
                model_size = settings.FASTER_WHISPER_MODEL or "small"
                logger.info(f"Initializing Faster-Whisper (provider) model: {model_size}")
                self.whisper_model = WhisperModel(model_size, device="cpu", compute_type="int8")
                logger.info("Faster-Whisper provider model initialized")
            except Exception as e:
                logger.exception(f"Failed to initialize Faster-Whisper (provider): {e}")
                self.whisper_model = None

        else:
            raise ValueError(f"Unsupported ASR provider: {self.provider}")
        # Initialize local faster-whisper fallback model only when explicitly enabled via config
        self.local_whisper_model = None
        if settings.FASTER_WHISPER_ENABLED:
            try:
                from faster_whisper import WhisperModel
                model_size = settings.FASTER_WHISPER_MODEL or "small"
                # If user provided a local path, use it to avoid HF downloads
                model_source = settings.FASTER_WHISPER_LOCAL_PATH or model_size
                logger.info(f"Attempting to initialize local Faster-Whisper fallback model: {model_source}")
                # Instantiate with the provided source (local path or model name)
                self.local_whisper_model = WhisperModel(model_source, device="cpu", compute_type="int8")
                logger.info("Local Faster-Whisper fallback model initialized")
            except Exception as e:
                logger.exception(f"Local Faster-Whisper fallback model not available or failed to initialize: {e}")
                self.local_whisper_model = None
    
    async def transcribe(self, audio_bytes: bytes, language: str = "en") -> dict:
        """
        Transcribe audio to text
        
        Args:
            audio_bytes: Raw audio data (wav, mp3, webm, etc.)
            language: Language code (e.g., 'en', 'es', 'fr')
       
        Returns:
            dict with keys:
                - text: Transcribed text
                - confidence: Optional confidence score (0-1)
        """
        if self.provider == "speech_recognition":
            return await self._transcribe_speech_recognition(audio_bytes, language)
        elif self.provider == "faster_whisper" or self.provider == "faster-whisper":
            # Use local faster-whisper if available
            if getattr(self, 'local_whisper_model', None) or getattr(self, 'whisper_model', None):
                return await self._transcribe_faster_whisper(audio_bytes, language)
            else:
                raise Exception("ASR configuration error: Faster-Whisper model not initialized or available")
        elif self.provider == "groq_whisper":
            if not settings.GROQ_API_KEY:
                logger.error("Groq API key missing. Cannot transcribe.")
                raise Exception(
                    "ASR configuration error: Groq API key missing."
                )
            try:
                return await self._transcribe_whisper(audio_bytes, language)
            except Exception as e:
                logger.error(f"Groq Whisper connection error: {str(e)}")
                raise Exception(
                    "ASR connection error: Unable to reach Groq Whisper service. "
                    "Please check your network or API key."
                )
        elif self.provider == "openai_whisper":
            if not settings.OPENAI_API_KEY:
                logger.error("OpenAI API key missing. Cannot transcribe.")
                raise Exception(
                    "ASR configuration error: OpenAI API key missing."
                )
            try:
                return await self._transcribe_whisper(audio_bytes, language)
            except Exception as e:
                logger.error(f"OpenAI Whisper connection error: {str(e)}")
                raise Exception(
                    "ASR connection error: Unable to reach OpenAI Whisper service. "
                    "Please check your network or API key."
                )
        else:
            raise ValueError(f"Unsupported ASR provider: {self.provider}")
    
    async def _transcribe_speech_recognition(
        self, audio_bytes: bytes, language: str
    ) -> dict:
        """
        Transcribe using SpeechRecognition (free Google API)
        """
        tmp_path = None
        wav_path = None
        
        try:
            import speech_recognition as sr
            from pydub import AudioSegment
            
            # Add ffmpeg to PATH if not already there
            ffmpeg_dir = "C:\\ffmpeg"
            if ffmpeg_dir not in os.environ.get("PATH", ""):
                os.environ["PATH"] = (
                    ffmpeg_dir + os.pathsep + os.environ.get("PATH", "")
                )
                logger.info(f"Added {ffmpeg_dir} to PATH")
            
            # Configure ffmpeg path explicitly for pydub
            if os.path.exists(os.path.join(ffmpeg_dir, "ffmpeg.exe")):
                AudioSegment.converter = os.path.join(ffmpeg_dir, "ffmpeg.exe")
                AudioSegment.ffmpeg = os.path.join(ffmpeg_dir, "ffmpeg.exe")
                AudioSegment.ffprobe = os.path.join(ffmpeg_dir, "ffprobe.exe")
                logger.info("Configured pydub to use ffmpeg from C:\\ffmpeg")
            
            # Save audio to temp file
            with tempfile.NamedTemporaryFile(
                suffix='.webm', delete=False
            ) as tmp_file:
                tmp_file.write(audio_bytes)
                tmp_path = tmp_file.name
            
            # Convert webm to wav using pydub
            audio = AudioSegment.from_file(tmp_path, format="webm")
            wav_path = tmp_path.replace('.webm', '.wav')
            audio.export(wav_path, format="wav")
            
            # Small delay to ensure file is fully written
            await asyncio.sleep(0.1)
            
            # Transcribe with speech_recognition
            with sr.AudioFile(wav_path) as source:
                audio_data = self.recognizer.record(source)
                try:
                    # Use show_all to get raw response dict and be resilient to non-JSON payloads
                    raw_result = self.recognizer.recognize_google(
                        audio_data, language=language, show_all=True
                    )
                    text = ""
                    if not raw_result:
                        # Empty result - fall back later
                        text = ""
                    elif isinstance(raw_result, dict):
                        # Expected structure: {'alternative': [{'transcript': ...}, ...]}
                        alternatives = raw_result.get("alternative") or []
                        if alternatives and isinstance(alternatives, list):
                            first_alt = alternatives[0]
                            text = first_alt.get("transcript", "")
                        else:
                            text = ""
                    elif isinstance(raw_result, str):
                        text = raw_result
                    else:
                        # Fallback in unexpected shape
                        text = str(raw_result)
                except json.JSONDecodeError:
                    logger.exception("Google ASR returned invalid JSON")
                    # Check if a faster-whisper model is available to fallback
                    model_available = (
                        getattr(self, "local_whisper_model", None)
                        or getattr(self, "whisper_model", None)
                    )
                    if model_available:
                        logger.info(
                            "Falling back to Faster-Whisper (JSON error)"
                        )
                        return await self._transcribe_faster_whisper(
                            audio_bytes, language
                        )
                    # Otherwise, return an empty result rather than crash
                    logger.warning(
                        "Google ASR invalid JSON and no fallback available;"
                        " returning empty transcription"
                    )
                    return {"text": "", "confidence": 0.0}
            
            logger.info(f"Transcribed: '{text[:100]}...'")
            
            return {
                "text": text,
                "confidence": None
            }
        
        except sr.UnknownValueError:
            logger.exception("Could not understand audio")
            # If we have a local Faster-Whisper model, try it as a fallback
            model_available = (
                getattr(self, 'local_whisper_model', None)
                or getattr(self, 'whisper_model', None)
            )
            if model_available:
                logger.info(
                    "Attempting Faster-Whisper fallback after UnknownValueError"
                )
                try:
                    return await self._transcribe_faster_whisper(
                        audio_bytes, language
                    )
                except Exception as fw_e:
                    logger.exception(
                        "Faster-Whisper fallback after UnknownValueError failed: %s",
                        fw_e,
                    )
                    return {"text": "", "confidence": 0.0}
            return {"text": "", "confidence": 0.0}
        except sr.RequestError as e:
            logger.exception(f"Google API error / network issue: {str(e)}")
            # Fallback to local faster-whisper if available
            has_whisper_provider = (
                hasattr(self, 'whisper_model')
                and self.whisper_model is not None
            )
            if has_whisper_provider:
                logger.info(
                    "Attempting fallback to Faster-Whisper due to network issue"
                )
                try:
                    return await self._transcribe_faster_whisper(
                        audio_bytes, language
                    )
                except Exception as fw_e:
                    logger.exception(
                        "Faster-Whisper fallback failed: %s",
                        fw_e,
                    )
                    raise Exception(
                        "ASR failed: Google API error: "
                        f"{str(e)}; Faster-Whisper fallback failed: {fw_e}"
                    )
            raise Exception(f"ASR failed: {str(e)}")
        except Exception as e:
            logger.exception(f"SpeechRecognition error: {str(e)}")
            raise Exception(f"ASR failed: {str(e)}")
        
        finally:
            # Clean up temp files with retry logic
            await asyncio.sleep(0.2)  # Give time for file handles to close
            
            if wav_path and os.path.exists(wav_path):
                try:
                    os.unlink(wav_path)
                except Exception as e:
                    logger.warning(f"Could not delete wav file: {e}")
            
            if tmp_path and os.path.exists(tmp_path):
                try:
                    os.unlink(tmp_path)
                except Exception as e:
                    logger.warning(f"Could not delete temp file: {e}")
    
    async def _transcribe_faster_whisper(
        self,
        audio_bytes: bytes,
        language: str,
    ) -> dict:
        """
        Transcribe using Faster-Whisper (local, free)
        """
        try:
            # Save audio to temporary file
            with tempfile.NamedTemporaryFile(suffix='.webm', delete=False) as tmp_file:
                tmp_file.write(audio_bytes)
                tmp_path = tmp_file.name
            
            try:
                # Transcribe using whichever local whisper model is available
                model_instance = (
                    getattr(self, 'whisper_model', None)
                    or getattr(self, 'local_whisper_model', None)
                )
                if model_instance is None:
                    raise Exception(
                        "No local Faster-Whisper model available for transcription"
                    )
                # Transcribe
                segments, info = model_instance.transcribe(
                    tmp_path,
                    language=language if language != "auto" else None,
                    beam_size=5,
                    vad_filter=True,  # Voice activity detection
                )
                
                # Combine all segments
                text = " ".join([segment.text for segment in segments])
                text = text.strip()
                
                logger.info(f"Faster-Whisper transcription: '{text[:100]}...'")
                
                return {
                    "text": text,
                    "confidence": info.language_probability if hasattr(info, 'language_probability') else None
                }
            finally:
                # Clean up temp file
                if os.path.exists(tmp_path):
                    os.unlink(tmp_path)
        
        except Exception as e:
            logger.exception(f"Faster-Whisper transcription error: {str(e)}")
            raise Exception(f"ASR failed: {str(e)}")
    
    async def _transcribe_whisper(self, audio_bytes: bytes, language: str) -> dict:
        """
        Transcribe using Whisper API (OpenAI or Groq)
        
        Whisper supports: mp3, mp4, mpeg, mpga, m4a, wav, webm
        Max file size: 25 MB (OpenAI), no limit (Groq)
        """
        try:
            # Create file-like object
            audio_file = io.BytesIO(audio_bytes)
            audio_file.name = "audio.webm"  # Whisper needs a filename with extension
            
            # Select model based on provider
            if self.provider == "groq_whisper":
                model = settings.ASR_MODEL  # whisper-large-v3-turbo
                logger.info(f"Calling Groq Whisper (FREE) - model={model}, lang={language}")
            else:
                model = settings.WHISPER_MODEL  # whisper-1 for OpenAI
                logger.info(f"Calling OpenAI Whisper - model={model}, lang={language}")
            
            # Call Whisper API
            try:
                response = await self.client.audio.transcriptions.create(
                    model=model,
                    file=audio_file,
                    language=language if language != "auto" else "en",
                    response_format="text"  # Simple text response is faster
                )
            except Exception as e:
                logger.exception(f"Whisper API call failed: {e}")
                # If a faster-whisper model is available, fallback to local transcription
                if getattr(self, 'local_whisper_model', None) or getattr(self, 'whisper_model', None):
                    logger.info("Falling back to local Faster-Whisper due to Whisper API failure")
                    return await self._transcribe_faster_whisper(audio_bytes, language)
                raise Exception(f"ASR failed: Whisper API error: {e}")

            # Extract text safely
            text = ""
            try:
                if isinstance(response, str):
                    text = response.strip()
                else:
                    # Some client responses may present differently, try to be resilient
                    text = getattr(response, 'text', None) or getattr(response, 'result', None) or str(response)
                    if hasattr(text, 'strip'):
                        text = text.strip()
                    else:
                        text = str(text)
            except Exception as e:
                logger.exception(f"Error extracting text from Whisper response: {e}")
                text = ""
            
            logger.info(f"Whisper transcription: '{text[:100]}{'...' if len(text) > 100 else ''}'")
            
            if not text and (getattr(self, 'local_whisper_model', None) or getattr(self, 'whisper_model', None)):
                logger.info("Whisper returned empty text; attempting local Faster-Whisper fallback")
                return await self._transcribe_faster_whisper(audio_bytes, language)

            return {
                "text": text,
                "confidence": None,  # Not available in text format
                "language": language
            }
        
        except Exception as e:
            logger.exception(f"Whisper transcription error: {str(e)}")
            raise Exception(f"ASR failed: {str(e)}")
    
    async def _transcribe_google(self, audio_bytes: bytes, language: str) -> dict:
        """
        Transcribe using Google Cloud Speech-to-Text
        TODO: Implement when needed
        """
        # from google.cloud import speech
        # client = speech.SpeechClient()
        # audio = speech.RecognitionAudio(content=audio_bytes)
        # config = speech.RecognitionConfig(
        #     encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
        #     language_code=language,
        # )
        # response = client.recognize(config=config, audio=audio)
        # return {"text": response.results[0].alternatives[0].transcript}
        
        raise NotImplementedError("Google Speech-to-Text not yet implemented")
    
    async def _transcribe_azure(self, audio_bytes: bytes, language: str) -> dict:
        """
        Transcribe using Azure Speech Services
        TODO: Implement when needed
        """
        # import azure.cognitiveservices.speech as speechsdk
        # speech_config = speechsdk.SpeechConfig(
        #     subscription=settings.AZURE_SPEECH_KEY,
        #     region=settings.AZURE_SPEECH_REGION
        # )
        # speech_config.speech_recognition_language = language
        # audio_config = speechsdk.audio.AudioConfig(use_default_microphone=False)
        # speech_recognizer = speechsdk.SpeechRecognizer(
        #     speech_config=speech_config, 
        #     audio_config=audio_config
        # )
        # result = speech_recognizer.recognize_once()
        # return {"text": result.text}
        
        raise NotImplementedError("Azure Speech Services not yet implemented")
