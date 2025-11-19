# FREE AI Voice Assistant for Researchers

## ✅ What's FREE and Working Now

### 1. **LLM - Groq** (FREE & FAST!)
- ✅ Model: `llama-3.1-70b-versatile` 
- ✅ API Key: Already configured
- ✅ Speed: ~1 second response time
- ✅ Quality: Excellent (70B parameter model)
- ✅ Cost: **$0 for researchers**

### 2. **ASR - Faster-Whisper** (FREE, runs locally)
- ✅ Configured in backend
- ✅ No API key needed
- ✅ Runs on your computer (CPU)
- ⏳ Needs installation: `pip install faster-whisper`

## ⏳ What Needs Setup

### 3. **TTS - Text to Speech**
Currently using OpenAI (paid). You have 2 options:

#### Option A: Use OpenAI TTS (Easy but costs money)
- Get API key from: https://platform.openai.com/api-keys
- Add to `backend/.env`: `OPENAI_API_KEY=sk-your-key-here`
- Cost: ~$15 per 1 million characters

#### Option B: Use Free TTS (Recommended for researchers)
Several free options:
1. **gTTS (Google TTS)** - Easiest, good quality
2. **Piper TTS** - Best quality, needs setup
3. **pyttsx3** - Offline, lower quality

## 🚀 Quick Start

### Step 1: Install Faster-Whisper
```bash
cd backend
pip install faster-whisper
```

### Step 2: Choose TTS Option

**For Free TTS (gTTS - Recommended):**
```bash
pip install gtts
```
Then I'll update the code to use it.

**OR for OpenAI TTS:**
- Get key from https://platform.openai.com/api-keys
- Edit `backend/.env` and add your key

### Step 3: Run the App
```bash
start.bat
```

## 💰 Cost Comparison

| Component | OpenAI | Our Free Setup |
|-----------|--------|----------------|
| LLM | $15/1M tokens | **FREE** (Groq) |
| ASR | $0.006/min | **FREE** (Faster-Whisper) |
| TTS | $15/1M chars | **FREE** (gTTS) or $15/1M (OpenAI) |
| **Total** | ~$50-200/month | **~$0/month** |

## Next Steps

Which TTS would you like to use?
1. **gTTS** - Free, easy, works immediately
2. **Piper** - Free, best quality, needs more setup  
3. **OpenAI** - Paid, excellent quality, easiest

Let me know and I'll configure it for you!
