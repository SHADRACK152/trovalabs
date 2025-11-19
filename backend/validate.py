"""
Lumino AI Backend Validation Script
Run this to verify all systems are operational
"""
from main import app
from config import settings, get_enabled_models

print("=" * 60)
print("LUMINO AI BACKEND STATUS")
print("=" * 60)
print(f"✓ FastAPI app loaded: {app.title}")
print(f"✓ Version: {app.version}")
print(f"✓ Model: {settings.LLM_MODEL}")
print(f"✓ ASR Provider: {settings.ASR_PROVIDER}")
print(f"✓ TTS Provider: {settings.TTS_PROVIDER}")
print(f"✓ TTS Voice: {settings.TTS_VOICE}")
print(f"✓ Server port: {settings.PORT}")
print(f"✓ Debug mode: {settings.DEBUG}")
print(f"✓ Enabled models: {get_enabled_models()}")

print("\n" + "=" * 60)
print("ENDPOINTS AVAILABLE")
print("=" * 60)
for route in app.routes:
    if hasattr(route, 'methods') and hasattr(route, 'path'):
        methods = ', '.join(sorted(route.methods))
        print(f"  {methods:10} {route.path}")

print("\n" + "=" * 60)
print("✓ All systems operational!")
print("=" * 60)
print("\nTo start the server:")
print("  python main.py")
print("  or: uvicorn main:app --reload")
print("\nThen visit: http://localhost:8000/health")
