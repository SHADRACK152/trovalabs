@echo off
echo ====================================
echo  Voice Cloning Setup for Lumino AI
echo  Using Coqui TTS (FREE)
echo ====================================
echo.

cd backend

echo [1/2] Installing Coqui TTS...
echo This may take a few minutes...
pip install TTS

echo.
echo [2/2] Installing audio dependencies...
pip install pydub soundfile

echo.
echo ====================================
echo  Testing Installation
echo ====================================
python -c "from voice_clone import get_voice_clone_service; service = get_voice_clone_service(); print('✅ Voice cloning ready!')"

echo.
echo ====================================
echo  Setup Complete!
echo ====================================
echo.
echo Coqui TTS installed successfully!
echo.
echo Next steps:
echo 1. Restart the backend: python main.py
echo 2. Go to the voice conversation page
echo 3. Click "Clone My Voice" button
echo 4. Record your voice sample (5-10 seconds)
echo 5. Start talking with your AI clone!
echo.
echo Note: First use will download models (~200MB)
echo This happens automatically and only once.
echo.
pause
