import asyncio
import os
from openai import AsyncOpenAI


async def test_groq():
    # Do NOT hardcode API keys. Read from environment variable `GROQ_API_KEY`.
    groq_key = os.environ.get("GROQ_API_KEY")
    client = AsyncOpenAI(
        api_key=groq_key,
        base_url='https://api.groq.com/openai/v1'
    )
    
    print("Fetching available models...")
    models = await client.models.list()
    print("\nAvailable Groq models:")
    for m in models.data:
        print(f"  - {m.id}")
    
    # Test with llama-3.1-8b-instant
    print("\n\nTesting llama-3.1-8b-instant...")
    try:
        response = await client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": "Say hello in 5 words"}
            ],
            max_tokens=50
        )
        print(f"✅ SUCCESS! Response: {response.choices[0].message.content}")
    except Exception as e:
        print(f"❌ FAILED: {str(e)}")

asyncio.run(test_groq())
