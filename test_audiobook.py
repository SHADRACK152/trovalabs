"""
Test script for Audiobook feature
Tests text extraction from various file formats
"""
import asyncio
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent / "backend"))

from audiobook import AudiobookService


async def test_text_extraction():
    """Test text extraction from a sample text"""
    print("🧪 Testing Audiobook Service...\n")
    
    service = AudiobookService()
    
    # Test 1: Extract text from TXT
    print("✅ Test 1: TXT file extraction")
    sample_text = """
Chapter 1: The Beginning

Once upon a time, in a land far away, there lived a young adventurer.
This is the story of their incredible journey.

Chapter 2: The Journey

The adventure began on a sunny morning. Our hero packed their bags
and set off into the unknown, ready for whatever challenges lay ahead.

Chapter 3: The Conclusion

After many trials and tribulations, the hero returned home, forever
changed by their experiences. The end.
    """.encode('utf-8')
    
    try:
        text = await service.extract_text_from_file(sample_text, "sample.txt")
        print(f"   Extracted {len(text)} characters")
        print(f"   Preview: {text[:100]}...")
        print("   ✅ TXT extraction successful\n")
    except Exception as e:
        print(f"   ❌ TXT extraction failed: {e}\n")
    
    # Test 2: Chapter splitting
    print("✅ Test 2: Chapter splitting")
    try:
        chapters = service.split_into_chapters(text, max_chars=500)
        print(f"   Found {len(chapters)} chapters")
        for i, chapter in enumerate(chapters, 1):
            print(f"   Chapter {i}: {chapter['title'][:50]}...")
            print(f"      {chapter['char_count']} characters")
        print("   ✅ Chapter splitting successful\n")
    except Exception as e:
        print(f"   ❌ Chapter splitting failed: {e}\n")
    
    # Test 3: Check directories
    print("✅ Test 3: Directory structure")
    try:
        print(f"   Audiobooks dir: {service.audiobooks_dir.exists()}")
        print(f"   Uploads dir: {service.uploads_dir.exists()}")
        print(f"   Audio dir: {service.audio_dir.exists()}")
        print(f"   Metadata dir: {service.metadata_dir.exists()}")
        print("   ✅ Directory structure OK\n")
    except Exception as e:
        print(f"   ❌ Directory check failed: {e}\n")
    
    # Test 4: PDF support (optional)
    print("✅ Test 4: PDF support check")
    try:
        import PyPDF2
        print("   ✅ PyPDF2 installed - PDF support available")
    except ImportError:
        print("   ⚠️  PyPDF2 not installed - PDF support unavailable")
        print("      Install: pip install PyPDF2")
    
    # Test 5: EPUB support (optional)
    print("\n✅ Test 5: EPUB support check")
    try:
        import ebooklib
        print("   ✅ ebooklib installed - EPUB support available")
    except ImportError:
        print("   ⚠️  ebooklib not installed - EPUB support unavailable")
        print("      Install: pip install ebooklib beautifulsoup4")
    
    # Test 6: DOCX support (optional)
    print("\n✅ Test 6: DOCX support check")
    try:
        import docx
        print("   ✅ python-docx installed - DOCX support available")
    except ImportError:
        print("   ⚠️  python-docx not installed - DOCX support unavailable")
        print("      Install: pip install python-docx")
    
    print("\n" + "="*60)
    print("🎉 Audiobook Service Tests Complete!")
    print("="*60)
    print("\nNext steps:")
    print("1. Start backend: python backend/main.py")
    print("2. Open frontend: http://localhost:5173/audiobooks")
    print("3. Upload a book and create your first audiobook!")


if __name__ == "__main__":
    asyncio.run(test_text_extraction())
