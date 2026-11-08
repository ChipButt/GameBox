/* Dungeon Escape V6: button-free, hold-to-move talismans and instant unlock.
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
  attachPlacedStone(img,i,'room',player);
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

/* Tap an installed stone to turn it. Hold ~400ms to lift it;
   releasing over another empty socket moves it, while a floor drop removes it. */
const AUTO_UNLOCK_TEXT='The twelve talismans are correctly aligned. The safe has unlocked.';
function tryUnlock(g,id){
 const p=playerFor(g,id);
 if(p.talismansSolved)return;
 if(checkTalismans(g,id,library))notify(AUTO_UNLOCK_TEXT);
}
const originalPut=putTalisman,originalRotate=rotateTalisman;
putTalisman=function(g,id,position,symbol,rotation=0){
 const value=originalPut(g,id,position,symbol,rotation);
 tryUnlock(g,id);
 return value;
};
rotateTalisman=function(g,id,index){
 const value=originalRotate(g,id,index);
 tryUnlock(g,id);
 return value;
};
let placedDrag=null;
function insideFloor(ctx,x,y){
 const root=ctx==='room'?$('roomStage'):document.querySelector('.floor-inspection');
 if(!root)return false;
 const r=root.getBoundingClientRect();
 if(!r.width||!r.height)return false;
 if(ctx==='room'){
  return x>=r.left&&x<=r.right&&y>=r.top+r.height*.755&&y<=r.bottom;
 }
 return x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom;
}
function clearWallHighlight(){
 document.querySelectorAll('.panel-socket.snap-candidate').forEach(x=>x.classList.remove('snap-candidate'));
 wideLayer.querySelectorAll('.wide-snap-indicator').forEach(x=>x.remove());
}
function detachPlaced(){
 const d=placedDrag;if(!d)return null;
 placedDrag=null;
 clearTimeout(d.timer);
 window.removeEventListener('pointermove',d.move);
 window.removeEventListener('pointerup',d.up);
 window.removeEventListener('pointercancel',d.cancel);
 d.element.classList.remove('holding','drag-source');
 clearWallHighlight();
 return d;
}
function attachPlacedStone(element,index,ctx,player){
 if(!player.slots[index]||player.talismansSolved)return;
 element.classList.add('movable');
 element.setAttribute('title','Tap to rotate; hold and drag to move');
 // Wide-view stones need to stop the surrounding panel from zooming in.
 let blockClick=false;
 element.addEventListener('click',event=>{
  if(blockClick){
   blockClick=false;event.preventDefault();event.stopImmediatePropagation();event.stopPropagation();return;
  }
  if(ctx==='room'){
   event.preventDefault();event.stopPropagation();
   const current=self();
   if(current?.id===player.id&&current.slots[index]&&!current.talismansSolved)
    perform(()=>rotateTalisman(game,current.id,index));
  }
 },true);
 element.addEventListener('pointerdown',event=>{
  if(event.button>0||mobileEditing||placedDrag||player.talismansSolved)return;
  if(self()?.id!==player.id||!player.slots[index])return;
  const origin={x:event.clientX,y:event.clientY};
  const d={id:event.pointerId,playerId:player.id,index,ctx,element,
   origin,held:false,moved:false,timer:null,ghost:null};
  placedDrag=d;
  if(ctx==='room')event.stopPropagation();
  d.timer=setTimeout(()=>{
   if(placedDrag!==d)return;
   d.held=true;element.classList.add('holding');
   const ghost=document.createElement('img');
   ghost.src=AS+'talismans/'+player.slots[index].symbol+'_front.webp';
   ghost.alt='';ghost.className='drag-stone-ghost drag-wall-ghost';
   const r=element.getBoundingClientRect();
   ghost.style.width=Math.max(34,r.width)+'px';ghost.style.height=Math.max(34,r.height)+'px';
   ghost.style.left=origin.x+'px';ghost.style.top=origin.y+'px';
   document.body.append(ghost);d.ghost=ghost;
   notify('Stone lifted. Move it to another empty hole or drop it on the floor.');
  },390);
  d.move=ev=>{
   if(placedDrag!==d||ev.pointerId!==d.id)return;
   const dx=ev.clientX-origin.x,dy=ev.clientY-origin.y;
   if(!d.held){
    if(Math.hypot(dx,dy)>12){clearTimeout(d.timer);d.timer=null;}
    return;
   }
   if(ev.cancelable)ev.preventDefault();
   d.moved=d.moved||Math.hypot(dx,dy)>5;
   d.ghost.style.left=ev.clientX+'px';d.ghost.style.top=ev.clientY+'px';
   element.classList.add('drag-source');
   // The original occupied position is deliberately excluded from available targets.
   const current=self();
   highlight(ctx,current?.id===d.playerId?nearest(ctx,current,ev.clientX,ev.clientY):null);
  };
  d.up=ev=>{
   if(placedDrag!==d||ev.pointerId!==d.id)return;
   const current=self(),wasHeld=d.held;
   const target=wasHeld&&d.moved&&current?.id===d.playerId?nearest(ctx,current,ev.clientX,ev.clientY):null;
   const onFloor=wasHeld&&d.moved&&insideFloor(ctx,ev.clientX,ev.clientY);
   const ghost=d.ghost;
   detachPlaced();
   if(!wasHeld)return;
   blockClick=true;
   ev.preventDefault();ev.stopPropagation();
   if(!current||current.id!==d.playerId||current.talismansSolved){removeGhost(ghost);return}
   if(target&&target.index!==index&&!current.slots[target.index]){
    const present=current.slots[index];
    if(present){
     perform(()=>{
      clearTalisman(game,current.id,index);
      putTalisman(game,current.id,target.index,present.symbol,present.rotation);
      return true;
     });
     focusSocket=target.index;
     removeGhost(ghost,target);
     notify('Stone moved to hole '+(target.index+1)+'.');
     return;
    }
   }
   if(onFloor){
    perform(()=>clearTalisman(game,current.id,index));
    selected=null;selectedStoneId=-1;focusSocket=-1;
    removeGhost(ghost);
    notify('Stone returned to the floor.');
   }else{
    removeGhost(ghost); // Missed placement: stays in its original socket.
   }
  };
  d.cancel=ev=>{
   if(placedDrag!==d||ev.pointerId!==d.id)return;
   const state=detachPlaced();removeGhost(state?.ghost);
  };
  window.addEventListener('pointermove',d.move,{passive:false});
  window.addEventListener('pointerup',d.up);
  window.addEventListener('pointercancel',d.cancel);
 });
}
const originalSocketButton=socketButton;
socketButton=function(slot,i){
 const node=originalSocketButton(slot,i);
 if(slot)attachPlacedStone(node,i,'inspection',self());
 return node;
};
const oldClose=closeView;
closeView=function(){
 const d=detachPlaced();removeGhost(d?.ghost);
 oldClose();
};

if(game)render();
})();