/* Exact code-only conversion of the two uploaded 16px tilesheets.
   312 non-empty 16x16 assets preserving exact RGBA pixels. */
(() => {
  'use strict';
  const PACK=window.__WB_USER_TILE_PACK||'';
  try{delete window.__WB_USER_TILE_PACK}catch(_){}
  const assets=new Map(),canvases=new Map();
  const STATIC_ROWS={
    Dungeon:{
      0:[1,2,3,4,5,6,8],1:[1,2,3,4,6,8,9],2:[1,2,3,4,5,6,7,8,9],3:[1,2,3,4,5,6,7,8,9],
      4:[0,1,2,3,4,5,6,7,8,9],5:[0,1,2,3,4,5,6,7,8,9],6:[0,1,2,3,4,5,6,7,9],7:[0,1,2,3,4,5,6,8,9],
      8:[2,3,4,5,7,8],9:[0,1,2,3,4,5,6,7,8],10:[0,1,2,3,4,5,6,7,8],11:[0,1,5,6,7,8],12:[0,1,5,6,7,8]
    },
    BigSet:{
      0:[0,1,2,3,4,5,6,7],1:[0,1,2,3,4,5,6,7],2:[0,1,2,3,4,5,6,7],3:[0,1,2,3,4,5,6,7],
      4:[0,1,2,3,4,5,6,7],5:[0,1,2,3,4,5,6,7],6:[0,1,2,3,4,5,6,7],7:[0,1,2,3,4,5,6,7],
      8:[0,1,2,3,4,5,6,7],9:[0,1,2,3,4,5,6,7],10:[0,1,2,3,4,5,6,7],11:[0,1,2,3,4,5,6,7],
      12:[0,1,2,3,4,5,6,7],13:[0,1,2,3,4,5,6,7],14:[0,1,2,3,4,5,6,7],15:[0,1,2,3,4,5,6,7],
      16:[0,1,2,3,4,5,6,7],17:[0,1,2,3,4,5,6,7],18:[0,1,2,3,4,5,6],19:[0,1,2,3,5],
      20:[0,1,2,3,4,5,6],21:[0,1,2,3,4,5,6,7],22:[0,1,2,3,4,5],23:[0,1,2,3,4,5,6,7],
      24:[0,1,2,3,4,5,6,7],25:[0,1,2,3,4,5,6,7],26:[0,1,2,3,4]
    }
  };
  const STATIC_NAMES=Object.freeze(Object.entries(STATIC_ROWS).flatMap(([sheet,rows])=>
    Object.entries(rows).flatMap(([row,cols])=>cols.map(col=>`${sheet} r${String(row).padStart(2,'0')} c${String(col).padStart(2,'0')}`))
  ));

  function categoryForName(name){
    const m=name.match(/^(Dungeon|BigSet) r(\d+) c(\d+)$/);
    if(!m)return 'Props & Items';
    const sheet=m[1],y=Number(m[2]),x=Number(m[3]);
    if(sheet==='Dungeon'){
      if(y<=3)return x>=8?'Props & Items':'Walls & Structure';
      if(y===4){if(x===0)return'Furniture';if(x<=3)return'Walls & Structure';if(x<=7)return'Floors & Ground';return'Props & Items'}
      if(y===5){if(x<=3)return'Walls & Structure';if(x<=7)return'Floors & Ground';return'Furniture'}
      if(y===6){if(x<=3)return'Floors & Ground';if(x===4||x===5)return'Doors & Windows';if(x<=8)return'Furniture';return'Props & Items'}
      if(y===7)return x<=3?'Floors & Ground':'Furniture';
      if(y>=8){if(x<=1)return'Walls & Structure';if(x>=4&&x<=6)return'Decorations';if(x===7||x===8)return'Furniture';return'Props & Items'}
    }else{
      if(y<=20)return'Floors & Ground';
      if(y===21)return x<=5?'Floors & Ground':'Furniture';
      if(y===22||y===23)return'Furniture';
      if(y===24){if(x>=4&&x<=6)return'Nature';if(x===7)return'Decorations';return'Furniture'}
      if(y===25){if(x<=3)return'Furniture';if(x===4||x===5)return'Characters & NPCs';return'Props & Items'}
      if(y===26){if(x>=1&&x<=3)return'Floors & Ground';if(x===4)return'Doors & Windows';return'Props & Items'}
    }
    return'Props & Items'
  }

  function base64Bytes(value){const raw=atob(value),out=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);return out}
  async function gunzip(value){const bytes=base64Bytes(value);if(typeof DecompressionStream!=='function')throw new Error('This browser does not support DecompressionStream.');const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));return new Uint8Array(await new Response(stream).arrayBuffer())}
  function parse(b){
    let p=0;
    const decoder=new TextDecoder();
    const expected=new Set(STATIC_NAMES);
    const fail=message=>{throw new Error('Uploaded tile pack: '+message)};
    const ensure=(n,label)=>{if(p+n>b.length)fail(label+' exceeds decoded payload at byte '+p+' / '+b.length)};
    const u8=label=>{ensure(1,label);return b[p++]};
    const u16=label=>{ensure(2,label);const v=b[p]|(b[p+1]<<8);p+=2;return v};
    const u32=label=>{ensure(4,label);const v=(b[p]|(b[p+1]<<8)|(b[p+2]<<16)|(b[p+3]<<24))>>>0;p+=4;return v};
    const take=(n,label)=>{ensure(n,label);const out=b.slice(p,p+n);p+=n;return out};

    const count=u16('asset count');
    if(count!==STATIC_NAMES.length)fail('asset count mismatch: '+count+' / '+STATIC_NAMES.length);

    const seen=new Set();
    for(let a=0;a<count;a++){
      const nl=u8('name length for asset '+a);
      const name=decoder.decode(take(nl,'name for asset '+a));
      if(!expected.has(name))fail('unexpected asset name at index '+a+': '+name);
      if(seen.has(name))fail('duplicate asset name: '+name);
      seen.add(name);

      const width=u16('width for '+name);
      const height=u16('height for '+name);
      const pc=u8('palette size for '+name);
      if(width!==16||height!==16)fail(name+' has unexpected dimensions '+width+'x'+height);
      if(pc<1)fail(name+' has an empty palette');

      const palette=take(pc*4,'palette for '+name);
      const rc=u32('run count for '+name);
      const rgba=new Uint8ClampedArray(width*height*4);
      let pixel=0;

      for(let r=0;r<rc;r++){
        const len=u16('run length '+r+' for '+name);
        const paletteIndex=u8('palette index '+r+' for '+name);
        if(paletteIndex>=pc)fail(name+' run '+r+' uses palette index '+paletteIndex+' / '+pc);
        if(pixel+len>width*height)fail(name+' run '+r+' overflows pixel count');

        const ci=paletteIndex*4;
        for(let n=0;n<len;n++,pixel++){
          const q=pixel*4;
          rgba[q]=palette[ci];
          rgba[q+1]=palette[ci+1];
          rgba[q+2]=palette[ci+2];
          rgba[q+3]=palette[ci+3];
        }
      }

      if(pixel!==width*height)fail(name+' decoded '+pixel+' / '+(width*height)+' pixels');
      assets.set(name,{name,width,height,rgba,category:categoryForName(name),pack:'uploaded-tiles'});
    }

    if(p!==b.length)fail('trailing decoded bytes: '+(b.length-p));
    if(assets.size!==STATIC_NAMES.length)fail('decoded asset count mismatch: '+assets.size+' / '+STATIC_NAMES.length);

    api.loaded=true;
    api.loadError=null;
    return api
  }
  function requireAsset(name){const a=assets.get(name);if(!a)throw new Error('Uploaded tile is still loading: '+name);return a}
  function canvas(name){if(canvases.has(name))return canvases.get(name);const a=requireAsset(name),c=document.createElement('canvas');c.width=a.width;c.height=a.height;const x=c.getContext('2d');x.imageSmoothingEnabled=false;const image=x.createImageData(a.width,a.height);image.data.set(a.rgba);x.putImageData(image,0,0);canvases.set(name,c);return c}
  function frame(name){return canvas(name)}
  function draw(ctx,name,x,y,options={}){const src=canvas(name),w=options.width??src.width,h=options.height??src.height;ctx.save();ctx.imageSmoothingEnabled=false;ctx.globalAlpha=options.alpha??1;if(options.flipX||options.flipY){ctx.translate(x+(options.flipX?w:0),y+(options.flipY?h:0));ctx.scale(options.flipX?-1:1,options.flipY?-1:1);ctx.drawImage(src,0,0,w,h)}else ctx.drawImage(src,x,y,w,h);ctx.restore()}
  function metadata(name){const a=assets.get(name);return a?{name:a.name,width:a.width,height:a.height,cell:null,category:a.category,pack:a.pack}:{name,width:16,height:16,cell:null,category:categoryForName(name),pack:'uploaded-tiles'}}
  const api={ready:null,names:STATIC_NAMES,loaded:false,loadError:null,canvas,frame,draw,metadata,categoryForName,get(name){return requireAsset(name)}};
  api.ready=gunzip(PACK).then(parse).catch(err=>{api.loadError=err;throw err});
  window.WorldBuilderSheetAssets=api;
})();