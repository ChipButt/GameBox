/* Dungeon Escape V7 — full-bleed front-on close-ups.
   No modal cards, text panels, headers, visible navigation or action buttons.
   Mechanism artwork remains the interaction surface. */
(()=>{
'use strict';
drawImagePuzzle=function(player){
 scramble(player);
 const target=nextPlayer(game,player.id),src=imagePathFor(player);
 const scene=document.createElement('div');
 scene.className='closeup-image-scene';
 const art=document.createElement('div');
 art.className='art-stage';
 art.innerHTML='<div class="frame-display"><img class="frame-image" src="'+AS+'closeups/image_frame_square.webp" alt="Engraved stone picture frame"><div class="image-puzzle-inner">'+
  (player.puzzleSolved?'<img class="jigsaw-reveal" src="'+src+'" alt="Talisman clue for '+escapeHTML(target.name)+'">':'<div class="jigsaw-grid" id="jigsawGrid"></div>')+
 '</div></div>';
 scene.append(art);
 $('viewContent').replaceChildren(scene);
 if(player.puzzleSolved)return;
 const grid=$('jigsawGrid'),frag=document.createDocumentFragment();
 for(let index=0;index<player.pieces.length;index++){
  const original=player.pieces[index];
  const tile=document.createElement('button');
  tile.type='button';
  tile.className='jigsaw-tile'+(selectedTile===index?' selected':'');
  tile.setAttribute('aria-label','Piece '+(original+1)+' in position '+(index+1));
  tile.style.backgroundImage="url('"+src+"')";
  tile.style.backgroundPosition=(original%4*100/3)+'% '+(Math.floor(original/4)*100/3)+'%';
  tile.addEventListener('click',()=>{
   if(selectedTile<0){selectedTile=index;drawImagePuzzle(player);return}
   if(selectedTile===index){selectedTile=-1;drawImagePuzzle(player);return}
   const held=player.pieces[selectedTile];
   player.pieces[selectedTile]=player.pieces[index];
   player.pieces[index]=held;
   selectedTile=-1;
   if(player.pieces.every((v,i)=>v===i)){
    perform(()=>completePuzzle(game,player.id));
   }else{save();drawImagePuzzle(player)}
  });
  frag.append(tile);
 }
 grid.append(frag);
};
function pipeHitZone(side,player){
 const zone=document.createElement('div');
 zone.className='pipe-touch-zone '+side;
 zone.setAttribute('role','button');
 zone.setAttribute('aria-label',side==='left'?'Use valve wheel on gold pipe':'Use valve wheel on shield pipe');
 zone.setAttribute('tabindex',player.wheelCollected&&!player.reward?'0':'-1');
 zone.setAttribute('aria-disabled',player.wheelCollected&&!player.reward?'false':'true');
 function claim(){
  const p=self();
  if(!p||p.id!==player.id||p.reward||!p.wheelCollected)return;
  const choice=side==='left'?'gold':'shield';
  // Save the fully positioned water before the reward rerenders the stage.
  // The layout editor provides the correct geometry for this device/view.
  const oldWater=$('viewContent').querySelector('.pipes-stage .pipe-water.'+side);
  const filledTop=oldWater?.style.top||'19.5%';
  const filledHeight=oldWater?.style.height||'49.5%';
  const result=perform(()=>claimPrize(game,p.id,choice));
  if(!result)return;
  const stage=$('viewContent').querySelector('.pipes-stage');
  const water=stage?.querySelector('.pipe-water.'+side);
  const cssClass=choice==='gold'?'drained-left':'drained-right';
  if(stage&&water){
   // Restore the full tube instantly; never animate the initial layout.
   stage.classList.remove(cssClass);
   water.style.top=filledTop;
   water.style.height=filledHeight;
   void water.offsetHeight;
   // Only the player turning the wheel should trigger the 2.2s drain.
   stage.classList.add('drain-animating');
   water.addEventListener('transitionend',event=>{
    if(event.propertyName==='height')stage.classList.remove('drain-animating');
   });
   requestAnimationFrame(()=>{
    if(!water.isConnected)return;
    stage.classList.add(cssClass);
    water.style.top='68%';
    water.style.height='0%';
   });
  }
 }
 zone.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();claim()});
 zone.addEventListener('keydown',event=>{
  if(event.key==='Enter'||event.key===' '){event.preventDefault();claim()}
 });
 return zone;
}
drawPipes=function(player){
 const scene=document.createElement('div');
 scene.className='closeup-pipes-scene';
 const art=document.createElement('div');
 art.className='art-stage pipes-stage'+(player.reward==='gold'?' drained-left':player.reward==='shield'?' drained-right':'');
 art.setAttribute('aria-label','Two bronze prize pipes, gold on the left and a protective shield on the right');
 art.innerHTML='<div class="pipe-water left"></div><div class="pipe-water right"></div>'+
 (player.reward==='gold'?'':'<img class="pipe-prize left" src="'+AS+'rewards/gold_sack.webp" alt="">')+
 (player.reward==='shield'?'':'<img class="pipe-prize right" src="'+AS+'rewards/brm-original-shield.svg" alt="">')+
 '<img class="pipe-structure" src="'+AS+'closeups/pipes.webp" alt="">'+
 (player.reward?'<img class="pipe-valve '+(player.reward==='gold'?'left':'right')+'" src="'+AS+'rewards/wheel_broken.webp" alt="">':
 (player.wheelCollected?'<img class="pipe-available-wheel" src="'+AS+'rewards/wheel_intact.webp" alt="">':''));
 art.append(pipeHitZone('left',player),pipeHitZone('right',player));
 scene.append(art);
 $('viewContent').replaceChildren(scene);
};
/* Tap outside the physical artwork to walk back to the room.
   Escape also works through the existing keyboard handler. */
$('viewContent').addEventListener('click',event=>{
 if(!view)return;
 const target=event.target;
 if(target?.closest?.('.art-stage, .floor-talisman, .pipe-touch-zone'))return;
 closeView();
});
/* Swipe down on the empty background is an additional mobile exit gesture. */
let backdropSwipe=null;
$('viewContent').addEventListener('pointerdown',event=>{
 if(event.target?.closest?.('.art-stage,.floor-talisman,.pipe-touch-zone'))return;
 backdropSwipe={pointerId:event.pointerId,startY:event.clientY};
});
$('viewContent').addEventListener('pointerup',event=>{
 const start=backdropSwipe;backdropSwipe=null;
 if(!start||start.pointerId!==event.pointerId)return;
 if(event.clientY-start.startY>90&&view)closeView();
});
$('viewShell').setAttribute('aria-description','Tap outside the mechanism or press Escape to return to the dungeon.');
})();
