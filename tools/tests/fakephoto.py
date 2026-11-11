import sys, numpy as np, cv2
rng=np.random.default_rng(3)
for doc in ['doc1','doc3','doc4']:
    ex=cv2.imread(f'/home/user/expo-ar/print/templates/{doc}-example.png').astype(np.float32)
    ex=np.clip((ex-128)*0.9+128+np.array([4,-3,6]),0,255)
    Hh,Ww=4000,3000
    M=cv2.getPerspectiveTransform(np.float32([[0,0],[2480,0],[2480,3508],[0,3508]]),np.float32([[420,380],[2620,520],[2700,3620],[260,3480]]))
    warped=cv2.warpPerspective(ex,M,(Ww,Hh),borderValue=(70,95,120))
    yy,xx=np.mgrid[0:Hh,0:Ww]; light=0.75+0.3*(xx/Ww)*(1-0.4*yy/Hh)
    img=cv2.GaussianBlur(warped*light[:,:,None],(0,0),1.6)+rng.normal(0,4,warped.shape)
    cv2.imwrite(f'/home/user/expo-ar/scans/{doc}.jpg',np.clip(img,0,255).astype(np.uint8),[cv2.IMWRITE_JPEG_QUALITY,88])
