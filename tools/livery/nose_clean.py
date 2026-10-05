# Clean the nose of baked fuselage textures: the source photos / FG sheets carry their own radome shading and cockpit
# windows, which land in the wrong place on our loft and show as grey or black patches. The model paints its own cockpit
# band over u < ~0.1, so everything forward of u0 is replaced by the body colour just aft of it (per-row median).
import os, tempfile
SRC = lambda n: os.path.join(os.environ.get('LIVERY_SRC', os.path.join(os.path.dirname(__file__), 'src')), n)   # reference photos (not committed)
TMP = lambda n: os.path.join(tempfile.gettempdir(), n)
import sys, numpy as np
from PIL import Image
SKIP = {'BA', 'FR'}   # legit nose designs (Speedmarque, Ryanair belly taper) stay
u0 = 0.10
for k in sys.argv[1:]:
    if k in SKIP: continue
    p = f'liveries/{k}.jpg'; a = np.asarray(Image.open(p).convert('RGB')).astype(np.float32); h, w, _ = a.shape
    x0 = int(u0 * w); ref = np.median(a[:, x0:x0 + int(0.03 * w)], axis=1)   # per-row body colour just aft of the nose
    a[:, :x0] = ref[:, None, :]
    if k == 'ZH':   # the rear underside is red on the real aircraft; the photo showed tarmac and the engine there
        a[int(0.27 * h):int(0.73 * h), int(0.52 * w):] = np.array([205, 30, 36], dtype=np.float32)
    Image.fromarray(a.clip(0, 255).astype(np.uint8)).save(p, quality=92)
    print('fixed', k)
