"""Text utility functions for the backend
Includes sanitization for TTS to strip markdown-like formatting
"""
import re


def sanitize_text_for_tts(text: str) -> str:
    """Strip markdown/formatting characters so TTS does not pronounce e.g. asterisks

    This removes code blocks, inline code backticks, markdown links, and bold/italic
    markers while preserving the visible text content.
    """
    if not text:
        return text

    # Remove code blocks ```...``` completely
    text = re.sub(r"```[\s\S]*?```", " ", text)

    # Inline code `code` -> code
    text = re.sub(r"`([^`]+)`", r"\1", text)

    # Links [text](url) -> text
    text = re.sub(r"\[([^\]]+)\]\([^\)]+\)", r"\1", text)

    # Bold/italic (***, **, *, __, _) -> remove the wrappers
    text = re.sub(r"(\*\*|__)(.*?)\1", r"\2", text)
    text = re.sub(r"(\*|_)(.*?)\1", r"\2", text)

    # Remove any remaining single asterisks or underscores that may remain
    text = text.replace("*", "").replace("_", "")

    # Clean multiple spaces/newlines
    text = re.sub(r"\s+", " ", text).strip()
    return text


def sanitize_text_basic(text: str) -> str:
    """Simpler sanitization - fallback for other modules to use
    currently an alias to sanitize_text_for_tts
    """
    return sanitize_text_for_tts(text)


__all__ = ["sanitize_text_for_tts", "sanitize_text_basic"]
