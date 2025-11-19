"""Image generation helper using hosted inference APIs.

This module prefers Hugging Face Inference API when `HF_API_KEY` is set.
It sends the prompt and returns raw image bytes (PNG) to the caller.
"""
import os
import logging
import base64
import httpx
from typing import Optional

logger = logging.getLogger(__name__)

# Default model to use on Hugging Face (text-to-image)
DEFAULT_HF_MODEL = os.environ.get(
    "HF_IMAGE_MODEL",
    "stabilityai/stable-diffusion-2-1"
)


async def generate_image_hf(
    prompt: str,
    negative_prompt: Optional[str] = None,
    width: int = 512,
    height: int = 512,
    steps: int = 20,
) -> bytes:
    """Generate image via Hugging Face Inference API. Returns raw PNG bytes."""
    hf_key = os.environ.get("HF_API_KEY")
    if not hf_key:
        raise RuntimeError("Hugging Face API key not configured (HF_API_KEY)")

    model = DEFAULT_HF_MODEL
    # Hugging Face now recommends using the router endpoint.
    url = "https://router.huggingface.co/hf-inference"
    headers = {
        "Authorization": f"Bearer {hf_key}",
        "Accept": "image/png",
    }

    # Router endpoint expects a JSON body including the target model
    payload = {
        "model": model,
        "inputs": prompt,
        "options": {"wait_for_model": True},
        "parameters": {
            "width": width,
            "height": height,
            "num_inference_steps": steps,
        },
    }
    if negative_prompt:
        payload["parameters"]["negative_prompt"] = negative_prompt

    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.post(url, headers=headers, json=payload)
        if resp.status_code != 200:
            # Try to read any returned text for debugging
            try:
                text = await resp.aread()
            except Exception:
                text = await resp.text()
            logger.error(
                "HF image generation failed: %s %s",
                resp.status_code,
                text,
            )
            # raise with details for caller to inspect
            err = RuntimeError(f"Image generation failed: {resp.status_code} - {text}")
            setattr(err, "status_code", resp.status_code)
            raise err

        # Successful router responses for image models return raw bytes
        return resp.content


async def generate_image_openai(
    prompt: str,
    width: int = 512,
    height: int = 512,
) -> bytes:
    """Generate an image via OpenAI Images API and return raw PNG bytes.

    This function expects `OPENAI_API_KEY` to be set in the environment.
    """
    openai_key = os.environ.get("OPENAI_API_KEY")
    if not openai_key:
        raise RuntimeError("OpenAI API key not configured (OPENAI_API_KEY)")

    url = "https://api.openai.com/v1/images/generations"
    headers = {"Authorization": f"Bearer {openai_key}", "Content-Type": "application/json"}
    size = f"{width}x{height}"
    payload = {"prompt": prompt, "n": 1, "size": size}

    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(url, headers=headers, json=payload)
        if resp.status_code != 200:
            try:
                txt = await resp.aread()
            except Exception:
                txt = await resp.text()
            logger.error("OpenAI image generation failed: %s %s", resp.status_code, txt)
            raise RuntimeError(f"OpenAI image generation failed: {resp.status_code} - {txt}")

        j = resp.json()
        # Expecting base64-encoded image in j['data'][0]['b64_json']
        data = j.get("data")
        if not data or not isinstance(data, list):
            raise RuntimeError("OpenAI image response missing data")
        b64 = data[0].get("b64_json") or data[0].get("b64")
        if not b64:
            raise RuntimeError("OpenAI image response missing base64 payload")

        return base64.b64decode(b64)


async def generate_image(
    prompt: str,
    negative_prompt: Optional[str] = None,
    width: int = 512,
    height: int = 512,
    steps: int = 20,
) -> bytes:
    """Provider selection for image generation. Currently only HF supported."""
    # Try HF router first (preferred). If HF returns 404/403, attempt OpenAI images as fallback.
    try:
        return await generate_image_hf(
            prompt,
            negative_prompt=negative_prompt,
            width=width,
            height=height,
            steps=steps,
        )
    except Exception as e:
        logger.warning("HF image generation error, falling back if possible: %s", e)
        status = getattr(e, "status_code", None)
        # Only attempt fallback on authorization/not-found type errors or general failures
        try:
            return await generate_image_openai(prompt, width=width, height=height)
        except Exception as e2:
            logger.exception("OpenAI fallback also failed: %s", e2)
            # raise the original HF error if HF had one, else the OpenAI error
            if status:
                raise e
            raise
