# China Express (G5): fin + fuselage textures from the official logo artwork and the livery photos
import os, tempfile
SRC = lambda n: os.path.join(os.environ.get('LIVERY_SRC', os.path.join(os.path.dirname(__file__), 'src')), n)   # reference photos (not committed)
TMP = lambda n: os.path.join(tempfile.gettempdir(), n)
import numpy as np
from PIL import Image
OUT=__import__('os').path.join(__import__('os').path.dirname(__file__), '..', '..', 'liveries') + '/'
DEEP=np.array([0,51,166],np.float32); CAP=np.array([80,192,232],np.float32); WHITE=np.array([246,247,249],np.float32); GREY=np.array([205,208,214],np.float32)
TITLE=np.array([16,66,170],np.float32)
logo=np.asarray(Image.open(SRC('g5-logo.png')).convert('RGB')).astype(np.float32)
# blue-on-white artwork → alpha (blueness)
a=np.clip((255-logo.mean(axis=2))/150,0,1)
cols=(a>0.3).any(axis=0); xs=np.where(cols)[0]
# split dove | text at the widest horizontal gap
gaps=[(xs[i+1]-xs[i],xs[i],xs[i+1]) for i in range(len(xs)-1)]; g=max(gaps); xsplit=(g[1]+g[2])//2
def box(m):
    ys,xx=np.where(m>0.3); return ys.min(),ys.max()+1,xx.min(),xx.max()+1
dove=a[:, :xsplit]; d0,d1,dx0,dx1=box(dove); dove=dove[d0:d1,dx0:dx1]
text=a[:, xsplit:]; rows=(text>0.3).any(axis=1); ys=np.where(rows)[0]; rg=[(ys[i+1]-ys[i],ys[i],ys[i+1]) for i in range(len(ys)-1)]; r=max(rg); ysplit=(r[1]+r[2])//2
zh=text[:ysplit]; z0,z1,zx0,zx1=box(zh); zh=zh[z0:z1,zx0:zx1]
en=text[ysplit:]; e0,e1,ex0,ex1=box(en); en=en[e0:e1,ex0:ex1]
print('dove',dove.shape,'zh',zh.shape,'en',en.shape)
def resize_a(A,w,h): return np.asarray(Image.fromarray((A*255).astype(np.uint8)).resize((max(1,w),max(1,h)),Image.LANCZOS)).astype(np.float32)/255
# ── fin: deep blue, light-blue cap along the top, white dove in the middle (facing the leading edge, left) ──
TW=TH=512; s=(np.arange(TW)+0.5)/TW; t=(np.arange(TH)+0.5)/TH; Sg,Tg=np.meshgrid(s,t)
fin=np.tile(DEEP,(TH,TW,1))
cap=Tg < 0.11+0.05*Sg   # the cap is a little deeper towards the trailing edge, as in the photo
fin[cap]=CAP
dh=int(0.36*TH); dw=int(dh*dove.shape[1]/dove.shape[0]); D=resize_a(dove,dw,dh); y=int(0.37*TH); x=int(0.52*TW-dw/2)
fin[y:y+dh,x:x+dw]=fin[y:y+dh,x:x+dw]*(1-D[...,None])+WHITE*D[...,None]
finI=Image.fromarray(fin.clip(0,255).astype(np.uint8)); out=Image.new('RGB',(1024,512)); out.paste(finI,(0,0)); out.paste(finI,(512,0)); out.save(OUT+'G5-fin.jpg',quality=92,subsampling=0)
# ── fuselage: white, grey belly, blue tail sweep with light-blue and white waves; titles from the artwork ──
cw,ch=2048,512; L,R=37.6,1.98; k=(2*np.pi*R/ch)/(L/cw)
fus=np.tile(WHITE,(ch,cw,1)); fus[int(0.42*ch):int(0.58*ch)]=GREY
U=(np.arange(cw)+0.5)/cw; V=(np.arange(ch)+0.5)/ch; Ug,Vg=np.meshgrid(U,V); Vm=np.where(Vg<=0.5,Vg,1-Vg)   # distance from the crown, both sides
sm=lambda x: np.clip(x,0,1)**2*(3-2*np.clip(x,0,1))
edge=0.5-0.5*sm((Ug-0.64)/0.33)           # top of the blue: belly behind the wing, crown at the fin root
blue=Vm>=edge; fus[blue]=DEEP
wave1=(Vm>=edge+0.06)&(Vm<edge+0.11)&(Ug>0.66); fus[wave1]=CAP       # light-blue wave inside the blue
wave2=(Vm>=edge+0.035)&(Vm<edge+0.05)&(Ug>0.70); fus[wave2]=WHITE     # thin white wave above it
def place(A,h,x,vtop,flip,col):
    w=int(A.shape[1]*h/A.shape[0]*k); M=resize_a(A,w,h); y=int(vtop*ch)
    if flip: M=M[::-1,::-1]; y=ch-y-h
    fus[y:y+h,x:x+w]=fus[y:y+h,x:x+w]*(1-M[...,None])+col*M[...,None]; return x+w
hz=int(0.06*ch); vTop=0.104
for flip in (False,True):
    x=int(0.15*cw); x=place(zh,hz,x,vTop,flip,TITLE)+int(0.012*cw); place(en,int(hz*0.78),x,vTop+0.007,flip,TITLE)
Image.fromarray(fus.clip(0,255).astype(np.uint8)).save(OUT+'G5.jpg',quality=92,subsampling=0)
Image.fromarray(fus[int(0.07*ch):int(0.2*ch),int(0.13*cw):int(0.5*cw)].clip(0,255).astype(np.uint8)).save(TMP('g5-title.png')); finI.save(TMP('g5-fin.png')); print('done')
