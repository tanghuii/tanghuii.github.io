# Air Guilin fin + plain fuselage textures from the tail photo and the clean logo panel
import os, tempfile
SRC = lambda n: os.path.join(os.environ.get('LIVERY_SRC', os.path.join(os.path.dirname(__file__), 'src')), n)   # reference photos (not committed)
TMP = lambda n: os.path.join(tempfile.gettempdir(), n)
import numpy as np
from PIL import Image
OUT=__import__('os').path.join(__import__('os').path.dirname(__file__), '..', '..', 'liveries') + '/'
photo=np.asarray(Image.open(SRC('gt-tail.jpg')).convert('RGB')).astype(np.float32)
H,W,_=photo.shape
def sample(a,X,Y):
    h,w,_=a.shape; x=np.clip(X*w-0.5,0,w-1); y=np.clip(Y*h-0.5,0,h-1); x0=np.floor(x).astype(int); y0=np.floor(y).astype(int); x1=np.minimum(x0+1,w-1); y1=np.minimum(y0+1,h-1); fx=(x-x0)[...,None]; fy=(y-y0)[...,None]
    return a[y0,x0]*(1-fx)*(1-fy)+a[y0,x1]*fx*(1-fy)+a[y1,x0]*(1-fx)*fy+a[y1,x1]*fx*fy
q={'tipLE':(700/W,615/H),'tipTE':(930/W,615/H),'rootLE':(195/W,1240/H),'rootTE':(760/W,1355/H)}
TW=TH=512
s=(np.arange(TW)+0.5)/TW; t=(np.arange(TH)+0.5)/TH; Sg,Tg=np.meshgrid(s,t)
le=np.array(q['tipLE'])*(1-Tg[...,None])+np.array(q['rootLE'])*Tg[...,None]; te=np.array(q['tipTE'])*(1-Tg[...,None])+np.array(q['rootTE'])*Tg[...,None]
p=le+(te-le)*Sg[...,None]; fin=sample(photo,p[...,0],p[...,1])
blue=np.median(photo[780:820,790:830].reshape(-1,3),axis=0); print('fin blue',blue)
# flatten the plain blue areas (photo noise and shading), keep logo and ribbons
fin[:, :int(0.045*TW)]=blue; fin[:int(0.03*TH)]=blue; fin[:, int(0.985*TW):]=blue   # the quad's edges catch the fin's grey leading edge and the tip cap
d=np.linalg.norm(fin-blue,axis=2); fin[d<60]=blue
# logo: non-blue pixels above the root ribbons → replace by the clean logo panel
sat=fin.max(axis=2)-fin.min(axis=2)
mask=(d>=60)&(sat>45)&(Tg<0.62)&(Tg>0.2)&(Sg>0.06)&(Sg<0.97); ys,xs=np.where(mask); y0,y1,x0,x1=ys.min(),ys.max(),xs.min(),xs.max(); print('logo bbox',x0,y0,x1,y1)
fin[y0-8:int(0.72*TH),x0-8:x1+9]=blue   # clear the photo's logo (it runs a little below the detected box)
fin[:int(0.12*TH), :int(0.1*TW)]=blue
logo=Image.open(SRC('gt-logo.jpg')).convert('RGB').crop((30,860,1130,1340))
L=np.asarray(logo).astype(np.float32); lb=np.array([15,39,111],dtype=np.float32); ld=np.linalg.norm(L-lb,axis=2)
alpha=np.clip((ld-25)/40,0,1)[...,None]   # soft key on the panel's own blue
rgb=np.where(alpha>0, (L-lb*(1-alpha))/np.maximum(alpha,1e-3), L)  # un-premultiply against the old blue
rgb=np.clip(rgb,0,255); comp=rgb*alpha+blue*(1-alpha)
lw=int((x1-x0)*1.08); lh=int(lw*L.shape[0]/L.shape[1]); cx=(x0+x1)//2; cy=(y0+y1)//2
compI=Image.fromarray(comp.astype(np.uint8)).resize((lw,lh),Image.LANCZOS); aI=Image.fromarray((alpha[...,0]*255).astype(np.uint8)).resize((lw,lh),Image.LANCZOS)
finI=Image.fromarray(fin.clip(0,255).astype(np.uint8)); finI.paste(compI,(cx-lw//2,cy-lh//2),aI)
out=Image.new('RGB',(1024,512)); out.paste(finI,(0,0)); out.paste(finI,(512,0)); out.save(OUT+'GT-fin.jpg',quality=92,subsampling=0)
# fuselage: plain white with a light grey belly; windows and titles are painted by the model
fus=np.full((512,2048,3),(246,247,249),dtype=np.uint8); fus[int(0.42*512):int(0.58*512)]=(205,208,214)
Image.fromarray(fus).save(OUT+'GT.jpg',quality=90)
finI.save(TMP('gt-fin-preview.png')); print('done')
