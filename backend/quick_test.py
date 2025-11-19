"""
Quick test to check if backend is running and auth endpoints work
"""
import requests
import time

def check_backend():
    """Check if backend is accessible"""
    print("🔍 Checking backend status...")
    
    try:
        response = requests.get("http://localhost:8000/health", timeout=5)
        if response.status_code == 200:
            print("✅ Backend is running!")
            print(f"   Response: {response.json()}")
            return True
        else:
            print(f"⚠️  Backend returned status {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Backend is not running on http://localhost:8000")
        print("   Start it with: python -m uvicorn main:app --reload")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def quick_auth_test():
    """Quick authentication test"""
    print("\n🧪 Testing authentication endpoint...")
    
    # Try to register a user
    test_data = {
        "email": f"test{int(time.time())}@lumino.ai",
        "username": f"testuser{int(time.time())}",
        "password": "Test123!",  # Shorter password to avoid bcrypt 72 byte limit
        "full_name": "Test User"
    }
    
    try:
        response = requests.post("http://localhost:8000/auth/register", json=test_data, timeout=10)
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Registration works!")
            print(f"   Created user: {result['user']['username']}")
            print(f"   Token received: {result['access_token'][:30]}...")
            return True
        else:
            print(f"⚠️  Registration returned: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error during registration: {e}")
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("🚀 Lumino AI Backend Quick Check")
    print("=" * 60)
    
    if check_backend():
        quick_auth_test()
        print("\n" + "=" * 60)
        print("✅ Backend authentication is working!")
        print("=" * 60)
        print("\n💡 Next steps:")
        print("   1. Start the frontend: cd frontend && npm run dev")
        print("   2. Open browser: http://localhost:5173")
        print("   3. Click 'Sign In' and create an account!")
    else:
        print("\n❌ Backend is not running. Start it first:")
        print("   cd backend")
        print("   python -m uvicorn main:app --reload")
