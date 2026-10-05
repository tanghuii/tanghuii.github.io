# Shenzhen Airlines (ZH): fin from the A320neo tail photo (gold logo keyed onto flat red), fuselage drawn from the livery geometry
import os, tempfile
SRC = lambda n: os.path.join(os.environ.get('LIVERY_SRC', os.path.join(os.path.dirname(__file__), 'src')), n)   # reference photos (not committed)
TMP = lambda n: os.path.join(tempfile.gettempdir(), n)
import numpy as np
from PIL import Image
OUT=__import__('os').path.join(__import__('os').path.dirname(__file__), '..', '..', 'liveries') + '/'
RED=np.array([214,22,32],np.float32); GOLD=np.array([222,176,88],np.float32); MAROON=np.array([128,18,32],np.float32)
WHITE=np.array([246,247,249],np.float32); BELLY=np.array([228,230,234],np.float32)
ph=np.asarray(Image.open(SRC('zh-a320neo.webp')).convert('RGB')).astype(np.float32); H,W,_=ph.shape
def sample(a,X,Y):
    h,w,_=a.shape; x=np.clip(X-0.5,0,w-1); y=np.clip(Y-0.5,0,h-1); x0=np.floor(x).astype(int); y0=np.floor(y).astype(int); x1=np.minimum(x0+1,w-1); y1=np.minimum(y0+1,h-1); fx=(x-x0)[...,None]; fy=(y-y0)[...,None]
    return a[y0,x0]*(1-fx)*(1-fy)+a[y0,x1]*fx*(1-fy)+a[y1,x0]*(1-fx)*fy+a[y1,x1]*fx*fy
# fin corners in photo pixels: tip LE / tip TE / root LE / root TE (root along the pitched fuselage axis)
tipLE,tipTE,rootLE,rootTE=np.array([1836,540.]),np.array([1928,553.]),np.array([1528,752.]),np.array([1792,836.])
TW=TH=512; s=(np.arange(TW)+0.5)/TW; t=(np.arange(TH)+0.5)/TH; S,T=np.meshgrid(s,t)
le=tipLE*(1-T[...,None])+rootLE*T[...,None]; te=tipTE*(1-T[...,None])+rootTE*T[...,None]; p=le+(te-le)*S[...,None]
src=sample(ph,p[...,0],p[...,1]); R,G,B=src[...,0],src[...,1],src[...,2]
gold=np.clip((G-60)/90,0,1)*np.clip((G-B-25)/45,0,1)*np.clip((R-G+10)/40,0,1)   # gold, not grey sky (G≈B) and not red (G≈0)
fin=RED*(1-gold[...,None])+GOLD*gold[...,None]
finI=Image.fromarray(fin.clip(0,255).astype(np.uint8)); o=Image.new('RGB',(1024,512)); o.paste(finI,(0,0)); o.paste(finI,(512,0)); o.save(OUT+'ZH-fin.jpg',quality=92,subsampling=0)
finI.save(TMP('zh-fin-new.png'))
# fuselage: white forward, then a sweep that runs from the crown just behind the titles down to the belly behind the wing:
# gold, dark red, gold, and the rear fuselage red all round
cw,ch=2048,512; U=(np.arange(cw)+0.5)/cw; V=(np.arange(ch)+0.5)/ch; Ug,Vg=np.meshgrid(U,V); Vm=np.where(Vg<=0.5,Vg,1-Vg)
uc,ub=0.485,0.745; b=uc+(ub-uc)*(Vm/0.5)**0.85        # front edge of the sweep at each height round the body
fus=np.tile(WHITE,(ch,cw,1)); fus[Vm>0.42]=BELLY
d=Ug-b
for lo,hi,col in ((0.0,0.011,GOLD),(0.011,0.025,MAROON),(0.025,0.034,GOLD)): fus[(d>=lo)&(d<hi)]=col
fus[d>=0.034]=RED
Image.fromarray(fus.astype(np.uint8)).save(OUT+'ZH.jpg',quality=92,subsampling=0)
Image.fromarray(fus.astype(np.uint8)).resize((1024,256)).save(TMP('zh-fus-new.png')); print('done')
