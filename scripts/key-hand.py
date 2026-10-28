# Usage: python3 -I scripts/key-hand.py raw.png out.webp
# Keys out the green, extends the sleeve along the arm so it runs off-screen,
# and prints the fingertip position and arm angle to pass to <PointAt>.
import math, sys
from PIL import Image
import numpy as np

SCALE = 0.75    # work at output size; enough for retina at around 900px wide
EXTEND = 2400   # how far the sleeve continues past the photo, in output px
BLEND = 105     # length of the crossfade from photo to extension
PROFILE = 50    # length of sleeve averaged into the extension's cross-section

src, out = sys.argv[1], sys.argv[2]
raw = Image.open(src).convert('RGB')
raw = raw.resize((round(raw.width * SCALE), round(raw.height * SCALE)), Image.LANCZOS)
a = np.asarray(raw).astype(np.float32)
r, g, b = a[..., 0], a[..., 1], a[..., 2]
spill = g - np.maximum(r, b)
alpha = 1 - np.clip((spill - 25) / 60, 0, 1)
a[..., 1] = np.minimum(g, np.maximum(r, b))
H, W = alpha.shape
# Premultiplied RGBA, so blending soft edges doesn't leave halos.
img = np.dstack([a * alpha[..., None], alpha]).astype(np.float32)

# Arm direction: principal axis of the dark sleeve pixels, pointing away from the hand.
lum = a.mean(axis=2)
ys, xs = np.nonzero((alpha > 0.9) & (lum < 70))
pts = np.stack([xs, ys], 1).astype(np.float64)
c = pts.mean(0)
_, _, vt = np.linalg.svd(pts - c, full_matrices=False)
d = vt[0] if vt[0][1] > 0 else -vt[0]   # along the arm, toward the shoulder
n = np.array([-d[1], d[0]])             # across the arm

# s: distance along the arm, t: distance across it.
gx, gy = np.meshgrid(np.arange(W), np.arange(H))
s_img = (gx - c[0]) * d[0] + (gy - c[1]) * d[1]

# Farthest cross-section that doesn't touch the photo's border.
solid = alpha > 0.5
edge = np.zeros_like(solid)
edge[:, :2] = edge[:, -2:] = edge[:2, :] = edge[-2:, :] = True
s0 = 0.0
for cand in np.arange(0, s_img.max(), 2):
    if ((np.abs(s_img - cand) <= 1.5) & solid & edge).any():
        break
    s0 = cand

# Cross-section profile: average the sleeve over [s0 - PROFILE, s0].
T = int(max(W, H))
ts = np.arange(-T, T + 1)
acc = np.zeros((len(ts), 4), np.float32)
for sv in np.linspace(s0 - PROFILE, s0, 36):
    px = np.rint(c[0] + sv * d[0] + ts * n[0]).astype(int)
    py = np.rint(c[1] + sv * d[1] + ts * n[1]).astype(int)
    ok = (px >= 0) & (px < W) & (py >= 0) & (py < H)
    acc[ok] += img[py[ok], px[ok]]
profile = acc / 36

# Output canvas: the photo plus room for the sleeve down and to the left.
ox = int(math.ceil(EXTEND * max(0, -d[0])))
cw = W + ox + int(math.ceil(EXTEND * max(0, d[0])))
ch = H + int(math.ceil(EXTEND * d[1]))
X, Y = np.meshgrid(np.arange(cw, dtype=np.int32) - ox, np.arange(ch, dtype=np.int32))
s = ((X - c[0]) * d[0] + (Y - c[1]) * d[1]).astype(np.float32)
t = ((X - c[0]) * n[0] + (Y - c[1]) * n[1]).astype(np.float32)

ti = np.clip(np.rint(t).astype(int) + T, 0, len(ts) - 1)
tube = profile[ti]
tube[(s < s0 - BLEND) | (s > s0 + EXTEND)] = 0

inside = (X >= 0) & (X < W) & (Y >= 0) & (Y < H)
photo = np.zeros((ch, cw, 4), np.float32)
photo[inside] = img[Y[inside], X[inside]]

# Fine fabric grain on the extension, so it doesn't look airbrushed next to the photo.
rng = np.random.default_rng(1)
grain = rng.normal(0, 2.2, (ch, cw, 1)).astype(np.float32) * tube[..., 3:4]
tube[..., :3] = np.clip(tube[..., :3] + grain, 0, 255)

w = np.clip((s - (s0 - BLEND)) / BLEND, 0, 1)[..., None]
w = w * w * (3 - 2 * w)  # smoothstep
outp = photo * (1 - w) + tube * w

al = outp[..., 3]
rgb = np.where(al[..., None] > 1e-4, outp[..., :3] / np.maximum(al[..., None], 1e-4), 0)
rgba = np.dstack([rgb, al * 255]).clip(0, 255).astype(np.uint8)
canvas = Image.fromarray(rgba, 'RGBA')
canvas = canvas.crop(canvas.getchannel('A').point(lambda v: 255 if v > 128 else 0).getbbox())

A = np.asarray(canvas.getchannel('A'))
ty, tx = np.nonzero(A > 128)
top = ty.min()
tip = (tx[ty <= top + 2].mean() / canvas.width, (top + 5) / canvas.height)
canvas.save(out, quality=88, method=6)
print('size', canvas.size, 'tip x=%.4f y=%.4f' % tip,
      'armAngle=%.1f' % math.degrees(math.atan2(-d[0], d[1])), 's0', s0)
