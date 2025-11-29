"""Generate favicon PNGs and ICO from backend/luminologo.png

Creates files in `frontend/public/assets`:
 - favicon-16x16.png
 - favicon-32x32.png
 - favicon-48x48.png
 - apple-touch-icon.png (180x180)
 - favicon.ico (contains 16/32/48)

Run with the project's venv Python.
"""
import os
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
src = ROOT / "luminologo.png"
out_dir = ROOT.parent / "frontend" / "public" / "assets"
out_dir.mkdir(parents=True, exist_ok=True)

if not src.exists():
    raise SystemExit(f"Source logo not found: {src}")

img = Image.open(src).convert("RGBA")

sizes = [16, 32, 48, 192, 512]
for s in sizes:
    out = out_dir / f"favicon-{s}x{s}.png"
    print(f"Generating {out}")
    img.resize((s, s), Image.LANCZOS).save(out, format="PNG")

# Apple touch icon
app_icon = out_dir / "apple-touch-icon.png"
img.resize((180, 180), Image.LANCZOS).save(app_icon, format="PNG")
print(f"Generating {app_icon}")

# Generate .ico containing multiple sizes (commonly 16/32/48)
ico_path = out_dir / "favicon.ico"
icon_sizes = [(16,16),(32,32),(48,48)]
img.save(ico_path, format="ICO", sizes=icon_sizes)
print(f"Generating {ico_path}")

print("Done.")
