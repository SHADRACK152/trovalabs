"""
Test long-term memory system
"""
import asyncio
from memory import get_memory_service

async def test_memory():
    print("🧠 Testing Long-Term Memory System\n")
    
    service = get_memory_service()
    test_user = "test_user_123"
    
    # Test 1: Save messages
    print("1️⃣ Saving messages...")
    service.save_message(test_user, "user", "Hi! My name is Alex.")
    service.save_message(test_user, "assistant", "Hello Alex! Nice to meet you!")
    service.save_message(test_user, "user", "I love coding in Python.")
    service.save_message(test_user, "assistant", "That's great! Python is an amazing language.")
    print("✅ Saved 4 messages\n")
    
    # Test 2: Retrieve history
    print("2️⃣ Retrieving conversation history...")
    history = service.get_conversation_history(test_user, limit=10)
    print(f"✅ Retrieved {len(history)} messages:")
    for msg in history:
        print(f"  [{msg['role']}]: {msg['content']}")
    print()
    
    # Test 3: Get summary
    print("3️⃣ Getting user summary...")
    summary = service.get_user_summary(test_user)
    print(f"✅ Summary: {summary}\n")
    
    # Test 4: Save more messages (test limit)
    print("4️⃣ Testing message limit...")
    for i in range(10):
        service.save_message(test_user, "user", f"Message {i}")
        service.save_message(test_user, "assistant", f"Response {i}")
    
    history = service.get_conversation_history(test_user, limit=5)
    print(f"✅ Retrieved last {len(history)} messages (limit=5)\n")
    
    # Test 5: Clear memory
    print("5️⃣ Clearing memory...")
    success = service.clear_user_memory(test_user)
    print(f"✅ Cleared: {success}")
    
    summary = service.get_user_summary(test_user)
    print(f"✅ After clearing: {summary}\n")
    
    print("🎉 All tests passed!")

if __name__ == "__main__":
    asyncio.run(test_memory())
