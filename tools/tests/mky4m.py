# Fake camera feeds: python3 -I mky4m.py OUTDIR doc mode   (mode: still | move)
import sys, math, numpy as np
from PIL import Image, ImageFilter
out, doc, mode = sys.argv[1], sys.argv[2], sys.argv[3]
W,H=720,960; N=120
img=Image.open(f'/home/user/expo-ar/img/{doc}.jpg').convert('RGB'); w,h=img.size
base=[(130,170),(590,160),(615,800),(110,812)]
def coeffs(pa,pb):
    m=[]
    for p1,p2 in zip(pa,pb):
        m.append([p1[0],p1[1],1,0,0,0,-p2[0]*p1[0],-p2[0]*p1[1]]); m.append([0,0,0,p1[0],p1[1],1,-p2[1]*p1[0],-p2[1]*p1[1]])
    return np.linalg.solve(np.array(m,float),np.array(pb,float).reshape(8))
rng=np.random.default_rng(7)
truth=[]
with open(f'{out}/{doc}-{mode}.y4m','wb') as f:
    f.write(f'YUV4MPEG2 W{W} H{H} F30:1 Ip A1:1 C420jpeg\n'.encode())
    for i in range(N):
        dx = 24*math.sin(2*math.pi*i/60) if mode=='move' else 0
        q=[(x+dx,y) for x,y in base]; truth.append(dx)
        c=coeffs(q,[(0,0),(w,0),(w,h),(0,h)])
        bg=Image.new('RGB',(W,H),(96,92,86))
        bg.paste(img.transform((W,H),Image.PERSPECTIVE,c,Image.BICUBIC),(0,0),Image.new('L',img.size,255).transform((W,H),Image.PERSPECTIVE,c,Image.BICUBIC))
        a=np.asarray(bg.filter(ImageFilter.GaussianBlur(0.9))).astype(float)
        a=a*(1+rng.normal(0,0.01))+rng.normal(0,5,a.shape)   # sensor noise + exposure flicker
        y,cb,cr=Image.fromarray(np.clip(a,0,255).astype('uint8')).convert('YCbCr').split()
        f.write(b'FRAME\n'+y.tobytes()+cb.resize((W//2,H//2)).tobytes()+cr.resize((W//2,H//2)).tobytes())
print(doc, mode, 'ok')
