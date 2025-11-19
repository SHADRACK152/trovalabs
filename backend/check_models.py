import httpx
import asyncio
import os
from dotenv import load_dotenv

async def check_models():
    load_dotenv()
    api_key = os.getenv('ELEVENLABS_API_KEY')
    
    async with httpx.AsyncClient() as client:
        r = await client.get(
            'https://api.elevenlabs.io/v1/models',
            headers={'xi-api-key': api_key}
        )
        models = r.json()
        
        print('Available ElevenLabs models:')
        for m in models:
            print(f"  - {m['model_id']}")
            print(f"    Name: {m.get('name', 'N/A')}")
            print(f"    Can use: {m.get('can_use_style', False)}")
            print()

asyncio.run(check_models())
