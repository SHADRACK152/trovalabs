# Lumino AI — Personalized Voice Chatbot with Tone Control

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.9+](https://img.shields.io/badge/python-3.9+-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109-009688.svg)](https://fastapi.tiangolo.com)

**Lumino AI** is a real-time voice-enabled AI chatbot that understands natural speech, generates intelligent responses, and speaks back with controllable tone and emotion.

## ✨ Features

- 🎤 **Real-time Voice Conversation**: ASR → LLM → TTS pipeline with <2s latency
- 🎭 **Tone Control**: Calm, neutral, or energetic speech with SSML prosody
- 🧠 **Smart AI**: Powered by Groq (Llama 3.1), OpenAI GPT-4, or Claude Sonnet 4.5
- 🔊 **High-Quality TTS**: Natural-sounding voice synthesis
- � **Audiobook Creation**: Upload novels/stories and convert them to audiobooks
- 🎧 **Offline Listening**: Download and share audiobook chapters
- �🔒 **Privacy-First**: No audio storage without explicit consent
- 🏗️ **Modular Architecture**: Clean separation of ASR, LLM, and TTS services

## 🚀 Quick Start

### Option 1: Automated Setup (Recommended)

```bash
# 1. Verify setup
verify-setup.bat

# 2. Start both backend and frontend
start.bat

# 3. Open http://localhost:5173 and start talking!
```

### Option 2: Manual Setup

**Backend:**
```bash
cd backend
pip install -r requirements.txt
copy .env.example .env
# Edit .env and add your OPENAI_API_KEY
python main.py
```

**Frontend:**
```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

See [QUICKSTART.md](QUICKSTART.md) for detailed instructions.

## 📁 Project Structure

```
Lumino ai/
├── backend/                    # FastAPI backend
│   ├── main.py                # API endpoints
│   ├── orchestrator.py        # Pipeline coordinator (ASR→LLM→TTS)
│   ├── asr.py                 # Speech-to-text (Whisper)
│   ├── llm.py                 # Language model (GPT-4/Claude)
│   ├── tts.py                 # Text-to-speech with tone control
│   ├── config.py              # Configuration management
│   ├── requirements.txt       # Python dependencies
│   ├── .env.example           # Environment template
│   └── README.md              # Backend documentation
├── frontend/                   # React + Vite frontend
│   ├── src/
│   │   ├── App.jsx            # Main application
│   │   ├── components/
│   │   │   ├── VoiceRecorder.jsx       # Mic recording with visualization
│   │   │   ├── ToneSelector.jsx        # Tone selection UI
│   │   │   ├── AudioPlayer.jsx         # Audio playback controls
│   │   │   └── ConversationHistory.jsx # Chat history display
│   │   ├── services/
│   │   │   └── api.js         # Backend API integration
│   │   └── index.css          # Tailwind styles
│   ├── package.json           # Node dependencies
│   ├── vite.config.js         # Vite configuration
│   ├── tailwind.config.js     # Tailwind theme
│   └── .env.example           # Frontend environment template
├── configs/
│   └── models.json            # Model feature flags
├── scripts/
│   └── toggle_model_flag.js   # Model management utility
├── docs/
│   └── enable_claude_sonnet45.md  # Claude integration guide
├── start.bat                   # Windows startup script
├── verify-setup.bat            # Setup verification script
├── QUICKSTART.md              # Quick start guide
├── INTEGRATION.md             # Integration verification guide
└── README.md                  # This file
```

## 🎯 API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Service health check |
| `/transcribe` | POST | Convert speech to text |
| `/respond-text` | POST | Get text response from LLM |
| `/respond` | POST | Get audio response with TTS |
| `/voice-roundtrip` | POST | Complete ASR→LLM→TTS pipeline |

## 🎨 Tone Options

Control how Lumino speaks:

- **Calm**: Slow, soothing, peaceful (85% speed, lower pitch)
- **Neutral**: Standard conversational tone (100% speed)
- **Energetic**: Fast, enthusiastic, upbeat (110% speed, higher pitch)

## 🧪 Example Usage

### Text Response

```bash
curl -X POST http://localhost:8000/respond-text \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello, who are you?","tone":"energetic"}'
```

### Audio Response

```bash
curl -X POST http://localhost:8000/respond \
  -H "Content-Type: application/json" \
  -d '{"text":"Tell me a joke","tone":"neutral"}' \
  -o joke.mp3
```

### Voice Roundtrip

```bash
curl -X POST http://localhost:8000/voice-roundtrip \
  -F "audio=@question.webm" \
  -F "tone=calm" \
  -o answer.mp3
```

## 🤖 Claude Sonnet 4.5 Integration

✓ **Already enabled!** The backend automatically uses Claude Sonnet 4.5 when enabled in `configs/models.json`.

Toggle models:
```bash
# Enable Claude Sonnet 4.5
node scripts/toggle_model_flag.js claude-sonnet-4.5 enable

# Disable Claude Sonnet 4.5
node scripts/toggle_model_flag.js claude-sonnet-4.5 disable
```

## 🛠️ Tech Stack

**Backend:**
- FastAPI (Python 3.9+)
- OpenAI Whisper API (ASR)
- Groq (Llama 3.1) / OpenAI GPT-4 / Anthropic Claude (LLM)
- OpenAI TTS with tone control
- Pydantic Settings + dotenv

**Frontend:**
- React 18 with Hooks
- Vite (build tool)
- Tailwind CSS (styling)
- Axios (HTTP client)
- Lucide React (icons)
- WebRTC (microphone access)

## 📚 Documentation

- [QUICKSTART.md](QUICKSTART.md) - Get started in 5 minutes
- [INTEGRATION.md](INTEGRATION.md) - Frontend/backend integration guide
- [backend/README.md](backend/README.md) - Detailed backend documentation
- [docs/enable_claude_sonnet45.md](docs/enable_claude_sonnet45.md) - Claude integration guide

## 🗺️ Roadmap

See the full strategic roadmap in the project documentation:

- ✅ **MVP (Month 1-2)**: Voice roundtrip, tone control, basic API
- 🚧 **Phase 2 (Month 3-4)**: User profiles, memory, personalization
- 📋 **Phase 3 (Month 4-6)**: Custom voice cloning, scaling, security audit
- 📋 **Phase 4 (Month 6-12)**: Mobile app, integrations, enterprise features

## 🧩 Architecture

```
User → Microphone
       ↓ (audio/webm)
    ┌──────────────────────┐
    │  FastAPI Backend     │
    │  ┌────────────────┐  │
    │  │  Orchestrator  │  │
    │  │   ┌─────────┐  │  │
    │  │   │   ASR   │  │  │  (Whisper API)
    │  │   └────┬────┘  │  │
    │  │        ↓        │  │
    │  │   ┌─────────┐  │  │
    │  │   │   LLM   │  │  │  (GPT-4 / Claude)
    │  │   └────┬────┘  │  │
    │  │        ↓        │  │
    │  │   ┌─────────┐  │  │
    │  │   │   TTS   │  │  │  (OpenAI TTS)
    │  │   └─────────┘  │  │
    │  └────────────────┘  │
    └──────┬───────────────┘
           ↓ (audio/mp3)
    User ← Speaker
```

## 🤝 Contributing

Contributions welcome! Please read our contributing guidelines before submitting PRs.

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

- 📖 Read the [QUICKSTART.md](QUICKSTART.md)
- 🐛 Report bugs via GitHub Issues
- 💬 Join our community discussions

---

**Built with ❤️ for developers who love voice AI**
