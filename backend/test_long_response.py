"""
Test longer response generation
"""
import asyncio
from llm import LLMService

async def test_long_response():
    print("📝 Testing Long Response Generation\n")
    
    llm = LLMService()
    
    # Test 1: Request a short story
    print("Test 1: Requesting a short story...")
    print("-" * 50)
    
    story_prompt = "Write me a short story about a robot who learns to paint"
    
    response = await llm.generate_response(story_prompt, "neutral")
    
    print(f"\nStory length: {len(response)} characters")
    print(f"Word count: ~{len(response.split())} words")
    print(f"\nStory:\n{response}")
    print("\n" + "=" * 50 + "\n")
    
    # Test 2: Request a detailed explanation
    print("Test 2: Requesting detailed explanation...")
    print("-" * 50)
    
    explain_prompt = "Explain how machine learning works with examples"
    
    response2 = await llm.generate_response(explain_prompt, "neutral")
    
    print(f"\nExplanation length: {len(response2)} characters")
    print(f"Word count: ~{len(response2.split())} words")
    print(f"\nExplanation:\n{response2}")
    
    print("\n🎉 Long response test complete!")

if __name__ == "__main__":
    asyncio.run(test_long_response())
