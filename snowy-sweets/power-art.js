/* Render complete Snowy Sweets power variants from the real bundled PNG sweets.
   Each power-up is a new, self-contained transparent PNG image (Canvas.toDataURL),
   never a detached DOM element or CSS drawn candy. */
(function(){
  "use strict";
  const cell=48, cache=new Map();
  let ready=false;
  function imageDataUrl(base,kind){
    const canvas=document.createElement("canvas");
    canvas.width=canvas.height=cell;
    const ctx=canvas.getContext("2d",{willReadFrequently:true});
    if(!ctx)return null;
    ctx.imageSmoothingEnabled=false;
    // Every source keeps its original proportions and all completed sprite halves.
    const side=36,offset=(cell-side)/2;
    ctx.drawImage(base,offset,offset,side,side);
    if(!kind)return canvas.toDataURL("image/png");
    const original=ctx.getImageData(0,0,cell,cell);
    const pix=original.data;
    const coords=[];
    for(let y=0;y<cell;y++)for(let x=0;x<cell;x++){
      const i=(y*cell+x)*4;
      if(pix[i+3]>160)coords.push([x,y]);
    }
    if(!coords.length)return canvas.toDataURL("image/png");
    let xMin=cell,xMax=0,yMin=cell,yMax=0;
    for(const [x,y] of coords){xMin=Math.min(xMin,x);xMax=Math.max(xMax,x);yMin=Math.min(yMin,y);yMax=Math.max(yMax,y);}
    const centreX=Math.round((xMin+xMax)/2),centreY=Math.round((yMin+yMax)/2);
    const color=kind==="row"?[255,215,90]:kind==="col"?[89,223,255]:[255,177,232];
    // A tight one-pixel coloured edge follows the SWEET outline itself.
    // The source sweet remains unchanged underneath.
    const out=new Uint8ClampedArray(pix);
    for(const [x,y] of coords){
      for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++){
        const px=x+ox,py=y+oy;
        if(px<0||py<0||px>=cell||py>=cell)continue;
        const p=(py*cell+px)*4;
        if(pix[p+3]===0 && out[p+3]===0){
          out[p]=color[0];out[p+1]=color[1];out[p+2]=color[2];out[p+3]=210;
        }
      }
    }
    // Distinguish specials by artwork painted within the existing silhouette,
    // not by placing icons beside the sweets.
    for(const [x,y] of coords){
      let paint=false, shade=false;
      if(kind==="row" && Math.abs(y-centreY)<=1){paint=true;shade=y>centreY;}
      if(kind==="col" && Math.abs(x-centreX)<=1){paint=true;shade=x>centreX;}
      if(kind==="burst"){
        const dx=Math.abs(x-centreX),dy=Math.abs(y-centreY);
        paint=(dx===0&&dy<=5)||(dy===0&&dx<=5)||(dx+dy<=2);
        shade=(dx+dy)>1;
      }
      if(!paint)continue;
      const p=(y*cell+x)*4;
      const fill=kind==="row"?(shade?[232,163,56]:[255,248,174]):
        kind==="col"?(shade?[32,151,204]:[198,251,255]):
        (shade?[255,219,83]:[255,255,248]);
      out[p]=fill[0];out[p+1]=fill[1];out[p+2]=fill[2];out[p+3]=255;
    }
    ctx.putImageData(new ImageData(out,cell,cell),0,0);
    return canvas.toDataURL("image/png");
  }
  async function build(sources){
    if(ready)return true;
    const loaded=await Promise.all(sources.map(src=>new Promise(resolve=>{
      const img=new Image();
      img.onload=()=>resolve(img);
      img.onerror=()=>resolve(null);
      img.src=src;
    })));
    for(let type=0;type<loaded.length;type++){
      if(!loaded[type])continue;
      for(const kind of ["row","col","burst"]){
        try{cache.set(type+":"+kind,imageDataUrl(loaded[type],kind));}catch(error){
          console.warn("Snowy Sweets power sprite unavailable",type,kind,error);
        }
      }
    }
    ready=true;
    return cache.size>0;
  }
  function get(type,kind){return kind?cache.get(type+":"+kind)||null:null;}
  window.SnowySweetsArt={build,get};
})();
