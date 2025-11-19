"""
Quick test to verify backend components are working
"""
import asyncio
import logging
from llm import LLMService
from config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_llm():
    """Test LLM service"""
    try:
        logger.info("Testing LLM service...")
        llm = LLMService()
        
        response = await llm.generate_response(
            user_text="Hello, how are you?",
            tone="neutral",
            conversation_history=None
        )
        
        logger.info(f"✅ LLM test SUCCESS")
        logger.info(f"Response: {response}")
        return True
        
    except Exception as e:
        logger.error(f"❌ LLM test FAILED: {str(e)}")
        return False

async def main():
    """Run all tests"""
    logger.info("=" * 60)
    logger.info("Testing Backend Components")
    logger.info("=" * 60)
    logger.info(f"LLM Model: {settings.LLM_MODEL}")
    logger.info(f"Groq API Key: {'SET' if settings.GROQ_API_KEY else 'NOT SET'}")
    logger.info("=" * 60)
    
    llm_ok = await test_llm()
    
    logger.info("=" * 60)
    if llm_ok:
        logger.info("✅ All tests PASSED")
    else:
        logger.info("❌ Some tests FAILED")
    logger.info("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())
