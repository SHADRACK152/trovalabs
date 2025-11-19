# Lumino AI Backend

Complete FastAPI backend for real-time voice chatbot with tone control.

## Features

- **ASR (Speech-to-Text)**: OpenAI Whisper API with fallback options
- **LLM (Conversational AI)**: Groq (Llama 3.1), OpenAI GPT-4, or Claude Sonnet 4.5
- **TTS (Text-to-Speech)**: OpenAI TTS with tone control (calm/neutral/energetic)
- **Tone Control**: SSML-based prosody adjustments for expressive speech
- **Modular Architecture**: Clean separation of concerns (ASR, LLM, TTS, orchestrator)

## Quick Start

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
copy .env.example .env
```

Edit `.env` and add your OpenAI API key:

```
OPENAI_API_KEY=sk-your-key-here
```

### 3. Run Server

```bash
python main.py
```

Or with uvicorn:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 4. Test Endpoints

```bash
# Health check
curl http://localhost:8000/health

# Text-only response (no TTS)
curl -X POST http://localhost:8000/respond-text ^
  -H "Content-Type: application/json" ^
  -d "{\"text\":\"Hello, how are you?\",\"tone\":\"energetic\"}"

# Full TTS response
curl -X POST http://localhost:8000/respond ^
  -H "Content-Type: application/json" ^
  -d "{\"text\":\"Tell me a joke\",\"tone\":\"neutral\"}" ^
  -o response.mp3
```

Or run the test suite:

```bash
python test_client.py
```

## API Endpoints

### `GET /health`
Health check with service status.

**Response:**
```json
{
  "status": "healthy",
  "asr": "ready",
  "llm": "ready",
  "tts": "ready",
  "model": "llama-3.1-70b-versatile"
}
```

### `POST /transcribe`
Convert speech to text (ASR).

**Request:**
- `audio` (file): Audio file (wav, mp3, webm, etc.)
- `language` (form): Language code (default: "en")

**Response:**
```json
{
  "text": "How's the weather?",
  "confidence": 0.95
}
```

### `POST /respond-text`
Generate LLM response (text only, no TTS).

**Request:**
```json
{
  "text": "What's the weather like?",
  "tone": "calm",
  "user_id": "optional-user-123"
}
```

**Response:**
```json
{
  "response_text": "It looks sunny today! Perfect for a walk.",
  "tone": "calm"
}
```

### `POST /respond`
Generate LLM response and convert to speech (TTS).

**Request:**
```json
{
  "text": "Tell me a joke",
  "tone": "energetic"
}
```

**Response:** Audio stream (mp3)

### `POST /voice-roundtrip`
Complete pipeline: ASR → LLM → TTS.

**Request:**
- `audio` (file): User's voice input
- `tone` (form): Response tone (calm/neutral/energetic)
- `language` (form): Input language (default: "en")

**Response:** Audio stream (mp3) with AI response

## Tone Options

- **calm**: Slow rate (85%), lower pitch (-2st), soft volume
- **neutral**: Normal rate (100%), standard pitch, medium volume
- **energetic**: Fast rate (110%), higher pitch (+2st), loud volume

## Project Structure

```
backend/
├── main.py              # FastAPI app with endpoints
├── config.py            # Configuration management
├── orchestrator.py      # Pipeline coordinator (ASR → LLM → TTS)
├── asr.py               # Speech-to-text service
├── llm.py               # LLM service (Groq, GPT-4, Claude)
├── tts.py               # Text-to-speech service
├── requirements.txt     # Python dependencies
├── .env.example         # Environment template
├── test_client.py       # Test suite
└── README.md            # This file
```

## Configuration

Edit `.env` to customize:

```bash
# LLM model (llama-3.1-70b-versatile, gpt-4, claude-sonnet-4.5)
LLM_MODEL=llama-3.1-70b-versatile

# TTS voice (alloy, echo, fable, onyx, nova, shimmer)
TTS_VOICE=alloy

# Temperature (0.0-2.0, higher = more creative)
LLM_TEMPERATURE=0.7

# Max response length
LLM_MAX_TOKENS=150
```

## Claude Sonnet 4.5 Integration

The backend automatically checks `../configs/models.json` and uses `claude-sonnet-4.5` if enabled:

```json
{
  "models": {
    "claude-sonnet-4.5": {
      "enabled_for_all_clients": true
    }
  }
}
```

Install Anthropic SDK:
```bash
pip install anthropic
```

## Testing

### Manual Testing

```bash
python test_client.py
```

### curl Examples

```bash
# Health check
curl http://localhost:8000/health

# Transcribe audio
curl -X POST http://localhost:8000/transcribe ^
  -F "audio=@recording.webm" ^
  -F "language=en"

# Get text response
curl -X POST http://localhost:8000/respond-text ^
  -H "Content-Type: application/json" ^
  -d "{\"text\":\"What's 2+2?\",\"tone\":\"neutral\"}"

# Get audio response
curl -X POST http://localhost:8000/respond ^
  -H "Content-Type: application/json" ^
  -d "{\"text\":\"Hello!\",\"tone\":\"energetic\"}" ^
  -o hello.mp3

# Voice roundtrip
curl -X POST http://localhost:8000/voice-roundtrip ^
  -F "audio=@question.webm" ^
  -F "tone=calm" ^
  -F "language=en" ^
  -o answer.mp3
```

## Next Steps

1. **Add frontend**: React app with mic capture and audio playback
2. **Add user profiles**: Store preferences and conversation history
3. **Add memory**: Long-term context and personalization
4. **Scale TTS**: Add Azure Neural TTS or ElevenLabs for more voices
5. **Add monitoring**: Prometheus metrics, Sentry error tracking
6. **Deploy**: Docker + Kubernetes or serverless (AWS Lambda, GCP Cloud Run)

## License

MIT
