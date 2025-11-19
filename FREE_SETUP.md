# FREE SETUP FOR RESEARCHERS

This setup uses **completely free** services - no paid API keys required except Groq (which is free)!

## Components

1. **LLM**: Groq (Free, fast) - llama-3.1-70b-versatile
2. **ASR**: Faster-Whisper (Free, local) - runs on your machine
3. **TTS**: Piper TTS (Free, local) - runs on your machine

## Installation Steps

### 1. Install Python Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Install Piper TTS (for voice output)

**Windows:**
1. Download Piper from: https://github.com/rhasspy/piper/releases
2. Download the Windows release (piper_windows_amd64.zip)
3. Extract to `C:\Program Files\Piper` or any folder
4. Add the piper folder to your PATH environment variable

**Or use pip (if available):**
```bash
pip install piper-tts
```

**Linux:**
```bash
# Download and install
wget https://github.com/rhasspy/piper/releases/latest/download/piper_amd64.tar.gz
tar xzf piper_amd64.tar.gz
sudo mv piper /usr/local/bin/
```

**Mac:**
```bash
brew install piper
```

### 3. Download Piper Voice Model

Piper needs a voice model. Download one from:
https://github.com/rhasspy/piper/blob/master/VOICES.md

Recommended for English: `en_US-lessac-medium`

Place the model files in: `backend/models/piper/`

### 4. Configure Environment

Edit `backend/.env`:
- ✅ `GROQ_API_KEY` - Already set (free from https://console.groq.com)
- ✅ `ASR_PROVIDER=faster_whisper` - Already set (free, local)
- ✅ `TTS_PROVIDER=piper` - Already set (free, local)

### 5. Run the App

```bash
# From project root
start.bat
```

Or manually:
```bash
# Terminal 1 - Backend
cd backend
python main.py

# Terminal 2 - Frontend  
cd frontend
npm run dev
```

## Why These Tools?

### Groq
- ✅ Free for researchers
- ✅ Extremely fast (70B model in <1 second)
- ✅ Good quality (Llama 3.1)

### Faster-Whisper
- ✅ Completely free
- ✅ Runs locally (no API calls)
- ✅ Fast on CPU
- ✅ Same model as OpenAI Whisper

### Piper TTS
- ✅ Completely free
- ✅ Runs locally (no API calls)
- ✅ High quality neural voices
- ✅ Fast generation

## Troubleshooting

### Faster-Whisper Issues
```bash
# If slower than expected, you can use smaller model:
# Edit backend/asr.py line 32: model_size = "tiny"  # Or "base", "small"
```

### Piper Not Found
```bash
# Check if installed:
piper --version

# If not, download binary from GitHub releases
# Or try: pip install piper-tts
```

### Memory Issues
If your machine has limited RAM:
1. Use smaller Whisper model (tiny/base)
2. Use Groq's smaller model (llama-3.1-8b-instant)

## Cost Comparison

| Service | OpenAI (paid) | Our Setup (free) |
|---------|---------------|------------------|
| LLM | $15/1M tokens | FREE (Groq) |
| ASR | $0.006/min | FREE (local) |
| TTS | $15/1M chars | FREE (local) |
| **Monthly** | ~$50-200 | **$0** |

Enjoy your free AI voice assistant! 🎉
