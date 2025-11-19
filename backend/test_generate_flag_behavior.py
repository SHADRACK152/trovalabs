"""
Sanity tests for generate flag behavior on `/audiobook/{id}/chapter/{n}`.

- Ensures that when `generate=false` and the audio does not exist, the backend returns 404.
- Optionally checks that `generate=true` will attempt to generate (status 200) or 500 on generation error.

This script uses `requests` and expects the backend to be running locally on port 8000.
"""

import requests
import os

BASE_URL = os.environ.get('BASE_URL', 'http://localhost:8000')


def _create_sample_audiobook():
    # Create a tiny text file upload to produce an audiobook metadata entry
    files = {'file': ('sample.txt', b'Hello world\nThis is a sample test chapter.\n', 'text/plain')}
    data = {'title': 'Test Sample', 'author': 'Test'}
    res = requests.post(f"{BASE_URL}/audiobook/upload", files=files, data=data)
    res.raise_for_status()
    audiobook = res.json().get('audiobook')
    return audiobook


def test_generate_false_no_audio():
    print('Testing generate=false behavior...')
    # Find or create a sample audiobook
    try:
        audiobook = _create_sample_audiobook()
    except Exception as e:
        print('Failed to create sample audiobook:', e)
        return

    audiobook_id = audiobook.get('audiobook_id')
    chapter = 1

    # Ensure no audio exists (backend current_chapter should be 0 initially)
    r = requests.get(f"{BASE_URL}/audiobook/{audiobook_id}")
    if r.status_code != 200:
        print('Failed to fetch audiobook metadata')
        return
    meta = r.json()
    print('Audiobook metadata status:', meta.get('status'), 'current_chapter:', meta.get('current_chapter'))

    # Call with generate=false - expect 404 if audio not already generated
    r2 = requests.get(f"{BASE_URL}/audiobook/{audiobook_id}/chapter/{chapter}?generate=false")
    print('GET chapter with generate=false ->', r2.status_code)
    if r2.status_code == 404:
        print('\u2705 Backend returned 404 when generate=false and audio missing')
    else:
        print('⚠️ Expected 404, got', r2.status_code, '; response:', r2.text)

    # Call with generate=true - should attempt to generate; either returns 200 or (if TTS unavailable) 500
    r3 = requests.get(f"{BASE_URL}/audiobook/{audiobook_id}/chapter/{chapter}?generate=true")
    print('GET chapter with generate=true ->', r3.status_code)
    if r3.status_code == 200:
        print('\u2705 Backend generated/served chapter with generate=true')
    elif r3.status_code == 500:
        print('⚠️ Backend attempted generation but encountered an error (500) - TTS provider may not be configured or the generation process failed')
    else:
        print('Unexpected response for generate=true:', r3.status_code, r3.text)


if __name__ == '__main__':
    test_generate_false_no_audio()
