"""
Chat Title Generator
Generates meaningful titles for chat sessions based on conversation content
"""
import logging
from typing import Optional
from openai import AsyncOpenAI
from config import settings

logger = logging.getLogger(__name__)


class TitleGenerator:
    """Generates smart titles for chat conversations"""
    
    def __init__(self):
        """Initialize title generator"""
        # Use same LLM setup as main service
        if "llama" in settings.LLM_MODEL.lower() or "mixtral" in settings.LLM_MODEL.lower():
            self.client = AsyncOpenAI(
                api_key=settings.GROQ_API_KEY,
                base_url=settings.GROQ_BASE_URL
            )
        else:
            self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        
        self.model = settings.LLM_MODEL
        logger.info("🏷️  Title Generator initialized")
    
    async def generate_title(
        self,
        user_message: str,
        ai_response: Optional[str] = None,
        conversation_context: Optional[list] = None
    ) -> str:
        """
        Generate a smart, concise title for a conversation
        
        Args:
            user_message: The user's message
            ai_response: Optional AI response for more context
            conversation_context: Optional list of previous messages
        
        Returns:
            A concise, meaningful title (3-5 words)
        """
        try:
            # Build context for title generation
            context_parts = []
            
            # Add previous messages for context (last 3 exchanges)
            if conversation_context and len(conversation_context) > 0:
                recent = conversation_context[-6:]  # Last 3 exchanges (user + assistant)
                for msg in recent:
                    context_parts.append(f"{msg['role']}: {msg['content'][:100]}")
            
            # Add current exchange
            context_parts.append(f"user: {user_message}")
            if ai_response:
                context_parts.append(f"assistant: {ai_response[:100]}")
            
            full_context = "\n".join(context_parts)
            
            # Generate title using LLM
            prompt = f"""Based on this conversation, generate a short, descriptive title (3-5 words maximum).
The title should capture the main topic or question being discussed.

Conversation:
{full_context}

Generate ONLY the title, nothing else. Make it concise and informative.
Examples of good titles:
- "Python Error Debugging"
- "Recipe for Pasta Carbonara"
- "Career Advice Tech Industry"
- "Math Homework Help"
- "Travel Plans to Japan"

Title:"""

            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a title generator. Generate only short, descriptive titles."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,  # Lower temperature for more consistent titles
                max_tokens=20
            )
            
            title = response.choices[0].message.content.strip()
            
            # Clean up the title
            title = title.replace('"', '').replace("'", '').strip()
            
            # Limit length
            if len(title) > 50:
                title = title[:50].rsplit(' ', 1)[0] + "..."
            
            logger.info(f"🏷️  Generated title: '{title}'")
            return title
            
        except Exception as e:
            logger.error(f"Error generating title: {e}")
            # Fallback: extract keywords from user message
            return self._extract_keywords(user_message)
    
    def _extract_keywords(self, text: str) -> str:
        """
        Fallback method: Extract keywords from text
        
        Args:
            text: Input text
        
        Returns:
            Simple title based on keywords
        """
        # Remove common words
        common_words = {'hi', 'hello', 'hey', 'the', 'a', 'an', 'is', 'are', 'was', 'were', 
                       'can', 'you', 'help', 'me', 'please', 'i', 'want', 'need', 'how', 'what'}
        
        words = text.lower().split()
        keywords = [w for w in words if w not in common_words and len(w) > 2]
        
        if not keywords:
            return "New Conversation"
        
        # Take first 3-4 meaningful words
        title_words = keywords[:4]
        title = ' '.join(title_words).title()
        
        if len(title) > 50:
            title = title[:50].rsplit(' ', 1)[0] + "..."
        
        return title if title else "New Conversation"


# Global instance
_title_generator = None


def get_title_generator() -> TitleGenerator:
    """Get or create title generator instance"""
    global _title_generator
    if _title_generator is None:
        _title_generator = TitleGenerator()
    return _title_generator
