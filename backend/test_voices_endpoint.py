"""Tests for the voices endpoint and FreeTTS voice list
"""
from backend.elevenlabs_tts import get_free_tts_service


def test_free_voices_present():
    svc = get_free_tts_service()
    voices = svc.get_voice_options()
    # Verify some expected voices exist
    assert "lisa" in voices
    assert "emma" in voices
    assert isinstance(voices["lisa"], dict)


def test_voice_metadata():
    svc = get_free_tts_service()
    voices = svc.get_voice_options()
    lisa = voices.get("lisa")
    assert lisa["provider"] == "ttsfree"
    assert lisa["available"] is True
