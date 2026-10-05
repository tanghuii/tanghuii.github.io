# Bake FlightGear livery textures into the flight-log model's UV layout.
# Output per airline: liveries/<KEY>.jpg  (2048x512 fuselage: u along the length, v around: 0 crown, 0.205 windows, 0.5 belly, 1 crown)
#                     liveries/<KEY>-fin.jpg (1024x512: left half = port fin, right half = starboard; s across the chord LE->TE, t down tip->root)
import os, tempfile
SRC = lambda n: os.path.join(os.environ.get('LIVERY_SRC', os.path.join(os.path.dirname(__file__), 'src')), n)   # reference photos (not committed)
TMP = lambda n: os.path.join(tempfile.gettempdir(), n)
import sys, json
from PIL import Image
import numpy as np
OUT=__import__('os').path.join(__import__('os').path.dirname(__file__), '..', '..', 'liveries') + '/'
FW,FH=2048,512; TW,TH=512,512
# Layouts. 'unwrap': cylindrical unwrap strips (A320 family, legoboyvdlp / Pilot2938): y anchors for v = 0, .205, .5, .795, 1.
A320={'kind':'unwrap','crownCopy':0.09,'noseCopy':0.045,'bellyCopy':True,'x':(0.0,0.935),'y':(0.042,0.092,0.2135,0.335,0.385),'patches':[(0.62,0.118,0.705,0.132),(0.62,0.297,0.705,0.312)],
      'finL':{'rootLE':(0.9006,0.4326),'rootTE':(0.8044,0.4326),'tipLE':(0.8196,0.5959),'tipTE':(0.7671,0.5959)},
      'finR':{'rootLE':(0.8513,0.637),'rootTE':(0.9421,0.637),'tipLE':(0.9268,0.4736),'tipTE':(0.9797,0.4736)}}
# 'side': two side profiles (Pilot2938 A330): port = nose left, starboard = nose right. crown/window/belly rows per profile.
A330={'kind':'side','port':{'x':(0.005,0.87),'y':(0.80,0.86,0.995)},'stbd':{'x':(0.995,0.13),'y':(0.305,0.385,0.50)},
      'finL':{'rootLE':(0.78,0.665),'rootTE':(1.0,0.665),'tipLE':(0.88,0.42),'tipTE':(1.0,0.42)},
      'finR':{'rootLE':(0.22,0.335),'rootTE':(0.0,0.335),'tipLE':(0.12,0.03),'tipTE':(0.0,0.03)}}
B737={'kind':'side','port':{'x':(0.025,0.985),'y':(0.113,0.1592,0.205)},'stbd':{'x':(0.985,0.03),'y':(0.018,0.0503,0.105)},
  'finL':{'rootLE':(0.02,0.99),'rootTE':(0.235,0.99),'tipLE':(0.02,0.78),'tipTE':(0.07,0.78)},'finR':{'rootLE':(0.99,0.99),'rootTE':(0.67,0.99),'tipLE':(0.99,0.78),'tipTE':(0.935,0.78)}}
A320old={'kind':'side','blackBg':True,'port':{'x':(0.02,0.985),'y':(0.062,0.12,0.2)},'stbd':{'x':(0.985,0.015),'y':(0.245,0.295,0.37)},
  'finL':{'rootLE':(0.12,0.99),'rootTE':(0.40,0.99),'tipLE':(0.11,0.76),'tipTE':(0.20,0.76)},'finR':{'rootLE':(0.12,0.99),'rootTE':(0.40,0.99),'tipLE':(0.11,0.76),'tipTE':(0.20,0.76)}}
A330['port']={'x':(0.005,0.87),'y':(0.785,0.842,0.995)}; A330['stbd']={'x':(0.995,0.13),'y':(0.295,0.367,0.515)}
A330['blackBg']=True
A330['finR']={'rootLE':(0.17,0.34),'rootTE':(0.0,0.34),'tipLE':(0.105,0.03),'tipTE':(0.0,0.03)}; A330['finL']=A330['finR']
# Loong Air: a side-view illustration (TransPNG #38006R, 899x2000 screenshot), port side; the same picture serves the starboard side mirrored
LOONG={'kind':'side','port':{'x':(22/899,880/899),'y':(953/2000,985/2000,1046/2000)},'stbd':{'x':(22/899,880/899),'y':(953/2000,985/2000,1046/2000)},
  'finL':{'rootLE':(735/899,950/2000),'rootTE':(868/899,950/2000),'tipLE':(815/899,818/2000),'tipTE':(868/899,818/2000)}}
LOONG['finR']=LOONG['finL']
# Kunming Airlines: side-view illustration (2000x645), port side, mirrored for starboard
KUN={'kind':'side','clipV':0.3,'port':{'x':(62/2000,1992/2000),'y':(392/645,456/645,520/645)},'stbd':{'x':(62/2000,1992/2000),'y':(392/645,456/645,520/645)},
  'finL':{'rootLE':(1545/2000,388/645),'rootTE':(1852/2000,388/645),'tipLE':(1781/2000,72/645),'tipTE':(1848/2000,72/645)}}
KUN['finR']=KUN['finL']
# Grand China Air: near-profile photo (2000x781) of B-5539, port side, mirrored for starboard
GCA={'kind':'side','clipV':0.26,'crownCopy':0.1,'skyFill':[240,241,243],'port':{'x':(28/2000,1990/2000),'y':(412/781,455/781,600/781)},'stbd':{'x':(28/2000,1990/2000),'y':(412/781,455/781,600/781)},
  'finL':{'rootLE':(1560/2000,425/781),'rootTE':(1815/2000,425/781),'tipLE':(1818/2000,138/781),'tipTE':(1886/2000,138/781)}}
GCA['finR']=GCA['finL']
# Xiamen Air: 787-8 side-view illustration (xm-787.png, 1200x460), port side, mirrored for starboard
XMN={'kind':'side','clipV':0.3,'crownCopy':0.1,'port':{'x':(148/1200,1060/1200),'y':(220/460,248/460,300/460)},'stbd':{'x':(148/1200,1060/1200),'y':(220/460,248/460,300/460)},
  'finL':{'rootLE':(872/1200,224/460),'rootTE':(1000/1200,224/460),'tipLE':(1012/1200,80/460),'tipTE':(1058/1200,80/460)}}
XMN['finR']=XMN['finL']
# Shenzhen Airlines: profile photo of B-8413 (2000x960), nose to the RIGHT (x runs nose→tail downwards)
SZX={'kind':'side','clipV':0.42,'crownCopy':0.1,'port':{'x':(1955/2000,170/2000),'y':(455/960,552/960,640/960)},'stbd':{'x':(1955/2000,170/2000),'y':(455/960,552/960,640/960)},
  'finL':{'rootLE':(560/2000,455/960),'rootTE':(205/2000,460/960),'tipLE':(279/2000,134/960),'tipTE':(197/2000,134/960)}}
SZX['finR']=SZX['finL']
# Sichuan Airlines: profile photo of an A330-200 (2000x1039), nose left
SCA={'kind':'side','clipV':0.42,'crownCopy':0.1,'port':{'x':(215/2000,1995/2000),'y':(632/1039,745/1039,930/1039)},'stbd':{'x':(215/2000,1995/2000),'y':(632/1039,745/1039,930/1039)},
  'finL':{'rootLE':(1555/2000,632/1039),'rootTE':(1812/2000,632/1039),'tipLE':(1782/2000,199/1039),'tipTE':(1852/2000,199/1039)}}
SCA['finR']=SCA['finL']
LAYOUTS={'A320':A320,'A330':A330,'B737':B737,'A320old':A320old,'LOONG':LOONG,'KUN':KUN,'GCA':GCA,'XMN':XMN,'SZX':SZX,'SCA':SCA}
def sample(a, X, Y):   # bilinear sample of image array a at fractional coords X,Y in [0,1]
    H,W=a.shape[:2]; x=np.clip(X*(W-1),0,W-1.001); y=np.clip(Y*(H-1),0,H-1.001)
    x0=np.floor(x).astype(int); y0=np.floor(y).astype(int); fx=(x-x0)[...,None]; fy=(y-y0)[...,None]
    return (a[y0,x0]*(1-fx)*(1-fy)+a[y0,x0+1]*fx*(1-fy)+a[y0+1,x0]*(1-fx)*fy+a[y0+1,x0+1]*fx*fy)
def piece(v, anchors):   # piecewise-linear v -> y through (v,y) anchors
    vs=[p[0] for p in anchors]; ys=[p[1] for p in anchors]; return np.interp(v, vs, ys)
def bake(src, layout, key, finFlip=False, oneFin=False, lightenGrey=False, crown=None, bellyFill=None, patches=None, maskFill=None, rearSweep=None):
    L=dict(LAYOUTS[layout])
    if crown: L['y']=(crown[0],)+tuple(L['y'][1:4])+(crown[1],)
    if patches is not None: L['patches']=patches
    if oneFin: L['finL']=L['finR']
    if finFlip: L={**L, **{k:{'rootLE':q['tipLE'],'rootTE':q['tipTE'],'tipLE':q['rootLE'],'tipTE':q['rootTE']} for k,q in ((k,L[k]) for k in ('finL','finR'))}}
    a=np.asarray(Image.open(src).convert('RGB')).astype(np.float32)
    if L.get('blackBg'):   # fill the black background with the nearest painted colour, so the tapering nose and tail cone pick up fuselage paint
        from scipy import ndimage
        black=a.sum(axis=2)<60; lab,n=ndimage.label(black); sizes=ndimage.sum(black,lab,range(1,n+1))
        bg=np.isin(lab, np.where(sizes>2500)[0]+1)   # only the big background areas, not black lettering
        black=ndimage.binary_dilation(bg, iterations=6); idx=ndimage.distance_transform_edt(black, return_distances=False, return_indices=True); a=a[idx[0],idx[1]]
    u=(np.arange(FW)+0.5)/FW; v=(np.arange(FH)+0.5)/FH; U,V=np.meshgrid(u,v)
    if L['kind']=='unwrap':
        X=L['x'][0]+U*(L['x'][1]-L['x'][0]); y=L['y']; Y=piece(V,[(0,y[0]),(0.205,y[1]),(0.5,y[2]),(0.795,y[3]),(1,y[4])])
    else:
        h=lambda vv:(1-np.cos(2*np.pi*vv))/2; hw=h(0.205)
        def side(prof, vv):   # vv in [0,0.5], 0 crown -> 0.5 belly; clipV repeats one row over the belly (wings and engines sit there in a side view)
            vv=np.minimum(vv, L.get('clipV',0.5)); yc,yw,yb=prof['y']; hh=h(vv); return np.where(vv<=0.205, yc+(yw-yc)*hh/hw, yw+(yb-yw)*(hh-hw)/(1-hw))
        P,S=L['port'],L['stbd']
        X=np.where(V<=0.5, P['x'][0]+U*(P['x'][1]-P['x'][0]), S['x'][0]+U*(S['x'][1]-S['x'][0]))
        Y=np.where(V<=0.5, side(P,V), side(S,1-V))
    fus=sample(a,X,Y)
    # the crown: the texture above the fuselage strip holds other parts, so the top few degrees take the colour just below
    def mode_col(rows):   # the most common colour (quantised) in a block of rows
        q=(rows.reshape(-1,3)//12).astype(np.int64); keys=q[:,0]*10000+q[:,1]*100+q[:,2]; k=np.bincount(keys).argmax()
        return rows.reshape(-1,3)[keys==k].mean(axis=0)
    if L.get('noseCopy'):   # the strip's nose end lies outside the painted outline: repeat the first painted column over the radome
        n=int(L['noseCopy']*FW); fus[:,:n]=fus[:,n:n+1]
    cr=int(L.get('crownCopy',0.032)*FH)
    if L.get('crownCopy'):   # the crown is plain on a real aircraft: one colour, the most common one just below the band, on each side
        c0=mode_col(fus[cr:int(0.12*FH)]); c1=mode_col(fus[FH-int(0.12*FH):FH-cr]); fus[:cr]=c0; fus[FH-cr:]=c1
    else: fus[:cr]=fus[cr]; fus[FH-cr:]=fus[FH-cr-1]
    if L.get('bellyCopy'):   # the belly rows hold gear bays and fairings: plain belly in the colour found at its edges; the tail cone likewise
        b0,b1=int(0.36*FH),int(0.64*FH); mid=(b0+b1)//2; c0=c1=mode_col(np.concatenate([fus[int(0.33*FH):b0],fus[b1:int(0.67*FH)]])); fus[b0:b1]=c0
        t=int(0.885*FW); fus[int(0.26*FH):mid,t:]=c0; fus[mid:int(0.74*FH),t:]=c1
    for (x0,y0,x1,y1) in L.get('patches',[]):   # small stencils (type names) painted over, row by row, with the colour just ahead of them
        m=(X>=x0)&(X<=x1)&(Y>=y0)&(Y<=y1); fill=sample(a,np.full(Y.shape,x0-0.02),Y); fus[m]=fill[m]
    if bellyFill:   # [v0, v1, colour]: a plain belly where the texture keeps other parts there
        v0,v1,col=bellyFill; m=(V>=v0)&(V<=v1); fus[m]=np.array(col,dtype=np.float32)
    if maskFill:   # [[x0,y0,x1,y1,[r,g,b]], …] in source coords: hide titles the page draws itself
        for (x0,y0,x1,y1,col) in maskFill: m=(X>=x0)&(X<=x1)&(Y>=y0)&(Y<=y1); fus[m]=np.array(col,dtype=np.float32)
    if L.get('skyFill'):   # photo background that leaked past the outline: blue sky becomes the fuselage white
        m=(fus[...,2]>fus[...,0]+25)&(fus[...,2]>100); fus[m]=np.array(L['skyFill'],dtype=np.float32)
    if rearSweep:   # [u0, vTop0, colour, white]: the photo's rear is unreliable (cropped/occluded), so paint it: body colour above a band that widens from the window line to the crown
        u0,vt0,col,wh=rearSweep; m=U>=u0; t=np.clip((U-u0)/(1-u0),0,1); top=vt0*(1-t)**1.3
        fus[m]=np.array(wh,dtype=np.float32); Vm_=np.where(V<=0.5,V,1-V); band=m&(Vm_>=top); fus[band]=np.array(col,dtype=np.float32)
    if lightenGrey:   # a dark grey belly in the texture reads almost black under the model's lighting: lift it towards the light grey of the real aircraft
        lum=fus.mean(axis=2); sat=fus.max(axis=2)-fus.min(axis=2); m=(sat<18)&(lum>110)&(lum<200); fus[m]=fus[m]*0.45+235*0.55
    Image.fromarray(fus.clip(0,255).astype(np.uint8)).save(OUT+key+'.jpg',quality=88,subsampling=0)
    # fins: s across chord LE->TE, t tip->root
    s=(np.arange(TW)+0.5)/TW; t=(np.arange(TH)+0.5)/TH; Sg,Tg=np.meshgrid(s,t)
    halves=[]
    for side_ in ('finL','finR'):
        q=L[side_]; le=np.array(q['tipLE'])[None,None,:]*(1-Tg[...,None])+np.array(q['rootLE'])[None,None,:]*Tg[...,None]
        te=np.array(q['tipTE'])[None,None,:]*(1-Tg[...,None])+np.array(q['rootTE'])[None,None,:]*Tg[...,None]
        p=le+(te-le)*Sg[...,None]; halves.append(sample(a,p[...,0],p[...,1]))
    fin=np.concatenate(halves,axis=1)
    Image.fromarray(fin.clip(0,255).astype(np.uint8)).save(OUT+key+'-fin.jpg',quality=88,subsampling=0)
    print('baked',key)
if __name__=='__main__':
    for job in json.loads(sys.argv[1]): bake(*job[:3], **(job[3] if len(job)>3 else {}))
