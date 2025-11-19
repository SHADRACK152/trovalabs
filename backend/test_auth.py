"""
Test script for authentication system
Tests user registration, login, and profile updates
"""
import requests
import json

BASE_URL = "http://localhost:8000"

def test_registration():
    """Test user registration"""
    print("\n🧪 Testing User Registration...")
    
    data = {
        "email": "test@lumino.ai",
        "username": "testuser",
        "password": "TestPassword123!",
        "full_name": "Test User"
    }
    
    response = requests.post(f"{BASE_URL}/auth/register", json=data)
    
    if response.status_code == 200:
        result = response.json()
        print("✅ Registration successful!")
        print(f"   User ID: {result['user']['id']}")
        print(f"   Username: {result['user']['username']}")
        print(f"   Token: {result['access_token'][:20]}...")
        return result['access_token']
    else:
        print(f"❌ Registration failed: {response.status_code}")
        print(f"   Error: {response.text}")
        return None


def test_login():
    """Test user login"""
    print("\n🧪 Testing User Login...")
    
    data = {
        "email": "test@lumino.ai",
        "password": "TestPassword123!"
    }
    
    response = requests.post(f"{BASE_URL}/auth/login", json=data)
    
    if response.status_code == 200:
        result = response.json()
        print("✅ Login successful!")
        print(f"   Username: {result['user']['username']}")
        print(f"   Token: {result['access_token'][:20]}...")
        return result['access_token']
    else:
        print(f"❌ Login failed: {response.status_code}")
        print(f"   Error: {response.text}")
        return None


def test_get_profile(token):
    """Test getting current user profile"""
    print("\n🧪 Testing Get Current User Profile...")
    
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    response = requests.get(f"{BASE_URL}/auth/me", headers=headers)
    
    if response.status_code == 200:
        result = response.json()
        print("✅ Profile retrieved successfully!")
        print(f"   Username: {result['username']}")
        print(f"   Email: {result['email']}")
        print(f"   Preferred Tone: {result['preferred_tone']}")
        print(f"   Conversation Style: {result['conversation_style']}")
        return True
    else:
        print(f"❌ Get profile failed: {response.status_code}")
        print(f"   Error: {response.text}")
        return False


def test_update_profile(token):
    """Test updating user profile"""
    print("\n🧪 Testing Profile Update...")
    
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    data = {
        "full_name": "Test User Updated",
        "bio": "I am a test user for Lumino AI",
        "preferred_tone": "energetic",
        "conversation_style": "detailed",
        "interests": ["AI", "Technology", "Science"],
        "personality_traits": {
            "formality": "casual",
            "humor": "high"
        }
    }
    
    response = requests.put(f"{BASE_URL}/auth/profile", json=data, headers=headers)
    
    if response.status_code == 200:
        result = response.json()
        print("✅ Profile updated successfully!")
        print(f"   Full Name: {result['full_name']}")
        print(f"   Bio: {result['bio']}")
        print(f"   Preferred Tone: {result['preferred_tone']}")
        print(f"   Conversation Style: {result['conversation_style']}")
        print(f"   Interests: {result['interests']}")
        return True
    else:
        print(f"❌ Profile update failed: {response.status_code}")
        print(f"   Error: {response.text}")
        return False


def test_invalid_token():
    """Test with invalid token"""
    print("\n🧪 Testing Invalid Token...")
    
    headers = {
        "Authorization": "Bearer invalid_token_12345"
    }
    
    response = requests.get(f"{BASE_URL}/auth/me", headers=headers)
    
    if response.status_code == 401:
        print("✅ Invalid token correctly rejected!")
        return True
    else:
        print(f"❌ Expected 401, got: {response.status_code}")
        return False


def main():
    """Run all authentication tests"""
    print("=" * 60)
    print("🚀 Lumino AI Authentication System Tests")
    print("=" * 60)
    
    # Test registration (will fail if user already exists)
    token = test_registration()
    
    # If registration failed (user exists), try login
    if not token:
        print("\n📝 User might already exist, trying login instead...")
        token = test_login()
    
    if not token:
        print("\n❌ Could not get authentication token. Tests aborted.")
        return
    
    # Test getting profile
    test_get_profile(token)
    
    # Test updating profile
    test_update_profile(token)
    
    # Test getting profile again to see updates
    test_get_profile(token)
    
    # Test invalid token
    test_invalid_token()
    
    print("\n" + "=" * 60)
    print("✅ All authentication tests completed!")
    print("=" * 60)


if __name__ == "__main__":
    try:
        main()
    except requests.exceptions.ConnectionError:
        print("\n❌ Error: Could not connect to backend server.")
        print("   Make sure the backend is running on http://localhost:8000")
        print("   Run: cd backend && python -m uvicorn main:app --reload")
    except Exception as e:
        print(f"\n❌ Unexpected error: {str(e)}")
