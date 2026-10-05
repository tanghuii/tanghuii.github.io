# Fill pale strips along the leading / trailing edge of fin textures with the fin's own colour.
# Baked fins sometimes catch a few columns of sheet background (white or grey) beyond the painted fin.
# Only fins whose dominant colour is not pale are touched, so white fins and logos near an edge are left alone.
# Check the result: run it on the fins that need it (used for LH), not blindly on all.
import os, sys, numpy as np
from PIL import Image
OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'liveries') + '/'
for key in sys.argv[1:]:
    p = OUT + key + '-fin.jpg'; a = np.asarray(Image.open(p).convert('RGB')).astype(np.float32); H, W, _ = a.shape; changed = []
    for x0 in (0, W // 2):
        half = a[:, x0:x0 + W // 2]
        q = (half // 16).reshape(-1, 3).astype(int); keys, cnt = np.unique(q, axis=0, return_counts=True); bg = keys[cnt.argmax()] * 16 + 8
        if bg.mean() > 150 or bg.max() - bg.min() < 30 and bg.mean() > 110: continue   # pale or grey fin: nothing to do
        # whole pale columns touching the edge are sheet background (a row-by-row test also catches real white logo parts, so it is not used)
        pale = lambda col: (col.mean() > 140) and (col.max(axis=1) - col.min(axis=1)).mean() < 40
        for rng in (range(0, 60), range(W // 2 - 1, W // 2 - 61, -1)):
            n = 0
            for c in rng:
                if not pale(half[int(0.1 * H):int(0.9 * H), c]): break
                n += 1
            if n: half[:, list(rng)[:n + 2]] = bg; changed.append((x0, n))
        a[:, x0:x0 + W // 2] = half
    if changed: Image.fromarray(a.clip(0, 255).astype(np.uint8)).save(p, quality=92, subsampling=0)
    print(key, changed or 'unchanged')
