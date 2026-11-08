/* Dungeon Escape V5: physical pointer drag, nearest-empty-socket snapping.
   Loaded after the V4 game rules. No changes to score, puzzle answers or saves. */
(()=>{
'use strict';
const oldStoneNode=stoneNode,oldRender=render,oldCloseView=closeView;
const panel=getHotspot('panel');
const wideLayer=document.createElement('span');
wideLayer.id='roomWideSockets';
wideLayer.className='room-wide-sockets';
wideLayer.setAttribute('aria-hidden','true');
panel?.append(wideLayer);
let dragging=null,ignoreClickUntil=0;
function wideWall(player){
 wideLayer.replaceChildren();
 if(!player)return;
 const frag=document.createDocumentFragment();
 (player.slots||[]).forEach((slot,i)=>{
  if(!slot)return;
  const xy=coords(i),img=document.createElement('img');
  img.src=AS+'talismans/'+slot.symbol+'_front.webp';
  img.className='room-wide-stone';img.alt='';
  img.style.left=xy.x+'%';img.style.top=xy.y+'%';
  img.style.rotate=(slot.rotation*90)+'deg';
  frag.append(img);
 });
 wideLayer.append(frag);
}
render=function(){oldRender();wideWall(self())};
function targets(ctx,player){
 const output=[];
 if(ctx==='inspection'){
  const sockets=[...document.querySelectorAll('.panel-stage .panel-socket')];
  for(let i=0;i<12;i++){
   if(player.slots?.[i]||!sockets[i])continue;
   const r=sockets[i].getBoundingClientRect();
   if(r.width>0&&r.height>0)output.push({
    index:i,x:r.left+r.width/2,y:r.top+r.height/2,
    radius:Math.max(28,Math.min(55,r.width*.88)),element:sockets[i]
   });
  }
 }else if(panel){
  const r=panel.getBoundingClientRect();
  if(r.width<=0||r.height<=0)return output;
  for(let i=0;i<12;i++){
   if(player.slots?.[i])continue;
   const xy=coords(i);
   output.push({
    index:i,x:r.left+xy.x*r.width/100,y:r.top+xy.y*r.height/100,
    radius:Math.max(23,Math.min(47,r.width*.082)),element:null
   });
  }
 }
 return output;
}
function nearest(ctx,player,x,y){
 let best=null;
 for(const t of targets(ctx,player)){
  const distance=Math.hypot(t.x-x,t.y-y);
  if(distance<=t.radius&&(!best||distance<best.distance))best={...t,distance};
 }
 return best;
}
function highlight(ctx,target){
 document.querySelectorAll('.panel-socket.snap-candidate').forEach(el=>el.classList.remove('snap-candidate'));
 wideLayer.querySelectorAll('.wide-snap-indicator').forEach(el=>el.remove());
 if(!target)return;
 if(ctx==='inspection')target.element?.classList.add('snap-candidate');
 else{
  const xy=coords(target.index),marker=document.createElement('span');
  marker.className='wide-snap-indicator';
  marker.style.left=xy.x+'%';marker.style.top=xy.y+'%';
  wideLayer.append(marker);
 }
}
function endDrag(){
 const d=dragging;if(!d)return null;
 dragging=null;
 window.removeEventListener('pointermove',d.move);
 window.removeEventListener('pointerup',d.up);
 window.removeEventListener('pointercancel',d.cancel);
 d.button.classList.remove('drag-source');
 highlight(d.ctx,null);
 return d;
}
function removeGhost(ghost,target){
 if(!ghost)return;
 if(!target){ghost.remove();return}
 ghost.style.transition='left 160ms ease-out,top 160ms ease-out,transform 160ms ease-out,opacity 160ms ease-out';
 ghost.style.left=target.x+'px';ghost.style.top=target.y+'px';
 ghost.style.transform='translate(-50%,-50%) scale(.53)';
 ghost.style.opacity='0';
 setTimeout(()=>ghost.remove(),190);
}
function attachDrag(button,piece,ctx,player){
 let suppressThisClick=false;
 button.addEventListener('click',event=>{
  if(!suppressThisClick)return;
  event.preventDefault();event.stopImmediatePropagation();
  suppressThisClick=false;
 },true);
 button.addEventListener('pointerdown',event=>{
  if(mobileEditing||player.talismansSolved||dragging||event.button>0)return;
  if(!floorPile(player).some(x=>x.position===piece.position&&x.symbol===piece.symbol))return;
  const origin={x:event.clientX,y:event.clientY};
  const rect=button.getBoundingClientRect();
  const d={id:event.pointerId,button,piece,ctx,playerId:player.id,moved:false,ghost:null};
  dragging=d;
  d.move=e=>{
   if(!dragging||e.pointerId!==d.id)return;
   if(!d.moved&&Math.hypot(e.clientX-origin.x,e.clientY-origin.y)<7)return;
   if(!d.moved){
    d.moved=true;button.classList.add('drag-source');
    const ghost=document.createElement('img');
    ghost.src=AS+'talismans/'+piece.symbol+'_angled.webp';
    ghost.alt='';ghost.className='drag-stone-ghost';
    ghost.style.width=Math.max(38,rect.width)+'px';
    ghost.style.height=Math.max(38,rect.height)+'px';
    document.body.append(ghost);
    d.ghost=ghost;
   }
   if(e.cancelable)e.preventDefault();
   d.ghost.style.left=e.clientX+'px';d.ghost.style.top=e.clientY+'px';
   const current=self();
   const hit=current?.id===d.playerId?nearest(ctx,current,e.clientX,e.clientY):null;
   highlight(ctx,hit);
   d.ghost.classList.toggle('near-socket',!!hit);
  };
  d.up=e=>{
   if(!dragging||e.pointerId!==d.id)return;
   const current=self(),wasMoved=d.moved;
   const hit=wasMoved&&current?.id===d.playerId&&!current.talismansSolved?
      nearest(ctx,current,e.clientX,e.clientY):null;
   endDrag();
   if(!wasMoved)return; // Original button's click continues to provide tap placement.
   if(e.cancelable)e.preventDefault();
   e.stopPropagation();
   suppressThisClick=true;
   ignoreClickUntil=Date.now()+350;
   if(!hit||!current){
    removeGhost(d.ghost);
    notify('Release close to an empty socket to snap the stone into it.');
    return;
   }
   const stillOnFloor=floorPile(current).some(x=>x.position===piece.position&&x.symbol===piece.symbol);
   if(!stillOnFloor||current.slots[hit.index]){removeGhost(d.ghost);return}
   selected=null;selectedStoneId=-1;focusSocket=hit.index;
   const placed=perform(()=>putTalisman(game,current.id,hit.index,piece.symbol,0));
   removeGhost(d.ghost,placed?hit:null);
   if(placed)notify(symbolName(piece.symbol)+' snapped into hole '+(hit.index+1)+'. Tap to rotate.');
  };
  d.cancel=e=>{
   if(e.pointerId!==d.id)return;
   const state=endDrag();removeGhost(state?.ghost);
  };
  window.addEventListener('pointermove',d.move,{passive:false});
  window.addEventListener('pointerup',d.up);
  window.addEventListener('pointercancel',d.cancel);
 });
}
stoneNode=function(piece,ctx,player){
 const node=oldStoneNode(piece,ctx,player);
 attachDrag(node,piece,ctx,player);
 return node;
};
document.addEventListener('click',event=>{
 if(event.detail>0&&Date.now()<ignoreClickUntil){
  event.preventDefault();event.stopImmediatePropagation();
  ignoreClickUntil=0;
 }
},true);
closeView=function(){
 const d=endDrag();removeGhost(d?.ghost);
 oldCloseView();
};
if(game)render();
})();