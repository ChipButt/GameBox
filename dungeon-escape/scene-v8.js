/* Dungeon Escape V8 — physical, rotated clue artwork and room identity seals.
   The 16-piece puzzle itself remains a swap puzzle, with the clue revealed only at completion.
   Deliberately local/test-only: the existing GameBox simulated chat is retained. */
(()=>{
'use strict';
const sealSymbols=['raven','serpent','dagger','moon','sun'];
const clueCache=new Map();
let cachedGame=null;
// Generated images are identified by the destination player's current saved
// answer, not by a fixed clue number or screenshot file.
function currentSolution(target){
 return codeFor(library,target).map(({symbol,rotation})=>({symbol,rotation}));
}
function clueSignature(target){
 return JSON.stringify({game:game?.id,player:target.id,code:currentSolution(target),
  sockets:window.DungeonPlacement?.get()?.zoom?.desktop?.sockets||null,
  panelArt:window.DungeonPlacement?.get()?.zoom?.desktop?.panelArt||null});
}
function roomIdentity(player){
 const i=player.index;
 return {symbol:sealSymbols[i%5],count:Math.floor(i/5)+1};
}
function sealRow(player,location){
 const {symbol,count}=roomIdentity(player);
 const row=document.createElement('span');
 row.className='room-identity-seals '+location+' count-'+count;
 row.setAttribute('aria-label',count+' '+symbol+' room marker'+(count>1?'s':''));
 for(let i=0;i<count;i++){
  const img=document.createElement('img');
  img.src=AS+'talismans/'+symbol+'_front.webp';img.alt='';img.draggable=false;
  row.append(img);
 }
 return row;
}
function refreshRoomMarkers(){
 if(!game)return;
 const player=self();if(!player)return;
 const safe=getHotspot('safe'),frame=getHotspot('image');
 if(safe){
  safe.querySelector('.room-identity-seals')?.remove();
  if(!player.safeOpen)safe.append(sealRow(player,'on-safe-door'));
  window.DungeonPlacement?.applySafe?.();
 }
 if(frame){
  frame.querySelector('.room-identity-seals')?.remove();
  // No marker beneath the picture: the clue identifies its destination.
 }
}
function makeClue(target){
 if(cachedGame!==game){clueCache.clear();cachedGame=game}
 const signature=clueSignature(target);
 const solution=currentSolution(target);
 const sockets=window.DungeonPlacement?.get()?.zoom?.desktop?.sockets;
 const panelArt=window.DungeonPlacement?.get()?.zoom?.desktop?.panelArt;
 const existing=clueCache.get(signature);
 if(existing)return existing;
 const result={url:null,promise:null,signature};
 clueCache.set(signature,result);
 result.promise=Promise.all([
  ...sealSymbols.map(symbol=>new Promise(resolve=>{
   const img=new Image();img.onload=()=>resolve([symbol,img]);img.onerror=()=>resolve([symbol,null]);
   img.src=AS+'talismans/'+symbol+'_front.webp';
  })),
  new Promise(resolve=>{
   const img=new Image();img.onload=()=>resolve(['panelArtwork',img]);img.onerror=()=>resolve(['panelArtwork',null]);
   img.src=AS+'closeups/panel_12.webp';
  })
 ]).then(items=>{
  const images=Object.fromEntries(items);
  const canvas=document.createElement('canvas'),W=960;
  canvas.width=W;canvas.height=W;
  const ctx=canvas.getContext('2d');
  if(!ctx)throw Error('Clue painting is unavailable on this device');
  // Twelve rotated stones appear above the destination room's glowing identity.
  // An aged, low-contrast recess behind the panel fills the square picture.
  ctx.fillStyle='#211917';ctx.fillRect(0,0,W,W);
  const vignette=ctx.createRadialGradient(480,520,110,480,520,680);
  vignette.addColorStop(0,'#573b2c');vignette.addColorStop(1,'#1b1413');
  ctx.fillStyle=vignette;ctx.fillRect(0,0,W,W);
  const panel=images.panelArtwork;
  const panelBox={x:45,y:42,w:870,h:652.5};
  if(panel){
   // Recreate the actual editable close-up wall background (position, size,
   // aspect ratio and rotation) rather than reusing a pre-made screenshot.
   const o=panelArt||{x:50,y:50,w:100,h:100,r:0};
   const boxW=panelBox.w*o.w/100,boxH=panelBox.h*o.h/100;
   const ratio=(panel.naturalWidth||panel.width)/(panel.naturalHeight||panel.height);
   const drawW=Math.min(boxW,boxH*ratio),drawH=Math.min(boxH,boxW/ratio);
   ctx.save();
   ctx.translate(panelBox.x+panelBox.w*o.x/100,panelBox.y+panelBox.h*o.y/100);
   ctx.rotate((o.r||0)*Math.PI/180);
   ctx.drawImage(panel,-drawW/2,-drawH/2,drawW,drawH);
   ctx.restore();
  }
  const identity=roomIdentity(target),seal=images[identity.symbol],count=identity.count;
  const size=count===1?194:count===2?153:count===3?128:111;
  const gap=10,span=count*size+(count-1)*gap;
  if(seal)for(let i=0;i<count;i++){
   const x=(W-span)/2+i*(size+gap)+size/2;
   ctx.save();ctx.translate(x,823);
   // Natural light on the original stone, without separate circles or stars.
   ctx.shadowColor='rgba(255,198,91,.9)';ctx.shadowBlur=39;
   ctx.drawImage(seal,-size/2,-size/2,size,size);
   ctx.restore();
  }
  // Use approved DESKTOP CLOSE-UP socket centres so the artwork and stones align.
  const approved=Array.isArray(sockets)&&sockets.length===12?
   sockets:Array.from({length:12},(_,i)=>({x:[33.9,48.8,64][i%3],y:[24.2,42.2,60.5,78.5][Math.floor(i/3)],w:10.55,h:10.55}));
  solution.forEach((part,i)=>{
   const art=images[part.symbol],hole=approved[i];
   if(!art)return;
   const x=panelBox.x+hole.x*panelBox.w/100;
   const y=panelBox.y+hole.y*panelBox.h/100;
   const diameter=Math.min(hole.w*panelBox.w/100,hole.h*panelBox.h/100)*.85;
   ctx.save();ctx.translate(x,y);ctx.rotate(part.rotation*Math.PI/2);
   ctx.shadowColor='rgba(0,0,0,.55)';ctx.shadowBlur=8;
   ctx.drawImage(art,-diameter/2,-diameter/2,diameter,diameter);
   ctx.restore();
  });
  const url=canvas.toDataURL('image/png');
  result.url=url;return url;
 }).catch(error=>{
  console.error('[Dungeon Escape] Unable to render rotated clue',error);
  clueCache.delete(signature);return null;
 });
 return result;
}
function paintClueWhenReady(player,target){
 const requestedGame=game,requestedCode=clueSignature(target);
 const handle=makeClue(target);
 const apply=url=>{
  if(!url||game!==requestedGame||view!=='image'||self()?.id!==player.id||
   clueSignature(nextPlayer(game,player.id))!==requestedCode)return;
  const root=$('viewContent');
  const reveal=root.querySelector('.jigsaw-reveal');
  if(reveal)reveal.src=url;
  root.querySelectorAll('.jigsaw-tile').forEach(node=>{node.style.backgroundImage='url("'+url+'")'});
 };
 if(handle.url)apply(handle.url);
 else handle.promise.then(apply);
}
// Use the same generated clue on the local testing guide as on the actual
// frame and team chat. No pre-rendered clue_XX screenshots.
function refreshSolutionGuide(){
 if(!game)return;
 const img=$('solutionBody')?.querySelector('img[data-live-dungeon-clue]');
 if(!img)return;
 const player=self(),target=nextPlayer(game,player.id),savedGame=game;
 const signature=clueSignature(target);
 if(img.dataset.clueSignature===signature&&img.getAttribute('src'))return;
 img.dataset.clueSignature=signature;
 img.removeAttribute('src');
 const apply=url=>{
  if(url&&img.isConnected&&img.dataset.clueSignature===signature&&
    game===savedGame&&self()?.id===player.id)img.src=url;
 };
 const handle=makeClue(target);
 if(handle.url)apply(handle.url);else handle.promise.then(apply);
}
window.DungeonClueArt={signature:clueSignature,make:makeClue,refreshGuide:refreshSolutionGuide};
function refreshSharedClues(){
 if(!game)return;
 const entries=$('chatMessages')?.querySelectorAll('.chat-bubble');
 if(!entries?.length)return;
 const recent=game.chat.slice(-70);
 entries.forEach((element,i)=>{
  const entry=recent[i];if(!entry||!Number.isInteger(entry.clueTarget))return;
  if(element.querySelector('.shared-clue-picture'))return;
  const target=game.players[entry.clueTarget];if(!target)return;
  const display=document.createElement('div');display.className='shared-clue-picture';
  // The shared picture already contains the emblem.
  const img=document.createElement('img');img.alt='Rotated talisman solution artwork for '+target.name;
  display.append(img);element.append(display);
  const handle=makeClue(target),savedGame=game,signature=clueSignature(target);
  const apply=url=>{if(url&&img.isConnected&&game===savedGame&&
    clueSignature(target)===signature)img.src=url};
  if(handle.url)apply(handle.url);else handle.promise.then(apply);
 });
}
const oldShare=shareClue;
shareClue=function(g,id,lib){
 const dest=nextPlayer(g,id);
 oldShare(g,id,lib);
 const message=g.chat[g.chat.length-1];
 message.body='Restored talisman picture shared.';
 message.clueTarget=dest.index;
 message.clueSignature=clueSignature(dest);
 return message.body;
};

/* The perspective frame in the WIDE room is not square. Render the exact
   same jigsaw image in perspective, inside its engraved border, without
   altering the close-up image or leaking the solution before completion. */
const defaultWideVertices=[[30,58],[192,161],[194,470],[30,495]];
function frameVertices(){
 return window.DungeonPlacement?.frameCorners?.()||defaultWideVertices;
}
function warpFrameArt(source,player){
 const W=214,H=563,size=512;
 const tiles=document.createElement('canvas');tiles.width=tiles.height=size;
 const t=tiles.getContext('2d',{willReadFrequently:true});
 if(!t)throw Error('Wide frame preview canvas unavailable');
 const parts=player.puzzleSolved?Array.from({length:16},(_,i)=>i):player.pieces;
 for(let i=0;i<16;i++){
  const src=parts[i],side=size/4,sz=source.width/4;
  t.drawImage(source,(src%4)*sz,Math.floor(src/4)*sz,sz,sz,
    (i%4)*side,Math.floor(i/4)*side,side,side);
 }
 const pixels=t.getImageData(0,0,size,size).data;
 const out=document.createElement('canvas');out.width=W;out.height=H;
 const ctx=out.getContext('2d',{willReadFrequently:true});
 if(!ctx)throw Error('Wide frame preview canvas unavailable');
 const im=ctx.createImageData(W,H),dest=im.data;
 const corners=frameVertices(),[a,b,c,d]=corners;
 // Work over the adjustable quadrilateral; no fixed pixel bounds to clip edits.
 const xs=corners.map(c=>c[0]),ys=corners.map(c=>c[1]);
 const left=Math.max(0,Math.floor(Math.min(...xs))-2),
       right=Math.min(W-1,Math.ceil(Math.max(...xs))+2),
       top=Math.max(0,Math.floor(Math.min(...ys))-2),
       bottom=Math.min(H-1,Math.ceil(Math.max(...ys))+2);
 for(let y=top;y<=bottom;y++)for(let x=left;x<=right;x++){
  let u=(x-left)/Math.max(1,right-left),v=(y-top)/Math.max(1,bottom-top);
  for(let iteration=0;iteration<5;iteration++){
   const px=(1-u)*(1-v)*a[0]+u*(1-v)*b[0]+u*v*c[0]+(1-u)*v*d[0];
   const py=(1-u)*(1-v)*a[1]+u*(1-v)*b[1]+u*v*c[1]+(1-u)*v*d[1];
   const dxdu=(1-v)*(b[0]-a[0])+v*(c[0]-d[0]);
   const dxdv=(1-u)*(d[0]-a[0])+u*(c[0]-b[0]);
   const dydu=(1-v)*(b[1]-a[1])+v*(c[1]-d[1]);
   const dydv=(1-u)*(d[1]-a[1])+u*(c[1]-b[1]);
   const determinant=dxdu*dydv-dxdv*dydu;
   if(Math.abs(determinant)<1e-7)break;
   const ex=px-x,ey=py-y;
   u-=(ex*dydv-ey*dxdv)/determinant;
   v-=(ey*dxdu-ex*dydu)/determinant;
  }
  if(u<0||u>1||v<0||v>1)continue;
  const si=(Math.min(511,Math.floor(v*512))*size+Math.min(511,Math.floor(u*512)))*4;
  const di=(y*W+x)*4;
  dest[di]=pixels[si];dest[di+1]=pixels[si+1];dest[di+2]=pixels[si+2];
  dest[di+3]=Math.round(pixels[si+3]*.93);
 }
 ctx.putImageData(im,0,0);
 return out.toDataURL('image/png');
}

/* The outer four corners control the ENTIRE physical framed asset.
   The old frameCorners control only the internal clue inset; both are mapped
   into one rendered image before the final perspective transform. */
const defaultOuterVertices=[[0,0],[214,0],[214,563],[0,563]];
function outerFrameVertices(){
 return window.DungeonPlacement?.frameOuterCorners?.()||defaultOuterVertices;
}
let frameSourcePromise=null;
function physicalFrameSource(){
 if(!frameSourcePromise)frameSourcePromise=new Promise(resolve=>{
  const img=new Image();img.onload=()=>resolve(img);
  img.onerror=()=>{frameSourcePromise=null;resolve(null)};
  img.src=AS+'room/image_board_wide.webp';
 });
 return frameSourcePromise;
}
function warpWholeFrame(source){
 const W=214,H=563,corners=outerFrameVertices(),[a,b,c,d]=corners;
 const src=source.getContext('2d',{willReadFrequently:true}).getImageData(0,0,W,H).data;
 const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;
 const ctx=canvas.getContext('2d');if(!ctx)throw Error('Frame perspective canvas unavailable');
 const out=ctx.createImageData(W,H),dest=out.data;
 const xs=corners.map(v=>v[0]),ys=corners.map(v=>v[1]);
 const left=Math.max(0,Math.floor(Math.min(...xs))-2),right=Math.min(W-1,Math.ceil(Math.max(...xs))+2);
 const top=Math.max(0,Math.floor(Math.min(...ys))-2),bottom=Math.min(H-1,Math.ceil(Math.max(...ys))+2);
 for(let y=top;y<=bottom;y++)for(let x=left;x<=right;x++){
  let u=(x-left)/Math.max(1,right-left),v=(y-top)/Math.max(1,bottom-top);
  for(let n=0;n<6;n++){
   const fx=(1-u)*(1-v)*a[0]+u*(1-v)*b[0]+u*v*c[0]+(1-u)*v*d[0]-x;
   const fy=(1-u)*(1-v)*a[1]+u*(1-v)*b[1]+u*v*c[1]+(1-u)*v*d[1]-y;
   const ux=(1-v)*(b[0]-a[0])+v*(c[0]-d[0]);
   const uy=(1-v)*(b[1]-a[1])+v*(c[1]-d[1]);
   const vx=(1-u)*(d[0]-a[0])+u*(c[0]-b[0]);
   const vy=(1-u)*(d[1]-a[1])+u*(c[1]-b[1]);
   const det=ux*vy-vx*uy;
   if(Math.abs(det)<1e-7)break;
   u-=(fx*vy-fy*vx)/det;v-=(fy*ux-fx*uy)/det;
  }
  if(u<0||u>1||v<0||v>1)continue;
  const si=(Math.min(H-1,Math.floor(v*H))*W+Math.min(W-1,Math.floor(u*W)))*4;
  const di=(y*W+x)*4;
  for(let k=0;k<4;k++)dest[di+k]=src[si+k];
 }
 ctx.putImageData(out,0,0);
 return canvas.toDataURL('image/png');
}
function refreshWideFrame(){
 if(!game)return;
 const player=self(),board=getHotspot('image');
 if(!player||!board)return;
 scramble(player);
 const target=nextPlayer(game,player.id),loadedGame=game;
 const key=clueSignature(target)+':'+player.id+':'+(player.puzzleSolved?'solved':player.pieces.join(','))+
  ':'+frameVertices().flat().map(n=>n.toFixed(3)).join(',')+
  ':'+outerFrameVertices().flat().map(n=>n.toFixed(3)).join(',');
 let preview=board.querySelector('.wide-frame-clue');
 if(!preview){
  preview=document.createElement('img');preview.className='wide-frame-clue';
  preview.alt='';preview.draggable=false;preview.setAttribute('aria-hidden','true');
  board.append(preview);
 }
 if(preview.dataset.frameKey===key)return;
 preview.dataset.frameKey=key;
 const handle=makeClue(target);
 const paint=url=>{
  if(!url||!preview.isConnected||preview.dataset.frameKey!==key||game!==loadedGame)return;
  const clue=new Image();
  clue.onload=async()=>{
   if(!preview.isConnected||preview.dataset.frameKey!==key||game!==loadedGame)return;
   try{
    const physical=await physicalFrameSource();
    if(!physical)throw Error('Original framed artwork did not load');
    const overlay=new Image();
    overlay.onload=()=>{
     if(!preview.isConnected||preview.dataset.frameKey!==key||game!==loadedGame)return;
     try{
      const composite=document.createElement('canvas');
      composite.width=214;composite.height=563;
      const ctx=composite.getContext('2d');
      if(!ctx)throw Error('Cannot render original frame');
      ctx.drawImage(physical,0,0,214,563);
      ctx.drawImage(overlay,0,0,214,563);
      // A single transform moves the picture AND its carved frame together.
      preview.src=warpWholeFrame(composite);
      board.classList.add('whole-frame-composed');
     }catch(error){console.error('[Dungeon Escape] Whole frame warp failed',error);board.classList.remove('whole-frame-composed')}
    };
    overlay.onerror=()=>console.error('[Dungeon Escape] Clue overlay unavailable');
    overlay.src=warpFrameArt(clue,player);
   }catch(error){console.error('[Dungeon Escape] Framed image generation failed',error)}
  };
  clue.src=url;
 };
 if(handle.url)paint(handle.url);else handle.promise.then(paint);
}

window.DungeonWideFrameRefresh=refreshWideFrame;
const oldRender=render;
render=function(){
 oldRender();
 refreshRoomMarkers();
 refreshSolutionGuide();
 refreshSharedClues();
 requestAnimationFrame(refreshWideFrame);
};
const previousCloseView=closeView;
closeView=function(){previousCloseView();requestAnimationFrame(refreshWideFrame)};
drawImagePuzzle=function(player){
 scramble(player);
 const target=nextPlayer(game,player.id);
 const scene=document.createElement('div');scene.className='closeup-image-scene';
 const art=document.createElement('div');art.className='art-stage';
 const frame=document.createElement('div');frame.className='frame-display';
 const border=document.createElement('img');
 border.className='frame-image';border.src=AS+'closeups/image_frame_square.webp';border.alt='';
 frame.append(border);
 const inner=document.createElement('div');inner.className='image-puzzle-inner';
 if(player.puzzleSolved){
  const reveal=document.createElement('img');reveal.className='jigsaw-reveal';reveal.alt='Correctly rotated talismans, four rows of three';
  inner.append(reveal);
  if(!player.clueShared){
   const share=document.createElement('button');
   share.className='frame-share-action';share.type='button';share.textContent='Share with team chat';
   share.addEventListener('click',event=>{
    event.preventDefault();event.stopPropagation();
    const p=self();if(!p||p.id!==player.id||!p.puzzleSolved||p.clueShared)return;
    const posted=perform(()=>shareClue(game,p.id,library));
    if(posted)notify('Clue shared with team chat.');
   });
   inner.append(share);
  }
 }else{
  const grid=document.createElement('div');grid.className='jigsaw-grid';grid.id='jigsawGrid';
  const frag=document.createDocumentFragment();
  for(let position=0;position<16;position++){
   const original=player.pieces[position];
   const tile=document.createElement('button');tile.type='button';tile.className='jigsaw-tile'+(selectedTile===position?' selected':'');
   tile.setAttribute('aria-label','Puzzle piece in position '+(position+1));
   tile.style.backgroundPosition=(original%4*100/3)+'% '+(Math.floor(original/4)*100/3)+'%';
   tile.addEventListener('click',()=>{
    if(self()?.id!==player.id)return;
    if(selectedTile<0){selectedTile=position;drawImagePuzzle(player);return}
    if(selectedTile===position){selectedTile=-1;drawImagePuzzle(player);return}
    const first=selectedTile;
    [player.pieces[first],player.pieces[position]]=[player.pieces[position],player.pieces[first]];
    selectedTile=-1;
    if(player.pieces.every((piece,i)=>piece===i)){
     perform(()=>completePuzzle(game,player.id));
    }else{save();drawImagePuzzle(player)}
   });
   frag.append(tile);
  }
  grid.append(frag);inner.append(grid);
 }
 frame.append(inner);
 // The destination emblem is painted inside the completed clue itself.
 art.append(frame);scene.append(art);
 $('viewContent').replaceChildren(scene);
 paintClueWhenReady(player,target);
};
window.DungeonRoomIdentity=roomIdentity;
if(game)render();
})();
