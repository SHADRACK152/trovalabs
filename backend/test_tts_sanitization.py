"""Unit tests for TTS text sanitization helper
"""
from text_utils import sanitize_text_for_tts


def test_sanitize_basic_asterisks():
    assert sanitize_text_for_tts("Hello, **John**!") == "Hello, John!"
    assert sanitize_text_for_tts("This is *emphasized* text") == "This is emphasized text"
    assert sanitize_text_for_tts("Use `code()` inline") == "Use code() inline"
    assert sanitize_text_for_tts("Link: [OpenAI](https://openai.com)") == "Link: OpenAI"
    assert sanitize_text_for_tts("Mixed **bold _and_ italic** text") == "Mixed bold and italic text"


def test_sanitize_code_block_and_stars():
    text = "Here is a code block:\n```\nprint('hello')\n```\nAnd **bold** text"
    assert sanitize_text_for_tts(text) == "Here is a code block: And bold text"


def test_sanitize_noop_on_plain_text():
    assert sanitize_text_for_tts("Plain sentence with nothing to remove.") == "Plain sentence with nothing to remove."
