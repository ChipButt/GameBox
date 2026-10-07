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

const BASE='https://chipbutt.github.io/ToolBox/assets/gamebox/kenney/2d/Holiday%20Pack%202016/RTS%20pack/Retina/';
const ASSETS={
  snowA:'RTSobject_01.png',snowB:'RTSobject_02.png',
  treeSmall:'RTSobject_03.png',tree:'RTSobject_04.png',candy:'RTSobject_05.png',
  giftGreen:'RTSobject_06.png',giftGreen2:'RTSobject_07.png',giftOrange:'RTSobject_08.png',giftRed:'RTSobject_09.png',
  candyAlt:'RTSobject_10.png',giftPairA:'RTSobject_11.png',giftPairB:'RTSobject_12.png',
  baubleRed:'RTSobject_13.png',baubleGreen:'RTSobject_14.png',workshopMark:'RTSobject_15.png',
  garland:'RTSobject_17.png',lamp:'RTSobject_18.png'
};
const images={};
let assetsReady=false;

const TOWERS={
  tree:{name:'TREE BLASTER',asset:'tree',cost:50,range:92,damage:10,rate:.52,shotSpeed:240,kind:'rapid'},
  candy:{name:'CANDY CANNON',asset:'candy',cost:70,range:105,damage:24,rate:1.1,shotSpeed:205,kind:'splash'},
  frost:{name:'FROST LAMP',asset:'lamp',cost:80,range:88,damage:4,rate:.72,shotSpeed:250,kind:'slow'},
  gift:{name:'PRESENT POPPER',asset:'giftPairA',cost:100,range:122,damage:42,rate:1.65,shotSpeed:185,kind:'heavy'}
};

const ENEMIES={
  parcel:{asset:'giftRed',hp:34,speed:38,reward:7,size:28,leak:1},
  runner:{asset:'baubleGreen',hp:24,speed:58,reward:8,size:27,leak:1},
  double:{asset:'giftPairB',hp:82,speed:31,reward:12,size:34,leak:1},
  boss:{asset:'workshopMark',hp:300,speed:25,reward:40,size:48,leak:3}
};

const WAVES=[
  [['parcel',8]],
  [['parcel',8],['runner',4]],
  [['parcel',10],['double',3]],
  [['runner',9],['parcel',7]],
  [['double',6],['runner',6]],
  [['parcel',12],['double',6],['runner',6]],
  [['runner',14],['double',7]],
  [['double',10],['parcel',12]],
  [['runner',12],['double',10],['parcel',10]],
  [['parcel',10],['runner',10],['double',8],['boss',1]]
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
  {asset:'treeSmall',x:28,y:85,s:48},{asset:'tree',x:355,y:85,s:58},
  {asset:'giftGreen',x:34,y:205,s:34},{asset:'giftOrange',x:358,y:213,s:34},
  {asset:'candyAlt',x:27,y:330,s:44},{asset:'treeSmall',x:362,y:330,s:46},
  {asset:'giftPairA',x:38,y:523,s:40},{asset:'candy',x:355,y:518,s:42}
];

let money=160,lives=10,score=0,wave=1,perfectWaves=0;
let routeKey='left',waveActive=false,paused=false,gameEnded=false,soundOn=true;
let selectedPad=-1,selectedTower=-1;
let enemies=[],towers=[],projectiles=[],particles=[],spawnQueue=[];
let spawnClock=0,leaksThisWave=0,last=0,raf=0,bannerTimer=0,audioCtx=null,howFromPause=false;
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
  Promise.all(entries.map(([key,file])=>new Promise((resolve,reject)=>{
    const im=new Image();im.decoding='async';
    im.onload=()=>{images[key]=im;resolve()};
    im.onerror=reject;im.src=BASE+file;
  }))).then(()=>{
    assetsReady=true;
    playButton.disabled=false;
    playButton.textContent='DEFEND THE WORKSHOP';
    draw();
  }).catch(()=>{
    playButton.disabled=false;
    playButton.textContent='DEFEND THE WORKSHOP';
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
  enemies=[];towers=[];projectiles=[];particles=[];spawnQueue=[];spawnClock=0;leaksThisWave=0;
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
  showBanner('BUILD YOUR DEFENCES');
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
  finalBreakdown.textContent=Math.min(wave,10)+' waves · '+perfectWaves+' perfect · '+lives+' workshop health · +'+healthBonus+' health bonus';
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
  buildHint.textContent='Tower selected.';
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
  towers.push({type,pad:selectedPad,x:pads[selectedPad].x,y:pads[selectedPad].y,level:1,cooldown:0,spent:def.cost,pulse:0});
  tone('build');selectedPad=-1;
  buildHint.textContent='Defence built. Tap another pad or start the wave.';
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
  buildHint.textContent='Tower sold. Build pad is free again.';tone('sell');updateUI();draw();
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
  projectiles.push({
    x:t.x,y:t.y,target,damage:def.damage*levelScale,speed:def.shotSpeed,
    kind:def.kind,splash:def.kind==='splash'?34+(t.level-1)*5:def.kind==='heavy'?26:0,
    slow:def.kind==='slow'?.32:0,dead:false
  });
  t.cooldown=def.rate/(1+(t.level-1)*.13);
  t.pulse=.14;tone('shot');
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
  ctx.save();
  ctx.translate(195,37);
  ctx.fillStyle='#d85351';ctx.beginPath();ctx.moveTo(-35,5);ctx.lineTo(0,-22);ctx.lineTo(35,5);ctx.closePath();ctx.fill();
  ctx.fillStyle='#fff';ctx.fillRect(-28,4,56,34);
  ctx.fillStyle='#2c8b5a';ctx.fillRect(-9,18,18,20);
  ctx.fillStyle='#f3c15a';ctx.fillRect(12,11,9,9);
  ctx.strokeStyle='#184b66';ctx.lineWidth=3;ctx.strokeRect(-28,4,56,34);
  ctx.fillStyle='#184b66';ctx.font='900 8px Arial Rounded MT Bold,Arial';ctx.textAlign='center';ctx.fillText('WORKSHOP',0,52);
  ctx.restore();
  drawImageKey('treeSmall',145,42,40);drawImageKey('giftGreen',245,41,30);
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

function drawTower(t,index){
  const def=TOWERS[t.type];
  ctx.save();
  if(selectedTower===index){ctx.beginPath();ctx.arc(t.x,t.y,def.range*(1+(t.level-1)*.08),0,Math.PI*2);ctx.fillStyle='rgba(74,158,190,.09)';ctx.fill();ctx.strokeStyle='rgba(74,158,190,.4)';ctx.lineWidth=1.5;ctx.stroke()}
  const pulse=t.pulse>0?1.08:1;
  drawImageKey(def.asset,t.x,t.y,46*pulse);
  ctx.fillStyle='#184b66';ctx.beginPath();ctx.arc(t.x+14,t.y+14,8,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#fff';ctx.font='900 8px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(t.level,t.x+14,t.y+14);
  ctx.restore();
}

function drawEnemy(e){
  ctx.save();
  if(e.flash>0)ctx.globalAlpha=.55;
  drawImageKey(ENEMIES[e.kind].asset,e.x,e.y,e.size);
  const w=Math.max(18,e.size*.8),ratio=clamp(e.hp/e.maxHp,0,1);
  ctx.fillStyle='rgba(17,61,85,.22)';ctx.fillRect(e.x-w/2,e.y-e.size*.55-7,w,4);
  ctx.fillStyle=ratio>.5?'#35a56a':ratio>.25?'#f1b94d':'#d95452';ctx.fillRect(e.x-w/2,e.y-e.size*.55-7,w*ratio,4);
  if(e.slow>0){ctx.strokeStyle='#76cbe7';ctx.lineWidth=2;ctx.beginPath();ctx.arc(e.x,e.y,e.size*.42,0,Math.PI*2);ctx.stroke()}
  ctx.restore();
}

function drawProjectile(p){
  ctx.save();
  if(p.kind==='splash'){ctx.fillStyle='#d95553';ctx.beginPath();ctx.arc(p.x,p.y,4,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke()}
  else if(p.kind==='slow'){ctx.fillStyle='#80d5ee';ctx.beginPath();ctx.arc(p.x,p.y,4,0,Math.PI*2);ctx.fill()}
  else if(p.kind==='heavy'){ctx.fillStyle='#f3c15a';ctx.fillRect(p.x-4,p.y-4,8,8)}
  else{ctx.fillStyle='#fff';ctx.strokeStyle='#9fd1e3';ctx.lineWidth=1;ctx.beginPath();ctx.arc(p.x,p.y,4,0,Math.PI*2);ctx.fill();ctx.stroke()}
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
  else{selectedPad=-1;selectedTower=-1;towerPanel.classList.remove('show');buildHint.textContent='Tap a glowing build pad, then choose a defence.'}
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