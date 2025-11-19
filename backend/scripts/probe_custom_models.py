#!/usr/bin/env python3
"""
Probe a custom list of Hugging Face text-to-image models against the
HF Router endpoint and pick the first accessible model for your API key.

Usage:
  .venv\Scripts\python.exe backend\scripts\probe_custom_models.py

The script reads HF_API_KEY from environment or backend/.env. On success it
writes HF_IMAGE_MODEL=<model_id> into backend/.env.
"""
import os
import sys
import time
import httpx

REPO_ROOT = os.path.dirname(os.path.dirname(__file__))
ENV_PATH = os.path.join(REPO_ROOT, '.env')

MODELS = [
    "eigen-ai-labs/eigen-banana-qwen-image-edit",
    "Phr00t/Qwen-Image-Edit-Rapid-AIO",
    "black-forest-labs/FLUX.1-dev",
    "Photoroom/prx-1024-t2i-beta",
    "lightx2v/Qwen-Image-Lightning",
    "nunchaku-tech/nunchaku-qwen-image-edit-2509",
    "Qwen/Qwen-Image",
    "black-forest-labs/FLUX.1-schnell",
    "stabilityai/stable-diffusion-xl-base-1.0",
    "Phil2Sat/Qwen-Image-Edit-Rapid-AIO-GGUF",
    "briaai/FIBO",
    "wikeeyang/Magic-Wan-Image-V2",
    "stable-diffusion-v1-5/stable-diffusion-v1-5",
    "tencent/HunyuanImage-3.0",
    "city96/FLUX.1-dev-gguf",
    "stabilityai/stable-diffusion-3.5-large",
    "city96/Qwen-Image-gguf",
    "lodestones/Chroma1-HD",
    "rzgar/Qwen-Image-Edit-smoothify",
    "black-forest-labs/FLUX.1-Krea-dev",
    "Daverrrr75/Qwen-Remove-Clothing",
    "FractalAIResearch/Kalaido-qwen-image-lora",
    "renderartist/technically-color-wan",
    "h94/IP-Adapter",
    "UnfilteredAI/NSFW-GEN-ANIME",
    "xinsir/controlnet-union-sdxl-1.0",
    "alimama-creative/FLUX.1-Turbo-Alpha",
    "stabilityai/stable-diffusion-3.5-medium",
]


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


def probe_model_router(token, model_id, timeout=20.0):
    url = 'https://router.huggingface.co/hf-inference'
    headers = {'Authorization': f'Bearer {token}', 'Accept': '*/*'}
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

    print('Probing provided models for router availability...')

    for i, m in enumerate(MODELS, start=1):
        print(f'[{i}/{len(MODELS)}] Probing {m} ...', end=' ', flush=True)
        status, ctype, body = probe_model_router(token, m, timeout=15.0)
        if status == 200:
            print('OK (200)')
            write_env_model(m)
            return 0
        elif status is None:
            print('ERROR:', body)
        else:
            print(status, ctype)
        time.sleep(0.4)

    print('\nNo models from the provided list responded with 200. Consider trying an alternate provider.')
    return 1


if __name__ == '__main__':
    sys.exit(main())
