# Lumino AI - Quick Start Guide

Get your voice chatbot running in **5 minutes**!

## Prerequisites

- Python 3.9+ installed
- Groq API key ([get one here](https://console.groq.com/keys)) - Free and fast!
- OpenAI API key ([get one here](https://platform.openai.com/api-keys)) - For Whisper ASR and TTS
- Microphone for voice input (optional for testing)

## Step 1: Clone & Setup

```bash
cd "c:\Users\Trova\Lumino ai\backend"
```

## Step 2: Install Dependencies

```bash
pip install -r requirements.txt
```

Or use the pre-configured virtual environment:

```bash
"C:/Users/Trova/Lumino ai/.venv/Scripts/python.exe" -m pip install -r requirements.txt
```

## Step 3: Configure API Keys

1. Copy the example environment file:
   ```bash
   copy .env.example .env
   ```

2. Edit `.env` and add your API keys:
   ```
   GROQ_API_KEY=gsk_your-actual-key-here
   OPENAI_API_KEY=sk-your-actual-key-here
   ```

   **Note**: Groq is used for LLM (fast, free conversational AI), OpenAI is used for Whisper (ASR) and TTS.

## Step 4: Start the Server

```bash
"C:/Users/Trova/Lumino ai/.venv/Scripts/python.exe" main.py
```

Or with uvicorn:

```bash
"C:/Users/Trova/Lumino ai/.venv/Scripts/python.exe" -m uvicorn main:app --reload
```

You should see:
```
✓ Using claude-sonnet-4.5 (enabled via model config)
INFO: Uvicorn running on http://0.0.0.0:8000
```

## Step 5: Test the API

### Option A: Web Browser

Open http://localhost:8000/health

You should see:
```json
{
  "status": "healthy",
  "asr": "ready",
  "llm": "ready",
  "tts": "ready",
  "model": "claude-sonnet-4.5"
}
```

### Option B: Test Client Script

```bash
"C:/Users/Trova/Lumino ai/.venv/Scripts/python.exe" test_client.py
```

### Option C: curl Commands

**Test text response (no TTS):**
```bash
curl -X POST http://localhost:8000/respond-text ^
  -H "Content-Type: application/json" ^
  -d "{\"text\":\"Hello, who are you?\",\"tone\":\"energetic\"}"
```

**Get audio response:**
```bash
curl -X POST http://localhost:8000/respond ^
  -H "Content-Type: application/json" ^
  -d "{\"text\":\"Tell me a joke\",\"tone\":\"neutral\"}" ^
  -o joke.mp3
```

Play the `joke.mp3` file to hear Lumino's voice!

## Available Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Health check |
| `/transcribe` | POST | Speech → Text (ASR) |
| `/respond-text` | POST | Get LLM response (text only) |
| `/respond` | POST | Get LLM response with TTS (audio) |
| `/voice-roundtrip` | POST | Full pipeline: ASR → LLM → TTS |

## Tone Options

Control how Lumino speaks:

- **`calm`**: Slow, soothing, peaceful (85% speed, -2 semitones)
- **`neutral`**: Standard conversational tone (100% speed, 0 semitones)
- **`energetic`**: Fast, enthusiastic, upbeat (110% speed, +2 semitones)

## Example: Complete Voice Conversation

1. Record a question (e.g., "What's the weather like?") and save as `question.webm`

2. Send to Lumino:
   ```bash
   curl -X POST http://localhost:8000/voice-roundtrip ^
     -F "audio=@question.webm" ^
     -F "tone=calm" ^
     -F "language=en" ^
     -o answer.mp3
   ```

3. Play `answer.mp3` to hear Lumino's response!

## Claude Sonnet 4.5 Integration

✓ **Already enabled!** The backend automatically detects that `claude-sonnet-4.5` is enabled in `configs/models.json`.

To switch models:

**Use GPT-4:**
Edit `.env`:
```
LLM_MODEL=gpt-4
```

**Use Claude Sonnet 4.5:**
Ensure `configs/models.json` has:
```json
{
  "models": {
    "claude-sonnet-4.5": {
      "enabled_for_all_clients": true
    }
  }
}
```

The backend will auto-detect and use it.

## Troubleshooting

### "Module not found" errors

Install dependencies:
```bash
pip install -r requirements.txt
```

### "API key not valid"

1. Check your `.env` file has a real OpenAI key (starts with `sk-`)
2. Verify the key works: https://platform.openai.com/api-keys

### "Connection refused"

Make sure the server is running:
```bash
"C:/Users/Trova/Lumino ai/.venv/Scripts/python.exe" main.py
```

### Server won't start

Check for port conflicts. Change port in `.env`:
```
PORT=8001
```

## Frontend Setup (React + Vite)

### 1. Install Frontend Dependencies

```bash
cd "c:\Users\Trova\Lumino ai\frontend"
npm install
```

### 2. Configure Frontend Environment

Create `.env` file:
```bash
copy .env.example .env
```

The `.env` should contain:
```
VITE_API_URL=http://localhost:8000
```

### 3. Start Frontend Dev Server

```bash
npm run dev
```

The frontend will start at http://localhost:5173

### 4. Use the Voice Chatbot

1. Open http://localhost:5173 in your browser
2. Click the microphone button to record
3. Speak your question
4. Click again to stop recording
5. Lumino will process and respond with audio!

## Complete System Test

With both backend and frontend running:

1. **Backend**: http://localhost:8000/health
2. **Frontend**: http://localhost:5173

Test the voice conversation:
- Record a voice message
- See transcription in conversation history
- Hear AI response with selected tone (calm/neutral/energetic)
- View full conversation history

## Next Steps

1. **Add user profiles**: Store preferences and conversation history
2. **Deploy**: Docker container or cloud hosting (AWS, GCP, Azure)
3. **Scale**: Add caching, load balancing, and monitoring
4. **Enhance**: Add memory, multi-language support, custom voices

## Architecture

```
┌─────────────┐
│   Browser   │ (mic input)
└──────┬──────┘
       │ audio/webm
       ▼
┌─────────────────────────────────┐
│  FastAPI Backend (main.py)      │
│  ┌───────────────────────────┐  │
│  │   Orchestrator            │  │
│  │  ┌─────┐ ┌─────┐ ┌─────┐ │  │
│  │  │ ASR │→│ LLM │→│ TTS │ │  │
│  │  └─────┘ └─────┘ └─────┘ │  │
│  └───────────────────────────┘  │
└─────────────┬───────────────────┘
              │ audio/mp3
              ▼
       ┌─────────────┐
       │   Browser   │ (audio playback)
       └─────────────┘
```

## Production Checklist

Before deploying to production:

- [ ] Replace placeholder API keys with real keys
- [ ] Set `DEBUG=False` in `.env`
- [ ] Add rate limiting and authentication
- [ ] Set up monitoring (Sentry, Prometheus)
- [ ] Add HTTPS/TLS certificates
- [ ] Configure CORS for your frontend domain
- [ ] Set up database for user profiles
- [ ] Add logging and error tracking
- [ ] Load test with expected traffic
- [ ] Create backup and rollback procedures

## Support

- 📖 Full documentation: `backend/README.md`
- 🐛 Found a bug? Check the logs in the terminal
- 💡 Need help? Review the test client: `test_client.py`

---

**Ready to build something amazing? Let's go! 🚀**
