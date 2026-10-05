# Austrian: the fin is red-white-red with a single red arrow; the source sheet also has a grey arrow, which is removed here.
import os, numpy as np
from PIL import Image, ImageFilter
OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'liveries') + '/'
p = OUT + 'OS-fin.jpg'; a = np.asarray(Image.open(p).convert('RGB')).astype(np.float32)
lum = a.mean(axis=2); chroma = a.max(axis=2) - a.min(axis=2)
grey = (chroma < 30) & (lum > 60) & (lum < 225)                      # the grey arrow (and its anti-aliased rim); red and white are untouched
grey = np.asarray(Image.fromarray((grey * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5))) > 0
grey &= (chroma < 60)                                                 # grow into the soft edge, but never into red
white = np.median(a[(lum > 235) & (chroma < 20)].reshape(-1, 3), axis=0)
a[grey] = white
Image.fromarray(a.clip(0, 255).astype(np.uint8)).save(p, quality=92, subsampling=0); print('grey arrow removed:', int(grey.sum()), 'px')
