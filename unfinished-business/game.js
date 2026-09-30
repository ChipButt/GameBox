import {MATERIALS,RUN_MAX,initial,sanitize,newRun,runSpeed,runCapacity,overlap,rayBlocked} from './model.js?v=20260927m';
import {WORLD,LEVELS,SPAWN,FERRY,REGIONS,areaAt,generateWorld} from './world.js?v=20260930a';
import {navigation,createEntities,updateEntities,investigate,resolveSightings,createTokens,updateTokenRespawns,collectTokens} from './entities.js?v=20260930b';
import {createScenery,drawSceneryProp,drawStreetLamp,drawFerry,drawCemeteryExit} from './scenery.js?v=20260930a';
import {drawHuman,drawCat,drawCyclist} from './characters.js?v=20260928a';
const $=id=>document.getElementById(id), canvas=$('world'),ctx=canvas.getContext('2d'),KEY='gamebox.unfinished-business.v1';
let p;try{p=sanitize(JSON.parse(localStorage.getItem(KEY)))}catch{p=initial()}
let world={...generateWorld(p.worldSeed,p.level),blocks:[],decor:[],regions:[]},run=newRun(p.level),saveTimer=0,nav=null,effects={boost:0,stiff:0,energy:0},tokens=[],scenery=null;
let mode='menu',selected='invisibility',held=false,skillPointer=null,stickPointer=null,stickOrigin={x:0,y:0},keys=new Set(),input={x:0,y:0},blocks=[],people=[],ghost={...LEVELS[p.level].spawn,face:1},energy=0,t=0,cam=0,camX=0,viewH=800,last=0,noticeUntil=0,contact=null,contactTime=0,lastSafe={...LEVELS[p.level].spawn},phaseExit=null,seen=0,spawnSafe=true,audio=null,saveFailed=false,tutorial={active:false,stage:0,useTime:0,refillActive:false};
const names={speed:'Speed',invisibility:'Vanish',phase:'Phase'},labels={invisibility:'VANISH',phase:'PHASE',speed:'SPEED'};
let pickupTimers=[];
const LEVEL_TASKS=[
 [
  {id:'grave',title:'Find your grave',hint:'Search the old graves.',x:630,y:1870},
  {id:'notice',title:'Read the funeral notice',hint:'Check the chapel entrance.',x:1900,y:1515},
  {id:'keepsake',title:'Recover the keepsake',hint:'Something is calling from the memorial garden.',x:1860,y:600},
  {id:'hearse',title:'Check the waiting hearse',hint:'See what is happening beside the funeral lawn.',x:1200,y:1220},
  {id:'gatehouse',title:'Remember the way out',hint:'Reach the gatehouse path.',x:1320,y:650}
 ],
 [
  {id:'clock',title:'Find the time clock',hint:'You never clocked out.',x:420,y:1940},
  {id:'locker',title:'Empty your locker',hint:'Something of yours is still here.',x:1160,y:1880},
  {id:'handover',title:'Check the handover',hint:'There was one job left unfinished.',x:1710,y:1050},
  {id:'radio',title:'Return the work radio',hint:'It belongs back in the offices.',x:430,y:390},
  {id:'staffexit',title:'Find the staff exit',hint:'Work is done. Remember the way out.',x:2050,y:350}
 ],
 [
  {id:'list',title:'Find the shopping list',hint:'What did you come here for?',x:410,y:1940},
  {id:'basket',title:'Recover your basket',hint:'You left it near the checkouts.',x:1880,y:1880},
  {id:'shopping',title:'Remember the missing items',hint:'Search the supermarket floor.',x:1450,y:1080},
  {id:'receipt',title:'Find the receipt',hint:'Check near the stockroom.',x:440,y:390},
  {id:'serviceexit',title:'Find the way out',hint:'Reach the service exit.',x:2050,y:350}
 ],
 [
  {id:'parcel',title:'Return the parcel',hint:'You promised you would drop it off.',x:450,y:1900},
  {id:'letter',title:'Post the letter',hint:'It was still in your pocket.',x:450,y:1110},
  {id:'collection',title:'Collect what you left',hint:'Check the delivery alley.',x:1210,y:1900},
  {id:'promise',title:'Keep the promise',hint:'Someone was expecting you at the pub.',x:450,y:390},
  {id:'busstop',title:'Remember the route home',hint:'Reach the bus stop.',x:2050,y:350}
 ],
 [
  {id:'street',title:'Find your street',hint:'This all feels familiar.',x:410,y:1900},
  {id:'park',title:'Remember the park',hint:'You used to cut through here.',x:430,y:1150},
  {id:'shop',title:'Check the corner shop',hint:'One last ordinary memory.',x:1160,y:1900},
  {id:'school',title:'Take the old route',hint:'Follow the road past the school.',x:450,y:390},
  {id:'home',title:'Get home',hint:'You have been trying to get here all along.',x:2050,y:350}
 ]
];
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
function save(){try{localStorage.setItem(KEY,JSON.stringify(p))}catch{saveFailed=true;}}
function note(s,d=4){$('notice').textContent=s;noticeUntil=performance.now()+d*1000;}
function tone(f=440,d=.12){if(!p.sound)return;try{audio??=new(window.AudioContext||window.webkitAudioContext)();audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.setValueAtTime(f,audio.currentTime);o.frequency.exponentialRampToValueAtTime(f*.6,audio.currentTime+d);g.gain.setValueAtTime(.035,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+d);o.connect(g).connect(audio.destination);o.start();o.stop(audio.currentTime+d)}catch{}}
function resetInput(){held=false;skillPointer=null;stickPointer=null;input={x:0,y:0};keys.clear();$('nub').style.transform='';$('stick').hidden=true;}
function footer(){return `<div class="footer"><a href="../index.html"><img src="../shared/assets/GameBox%20back%20button.png" alt="Game Box"></a><button class="sound" id="sound">SOUND ${p.sound?'ON':'OFF'}</button></div>`}
function show(html){resetInput();$('overlay').hidden=false;$('overlay').innerHTML=`<div class="menu">${html}</div>`;document.querySelectorAll('[data-start]').forEach(b=>b.onclick=beginLevel);$('sound')?.addEventListener('click',()=>{p.sound=!p.sound;save();$('sound').textContent=`SOUND ${p.sound?'ON':'OFF'}`});}
function home(){mode='menu';$('hud').hidden=true;$('controls').hidden=true;$('objectiveHud').hidden=true;$('tokenInventory').hidden=true;$('taskButton').hidden=true;show(`<canvas class="brandGhost" id="portrait" width="96" height="110"></canvas><span class="eyebrow">A LITTLE GHOST. A LONG WAY HOME.</span><h1>Unfinished<br><em>Business</em></h1><p class="subtitle">Every place remembers something you left unfinished.</p><div class="record">LEVEL ${p.level+1} · ${LEVELS[p.level].name.toUpperCase()}</div><button class="primary" data-start>${p.runs?'Start this level':'Begin your escape'} →</button>${p.unlockedLevel>0?'<button class="secondary" id="levels">Choose level</button>':''}<button class="secondary" id="help">How to play</button>${footer()}`);const c=$('portrait').getContext('2d');drawGhost(c,48,66,5,1,0);$('levels')?.addEventListener('click',chooseLevel);$('help').onclick=help;}
function chooseLevel(){show(`<span class="eyebrow">CHOOSE LEVEL</span><h2>Unfinished Business</h2><p class="subtitle">Each level starts fresh.</p>${LEVELS.map((l,i)=>`<button class="secondary" data-level="${i}" ${i>p.unlockedLevel?'disabled':''}>${i+1}. ${l.name}${i>p.unlockedLevel?' · LOCKED':''}</button>`).join('')}<button class="secondary" id="menu">Back</button>${footer()}`);document.querySelectorAll('[data-level]').forEach(b=>b.onclick=()=>{p.level=Number(b.dataset.level);save();home()});$('menu').onclick=home;}
function help(){show(`<span class="eyebrow">HOW TO PLAY</span><h2>Finish what you left behind.</h2><div class="help"><p><b>Move</b> by dragging on the play area.</p><p><b>Speed, Vanish and Phase</b> improve when you collect their ghost icons.</p><p><b>Phase</b> opens sealed task rooms. The four sealed rooms require PHASE 1, 2, 3 and 4.</p><p><b>Scared Stiff</b> gold ghosts protect you from being seen. Carry up to 3.</p><p>Complete all <b>5 flashing multicolour ghosts</b> to open the exit.</p></div><button class="primary" id="back">Play</button>`);$('back').onclick=home;}

function shop(result=false,win=false){mode='shop';$('controls').hidden=true;show(`<span class="eyebrow">${win?'UNFINISHED BUSINESS COMPLETE':'CAUGHT'}</span><h2>${win?'The way is open.':'Someone saw you.'}</h2><button class="primary" data-start>${win&&p.level<4?'Next level':'Try again'} →</button><button class="secondary" id="menu">Main menu</button>${footer()}`);$('menu').onclick=home;}

function beginLevel(){
 if(p.level===0&&!p.introSeen){introSequence(0);return}
 if(!pickupTutorialSeen()){tutorialPrompt();return}
 start(false);
}
function introSequence(index=0){
 mode='story';$('hud').hidden=true;$('controls').hidden=true;
 const lines=[
  ['…','Oh, my head.'],
  ['YESTERDAY','Wait. What happened yesterday?'],
  ['UNFINISHED','There were so many things I still had to do. I must have finished some of them‧'],
  ['','Wait. Why can I see through my hands?'],
  ['LEVEL 1 · THE GRAVEYARD','…am I a ghost?']
 ];
 const [tag,text]=lines[index];
 show(`<span class="eyebrow">${tag||' '}</span><canvas class="storyScene" id="storyScene" width="310" height="170"></canvas><div class="storyText">${text}</div><button class="primary" id="storyNext">${index===lines.length-1?'Wake up':'Continue'} →</button>`);
 animateStoryScene(index);
 $('storyNext').onclick=()=>{if(index<lines.length-1)introSequence(index+1);else{p.introSeen=true;save();tutorialPrompt()}};
}
function animateStoryScene(scene){
 const c=$('storyScene');if(!c)return;const g=c.getContext('2d');g.imageSmoothingEnabled=false;
 const loop=now=>{if($('storyScene')!==c)return;g.fillStyle='#0d1821';g.fillRect(0,0,c.width,c.height);
  for(let i=0;i<8;i++){const x=18+i*41,y=130-(i%3)*9;g.fillStyle='#25373a';g.fillRect(x,y,25,35);g.fillStyle='#78827a';g.fillRect(x+3,y+4,19,4);g.fillRect(x+10,y-8,5,16);g.fillRect(x+4,y-2,17,5)}
  g.fillStyle='#172a2c';g.fillRect(0,145,310,25);for(let x=0;x<310;x+=22){g.fillStyle='#33483b';g.fillRect(x,144-(x%4),14,4)}
  if(scene>=3){const alpha=scene===3?.45:.95;drawGhost(g,155,95+Math.sin(now*.003)*3,3,1,now/1000,alpha)}
  else{g.fillStyle='#d6cda344';g.fillRect(138,104,36,26);g.fillStyle='#645d5055';g.fillRect(142,108,28,18)}
  if(scene===1||scene===2){g.fillStyle='#efcf8c';g.font='bold 9px monospace';g.textAlign='center';g.fillText(scene===1?'? ? ?':'TO DO  TO DO  TO DO',155,30)}
  requestAnimationFrame(loop)};requestAnimationFrame(loop);
}
const PICKUP_TUTORIAL_KEY='gamebox.unfinished-business.pickup-tutorial.v1';
function pickupTutorialSeen(){try{return localStorage.getItem(PICKUP_TUTORIAL_KEY)==='1'}catch{return !!p.tutorialSeen}}
function markPickupTutorialSeen(){try{localStorage.setItem(PICKUP_TUTORIAL_KEY,'1')}catch{}p.tutorialSeen=true;save();}
const TUTORIAL_PAGES=[
 {tag:'MOVE',title:'Move',icon:null,body:'Drag anywhere on the play area.'},
 {tag:'SPEED',title:'Speed',icon:'speed',body:'Collect rushing ghosts to move faster.'},
 {tag:'PHASE',title:'Phase',icon:'phase',body:'Collect fading ghosts to raise PHASE. Sealed task rooms require PHASE 1–4.'},
 {tag:'VANISH',title:'Vanish',icon:'invisibility',body:'Collect blue ghosts to extend VANISH. Tap VANISH to hide from witnesses.'},
 {tag:'SCARED STIFF',title:'Scared Stiff',icon:'stiff',body:'Gold ghosts protect you when spotted. Carry up to 3. They respawn.'},
 {tag:'UNFINISHED BUSINESS',title:'Unfinished Business',icon:'task',body:'Touch all 5 flashing multicolour ghosts. Complete all 5 to open the exit.'}
];
function tutorialPrompt(){tutorialPage(0);}
function tutorialPage(index){
 const page=TUTORIAL_PAGES[index],last=index===TUTORIAL_PAGES.length-1;
 const icon=page.icon?`<div class="tutorialPickupIcon ${page.icon}">${pickupIconSvg(page.icon)}</div>`:'';
 mode='story';show(`<div class="tutorialCard pickupTutorial"><span class="eyebrow">${index+1} / ${TUTORIAL_PAGES.length} · ${page.tag}</span>${icon}<h2>${page.title}</h2><p class="tutorialHint">${page.body}</p><button class="primary" id="tutorialNext">${last?'Start the level':'Continue'} →</button></div>`);
 $('tutorialNext').onclick=()=>{if(last){markPickupTutorialSeen();start(false)}else tutorialPage(index+1)};
}
function buildWorldSafely(level){
 const generated=generateWorld(p.worldSeed,level);
 let builtScenery=null,builtNav=null,builtPeople=[],builtTokens=[];
 try{builtNav=navigation(generated.blocks)}catch(err){console.error('Navigation build failed',err)}
 try{builtScenery=createScenery(generated)}catch(err){console.error('Scenery build failed',err)}
 if(!builtScenery){
  const fallback=document.createElement('canvas');fallback.width=WORLD.width;fallback.height=WORLD.height;
  const fc=fallback.getContext('2d');fc.fillStyle='#263a37';fc.fillRect(0,0,fallback.width,fallback.height);
  builtScenery=fallback;
 }
 if(builtNav){
  try{builtPeople=createEntities(builtNav,level)}catch(err){console.error('Entity build failed',err)}
  try{builtTokens=createTokens(builtNav,level)}catch(err){console.error('Token build failed',err)}
 }
 return {generated,builtScenery,builtNav,builtPeople,builtTokens};
}
function updateTokenInventory(){
 const inv=$('tokenInventory');if(!inv)return;
 inv.hidden=mode!=='play';
 const icon=$('stiffIcon');if(icon&&!icon.innerHTML)icon.innerHTML=pickupIconSvg('stiff');
 $('stiffCount').textContent=`${effects.stiff||0} / 3`;
 inv.classList.toggle('empty',!(effects.stiff>0));
}
function moveNamedPeople(pattern,points){
 if(!nav)return;
 const destinations=points.map(q=>nav.nearest(q)).filter(Boolean);if(!destinations.length)return;
 for(const e of people.filter(e=>pattern.test(e.task||''))){
  e.route=destinations.map((q,i)=>({...q,wait:i===destinations.length-1?.8:.15,face:-1.57}));
  e.index=0;e.state='routine';e.path=nav.path(e,e.route[0]);e.wait=0;
 }
}
function applyGraveyardStoryBeat(id){
 if(id==='grave'){
  moveNamedPeople(/Groundskeeper|Grounds assistant/, [{x:1820,y:1810},{x:2050,y:1900}]);
  note('TASK COMPLETE · The grounds staff move away from the old graves.',2.7);
 }else if(id==='notice'){
  moveNamedPeople(/Funeral director|Funeral guest/, [{x:1180,y:1210},{x:1400,y:1200}]);
  note('TASK COMPLETE · The funeral staff begin preparing to leave.',2.7);
 }else if(id==='keepsake'){
  moveNamedPeople(/Caretaker|Gardener/, [{x:1710,y:620},{x:1960,y:540}]);
  note('TASK COMPLETE · Another memory falls into place.',2.7);
 }else if(id==='hearse'){
  moveNamedPeople(/Funeral director|Funeral guest|Mourner/, [{x:1280,y:1110},{x:1360,y:1050}]);
  note('TASK COMPLETE · The service is winding down.',2.7);
 }else if(id==='gatehouse'){
  note('TASK COMPLETE · You remember the way out.',2.7);
 }
}
function findTaskSpot(task,index){
 const base=nav?.nearest({x:task.x,y:task.y})||{x:task.x,y:task.y};if(index===0)return base;
 const clearRoom=q=>{
  if(!q||!nav?.path(world.spawn,q))return false;
  const half=64,r={x:q.x-half,y:q.y-half,w:half*2,h:half*2};
  if(r.x<40||r.y<40||r.x+r.w>WORLD.width-40||r.y+r.h>WORLD.height-40)return false;
  return !blocks.some(b=>!b.open&&r.x<b.x+b.w+8&&r.x+r.w>b.x-8&&r.y<b.y+b.h+8&&r.y+r.h>b.y-8);
 };
 const offsets=[[0,0],[120,0],[-120,0],[0,120],[0,-120],[170,120],[-170,120],[170,-120],[-170,-120],[240,0],[-240,0],[0,240],[0,-240],[240,180],[-240,180],[240,-180],[-240,-180]];
 for(const [ox,oy] of offsets){const q=nav?.nearest({x:task.x+ox,y:task.y+oy});if(clearRoom(q))return q}
 let best=null,bestD=Infinity;
 for(let y=180;y<WORLD.height-180;y+=150)for(let x=180;x<WORLD.width-180;x+=150){
  const q=nav?.nearest({x,y});if(!clearRoom(q))continue;
  const d=(q.x-task.x)**2+(q.y-task.y)**2;if(d<bestD){bestD=d;best=q}
 }
 if(best)return best;
 return nav?.path(world.spawn,base)?base:(nav?.nearest(world.spawn)||base);
}
function prepareLevelTasks(){
 const defs=LEVEL_TASKS[p.level]||LEVEL_TASKS[0];
 run.tasks=defs.map((task,index)=>{
  const q=findTaskSpot(task,index),requiredPhase=index;
  const room=index?{x:q.x-64,y:q.y-64,w:128,h:128,phase:requiredPhase,open:false}:null;
  return {...task,index,requiredPhase,x:q.x,y:q.y,room,complete:false};
 });
 run.exitOpen=false;
}
function completedTaskCount(){return (run.tasks||[]).filter(t=>t.complete).length}
function availableTasks(){return (run.tasks||[]).filter(t=>!t.complete);}
function taskState(task){
 if(task.complete)return 'complete';
 return (task.requiredPhase||0)<=run.phase?'available':'locked';
}
function updateTaskButton(){
 const button=$('taskButton');if(!button)return;
 if(!run.tasks||mode==='menu'){button.hidden=true;return}
 const done=completedTaskCount();
 button.hidden=false;$('taskButtonCount').textContent=`${done} / 5`;
 button.classList.toggle('complete',done===5);
}
function openTaskBoard(initial=false){
 if(!run.tasks)return;
 mode='tasks';resetInput();$('taskButton').hidden=true;
 const done=completedTaskCount(),items=run.tasks.map(task=>{
  const state=taskState(task),req=task.requiredPhase||0;
  const detail=state==='complete'?'Done':state==='locked'
   ?`PHASE ${req} REQUIRED`
   :(()=>{const dx=task.x-ghost.x,dy=task.y-ghost.y,dist=Math.round(Math.hypot(dx,dy)/10)*10;return `${objectiveDirection(dx,dy)} ${dist} paces · ${task.hint}`;})();
  return `<div class="taskItem ${state}"><strong>${task.title}</strong><small class="${state==='available'?'taskDistance':''}">${detail}</small></div>`;
 }).join('');
 const heading=`LEVEL ${p.level+1} · ${LEVELS[p.level].name.toUpperCase()}`;
 show(`<div class="taskBoard"><div class="taskBoardHead"><div><span class="eyebrow">${heading}</span><h2>Unfinished Business</h2></div><button class="taskClose" id="taskClose" aria-label="Close tasks">×</button></div><div class="taskProgress">${done} / 5</div><div class="taskList">${items}</div></div>`);
 $('taskClose').onclick=closeTaskBoard;
}
function closeTaskBoard(){
 mode='play';$('overlay').hidden=true;resetInput();updateTaskButton();updateTokenInventory();updateSkills();
}
function currentObjective(){return null}
function objectiveDirection(dx,dy){const a=Math.atan2(dy,dx),oct=Math.round(a/(Math.PI/4));return ['→','↘','↓','↙','←','↖','↑','↗'][((oct%8)+8)%8];}
function updateObjectiveHud(){
 const box=$('objectiveHud');if(box)box.hidden=true;
 updateTaskButton();
}
function sendFuneralProcession(){
 if(!nav)return;
 const destinations=[{x:1320,y:760},{x:1320,y:610}].map(p=>nav.nearest(p)).filter(Boolean);
 for(const e of people.filter(e=>/Mourner|Funeral director|Funeral guest/.test(e.task||''))){
  if(!destinations.length)continue;
  e.route=destinations.map((q,i)=>({...q,wait:i?.3:.15,face:-1.57}));
  e.index=0;e.state='routine';e.path=nav.path(e,e.route[0]);e.wait=0;
 }
}
function openCemeteryGate(){
 run.exitOpen=true;
 const gate=blocks.find(b=>b.exit);
 if(gate)gate.open=true;
 if(nav)nav=navigation(blocks);
 tone(900,.18);
}
function completeTask(task){
 if(!task||task.complete)return;
 task.complete=true;if(task.room)task.room.open=true;tone(720,.12);
 if(p.level===0)applyGraveyardStoryBeat(task.id);
 const done=completedTaskCount();
 if(done===4)note('ONE TASK LEFT.',2.2);
 if(done===5){
  if(p.level===0){sendFuneralProcession();openCemeteryGate()}else{run.exitOpen=true;tone(900,.18)}
  note('ALL FIVE COMPLETE · THE WAY OUT IS OPEN.',3);
 }else note(`UNFINISHED BUSINESS COMPLETE · ${done}/5`,2.2);
 updateTaskButton();
}
function checkObjectives(){
 if(!run.tasks)return;
 for(const task of availableTasks()){
  if((task.requiredPhase||0)>run.phase)continue;
  if(Math.hypot(ghost.x-task.x,ghost.y-task.y)<46){completeTask(task);break}
 }
}
function toggleAbility(k){
 if(mode!=='play'||!run[k]){if(!run[k])note(`${names[k]} is still locked.`,1.5);return}
 if(selected===k&&held){held=false;note(`${names[k]} cancelled.`,1.2)}
 else{selected=k;held=true;note(`${names[k]} active.`,1.2);tone(300,.06)}
 updateSkills();
}
function start(isTutorial=false){
 mode='play';
 const built=buildWorldSafely(p.level);
 world=built.generated;blocks=world.blocks;nav=built.builtNav;people=built.builtPeople;tokens=built.builtTokens;scenery=built.builtScenery;
 run=newRun(p.level);run.exitOpen=false;effects={boost:0,stiff:0,energy:0};ghost={...world.spawn,face:1};lastSafe={...ghost};phaseExit=null;t=0;seen=0;spawnSafe=true;contact=null;contactTime=0;energy=0;selected='invisibility';tutorial={active:false,stage:0,useTime:0,refillActive:false};prepareLevelTasks();cam=world.spawn.y-viewH*.55;camX=world.spawn.x-240;resetInput();$('overlay').hidden=true;$('hud').hidden=false;$('controls').hidden=false;updateSkills();updateTokenInventory();
 updateObjectiveHud();openTaskBoard(true);
 tone(320);
}
function finish(win=false){if(mode!=='play')return;$('objectiveHud').hidden=true;$('tokenInventory').hidden=true;$('taskButton').hidden=true;p.runs++;if(win){if(p.level<4){p.unlockedLevel=Math.max(p.unlockedLevel,p.level+1);p.level++;}else p.won=true;}save();tone(win?880:160,.3);shop(true,win);}
function pause(){if(mode!=='play')return;save();mode='pause';show(`<span class="eyebrow">TAKE A BREATHER</span><h2>Time stands still.</h2><button class="primary" id="resume">Keep going</button><button class="secondary" id="end">Return home</button>${footer()}`);$('resume').onclick=()=>{mode='play';$('overlay').hidden=true;resetInput()};$('end').onclick=()=>{mode='play';finish()};}
$('pause').onclick=pause;$('taskButton').onclick=()=>{if(mode==='play')openTaskBoard(false)};window.addEventListener('blur',pause);window.addEventListener('pagehide',save);document.addEventListener('visibilitychange',()=>{if(document.hidden)pause()});
const GHOST_PIXELS=['00001111110000','00111111111100','01111111111110','01111111111110','11111111111111','11111111111111','11111111111111','11111111111111','11111111111111','11111111111111','11111111111111','11111111111111','01121122112110','00111011011100','00010000001000'];
function rect(c,x,y,w,h,color){c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),w,h)}
function prop(b){drawSceneryProp(ctx,b);if(!b.open&&b.phase<99&&Math.hypot(b.x+b.w/2-ghost.x,b.y+b.h/2-ghost.y)<180){
 const type=b.kind==='gate'?'GATE':b.kind==='door'?'DOOR':'OBSTACLE',mat=MATERIALS[b.phase].toUpperCase();
 ctx.font='bold 8px sans-serif';ctx.fillStyle='#fff0c5';ctx.textAlign='center';
 ctx.fillText(`${mat} ${type} · PHASE ${b.phase}`,b.x+b.w/2,b.y-13);
}}
function drawEntity(e){
 const {x,y}=e;
 if(e.kind==='camera'){ctx.save();ctx.translate(x,y);ctx.rotate(e.angle);rect(ctx,-8,-4,14,8,'#74858f');rect(ctx,1,-7,19,14,'#c9d1c8');rect(ctx,16,-5,5,10,'#273a44');rect(ctx,7,-3,3,3,e.frozen>0?'#a6f0f2':'#ed8e77');ctx.restore();}
 else if(e.kind==='cat')drawCat(ctx,e,reduced);
 else if(e.kind==='cyclist')drawCyclist(ctx,e,reduced);
 else drawHuman(ctx,e,reduced);
 ctx.textAlign='center';ctx.font='bold 13px sans-serif';
 if(e.frozen>0){ctx.strokeStyle='#bceaf0';ctx.lineWidth=2;ctx.strokeRect(x-20,y-38,40,55);ctx.fillStyle='#c5f9ff';ctx.fillText('✧',x,y-43);}
 else if(e.state==='investigate'||e.state==='search'){ctx.fillStyle='#f3ce87';ctx.fillText('?',x,y-40)}
 else if(e.meow>0){ctx.fillStyle='#c8e888';ctx.fillText('!',x,y-29)}
}
function drawGhost(c,x,y,scale,face,time,alpha=1){c.save();c.globalAlpha=alpha;const bob=reduced?0:Math.round(Math.sin(time*3)*2);c.fillStyle='#09121c66';c.beginPath();c.ellipse(x,y+14*scale,5*scale,1.5*scale,0,0,Math.PI*2);c.fill();const rows=GHOST_PIXELS;for(let j=0;j<rows.length;j++)for(let i=0;i<14;i++){const v=rows[j][i];if(v!=='0')rect(c,x+(i-7)*scale,y+(j-8)*scale+bob,scale,scale,v==='2'?'#c4cccb':'#eeeFec')};if(face!==3){const ex=face===0?-5:face===2?2:-3;for(const ox of [ex,ex+4])rect(c,x+ox*scale,y-3*scale+bob,scale,3*scale,'#142029')}c.restore();}
function skillGlyph(k){
 const body=GHOST_PIXELS.map((row,y)=>[...row].map((v,x)=>v==='0'?'':`<rect x="${x+7}" y="${y+5}" width="1" height="1" fill="${v==='2'?'#bdcec6':'#f0f2e9'}" ${k==='invisibility'?`opacity="${x<5?.22:x<9?.52:.9}"`:''}/>`).join('')).join('');
 const eyes='<path d="M11 10h1v3h-1zm4 0h1v3h-1z" fill="#18313a"/>';
 const shadow='<path d="M9 24h10v1H9zm-2 1h14v2H7zm2 2h10v1H9z" fill="#07151b" opacity=".65"/>';
 const wall='<path d="M15 2h9v23h-9z" fill="#887aa4"/><path d="M16 3h7v1h-7zm0 6h7v1h-7zm0 6h7v1h-7zm0 6h7v1h-7zM19 4h1v5h-1zm-2 6h1v5h-1zm3 6h1v5h-1z" fill="#c0acd5"/>';
 const trails='<path d="M0 9h5v2H0zm2 6h3v2H2zm-2 5h5v2H0z" fill="#b6f7d2"/>';
 const shimmer='<path d="M3 3h1v1H3zm-1 1h3v1H2zm1 1h1v1H3zm21 13h1v1h-1zm-1 1h3v1h-3zm1 1h1v1h-1z" fill="#b6f7d2"/>';
 return `<svg viewBox="0 0 32 30" shape-rendering="crispEdges" aria-hidden="true">${shadow}${k==='phase'?wall:''}${k==='speed'?trails:''}<g>${body}${eyes}</g>${k==='phase'?'<path d="M17 5h3v15h-3z" fill="#ab91c8" opacity=".5"/><path d="m25 10 4 4-4 4v-3h-3v-2h3z" fill="#e6ceff"/>':''}${k==='invisibility'?shimmer:''}</svg>`;
}
function pickupIconSvg(kind){
 const phase=kind==='phase',speed=kind==='speed',vanish=kind==='invisibility',stiff=kind==='stiff',task=kind==='task';
 const main=stiff?'#f0a43c':vanish?'#b9e5ff':speed?'#ddfff2':'#f7fbff',shade=stiff?'#aa5d27':vanish?'#6faecf':speed?'#8eddbf':'#d8e1ea';
 const body=GHOST_PIXELS.map((row,y)=>[...row].map((v,x)=>v==='0'?'':`<rect x="${x+7}" y="${y+5}" width="1" height="1" fill="${task?`hsl(${(x*29+y*17)%360} 85% 68%)`:v==='2'?shade:main}" ${vanish?`opacity="${x<6?.3:x<10?.65:1}"`:''}/>`).join('')).join('');
 const eyes='<path d="M11 10h1v3h-1zm4 0h1v3h-1z" fill="#18313a"/>';
 const trails=speed?'<path d="M0 9h6v2H0zm2 6h5v2H2zm-2 5h7v2H0z" fill="#b6f7d2"/><path d="M1 6h3v1H1zm1 17h4v1H2z" fill="#ecfff8"/>':'';
 const shimmer=vanish?'<path d="M3 4h2v2H3zm20 4h2v2h-2zm-2 13h2v2h-2z" fill="#dff7ff"/>':'';
 const bang=stiff?'<path d="M25 3h2v6h-2zm0 8h2v2h-2z" fill="#fff1b0"/>':'';
 return `<svg viewBox="0 0 32 30" shape-rendering="crispEdges" aria-hidden="true">${trails}<g class="${phase?'phasePulse':''}">${body}${eyes}</g>${shimmer}${bang}</svg>`;
}
function announcePickup(event){
 const box=$('pickupAnnouncement');if(!box)return;
 for(const timer of pickupTimers)clearTimeout(timer);pickupTimers=[];
 box.hidden=false;box.className=`pickupAnnouncement ${event.kind}`;$('pickupIcon').innerHTML=pickupIconSvg(event.kind);$('pickupTitle').textContent=event.title;$('pickupDetail').textContent=event.detail;
 requestAnimationFrame(()=>box.classList.add('show'));
 pickupTimers.push(setTimeout(()=>box.classList.add(event.kind==='stiff'?'toInventory':'fade'),720));
 pickupTimers.push(setTimeout(()=>{box.hidden=true;box.className='pickupAnnouncement'},1400));
}


function updateSkills(){
 $('abilityBar').innerHTML=['invisibility','phase'].map(k=>{
  const unlocked=run[k]>0;
  return `<div class="abilitySlot"><button class="ability ${unlocked?'ready':'locked'}" id="ability-${k}" aria-label="Use ${names[k]}" aria-pressed="false" data-ability="${k}"><span class="abilityArt">${skillGlyph(k)}</span><strong>${labels[k]}</strong><small id="reserve-${k}">${!unlocked?'FIND PICKUP':k==='invisibility'?energy.toFixed(1)+'s':'TIER '+run[k]}</small><span class="abilityMeter"><i id="meter-${k}"></i></span></button></div>`;
 }).join('')+`<div class="abilitySlot speedSlot"><div class="ability speedAbility passive" id="ability-speed" aria-label="Speed tier"><span class="abilityArt">${skillGlyph('speed')}</span><strong>SPEED</strong><small>TIER ${run.speed} / ${RUN_MAX.speed}</small><span class="speedCost">FIND PICKUPS</span></div></div>`;
 document.querySelectorAll('[data-ability]').forEach(button=>button.onpointerdown=e=>{e.preventDefault();e.stopPropagation();toggleAbility(button.dataset.ability)});
}
$('game').addEventListener('pointerdown',e=>{
 if(mode!=='play'||stickPointer!==null||e.target.closest('button,a,#overlay'))return;
 e.preventDefault();stickPointer=e.pointerId;stickOrigin={x:e.clientX,y:e.clientY};const r=$('game').getBoundingClientRect();$('stick').style.left=`${e.clientX-r.left}px`;$('stick').style.top=`${e.clientY-r.top}px`;$('stick').hidden=false;$('game').setPointerCapture(e.pointerId);moveStick(e);
});
function moveStick(e){if(e.pointerId!==stickPointer)return;const dx=e.clientX-stickOrigin.x,dy=e.clientY-stickOrigin.y,len=Math.hypot(dx,dy),s=Math.min(1,len/42);input={x:len?dx/len*s:0,y:len?dy/len*s:0};$('nub').style.transform=`translate(${input.x*30}px,${input.y*30}px)`;}
$('game').addEventListener('pointermove',moveStick);
for(const ev of ['pointerup','pointercancel','lostpointercapture'])$('game').addEventListener(ev,e=>{if(e.pointerId===stickPointer){stickPointer=null;input={x:0,y:0};$('nub').style.transform='';$('stick').hidden=true}});
window.addEventListener('keydown',e=>{if(e.code==='Escape'){pause();return}if(mode!=='play')return;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();keys.add(e.code);if(e.code==='Space')held=true;const k={Digit1:'invisibility',Digit2:'phase'}[e.code];if(k&&run[k]){held=false;selected=k;updateSkills()}});window.addEventListener('keyup',e=>{keys.delete(e.code);if(e.code==='Space')held=false});
function active(k){return held&&selected===k&&run[k]>0&&(k!=='invisibility'||energy>0)}
function move(dx,dy,dt){
 const nx=ghost.x+dx,ny=ghost.y+dy,phase=active('phase');
 const sealed=(run.tasks||[]).find(task=>{
  const r=task.room;if(!r||r.open)return false;
  const was=ghost.x>r.x&&ghost.x<r.x+r.w&&ghost.y>r.y&&ghost.y<r.y+r.h;
  const next=nx>r.x&&nx<r.x+r.w&&ny>r.y&&ny<r.y+r.h;
  return was!==next;
 });
 if(sealed&&!(phase&&run.phase>=sealed.requiredPhase)){
  note(`NEED PHASE ${sealed.requiredPhase}`,1.1);return;
 }
 const hits=blocks.filter(b=>overlap(nx,ny,b));
 const blocked=hits.find(b=>!(phase&&run.phase>=b.phase&&!(b.exit&&!run.exitOpen)));
 if(blocked){
  if(blocked.exit&&!run.exitOpen){note('FINISH ALL FIVE TASKS',1.2);return}
  if(blocked.phase<99){
   const kind=blocked.kind==='door'?'DOOR':blocked.kind==='gate'?'GATE':'WALL';
   note(run.phase>=blocked.phase?`${kind} · ACTIVATE PHASE`:`NEED PHASE ${blocked.phase}`,1.1);
  }
  return;
 }
 ghost.x=nx;ghost.y=ny;
 if(!hits.length){lastSafe={x:ghost.x,y:ghost.y};phaseExit=null}else if(phase){phaseExit={x:dx,y:dy}}
}
function update(dt){
 t+=dt;effects.boost=Math.max(0,effects.boost-dt);updateTokenRespawns(tokens,t);if(nav)updateEntities(people,nav,blocks,dt);
 let x=input.x+(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0),y=input.y+(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-(keys.has('KeyW')||keys.has('ArrowUp')?1:0),len=Math.hypot(x,y);if(len>1){x/=len;y/=len}if(x)ghost.face=x<0?0:2;else if(y)ghost.face=y<0?3:1;
 if(phaseExit&&!active('phase')){const length=Math.hypot(phaseExit.x,phaseExit.y)||1;let exit=null;for(let d=1;d<160;d++){const xx=ghost.x+phaseExit.x/length*d,yy=ghost.y+phaseExit.y/length*d;if(blocks.some(b=>overlap(xx,yy,b)&&b.phase>run.phase))break;if(!blocks.some(b=>overlap(xx,yy,b))){exit={x:xx,y:yy};break}}ghost.x=(exit||lastSafe).x;ghost.y=(exit||lastSafe).y;lastSafe={x:ghost.x,y:ghost.y};phaseExit=null}
 const speed=runSpeed(run)*dt;if(x)move(x*speed,0,dt);if(y)move(0,y*speed,dt);contact=null;contactTime=0;ghost.x=Math.max(34,Math.min(WORLD.width-34,ghost.x));ghost.y=Math.max(34,Math.min(WORLD.height-34,ghost.y));
 effects.energy=energy;
 for(const event of collectTokens(tokens,ghost,effects,run,runCapacity(run),t)){
  if(event.kind==='stiffFull'){note('SCARED STIFF · 3 / 3',1.2);continue}
  if(event.kind==='stiff'){announcePickup(event);tone(860,.15)}
  else{note(`${event.title.toUpperCase()} · ${event.detail}`,1.2);tone(740,.1)}
  updateSkills();updateTokenInventory();
 }
 energy=effects.energy;checkObjectives();
 let invisible=active('invisibility');
 if(invisible){energy=Math.max(0,energy-dt);if(energy<=0){held=false;invisible=false;updateSkills();note('VANISH EMPTY',1)}}
 if(spawnSafe&&Math.hypot(ghost.x-world.spawn.x,ghost.y-world.spawn.y)>120)spawnSafe=false;
 const sight=spawnSafe?{danger:false,blocked:false}:resolveSightings(people,ghost,blocks,effects,invisible,(source,max)=>nav?investigate(people,nav,source,max):0);
 if(sight.blocked){seen=0;note('SCARED STIFF!',1.3);tone(180,.22);updateTokenInventory()}
 const spotted=sight.danger;seen=spotted?seen+dt:Math.max(0,seen-dt*3);if(seen>.18){finish();return}
 if(run.exitOpen&&Math.hypot(ghost.x-world.ferry.x,ghost.y-world.ferry.y)<48){finish(true);return}
 cam+=(ghost.y-viewH*.55-cam)*Math.min(1,dt*8);camX+=(ghost.x-240-camX)*Math.min(1,dt*8);cam=Math.max(0,Math.min(WORLD.height-viewH,cam));camX=Math.max(0,Math.min(WORLD.width-480,camX));
 $('chapter').textContent=areaAt(ghost.x,ghost.y,p.level).name.toUpperCase();
 $('status').textContent=[effects.stiff?`SCARED STIFF ×${effects.stiff}`:'',run.tasks?`${completedTaskCount()}/5 TASKS`:'' ].filter(Boolean).join(' · ');updateObjectiveHud();
 for(const k of ['invisibility','phase']){
  const button=$('ability-'+k),using=active(k);if(!button)continue;
  button.classList.toggle('active',using);button.setAttribute('aria-pressed',String(using));
  $('reserve-'+k).textContent=!run[k]?'FIND PICKUP':k==='invisibility'?`${using?'ACTIVE · ':''}${energy.toFixed(1)}s`:`${using?'ACTIVE · ':''}TIER ${run[k]}`;
  $('meter-'+k).style.width=!run[k]?'0%':k==='invisibility'?`${energy/Math.max(.01,runCapacity(run))*100}%`:'100%';
 }
}

function drawToken(token){
 const kind=token.reward==='stiff'?'stiff':token.reward==='speedTier'?'speed':token.reward==='phaseTier'?'phase':'invisibility';
 const x=token.x,y=token.y,bob=reduced?0:Math.round(Math.sin(t*4+token.id)*3),scale=1.65;ctx.save();ctx.translate(x,y+bob);
 if(kind==='speed'){
  const drift=(t*28+token.id*9)%12;for(let i=0;i<4;i++){rect(ctx,-34-drift-i*5,-14+i*8,18+i*2,2,i%2?'#e6fff5':'#9df0cf')}
 }
 const glow=22+(reduced?0:Math.sin(t*5+token.id)*4),a=ctx.createRadialGradient(0,0,3,0,0,glow);
 const glowColor=kind==='stiff'?'240,164,60':kind==='invisibility'?'120,200,242':kind==='speed'?'130,236,195':'235,242,255';
 a.addColorStop(0,`rgba(${glowColor},.45)`);a.addColorStop(1,`rgba(${glowColor},0)`);ctx.fillStyle=a;ctx.beginPath();ctx.arc(0,0,glow,0,Math.PI*2);ctx.fill();
 const phaseAlpha=kind==='phase'?(reduced?.65:.28+.72*((Math.sin(t*4+token.id)+1)/2)):1;
 for(let j=0;j<GHOST_PIXELS.length;j++)for(let i=0;i<14;i++){const v=GHOST_PIXELS[j][i];if(v==='0')continue;
  ctx.globalAlpha=kind==='invisibility'?(i<5?.28:i<9?.58:1):phaseAlpha;
  const color=kind==='stiff'?(v==='2'?'#aa5d27':'#f0a43c'):kind==='invisibility'?(v==='2'?'#6faecf':'#b9e5ff'):kind==='speed'?(v==='2'?'#8eddbf':'#ddfff2'):(v==='2'?'#d8e1ea':'#f7fbff');
  rect(ctx,(i-7)*scale,(j-8)*scale,scale,scale,color);
 }
 ctx.globalAlpha=phaseAlpha;rect(ctx,-5,-5,2,5,'#18313a');rect(ctx,2,-5,2,5,'#18313a');
 if(kind==='stiff'){ctx.globalAlpha=1;ctx.fillStyle='#fff1b0';ctx.font='bold 13px sans-serif';ctx.textAlign='center';ctx.fillText('!',18,-15)}
 ctx.restore();
}
function drawMemoryRoom(task){
 const r=task.room;if(!r||r.open)return;ctx.save();
 const ready=run.phase>=task.requiredPhase,pulse=reduced?.35:.22+.12*((Math.sin(t*3+task.index)+1)/2);
 ctx.fillStyle=ready?`rgba(190,220,255,${pulse})`:`rgba(128,102,161,${pulse})`;ctx.fillRect(r.x,r.y,r.w,r.h);
 ctx.strokeStyle=ready?'#dff5ff':'#a98dc8';ctx.lineWidth=5;ctx.setLineDash([12,7]);ctx.strokeRect(r.x,r.y,r.w,r.h);ctx.setLineDash([]);
 ctx.fillStyle='#111c27dd';ctx.fillRect(r.x+r.w/2-32,r.y-11,64,20);ctx.strokeStyle=ready?'#dff5ff':'#a98dc8';ctx.lineWidth=2;ctx.strokeRect(r.x+r.w/2-32,r.y-11,64,20);
 ctx.fillStyle=ready?'#effcff':'#e4d3f7';ctx.font='bold 9px sans-serif';ctx.textAlign='center';ctx.fillText(`PHASE ${task.requiredPhase}`,r.x+r.w/2,r.y+3);ctx.restore();
}
function drawTaskGhost(task){
 const flash=reduced?1:(Math.sin(t*6+task.index)>0?.95:.48),scale=3;ctx.save();ctx.globalAlpha=flash;
 const glow=30+(reduced?0:Math.sin(t*4+task.index)*6),a=ctx.createRadialGradient(task.x,task.y-10,4,task.x,task.y-10,glow);a.addColorStop(0,'rgba(255,255,255,.32)');a.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=a;ctx.beginPath();ctx.arc(task.x,task.y-10,glow,0,Math.PI*2);ctx.fill();
 for(let j=0;j<GHOST_PIXELS.length;j++)for(let i=0;i<14;i++){if(GHOST_PIXELS[j][i]==='0')continue;const hue=(t*120+i*24+j*13+task.index*55)%360;rect(ctx,task.x+(i-7)*scale,task.y-16+(j-8)*scale,scale,scale,`hsl(${hue} 88% 66%)`)}
 rect(ctx,task.x-9,task.y-25,3,9,'#13232b');rect(ctx,task.x+3,task.y-25,3,9,'#13232b');ctx.restore();
}
function draw(){
 ctx.fillStyle='#111c27';ctx.fillRect(0,0,480,viewH);ctx.save();ctx.translate(-Math.round(camX),-Math.round(cam));
 if(scenery)ctx.drawImage(scenery,Math.round(camX),Math.round(cam),480,Math.min(viewH,WORLD.height-cam),Math.round(camX),Math.round(cam),480,Math.min(viewH,WORLD.height-cam));else{ctx.fillStyle='#263a37';ctx.fillRect(Math.round(camX),Math.round(cam),480,Math.min(viewH,WORLD.height-cam));}
 for(const d of (world.decor||[]))if(d.kind==='lamp'&&d.x>camX-40&&d.x<camX+520&&d.y>cam-40&&d.y<cam+viewH+40)drawStreetLamp(ctx,d);
 for(const h of people){if(h.frozen>0)continue;if(h.x<camX-200||h.x>camX+680||h.y<cam-200||h.y>cam+viewH+200)continue;ctx.beginPath();ctx.moveTo(h.x,h.y);for(let a=h.angle-h.half;a<=h.angle+h.half+.01;a+=.075){let d=0;for(;d<h.range;d+=10){if(blocks.some(b=>overlap(h.x+Math.cos(a)*d,h.y+Math.sin(a)*d,b,0)))break}ctx.lineTo(h.x+Math.cos(a)*d,h.y+Math.sin(a)*d)}ctx.closePath();ctx.fillStyle=h.kind==='cat'?'#b6d99d10':h.kind==='camera'?'#b6cce328':seen?'#efac7955':'#f7d49a1c';ctx.fill();}
 const visible=blocks.filter(b=>b.x+b.w>camX-50&&b.x<camX+530&&b.y+b.h>cam-60&&b.y<cam+viewH+60);for(const b of visible){if(b.exit)continue;if(b.kind==='water'){rect(ctx,b.x,b.y,b.w,b.h,'#254655');for(let yy=Math.max(b.y,Math.floor(cam/32)*32);yy<Math.min(b.y+b.h,cam+viewH);yy+=32)for(let xx=b.x+10;xx<b.x+b.w;xx+=56)rect(ctx,xx+Math.round(Math.sin(t+yy)*3),yy,26,2,'#8ebaba25');}else prop(b);}
 people.filter(h=>h.x>camX-40&&h.x<camX+520&&h.y>cam-50&&h.y<cam+viewH+50).forEach(drawEntity);
 ctx.textAlign='center';ctx.font='11px sans-serif';ctx.fillStyle='#e0dcc470';for(const r of (world.regions||[]))if(r.x+r.w>camX&&r.x<camX+480&&r.y>cam-30&&r.y<cam+viewH)ctx.fillText(r.name.toUpperCase(),r.x+r.w/2,r.y+40);
 if(p.level===0){drawCemeteryExit(ctx,world.ferry,!!run.exitOpen);ctx.fillStyle='#dce6bf';ctx.font='bold 12px Georgia';ctx.textAlign='center';ctx.fillText('CEMETERY GATE',world.ferry.x,world.ferry.y+22);}else{drawFerry(ctx,world.ferry);ctx.fillStyle='#dce6bf';ctx.font='bold 12px Georgia';ctx.textAlign='center';ctx.fillText('THE WAY FORWARD',world.ferry.x,world.ferry.y-110);}
 for(const token of tokens)if(!token.collected&&token.x>camX-45&&token.x<camX+525&&token.y>cam-45&&token.y<cam+viewH+45)drawToken(token);
 if(run.tasks)for(const task of availableTasks()){drawMemoryRoom(task);drawTaskGhost(task)}
 drawGhost(ctx,ghost.x,ghost.y-16,3,ghost.face,t,active('invisibility')?.25:active('phase')?.6:1);
 ctx.restore();if(mode==='play')drawMap();
}
function drawMiniMarker(px,py,kind,id=0){
 const pulse=reduced?1:(Math.sin(t*5+id)*.5+.5);
 if(kind==='speed'){
  rect(ctx,px-4,py-2,4,1,'#72bca6');rect(ctx,px-5,py,5,1,'#9df0cf');rect(ctx,px-3,py+2,3,1,'#72bca6');
  rect(ctx,px+1,py-1,3,3,'#e8fff6');
 }else if(kind==='phase'){
  ctx.globalAlpha=.5+pulse*.5;rect(ctx,px-2,py-2,5,5,'#f4f7ff');rect(ctx,px-1,py-1,3,3,'#263743');rect(ctx,px,py,1,1,'#f4f7ff');ctx.globalAlpha=1;
 }else if(kind==='invisibility'){
  ctx.globalAlpha=.7+pulse*.3;rect(ctx,px,py-3,1,1,'#dff8ff');rect(ctx,px-1,py-2,3,1,'#8fd4f4');rect(ctx,px-2,py-1,5,3,'#64afd7');rect(ctx,px-1,py+2,3,1,'#8fd4f4');rect(ctx,px,py+3,1,1,'#dff8ff');ctx.globalAlpha=1;
 }else{
  rect(ctx,px-2,py-3,5,5,'#f0a43c');rect(ctx,px-3,py-1,1,3,'#b76526');rect(ctx,px+3,py-1,1,3,'#b76526');rect(ctx,px-2,py+2,1,2,'#f0a43c');rect(ctx,px+2,py+2,1,2,'#f0a43c');rect(ctx,px,py-1,1,3,'#fff1b8');
 }
}
function drawMap(){
 const x=346,y=99,w=116,h=106,sx=w/WORLD.width,sy=h/WORLD.height;
 // Shadowed carved frame.
 rect(ctx,x-7,y-7,w+14,h+14,'#050c12aa');
 rect(ctx,x-5,y-5,w+10,h+10,'#283b3c');
 rect(ctx,x-4,y-4,w+8,h+8,'#8da58d');
 rect(ctx,x-3,y-3,w+6,h+6,'#18292f');
 rect(ctx,x-1,y-1,w+2,h+2,'#08141b');
 rect(ctx,x,y,w,h,'#17252b');
 // Pixel corner studs.
 for(const [cx,cy] of [[x-4,y-4],[x+w+2,y-4],[x-4,y+h+2],[x+w+2,y+h+2]])rect(ctx,cx,cy,2,2,'#d4c58b');
 ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();
 // Distinct terrain/area fills.
 const regionPalette=['#4b4042','#3d4a4c','#355142','#46504d','#414946'];
 for(const [i,r] of (world.regions||[]).entries()){
  const rx=Math.floor(x+r.x*sx),ry=Math.floor(y+r.y*sy),rw=Math.max(1,Math.ceil(r.w*sx)),rh=Math.max(1,Math.ceil(r.h*sy));
  rect(ctx,rx,ry,rw,rh,regionPalette[r.kind]||'#414946');
  ctx.globalAlpha=.18;
  for(let yy=ry+2+(i%3);yy<ry+rh;yy+=6)for(let xx=rx+2+((yy+i)%5);xx<rx+rw;xx+=8)rect(ctx,xx,yy,1,1,'#d7e3cb');
  ctx.globalAlpha=1;
 }
 // Physical map structure.
 for(const b of blocks){
  if(b.exit)continue;
  const bx=Math.floor(x+b.x*sx),by=Math.floor(y+b.y*sy),bw=Math.max(1,Math.ceil(b.w*sx)),bh=Math.max(1,Math.ceil(b.h*sy));
  if(b.kind==='water'){
   rect(ctx,bx,by,bw,bh,'#244c5d');
   for(let yy=by+2;yy<by+bh;yy+=5)rect(ctx,bx+1+(yy%3),yy,Math.max(1,bw-3),1,'#4c788322');
  }else if(b.kind==='tree'||b.kind==='hedge') rect(ctx,bx,by,bw,bh,b.kind==='tree'?'#294435':'#304b39');
  else if(b.kind==='wall'||b.kind==='stone') rect(ctx,bx,by,bw,bh,'#78817a');
  else if(b.kind==='door'||b.kind==='gate') rect(ctx,bx,by,bw,bh,b.phase<99?'#b7a7d8':'#8b9188');
  else rect(ctx,bx,by,bw,bh,'#555b59');
 }
 // Sealed Unfinished Business rooms.
 if(run.tasks)for(const task of run.tasks){
  const r=task.room;if(!r||r.open)continue;
  const rx=Math.floor(x+r.x*sx),ry=Math.floor(y+r.y*sy),rw=Math.max(3,Math.ceil(r.w*sx)),rh=Math.max(3,Math.ceil(r.h*sy));
  ctx.strokeStyle='#b7a7d8aa';ctx.lineWidth=1;ctx.strokeRect(rx+.5,ry+.5,rw-1,rh-1);
 }
 // Pickups use distinct miniature glyphs instead of identical squares.
 for(const token of tokens)if(!token.collected){
  const px=Math.round(x+token.x*sx),py=Math.round(y+token.y*sy);
  const kind=token.reward==='stiff'?'stiff':token.reward==='speedTier'?'speed':token.reward==='phaseTier'?'phase':'invisibility';
  drawMiniMarker(px,py,kind,token.id);
 }
 // Unfinished Business targets: bright animated multicolour beacons.
 if(run.tasks)for(const task of availableTasks()){
  const px=Math.round(x+task.x*sx),py=Math.round(y+task.y*sy),hue=(t*110+task.index*65)%360;
  ctx.fillStyle=`hsl(${hue} 90% 68%)`;ctx.fillRect(px-3,py-1,7,3);ctx.fillRect(px-1,py-3,3,7);
  rect(ctx,px-1,py-1,3,3,'#fff8dc');rect(ctx,px,py,1,1,'#25343b');
 }
 // Player: readable mini ghost plus current facing.
 const px=Math.round(x+ghost.x*sx),py=Math.round(y+ghost.y*sy);
 ctx.fillStyle='#071117aa';ctx.fillRect(px-4,py-3,9,9);
 rect(ctx,px-2,py-3,5,5,'#f7fff6');rect(ctx,px-3,py-1,7,3,'#f7fff6');rect(ctx,px-2,py+2,2,2,'#f7fff6');rect(ctx,px+2,py+2,2,2,'#f7fff6');
 rect(ctx,px-1,py-1,1,1,'#31434a');rect(ctx,px+2,py-1,1,1,'#31434a');
 const dir=[[ -5,0],[0,5],[5,0],[0,-5]][ghost.face]||[0,5];rect(ctx,px+dir[0],py+dir[1],2,2,'#f3ce87');
 ctx.restore();
 // Compact title plate built into the frame.
 rect(ctx,x+5,y-7,37,6,'#18292f');ctx.fillStyle='#d7e3cb';ctx.font='bold 6px ui-monospace,monospace';ctx.textAlign='left';ctx.fillText(`MAP · ${p.level+1}`,x+8,y-2);
}
function resize(){const r=canvas.getBoundingClientRect();viewH=480*r.height/r.width;canvas.width=480;canvas.height=Math.round(viewH);ctx.imageSmoothingEnabled=false;if(mode!=='play'){cam=Math.max(0,Math.min(WORLD.height-viewH,world.spawn.y-viewH*.55));camX=Math.max(0,world.spawn.x-240)}}window.addEventListener('resize',resize);resize();home();
function frame(now){const dt=Math.min(.035,(now-last)/1000||0);last=now;if(mode==='play'){update(dt);draw()}else if(mode==='menu')t+=dt;$('notice').style.opacity=mode==='play'&&now<noticeUntil?'1':'0';requestAnimationFrame(frame)}requestAnimationFrame(frame);

