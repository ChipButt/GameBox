(() => {'use strict';
const D=window.__AdventExactPixels;
function paint(canvas,s){canvas.width=s.w;canvas.height=s.h;const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;const out=ctx.createImageData(s.w,s.h),d=out.data,p=s.p,r=s.r;let q=0;for(let i=0;i<r.length;i+=2){const n=r[i],pi=r[i+1]*4,rr=p[pi],gg=p[pi+1],bb=p[pi+2],aa=p[pi+3];for(let j=0;j<n;j++){d[q++]=rr;d[q++]=gg;d[q++]=bb;d[q++]=aa}}ctx.putImageData(out,0,0);return canvas}
window.AdventPixelUI={drawFrame:c=>paint(c,D.frame),drawArrow:c=>paint(c,D.arrow),drawAction:c=>paint(c,D.action),nativeSizes:{frame:[D.frame.w,D.frame.h],arrow:[D.arrow.w,D.arrow.h],action:[D.action.w,D.action.h]},pixelHashes:{frame:D.frame.sha,arrow:D.arrow.sha,action:D.action.sha}};
})();