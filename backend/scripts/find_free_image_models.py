#!/usr/bin/env python3
"""
Query Hugging Face Hub for public text-to-image models and choose a free one.

Usage:
  python backend/scripts/find_free_image_models.py

It reads the HF API token from .env (if present) or from the environment variable HF_API_KEY.
It prints a short list of public models and updates `.env` with a chosen model id.
"""
import os
import sys
import json
from urllib.parse import urlencode

import httpx

REPO_ROOT = Path = os.path.dirname(os.path.dirname(__file__))
ENV_PATH = os.path.join(REPO_ROOT, '.env')

# Helper to read token from .env or environment
def load_hf_token():
    token = os.environ.get('HF_API_KEY')
    if token:
        return token
    if os.path.exists(ENV_PATH):
        with open(ENV_PATH, 'r', encoding='utf-8') as f:
            for line in f:
                if line.strip().startswith('HF_API_KEY='):
                    return line.strip().split('=',1)[1]
    return None


def write_env_model(model_id):
    # Update HF_IMAGE_MODEL in .env if present, otherwise append
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
    print(f"Wrote HF_IMAGE_MODEL={model_id} to {ENV_PATH}")


def main():
    token = load_hf_token()
    if not token:
        print('HF_API_KEY not found in environment or .env. Set HF_API_KEY and re-run.')
        return 2

    headers = { 'Authorization': f'Bearer {token}' }
    params = { 'pipeline_tag': 'text-to-image', 'sort': 'downloads' }
    url = 'https://huggingface.co/api/models?'+urlencode(params)

    print('Querying Hugging Face models (this may return many results)...')
    try:
        with httpx.Client(timeout=30.0) as client:
            resp = client.get(url, headers=headers)
        resp.raise_for_status()
        models = resp.json()
    except Exception as e:
        print('Failed to list models:', e)
        try:
            print('Response content:', resp.text[:1000])
        except Exception:
            pass
        return 3

    # Filter public models
    public = [m for m in models if not m.get('private')]

    if not public:
        print('No public text-to-image models found for this token.')
        return 4

    # Print top candidates
    print('\nTop public text-to-image models (first 30):')
    candidates = []
    for m in public[:30]:
        mid = m.get('id')
        downloads = m.get('downloads', 'N/A')
        pipeline_tags = m.get('pipeline_tag', None)
        # some entries have list in tag fields
        print(f'- {mid}  (downloads={downloads})')
        candidates.append(mid)

    # Preferred order to choose from
    preferred = [
        'runwayml/stable-diffusion-v1-5',
        'stabilityai/stable-diffusion-2-1',
        'stabilityai/stable-diffusion-2-1-base',
        'stabilityai/stable-diffusion-xl-beta',
        'dreamlike-art/dreamlike-photoreal-2.0',
        'prompthero/openjourney',
        'runwayml/stable-diffusion-xl',
    ]

    chosen = None
    for p in preferred:
        if p in candidates:
            chosen = p
            break
    if not chosen:
        # fallback to first candidate
        chosen = candidates[0]

    print('\nSelected model:', chosen)
    write_env_model(chosen)
    return 0


if __name__ == '__main__':
    sys.exit(main())
