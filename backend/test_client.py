"""
Test client for Lumino AI Backend
Run manual tests against the API endpoints
"""
import requests
import json
from pathlib import Path


# Configuration
BASE_URL = "http://localhost:8000"
TEST_AUDIO_PATH = "test_audio.webm"  # Replace with your test audio file


def test_health():
    """Test health check endpoint"""
    print("\n=== Testing /health ===")
    response = requests.get(f"{BASE_URL}/health")
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    return response.status_code == 200


def test_transcribe(audio_path: str = TEST_AUDIO_PATH):
    """Test /transcribe endpoint"""
    print("\n=== Testing /transcribe ===")
    
    if not Path(audio_path).exists():
        print(f"❌ Test audio file not found: {audio_path}")
        print("Please record a short audio file and save it as 'test_audio.webm'")
        return False
    
    with open(audio_path, "rb") as audio_file:
        files = {"audio": ("test.webm", audio_file, "audio/webm")}
        data = {"language": "en"}
        
        response = requests.post(f"{BASE_URL}/transcribe", files=files, data=data)
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        return response.status_code == 200


def test_respond_text():
    """Test /respond-text endpoint (text-only, no TTS)"""
    print("\n=== Testing /respond-text ===")
    
    payload = {
        "text": "How's the weather today?",
        "tone": "energetic"
    }
    
    response = requests.post(f"{BASE_URL}/respond-text", json=payload)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    return response.status_code == 200


def test_respond():
    """Test /respond endpoint (full TTS)"""
    print("\n=== Testing /respond ===")
    
    payload = {
        "text": "Tell me a joke",
        "tone": "neutral"
    }
    
    response = requests.post(f"{BASE_URL}/respond", json=payload)
    print(f"Status: {response.status_code}")
    print(f"Content-Type: {response.headers.get('content-type')}")
    
    if response.status_code == 200:
        # Save audio response
        output_path = "test_response.mp3"
        with open(output_path, "wb") as f:
            f.write(response.content)
        print(f"✓ Audio saved to {output_path} ({len(response.content)} bytes)")
        return True
    else:
        print(f"Error: {response.text}")
        return False


def test_voice_roundtrip(audio_path: str = TEST_AUDIO_PATH):
    """Test /voice-roundtrip endpoint (ASR → LLM → TTS)"""
    print("\n=== Testing /voice-roundtrip ===")
    
    if not Path(audio_path).exists():
        print(f"❌ Test audio file not found: {audio_path}")
        return False
    
    with open(audio_path, "rb") as audio_file:
        files = {"audio": ("test.webm", audio_file, "audio/webm")}
        data = {
            "tone": "calm",
            "language": "en"
        }
        
        response = requests.post(f"{BASE_URL}/voice-roundtrip", files=files, data=data)
        print(f"Status: {response.status_code}")
        print(f"Content-Type: {response.headers.get('content-type')}")
        
        if response.status_code == 200:
            output_path = "test_roundtrip.mp3"
            with open(output_path, "wb") as f:
                f.write(response.content)
            print(f"✓ Audio saved to {output_path} ({len(response.content)} bytes)")
            return True
        else:
            print(f"Error: {response.text}")
            return False


def run_all_tests():
    """Run all tests"""
    print("=" * 60)
    print("Lumino AI Backend Test Suite")
    print("=" * 60)
    
    results = {
        "health": test_health(),
        "respond_text": test_respond_text(),
        "respond": test_respond(),
    }
    
    # Optional tests that require audio files
    if Path(TEST_AUDIO_PATH).exists():
        results["transcribe"] = test_transcribe()
        results["voice_roundtrip"] = test_voice_roundtrip()
    else:
        print(f"\n⚠️  Skipping audio tests - no test file at {TEST_AUDIO_PATH}")
        print("   To test ASR/roundtrip, record a short audio and save as test_audio.webm")
    
    print("\n" + "=" * 60)
    print("Test Results Summary")
    print("=" * 60)
    for test_name, passed in results.items():
        status = "✓ PASS" if passed else "✗ FAIL"
        print(f"{status} - {test_name}")


if __name__ == "__main__":
    try:
        run_all_tests()
    except requests.exceptions.ConnectionError:
        print("\n❌ Could not connect to server at", BASE_URL)
        print("Make sure the server is running:")
        print("  python main.py")
        print("  or: uvicorn main:app --reload")
