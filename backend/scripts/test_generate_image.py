#!/usr/bin/env python3
"""
Simple test script to POST JSON to /generate-image and save the PNG.

Usage (from repo root, with venv activated):
  python backend/scripts/test_generate_image.py \
    --prompt "a cat wearing a spacesuit, photorealistic" \
    --output out.png

The script uses `httpx` (already a dependency in the backend). If you prefer
`requests`, you can adapt it accordingly.
"""
import argparse
import os
import sys

try:
    import httpx
except Exception:
    print("httpx is required. Install with: pip install httpx")
    sys.exit(1)


def main():
    p = argparse.ArgumentParser(description="Test /generate-image endpoint and save PNG")
    p.add_argument("--url", default=os.environ.get("API_URL", "http://localhost:8000"),
                   help="Base URL of the backend (default: http://localhost:8000)")
    p.add_argument("--prompt", required=True, help="Text prompt for image generation")
    p.add_argument("--output", default="generated.png", help="Output PNG filename")
    p.add_argument("--timeout", type=int, default=120, help="Timeout seconds for request")

    args = p.parse_args()

    endpoint = args.url.rstrip("/") + "/generate-image"
    payload = {"prompt": args.prompt}

    print(f"POSTing to {endpoint} with prompt (len={len(args.prompt)}):\n  {args.prompt[:200]}")

    try:
        with httpx.Client(timeout=args.timeout) as client:
            resp = client.post(endpoint, json=payload)

        print("HTTP status:", resp.status_code)

        if resp.status_code == 200:
            # Save binary content
            with open(args.output, "wb") as f:
                f.write(resp.content)
            print(f"Saved image to {args.output} ({len(resp.content)} bytes)")
            return 0

        # Print helpful debug info on failures
        content_type = resp.headers.get("Content-Type", "")
        print("Content-Type:", content_type)
        try:
            txt = resp.text
            print("Response body:", txt[:1000])
        except Exception:
            print("Unable to decode response body")

        return 2

    except httpx.RequestError as e:
        print("Request failed:", str(e))
        return 3
    except Exception as e:
        print("Unexpected error:", str(e))
        return 4


if __name__ == "__main__":
    sys.exit(main())
