from PIL import Image
import sys

# Simple background remover: makes near-white and green pixels transparent
# Usage: python remove_bg.py <input> <output>

if len(sys.argv) < 3:
    print('Usage: python remove_bg.py <input> <output>')
    sys.exit(1)

inp = sys.argv[1]
outp = sys.argv[2]

img = Image.open(inp).convert('RGBA')
px = img.load()
width, height = img.size

# heuristics thresholds
WHITE_THR = 240
GREEN_THR = 200

for y in range(height):
    for x in range(width):
        r,g,b,a = px[x,y]
        # skip already transparent
        if a == 0:
            continue
        # white-ish
        if r >= WHITE_THR and g >= WHITE_THR and b >= WHITE_THR:
            px[x,y] = (r,g,b,0)
            continue
        # green-ish (dominant green, low red/blue)
        if g >= GREEN_THR and g > r + 30 and g > b + 30:
            px[x,y] = (r,g,b,0)
            continue

img.save(outp)
print(f'Saved transparent image to {outp}')
