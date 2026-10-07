(()=>{
'use strict';

const canvas=document.getElementById('gameCanvas');
const ctx=canvas.getContext('2d');
const W=390,H=540;
const waveHud=document.getElementById('waveHud');
const moneyHud=document.getElementById('moneyHud');
const livesHud=document.getElementById('livesHud');
const scoreHud=document.getElementById('scoreHud');
const bestStart=document.getElementById('bestStart');
const waveBanner=document.getElementById('waveBanner');
const shiftRouteButton=document.getElementById('shiftRouteButton');
const routeLabel=document.getElementById('routeLabel');
const startWaveButton=document.getElementById('startWaveButton');
const towerChoices=[...document.querySelectorAll('.towerChoice')];
const buildHint=document.getElementById('buildHint');
const towerPanel=document.getElementById('towerPanel');
const towerPanelName=document.getElementById('towerPanelName');
const towerPanelStats=document.getElementById('towerPanelStats');
const upgradeButton=document.getElementById('upgradeButton');
const upgradeCostEl=document.getElementById('upgradeCost');
const sellButton=document.getElementById('sellButton');
const sellValueEl=document.getElementById('sellValue');
const startOverlay=document.getElementById('startOverlay');
const gameOverOverlay=document.getElementById('gameOverOverlay');
const playButton=document.getElementById('playButton');
const introHowButton=document.getElementById('introHowButton');
const finalScoreEl=document.getElementById('finalScore');
const finalBreakdown=document.getElementById('finalBreakdown');
const recordText=document.getElementById('recordText');
const resultEyebrow=document.getElementById('resultEyebrow');
const resultTitle=document.getElementById('resultTitle');
const againButton=document.getElementById('againButton');
const pauseButton=document.getElementById('pauseButton');
const pauseSheet=document.getElementById('pauseSheet');
const closePause=document.getElementById('closePause');
const resumeButton=document.getElementById('resumeButton');
const pauseHowButton=document.getElementById('pauseHowButton');
const restartButton=document.getElementById('restartButton');
const soundButton=document.getElementById('soundButton');
const howSheet=document.getElementById('howSheet');
const closeHow=document.getElementById('closeHow');
const closeHowButton=document.getElementById('closeHowButton');

const HOLIDAY='https://chipbutt.github.io/ToolBox/assets/gamebox/kenney/2d/Holiday%20Pack%202016/RTS%20pack/Retina/';
const TOON='https://chipbutt.github.io/ToolBox/assets/gamebox/kenney/2d/Toon%20Characters/';
const BUILD='https://chipbutt.github.io/ToolBox/assets/gamebox/kenney/2d/Platformer%20Assets%20Buildings/';

const ASSETS={
  snowA:HOLIDAY+'RTSobject_01.png',snowB:HOLIDAY+'RTSobject_02.png',
  treeSmall:HOLIDAY+'RTSobject_03.png',tree:HOLIDAY+'RTSobject_04.png',candy:HOLIDAY+'RTSobject_05.png',
  giftGreen:HOLIDAY+'RTSobject_06.png',giftGreen2:HOLIDAY+'RTSobject_07.png',giftOrange:HOLIDAY+'RTSobject_08.png',giftRed:HOLIDAY+'RTSobject_09.png',
  candyAlt:HOLIDAY+'RTSobject_10.png',giftPairA:HOLIDAY+'RTSobject_11.png',giftPairB:HOLIDAY+'RTSobject_12.png',
  garland:HOLIDAY+'RTSobject_17.png',

  snowElfIdle:TOON+'Male%20adventurer/Poses%20HD/character_maleAdventurer_idle.png',
  snowElfAttack:TOON+'Male%20adventurer/Poses%20HD/character_maleAdventurer_attack0.png',
  frostElfIdle:TOON+'Female%20adventurer/Poses%20HD/character_femaleAdventurer_idle.png',
  frostElfAttack:TOON+'Female%20adventurer/Poses%20HD/character_femaleAdventurer_attack0.png',
  guardIdle:TOON+'Male%20person/Poses%20HD/character_malePerson_idle.png',
  guardAttack:TOON+'Male%20person/Poses%20HD/character_malePerson_attack0.png',

  grump0:TOON+'Zombie/Poses%20HD/character_zombie_walk0.png',
  grump1:TOON+'Zombie/Poses%20HD/character_zombie_walk1.png',
  brute0:TOON+'Zombie/Poses%20HD/character_zombie_attack0.png',
  brute1:TOON+'Zombie/Poses%20HD/character_zombie_attack1.png',
  toy0:TOON+'Robot/Poses%20HD/character_robot_walk0.png',
  toy1:TOON+'Robot/Poses%20HD/character_robot_walk1.png',

  workshopWall:BUILD+'houseDark.png',
  workshopRoof:BUILD+'roofRedMid.png',
  workshopDoor:BUILD+'doorOpen.png',
  workshopDoorTop:BUILD+'doorTop.png',
  workshopWindow:BUILD+'windowCheckered.png',
  workshopChimney:BUILD+'chimney.png'
};
const images={};
let assetsReady=false;

const TOWERS={
  snowElf:{name:'SNOWBALL ELF',idle:'snowElfIdle',attack:'snowElfAttack',cost:50,range:96,damage:11,rate:.48,shotSpeed:255,kind:'snow'},
  frostElf:{name:'FROST ELF',idle:'frostElfIdle',attack:'frostElfAttack',cost:75,range:98,damage:7,rate:.72,shotSpeed:245,kind:'frost'},
  guard:{name:'NUTCRACKER GUARD',idle:'guardIdle',attack:'guardAttack',cost:90,range:112,damage:14,rate:.38,shotSpeed:290,kind:'candyBolt'},
  cannon:{name:'PRESENT CANNON',asset:'giftPairA',cost:110,range:126,damage:36,rate:1.35,shotSpeed:205,kind:'present'}
};

const ENEMIES={
  grump:{assets:['grump0','grump1'],hp:36,speed:38,reward:7,size:30,leak:1},
  toybot:{assets:['toy0','toy1'],hp:25,speed:59,reward:8,size:29,leak:1},
  brute:{assets:['brute0','brute1'],hp:92,speed:30,reward:13,size:39,leak:1},
  boss:{assets:['brute0','brute1'],hp:330,speed:24,reward:45,size:54,leak:3,boss:true}
};

const WAVES=[
  [['grump',8]],
  [['grump',8],['toybot',4]],
  [['grump',10],['brute',3]],
  [['toybot',9],['grump',7]],
  [['brute',6],['toybot',6]],
  [['grump',12],['brute',6],['toybot',6]],
  [['toybot',14],['brute',7]],
  [['brute',10],['grump',12]],
  [['toybot',12],['brute',10],['grump',10]],
  [['grump',10],['toybot',10],['brute',8],['boss',1]]
];

const ROUTES={
  left:[
    [195,554],[195,487],[105,452],[88,385],[88,330],[145,295],[205,270],[205,220],[150,184],[105,150],[110,98],[170,70],[195,54]
  ],
  right:[
    [195,554],[195,487],[285,452],[302,385],[302,330],[245,295],[185,270],[185,220],[240,184],[285,150],[280,98],[220,70],[195,54]
  ]
};

const pads=[
  {x:60,y:480},{x:330,y:480},{x:48,y:386},{x:342,y:386},
  {x:145,y:365},{x:245,y:365},{x:50,y:280},{x:340,y:280},
  {x:120,y:230},{x:270,y:230},{x:65,y:155},{x:325,y:155},
  {x:150,y:120},{x:240,y:120}
];

const decor=[
  {asset:'treeSmall',x:28,y:96,s:46},{asset:'tree',x:357,y:102,s:55},
  {asset:'candyAlt',x:28,y:226,s:40},{asset:'treeSmall',x:362,y:230,s:43},
  {asset:'tree',x:28,y:344,s:52},{asset:'candy',x:360,y:350,s:40},
  {asset:'giftGreen',x:28,y:505,s:30},{asset:'giftOrange',x:360,y:505,s:30}
]

let money=160,lives=10,score=0,wave=1,perfectWaves=0;
let routeKey='left',waveActive=false,paused=false,gameEnded=false,soundOn=true;
let selectedPad=-1,selectedTower=-1;
let enemies=[],towers=[],projectiles=[],particles=[],spawnQueue=[];
let spawnClock=0,leaksThisWave=0,last=0,raf=0,bannerTimer=0,audioCtx=null,howFromPause=false,animClock=0;
const BEST_KEY='gamebox.workshopWatch.best.v1';
let best=Number(localStorage.getItem(BEST_KEY)||0)||0;
bestStart.textContent=pad(best,4);

function pad(v,n=4){return String(Math.max(0,Math.floor(v))).padStart(n,'0')}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function img(key){return images[key]}
function distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
function pointDist(x1,y1,x2,y2){return Math.hypot(x1-x2,y1-y2)}

function loadAssets(){
  const entries=Object.entries(ASSETS);
  Promise.all(entries.map(([key,url])=>new Promise((resolve,reject)=>{
    const im=new Image();im.decoding='async';
    im.onload=()=>{images[key]=im;resolve()};
    im.onerror=reject;im.src=url;
  }))).then(()=>{
    assetsReady=true;
    playButton.disabled=false;
    playButton.textContent='DEFEND THE PRESENTS';
    draw();
  }).catch(()=>{
    playButton.disabled=false;
    playButton.textContent='DEFEND THE PRESENTS';
    draw();
  });
}

function tone(kind){
  if(!soundOn)return;
  try{
    audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)();
    const o=audioCtx.createOscillator(),g=audioCtx.createGain();
    const map={build:[510,.055],shot:[730,.025],hit:[250,.025],wave:[620,.09],leak:[120,.13],win:[880,.18],sell:[330,.05]};
    const spec=map[kind]||[440,.04];
    o.frequency.value=spec[0];o.type=kind==='leak'?'sawtooth':'sine';
    g.gain.setValueAtTime(.055,audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+spec[1]);
    o.connect(g).connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+spec[1]);
  }catch{}
}

function showBanner(textValue){
  waveBanner.textContent=textValue;
  waveBanner.classList.add('show');
  bannerTimer=1.5;
}

function buildPathData(points){
  const segments=[];let total=0;
  for(let i=0;i<points.length-1;i++){
    const a=points[i],b=points[i+1];
    const len=Math.hypot(b[0]-a[0],b[1]-a[1]);
    segments.push({a,b,len,start:total});total+=len;
  }
  return {points,segments,total};
}
const pathData={left:buildPathData(ROUTES.left),right:buildPathData(ROUTES.right)};

function pathPosition(path,travel){
  if(travel<=0)return {x:path.points[0][0],y:path.points[0][1],progress:0};
  if(travel>=path.total){
    const p=path.points[path.points.length-1];return{x:p[0],y:p[1],progress:1};
  }
  for(const seg of path.segments){
    if(travel<=seg.start+seg.len){
      const t=(travel-seg.start)/seg.len;
      return{x:seg.a[0]+(seg.b[0]-seg.a[0])*t,y:seg.a[1]+(seg.b[1]-seg.a[1])*t,progress:travel/path.total};
    }
  }
  return{x:195,y:54,progress:1};
}

function resetGame(){
  money=160;lives=10;score=0;wave=1;perfectWaves=0;routeKey='left';
  waveActive=false;paused=false;gameEnded=false;selectedPad=-1;selectedTower=-1;
  enemies=[];towers=[];projectiles=[];particles=[];spawnQueue=[];spawnClock=0;leaksThisWave=0;animClock=0;
  gameOverOverlay.classList.remove('show');pauseSheet.classList.remove('show');howSheet.classList.remove('show');
  towerPanel.classList.remove('show');
  updateUI();draw();
}

function startGame(){
  resetGame();
  startOverlay.classList.remove('show');
  last=performance.now();
  if(raf)cancelAnimationFrame(raf);
  raf=requestAnimationFrame(loop);
  showBanner('DEPLOY YOUR DEFENDERS');
}

function makeWaveQueue(index){
  const groups=WAVES[index-1]||[];
  const q=[];
  for(const [kind,count] of groups){
    for(let i=0;i<count;i++)q.push(kind);
  }
  return q;
}

function startWave(){
  if(waveActive||gameEnded||wave>10)return;
  selectedPad=-1;selectedTower=-1;towerPanel.classList.remove('show');
  waveActive=true;leaksThisWave=0;
  spawnQueue=makeWaveQueue(wave);
  spawnClock=.15;
  startWaveButton.disabled=true;shiftRouteButton.disabled=true;
  showBanner('WAVE '+wave);
  tone('wave');
  updateUI();
}

function spawnEnemy(kind){
  const type=ENEMIES[kind];
  const hpScale=1+(wave-1)*.12;
  enemies.push({
    kind,routeKey,travel:0,hp:type.hp*hpScale,maxHp:type.hp*hpScale,
    speed:type.speed*(1+(wave-1)*.018),reward:type.reward,size:type.size,
    leak:type.leak,slow:0,flash:0,x:195,y:H+10
  });
}

function finishWave(){
  waveActive=false;
  const wasPerfect=leaksThisWave===0;
  const waveBonus=100+wave*15;
  score+=waveBonus;
  money+=18+wave*2;
  if(wasPerfect){perfectWaves++;score+=100;money+=20;showBanner('PERFECT WAVE +100');}
  else showBanner('WAVE CLEAR +'+waveBonus);
  if(wave>=10){
    endGame(true);return;
  }
  wave++;
  startWaveButton.disabled=false;shiftRouteButton.disabled=false;
  updateUI();
}

function endGame(victory){
  if(gameEnded)return;
  gameEnded=true;waveActive=false;
  const healthBonus=lives*50;
  const final=score+healthBonus;
  const isBest=final>best;
  if(isBest){best=final;localStorage.setItem(BEST_KEY,String(best))}
  resultEyebrow.textContent=victory?'WORKSHOP SAFE':'WORKSHOP BREACHED';
  resultEyebrow.classList.toggle('danger',!victory);
  resultTitle.textContent=victory?'CHRISTMAS SAVED!':'RUN OVER';
  finalScoreEl.textContent=final;
  finalBreakdown.textContent=Math.min(wave,10)+' waves · '+perfectWaves+' perfect · '+lives+' presents safe · +'+healthBonus+' protection bonus';
  recordText.textContent=isBest?'NEW BEST SCORE '+best:'Best score: '+best;
  bestStart.textContent=pad(best,4);
  gameOverOverlay.classList.add('show');
  tone(victory?'win':'leak');
}

function selectPad(index){
  if(waveActive)return;
  selectedPad=index;selectedTower=-1;towerPanel.classList.remove('show');
  towerChoices.forEach(b=>b.classList.remove('selected'));
  buildHint.textContent='Choose a defence for this build pad.';
  updateUI();
}

function selectTower(index){
  selectedTower=index;selectedPad=-1;
  const t=towers[index];
  towerPanelName.textContent=TOWERS[t.type].name;
  towerPanelStats.textContent='LEVEL '+t.level+' · '+towerStatText(t);
  const cost=upgradeCost(t),sell=sellValue(t);
  upgradeCostEl.textContent=cost;sellValueEl.textContent=sell;
  upgradeButton.disabled=waveActive||t.level>=3||money<cost;
  upgradeButton.textContent=t.level>=3?'MAX LEVEL':'UPGRADE '+cost;
  sellButton.textContent='SELL '+sell;
  towerPanel.classList.add('show');
  buildHint.textContent='Defender selected.';
}

function towerStatText(t){
  const def=TOWERS[t.type];
  return Math.round(def.damage*(1+(t.level-1)*.35))+' DMG · '+Math.round(def.range*(1+(t.level-1)*.08))+' RANGE';
}
function upgradeCost(t){return Math.round(TOWERS[t.type].cost*(.65+t.level*.35))}
function sellValue(t){return Math.round(t.spent*.65)}

function buildTower(type){
  if(selectedPad<0||waveActive)return;
  const def=TOWERS[type];
  if(money<def.cost){showBanner('NOT ENOUGH BAUBLES');return}
  if(towers.some(t=>t.pad===selectedPad))return;
  money-=def.cost;
  towers.push({type,pad:selectedPad,x:pads[selectedPad].x,y:pads[selectedPad].y,level:1,cooldown:0,spent:def.cost,pulse:0,aimAngle:-Math.PI/2});
  tone('build');selectedPad=-1;
  buildHint.textContent='Defender deployed. Tap another pad or start the wave.';
  towerChoices.forEach(b=>b.classList.remove('selected'));
  updateUI();draw();
}

function upgradeSelected(){
  if(selectedTower<0||waveActive)return;
  const t=towers[selectedTower];if(!t||t.level>=3)return;
  const cost=upgradeCost(t);if(money<cost)return;
  money-=cost;t.spent+=cost;t.level++;t.pulse=.35;tone('build');
  selectTower(selectedTower);updateUI();
}

function sellSelected(){
  if(selectedTower<0||waveActive)return;
  const t=towers[selectedTower];if(!t)return;
  const value=sellValue(t);money+=value;
  towers.splice(selectedTower,1);selectedTower=-1;towerPanel.classList.remove('show');
  buildHint.textContent='Defender sold. Build pad is free again.';tone('sell');updateUI();draw();
}

function targetForTower(t){
  const def=TOWERS[t.type];const range=def.range*(1+(t.level-1)*.08);
  let bestTarget=null,bestProgress=-1;
  for(const e of enemies){
    if(pointDist(t.x,t.y,e.x,e.y)<=range && e.progress>bestProgress){
      bestTarget=e;bestProgress=e.progress;
    }
  }
  return bestTarget;
}

function fireTower(t,target){
  const def=TOWERS[t.type];
  const levelScale=1+(t.level-1)*.35;
  t.aimAngle=Math.atan2(target.y-t.y,target.x-t.x);
  projectiles.push({
    x:t.x,y:t.y,target,damage:def.damage*levelScale,speed:def.shotSpeed,
    kind:def.kind,
    splash:def.kind==='present'?34+(t.level-1)*5:0,
    slow:def.kind==='frost'?.34:0,
    dead:false
  });
  t.cooldown=def.rate/(1+(t.level-1)*.13);
  t.pulse=.16;tone('shot');
}

function updateTowers(dt){
  for(const t of towers){
    t.cooldown-=dt;t.pulse=Math.max(0,t.pulse-dt);
    if(t.cooldown>0)continue;
    const target=targetForTower(t);
    if(target)fireTower(t,target);
  }
}

function hitEnemy(p,e){
  if(!e||e.dead)return;
  if(p.splash>0){
    for(const other of enemies){
      if(pointDist(e.x,e.y,other.x,other.y)<=p.splash){
        other.hp-=p.damage;other.flash=.08;
        if(p.slow)other.slow=Math.max(other.slow,1.6);
      }
    }
  }else{
    e.hp-=p.damage;e.flash=.08;
    if(p.slow)e.slow=Math.max(e.slow,1.8);
  }
  for(let i=0;i<4;i++)particles.push({x:e.x,y:e.y,vx:(Math.random()-.5)*50,vy:(Math.random()-.5)*50,life:.28,size:2});
  tone('hit');
}

function updateProjectiles(dt){
  for(const p of projectiles){
    if(p.dead)continue;
    const e=p.target;
    if(!e||e.dead||!enemies.includes(e)){p.dead=true;continue}
    const dx=e.x-p.x,dy=e.y-p.y,d=Math.hypot(dx,dy);
    if(d<7){hitEnemy(p,e);p.dead=true;continue}
    const step=Math.min(d,p.speed*dt);p.x+=dx/d*step;p.y+=dy/d*step;
  }
  projectiles=projectiles.filter(p=>!p.dead);
}

function killEnemy(e){
  if(e.dead)return;e.dead=true;money+=e.reward;score+=10+wave*2;
  for(let i=0;i<9;i++)particles.push({x:e.x,y:e.y,vx:(Math.random()-.5)*80,vy:(Math.random()-.5)*80,life:.42,size:2+Math.random()*2});
}

function updateEnemies(dt){
  for(const e of enemies){
    e.slow=Math.max(0,e.slow-dt);e.flash=Math.max(0,e.flash-dt);
    const speed=e.speed*(e.slow>0?.58:1);
    e.travel+=speed*dt;
    const p=pathPosition(pathData[e.routeKey],e.travel);
    e.x=p.x;e.y=p.y;e.progress=p.progress;
    if(e.hp<=0){killEnemy(e);continue}
    if(e.progress>=1){
      e.dead=true;lives=Math.max(0,lives-e.leak);leaksThisWave+=e.leak;
      showBanner('-'+e.leak+' WORKSHOP');tone('leak');
      if(lives<=0){endGame(false);return}
    }
  }
  enemies=enemies.filter(e=>!e.dead);
}

function updateSpawning(dt){
  if(!waveActive)return;
  if(spawnQueue.length){
    spawnClock-=dt;
    if(spawnClock<=0){
      spawnEnemy(spawnQueue.shift());
      spawnClock=Math.max(.38,.86-wave*.035);
    }
  }else if(enemies.length===0 && projectiles.length===0){
    finishWave();
  }
}

function updateParticles(dt){
  for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=20*dt;p.life-=dt}
  particles=particles.filter(p=>p.life>0);
}

function update(dt){
  if(paused||gameEnded)return;
  animClock+=dt;
  if(bannerTimer>0){bannerTimer-=dt;if(bannerTimer<=0)waveBanner.classList.remove('show')}
  updateSpawning(dt);
  updateEnemies(dt);
  updateTowers(dt);
  updateProjectiles(dt);
  updateParticles(dt);
  updateUI();
}

function drawImageKey(key,x,y,size,alpha=1){
  const im=img(key);if(!im)return;
  ctx.save();ctx.globalAlpha=alpha;ctx.drawImage(im,x-size/2,y-size/2,size,size);ctx.restore();
}

function drawImageRect(key,x,y,w,h,alpha=1){
  const im=img(key);if(!im)return;
  ctx.save();ctx.globalAlpha=alpha;ctx.drawImage(im,x,y,w,h);ctx.restore();
}

function drawAssetBottom(key,x,bottomY,maxW,maxH,alpha=1){
  const im=img(key);if(!im)return;
  const scale=Math.min(maxW/im.width,maxH/im.height);
  const w=im.width*scale,h=im.height*scale;
  ctx.save();ctx.globalAlpha=alpha;ctx.drawImage(im,x-w/2,bottomY-h,w,h);ctx.restore();
}

function drawRoute(points,active){
  ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
  ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);
  for(let i=1;i<points.length;i++)ctx.lineTo(points[i][0],points[i][1]);
  ctx.strokeStyle=active?'#acd8e6':'rgba(156,204,219,.24)';ctx.lineWidth=active?46:22;ctx.stroke();
  if(active){
    ctx.strokeStyle='#edfaff';ctx.lineWidth=36;ctx.stroke();
    ctx.setLineDash([5,10]);ctx.strokeStyle='rgba(173,216,230,.75)';ctx.lineWidth=2;ctx.stroke();
  }
  ctx.restore();
}

function drawWorkshop(){
  // Proper asset-built workshop facade: textured wall, roof, windows, door,
  // chimney, garland and protected present stacks.
  const x=195;
  drawImageRect('workshopWall',139,10,112,47);
  drawImageRect('workshopRoof',132,-1,126,20);
  drawImageRect('workshopChimney',224,-8,18,30);
  drawImageRect('workshopWindow',150,24,23,23);
  drawImageRect('workshopWindow',217,24,23,23);
  drawImageRect('workshopDoor',184,25,22,34);
  drawImageRect('workshopDoorTop',184,17,22,22);
  drawImageRect('garland',150,12,90,15);

  ctx.save();
  ctx.fillStyle='rgba(255,255,255,.92)';ctx.strokeStyle='#184b66';ctx.lineWidth=2;
  ctx.beginPath();ctx.roundRect(159,51,72,16,6);ctx.fill();ctx.stroke();
  ctx.fillStyle='#184b66';ctx.font='900 8px Arial Rounded MT Bold,Arial';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText('WORKSHOP',x,59);ctx.restore();

  drawImageKey('giftPairA',126,49,36);
  drawImageKey('giftPairB',265,49,36);
  drawImageKey('treeSmall',107,37,38);
  drawImageKey('treeSmall',283,37,38);
}

function drawPad(p,index){
  const occupied=towers.some(t=>t.pad===index);
  if(occupied)return;
  ctx.save();
  ctx.beginPath();ctx.arc(p.x,p.y,17,0,Math.PI*2);
  ctx.fillStyle=selectedPad===index?'rgba(245,196,90,.38)':'rgba(255,255,255,.72)';ctx.fill();
  ctx.strokeStyle=selectedPad===index?'#e9ad32':'#6faac0';ctx.lineWidth=2;ctx.setLineDash([4,3]);ctx.stroke();
  ctx.setLineDash([]);ctx.strokeStyle=selectedPad===index?'#d18b19':'#5f99ae';ctx.lineWidth=3;
  ctx.beginPath();ctx.moveTo(p.x-6,p.y);ctx.lineTo(p.x+6,p.y);ctx.moveTo(p.x,p.y-6);ctx.lineTo(p.x,p.y+6);ctx.stroke();
  ctx.restore();
}

function drawElfHat(x,y,color){
  ctx.save();
  ctx.fillStyle=color;ctx.strokeStyle='#184b66';ctx.lineWidth=1.5;
  ctx.beginPath();ctx.moveTo(x-14,y+4);ctx.lineTo(x+12,y+4);ctx.lineTo(x+4,y-18);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(x,y+5,15,4,0,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.arc(x+4,y-18,4,0,Math.PI*2);ctx.fill();
  ctx.restore();
}

function drawNutcrackerHat(x,y){
  ctx.save();
  ctx.fillStyle='#172f3c';ctx.strokeStyle='#184b66';ctx.lineWidth=1.5;
  ctx.fillRect(x-11,y-18,22,18);ctx.strokeRect(x-11,y-18,22,18);
  ctx.fillStyle='#d75250';ctx.fillRect(x-12,y-4,24,5);
  ctx.fillStyle='#f3c15a';ctx.fillRect(x-4,y-17,8,4);
  ctx.restore();
}

function drawPresentCannon(t){
  const a=t.aimAngle||-Math.PI/2;
  ctx.save();ctx.translate(t.x,t.y+3);
  ctx.fillStyle='#334d5d';ctx.beginPath();ctx.arc(-12,13,7,0,Math.PI*2);ctx.arc(12,13,7,0,Math.PI*2);ctx.fill();
  drawImageKey('giftPairA',t.x,t.y+5,42);
  ctx.translate(0,-5);ctx.rotate(a);
  ctx.fillStyle='#d75250';ctx.strokeStyle='#184b66';ctx.lineWidth=2;
  ctx.fillRect(0,-6,31,12);ctx.strokeRect(0,-6,31,12);
  ctx.fillStyle='#f3c15a';ctx.fillRect(4,-6,5,12);
  ctx.restore();
}

function drawTower(t,index){
  const def=TOWERS[t.type];
  ctx.save();
  if(selectedTower===index){
    ctx.beginPath();ctx.arc(t.x,t.y,def.range*(1+(t.level-1)*.08),0,Math.PI*2);
    ctx.fillStyle='rgba(74,158,190,.09)';ctx.fill();
    ctx.strokeStyle='rgba(74,158,190,.4)';ctx.lineWidth=1.5;ctx.stroke();
  }

  if(t.type==='cannon'){
    drawPresentCannon(t);
  }else{
    const key=t.pulse>.04?def.attack:def.idle;
    drawAssetBottom(key,t.x,t.y+19,45,59);
    if(t.type==='snowElf')drawElfHat(t.x,t.y-28,'#2f9a63');
    else if(t.type==='frostElf')drawElfHat(t.x,t.y-28,'#4a9fc4');
    else if(t.type==='guard')drawNutcrackerHat(t.x,t.y-25);
  }

  ctx.fillStyle='#184b66';ctx.beginPath();ctx.arc(t.x+15,t.y+15,8,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#fff';ctx.font='900 8px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(t.level,t.x+15,t.y+15);
  ctx.restore();
}

function drawEnemy(e){
  const def=ENEMIES[e.kind];
  const frame=def.assets[(Math.floor(animClock*6)+Math.floor(e.travel/18))&1];
  const alpha=e.flash>0?.55:1;
  drawAssetBottom(frame,e.x,e.y+e.size*.48,e.size,e.size*1.48,alpha);

  if(def.boss){
    ctx.save();
    ctx.fillStyle='#472b2b';ctx.strokeStyle='#184b66';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(e.x-18,e.y-e.size*.55);ctx.lineTo(e.x-29,e.y-e.size*.83);ctx.lineTo(e.x-10,e.y-e.size*.70);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.moveTo(e.x+18,e.y-e.size*.55);ctx.lineTo(e.x+29,e.y-e.size*.83);ctx.lineTo(e.x+10,e.y-e.size*.70);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.restore();
  }

  const w=Math.max(20,e.size*.9),ratio=clamp(e.hp/e.maxHp,0,1);
  const barY=e.y-e.size*.8-9;
  ctx.fillStyle='rgba(17,61,85,.22)';ctx.fillRect(e.x-w/2,barY,w,4);
  ctx.fillStyle=ratio>.5?'#35a56a':ratio>.25?'#f1b94d':'#d95452';ctx.fillRect(e.x-w/2,barY,w*ratio,4);
  if(e.slow>0){ctx.strokeStyle='#76cbe7';ctx.lineWidth=2;ctx.beginPath();ctx.arc(e.x,e.y,e.size*.55,0,Math.PI*2);ctx.stroke()}
}

function drawProjectile(p){
  ctx.save();
  if(p.kind==='present'){
    ctx.translate(p.x,p.y);ctx.rotate(animClock*5);
    ctx.fillStyle='#d95553';ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.fillRect(-5,-5,10,10);ctx.strokeRect(-5,-5,10,10);
    ctx.fillStyle='#2f9a63';ctx.fillRect(-1,-5,2,10);ctx.fillRect(-5,-1,10,2);
  }else if(p.kind==='frost'){
    ctx.fillStyle='#bdefff';ctx.strokeStyle='#70bfdc';ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,5,0,Math.PI*2);ctx.fill();ctx.stroke();
  }else if(p.kind==='candyBolt'){
    ctx.translate(p.x,p.y);ctx.rotate(Math.PI/4);
    ctx.fillStyle='#fff';ctx.strokeStyle='#d75250';ctx.lineWidth=2;ctx.fillRect(-5,-2,10,4);ctx.strokeRect(-5,-2,10,4);
  }else{
    ctx.fillStyle='#fff';ctx.strokeStyle='#9fd1e3';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(p.x,p.y,5,0,Math.PI*2);ctx.fill();ctx.stroke();
  }
  ctx.restore();
}

function draw(){
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle='#e9f8fd';ctx.fillRect(0,0,W,H);

  const snowA=img('snowA'),snowB=img('snowB');
  if(snowA&&snowB){
    ctx.save();ctx.globalAlpha=.38;
    for(let y=0;y<H;y+=72)for(let x=0;x<W;x+=72)ctx.drawImage(((x+y)/72)%2?snowA:snowB,x,y,72,72);
    ctx.restore();
  }else{
    ctx.fillStyle='rgba(255,255,255,.55)';
    for(let y=18;y<H;y+=34)for(let x=15+(y%2)*7;x<W;x+=41){ctx.beginPath();ctx.arc(x,y,2,0,Math.PI*2);ctx.fill()}
  }

  drawRoute(ROUTES[routeKey==='left'?'right':'left'],false);
  drawRoute(ROUTES[routeKey],true);

  for(const d of decor)drawImageKey(d.asset,d.x,d.y,d.s,.94);
  drawWorkshop();

  pads.forEach(drawPad);
  towers.forEach(drawTower);
  enemies.forEach(drawEnemy);
  projectiles.forEach(drawProjectile);

  ctx.save();ctx.fillStyle='#fff';
  for(const p of particles){ctx.globalAlpha=clamp(p.life*2,0,1);ctx.fillRect(p.x,p.y,p.size,p.size)}
  ctx.restore();

  if(!waveActive&&!gameEnded){
    ctx.save();ctx.fillStyle='rgba(24,75,102,.72)';ctx.font='900 9px Arial Rounded MT Bold,Arial';ctx.textAlign='center';
    ctx.fillText('ROUTE '+(routeKey==='left'?'A':'B')+' · SHIFT BETWEEN WAVES',195,H-12);ctx.restore();
  }
}

function updateUI(){
  waveHud.textContent=pad(Math.min(wave,10),2)+'/10';
  moneyHud.textContent=money;livesHud.textContent=lives;scoreHud.textContent=pad(score,4);
  routeLabel.textContent=routeKey==='left'?'LEFT LOOP':'RIGHT LOOP';
  startWaveButton.textContent=waveActive?'WAVE '+wave+' IN PROGRESS':'START WAVE '+Math.min(wave,10);
  shiftRouteButton.disabled=waveActive||gameEnded;
  startWaveButton.disabled=waveActive||gameEnded;
  for(const b of towerChoices){
    const def=TOWERS[b.dataset.tower];
    b.disabled=waveActive||selectedPad<0||money<def.cost;
  }
}

function handleCanvasPointer(e){
  if(gameEnded||paused)return;
  const r=canvas.getBoundingClientRect();
  const x=(e.clientX-r.left)*W/r.width,y=(e.clientY-r.top)*H/r.height;

  let nearestTower=-1,bestD=26;
  towers.forEach((t,i)=>{const d=pointDist(x,y,t.x,t.y);if(d<bestD){bestD=d;nearestTower=i}});
  if(nearestTower>=0){selectTower(nearestTower);draw();return}

  if(waveActive){towerPanel.classList.remove('show');selectedTower=-1;draw();return}

  let nearestPad=-1;bestD=25;
  pads.forEach((p,i)=>{
    if(towers.some(t=>t.pad===i))return;
    const d=pointDist(x,y,p.x,p.y);if(d<bestD){bestD=d;nearestPad=i}
  });
  if(nearestPad>=0)selectPad(nearestPad);
  else{selectedPad=-1;selectedTower=-1;towerPanel.classList.remove('show');buildHint.textContent='Tap a glowing build pad, then choose a defender.'}
  updateUI();draw();
}

function toggleRoute(){
  if(waveActive||gameEnded)return;
  routeKey=routeKey==='left'?'right':'left';
  selectedPad=-1;showBanner(routeKey==='left'?'ROUTE SHIFTED LEFT':'ROUTE SHIFTED RIGHT');tone('build');updateUI();draw();
}

function openPause(){
  if(gameEnded||startOverlay.classList.contains('show'))return;
  paused=true;pauseSheet.classList.add('show');pauseSheet.setAttribute('aria-hidden','false');
}
function closePauseSheet(){
  pauseSheet.classList.remove('show');pauseSheet.setAttribute('aria-hidden','true');paused=false;last=performance.now();
}
function openHow(fromPause=false){
  howFromPause=fromPause;
  howSheet.classList.add('show');howSheet.setAttribute('aria-hidden','false');
}
function closeHowSheet(){
  howSheet.classList.remove('show');howSheet.setAttribute('aria-hidden','true');
  if(howFromPause){
    howFromPause=false;
    pauseSheet.classList.add('show');pauseSheet.setAttribute('aria-hidden','false');
  }
}

function loop(now){
  const dt=Math.min(.04,(now-last)/1000||.016);last=now;
  update(dt);draw();
  if(!gameEnded)raf=requestAnimationFrame(loop);
}

canvas.addEventListener('pointerdown',handleCanvasPointer);
shiftRouteButton.addEventListener('click',toggleRoute);
startWaveButton.addEventListener('click',startWave);
towerChoices.forEach(b=>b.addEventListener('click',()=>{towerChoices.forEach(x=>x.classList.remove('selected'));b.classList.add('selected');buildTower(b.dataset.tower)}));
upgradeButton.addEventListener('click',upgradeSelected);
sellButton.addEventListener('click',sellSelected);
playButton.addEventListener('click',startGame);
againButton.addEventListener('click',startGame);
pauseButton.addEventListener('click',openPause);
closePause.addEventListener('click',closePauseSheet);
resumeButton.addEventListener('click',closePauseSheet);
restartButton.addEventListener('click',()=>{closePauseSheet();startGame()});
soundButton.addEventListener('click',()=>{soundOn=!soundOn;soundButton.textContent=soundOn?'SOUND ON':'SOUND OFF'});
introHowButton.addEventListener('click',()=>openHow(false));
pauseHowButton.addEventListener('click',()=>{pauseSheet.classList.remove('show');pauseSheet.setAttribute('aria-hidden','true');openHow(true)});
closeHow.addEventListener('click',closeHowSheet);
closeHowButton.addEventListener('click',closeHowSheet);
document.addEventListener('visibilitychange',()=>{if(document.hidden&&!gameEnded&&!startOverlay.classList.contains('show'))openPause()});

loadAssets();updateUI();draw();
})();