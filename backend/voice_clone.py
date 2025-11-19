"""
Voice Cloning Service using ElevenLabs FREE API
REAL voice cloning - sounds exactly like you!
"""
import os
import logging
try:
    from backend.text_utils import sanitize_text_for_tts
except Exception:
    # When running as script under backend/ directory, fallback to local import
    from text_utils import sanitize_text_for_tts
from pathlib import Path
from typing import Optional
import hashlib

logger = logging.getLogger(__name__)


class VoiceCloneService:
    """Real voice cloning using ElevenLabs FREE tier"""

    def __init__(self):
        """Initialize voice cloning service"""
        self.voice_profiles_dir = Path("voice_profiles")
        self.voice_profiles_dir.mkdir(exist_ok=True)
        
        # ElevenLabs API (FREE tier: 10,000 chars/month)
        self.elevenlabs_api_key = os.getenv("ELEVENLABS_API_KEY", "")
        # Safety: minimum seconds between attempts to create a new ElevenLabs voice
        # to avoid repeated rapid calls that can trigger abuse detection on the API
        cooldown_value = os.getenv("ELEVENLABS_CREATE_COOLDOWN", "3600")
        try:
            self.elevenlabs_create_cooldown = int(cooldown_value)
        except (TypeError, ValueError):
            logger.warning("Invalid ELEVENLABS_CREATE_COOLDOWN; using default 3600")
            self.elevenlabs_create_cooldown = 3600
        
        if self.elevenlabs_api_key:
            logger.info("🎤 Voice Clone Service initialized (ElevenLabs)")
        else:
            logger.warning("⚠️  ElevenLabs API key not set - will use Edge TTS fallback")
            logger.info("To get FREE API key: https://elevenlabs.io/sign-up")
    
    async def create_voice_profile(
        self,
        audio_bytes: bytes,
        user_id: str,
        profile_name: str = "default"
    ) -> dict:
        """
        Create a voice profile from user's audio sample
        Fast profile creation - just saves the audio file
        
        Args:
            audio_bytes: Audio sample (5+ seconds recommended)
            user_id: Unique user identifier
            profile_name: Name for this voice profile
            
        Returns:
            dict with profile info and status
        """
        try:
            logger.info(f"Creating voice profile for {user_id}...")
            
            # Save audio sample locally (fast - just writes file)
            profile_path = self.voice_profiles_dir / f"{user_id}_{profile_name}.wav"
            
            with open(profile_path, 'wb') as f:
                f.write(audio_bytes)
            
            # Generate profile ID
            profile_id = hashlib.md5(f"{user_id}_{profile_name}".encode()).hexdigest()[:12]
            
            logger.info(f"✅ Voice profile created: {profile_path.name} ({len(audio_bytes)} bytes)")
            
            return {
                "success": True,
                "profile_id": profile_id,
                "user_id": user_id,
                "profile_name": profile_name,
                "profile_path": str(profile_path),
                "message": "Voice profile saved! Ready to use."
            }
            
        except Exception as e:
            logger.error(f"❌ Error creating voice profile: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def synthesize_with_cloned_voice(
        self,
        text: str,
        user_id: str,
        profile_name: str = "default",
        speed: float = 1.0
    ) -> bytes:
        """
        Generate speech using YOUR actual cloned voice
        Uses ElevenLabs FREE API for real voice cloning
        
        Args:
            text: Text to speak  
            user_id: User identifier
            profile_name: Voice profile to use
            speed: Speech speed (0.5 to 2.0)
            
        Returns:
            Audio bytes (MP3 format)
        """
        sanitized_text = sanitize_text_for_tts(text)
        try:
            # Check if profile exists
            profile_path = self.voice_profiles_dir / f"{user_id}_{profile_name}.wav"
            if not profile_path.exists():
                raise ValueError(f"Voice profile not found. Please record your voice first.")
            
            logger.info(f"🎤 Using YOUR cloned voice from: {profile_path}")
            
            # Try ElevenLabs voice cloning (REAL cloning)
            if self.elevenlabs_api_key:
                try:
                    import httpx
                    
                    logger.info("Using ElevenLabs for REAL voice cloning...")
                    
                    # Read the voice sample
                    with open(profile_path, 'rb') as f:
                        voice_sample = f.read()
                    
                    # Create voice clone (if not already created)
                    voice_id = await self._get_or_create_elevenlabs_voice(
                        user_id, voice_sample
                    )
                    
                    # Generate speech with YOUR voice
                    async with httpx.AsyncClient(timeout=60.0) as client:
                        response = await client.post(
                            f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}",
                            headers={
                                "Accept": "audio/mpeg",
                                "xi-api-key": self.elevenlabs_api_key,
                                "Content-Type": "application/json"
                            },
                            json={
                                "text": sanitized_text,
                                "model_id": "eleven_turbo_v2_5",  # FREE tier model (fastest!)
                                "voice_settings": {
                                    "stability": 0.5,
                                    "similarity_boost": 0.75
                                }
                            }
                        )
                        
                        if response.status_code == 200:
                            audio_bytes = response.content
                            logger.info(f"✅ Generated {len(audio_bytes)} bytes with YOUR CLONED voice!")
                            return audio_bytes
                        else:
                            logger.error(f"ElevenLabs error: {response.status_code}")
                            raise Exception(f"ElevenLabs API error: {response.status_code}")
                            
                except Exception as e:
                    logger.error(f"ElevenLabs error: {e}")
                    logger.info("Falling back to Edge TTS...")
            
            # Fallback to Edge TTS (high quality but not YOUR voice)
            import edge_tts
            import tempfile
            
            logger.warning("⚠️  Using Edge TTS fallback (not your actual voice)")
            logger.info("To use YOUR voice, set ELEVENLABS_API_KEY environment variable")
            
            communicate = edge_tts.Communicate(sanitized_text, "en-US-AriaNeural")
            output_file = tempfile.mktemp(suffix=".mp3")
            await communicate.save(output_file)
            
            with open(output_file, 'rb') as f:
                audio_bytes = f.read()
            
            os.remove(output_file)
            return audio_bytes
                
        except Exception as e:
            logger.error(f"Error synthesizing speech: {e}")
            
            # Last resort fallback to gTTS
            from gtts import gTTS
            import io
            
            logger.info("Falling back to gTTS...")
            tts = gTTS(text=sanitized_text, lang='en', slow=(speed < 0.8))
            audio_buffer = io.BytesIO()
            tts.write_to_fp(audio_buffer)
            audio_buffer.seek(0)
            
            return audio_buffer.read()
    
    async def _get_or_create_elevenlabs_voice(
        self, user_id: str, voice_sample: bytes
    ) -> str:
        """
        Get or create ElevenLabs voice ID for user
        
        Args:
            user_id: User identifier
            voice_sample: Audio sample bytes
            
        Returns:
            ElevenLabs voice_id
        """
        import httpx
        
        # Check if voice already created (stored locally)
        voice_id_file = self.voice_profiles_dir / f"{user_id}_elevenlabs_id.txt"
        
        if voice_id_file.exists():
            with open(voice_id_file, 'r') as f:
                voice_id = f.read().strip()
                logger.info(f"Using existing ElevenLabs voice: {voice_id}")
                return voice_id
        # Prevent rapid repeated creation attempts by honoring a cooldown file
        last_create_file = self.voice_profiles_dir / f"{user_id}_elevenlabs_last_create.txt"
        try:
            if last_create_file.exists():
                import time
                last_ts = float(last_create_file.read_text().strip())
                age = time.time() - last_ts
                if age < self.elevenlabs_create_cooldown:
                    raise Exception(
                        f"Create cooldown active: last create was {int(age)}s ago. Wait {int(self.elevenlabs_create_cooldown - age)}s before trying again."
                    )
        except Exception:
            # If reading/parsing fails, continue to allow creation but log a warning
            logger.debug("Could not read last create timestamp file or parse it; continuing")

        # Create new voice clone
        logger.info("Creating new ElevenLabs voice clone...")

        async with httpx.AsyncClient(timeout=90.0) as client:
            try:
                response = await client.post(
                    "https://api.elevenlabs.io/v1/voices/add",
                    headers={
                        "xi-api-key": self.elevenlabs_api_key
                    },
                    files={
                        "files": ("voice.wav", voice_sample, "audio/wav")
                    },
                    data={
                        "name": f"User_{user_id}_Voice",
                        "description": "Cloned voice"
                    }
                )
            except Exception as e:
                logger.error(f"ElevenLabs create request failed: {e}")
                raise Exception("ElevenLabs create request failed: connection error")

            # Handle rate-limiting / rejection explicitly
            if response.status_code in (200, 201):
                result = response.json()
                voice_id = result.get("voice_id") or result.get("id") or result.get("voice")

                if not voice_id:
                    # Save raw JSON for debugging
                    logger.error(f"ElevenLabs create returned unexpected payload: {result}")
                    raise Exception("ElevenLabs create returned no voice_id")

                # Save voice ID for future use
                with open(voice_id_file, 'w') as f:
                    f.write(voice_id)

                # Save last create timestamp
                try:
                    import time
                    last_create_file.write_text(str(time.time()))
                except Exception:
                    logger.debug("Failed to write last create timestamp file")

                logger.info(f"✅ Created ElevenLabs voice: {voice_id}")
                return voice_id
            elif response.status_code == 429:
                logger.error("ElevenLabs rate limit (429) when creating voice")
                raise Exception("ElevenLabs rate limit hit. Try again later.")
            else:
                logger.error(f"Failed to create voice: {response.status_code} - {response.text}")
                raise Exception(f"Failed to create voice: {response.status_code} - {response.text}")
    
    def list_user_profiles(self, user_id: str) -> list:
        """List all voice profiles for a user"""
        profiles = []
        for profile_file in self.voice_profiles_dir.glob(f"{user_id}_*.wav"):
            profile_name = profile_file.stem.replace(f"{user_id}_", "")
            profiles.append({
                "profile_name": profile_name,
                "profile_path": str(profile_file)
            })
        return profiles
    
    def delete_profile(self, user_id: str, profile_name: str = "default") -> bool:
        """Delete a voice profile"""
        try:
            profile_file = self.voice_profiles_dir / f"{user_id}_{profile_name}.wav"
            if profile_file.exists():
                profile_file.unlink()
                return True
            return False
        except Exception as e:
            logger.error(f"Error deleting profile: {e}")
            return False


# Global instance
_voice_clone_service = None


def get_voice_clone_service() -> VoiceCloneService:
    """Get or create voice clone service instance"""
    global _voice_clone_service
    if _voice_clone_service is None:
        _voice_clone_service = VoiceCloneService()
    return _voice_clone_service
