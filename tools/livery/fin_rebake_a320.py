# Re-bake only the fin of A320-sheet liveries (legoboyvdlp 4k unwrap): corrected corners that reach the true leading edge,
# orientation chosen to match the current fin, and the sheet's rudder-hinge / panel lines removed.
import os, tempfile
SRC = lambda n: os.path.join(os.environ.get('LIVERY_SRC', os.path.join(os.path.dirname(__file__), 'src')), n)   # reference photos (not committed)
TMP = lambda n: os.path.join(tempfile.gettempdir(), n)
import sys, numpy as np
from PIL import Image, ImageFilter
OUT=__import__('os').path.join(__import__('os').path.dirname(__file__), '..', '..', 'liveries') + '/'
L={'rootLE':(0.9614,0.4325),'rootTE':(0.8042,0.4313),'tipLE':(0.8145,0.5968),'tipTE':(0.7644,0.5968)}
R={'rootLE':(0.7854,0.6344),'rootTE':(0.9414,0.6356),'tipLE':(0.9292,0.4732),'tipTE':(0.9817,0.4728)}
TW=TH=512
def sample(a,X,Y):
    h,w,_=a.shape; x=np.clip(X*w-0.5,0,w-1); y=np.clip(Y*h-0.5,0,h-1); x0=np.floor(x).astype(int); y0=np.floor(y).astype(int); x1=np.minimum(x0+1,w-1); y1=np.minimum(y0+1,h-1); fx=(x-x0)[...,None]; fy=(y-y0)[...,None]
    return a[y0,x0]*(1-fx)*(1-fy)+a[y0,x1]*fx*(1-fy)+a[y1,x0]*(1-fx)*fy+a[y1,x1]*fx*fy
def warp(a,q,flip):
    if flip: q={'rootLE':q['tipLE'],'rootTE':q['tipTE'],'tipLE':q['rootLE'],'tipTE':q['rootTE']}
    s=(np.arange(TW)+0.5)/TW; t=(np.arange(TH)+0.5)/TH; S,T=np.meshgrid(s,t)
    le=np.array(q['tipLE'])*(1-T[...,None])+np.array(q['rootLE'])*T[...,None]; te=np.array(q['tipTE'])*(1-T[...,None])+np.array(q['rootTE'])*T[...,None]
    p=le+(te-le)*S[...,None]; return sample(a,p[...,0],p[...,1])
def clean(f):
    """thin lines that are only a darker shade of what surrounds them (hinge line, panel lines) take the local median"""
    img=Image.fromarray(f.clip(0,255).astype(np.uint8)); med=np.asarray(img.filter(ImageFilter.MedianFilter(13))).astype(np.float32)
    lum=f.mean(axis=2); ml=med.mean(axis=2); ratio=(f+4)/(med+4); spread=ratio.max(axis=2)-ratio.min(axis=2)
    chroma=f.max(axis=2)-f.min(axis=2)
    m=(lum<ml-10)&((spread<0.35)|((chroma<60)&(lum<110)&(lum<ml-25)))   # a darker shade of the surroundings, or a dark neutral line
    m=np.asarray(Image.fromarray((m*255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3)))>0
    f=f.copy(); f[m]=med[m]; return f
def edge_fill(f,src_bg):
    """the root leading-edge corner reaches past the root fillet onto the sheet background: give it the fin's background colour"""
    q=(f//16).reshape(-1,3).astype(int); keys,cnt=np.unique(q,axis=0,return_counts=True); bg=keys[cnt.argmax()]*16+8
    if np.linalg.norm(bg-src_bg)<20: return f
    s=(np.arange(TW)+0.5)/TW; t=(np.arange(TH)+0.5)/TH; S,T=np.meshgrid(s,t)
    corner=(T>0.55)&(S<0.42*(T-0.55)/0.45)   # triangle at the root leading edge only
    d=np.linalg.norm(f-src_bg,axis=2); f=f.copy(); m=corner&(d<30); f[m]=bg; return f
HINGES=[(3478,1808,3211,2438),(3944,1941,3679,2573)]   # rudder hinge lines of the template sheet, in 4096-px sheet coordinates
def unhinge(a):
    """inpaint the hinge line: inside a band along each line, a pixel that differs from two matching samples either side takes their mean"""
    a=a.copy(); h,w,_=a.shape; sc=w/4096
    for x0,y0,x1,y1 in HINGES:
        x0,y0,x1,y1=[v*sc for v in (x0,y0,x1,y1)]; dx,dy=x1-x0,y1-y0; n=np.hypot(dx,dy); ux,uy=dx/n,dy/n; nx,ny=-uy,ux
        X,Y=np.meshgrid(np.arange(int(min(x0,x1))-20,int(max(x0,x1))+21),np.arange(int(min(y0,y1))-30,int(max(y0,y1))+31))
        tt=((X-x0)*ux+(Y-y0)*uy); d=(X-x0)*nx+(Y-y0)*ny; band=(np.abs(d)<=12*sc)&(tt>-40*sc)&(tt<n+40*sc)
        X,Y,d=X[band],Y[band],d[band]
        for side in (-1,1):   # sample beyond the band on each side
            pass
        oL=(-16*sc-d); oR=(16*sc-d)
        L=a[np.clip((Y+ny*oL).round().astype(int),0,h-1),np.clip((X+nx*oL).round().astype(int),0,w-1)]
        R=a[np.clip((Y+ny*oR).round().astype(int),0,h-1),np.clip((X+nx*oR).round().astype(int),0,w-1)]
        P=a[Y,X]; mean=(L+R)/2
        ok=(np.abs(L-R).max(axis=1)<28)&(np.abs(P-mean).max(axis=1)>10)
        a[Y[ok],X[ok]]=mean[ok]
    return a
for key,src in [a.split('=') for a in sys.argv[1:]]:
    a=unhinge(np.asarray(Image.open(src).convert('RGB')).astype(np.float32))
    src_bg=np.median(a[int(0.41*a.shape[0]):int(0.415*a.shape[0]), int(0.745*a.shape[1]):int(0.75*a.shape[1])].reshape(-1,3),axis=0)
    old=np.asarray(Image.open(OUT+key+'-fin.jpg').convert('RGB').resize((1024,512))).astype(np.float32)
    best=None
    for flip in (False,True):
        halves=[edge_fill(clean(warp(a,q,flip)),src_bg) for q in (L,R)]; fin=np.concatenate(halves,axis=1)
        err=np.abs(fin-old).mean()
        if best is None or err<best[0]: best=(err,flip,fin)
    Image.fromarray(best[2].clip(0,255).astype(np.uint8)).save(OUT+key+'-fin.jpg',quality=92,subsampling=0)
    print(key,'flip' if best[1] else 'noflip','diff %.1f'%best[0])
