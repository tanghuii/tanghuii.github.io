# Loong Air: fuselage rebuilt from the livery (the photo mapping left a flat-blue block, white crown blocks, a stray red
# patch from the wing and the stabiliser outline at the tail). Sky blue all over; white upper body behind the cloud-dragon
# art, closed at the back by a red swoosh that runs from the crown down and forward to the wing root; sky blue again behind.
# The cloud-dragon art near the nose is kept from the old texture (window row cleaned, windows are painted by the model).
import os, shutil, numpy as np
from PIL import Image
OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'liveries') + '/'
src = OUT + 'GJ.jpg'; bak = os.path.join(os.path.dirname(__file__), 'src', 'GJ.photo.jpg')
if os.path.exists(bak): old = np.asarray(Image.open(bak).convert('RGB')).astype(np.float32)   # rerun safely from the original photo bake
else: old = np.asarray(Image.open(src).convert('RGB')).astype(np.float32); os.makedirs(os.path.dirname(bak), exist_ok=True); shutil.copy(src, bak)
BLUE = np.array([151, 222, 246], np.float32); WHITE = np.array([248, 250, 252], np.float32); RED = np.array([196, 42, 34], np.float32)
cw, ch, SS = 2048, 512, 3
U = (np.arange(cw * SS) + 0.5) / (cw * SS); V = (np.arange(ch) + 0.5) / ch; Ug, Vg = np.meshgrid(U, V); Vm = np.where(Vg <= 0.5, Vg, 1 - Vg)
img = np.tile(BLUE, (ch, cw * SS, 1))
s = 0.66 - (0.66 - 0.43) * (Vm / 0.5) ** 0.9            # swoosh: crown at u 0.66 down and forward to the wing root
img[(Ug > 0.27) & (Ug < s) & (Vm < 0.36)] = WHITE        # white upper body between the art and the swoosh
d = Ug - s
img[(d >= 0) & (d < 0.028)] = RED
img[(d >= 0.028) & (d < 0.034)] = WHITE                  # thin white line behind the swoosh
img = img.reshape(ch, cw, SS, 3).mean(axis=2)
# cloud-dragon art from the old texture: u 0.08 … 0.27, keep only near-white art pixels
x0, x1 = int(0.08 * cw), int(0.27 * cw); part = old[:, x0:x1]
art = (part.min(axis=2) > 215)
vrow = np.abs(((np.arange(ch) + 0.5) / ch) - 0.205) < 0.02; vrow |= np.abs(((np.arange(ch) + 0.5) / ch) - 0.795) < 0.02
art[vrow] = False                                        # drop the photo's window row
img[:, x0:x1][art] = WHITE
Image.fromarray(img.clip(0, 255).astype(np.uint8)).save(src, quality=92, subsampling=0); print('GJ rebuilt')
