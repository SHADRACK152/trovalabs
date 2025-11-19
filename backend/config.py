"""
Configuration management for Lumino AI
Loads settings from environment variables
"""
import os
import json
from pathlib import Path
from typing import List, Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # Server settings
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = True
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:5173"]
    
    # OpenAI API settings
    OPENAI_API_KEY: str = ""
    
    # Groq API settings (Groq Console)
    GROQ_API_KEY: str = ""
    GROQ_BASE_URL: str = "https://api.groq.com/openai/v1"
    
    LLM_MODEL: str = "llama-3.1-8b-instant"  # Groq: llama-3.1-8b-instant, llama-3.3-70b-versatile
    LLM_TEMPERATURE: float = 0.7
    LLM_MAX_TOKENS: int = 2000  # Increased to support longer responses like short stories
    # Token limits (Groq on_demand has 6000 TPM default) - used to guard requests
    LLM_TPM_LIMIT: int = 6000
    # Global memory sharing: enable storing messages in a global KB so all users
    # can query information learned in earlier conversations. Set to False if
    # you want per-user memory only.
    GLOBAL_MEMORY_ENABLED: bool = True
    
    # Vision/Image Analysis (FREE with Google Gemini!)
    # Get FREE API key from: https://aistudio.google.com/app/apikey
    GOOGLE_API_KEY: str = ""  # FREE: 15 requests/min, 1500 requests/day
    VISION_MODEL: str = "gemini-2.5-flash"  # FREE: 15 req/min, 1500/day  # FREE model with vision!
    
    # ASR settings
    ASR_PROVIDER: str = "speech_recognition"  # groq_whisper (FREE & FAST!), speech_recognition (free), openai_whisper, or faster_whisper (local)
    ASR_MODEL: str = "whisper-large-v3-turbo"  # Groq models: whisper-large-v3, whisper-large-v3-turbo
    ASR_LANGUAGE: str = "en"  # Default language for transcription
    WHISPER_MODEL: str = "whisper-1"  # For OpenAI Whisper
    # Faster-Whisper model used for local transcription fallback
    FASTER_WHISPER_MODEL: str = "small"  # small/medium/large
    # Local faster-whisper configuration
    FASTER_WHISPER_ENABLED: bool = False  # only initialize local model when explicitly enabled
    FASTER_WHISPER_LOCAL_PATH: str = ""  # Optional local path to a downloaded faster-whisper model
    
    # TTS settings
    TTS_PROVIDER: str = "gtts"  # gtts (free) or openai
    TTS_VOICE: str = "alloy"  # OpenAI voices: alloy, echo, fable, onyx, nova, shimmer
    TTS_SPEED: float = 1.0
    
    # Azure TTS (if using Azure)
    AZURE_SPEECH_KEY: str = ""
    AZURE_SPEECH_REGION: str = ""
    
    # ElevenLabs (if using ElevenLabs)
    ELEVENLABS_API_KEY: str = ""
    ELEVENLABS_VOICE_ID: str = ""

    # Hugging Face Inference API (hosted image generation)
    HF_API_KEY: Optional[str] = None
    HF_IMAGE_MODEL: str = "stabilityai/stable-diffusion-2-1"
    
    # Google Cloud (if using Google)
    GOOGLE_CLOUD_PROJECT: str = ""
    GOOGLE_APPLICATION_CREDENTIALS: str = ""
    
    # OAuth settings
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GITHUB_CLIENT_ID: str = ""
    GITHUB_CLIENT_SECRET: str = ""
    MICROSOFT_CLIENT_ID: str = ""
    MICROSOFT_CLIENT_SECRET: str = ""
    MICROSOFT_TENANT_ID: str = "common"  # 'common', 'organizations', 'consumers', or specific tenant ID
    
    # Model config (integration with configs/models.json)
    MODEL_CONFIG_PATH: str = "../configs/models.json"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# Initialize settings
settings = Settings()


def load_model_config() -> dict:
    """Load model configuration from configs/models.json"""
    try:
        config_path = Path(__file__).parent / settings.MODEL_CONFIG_PATH
        if config_path.exists():
            with open(config_path, 'r') as f:
                return json.load(f)
        return {}
    except Exception as e:
        print(f"Warning: Could not load model config: {e}")
        return {}


def is_model_enabled(model_id: str) -> bool:
    """Check if a model is enabled for all clients"""
    config = load_model_config()
    models = config.get("models", {})
    model_config = models.get(model_id, {})
    return model_config.get("enabled_for_all_clients", False)


def get_enabled_models() -> List[str]:
    """Get list of all enabled models"""
    config = load_model_config()
    models = config.get("models", {})
    return [
        model_id 
        for model_id, model_config in models.items() 
        if model_config.get("enabled_for_all_clients", False)
    ]


# Override LLM model if Claude Sonnet 4.5 is enabled
if is_model_enabled("claude-sonnet-4.5"):
    settings.LLM_MODEL = "claude-sonnet-4.5"
    print("✓ Using claude-sonnet-4.5 (enabled via model config)")
