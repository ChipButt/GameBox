import {MATERIALS,RUN_MAX,initial,sanitize,newRun,runSpeed,runCapacity,runCost,buyRun,overlap,rayBlocked} from './model.js?v=20260927i';
import {WORLD,LEVELS,SPAWN,FERRY,REGIONS,areaAt,generateWorld,discover} from './world.js?v=20260927i';
import {navigation,createEntities,updateEntities,investigate,resolveSightings,createTokens,collectTokens} from './entities.js?v=20260927i';
import {createScenery,drawSceneryProp,drawStreetLamp,drawFerry,drawCemeteryExit} from './scenery.js?v=20260927i';
import {drawHuman,drawCat,drawCyclist} from './characters.js?v=20260927i';
const $=id=>document.getElementById(id), canvas=$('world'),ctx=canvas.getContext('2d'),KEY='gamebox.unfinished-business.v1';
let p;try{p=sanitize(JSON.parse(localStorage.getItem(KEY)))}catch{p=initial()}
let world={...generateWorld(p.worldSeed,p.level),blocks:[],decor:[],regions:[]},run=newRun(p.level),visited=new Set(),saveTimer=0,nav=null,effects={boost:0,stiff:0,energy:0},tokens=[],scenery=null;
let mode='menu',selected='invisibility',held=false,skillPointer=null,stickPointer=null,stickOrigin={x:0,y:0},keys=new Set(),input={x:0,y:0},blocks=[],people=[],ghost={...LEVELS[p.level].spawn,face:1},energy=0,runPoints=0,t=0,cam=0,camX=0,viewH=800,last=0,noticeUntil=0,contact=null,contactTime=0,lastSafe={...LEVELS[p.level].spawn},phaseExit=null,seen=0,audio=null,saveFailed=false,tutorial={active:false,stage:0,useTime:0,refillActive:false};
const names={speed:'Speed',invisibility:'Vanish',phase:'Phase',touch:'Touch'},labels={invisibility:'VANISH',phase:'PHASE',touch:'TOUCH'};
const GRAVEYARD_OBJECTIVES=[
 {title:'Find your grave',hint:'Something about the old graves feels familiar.',x:630,y:1870,complete:'That name… that is mine.'},
 {title:'Read the funeral notice',hint:'The chapel entrance has a service notice pinned outside.',x:1900,y:1515,complete:'The service is still going. The main gate will stay shut until they leave.'},
 {title:'Recover the keepsake',hint:'A memory is pulling you toward the memorial garden.',x:1860,y:600,complete:'You remember carrying this yesterday. Another loose end.'},
 {title:'Listen to the end of the funeral',hint:'Return to the funeral lawn and wait close enough to hear the service end.',x:1450,y:1320,complete:'The service is ending. The mourners are heading toward the gate.'},
 {title:'Follow the procession',hint:'Follow the funeral party toward the gatehouse path.',x:1320,y:650,complete:'The procession leaves. The cemetery gate has been left open.'}
];
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
function save(){try{localStorage.setItem(KEY,JSON.stringify(p))}catch{saveFailed=true;}}
function note(s,d=4){$('notice').textContent=s;noticeUntil=performance.now()+d*1000;}
function tone(f=440,d=.12){if(!p.sound)return;try{audio??=new(window.AudioContext||window.webkitAudioContext)();audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.setValueAtTime(f,audio.currentTime);o.frequency.exponentialRampToValueAtTime(f*.6,audio.currentTime+d);g.gain.setValueAtTime(.035,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+d);o.connect(g).connect(audio.destination);o.start();o.stop(audio.currentTime+d)}catch{}}
function resetInput(){held=false;skillPointer=null;stickPointer=null;input={x:0,y:0};keys.clear();$('nub').style.transform='';$('stick').hidden=true;}
function footer(){return `<div class="footer"><a href="../index.html"><img src="../shared/assets/GameBox%20back%20button.png" alt="Game Box"></a><button class="sound" id="sound">SOUND ${p.sound?'ON':'OFF'}</button></div>`}
function show(html){resetInput();$('overlay').hidden=false;$('overlay').innerHTML=`<div class="menu">${html}</div>`;document.querySelectorAll('[data-start]').forEach(b=>b.onclick=beginLevel);$('sound')?.addEventListener('click',()=>{p.sound=!p.sound;save();$('sound').textContent=`SOUND ${p.sound?'ON':'OFF'}`});}
function home(){mode='menu';$('hud').hidden=true;$('controls').hidden=true;$('objectiveHud').hidden=true;$('tokenInventory').hidden=true;show(`<canvas class="brandGhost" id="portrait" width="96" height="110"></canvas><span class="eyebrow">A LITTLE GHOST. A LONG WAY HOME.</span><h1>Unfinished<br><em>Business</em></h1><p class="subtitle">Every place remembers something you left unfinished.</p><div class="record">LEVEL ${p.level+1} · ${LEVELS[p.level].name.toUpperCase()}</div><button class="primary" data-start>${p.runs?'Start this level':'Begin your escape'} →</button>${p.unlockedLevel>0?'<button class="secondary" id="levels">Choose level</button>':''}<button class="secondary" id="help">How to play</button>${footer()}`);const c=$('portrait').getContext('2d');drawGhost(c,48,66,5,1,0);$('levels')?.addEventListener('click',chooseLevel);$('help').onclick=help;}
function chooseLevel(){show(`<span class="eyebrow">CHOOSE YOUR UNFINISHED BUSINESS</span><h2>Five places still remember you.</h2><p class="subtitle">Every level starts a fresh run. Echoes and upgrades belong only to that attempt.</p>${LEVELS.map((l,i)=>`<button class="secondary" data-level="${i}" ${i>p.unlockedLevel?'disabled':''}>${i+1}. ${l.name}${i>p.unlockedLevel?' · LOCKED':''}</button>`).join('')}<button class="secondary" id="menu">Back</button>${footer()}`);document.querySelectorAll('[data-level]').forEach(b=>b.onclick=()=>{p.level=Number(b.dataset.level);save();home()});$('menu').onclick=home;}
function help(){show(`<span class="eyebrow">THE RULES OF BEING DEAD</span><h2>Finish what you left behind.</h2><div class="help"><p><b>Move</b> by dragging anywhere on the play area. Keyboard: WASD or arrows.</p><p><b>Echoes</b> are fragments of remembered life. Every genuinely new patch of ground you cross gives one Echo.</p><p>Upgrade controls stay grey while you cannot afford them. When one becomes available it turns <b>bright gold and sparkles</b>. Speed sits beneath your Echoes; VANISH, PHASE and TOUCH each have their own upgrade tab. Your build resets whenever the level restarts.</p><p><b>Tap</b> a large ability button to arm that power, then move normally. Tap it again to cancel. VANISH hides you briefly, PHASE lets you cross materials your spirit can overcome, and TOUCH lets you physically disturb the living world.</p><p><b>Mystery tokens are worth exploring for.</b> Every uncollected token appears on the minimap and sparkles when it is on-screen. A token can contain Echoes, a speed tier, an automatic VANISH / PHASE / TOUCH upgrade, a refill, or a Scared Stiff charge. You can carry up to three Scared Stiff charges.</p><p>Level objectives change the living world and story, but they never unlock your powers. Cats can attract people and the fast cyclist can catch you.</p></div><button class="primary" id="back">Got it</button>`);$('back').onclick=home;}
function description(k){if(k==='invisibility')return run.invisibility?`${runCapacity(run).toFixed(1)} → ${runCapacity({...run,invisibility:run.invisibility+1}).toFixed(1)} sec`:'Unlock VANISH';if(k==='phase')return run.phase?`${MATERIALS[run.phase]} → ${MATERIALS[Math.min(7,run.phase+1)]}`:'Unlock PHASE';return run.touch?`Touch tier ${run.touch} → ${run.touch+1}`:'Unlock TOUCH';}
function shop(result=false,win=false){mode='shop';$('controls').hidden=true;show(`<span class="eyebrow">${win?'ONE LESS THING LEFT UNDONE':'CAUGHT'}</span><h2>${win?'You made it through.':'Someone Saw You'}</h2><div class="stats"><div><strong>${runPoints}</strong><small>GROUND FOUND</small></div><div><strong>${run.echoes}</strong><small>ECHOES LEFT</small></div><div><strong>${p.runs}</strong><small>ATTEMPTS</small></div></div><p class="subtitle">Echoes and upgrades fade with the attempt. The next run begins fresh.</p><button class="primary" data-start>${win&&p.level<4?'Enter the next memory':'Try again'} →</button><button class="secondary" id="menu">Main menu</button>${footer()}`);$('menu').onclick=home;}
function buyUpgrade(k){
 if(mode!=='play')return;
 const expected=tutorial.active?tutorialExpectedUpgrade():null;
 if(tutorial.active&&expected!==k){note(`Finish this lesson first · ${names[expected]||'the highlighted upgrade'} is waiting.`,1.6);return}
 const before=run[k],price=runCost(run,k);
 if(!buyRun(run,k)){note(run[k]>=RUN_MAX[k]?`${names[k]} is fully strengthened.`:`Need ${price} Echoes for ${names[k]}.`,1.6);tone(150,.07);return}
 if(k==='invisibility')energy=runCapacity(run);
 tone(700,.1);note(before===0?`${names[k]} unlocked.`:`${names[k]} strengthened to tier ${run[k]}.`,1.8);
 updateSkills();updateEchoDisplay();
 if(tutorial.active)afterTutorialPurchase(k);
}
function beginLevel(){
 if(p.level===0&&!p.introSeen){introSequence(0);return}
 if(p.level===0&&!p.tutorialSeen){tutorialPrompt();return}
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
function tutorialPrompt(){
 mode='story';show(`<span class="eyebrow">BEFORE YOU LEAVE THE GRAVEYARD</span><h2>Learn how being dead works?</h2><p class="subtitle">Learn the basics. Try each skill for yourself.</p><button class="primary" id="doTutorial">Play tutorial</button><button class="secondary" id="skipTutorial">Skip tutorial</button>${footer()}`);
 $('doTutorial').onclick=()=>start(true);$('skipTutorial').onclick=()=>{p.tutorialSeen=true;save();start(false)};
}
function tutorialCard(title,body,button='Continue',action=()=>resumeTutorial(),demo=null){
 mode='tutorialPause';show(`<div class="tutorialCard"><span class="eyebrow">TUTORIAL</span><h2>${title}</h2>${demo?'<canvas class="tutorialDemo" id="tutorialDemo" width="270" height="120"></canvas>':''}<p class="tutorialHint">${body}</p><button class="primary" id="tutorialNext">${button}</button></div>`);
 if(demo)animateTutorialDemo(demo);$('tutorialNext').onclick=action;
}
function resumeTutorial(){mode='play';$('overlay').hidden=true;resetInput();updateSkills();refreshUpgradeStates();updateObjectiveHud();}
function tutorialExpectedUpgrade(){return {2:'speed',4:'invisibility',7:'phase',10:'touch'}[tutorial.stage]||null}
function tutorialUpgradeReady(k){
 const price=runCost(run,k);
 tutorialCard(
  k==='speed'?'Your first upgrade':`Unlock ${labels[k]}`,
  k==='speed'
   ?`<b>SPEED is ready.</b><br>Tap the sparkling gold upgrade.`
   :`<b>${labels[k]} is ready.</b><br>Tap the sparkling gold upgrade.`,
  'Back to game',
  ()=>resumeTutorial(),
  k==='speed'?'speed':null
 );
}
function spawnTutorialLookout(){
 if(people.some(e=>e.kind==='tutorialGuard'))return;
 people.push({id:9001,kind:'tutorialGuard',task:'Watching the memorial lawn exit',speed:0,route:[{x:1320,y:1585,wait:99,face:-Math.PI/2}],x:1320,y:1585,index:0,state:'wait',wait:99,range:245,angle:-Math.PI/2,half:.9,frozen:0,path:null,search:0,cooldown:0,walk:0,clock:0,tint:'#9a856f'});
}
function afterTutorialPurchase(k){
 tone(780,.14);updateEchoDisplay();updateSkills();refreshUpgradeStates();
 if(k==='speed'){
  tutorial.stage=3;
  tutorialCard('Speed',`Faster.<br><b>Next: find the golden ghost.</b>`,'Find the Vanish token',()=>resumeTutorial(),'speed');
 }else if(k==='invisibility'){
  energy=runCapacity(run);tutorial.stage=5;tutorial.refillActive=false;spawnTutorialLookout();
  tutorialCard('Vanish',`The lookout keeps turning.<br><b>VANISH. Slip past unseen.</b>`,'Practise Vanish',()=>resumeTutorial(),'invisibility');
 }else if(k==='phase'){
  tutorial.stage=8;
  tutorialCard('Phase',`<b>PHASE</b> lets you pass through matching materials.<br>Try the door ahead.`,'Practise Phase',()=>resumeTutorial(),'phase');
 }else if(k==='touch'){
  tutorial.stage=11;
  tutorialCard('Touch',`<b>TOUCH</b> moves the physical world.<br>Open the barrier ahead.`,'Practise Touch',()=>resumeTutorial(),'touch');
 }
}
function completeTutorial(){
 p.tutorialSeen=true;save();tutorial={active:false,stage:0,useTime:0};
 tutorialCard('You remember enough.',`Explore. Collect. Upgrade. Survive.`,'Begin Level 1',()=>start(false));
}
function animateTutorialDemo(kind){
 const c=$('tutorialDemo');if(!c)return;const g=c.getContext('2d');g.imageSmoothingEnabled=false;
 const loop=now=>{if($('tutorialDemo')!==c)return;g.fillStyle='#0c1922';g.fillRect(0,0,270,120);g.fillStyle='#33473d';g.fillRect(0,92,270,28);
  const q=(now*.08)%180,x=45+q;
  if(kind==='speed'){for(let i=0;i<4;i++){const xx=42-i*14-(now*.18)%14;g.fillStyle='#b6f7d288';g.fillRect(xx,66+i%2*8,8,2)}}
  if(kind==='phase'){g.fillStyle='#786b7f';g.fillRect(132,20,18,72);for(let y=24;y<88;y+=12){g.fillStyle='#ac96b8';g.fillRect(135,y,12,2)}}
  if(kind==='touch'){g.fillStyle='#a78255';g.fillRect(155+Math.sin(now*.004)*8,60,36,32);g.fillStyle='#d4b477';g.fillRect(159+Math.sin(now*.004)*8,64,28,3)}
  const alpha=kind==='invisibility'&&q>80&&q<145?.22:1;drawGhost(g,Math.min(218,x),72,2,2,now/1000,alpha);
  if(kind==='invisibility'){g.fillStyle='#b98f77';g.fillRect(205,48,13,35);g.fillStyle='#d7b18d';g.fillRect(207,37,10,13);g.fillStyle='#efc98a22';g.beginPath();g.moveTo(205,65);g.lineTo(145,40);g.lineTo(145,90);g.fill()}
  requestAnimationFrame(loop)};requestAnimationFrame(loop);
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
function applyGraveyardStoryBeat(step){
 if(step===1){
  moveNamedPeople(/Groundskeeper|Grounds assistant/, [{x:1820,y:1810},{x:2050,y:1900}]);
  note('TASK COMPLETE · The grounds staff move off toward the maintenance yard.',3.3);
 }
 if(step===2){
  moveNamedPeople(/Funeral director|Funeral guest/, [{x:1180,y:1210},{x:1400,y:1200}]);
  note('TASK COMPLETE · The funeral staff begin preparing everyone to leave.',3.3);
 }
 if(step===3){
  moveNamedPeople(/Caretaker|Gardener/, [{x:1710,y:620},{x:1960,y:540}]);
  note('TASK COMPLETE · Another memory settles. The cemetery keeps moving around you.',3.3);
 }
 if(step===4){
  sendFuneralProcession();
  note('TASK COMPLETE · The service ends and the procession starts for the gate.',3.3);
 }
 if(step===5){
  openCemeteryGate();
  note('TASK COMPLETE · The procession is through. The cemetery gate stays open.',3.3);
 }
}
const TUTORIAL_TARGETS={
 1:{id:9101,x:1120,y:1940,title:'Reach the Speed token',hint:'20 Echoes · reach the golden ghost.',cost:20,upgrade:'speed'},
 3:{id:9102,x:1500,y:1740,title:'Reach the Vanish token',hint:'25 Echoes · reach the golden ghost.',cost:25,upgrade:'invisibility'},
 5:{id:9103,x:1320,y:1510,title:'Get past the lookout',hint:'Vanish past the lookout.'},
 6:{id:9104,x:1470,y:1360,title:'Reach the Phase token',hint:'26 Echoes · reach the golden ghost.',cost:26,upgrade:'phase'},
 8:{id:9105,x:1320,y:1120,title:'Phase through the doorway',hint:'Phase through the door.'},
 9:{id:9106,x:1480,y:1020,title:'Reach the Touch token',hint:'30 Echoes · reach the golden ghost.',cost:30,upgrade:'touch'},
 11:{id:9107,x:1320,y:780,title:'Open the way with Touch',hint:'Touch the barrier open.'}
};
const TUTORIAL_SECTION_STARTS={
 5:{x:1320,y:1710},
 8:{x:1320,y:1365},
 11:{x:1320,y:1015}
};
const TUTORIAL_REFILL={id:9199,x:1160,y:1695,title:'Vanish refill'};
function resetTutorialSection(){
 const start=TUTORIAL_SECTION_STARTS[tutorial.stage]||{x:1320,y:2130};
 ghost.x=start.x;ghost.y=start.y;lastSafe={...start};seen=0;held=false;contact=null;contactTime=0;phaseExit=null;
 if(tutorial.stage===5){energy=runCapacity(run);tutorial.refillActive=false;spawnTutorialLookout();const guard=people.find(e=>e.kind==='tutorialGuard');if(guard){guard.x=1320;guard.y=1585;guard.clock=0;guard.angle=-Math.PI/2;guard.frozen=0;}}
 const touchGate=blocks.find(b=>b.tutorialGate==='touch');if(tutorial.stage===11&&touchGate)touchGate.open=false;
 if(nav)nav=navigation(blocks);
 mode='play';$('overlay').hidden=true;resetInput();updateSkills();refreshUpgradeStates();updateObjectiveHud();
}
function tutorialCaught(){
 if(mode!=='play')return;
 mode='tutorialCaught';resetInput();tone(150,.2);
 show(`<span class="eyebrow">CAUGHT</span><h2>Someone Saw You</h2><p class="subtitle">Try that bit again.</p><button class="primary" id="tutorialRetry">Retry</button><button class="secondary" id="tutorialMenu">Main Menu</button>`);
 $('tutorialRetry').onclick=resetTutorialSection;
 $('tutorialMenu').onclick=home;
}
function tutorialRefillToken(){
 if(!tutorial.active||tutorial.stage!==5||!tutorial.refillActive)return null;
 return TUTORIAL_REFILL;
}
function updateTutorialRefill(){
 if(!tutorial.active||tutorial.stage!==5)return;
 if(energy<=0&&!tutorial.refillActive){tutorial.refillActive=true;held=false;note('VANISH EMPTY · REFILL APPEARED',1.8);updateSkills();}
 if(tutorial.refillActive&&Math.hypot(ghost.x-TUTORIAL_REFILL.x,ghost.y-TUTORIAL_REFILL.y)<24){
  energy=runCapacity(run);tutorial.refillActive=false;held=false;tone(820,.12);note('VANISH REFILLED',1.3);updateSkills();
 }
}
function tutorialTarget(){return tutorial.active?TUTORIAL_TARGETS[tutorial.stage]||null:null}
function setupTutorialCourse(){
 // The memorial lawn becomes a compact sequence of real gameplay gates.
 const add=(x,y,w,h,kind='hedge',phase=99,touch=99,extra={})=>{const b={x,y,w,h,kind,phase,touch,open:false,tutorial:true,...extra};blocks.push(b);return b};
 add(1010,1570,270,28);add(1360,1570,240,28); // watched gap at x 1280–1360
 add(1010,1250,270,28);add(1360,1250,240,28);add(1280,1250,80,28,'door',1,99,{tutorialGate:'phase'});
 add(1010,900,270,28);add(1360,900,240,28);add(1280,900,80,28,'door',2,1,{tutorialGate:'touch'});
 nav=navigation(blocks);for(const target of Object.values(TUTORIAL_TARGETS)){const q=nav.nearest(target);if(q){target.x=q.x;target.y=q.y}}const refillSpot=nav.nearest(TUTORIAL_REFILL);if(refillSpot){TUTORIAL_REFILL.x=refillSpot.x;TUTORIAL_REFILL.y=refillSpot.y}people=[];tokens=[];
}
function tutorialBounds(){
 if(!tutorial.active)return;
 ghost.x=Math.max(1015,Math.min(1595,ghost.x));
 ghost.y=Math.max(700,Math.min(2240,ghost.y));
}
function tutorialCheckpoint(){
 const target=tutorialTarget();if(!target||Math.hypot(ghost.x-target.x,ghost.y-target.y)>26)return;
 const need=target.cost||0;
 if(need&&run.echoes<need){note(`Need ${need} Echoes · ${run.echoes}/${need}.`,2);return}
 if(tutorial.stage===1){tutorial.stage=2;tutorialUpgradeReady('speed');return}
 if(tutorial.stage===3){tutorial.stage=4;tutorialUpgradeReady('invisibility');return}
 if(tutorial.stage===5){
  people=people.filter(e=>e.kind!=='tutorialGuard');tutorial.stage=6;held=false;updateSkills();
  tutorialCard('That worked.',`Unseen.<br><b>Next: 26 Echoes and the golden ghost.</b>`,'Continue',()=>resumeTutorial());
  return;
 }
 if(tutorial.stage===6){tutorial.stage=7;tutorialUpgradeReady('phase');return}
 if(tutorial.stage===8){
  held=false;tutorial.stage=9;updateSkills();
  tutorialCard('You passed through it.',`Through.<br><b>Next: 30 Echoes and the golden ghost.</b>`,'Continue',()=>resumeTutorial());
  return;
 }
 if(tutorial.stage===9){tutorial.stage=10;tutorialUpgradeReady('touch');return}
 if(tutorial.stage===11){completeTutorial()}
}
function tutorialObjective(){
 const target=tutorialTarget();
 if(target)return target;
 const k=tutorialExpectedUpgrade();
 if(k){const price=runCost(run,k);return {title:`Upgrade ${names[k]}`,hint:`The upgrade is ready. Tap the sparkling gold ${k==='speed'?'SPEED button':'upgrade tab'} now.`,x:ghost.x,y:ghost.y,cost:price}}
 return null;
}
function currentObjective(){
 if(tutorial.active)return tutorialObjective();
 if(p.level!==0)return null;
 if(run.objective>=GRAVEYARD_OBJECTIVES.length)return run.exitOpen?{title:'Leave the graveyard',hint:'The gate is open. Go through it.',x:world.ferry.x,y:world.ferry.y}:null;
 return GRAVEYARD_OBJECTIVES[run.objective];
}
function objectiveDirection(dx,dy){const a=Math.atan2(dy,dx),oct=Math.round(a/(Math.PI/4));return ['→','↘','↓','↙','←','↖','↑','↗'][((oct%8)+8)%8];}
function updateObjectiveHud(){
 const box=$('objectiveHud');if(!box)return;
 const obj=currentObjective();
 if(!obj||mode!=='play'){box.hidden=true;return}
 box.hidden=false;
 $('objectiveCount').textContent=tutorial.active?'TUTORIAL':run.exitOpen?'5 / 5 · EXIT OPEN':`${Math.min(run.objective+1,5)} / 5`;
 $('objectiveTitle').textContent=obj.title.toUpperCase();
 const dx=obj.x-ghost.x,dy=obj.y-ghost.y,dist=Math.round(Math.hypot(dx,dy)/10)*10;
 $('objectiveMeta').textContent=`${objectiveDirection(dx,dy)} ${dist} paces · ${obj.hint}`;
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
function completeCurrentObjective(){
 const obj=GRAVEYARD_OBJECTIVES[run.objective];if(!obj)return;
 run.objective++;
 tone(720,.12);applyGraveyardStoryBeat(run.objective);
 updateObjectiveHud();
}
function checkObjectives(){
 if(p.level!==0||tutorial.active||run.objective>=GRAVEYARD_OBJECTIVES.length)return;
 const obj=GRAVEYARD_OBJECTIVES[run.objective];
 if(Math.hypot(ghost.x-obj.x,ghost.y-obj.y)<62)completeCurrentObjective();
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
 world=built.generated;blocks=world.blocks;nav=built.builtNav;people=isTutorial?[]:built.builtPeople;tokens=isTutorial?[]:built.builtTokens;scenery=built.builtScenery;
 run=newRun(p.level);run.objective=0;run.exitOpen=false;visited=new Set();effects={boost:0,stiff:0,energy:0};ghost={...world.spawn,face:1};lastSafe={...ghost};phaseExit=null;runPoints=0;t=0;seen=0;contact=null;contactTime=0;energy=0;selected='invisibility';tutorial={active:isTutorial,stage:isTutorial?1:0,useTime:0,refillActive:false};if(isTutorial)setupTutorialCourse();cam=world.spawn.y-viewH*.55;camX=world.spawn.x-240;resetInput();$('overlay').hidden=true;$('hud').hidden=false;$('controls').hidden=false;updateSkills();updateEchoDisplay();
 updateObjectiveHud();if(isTutorial)tutorialCard('Follow the sparkle',`Move around the memorial lawn. Every new patch of ground gives you <b>1 Echo</b>. Your first target is the sparkling token. Explore until you have <b>20 Echoes</b> and reach it. This first lesson will show you how to make your ghost faster.`,'Start tutorial');
 else note(p.level===0?'Objective 1/5 · Find your grave.':'Find what you left unfinished.',4);
 tone(320);
}
function finish(win=false){if(mode!=='play')return;$('objectiveHud').hidden=true;$('tokenInventory').hidden=true;p.best=Math.max(p.best,runPoints);p.runs++;if(win){if(p.level<4){p.unlockedLevel=Math.max(p.unlockedLevel,p.level+1);p.level++;}else p.won=true;}save();tone(win?880:160,.3);shop(true,win);}
function pause(){if(mode!=='play')return;save();mode='pause';show(`<span class="eyebrow">TAKE A BREATHER</span><h2>Time stands still.</h2><button class="primary" id="resume">Keep going</button><button class="secondary" id="end">Return home</button>${footer()}`);$('resume').onclick=()=>{mode='play';$('overlay').hidden=true;resetInput()};$('end').onclick=()=>{mode='play';finish()};}
$('pause').onclick=pause;window.addEventListener('blur',pause);window.addEventListener('pagehide',save);document.addEventListener('visibilitychange',()=>{if(document.hidden)pause()});
const GHOST_PIXELS=['00001111110000','00111111111100','01111111111110','01111111111110','11111111111111','11111111111111','11111111111111','11111111111111','11111111111111','11111111111111','11111111111111','11111111111111','01121122112110','00111011011100','00010000001000'];
function rect(c,x,y,w,h,color){c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),w,h)}
function prop(b){drawSceneryProp(ctx,b);if(!b.open&&b.phase<99&&Math.hypot(b.x+b.w/2-ghost.x,b.y+b.h/2-ghost.y)<180){
 const type=b.kind==='gate'?'GATE':b.kind==='door'?'DOOR':'OBSTACLE',mat=MATERIALS[b.phase].toUpperCase();
 ctx.font='bold 8px sans-serif';ctx.fillStyle='#fff0c5';ctx.textAlign='center';
 ctx.fillText(`${mat} ${type} · PHASE ${b.phase}${b.touch<99?` / TOUCH ${b.touch}`:''}`,b.x+b.w/2,b.y-13);
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
 const crate='<path d="M20 16h10v11H20z" fill="#d4ab67"/><path d="M21 17h8v1h-8zm0 8h8v1h-8zM21 18h1v7h-1zm7 0h1v7h-1zM23 20h1v1h-1zm1 1h1v1h-1zm1 1h1v1h-1z" fill="#785b3c"/><path d="M18 15h2v3h2v2h-4z" fill="#eef2e6"/>';
 const trails='<path d="M0 9h5v2H0zm2 6h3v2H2zm-2 5h5v2H0z" fill="#b6f7d2"/>';
 const shimmer='<path d="M3 3h1v1H3zm-1 1h3v1H2zm1 1h1v1H3zm21 13h1v1h-1zm-1 1h3v1h-3zm1 1h1v1h-1z" fill="#b6f7d2"/>';
 return `<svg viewBox="0 0 32 30" shape-rendering="crispEdges" aria-hidden="true">${shadow}${k==='phase'?wall:''}${k==='speed'?trails:''}<g ${k==='touch'?'transform="translate(-3 0)"':''}>${body}${eyes}</g>${k==='phase'?'<path d="M17 5h3v15h-3z" fill="#ab91c8" opacity=".5"/><path d="m25 10 4 4-4 4v-3h-3v-2h3z" fill="#e6ceff"/>':''}${k==='touch'?crate:''}${k==='invisibility'?shimmer:''}</svg>`;
}
function updateEchoDisplay(){$('distance').textContent=run.echoes;}
function refreshUpgradeStates(){
 const expected=tutorial.active?tutorialExpectedUpgrade():null;
 const speed=$('speedUpgrade');
 if(speed){
  const price=runCost(run,'speed'),max=run.speed>=RUN_MAX.speed,allowed=!max&&run.echoes>=price&&(!tutorial.active||expected==='speed');
  speed.hidden=mode!=='play';speed.disabled=!allowed;speed.classList.toggle('affordable',allowed);
  speed.innerHTML=`<small>SPEED · TIER ${run.speed}</small><strong>${max?'MAX':'↑ '+price}</strong>`;
 }
 document.querySelectorAll('[data-upgrade]').forEach(button=>{
  const k=button.dataset.upgrade,price=runCost(run,k),max=run[k]>=RUN_MAX[k],allowed=!max&&run.echoes>=price&&(!tutorial.active||expected===k);
  button.disabled=!allowed;button.classList.toggle('affordable',allowed);button.classList.toggle('tutorialForced',tutorial.active&&expected===k&&allowed);
 });
}
function updateSkills(){
 $('abilityBar').innerHTML=['invisibility','phase','touch'].map(k=>{
  const unlocked=run[k]>0,max=run[k]>=RUN_MAX[k],price=runCost(run,k);
  return `<div class="abilitySlot"><button class="ability ${unlocked?'ready':'locked'}" id="ability-${k}" aria-label="Use ${names[k]}" aria-pressed="false" data-ability="${k}"><span class="abilityArt">${skillGlyph(k)}</span><strong>${labels[k]}</strong><small id="reserve-${k}">${!unlocked?'LOCKED':k==='invisibility'?energy.toFixed(1)+'s':'TIER '+run[k]}</small><span class="abilityMeter"><i id="meter-${k}"></i></span></button><button class="abilityUpgrade" data-upgrade="${k}" aria-label="Upgrade ${names[k]}"><b>+</b><span>${max?'MAX':price}</span></button></div>`;
 }).join('');
 document.querySelectorAll('[data-upgrade]').forEach(button=>button.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();buyUpgrade(button.dataset.upgrade)}));
 document.querySelectorAll('[data-ability]').forEach(button=>button.onpointerdown=e=>{e.preventDefault();e.stopPropagation();toggleAbility(button.dataset.ability)});
 const speed=$('speedUpgrade');if(speed)speed.onpointerdown=e=>{e.preventDefault();e.stopPropagation();buyUpgrade('speed')};
 refreshUpgradeStates();
}
$('game').addEventListener('pointerdown',e=>{
 if(mode!=='play'||stickPointer!==null||e.target.closest('button,a,#overlay'))return;
 e.preventDefault();stickPointer=e.pointerId;stickOrigin={x:e.clientX,y:e.clientY};const r=$('game').getBoundingClientRect();$('stick').style.left=`${e.clientX-r.left}px`;$('stick').style.top=`${e.clientY-r.top}px`;$('stick').hidden=false;$('game').setPointerCapture(e.pointerId);moveStick(e);
});
function moveStick(e){if(e.pointerId!==stickPointer)return;const dx=e.clientX-stickOrigin.x,dy=e.clientY-stickOrigin.y,len=Math.hypot(dx,dy),s=Math.min(1,len/42);input={x:len?dx/len*s:0,y:len?dy/len*s:0};$('nub').style.transform=`translate(${input.x*30}px,${input.y*30}px)`;}
$('game').addEventListener('pointermove',moveStick);
for(const ev of ['pointerup','pointercancel','lostpointercapture'])$('game').addEventListener(ev,e=>{if(e.pointerId===stickPointer){stickPointer=null;input={x:0,y:0};$('nub').style.transform='';$('stick').hidden=true}});
window.addEventListener('keydown',e=>{if(e.code==='Escape'){pause();return}if(mode!=='play')return;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();keys.add(e.code);if(e.code==='Space')held=true;const k={Digit1:'invisibility',Digit2:'phase',Digit3:'touch'}[e.code];if(k&&run[k]){held=false;selected=k;updateSkills()}});window.addEventListener('keyup',e=>{keys.delete(e.code);if(e.code==='Space')held=false});
function active(k){return held&&selected===k&&run[k]>0&&(k!=='invisibility'||energy>0)}
function move(dx,dy,dt){
 const nx=ghost.x+dx,ny=ghost.y+dy,hits=blocks.filter(b=>overlap(nx,ny,b)),phase=active('phase');
 const blocked=hits.find(b=>!(phase&&run.phase>=b.phase&&!(b.exit&&!run.exitOpen)));
 if(blocked){
  if(blocked.exit&&!run.exitOpen){note('The cemetery gate is still shut · finish what is keeping you here.',1.8);return}
  if(active('touch')&&run.touch>=blocked.touch){
   if(contact!==blocked){contact=blocked;contactTime=0}contactTime+=dt;
   if(contactTime>.18){blocked.open=true;if(nav)nav=navigation(blocks);if(nav)investigate(people,nav,{x:blocked.x+blocked.w/2,y:blocked.y+blocked.h/2});contact=null;held=false;updateSkills();note(`${MATERIALS[blocked.phase]} ${blocked.kind==='gate'?'gate':'door'} opened.`,1.7);tone(180)}
  }else if(blocked.phase<99)note(`${MATERIALS[blocked.phase]} · Needs PHASE ${blocked.phase}${blocked.touch<99?` or TOUCH ${blocked.touch}`:''}`,1.2);
  return;
 }
 if(tutorial.active){
  if(tutorial.stage<5&&ny<1605){note('Follow the golden ghost first.',1.4);return}
  if(tutorial.stage===5&&ny<1570&&!active('invisibility')){note('Use VANISH to cross.',1.5);return}
 }
 ghost.x=nx;ghost.y=ny;tutorialBounds();
 if(!hits.length){lastSafe={x:ghost.x,y:ghost.y};phaseExit=null}else if(phase){phaseExit={x:dx,y:dy}}
}
function update(dt){t+=dt;effects.boost=Math.max(0,effects.boost-dt);if(nav)updateEntities(people,nav,blocks,dt);
let x=input.x+(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0),y=input.y+(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-(keys.has('KeyW')||keys.has('ArrowUp')?1:0),len=Math.hypot(x,y);if(len>1){x/=len;y/=len}if(x)ghost.face=x<0?0:2;else if(y)ghost.face=y<0?3:1;
// Finish the current crossing on release; fall back safely if another material blocks the exit.
if(phaseExit&&!active('phase')){const length=Math.hypot(phaseExit.x,phaseExit.y)||1;let exit=null;for(let d=1;d<160;d++){const x=ghost.x+phaseExit.x/length*d,y=ghost.y+phaseExit.y/length*d;if(blocks.some(b=>overlap(x,y,b)&&b.phase>run.phase))break;if(!blocks.some(b=>overlap(x,y,b))){exit={x,y};break}}ghost.x=(exit||lastSafe).x;ghost.y=(exit||lastSafe).y;lastSafe={x:ghost.x,y:ghost.y};phaseExit=null}
const s=runSpeed(run)*(effects.boost>0?1.65:1)*dt;if(x)move(x*s,0,dt);if(y)move(0,y*s,dt);if(!active('touch')){contact=null;contactTime=0}ghost.x=Math.max(34,Math.min(WORLD.width-34,ghost.x));ghost.y=Math.max(34,Math.min(WORLD.height-34,ghost.y));
// Every genuinely new cell is one Echo. The feedback is immediate.
if(!blocks.some(b=>overlap(ghost.x,ghost.y,b,0))&&discover(visited,ghost.x,ghost.y)){runPoints++;run.explored++;run.echoes++;tone(500,.025);updateEchoDisplay();refreshUpgradeStates();}

effects.energy=energy;
for(const message of collectTokens(tokens,ghost,effects,run,runCapacity(run))){note(message,4);tone(740,.15);updateEchoDisplay();updateSkills();updateTokenInventory()}
energy=effects.energy;
checkObjectives();
let invisible=active('invisibility');
if(invisible){
 energy=Math.max(0,energy-dt);
 if(energy<=0){held=false;invisible=false;updateSkills();if(!(tutorial.active&&tutorial.stage===5))note('Vanish exhausted.',1.4)}
}
if(tutorial.active){updateTutorialRefill();tutorialCheckpoint();}
const sight=resolveSightings(people,ghost,blocks,effects,invisible,(source,max)=>nav?investigate(people,nav,source,max):0);
if(sight.blocked){seen=0;note('Scared Stiff! Witness frozen · charge used.',3);tone(180,.22);updateTokenInventory()}
const spotted=sight.danger;
if(tutorial.active&&tutorial.stage===5&&spotted&&!invisible){
 seen+=dt;
 if(seen>.18){tutorialCaught();return}
}else{
 seen=spotted?seen+dt:Math.max(0,seen-dt*3);
 if(seen>.18){finish();return}
}
if(!tutorial.active&&(p.level!==0||run.exitOpen)&&Math.hypot(ghost.x-world.ferry.x,ghost.y-world.ferry.y)<48){finish(true);return}
cam+=(ghost.y-viewH*.55-cam)*Math.min(1,dt*8);
camX+=(ghost.x-240-camX)*Math.min(1,dt*8);
cam=Math.max(0,Math.min(WORLD.height-viewH,cam));
camX=Math.max(0,Math.min(WORLD.width-480,camX));
$('distance').textContent=run.echoes;
$('chapter').textContent=areaAt(ghost.x,ghost.y,p.level).name.toUpperCase();
$('best').textContent=tutorial.active?`TUTORIAL · ${run.echoes} ECHOES`:[effects.boost>0?`BOOST ${Math.ceil(effects.boost)}s`:'',effects.stiff?`SCARED STIFF ×${effects.stiff}`:'',p.level===0?`${Math.min(run.objective,5)}/5 TASKS`:`FOUND ${runPoints}`].filter(Boolean).join(' · ');updateObjectiveHud();
for(const k of ['invisibility','phase','touch']){
 const button=$('ability-'+k),using=active(k);if(!button)continue;
 button.classList.toggle('active',using);button.setAttribute('aria-pressed',String(using));
 $('reserve-'+k).textContent=!run[k]?'LOCKED':k==='invisibility'?`${using?'ACTIVE · ':''}${energy.toFixed(1)}s`:`${using?'ACTIVE · ':''}TIER ${run[k]}`;
 $('meter-'+k).style.width=!run[k]?'0%':k==='invisibility'?`${energy/Math.max(.01,runCapacity(run))*100}%`:'100%';
}
updateEchoDisplay();refreshUpgradeStates();
}

function drawToken(token){
 const x=token.x,y=token.y,bob=reduced?0:Math.round(Math.sin(t*4+token.id)*3),scale=1.5;
 ctx.save();ctx.translate(x,y+bob);
 const glow=20+(reduced?0:Math.sin(t*6+token.id)*4);
 const aura=ctx.createRadialGradient(0,0,2,0,0,glow);aura.addColorStop(0,'#fff2a8aa');aura.addColorStop(.45,'#f3c64f66');aura.addColorStop(1,'#f3c64f00');
 ctx.fillStyle=aura;ctx.beginPath();ctx.arc(0,0,glow,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#15120b66';ctx.beginPath();ctx.ellipse(0,13,9,3,0,0,Math.PI*2);ctx.fill();
 for(let j=0;j<GHOST_PIXELS.length;j++)for(let i=0;i<14;i++){
  const v=GHOST_PIXELS[j][i];if(v==='0')continue;
  rect(ctx,(i-7)*scale,(j-8)*scale,scale,scale,v==='2'?'#d6a942':'#ffd970');
 }
 // Tiny dark eyes keep the pickup recognisably the same ghost.
 rect(ctx,-4.5,-4.5,1.5,4.5,'#49391f');rect(ctx,1.5,-4.5,1.5,4.5,'#49391f');
 for(let i=0;i<4;i++){const a=t*2.5+token.id+i*Math.PI/2,r=17+(i%2)*3;const sx=Math.cos(a)*r,sy=Math.sin(a)*r;rect(ctx,sx-1.5,sy-1.5,3,3,i%2?'#fff4bc':'#ffd970')}
 ctx.restore();
}
function draw(){
 ctx.fillStyle='#111c27';ctx.fillRect(0,0,480,viewH);ctx.save();ctx.translate(-Math.round(camX),-Math.round(cam));
 // Static floor detail is cached once; only the visible camera crop is drawn per frame.
 if(scenery)ctx.drawImage(scenery,Math.round(camX),Math.round(cam),480,Math.min(viewH,WORLD.height-cam),Math.round(camX),Math.round(cam),480,Math.min(viewH,WORLD.height-cam));else{ctx.fillStyle='#263a37';ctx.fillRect(Math.round(camX),Math.round(cam),480,Math.min(viewH,WORLD.height-cam));}
 for(const d of (world.decor||[]))if(d.kind==='lamp'&&d.x>camX-40&&d.x<camX+520&&d.y>cam-40&&d.y<cam+viewH+40)drawStreetLamp(ctx,d);
 for(const h of people){if(h.frozen>0)continue;if(h.x<camX-200||h.x>camX+680||h.y<cam-200||h.y>cam+viewH+200)continue;ctx.beginPath();ctx.moveTo(h.x,h.y);for(let a=h.angle-h.half;a<=h.angle+h.half+.01;a+=.075){let d=0;for(;d<h.range;d+=10){if(blocks.some(b=>overlap(h.x+Math.cos(a)*d,h.y+Math.sin(a)*d,b,0)))break}ctx.lineTo(h.x+Math.cos(a)*d,h.y+Math.sin(a)*d)}ctx.closePath();ctx.fillStyle=h.kind==='cat'?'#b6d99d10':h.kind==='camera'?'#b6cce328':seen?'#efac7955':'#f7d49a1c';ctx.fill();}
 const visible=blocks.filter(b=>b.x+b.w>camX-50&&b.x<camX+530&&b.y+b.h>cam-60&&b.y<cam+viewH+60);for(const b of visible){if(b.exit)continue;if(b.kind==='water'){rect(ctx,b.x,b.y,b.w,b.h,'#254655');for(let y=Math.max(b.y,Math.floor(cam/32)*32);y<Math.min(b.y+b.h,cam+viewH);y+=32)for(let x=b.x+10;x<b.x+b.w;x+=56)rect(ctx,x+Math.round(Math.sin(t+y)*3),y,26,2,'#8ebaba25');}else prop(b);}
 people.filter(h=>h.x>camX-40&&h.x<camX+520&&h.y>cam-50&&h.y<cam+viewH+50).forEach(drawEntity);
 ctx.textAlign='center';ctx.font='11px sans-serif';ctx.fillStyle='#e0dcc470';for(const r of (world.regions||[]))if(r.x+r.w>camX&&r.x<camX+480&&r.y>cam-30&&r.y<cam+viewH)ctx.fillText(r.name.toUpperCase(),r.x+r.w/2,r.y+40);
 if(p.level===0){drawCemeteryExit(ctx,world.ferry,!!run.exitOpen);ctx.fillStyle='#dce6bf';ctx.font='bold 12px Georgia';ctx.textAlign='center';ctx.fillText('CEMETERY GATE',world.ferry.x,world.ferry.y+22);}else{drawFerry(ctx,world.ferry);ctx.fillStyle='#dce6bf';ctx.font='bold 12px Georgia';ctx.textAlign='center';ctx.fillText('THE WAY FORWARD',world.ferry.x,world.ferry.y-110);}

 for(const token of tokens)if(!token.collected&&token.x>camX-30&&token.x<camX+510&&token.y>cam-30&&token.y<cam+viewH+30)drawToken(token);const tutorialPickup=tutorialTarget();if(tutorialPickup)drawToken(tutorialPickup);const refill=tutorialRefillToken();if(refill)drawToken(refill);
 const obj=currentObjective();if(obj){const pulse=12+(reduced?0:Math.sin(t*4)*4);ctx.strokeStyle='#f3ce87';ctx.lineWidth=3;ctx.beginPath();ctx.arc(obj.x,obj.y,pulse,0,Math.PI*2);ctx.stroke();rect(ctx,obj.x-3,obj.y-3,6,6,'#fff1ae');}
 drawGhost(ctx,ghost.x,ghost.y-16,3,ghost.face,t,active('invisibility')?.25:active('phase')?.6:1);
 if(active('touch')){ctx.strokeStyle='#e9c58a';ctx.lineWidth=2;ctx.beginPath();ctx.arc(ghost.x,ghost.y-7,24,0,7);ctx.stroke()}ctx.restore();
 if(mode==='play')drawMap();
}
function drawMap(){const x=366,y=102,w=98,h=90,sx=w/WORLD.width,sy=h/WORLD.height;rect(ctx,x-4,y-4,w+8,h+8,'#0d1c27dd');ctx.strokeStyle='#8caa8370';ctx.lineWidth=1;ctx.strokeRect(x-4,y-4,w+8,h+8);for(const r of (world.regions||[]))rect(ctx,x+r.x*sx,y+r.y*sy,r.w*sx,r.h*sy,'#55716a44');for(const token of tokens)if(!token.collected){const tw=reduced?2:(Math.sin(t*5+token.id)>.15?3:2);rect(ctx,x+token.x*sx-tw/2,y+token.y*sy-tw/2,tw,tw,'#f3ce87')}const tt=tutorialTarget();if(tt){const tw=reduced?3:(Math.sin(t*6)>.1?5:3);rect(ctx,x+tt.x*sx-tw/2,y+tt.y*sy-tw/2,tw,tw,'#fff0a8')}const rf=tutorialRefillToken();if(rf){const tw=4;rect(ctx,x+rf.x*sx-2,y+rf.y*sy-2,tw,tw,'#fff0a8')}rect(ctx,x+ghost.x*sx-2,y+ghost.y*sy-2,4,4,'#ffffff');ctx.fillStyle='#c0d1be';ctx.font='8px sans-serif';ctx.textAlign='right';ctx.fillText(`LEVEL ${p.level+1}`,x+w,y+h+14);}
function resize(){const r=canvas.getBoundingClientRect();viewH=480*r.height/r.width;canvas.width=480;canvas.height=Math.round(viewH);ctx.imageSmoothingEnabled=false;if(mode!=='play'){cam=Math.max(0,Math.min(WORLD.height-viewH,world.spawn.y-viewH*.55));camX=Math.max(0,world.spawn.x-240)}}window.addEventListener('resize',resize);resize();home();
function frame(now){const dt=Math.min(.035,(now-last)/1000||0);last=now;if(mode==='play'){update(dt);draw()}else if(mode==='menu')t+=dt;$('notice').style.opacity=mode==='play'&&now<noticeUntil?'1':'0';requestAnimationFrame(frame)}requestAnimationFrame(frame);
