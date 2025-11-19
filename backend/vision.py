"""
Vision Service - Image Analysis with Google Gemini (FREE!)
Analyzes images and answers questions about them
"""
import logging
import base64
from typing import Optional
import os

logger = logging.getLogger(__name__)


class VisionService:
    """Image analysis using Google Gemini (FREE!)"""
    
    def __init__(self):
        """Initialize vision service"""
        from config import settings
        
        self.api_key = settings.GOOGLE_API_KEY or os.getenv("GOOGLE_API_KEY")
        self.model_name = settings.VISION_MODEL
        
        if not self.api_key:
            logger.warning("GOOGLE_API_KEY not set - Vision will fail")
            logger.info("Get FREE key at: https://aistudio.google.com/app/apikey")
        
        logger.info(f"🖼️  Vision Service initialized with {self.model_name} (Google Gemini - FREE!)")
    
    async def analyze_image(
        self,
        image_data: bytes,
        question: str = "What's in this image?",
        detail: str = "auto"
    ) -> str:
        """
        Analyze an image and answer questions about it using Google Gemini
        
        Args:
            image_data: Image bytes (JPEG, PNG, WebP, GIF)
            question: Question to ask about the image
            detail: Level of detail (ignored for Gemini)
        
        Returns:
            AI's analysis/answer about the image
        """
        try:
            # Check API key
            if not self.api_key:
                raise Exception(
                    "Google API key not configured. "
                    "Please set GOOGLE_API_KEY in your .env file. "
                    "Get a FREE key at: https://aistudio.google.com/app/apikey"
                )
            
            import google.generativeai as genai
            from PIL import Image
            import io
            
            # Configure Gemini
            genai.configure(api_key=self.api_key)
            
            # Set generation config with timeout
            generation_config = {
                "temperature": 0.7,
                "top_p": 0.95,
                "top_k": 40,
                "max_output_tokens": 2048,
            }
            
            model = genai.GenerativeModel(
                self.model_name,
                generation_config=generation_config
            )
            
            # Convert bytes to PIL Image
            image = Image.open(io.BytesIO(image_data))
            
            logger.info(f"Analyzing image ({len(image_data)} bytes)")
            logger.info(f"Question: '{question[:100]}...'")
            
            # Generate response with timeout
            import asyncio
            try:
                # Add timeout wrapper
                response = await asyncio.wait_for(
                    asyncio.to_thread(
                        model.generate_content,
                        [question, image]
                    ),
                    timeout=90.0  # 90 second timeout
                )
            except asyncio.TimeoutError:
                logger.error("Vision API timeout after 90 seconds")
                raise Exception("Image analysis timed out. Please try with a smaller image or simpler question.")
            
            answer = response.text.strip()
            logger.info(f"Vision response ({len(answer)} chars): '{answer[:100]}...'")
            
            return answer
            
        except Exception as e:
            logger.error(f"Vision analysis error: {str(e)}")
            raise Exception(f"Image analysis failed: {str(e)}")
    
    async def describe_image(self, image_data: bytes) -> str:
        """Get a detailed description of an image"""
        return await self.analyze_image(
            image_data,
            "Provide a detailed description of this image. Describe what you see, including objects, people, colors, setting, and any notable details."
        )
    
    async def extract_text(self, image_data: bytes) -> str:
        """Extract text from an image (OCR)"""
        return await self.analyze_image(
            image_data,
            "Extract and transcribe all visible text from this image. Include everything you can read, maintaining the original formatting as much as possible."
        )
    
    async def answer_about_image(
        self,
        image_data: bytes,
        question: str
    ) -> str:
        """Answer a specific question about an image"""
        return await self.analyze_image(image_data, question)


# Global instance
_vision_service = None


def get_vision_service() -> VisionService:
    """Get or create vision service instance"""
    global _vision_service
    if _vision_service is None:
        _vision_service = VisionService()
    return _vision_service
