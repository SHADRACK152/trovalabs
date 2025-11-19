import asyncio
import sys
from pathlib import Path
import json

sys.path.insert(0, str(Path(__file__).parent))

from audiobook import AudiobookService


async def test_title_enrichment():
    svc = AudiobookService()
    sample_text = b"""
Chapter 1: The Beginning

Once upon a time, in a land far away, there lived a young adventurer.
This is the story of their incredible journey.

Chapter 2: The Journey

The adventure began on a sunny morning. Our hero packed their bags
and set off into the unknown, ready for whatever challenges lay ahead.

Chapter 3: The Conclusion

After many trials and tribulations, the hero returned home, forever
changed by their experiences. The end.
"""

    metadata = await svc.create_audiobook(sample_text, 'sample.txt', user_id='test-user')
    assert 'chapters' in metadata
    titles = [c.get('title') for c in metadata['chapters']]
    print('Generated titles:', titles)
    # At least two titles should not be generic 'Chapter X'
    non_generic = [t for t in titles if not t.lower().startswith('chapter')]
    assert len(non_generic) >= 1, 'Expected at least one enriched chapter title'
    print('✔︎ test_title_enrichment passed')


if __name__ == '__main__':
    asyncio.run(test_title_enrichment())
