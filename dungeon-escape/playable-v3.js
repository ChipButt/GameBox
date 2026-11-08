
/* Dungeon Escape V3 — additions to the existing deterministic GameBox test rules. */
(()=>{
'use strict';
const arrows=['↑','→','↓','←'];
const K='gamebox.players.v1';
const node=id=>document.getElementById(id);
let isClosing=false,openSource='image';
function prefersReduced(){return !!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches)}
function roster(){
 try{const items=JSON.parse(localStorage.getItem(K)||'[]');if(!Array.isArray(items))return [];
  const seen=new Set();return items.filter(p=>p&&typeof p.name==='string').map(p=>p.name.trim()).filter(n=>{
    if(!n||n.length>32||seen.has(n.toLowerCase()))return false;seen.add(n.toLowerCase());return true;
  }).slice(0,20);
 }catch{return []}
}
function setupGameBoxRoster(){
 const b=node('useGameboxRoster');if(!b)return;
 const names=roster();b.hidden=names.length<2;
 b.addEventListener('click',()=>{
  const latest=roster();if(latest.length<2){notify('Add at least two players on the GameBox home screen.');return;}
  node('teamSize').value=latest.length;
  node('playerNames').value=latest.join('\n');
  notify(latest.length+' GameBox players loaded for this local dungeon game.');
 });
}
function activePlayer(){return self()}
function renderSolutions(){
 const target=node('solutionBody');if(!game||!library||!target)return;
 const p=activePlayer(),previous=previousPlayer(game,p.id),next=nextPlayer(game,p.id);
 const code=codeFor(library,p);
 const slots=code.map((item,i)=>'<div class="solution-cell" title="Socket '+(i+1)+'">'+
  '<span class="slot-index">'+String(i+1).padStart(2,'0')+'</span><strong>'+escapeHTML(symbolName(item.symbol))+'</strong>'+
  '<span class="orientation">'+DIRECTIONS[item.rotation]+' '+arrows[item.rotation]+'</span></div>').join('');
 target.innerHTML='<p class="solution-legend"><strong>Playing as '+escapeHTML(p.name)+'</strong><br>'+
  'The restored picture held by <strong>'+escapeHTML(previous.name)+'</strong> shows the talisman order below. Your picture reveals the answer for <strong>'+escapeHTML(next.name)+'</strong>.</p>'+
  '<div class="solution-mini"><span>Image: '+(p.puzzleSolved?'Solved':'3×3 · tiles 1–9')+'</span><span>Wall: '+(p.talismansSolved?'Unlocked':'12 sockets')+'</span></div>'+
  '<p class="solution-legend"><strong>12-socket answer · read left to right, top to bottom</strong></p>'+
  '<div class="solution-grid" aria-label="Twelve talisman positions and directions">'+slots+'</div>'+
  '<p class="subtle">Directions: N up, E right, S down, W left. This answer is deliberately visible in the local testing build, not to players in the final Traitors mission.</p>';
 const fill=node('fillSolution');
 fill.disabled=!!p.talismansSolved;
 fill.textContent=p.talismansSolved?'Talisman wall unlocked':'Fill the 12 sockets (test shortcut)';
 const note=node('currentStepNote');
 if(note){
  note.textContent=p.reward?'Prize claimed: '+(p.reward==='gold'?'gold for the pot.':'personal shield.'):
   p.wheelCollected?'Choose one of the two prizes. The wheel breaks after use.':
   p.safeOpen?'Collect the single valve wheel from the safe.':
   p.talismansSolved?'Open the unlocked safe and take its wheel.':
   p.puzzleSolved?'Share the image clue, then arrange the talismans using the previous player’s clue.':
   'Restore the nine picture pieces, then share the revealed clue with the next player.';
 }
 const nextButton=node('nextPlayerBtn');
 if(nextButton){
  nextButton.hidden=!p.reward;
  nextButton.textContent=status(game).complete?'See the completed mission':'Continue as '+next.name;
 }
}
function renderFinal(){
 const card=node('missionResult');if(!card||!game)return;
 const s=status(game);card.hidden=!s.complete;
 if(!s.complete)return;
 const claimed=game.players.map(p=>'<li>'+escapeHTML(p.name)+': <strong>'+(p.reward==='gold'?'Gold':'Shield')+'</strong></li>').join('');
 card.innerHTML='<p class="eyebrow">ALL PLAYERS FINISHED</p><h2>Dungeon escaped</h2>'+
  '<p>Team gold collected: <strong>'+money(s.goldPot)+'</strong><br>Shields claimed: <strong>'+s.shieldWinners.length+'</strong></p>'+
  '<ul>'+claimed+'</ul><p class="subtle">Local GameBox game only. The pot and shields have not been sent to BRM Traitors Live or Workshop.</p>';
}
function nextTurn(){
 if(!game)return;
 const p=activePlayer();const remaining=game.players.filter(x=>!x.reward);
 if(remaining.length===0){
  if(view)closeView();
  node('missionResult')?.scrollIntoView?.({block:'nearest',behavior:'smooth'});
  return;
 }
 asPlayer=remaining.find(x=>x.index>p.index)?.id||remaining[0].id;
 if(view)closeView();render();
 window.scrollTo?.({top:0,behavior:'smooth'});
 notify('Now playing as '+activePlayer().name);
}
function fillTestSolution(){
 if(!game||!library)return;
 const p=activePlayer();
 if(p.talismansSolved){notify('This wall is already unlocked.');return}
 const entries=codeFor(library,p);
 const done=perform(()=>{
  entries.forEach((entry,i)=>putTalisman(game,p.id,i,entry.symbol,entry.rotation));
  return checkTalismans(game,p.id,library);
 });
 if(done){setView('talismans');notify('All 12 sockets set correctly. The safe has unlocked.')}
}
function fromRoom(kind){return getHotspot(kind==='talismans'?'panel':kind)}
function geometry(which){
 const el=fromRoom(which),panel=node('viewShell')?.querySelector('.view-panel');
 if(!el||!panel)return null;
 const a=el.getBoundingClientRect(),b=panel.getBoundingClientRect();
 const dx=a.left+a.width/2-b.left-b.width/2,dy=a.top+a.height/2-b.top-b.height/2;
 const scale=Math.max(.06,Math.min(.66,Math.min(a.width/Math.max(1,b.width),a.height/Math.max(1,b.height))));
 return {dx,dy,scale,panel};
}
function zoomFrames(g,reverse){
 const from={opacity:.1,filter:'blur(3px)',transform:'translate('+g.dx+'px,'+g.dy+'px) scale('+g.scale+')'};
 const to={opacity:1,filter:'blur(0)',transform:'translate(0px,0px) scale(1)'};
 return reverse?[to,from]:[from,to];
}
const oldSetView=setView;
setView=function(kind){
 if(isClosing)return;
 const opening=!view;
 oldSetView(kind);
 if(opening){
  openSource=kind;
  const g=geometry(kind);
  if(g&&!prefersReduced()&&g.panel.animate){
   g.panel.animate(zoomFrames(g,false),{duration:490,easing:'cubic-bezier(.18,.85,.25,1)'});
  }
 }
};
const oldCloseView=closeView;
closeView=function(){
 if(!view||isClosing)return;
 const g=geometry(openSource);
 if(!g||prefersReduced()||!g.panel.animate){oldCloseView();return}
 isClosing=true;
 const motion=g.panel.animate(zoomFrames(g,true),{duration:270,easing:'cubic-bezier(.55,0,.9,.45)',fill:'forwards'});
 motion.finished.then(()=>{oldCloseView();isClosing=false}).catch(()=>{oldCloseView();isClosing=false});
};
const oldRender=render;
render=function(){oldRender();renderSolutions();renderFinal();};
const oldDrawSafe=drawSafe;
drawSafe=function(p){
 oldDrawSafe(p);
 const art=node('viewContent')?.querySelector('.safe-stage');
 if(!art)return;
 art.title=!p.talismansSolved?'Solve the talisman wall first':p.safeOpen?(p.wheelCollected?'Wheel collected':'Tap to take the wheel'):'Tap the safe to open it';
 if(p.wheelCollected)return;
 art.setAttribute('role','button');art.setAttribute('tabindex','0');
 const click=()=>{
  const current=activePlayer();
  if(!current.talismansSolved){notify('The talisman wall must be unlocked first.');return}
  if(!current.safeOpen){perform(()=>openSafe(game,current.id));notify('The safe is now open. Take the valve wheel.');return}
  if(!current.wheelCollected){perform(()=>collectWheel(game,current.id));notify('Wheel collected. Use it on one of the pipes.');}
 };
 art.addEventListener('click',click);
 art.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();click()}});
};
const oldDrawPipes=drawPipes;
drawPipes=function(p){
 oldDrawPipes(p);
 if(!p.reward)return;
 const guide=node('viewContent')?.querySelector('.mechanism-guide');
 if(!guide)return;
 const button=document.createElement('button');
 button.className='button-primary next-turn';button.type='button';
 button.textContent=status(game).complete?'View mission results':'Continue to next player';
 button.addEventListener('click',nextTurn);
 guide.append(button);
};
function init(){
 setupGameBoxRoster();
 node('fillSolution')?.addEventListener('click',fillTestSolution);
 node('nextPlayerBtn')?.addEventListener('click',nextTurn);
 if(game)render();
}
init();
})();
