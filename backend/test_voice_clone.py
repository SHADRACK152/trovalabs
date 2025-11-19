"""
Test voice cloning functionality
"""
import asyncio
from voice_clone import get_voice_clone_service

async def test_voice_clone():
    print("🧪 Testing Voice Clone Service...")
    
    # Get service
    service = get_voice_clone_service()
    print("✅ Service initialized")
    
    # Create a dummy audio profile
    dummy_audio = b"fake audio data for testing"
    result = await service.create_voice_profile(
        dummy_audio, 
        user_id="test_user",
        profile_name="test"
    )
    
    print(f"\n📝 Profile creation result:")
    print(f"   Success: {result.get('success')}")
    print(f"   Profile ID: {result.get('profile_id')}")
    print(f"   Path: {result.get('profile_path')}")
    
    if result.get('success'):
        print("\n✅ Voice profile created successfully!")
        
        # Test synthesis
        print("\n🎤 Testing voice synthesis...")
        try:
            audio = await service.synthesize_with_cloned_voice(
                "Hello, this is a test.",
                user_id="test_user",
                profile_name="test"
            )
            print(f"✅ Generated audio: {len(audio)} bytes")
        except Exception as e:
            print(f"❌ Synthesis error: {e}")
    else:
        print(f"❌ Profile creation failed: {result.get('error')}")

if __name__ == "__main__":
    asyncio.run(test_voice_clone())
