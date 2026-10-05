# Air Guilin fuselage texture: the titles come straight from the official logo panel (its exact typefaces), recoloured to the livery blue
import os, tempfile
SRC = lambda n: os.path.join(os.environ.get('LIVERY_SRC', os.path.join(os.path.dirname(__file__), 'src')), n)   # reference photos (not committed)
TMP = lambda n: os.path.join(tempfile.gettempdir(), n)
import numpy as np
from PIL import Image
OUT=__import__('os').path.join(__import__('os').path.dirname(__file__), '..', '..', 'liveries') + '/'
panel=np.asarray(Image.open(SRC('gt-logo.jpg')).convert('RGB')).astype(np.float32)
BLUE=np.array([28,70,180],dtype=np.float32); WHITE=np.array([246,247,249],dtype=np.float32)
def keyed_text(y0,y1,x0,x1):
    """white glyphs on the panel's blue → (rgb strip in livery blue on white, alpha), trimmed to the glyph box"""
    c=panel[y0:y1,x0:x1]; lum=c.mean(axis=2); sat=c.max(axis=2)-c.min(axis=2)
    a=np.clip((lum-110)/90,0,1)*(sat<90); ys,xs=np.where(a>0.3); a=a[ys.min():ys.max()+1, xs.min():xs.max()+1]
    return a
def keyed_logo(y0,y1,x0,x1):
    c=panel[y0:y1,x0:x1]; lb=np.array([15,39,111],dtype=np.float32); d=np.linalg.norm(c-lb,axis=2); a=np.clip((d-25)/40,0,1)
    rgb=np.clip((c-lb*(1-a[...,None]))/np.maximum(a[...,None],1e-3),0,255); ys,xs=np.where(a>0.3); sl=(slice(ys.min(),ys.max()+1),slice(xs.min(),xs.max()+1))
    return rgb[sl], a[sl]
zh=keyed_text(1380,1660,60,1140); en=keyed_text(1650,1800,150,1050); lrgb,la=keyed_logo(860,1340,30,1130)
cw,ch=2048,512; L,R=37.6,1.98; k=(2*np.pi*R/ch)/(L/cw)   # texel aspect (A320 proportions): stretch widths by k
fus=np.tile(WHITE,(ch,cw,1)); fus[int(0.42*ch):int(0.58*ch)]=np.array([205,208,214],dtype=np.float32)
def place(img_a, rgb, h_tex, x, v_top, flip):
    """paste an alpha strip (optionally with its own rgb, else livery blue) at texture column x, top at v_top; flip = other side (rotated 180°)"""
    h=int(h_tex); w=int(img_a.shape[1]*h/img_a.shape[0]*k)
    A=np.asarray(Image.fromarray((img_a*255).astype(np.uint8)).resize((w,h),Image.LANCZOS)).astype(np.float32)/255
    C=np.tile(BLUE,(h,w,1)) if rgb is None else np.asarray(Image.fromarray(rgb.astype(np.uint8)).resize((w,h),Image.LANCZOS)).astype(np.float32)
    y=int(v_top*ch)
    if flip: A=A[::-1,::-1]; C=C[::-1,::-1]; y=ch-y-h
    fus[y:y+h,x:x+w]=fus[y:y+h,x:x+w]*(1-A[...,None])+C*A[...,None]; return x+w
# layout along the cabin, above the windows: [logo] 桂林航空 Air Guilin, cap height ≈ 0.05 of the circumference
vTop=0.104; hz=0.06*ch; gap=int(0.012*cw)
for flip in (False,True):   # the mark is the full logo graphic, about twice the character height as on the real aircraft
    x=int(0.125*cw); x=place(la,lrgb,hz*1.9,x,vTop-0.9*hz/2/ch,flip)+gap; x=place(zh,None,hz,x,vTop,flip)+gap; place(en,None,hz*0.86,x,vTop+0.004,flip)
Image.fromarray(fus.clip(0,255).astype(np.uint8)).save(OUT+'GT.jpg',quality=92,subsampling=0)
Image.fromarray(fus[int(0.08*ch):int(0.2*ch),int(0.12*cw):int(0.5*cw)].clip(0,255).astype(np.uint8)).save(TMP('gt-title.png')); print('fuselage done')
