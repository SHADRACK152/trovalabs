#!/usr/bin/env python3
"""
Probe Hugging Face Router to find models accessible by the current HF_API_KEY.

This script:
 - Reads HF_API_KEY from environment or backend/.env
 - Queries the Hub for text-to-image models (top 50)
 - For each model, sends a small router request to check availability
 - Prints models that respond successfully and writes the first working model
   to backend/.env as HF_IMAGE_MODEL.

Use: .venv\Scripts\python.exe backend\scripts\probe_hf_router_models.py
"""
import os
import sys
import time
import json
from urllib.parse import urlencode
import httpx

REPO_ROOT = os.path.dirname(os.path.dirname(__file__))
ENV_PATH = os.path.join(REPO_ROOT, '.env')


def load_hf_token():
    token = os.environ.get('HF_API_KEY')
    if token:
        return token
    # try backend/.env
    env_file = os.path.join(REPO_ROOT, '.env')
    if os.path.exists(env_file):
        with open(env_file, 'r', encoding='utf-8') as f:
            for line in f:
                if line.strip().startswith('HF_API_KEY='):
                    return line.strip().split('=',1)[1]
    return None


def write_env_model(model_id):
    lines = []
    if os.path.exists(ENV_PATH):
        with open(ENV_PATH, 'r', encoding='utf-8') as f:
            lines = f.readlines()
    found = False
    for i,l in enumerate(lines):
        if l.startswith('HF_IMAGE_MODEL='):
            lines[i] = f'HF_IMAGE_MODEL={model_id}\n'
            found = True
            break
    if not found:
        lines.append(f'\nHF_IMAGE_MODEL={model_id}\n')
    with open(ENV_PATH, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print(f'Wrote HF_IMAGE_MODEL={model_id} to {ENV_PATH}')


def list_text_to_image_models(token, limit=50):
    headers = {'Authorization': f'Bearer {token}'}
    params = {'pipeline_tag': 'text-to-image', 'sort': 'downloads'}
    url = 'https://huggingface.co/api/models?' + urlencode(params)
    with httpx.Client(timeout=30.0) as client:
        resp = client.get(url, headers=headers)
        resp.raise_for_status()
        models = resp.json()
    return [m.get('id') for m in models][:limit]


def probe_model_router(token, model_id, timeout=30.0):
    url = 'https://router.huggingface.co/hf-inference'
    headers = {'Authorization': f'Bearer {token}', 'Accept': '*/*'}
    # Use a tiny prompt to avoid heavy generation
    payload = {
        'model': model_id,
        'inputs': 'a simple test image',
        'options': {'wait_for_model': False},
        'parameters': {'width': 64, 'height': 64, 'num_inference_steps': 1}
    }
    try:
        with httpx.Client(timeout=timeout) as client:
            resp = client.post(url, headers=headers, json=payload)
        return resp.status_code, resp.headers.get('content-type',''), resp.text[:2000]
    except Exception as e:
        return None, None, str(e)


def main():
    token = load_hf_token()
    if not token:
        print('HF_API_KEY not found. Set HF_API_KEY in environment or backend/.env')
        return 2

    print('Listing top text-to-image models from Hugging Face...')
    try:
        models = list_text_to_image_models(token, limit=100)
    except Exception as e:
        print('Failed to list models:', e)
        return 3

    print(f'Found {len(models)} models. Probing up to first 40 for router availability...')

    working = []
    for i, m in enumerate(models[:40]):
        print(f'[{i+1}/{min(40,len(models))}] Probing {m} ...', end=' ', flush=True)
        status, ctype, body = probe_model_router(token, m, timeout=20.0)
        if status == 200:
            print('OK (200)')
            working.append((m, status, ctype))
            # choose first working
            write_env_model(m)
            break
        elif status is None:
            print('ERROR:', body)
        else:
            print(status, ctype)
        # small delay to avoid rate limits
        time.sleep(0.5)

    if working:
        print('\nWorking models (first found used):')
        for w in working:
            print('-', w)
        return 0
    else:
        print('\nNo models responded with 200; here are the top probed models and their statuses:')
        for i,m in enumerate(models[:40]):
            status, ctype, body = probe_model_router(token, m, timeout=10.0)
            print(f'- {m}: {status} {ctype}')
        return 4


if __name__ == '__main__':
    sys.exit(main())
