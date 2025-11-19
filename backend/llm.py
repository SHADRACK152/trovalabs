"""
LLM (Large Language Model) Service
Generates conversational responses with tone awareness
"""
import logging
from typing import Optional
from openai import AsyncOpenAI
import asyncio
import random

try:
    from backend.config import settings
except Exception:
    try:
        from .config import settings
    except Exception:
        from config import settings

logger = logging.getLogger(__name__)


class LLMServiceUnavailable(Exception):
    """Raised when the configured LLM provider is unavailable (5xx errors or network issues)."""
    pass


class LLMRequestTooLarge(Exception):
    """Raised when the request exceeds provider token limits (413 / Payload Too Large)."""
    pass
class LLMService:
    """
    LLM service for generating conversational responses
    Supports Groq (llama, mixtral, etc.) and OpenAI GPT models
    """
    
    # System prompts for different tones
    TONE_INSTRUCTIONS = {
        "calm": "Respond in a calm, soothing, reassuring manner. Use gentle language and a peaceful tone.",
        "neutral": "Respond in a balanced, clear, professional manner. Be helpful and direct.",
        "energetic": "Respond with enthusiasm and energy! Use upbeat language and show excitement."
    }
    
    def __init__(self):
        """Initialize LLM service"""
        self.model = settings.LLM_MODEL
        logger.info(f"Initializing LLM service with model: {self.model}")
        
        # Detect provider from model name
        if "llama" in self.model.lower() or "mixtral" in self.model.lower() or "groq" in self.model.lower():
            self.provider = "groq"
            if not settings.GROQ_API_KEY:
                logger.warning("GROQ_API_KEY not set - LLM will fail")
            # Groq uses OpenAI-compatible API
            self.client = AsyncOpenAI(
                api_key=settings.GROQ_API_KEY,
                base_url=settings.GROQ_BASE_URL
            )
        else:
            self.provider = "openai"
            if not settings.OPENAI_API_KEY:
                logger.warning("OPENAI_API_KEY not set - LLM will fail")
            self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        
        logger.info(f"LLM provider: {self.provider}")
    
    def _build_system_prompt(self, tone: str) -> str:
        """
        Build system prompt with persona and tone instructions
        
        Args:
            tone: Desired tone (calm/neutral/energetic)
        
        Returns:
            System prompt string
        """
        base_prompt = """You are Lumino, a warm, friendly, and engaging AI companion. 
You're conversational, witty, and genuinely interested in chatting with users.
Provide helpful, complete responses that fully address the user's questions.
When listing ideas or suggestions, complete ALL items - don't stop mid-sentence or mid-list.
Show personality, use humor when appropriate, and make the conversation enjoyable.
React naturally to jokes and riddles - laugh, appreciate clever wordplay, and engage playfully.
Be expressive with your language and don't be afraid to show enthusiasm or empathy.

This service enforces token and request limits; answer thoroughly but avoid excessively long responses if asked.
- If asked to write a story, write a COMPLETE short story with beginning, middle, and end
- If asked to explain something complex, provide thorough explanations with examples
- If listing things, include as many relevant items as needed
- Don't rush or cut yourself short - take the space you need to give quality responses

IMPORTANT: 
- ALWAYS complete your thoughts and sentences - never stop abruptly
- When giving lists, finish ALL items completely
- When writing stories, include full narrative arcs with proper endings
- Avoid being repetitive! Don't ask "what's on your mind" or similar questions every time
- Vary your responses based on context. In knock-knock jokes, ONLY respond with the expected format like "Peter who?"
- Stay engaged with the flow of conversation and remember what was said before."""
        
        tone_instruction = self.TONE_INSTRUCTIONS.get(tone, self.TONE_INSTRUCTIONS["neutral"])
        
        return f"{base_prompt}\n\n{tone_instruction}"
    
    async def generate_response(
        self,
        user_text: str,
        tone: str = "neutral",
        user_id: Optional[str] = None,
        conversation_history: Optional[list] = None
    ) -> str:
        """
        Generate conversational response
        
        Args:
            user_text: User's input text
            tone: Desired response tone
            user_id: Optional user identifier for personalization
            conversation_history: List of previous messages [{"role": "user/assistant", "content": "..."}]
        
        Returns:
            Generated response text
        """
        logger.info(f"Generating response with model={self.model}, tone={tone}, history_length={len(conversation_history) if conversation_history else 0}")
        
        # Both Groq and OpenAI use OpenAI-compatible API
        return await self._generate_openai(user_text, tone, user_id, conversation_history)
    
    async def _generate_openai(
        self,
        user_text: str,
        tone: str,
        user_id: Optional[str],
        conversation_history: Optional[list] = None
    ) -> str:
        """Generate response using OpenAI-compatible API (OpenAI or Groq)"""
        try:
            system_prompt = self._build_system_prompt(tone)
            
            # Build messages with conversation history
            messages = [{"role": "system", "content": system_prompt}]
            
            # Add conversation history (keep last 10 exchanges to stay within token limits)
            if conversation_history:
                # Only keep last 20 messages (10 exchanges)
                recent_history = conversation_history[-20:] if len(conversation_history) > 20 else conversation_history
                messages.extend(recent_history)
            
            # Add current user message
            messages.append({"role": "user", "content": user_text})
            
            # Token guarding: estimate input tokens and ensure we don't exceed provider limits
            def _estimate_tokens_for_text(text: str) -> int:
                # Rough heuristic: 1 token ~= 4 characters in English (approx). Use a conservative multiplier.
                if not text:
                    return 0
                return max(1, int(len(text) / 4))

            def _estimate_tokens_for_messages(msgs: list) -> int:
                t = 0
                for m in msgs:
                    t += _estimate_tokens_for_text(m.get("content", ""))
                return t

            input_tokens = _estimate_tokens_for_messages(messages)
            safety_margin = 100
            allowed_out_tokens = min(settings.LLM_MAX_TOKENS, max(64, settings.LLM_TPM_LIMIT - input_tokens - safety_margin))

            # If allowed output tokens are small, try trimming conversation history (oldest messages) to increase allowance
            # Aggressively trim history until we have a sensible output token budget
            if allowed_out_tokens < 128 and len(messages) > 2:
                logger.warning("Token budget low; trimming conversation history to fit request within TPM limits")
                # Try progressively aggressive trimming strategies
                # 1) Keep system + last 6 messages
                # 2) Keep system + last 3 messages
                # 3) Keep system + last 1 message (the user's current message)
                for tail_size in (6, 3, 1):
                    trimmed_msgs = [messages[0]] + messages[-tail_size:]
                    messages = trimmed_msgs
                    input_tokens = _estimate_tokens_for_messages(messages)
                    allowed_out_tokens = min(settings.LLM_MAX_TOKENS, max(64, settings.LLM_TPM_LIMIT - input_tokens - safety_margin))
                    logger.info(f"After trimming (tail={tail_size}): estimated input_tokens={input_tokens}, allowed_out_tokens={allowed_out_tokens}")
                    if allowed_out_tokens >= 128:
                        break

                # If we still don't have a usable budget, the request is too large for provider limits
                if allowed_out_tokens < 64:
                    msg = (
                        f"Request too large for configured LLM provider (estimated input_tokens={input_tokens}, "
                        f"TPM limit={settings.LLM_TPM_LIMIT}). Try shortening the input or clearing conversation history."
                    )
                    logger.error(msg)
                    raise LLMRequestTooLarge(msg)

            # Call OpenAI API with a safe max_tokens, with retries and fallback
            MAX_RETRIES = getattr(settings, 'LLM_API_RETRIES', 3)
            BASE_BACKOFF = 0.6
            last_exception = None
            response = None
            for attempt in range(1, MAX_RETRIES + 1):
                try:
                    logger.info(f"LLM API call attempt {attempt}/{MAX_RETRIES} (model={self.model})")
                    response = await self.client.chat.completions.create(
                        model=self.model,
                        messages=messages,
                        temperature=settings.LLM_TEMPERATURE,
                        max_tokens=allowed_out_tokens
                    )
                    break
                except Exception as e:
                    last_exception = e
                    msg = str(e)[:1000]
                    logger.warning(f"LLM attempt {attempt} failed: {msg}")
                    # Detect provider 'Payload Too Large' or TPM rate-limit messages and raise specialized error
                    lower = msg.lower()
                    if 'payload too large' in lower or 'request too large' in lower or '413' in lower or 'tokens per minute' in lower:
                        logger.error("Detected provider payload-too-large (413) or TPM limit in error; raising LLMRequestTooLarge")
                        raise LLMRequestTooLarge(msg)
                    # For 5xx or transient network errors, backoff then retry
                    # If error contains HTML body from Cloudflare (500), treat as transient
                    if attempt < MAX_RETRIES:
                        backoff = BASE_BACKOFF * (2 ** (attempt - 1)) + random.random() * 0.2
                        logger.info(f"Retrying in {backoff:.2f}s...")
                        await asyncio.sleep(backoff)
                        continue
                    else:
                        logger.error("LLM calls exhausted retries")
                        break

            # If we still have no response, try provider fallback if available
            if response is None:
                # If primary provider is Groq and OPENAI_API_KEY exists, try OpenAI
                if self.provider == 'groq' and settings.OPENAI_API_KEY:
                    try:
                        logger.info("Groq provider failing - attempting fallback to OpenAI provider")
                        openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
                        response = await openai_client.chat.completions.create(
                            model=settings.OPENAI_FALLBACK_MODEL if getattr(settings, 'OPENAI_FALLBACK_MODEL', None) else 'gpt-4o-mini',
                            messages=messages,
                            temperature=settings.LLM_TEMPERATURE,
                            max_tokens=allowed_out_tokens
                        )
                    except Exception as e:
                        last_exception = e
                        ferr = str(e)
                        logger.error(f"Fallback OpenAI request also failed: {ferr}")
                        if '413' in ferr or 'payload too large' in ferr.lower():
                            # Fallback also indicates payload too large
                            raise LLMRequestTooLarge(ferr)

            if response is None:
                # No usable response after retries and optional fallback - raise a specific error
                body = ''
                if last_exception:
                    body = str(last_exception)
                logger.error(f"LLM provider unavailable: {body}")
                raise LLMServiceUnavailable(f"LLM provider unavailable: {body}")
            
            response_text = response.choices[0].message.content.strip()
            logger.info(f"OpenAI response ({len(response_text)} chars): '{response_text[:100]}...'")
            
            return response_text
        
        except LLMServiceUnavailable:
            # Let upstream handlers decide how to map service unavailability
            raise
        except Exception as e:
            logger.error(f"OpenAI API error: {str(e)}")
            raise Exception(f"LLM generation failed: {str(e)}")
