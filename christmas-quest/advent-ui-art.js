(() => {'use strict';
const D=window.__AdventExactPixels;
function hexBytes(hex){const out=new Uint8Array(hex.length/2);for(let i=0;i<out.length;i++)out[i]=parseInt(hex.slice(i*2,i*2+2),16);return out}
async function gunzipHex(hex){const stream=new Blob([hexBytes(hex)]).stream().pipeThrough(new DecompressionStream('gzip'));return new Uint8Array(await new Response(stream).arrayBuffer())}
async function decode(s){const idx=await gunzipHex(s.hex);if(idx.length!==s.w*s.h)throw new Error('Advent UI pixel data length mismatch');const rgba=new Uint8ClampedArray(idx.length*4);for(let i=0,q=0;i<idx.length;i++){const p=idx[i]*4;rgba[q++]=s.p[p];rgba[q++]=s.p[p+1];rgba[q++]=s.p[p+2];rgba[q++]=s.p[p+3]}s.rgba=rgba;return s}
const ready=Promise.all([decode(D.frame),decode(D.arrow),decode(D.action)]);
function paint(canvas,s){if(!s.rgba)throw new Error('Advent UI artwork is not decoded yet');canvas.width=s.w;canvas.height=s.h;const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.putImageData(new ImageData(s.rgba,s.w,s.h),0,0);return canvas}
window.AdventPixelUI={ready,drawFrame:c=>paint(c,D.frame),drawArrow:c=>paint(c,D.arrow),drawAction:c=>paint(c,D.action),nativeSizes:{frame:[D.frame.w,D.frame.h],arrow:[D.arrow.w,D.arrow.h],action:[D.action.w,D.action.h]},pixelHashes:{frame:D.frame.sha,arrow:D.arrow.sha,action:D.action.sha}};
})();