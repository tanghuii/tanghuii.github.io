# Lufthansa (2018 livery): replace the rear of the baked A320-sheet fuselage with one clean navy wrap.
# Behind the rear door the whole rear fuselage is navy, round the belly too; the front edge slants forward towards the belly.
# The sheet's tail-cone and stabiliser-fairing pieces mapped onto our loft as stepped blocks, white notches and grey diamonds.
import os, numpy as np
from PIL import Image
OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'liveries') + '/'
a = np.asarray(Image.open(OUT + 'LH.jpg').convert('RGB')).astype(np.float32); h, w, _ = a.shape
NAVY = np.array([10, 29, 79], np.float32); WHITE = np.median(a[int(0.08 * h):int(0.12 * h), int(0.4 * w):int(0.45 * w)].reshape(-1, 3), axis=0)
SS = 4   # supersampling for a smooth edge
U = (np.arange(w * SS) + 0.5) / (w * SS); V = (np.arange(h) + 0.5) / h; Ug, Vg = np.meshgrid(U, V); Vm = np.where(Vg <= 0.5, Vg, 1 - Vg)
edge = 0.835 - 0.085 * (Vm / 0.5)            # u of the front edge at each height: 0.835 at the crown, 0.75 at the belly
cov = (Ug >= edge).reshape(h, w, SS).mean(axis=2)
rear = (np.arange(w) / w) >= 0.70                 # only the rear section is rebuilt
out = a.copy()
# forward of the edge keep windows and markings; only the sheet's leftover navy and grey blocks turn white
lum = a.mean(axis=2); navyish = (a[..., 2] - a[..., 0] > 35) & (lum < 140); greyblk = (np.abs(a - a.mean(axis=2, keepdims=True)).max(axis=2) < 12) & (lum > 170) & (lum < 240)
blocks = (navyish | greyblk) & rear[None, :]
base = a.copy(); base[blocks] = WHITE
mix = base * (1 - cov[..., None]) + NAVY * cov[..., None]
out[:, rear] = mix[:, rear]
Image.fromarray(out.clip(0, 255).astype(np.uint8)).save(OUT + 'LH.jpg', quality=92, subsampling=0)
print('LH rear rebuilt, white', WHITE)
