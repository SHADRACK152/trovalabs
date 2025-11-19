"""
Test title generation system
"""
import asyncio
from title_generator import get_title_generator

async def test_titles():
    print("🏷️  Testing Title Generation\n")
    
    generator = get_title_generator()
    
    # Test cases
    test_cases = [
        {
            "user": "Hi! Can you help me debug this Python error?",
            "ai": "Of course! I'd be happy to help. What's the error message?",
            "expected": "Python debugging"
        },
        {
            "user": "What's the recipe for chocolate chip cookies?",
            "ai": "Here's a great recipe for chocolate chip cookies...",
            "expected": "Chocolate chip cookies recipe"
        },
        {
            "user": "I need career advice for switching to tech",
            "ai": "That's exciting! What's your current background?",
            "expected": "Career switch to tech"
        },
        {
            "user": "How do I fix my car's check engine light?",
            "ai": "Let's troubleshoot that. What model car do you have?",
            "expected": "Car check engine light"
        },
        {
            "user": "Hi",
            "ai": "Hello! How can I help you today?",
            "expected": "New conversation"
        }
    ]
    
    for i, test in enumerate(test_cases, 1):
        print(f"Test {i}: {test['user'][:50]}...")
        title = await generator.generate_title(
            test["user"],
            test["ai"]
        )
        print(f"  Generated: '{title}'")
        print(f"  Expected: '{test['expected']}'")
        print()
    
    print("🎉 Title generation tests complete!")

if __name__ == "__main__":
    asyncio.run(test_titles())
