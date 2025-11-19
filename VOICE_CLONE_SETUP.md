# Voice Cloning Setup Guide - OpenVoice

## 🎤 Voice Cloning with OpenVoice (FREE)

Clone any voice from just 3-5 seconds of audio!

---

## Prerequisites

- Python 3.9+
- 2GB free disk space
- Internet connection (for model download)
- Optional: CUDA GPU (faster, but works on CPU too)

---

## Installation Steps

### Step 1: Install OpenVoice

```bash
cd backend
pip install git+https://github.com/myshell-ai/OpenVoice.git
pip install torch torchaudio
```

### Step 2: Download Pre-trained Models

```bash
# Create checkpoints directory
mkdir checkpoints
cd checkpoints

# Download models (option 1: using git)
git clone https://huggingface.co/myshell-ai/OpenVoice checkpoints

# OR download manually from:
# https://huggingface.co/myshell-ai/OpenVoice
```

Expected structure:
```
backend/
  checkpoints/
    converter/
      config.json
      checkpoint.pth
    base_speakers/
      EN/
        config.json
        checkpoint.pth
```

### Step 3: Test Installation

```bash
cd backend
python -c "from voice_clone import get_voice_clone_service; service = get_voice_clone_service(); print('✅ Voice cloning ready!')"
```

---

## How to Use Voice Cloning in Lumino

### 1. **Record Your Voice Sample**
- Minimum 3 seconds, recommended 5-10 seconds
- Speak clearly: "Hello, this is my voice. I'm recording a sample for voice cloning."
- Quiet environment (no background noise)

### 2. **Create Voice Profile**
- Click "Clone My Voice" button in the app
- Record or upload your voice sample
- Wait 5-10 seconds for processing
- Your voice profile is saved!

### 3. **Use Your Cloned Voice**
- Toggle "Use My Cloned Voice"
- AI will respond in YOUR voice!
- Conversations feel more personal

---

## API Endpoints

### Create Voice Profile
```bash
POST /voice-clone/create
Form Data:
  - audio: audio file (WAV, MP3, etc.)
  - user_id: unique user identifier
  - profile_name: "default" or custom name

Response:
{
  "success": true,
  "profile_id": "abc123",
  "message": "Voice profile created successfully!"
}
```

### Speak with Cloned Voice
```bash
POST /voice-clone/speak
Form Data:
  - text: "Text to speak"
  - user_id: "user123"
  - profile_name: "default"
  - speed: 1.0 (0.5 to 2.0)

Response: Audio stream (WAV)
```

### List Profiles
```bash
GET /voice-clone/profiles/{user_id}

Response:
{
  "user_id": "user123",
  "profiles": [
    {"profile_name": "default", "profile_path": "..."}
  ]
}
```

### Delete Profile
```bash
DELETE /voice-clone/profiles/{user_id}/{profile_name}
```

---

## Tips for Best Results

### ✅ Good Voice Samples:
- Clear speech, no mumbling
- Normal speaking pace
- Quiet room (no echo)
- 5-10 seconds of continuous speech
- Natural tone (not reading robotically)

### ❌ Avoid:
- Background music or noise
- Multiple speakers
- Very short samples (< 3 seconds)
- Whispering or shouting
- Phone recordings (low quality)

---

## Troubleshooting

### Issue: "OpenVoice models not available"
**Solution:** 
```bash
cd backend/checkpoints
# Re-download models
git clone https://huggingface.co/myshell-ai/OpenVoice .
```

### Issue: Slow synthesis (> 10 seconds)
**Solution:** 
- This is normal on CPU
- For faster: use GPU with CUDA
- Or use simpler TTS for real-time conversation

### Issue: Voice sounds robotic
**Solution:**
- Record longer voice sample (10+ seconds)
- Speak more naturally in the sample
- Use higher quality audio (not phone recording)

### Issue: Import error
**Solution:**
```bash
pip install --upgrade torch torchaudio
pip install git+https://github.com/myshell-ai/OpenVoice.git --force-reinstall
```

---

## Performance Notes

- **CPU**: 3-5 seconds per sentence
- **GPU (CUDA)**: 0.5-1 second per sentence
- **Profile Creation**: 5-10 seconds (one time)
- **Storage**: ~1MB per voice profile

---

## Privacy & Security

✅ **Voice profiles stored locally** (not sent to cloud)
✅ **No external API calls** (100% offline after setup)
✅ **User controls their data** (can delete profiles anytime)
✅ **No voice data uploaded** (processed on your machine)

---

## Alternative: Faster Setup (Browser Voices Only)

If OpenVoice setup is too complex, you can continue using:
- Browser voices (instant, zero setup)
- Natural voices (Jenny, Lisa - free online API)

Voice cloning is **optional** for advanced users who want personalized AI voices!

---

## Next Steps

After installation:
1. Restart backend: `python main.py`
2. Frontend will show "Clone My Voice" button
3. Record your voice sample
4. Start talking with your AI clone! 🎤✨
