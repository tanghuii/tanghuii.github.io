# Kunming Airlines: fuselage drawn from the livery (the photo mapping mixed red, white and gold blocks and doubled the windows).
# White forward; a red rear body whose front edge runs from the crown above the wing down and back to the belly near the tail,
# with gold ribbons sweeping along that edge. The fin texture (golden peacock) is kept.
import os, numpy as np
from PIL import Image
OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'liveries') + '/'
WHITE = np.array([248, 249, 251], np.float32); BELLY = np.array([233, 235, 238], np.float32)
RED = np.array([206, 28, 36], np.float32); GOLD = np.array([224, 178, 92], np.float32)
cw, ch, SS = 2048, 512, 3
U = (np.arange(cw * SS) + 0.5) / (cw * SS); V = (np.arange(ch) + 0.5) / ch; Ug, Vg = np.meshgrid(U, V); Vm = np.where(Vg <= 0.5, Vg, 1 - Vg)
img = np.tile(WHITE, (ch, cw * SS, 1)); img[Vm > 0.42] = BELLY
e = 0.40 + (0.80 - 0.40) * (Vm / 0.5) ** 0.85          # front edge of the red: crown above the wing → belly near the tail
d = Ug - e
for lo, hi, col in ((-0.050, -0.040, GOLD), (-0.030, -0.016, GOLD), (-0.010, -0.004, GOLD)):   # gold ribbons ahead of the red
    img[(d >= lo) & (d < hi)] = col
img[d >= 0] = RED
img[(d >= 0.012) & (d < 0.02)] = GOLD                   # one gold ribbon inside the red
img = img.reshape(ch, cw, SS, 3).mean(axis=2)
Image.fromarray(img.clip(0, 255).astype(np.uint8)).save(OUT + 'KY.jpg', quality=92, subsampling=0); print('KY drawn')
