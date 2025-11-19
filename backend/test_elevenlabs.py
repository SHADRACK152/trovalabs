"""
Quick test to verify ElevenLabs API is working
"""
import asyncio
import httpx
import os
from dotenv import load_dotenv

async def test_elevenlabs():
    load_dotenv()
    
    api_key = os.getenv('ELEVENLABS_API_KEY')
    
    if not api_key:
        print("❌ ELEVENLABS_API_KEY not found in .env")
        return
    
    print(f"✅ API Key loaded: {api_key[:20]}...")
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Skip voices list check (requires voices_read permission)
            # Go straight to text-to-speech test
            
            # Test: Generate speech with a default voice
            print("\n🎤 Testing: Generate speech with default voice...")
            voice_id = "21m00Tcm4TlvDq8ikWAM"  # Default voice (Rachel)
            
            response = await client.post(
                f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}",
                headers={
                    "Accept": "audio/mpeg",
                    "xi-api-key": api_key,
                    "Content-Type": "application/json"
                },
                json={
                    "text": "Hello! This is a test of ElevenLabs text to speech.",
                    "model_id": "eleven_turbo_v2_5",  # FREE tier model!
                    "voice_settings": {
                        "stability": 0.5,
                        "similarity_boost": 0.75
                    }
                }
            )
            
            if response.status_code == 200:
                audio_size = len(response.content)
                print(f"✅ Success! Generated {audio_size} bytes of audio")
                print("\n🎉 ElevenLabs API is working perfectly!")
            else:
                print(f"❌ Error {response.status_code}: {response.text}")
                
    except Exception as e:
        print(f"❌ Connection error: {e}")

if __name__ == "__main__":
    asyncio.run(test_elevenlabs())
