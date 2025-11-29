"""Make white (or near-white) background of luminologo.png transparent.

This script overwrites `backend/luminologo.png` with a transparent-background
version and copies the result to `frontend/public/assets/luminologo.png`.

Adjust `THRESHOLD` if the background isn't fully white.
"""
from PIL import Image
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
backend_logo = ROOT / "luminologo.png"
frontend_logo = ROOT.parent / "frontend" / "public" / "assets" / "luminologo.png"

if not backend_logo.exists():
    raise SystemExit(f"Logo not found: {backend_logo}")

img = Image.open(backend_logo).convert("RGBA")
px = img.load()
width, height = img.size

# Threshold for considering a pixel 'white' (0-255). Increase if background is off-white.
THRESHOLD = 240

for y in range(height):
    for x in range(width):
        r, g, b, a = px[x, y]
        if r >= THRESHOLD and g >= THRESHOLD and b >= THRESHOLD:
            px[x, y] = (r, g, b, 0)

# Save updated backend logo (overwrite)
img.save(backend_logo)

# Ensure frontend assets dir exists
frontend_logo.parent.mkdir(parents=True, exist_ok=True)
img.save(frontend_logo)

print("Saved transparent logo to backend and frontend assets.")
