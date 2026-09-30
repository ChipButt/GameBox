import {MATERIALS,RUN_MAX,initial,sanitize,newRun,runSpeed,runCapacity,overlap,rayBlocked} from './model.js?v=20260927m';
import {WORLD,LEVELS,SPAWN,FERRY,REGIONS,areaAt,generateWorld,discover} from './world.js?v=20260930a';
import {navigation,createEntities,updateEntities,investigate,resolveSightings,createTokens,updateTokenRespawns,collectTokens} from './entities.js?v=20260930b';
import {createScenery,drawSceneryProp,drawStreetLamp,drawFerry,drawCemeteryExit} from './scenery.js?v=20260930a';
import {drawHuman,drawCat,drawCyclist} from './characters.js?v=20260928a';
const $=id=>document.getElementById(id), canvas=$('world'),ctx=canvas.getContext('2d'),KEY='gamebox.unfinished-business.v1';
let p;try{p=sanitize(JSON.parse(localStorage.getItem(KEY)))}catch{p=initial()}
let world={...generateWorld(p.worldSeed,p.level),blocks:[],decor:[],regions:[]},run=newRun(p.level),visited=new Set(),saveTimer=0,nav=null,effects={boost:0,stiff:0,energy:0},tokens=[],scenery=null;
let mode='menu',selected='invisibility',held=false,skillPointer=null,stickPointer=null,stickOrigin={x:0,y:0},keys=new Set(),input={x:0,y:0},blocks=[],people=[],ghost={...LEVELS[p.level].spawn,face:1},energy=0,runPoints=0,t=0,cam=0,camX=0,viewH=800,last=0,noticeUntil=0,contact=null,contactTime=0,lastSafe={...LEVELS[p.level].spawn},phaseExit=null,seen=0,audio=null,saveFailed=false,tutorial={active:false,stage:0,useTime:0,refillActive:false};
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
function chooseLevel(){show(`<span class="eyebrow">CHOOSE YOUR UNFINISHED BUSINESS</span><h2>Five places still remember you.</h2><p class="subtitle">Every level starts a fresh run. Echoes and upgrades belong only to that attempt.</p>${LEVELS.map((l,i)=>`<button class="secondary" data-level="${i}" ${i>p.unlockedLevel?'disabled':''}>${i+1}. ${l.name}${i>p.unlockedLevel?' · LOCKED':''}</button>`).join('')}<button class="secondary" id="menu">Back</button>${footer()}`);document.querySelectorAll('[data-level]').forEach(b=>b.onclick=()=>{p.level=Number(b.dataset.level);save();home()});$('menu').onclick=home;}
function help(){show(`<span class="eyebrow">THE RULES OF BEING DEAD</span><h2>Finish what you left behind.</h2><div class="help"><p><b>Move</b> by dragging anywhere on the play area. Keyboard: WASD or arrows.</p><p><b>Upgrades are found, not bought.</b> There are no tap-to-upgrade controls. Walk into the different ghost icons hidden around each map and the upgrade applies instantly for that run.</p><p><b>Speed</b> pickups are pale ghosts with rushing lines behind them. Every one is free and permanently raises your movement speed for the current run.</p><p><b>Phase</b> pickups are ghosts that fade between solid white and translucent. Each one raises your PHASE tier. Activate PHASE from the bottom button to cross a sealed room whose number is at or below your tier.</p><p><b>Vanish</b> pickups have a cool-blue fading shimmer. They unlock VANISH and increase how long you can stay unseen. Tap VANISH to use it.</p><p><b>Golden ghosts now mean one thing only: Scared Stiff.</b> There are five around each map. They respawn after a short time and you can store a maximum of three. When a witness would catch you, one charge is automatically spent to freeze them for a few seconds.</p><p>Each level has <b>five Unfinished Business tasks</b>, shown in the world as full-sized flashing multicoloured ghosts. Task 1 is reachable immediately. Tasks 2–5 sit inside sealed memory rooms requiring PHASE 1, 2, 3 and 4 respectively, so you must keep finding Phase pickups to progress.</p><p>Collect all five task ghosts to open the way out. Echoes from exploration remain a run score; they are no longer spent on upgrades.</p></div><button class="primary" id="back">Got it</button>`);$('back').onclick=home;}
function description(k){if(k==='speed')return `${Math.round(runSpeed(run))} → ${Math.round(runSpeed({...run,speed:run.speed+1}))} speed`;if(k==='invisibility')return run.invisibility?`${runCapacity(run).toFixed(1)} → ${runCapacity({...run,invisibility:run.invisibility+1}).toFixed(1)} sec`:'Unlock VANISH';return run.phase?`${MATERIALS[run.phase]} → ${MATERIALS[Math.min(7,run.phase+1)]}`:'Unlock PHASE';}
function shop(result=false,win=false){mode='shop';$('controls').hidden=true;show(`<span class="eyebrow">${win?'ONE LESS THING LEFT UNDONE':'CAUGHT'}</span><h2>${win?'You made it through.':'Someone Saw You'}</h2><div class="stats"><div><strong>${runPoints}</strong><small>GROUND FOUND</small></div><div><strong>${run.echoes}</strong><small>ECHOES LEFT</small></div><div><strong>${p.runs}</strong><small>ATTEMPTS</small></div></div><p class="subtitle">Echoes and upgrades fade with the attempt. The next run begins fresh.</p><button class="primary" data-start>${win&&p.level<4?'Enter the next memory':'Try again'} →</button><button class="secondary" id="menu">Main menu</button>${footer()}`);$('menu').onclick=home;}

function beginLevel(){
 if(p.level===0&&!p.introSeen){introSequence(0);return}
 if(p.level===0&&!pickupTutorialSeen()){tutorialPrompt();return}
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
 {tag:'UPGRADES',title:'Find them. Do not buy them.',icon:'speed',body:'The old tap-to-upgrade system is gone. Upgrade ghosts are physical pickups in the level. Walk into one and it applies instantly, for free, for the rest of that run.'},
 {tag:'SPEED',title:'Follow the rushing lines.',icon:'speed',body:'Speed pickups have motion lines streaming behind the ghost. Each pickup permanently raises your speed tier for this run. Every level contains enough Speed pickups to reach the maximum.'},
 {tag:'PHASE',title:'Watch the ghost fade.',icon:'phase',body:'Phase pickups pulse between solid white and translucent. Each raises your PHASE tier. The four sealed task rooms require PHASE 1, 2, 3 and 4, so finding the next Phase pickup is part of the route through every level.'},
 {tag:'VANISH',title:'Build your time unseen.',icon:'invisibility',body:'Blue shimmering Vanish pickups unlock and strengthen VANISH. The bottom VANISH button still activates the power; pickups simply replace all of the old upgrade purchases.'},
 {tag:'SCARED STIFF',title:'Gold means Scared Stiff.',icon:'stiff',body:'Golden ghosts are no longer mystery rewards. There are five on each map and they respawn after 35 seconds. You can hold three charges. If a witness catches sight of you, one charge is automatically spent and that witness freezes briefly.'},
 {tag:'UNFINISHED BUSINESS',title:'Five ghosts. Four sealed rooms.',icon:'task',body:'Your five tasks are full-sized flashing multicoloured ghosts. The first is freely accessible. The next four are inside increasingly strong PHASE rooms. Complete all five and the way out opens.'}
];
function tutorialPrompt(){
 mode='story';show(`<span class="eyebrow">THE RULES HAVE CHANGED</span><h2>Try the new pickup system?</h2><p class="subtitle">Upgrades now live inside the map. The short tutorial explains every new icon and the Phase-gated task route.</p><button class="primary" id="doTutorial">Show me</button><button class="secondary" id="skipTutorial">Skip tutorial</button>${footer()}`);
 $('doTutorial').onclick=()=>tutorialPage(0);$('skipTutorial').onclick=()=>{markPickupTutorialSeen();start(false)};
}
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
 const offsets=[[0,0],[120,0],[-120,0],[0,120],[0,-120],[170,120],[-170,120],[170,-120],[-170,-120],[240,0],[-240,0],[0,240],[0,-240]];
 for(const [ox,oy] of offsets){
  const q=nav?.nearest({x:task.x+ox,y:task.y+oy});if(!q)continue;
  const half=64,r={x:q.x-half,y:q.y-half,w:half*2,h:half*2};
  if(r.x<40||r.y<40||r.x+r.w>WORLD.width-40||r.y+r.h>WORLD.height-40)continue;
  const blocked=blocks.some(b=>!b.open&&r.x<b.x+b.w+8&&r.x+r.w>b.x-8&&r.y<b.y+b.h+8&&r.y+r.h>b.y-8);
  if(!blocked)return q;
 }
 return base;
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
   ?`PHASE ${req} REQUIRED · ${task.hint}`
   :(()=>{const dx=task.x-ghost.x,dy=task.y-ghost.y,dist=Math.round(Math.hypot(dx,dy)/10)*10;return `${objectiveDirection(dx,dy)} ${dist} paces · ${req?`PHASE ${req} room · `:''}${task.hint}`;})();
  return `<div class="taskItem ${state}"><strong>${task.title}</strong><small class="${state==='available'?'taskDistance':''}">${detail}</small></div>`;
 }).join('');
 const heading=`LEVEL ${p.level+1} · ${LEVELS[p.level].name.toUpperCase()}`;
 show(`<div class="taskBoard"><div class="taskBoardHead"><div><span class="eyebrow">${heading}</span><h2>Unfinished business</h2></div><button class="taskClose" id="taskClose" aria-label="Close tasks">×</button></div><div class="taskProgress">${done} / 5 COMPLETE · TASK 1 IS OPEN · TASKS 2–5 NEED PHASE 1–4</div><div class="taskList">${items}</div></div>`);
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
 run=newRun(p.level);run.exitOpen=false;visited=new Set();effects={boost:0,stiff:0,energy:0};ghost={...world.spawn,face:1};lastSafe={...ghost};phaseExit=null;runPoints=0;t=0;seen=0;contact=null;contactTime=0;energy=0;selected='invisibility';tutorial={active:false,stage:0,useTime:0,refillActive:false};prepareLevelTasks();cam=world.spawn.y-viewH*.55;camX=world.spawn.x-240;resetInput();$('overlay').hidden=true;$('hud').hidden=false;$('controls').hidden=false;updateSkills();updateEchoDisplay();updateTokenInventory();
 updateObjectiveHud();openTaskBoard(true);
 tone(320);
}
function finish(win=false){if(mode!=='play')return;$('objectiveHud').hidden=true;$('tokenInventory').hidden=true;$('taskButton').hidden=true;p.best=Math.max(p.best,runPoints);p.runs++;if(win){if(p.level<4){p.unlockedLevel=Math.max(p.unlockedLevel,p.level+1);p.level++;}else p.won=true;}save();tone(win?880:160,.3);shop(true,win);}
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
function updateEchoDisplay(){$('distance').textContent=run.echoes;}
function refreshUpgradeStates(){}
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
  note(`SEALED MEMORY ROOM · NEED PHASE ${sealed.requiredPhase}`,1.5);return;
 }
 const hits=blocks.filter(b=>overlap(nx,ny,b));
 const blocked=hits.find(b=>!(phase&&run.phase>=b.phase&&!(b.exit&&!run.exitOpen)));
 if(blocked){
  if(blocked.exit&&!run.exitOpen){note('The cemetery gate is still shut · finish what is keeping you here.',1.8);return}
  if(blocked.phase<99){
   const kind=blocked.kind==='door'?'DOOR':blocked.kind==='gate'?'GATE':'WALL';
   note(run.phase>=blocked.phase?kind+' · PHASE '+blocked.phase+' · activate PHASE':MATERIALS[blocked.phase]+' '+kind+' · needs PHASE '+blocked.phase,1.2);
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
 if(!blocks.some(b=>overlap(ghost.x,ghost.y,b,0))&&discover(visited,ghost.x,ghost.y)){runPoints++;run.explored++;run.echoes++;tone(500,.025);updateEchoDisplay();}
 effects.energy=energy;
 for(const event of collectTokens(tokens,ghost,effects,run,runCapacity(run),t)){
  if(event.kind==='stiffFull'){note('SCARED STIFF FULL · 3 / 3 STORED',1.5);continue}
  announcePickup(event);note(`${event.title.toUpperCase()} · ${event.detail}`,2.4);tone(event.kind==='stiff'?860:740,.15);updateEchoDisplay();updateSkills();updateTokenInventory();
 }
 energy=effects.energy;checkObjectives();
 let invisible=active('invisibility');
 if(invisible){energy=Math.max(0,energy-dt);if(energy<=0){held=false;invisible=false;updateSkills();note('Vanish exhausted.',1.4)}}
 const sight=resolveSightings(people,ghost,blocks,effects,invisible,(source,max)=>nav?investigate(people,nav,source,max):0);
 if(sight.blocked){seen=0;note('Scared Stiff! Witness frozen · charge used.',3);tone(180,.22);updateTokenInventory()}
 const spotted=sight.danger;seen=spotted?seen+dt:Math.max(0,seen-dt*3);if(seen>.18){finish();return}
 if(run.exitOpen&&Math.hypot(ghost.x-world.ferry.x,ghost.y-world.ferry.y)<48){finish(true);return}
 cam+=(ghost.y-viewH*.55-cam)*Math.min(1,dt*8);camX+=(ghost.x-240-camX)*Math.min(1,dt*8);cam=Math.max(0,Math.min(WORLD.height-viewH,cam));camX=Math.max(0,Math.min(WORLD.width-480,camX));
 $('distance').textContent=run.echoes;$('chapter').textContent=areaAt(ghost.x,ghost.y,p.level).name.toUpperCase();
 $('best').textContent=[effects.stiff?`SCARED STIFF ×${effects.stiff}`:'',run.tasks?`${completedTaskCount()}/5 TASKS`:`FOUND ${runPoints}`].filter(Boolean).join(' · ');updateObjectiveHud();
 for(const k of ['invisibility','phase']){
  const button=$('ability-'+k),using=active(k);if(!button)continue;
  button.classList.toggle('active',using);button.setAttribute('aria-pressed',String(using));
  $('reserve-'+k).textContent=!run[k]?'FIND PICKUP':k==='invisibility'?`${using?'ACTIVE · ':''}${energy.toFixed(1)}s`:`${using?'ACTIVE · ':''}TIER ${run[k]}`;
  $('meter-'+k).style.width=!run[k]?'0%':k==='invisibility'?`${energy/Math.max(.01,runCapacity(run))*100}%`:'100%';
 }
 updateEchoDisplay();
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
function drawMap(){
 const x=366,y=102,w=98,h=90,sx=w/WORLD.width,sy=h/WORLD.height;rect(ctx,x-4,y-4,w+8,h+8,'#0d1c27dd');ctx.strokeStyle='#8caa8370';ctx.lineWidth=1;ctx.strokeRect(x-4,y-4,w+8,h+8);
 for(const r of (world.regions||[]))rect(ctx,x+r.x*sx,y+r.y*sy,r.w*sx,r.h*sy,'#55716a44');
 for(const token of tokens)if(!token.collected){const kind=token.reward==='stiff'?'#f0a43c':token.reward==='speedTier'?'#9df0cf':token.reward==='phaseTier'?'#f3f7ff':'#8fd4f4';const tw=reduced?2:(Math.sin(t*5+token.id)>.15?3:2);rect(ctx,x+token.x*sx-tw/2,y+token.y*sy-tw/2,tw,tw,kind)}
 if(run.tasks)for(const task of availableTasks()){const hue=(t*110+task.index*65)%360;rect(ctx,x+task.x*sx-2,y+task.y*sy-2,5,5,`hsl(${hue} 85% 68%)`)}
 rect(ctx,x+ghost.x*sx-2,y+ghost.y*sy-2,4,4,'#ffffff');ctx.fillStyle='#c0d1be';ctx.font='8px sans-serif';ctx.textAlign='right';ctx.fillText(`LEVEL ${p.level+1}`,x+w,y+h+14);
}
function resize(){const r=canvas.getBoundingClientRect();viewH=480*r.height/r.width;canvas.width=480;canvas.height=Math.round(viewH);ctx.imageSmoothingEnabled=false;if(mode!=='play'){cam=Math.max(0,Math.min(WORLD.height-viewH,world.spawn.y-viewH*.55));camX=Math.max(0,world.spawn.x-240)}}window.addEventListener('resize',resize);resize();home();
function frame(now){const dt=Math.min(.035,(now-last)/1000||0);last=now;if(mode==='play'){update(dt);draw()}else if(mode==='menu')t+=dt;$('notice').style.opacity=mode==='play'&&now<noticeUntil?'1':'0';requestAnimationFrame(frame)}requestAnimationFrame(frame);

