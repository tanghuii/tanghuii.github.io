# Xiamen Air: fuselage drawn from the livery geometry (the photo-mapped texture mixed blue and white under the wing).
# White upper body; from the nose a light-blue band over a deeper blue and navy belly; behind the wing a large blue
# sweep rises to just below the windows and runs back down to the belly before the tail. The fin texture is kept.
import os, numpy as np
from PIL import Image
OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'liveries') + '/'
WHITE = np.array([248, 249, 251], np.float32); LIGHT = np.array([96, 188, 222], np.float32); BLUE = np.array([24, 139, 202], np.float32); NAVY = np.array([10, 52, 96], np.float32)
cw, ch, SS = 2048, 512, 3
U = (np.arange(cw * SS) + 0.5) / (cw * SS); V = (np.arange(ch) + 0.5) / ch; Ug, Vg = np.meshgrid(U, V); Vm = np.where(Vg <= 0.5, Vg, 1 - Vg)   # 0 crown … 0.5 belly
sm = lambda t: (lambda c: c * c * (3 - 2 * c))(np.clip(t, 0, 1))
rise = sm((Ug - 0.47) / 0.1)          # 0 ahead of the wing → 1 behind it
fall = sm((Ug - 0.74) / 0.16)         # the sweep runs back down to the belly before the tail
top = 0.37 - 0.12 * rise + (0.5 - 0.25) * fall * rise      # upper edge of the coloured lower body
top = np.where(Ug < 0.02, 0.5, top)
navy_top = 0.455 - 0.035 * rise + 0.08 * fall               # navy belly under the blue
img = np.tile(WHITE, (ch, cw * SS, 1))
blue = Vm >= top; img[blue] = BLUE
front = (Ug < 0.52)                                          # ahead of the wing: light-blue band with a thin white line under it
lb = blue & front & (Vm < top + 0.045); img[lb] = LIGHT
wl = blue & front & (Vm >= top + 0.045) & (Vm < top + 0.052); img[wl] = WHITE
img[(Vm >= navy_top) & blue] = NAVY
img = img.reshape(ch, cw, SS, 3).mean(axis=2)
Image.fromarray(img.clip(0, 255).astype(np.uint8)).save(OUT + 'MF.jpg', quality=92, subsampling=0)
print('MF fuselage drawn')
