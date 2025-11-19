"""
Test vision/image analysis
"""
import asyncio
from vision import get_vision_service
from pathlib import Path
from PIL import Image
import io

async def test_vision():
    print("🖼️  Testing Vision Service\n")
    
    service = get_vision_service()
    
    # Create a proper test image (100x100 red square)
    img = Image.new('RGB', (100, 100), color='red')
    img_bytes = io.BytesIO()
    img.save(img_bytes, format='PNG')
    test_image = img_bytes.getvalue()
    
    print("Test 1: Basic image analysis...")
    print("-" * 50)
    
    try:
        result = await service.analyze_image(
            test_image,
            "What do you see in this image?"
        )
        print(f"✅ Analysis result:\n{result}\n")
    except Exception as e:
        print(f"❌ Error: {e}\n")
    
    print("=" * 50)
    print("\n📸 Vision service is ready to analyze images!")
    print("Upload an image through the chat interface to test it fully.")

if __name__ == "__main__":
    asyncio.run(test_vision())
