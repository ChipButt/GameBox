/* Dungeon Escape V8 — physical, rotated clue artwork and room identity seals.
   The 16-piece puzzle itself remains a swap puzzle, with the clue revealed only at completion.
   Deliberately local/test-only: the existing GameBox simulated chat is retained. */
(()=>{
'use strict';
const sealSymbols=['raven','serpent','dagger','moon','sun'];
const clueCache=new Map();
function roomIdentity(player){
 const i=player.index;
 return {symbol:sealSymbols[i%5],count:Math.floor(i/5)+1};
}
function sealRow(player,location){
 const {symbol,count}=roomIdentity(player);
 const row=document.createElement('span');
 row.className='room-identity-seals '+location;
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
  safe.append(sealRow(player,'under-safe'));
 }
 if(frame){
  frame.querySelector('.room-identity-seals')?.remove();
  frame.append(sealRow(nextPlayer(game,player.id),'under-frame'));
 }
}
function makeClue(target){
 const existing=clueCache.get(target.index);
 if(existing)return existing;
 const result={url:null,promise:null};
 clueCache.set(target.index,result);
 result.promise=Promise.all(sealSymbols.map(symbol=>new Promise(resolve=>{
  const img=new Image();img.onload=()=>resolve([symbol,img]);img.onerror=()=>resolve([symbol,null]);
  img.src=AS+'talismans/'+symbol+'_front.webp';
 }))).then(items=>{
  const icons=Object.fromEntries(items);
  const canvas=document.createElement('canvas');
  const W=960,ctx=canvas.getContext('2d');
  canvas.width=W;canvas.height=W;
  if(!ctx)throw Error('Clue painting is unavailable on this device');
  ctx.fillStyle='#2c201a';ctx.fillRect(0,0,W,W);
  const margin=43,cell=284,gap=10;
  const solutions=codeFor(library,target);
  for(let i=0;i<12;i++){
   const col=i%3,row=Math.floor(i/3),x=margin+col*(cell+gap),y=margin+row*(214+gap);
   const centerX=x+cell/2,centerY=y+107,part=solutions[i];
   ctx.fillStyle='#1a1413';ctx.fillRect(x,y,cell,214);
   ctx.strokeStyle='#98724b';ctx.lineWidth=4;ctx.strokeRect(x+2,y+2,cell-4,210);
   ctx.strokeStyle='#473125';ctx.lineWidth=3;ctx.beginPath();ctx.arc(centerX,centerY,83,0,Math.PI*2);ctx.stroke();
   const asset=icons[part.symbol];
   if(asset){
    ctx.save();ctx.translate(centerX,centerY);ctx.rotate(part.rotation*Math.PI/2);
    ctx.drawImage(asset,-79,-79,158,158);
    ctx.restore();
   }else{
    // Icon-load failures are reported rather than silently substituting direction labels.
    ctx.fillStyle='#b8956d';ctx.beginPath();ctx.arc(centerX,centerY,74,0,2*Math.PI);ctx.fill();
   }
  }
  ctx.strokeStyle='#a27b4b';ctx.lineWidth=9;ctx.strokeRect(8,8,W-16,W-16);
  const url=canvas.toDataURL('image/png');
  result.url=url;return url;
 }).catch(error=>{
  console.error('[Dungeon Escape] Unable to render rotated clue',error);
  clueCache.delete(target.index);return null;
 });
 return result;
}
function paintClueWhenReady(player,target){
 const handle=makeClue(target);
 const apply=url=>{
  if(!url||!game||view!=='image'||self()?.id!==player.id)return;
  const root=$('viewContent');
  const reveal=root.querySelector('.jigsaw-reveal');
  if(reveal)reveal.src=url;
  root.querySelectorAll('.jigsaw-tile').forEach(node=>{node.style.backgroundImage='url("'+url+'")'});
 };
 if(handle.url)apply(handle.url);
 else handle.promise.then(apply);
}
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
  display.append(sealRow(target,'chat-identity'));
  const img=document.createElement('img');img.alt='Rotated talisman solution artwork for '+target.name;
  display.append(img);element.append(display);
  const handle=makeClue(target);
  if(handle.url)img.src=handle.url;
  else handle.promise.then(url=>{if(url&&img.isConnected)img.src=url});
 });
}
const oldShare=shareClue;
shareClue=function(g,id,lib){
 const dest=nextPlayer(g,id);
 oldShare(g,id,lib);
 const message=g.chat[g.chat.length-1];
 message.body='Talisman picture shared for '+dest.name+'. Match the fixed symbols beneath their safe.';
 message.clueTarget=dest.index;
 return message.body;
};
const oldRender=render;
render=function(){
 oldRender();
 refreshRoomMarkers();
 refreshSharedClues();
};
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
 frame.append(sealRow(target,'on-frame'));
 art.append(frame);scene.append(art);
 $('viewContent').replaceChildren(scene);
 paintClueWhenReady(player,target);
};
window.DungeonRoomIdentity=roomIdentity;
if(game)render();
})();
