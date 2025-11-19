#!/usr/bin/env python3
"""
Discover what Hugging Face models your token can access and which are available
via the HF Router inference endpoint.

Outputs a small report of models owned by your user/orgs and whether the router
returns 200 for inference (i.e., the token can use inference on that model).
"""
import os
import sys
import httpx
from urllib.parse import urlencode

REPO_ROOT = os.path.dirname(os.path.dirname(__file__))
ENV_PATH = os.path.join(REPO_ROOT, '.env')


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


def whoami(token):
    url = 'https://huggingface.co/api/whoami-v2'
    headers = {'Authorization': f'Bearer {token}'}
    with httpx.Client(timeout=20.0) as client:
        r = client.get(url, headers=headers)
        r.raise_for_status()
        return r.json()


def list_models_for_author(token, author, limit=200):
    headers = {'Authorization': f'Bearer {token}'}
    params = {'author': author, 'limit': limit}
    url = 'https://huggingface.co/api/models?' + urlencode(params)
    with httpx.Client(timeout=30.0) as client:
        r = client.get(url, headers=headers)
        r.raise_for_status()
        items = r.json()
        return [i.get('id') for i in items]


def probe_router(token, model_id, timeout=20.0):
    url = 'https://router.huggingface.co/hf-inference'
    headers = {'Authorization': f'Bearer {token}', 'Accept': '*/*'}
    payload = {
        'model': model_id,
        'inputs': 'test',
        'options': {'wait_for_model': False},
        'parameters': {'width': 64, 'height': 64, 'num_inference_steps': 1}
    }
    try:
        with httpx.Client(timeout=timeout) as client:
            r = client.post(url, headers=headers, json=payload)
        return r.status_code, r.headers.get('content-type'), r.text[:1000]
    except Exception as e:
        return None, None, str(e)


def main():
    token = load_hf_token()
    if not token:
        print('HF_API_KEY not found in environment or backend/.env')
        return 2

    print('Fetching identity using whoami...')
    try:
        info = whoami(token)
    except Exception as e:
        print('Failed whoami:', e)
        try:
            print('Response:', e.response.text)
        except Exception:
            pass
        return 3

    username = info.get('name') or info.get('user', {}).get('name') or info.get('id')
    orgs = [o.get('id') for o in info.get('organizations', [])] if info.get('organizations') else []

    print('Authenticated as:', username)
    if orgs:
        print('Member of organizations:', ', '.join(orgs))

    # List models owned by user
    models = []
    print('\nListing models owned by user...')
    try:
        user_models = list_models_for_author(token, username)
        print(f'Found {len(user_models)} models for user {username}')
        models.extend(user_models)
    except Exception as e:
        print('Failed to list user models:', e)

    # List models for each org
    for org in orgs:
        try:
            org_models = list_models_for_author(token, org)
            print(f'Found {len(org_models)} models for org {org}')
            models.extend(org_models)
        except Exception as e:
            print(f'Failed to list models for org {org}:', e)

    # Deduplicate
    models = list(dict.fromkeys(models))

    if not models:
        print('\nNo owned models found. Will probe some popular public models to test router access.')
        candidates = [
            'stabilityai/stable-diffusion-xl-base-1.0',
            'runwayml/stable-diffusion-v1-5',
            'stabilityai/sd-turbo',
            'stabilityai/stable-diffusion-2-1',
            'stable-diffusion-v1-5/stable-diffusion-v1-5',
            'SG161222/Realistic_Vision_V5.1_noVAE'
        ]
    else:
        candidates = models

    print('\nProbing models against HF Router (this may take a moment)...')
    accessible = []
    for i, m in enumerate(candidates, start=1):
        print(f'[{i}/{len(candidates)}] Probing {m} ...', end=' ', flush=True)
        status, ctype, body = probe_router(token, m, timeout=15.0)
        if status == 200:
            print('OK (200)')
            accessible.append((m, status, ctype))
        elif status is None:
            print('ERROR:', body)
        else:
            print(status, ctype)

    print('\nAccessible models summary:')
    if accessible:
        for m, s, c in accessible:
            print('-', m, s, c)
    else:
        print('No models responded with 200. Check token permissions or enable inference for the model(s).')

    return 0


if __name__ == '__main__':
    sys.exit(main())
