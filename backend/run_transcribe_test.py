import requests

BASE_URL = "http://localhost:8000"

with open('test_audio.webm', 'rb') as f:
    files = {'audio': ('test.webm', f, 'audio/webm')}
    data = {'language': 'en'}
    r = requests.post(f"{BASE_URL}/transcribe", files=files, data=data)
    print(r.status_code)
    print(r.text)
