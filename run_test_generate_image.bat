@echo off
cd /d "C:\Users\Trova\Lumino ai"
".venv\Scripts\python.exe" backend\scripts\test_generate_image.py --prompt "a cat wearing a spacesuit, photorealistic" --output generated.png
EXIT /B %ERRORLEVEL%
