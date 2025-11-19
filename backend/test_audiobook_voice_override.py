import asyncio
import os
from pathlib import Path
import json

from audiobook import AudiobookService


class DummyTTSService:
    async def synthesize(self, text: str, tone: str = 'neutral', voice: str = 'lisa'):
        return b"FAKE_MP3_BYTES"


async def test_generate_audio_with_voice_override():
    svc = AudiobookService()
    # Create sample metadata with 1 chapter
    audiobook_id = 'test_vo_0001'
    metadata = {
        'audiobook_id': audiobook_id,
        'user_id': 'test-user',
        'title': 'Test Book',
        'author': 'Test Author',
        'chapters': [
            {'chapter_number': 1, 'title': 'Chapter 1', 'content': 'This is a test chapter.'}
        ],
        'chapter_count': 1,
        'voice': 'lisa'
    }
    metadata_path = svc.metadata_dir / f"{audiobook_id}.json"
    with open(metadata_path, 'w', encoding='utf-8') as f:
        json.dump(metadata, f)

    # Use dummy tts service and override voice
    tts = DummyTTSService()
    voice_override = 'clone:myprofile'
    audio_path = await svc.generate_audio_for_chapter(audiobook_id, 1, tts, voice_override=voice_override)

    assert Path(audio_path).exists(), 'Generated audio file not found'
    assert 'clone_myprofile' in Path(audio_path).name, 'Voice override did not affect filename'

    print('✔︎ test_generate_audio_with_voice_override passed')


if __name__ == '__main__':
    asyncio.run(test_generate_audio_with_voice_override())
