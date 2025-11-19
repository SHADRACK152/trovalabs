"""
Test the HTTP endpoint
"""
import requests

# Test create endpoint
print("📤 Testing /voice-clone/create endpoint...")

# Create dummy audio file
files = {'audio': ('test.webm', b'fake audio data', 'audio/webm')}
data = {'user_id': 'http_test_user', 'profile_name': 'default'}

try:
    response = requests.post('http://localhost:8000/voice-clone/create', files=files, data=data)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    
    if response.status_code == 200:
        print("✅ Create endpoint works!")
    else:
        print("❌ Create endpoint error")
        
except Exception as e:
    print(f"❌ Connection error: {e}")
    print("\n⚠️  Make sure backend is running: python main.py")
