(()=>{
'use strict';

const canvas=document.getElementById('gameCanvas');
const ctx=canvas.getContext('2d');
ctx.imageSmoothingEnabled=false;

const W=336,H=480,TILE=16;
const PATH_WIDTH=32;

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

const P82='assets/vendor/admurin/pack82/Monster%20Pack%2082%20(Event)/Snowmen/';
const P85='assets/vendor/admurin/pack85/Monster%20Pack%2085%20(Event%203)/Spritesheets/';
const RABBIT='assets/vendor/admurin/rabbits/Monster%20Pack%20(Free)/Spritesheets/Updated%20Rabbit%20Horned/';
const WINTER='assets/vendor/gherwit/winter/Winter-Download/Winter-tiles.png';

const ASSETS={
  winter:WINTER,
  snowA:P82+'Christmas_Snowman_A_Idle.png',
  snowB:P82+'Christmas_Snowman_B_Idle.png',
  snowC:P82+'Christmas_Snowman_C_Idle.png',
  snowD:P82+'Christmas_Snowman_D_Idle.png',
  snowE:P82+'Christmas_Snowman_E_Idle.png',
  snowF:P82+'Christmas_Snowman_F_Idle.png',
  snowG:P82+'Christmas_Snowman_G_Idle.png',
  ginger:P85+'Gingerbread/Christmas_Gingerbread_Move.png',
  slime:P85+'Slime/Christmas_Slime_Move.png',
  devil:P85+'Devil/Christmas_Devil_Move.png',
  rabbit:RABBIT+'Rabbit_Horned_Move.png'
};

const TOWERS={
  snowA:{name:'SNOWBALLER',asset:'snowA',cost:55,range:88,damage:10,rate:.55,shotSpeed:240,kind:'snow',slow:0,splash:0},
  snowB:{name:'DOUBLE TOSS',asset:'snowB',cost:75,range:86,damage:7,rate:.66,shotSpeed:250,kind:'double',slow:0,splash:0,shots:2},
  snowC:{name:'RAPID SNOW',asset:'snowC',cost:85,range:82,damage:6,rate:.25,shotSpeed:275,kind:'rapid',slow:0,splash:0},
  snowD:{name:'FROST THROW',asset:'snowD',cost:95,range:98,damage:8,rate:.72,shotSpeed:230,kind:'frost',slow:.42,splash:0},
  snowE:{name:'HEAVY SNOW',asset:'snowE',cost:125,range:112,damage:30,rate:1.22,shotSpeed:190,kind:'heavy',slow:0,splash:30},
  snowF:{name:'LONG SHOT',asset:'snowF',cost:110,range:142,damage:22,rate:1.02,shotSpeed:340,kind:'long',slow:0,splash:0},
  snowG:{name:'SNOW CHEER',asset:'snowG',cost:105,range:80,damage:0,rate:0,shotSpeed:0,kind:'support',slow:0,splash:0,support:true,damageBuff:1.16,rateBuff:1.20}
};

const ENEMIES={
  ginger:{asset:'ginger',hp:42,speed:37,reward:8,leak:1,draw:128},
  slime:{asset:'slime',hp:26,speed:58,reward:7,leak:1,draw:128},
  rabbit:{asset:'rabbit',hp:20,speed:73,reward:9,leak:1,draw:144},
  devil:{asset:'devil',hp:112,speed:30,reward:15,leak:1,draw:136},
  boss:{asset:'devil',hp:460,speed:22,reward:60,leak:3,draw:190,boss:true}
};

const WAVES=[
  [['ginger',8]],
  [['ginger',8],['slime',5]],
  [['ginger',9],['rabbit',6]],
  [['slime',9],['ginger',7]],
  [['devil',4],['rabbit',8]],
  [['ginger',12],['devil',5],['slime',7]],
  [['rabbit',13],['devil',7]],
  [['devil',9],['ginger',12]],
  [['rabbit',12],['devil',9],['slime',10]],
  [['ginger',10],['rabbit',10],['devil',8],['boss',1]]
];

// Square, orthogonal routes only. No diagonal track pieces are required.
const ROUTES={
  left:[
    [168,496],[168,416],[72,416],[72,336],[240,336],[240,240],
    [112,240],[112,144],[168,144],[168,64]
  ],
  right:[
    [168,496],[168,416],[264,416],[264,336],[96,336],[96,240],
    [224,240],[224,144],[168,144],[168,64]
  ]
};

const images={};
let snowPattern=null,pathPattern=null;
let money=180,lives=10,score=0,wave=1,perfectWaves=0;
let routeKey='left',waveActive=false,paused=false,gameEnded=false,soundOn=true;
let buildType=null,selectedTower=-1;
let enemies=[],towers=[],projectiles=[],particles=[],spawnQueue=[];
let spawnClock=0,leaksThisWave=0,last=0,raf=0,bannerTimer=0,audioCtx=null,howFromPause=false,animClock=0;
let objectiveHit=0;
let pointer={x:-99,y:-99,inside:false};

const BEST_KEY='gamebox.workshopWatch.best.pixel.v2';
let best=Number(localStorage.getItem(BEST_KEY)||0)||0;
bestStart.textContent=pad(best,4);

function pad(v,n=4){return String(Math.max(0,Math.floor(v))).padStart(n,'0')}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function pointDist(x1,y1,x2,y2){return Math.hypot(x1-x2,y1-y2)}

function loadAssets(){
  const entries=Object.entries(ASSETS);
  Promise.all(entries.map(([key,url])=>new Promise((resolve,reject)=>{
    const im=new Image();
    im.decoding='async';
    im.onload=()=>{images[key]=im;resolve()};
    im.onerror=reject;
    im.src=url;
  }))).then(()=>{
    makeTerrainPatterns();
    playButton.disabled=false;
    playButton.textContent='DEFEND THE WORKSHOP';
    draw();
  }).catch(err=>{
    console.error('Workshop Watch asset load failed',err);
    playButton.disabled=false;
    playButton.textContent='RETRY / PLAY';
    showBanner('ASSET LOAD ERROR');
  });
}

function makeAtlasTile(col,row){
  const off=document.createElement('canvas');
  off.width=TILE;off.height=TILE;
  const oc=off.getContext('2d');
  oc.imageSmoothingEnabled=false;
  oc.drawImage(images.winter,col*TILE,row*TILE,TILE,TILE,0,0,TILE,TILE);
  return off;
}

function makeTerrainPatterns(){
  // Gherwit WINTER TILES: clean snow cell (6,2), textured dirt/path cell (10,2).
  snowPattern=ctx.createPattern(makeAtlasTile(6,2),'repeat');
  pathPattern=ctx.createPattern(makeAtlasTile(10,2),'repeat');
}

function tone(kind){
  if(!soundOn)return;
  try{
    audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)();
    const o=audioCtx.createOscillator(),g=audioCtx.createGain();
    const spec={
      build:[520,.05],shot:[780,.025],heavy:[180,.06],hit:[260,.02],
      wave:[650,.08],leak:[115,.12],win:[900,.16],sell:[330,.045],upgrade:[720,.07]
    }[kind]||[440,.04];
    o.frequency.value=spec[0];
    o.type=kind==='leak'?'sawtooth':'square';
    g.gain.setValueAtTime(.032,audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+spec[1]);
    o.connect(g).connect(audioCtx.destination);
    o.start();o.stop(audioCtx.currentTime+spec[1]);
  }catch{}
}

function showBanner(textValue){
  waveBanner.textContent=textValue;
  waveBanner.classList.add('show');
  bannerTimer=1.35;
}

function buildPathData(points){
  const segments=[];let total=0;
  for(let i=0;i<points.length-1;i++){
    const a=points[i],b=points[i+1];
    const dx=b[0]-a[0],dy=b[1]-a[1];
    const len=Math.hypot(dx,dy);
    let row=0;
    if(Math.abs(dx)>Math.abs(dy))row=dx>0?2:1;
    else row=dy>0?0:3;
    segments.push({a,b,dx,dy,len,start:total,row});
    total+=len;
  }
  return {points,segments,total};
}
const pathData={left:buildPathData(ROUTES.left),right:buildPathData(ROUTES.right)};

function pathPosition(path,travel){
  if(travel<=0){
    const s=path.segments[0];
    return{x:path.points[0][0],y:path.points[0][1],progress:0,row:s.row};
  }
  if(travel>=path.total){
    const p=path.points[path.points.length-1];
    const s=path.segments[path.segments.length-1];
    return{x:p[0],y:p[1],progress:1,row:s.row};
  }
  for(const seg of path.segments){
    if(travel<=seg.start+seg.len){
      const t=(travel-seg.start)/seg.len;
      return{
        x:seg.a[0]+seg.dx*t,
        y:seg.a[1]+seg.dy*t,
        progress:travel/path.total,
        row:seg.row
      };
    }
  }
  return{x:168,y:64,progress:1,row:3};
}

function distanceToSegment(px,py,a,b){
  const vx=b[0]-a[0],vy=b[1]-a[1];
  const wx=px-a[0],wy=py-a[1];
  const len2=vx*vx+vy*vy;
  const t=len2?clamp((wx*vx+wy*vy)/len2,0,1):0;
  return Math.hypot(px-(a[0]+vx*t),py-(a[1]+vy*t));
}

function distanceToActivePath(x,y){
  let best=Infinity;
  const pts=ROUTES[routeKey];
  for(let i=0;i<pts.length-1;i++)best=Math.min(best,distanceToSegment(x,y,pts[i],pts[i+1]));
  return best;
}

function canPlaceTower(x,y){
  if(x<22||x>W-22||y<82||y>H-24)return false;
  if(distanceToActivePath(x,y)<PATH_WIDTH/2+13)return false;
  if(towers.some(t=>pointDist(x,y,t.x,t.y)<30))return false;
  return true;
}

function resetGame(){
  money=180;lives=10;score=0;wave=1;perfectWaves=0;routeKey='left';
  waveActive=false;paused=false;gameEnded=false;buildType=null;selectedTower=-1;
  enemies=[];towers=[];projectiles=[];particles=[];spawnQueue=[];
  spawnClock=0;leaksThisWave=0;animClock=0;objectiveHit=0;
  pointer={x:-99,y:-99,inside:false};
  gameOverOverlay.classList.remove('show');
  pauseSheet.classList.remove('show');
  howSheet.classList.remove('show');
  towerPanel.classList.remove('show');
  towerChoices.forEach(b=>b.classList.remove('selected'));
  buildHint.textContent='Choose a snowman, then tap any clear snow to place it.';
  updateUI();draw();
}

function startGame(){
  resetGame();
  startOverlay.classList.remove('show');
  last=performance.now();
  if(raf)cancelAnimationFrame(raf);
  raf=requestAnimationFrame(loop);
  showBanner('CHOOSE A SNOWMAN TO BUILD');
}

function makeWaveQueue(index){
  const q=[];
  for(const [kind,count] of (WAVES[index-1]||[])){
    for(let i=0;i<count;i++)q.push(kind);
  }
  return q;
}

function startWave(){
  if(waveActive||gameEnded||wave>10)return;
  selectedTower=-1;
  towerPanel.classList.remove('show');
  waveActive=true;leaksThisWave=0;
  spawnQueue=makeWaveQueue(wave);
  spawnClock=.15;
  showBanner('WAVE '+wave);
  tone('wave');
  updateUI();
}

function spawnEnemy(kind){
  const def=ENEMIES[kind];
  const hpScale=1+(wave-1)*.13;
  enemies.push({
    kind,routeKey,travel:0,
    hp:def.hp*hpScale,maxHp:def.hp*hpScale,
    speed:def.speed*(1+(wave-1)*.017),
    reward:def.reward,leak:def.leak,
    slow:0,flash:0,x:168,y:H+16,row:3,
    progress:0,dead:false,seed:Math.floor(Math.random()*6)
  });
}

function finishWave(){
  waveActive=false;
  const perfect=leaksThisWave===0;
  const waveBonus=100+wave*18;
  score+=waveBonus;
  money+=22+wave*3;
  if(perfect){
    perfectWaves++;
    score+=100;money+=18;
    showBanner('PERFECT WAVE +100');
  }else showBanner('WAVE CLEAR +'+waveBonus);

  if(wave>=10){endGame(true);return}
  wave++;
  updateUI();
}

function endGame(victory){
  if(gameEnded)return;
  gameEnded=true;waveActive=false;buildType=null;
  const protectionBonus=lives*50;
  const final=score+protectionBonus;
  const isBest=final>best;
  if(isBest){best=final;localStorage.setItem(BEST_KEY,String(best))}
  resultEyebrow.textContent=victory?'WORKSHOP SAFE':'PRESENTS STOLEN';
  resultEyebrow.classList.toggle('danger',!victory);
  resultTitle.textContent=victory?'CHRISTMAS SAVED!':'RUN OVER';
  finalScoreEl.textContent=final;
  finalBreakdown.textContent=Math.min(wave,10)+' waves · '+perfectWaves+' perfect · '+lives+' presents safe · +'+protectionBonus+' protection bonus';
  recordText.textContent=isBest?'NEW BEST SCORE '+best:'Best score: '+best;
  bestStart.textContent=pad(best,4);
  gameOverOverlay.classList.add('show');
  tone(victory?'win':'leak');
}

function chooseBuildType(type){
  if(gameEnded)return;
  const def=TOWERS[type];
  if(!def||money<def.cost){showBanner('NOT ENOUGH BAUBLES');return}
  buildType=buildType===type?null:type;
  selectedTower=-1;towerPanel.classList.remove('show');
  towerChoices.forEach(b=>b.classList.toggle('selected',b.dataset.tower===buildType));
  buildHint.textContent=buildType
    ? def.name+': tap clear snow to place.'
    : 'Choose a snowman, then tap any clear snow to place it.';
  draw();
}

function placeTower(x,y){
  if(!buildType)return false;
  const def=TOWERS[buildType];
  if(money<def.cost){showBanner('NOT ENOUGH BAUBLES');buildType=null;updateUI();return false}
  if(!canPlaceTower(x,y)){showBanner('PLACE ON CLEAR SNOW');return false}

  const gx=Math.round(x/4)*4,gy=Math.round(y/4)*4;
  money-=def.cost;
  towers.push({
    type:buildType,x:gx,y:gy,level:1,cooldown:.15,
    spent:def.cost,pulse:0,row:0,seed:Math.floor(Math.random()*4)
  });
  tone('build');
  if(money<def.cost){
    buildType=null;
    towerChoices.forEach(b=>b.classList.remove('selected'));
  }
  buildHint.textContent='Snowman placed. Build more or start the wave.';
  updateUI();return true;
}

function selectTower(index){
  selectedTower=index;buildType=null;
  towerChoices.forEach(b=>b.classList.remove('selected'));
  const t=towers[index],def=TOWERS[t.type];
  towerPanelName.textContent=def.name;
  towerPanelStats.textContent='LEVEL '+t.level+' · '+towerStatText(t);
  const cost=upgradeCost(t),sell=sellValue(t);
  upgradeCostEl.textContent=cost;sellValueEl.textContent=sell;
  upgradeButton.disabled=t.level>=3||money<cost;
  upgradeButton.textContent=t.level>=3?'MAX LEVEL':'UPGRADE '+cost;
  sellButton.textContent='SELL '+sell;
  towerPanel.classList.add('show');
  buildHint.textContent='Snowman selected.';
}

function towerStatText(t){
  const def=TOWERS[t.type];
  const range=Math.round(def.range*(1+(t.level-1)*.08));
  if(def.support){
    const damagePct=Math.round((supportStrength(t).damage-1)*100);
    const ratePct=Math.round((supportStrength(t).rate-1)*100);
    return '+'+damagePct+'% DMG · +'+ratePct+'% SPEED · '+range+' AURA';
  }
  const damage=Math.round(def.damage*(1+(t.level-1)*.4));
  return damage+' DMG · '+range+' RANGE';
}
function upgradeCost(t){return Math.round(TOWERS[t.type].cost*(.65+t.level*.38))}
function sellValue(t){return Math.round(t.spent*.65)}

function upgradeSelected(){
  const t=towers[selectedTower];
  if(!t||t.level>=3)return;
  const cost=upgradeCost(t);
  if(money<cost){showBanner('NOT ENOUGH BAUBLES');return}
  money-=cost;t.spent+=cost;t.level++;t.pulse=.18;
  tone('upgrade');
  selectTower(selectedTower);updateUI();
}

function sellSelected(){
  const t=towers[selectedTower];
  if(!t)return;
  money+=sellValue(t);
  towers.splice(selectedTower,1);
  selectedTower=-1;towerPanel.classList.remove('show');
  buildHint.textContent='Snowman sold. Choose another defender to place.';
  tone('sell');updateUI();
}

function supportStrength(t){
  const def=TOWERS[t.type];
  const levelScale=1+(t.level-1)*.35;
  return{
    damage:1+(def.damageBuff-1)*levelScale,
    rate:1+(def.rateBuff-1)*levelScale
  };
}

function supportBonusesFor(t){
  let damage=1,rate=1;
  for(const s of towers){
    if(s===t)continue;
    const def=TOWERS[s.type];
    if(!def.support)continue;
    const aura=def.range*(1+(s.level-1)*.08);
    if(pointDist(t.x,t.y,s.x,s.y)>aura)continue;
    const strength=supportStrength(s);
    damage=Math.max(damage,strength.damage);
    rate=Math.max(rate,strength.rate);
  }
  return{damage,rate};
}

function targetForTower(t){
  const def=TOWERS[t.type];
  if(def.support)return null;
  const range=def.range*(1+(t.level-1)*.08);
  let target=null,best=-1;
  for(const e of enemies){
    if(e.dead)continue;
    if(pointDist(t.x,t.y,e.x,e.y)<=range && e.progress>best){
      target=e;best=e.progress;
    }
  }
  return target;
}

function rowForVector(dx,dy){
  if(Math.abs(dx)>Math.abs(dy))return dx>=0?1:2;
  return dy>=0?0:3;
}

function fireTower(t,target){
  const def=TOWERS[t.type];
  if(def.support)return;
  const levelScale=1+(t.level-1)*.4;
  const buffs=supportBonusesFor(t);
  const range=def.range*(1+(t.level-1)*.08);
  t.row=rowForVector(target.x-t.x,target.y-t.y);

  const targets=[target];
  if((def.shots||1)>1){
    let second=null,best=-1;
    for(const e of enemies){
      if(e===target||e.dead)continue;
      if(pointDist(t.x,t.y,e.x,e.y)<=range&&e.progress>best){
        second=e;best=e.progress;
      }
    }
    targets.push(second||target);
  }

  targets.forEach((shotTarget,i)=>{
    projectiles.push({
      x:t.x+(i===0?-2:2),y:t.y,
      target:shotTarget,
      damage:def.damage*levelScale*buffs.damage,
      speed:def.shotSpeed,
      kind:def.kind,
      slow:def.slow,
      splash:def.splash+(def.splash?5*(t.level-1):0),
      dead:false
    });
  });

  t.cooldown=def.rate/((1+(t.level-1)*.15)*buffs.rate);
  t.pulse=.12;
  tone(def.kind==='heavy'?'heavy':'shot');
}

function updateTowers(dt){
  for(const t of towers){
    t.cooldown-=dt;t.pulse=Math.max(0,t.pulse-dt);
    const def=TOWERS[t.type];
    if(def.support)continue;
    const target=targetForTower(t);
    if(target)t.row=rowForVector(target.x-t.x,target.y-t.y);
    if(t.cooldown<=0&&target)fireTower(t,target);
  }
}

function hitEnemy(p,e){
  if(!e||e.dead)return;
  const hitOne=target=>{
    target.hp-=p.damage;
    target.flash=.07;
    if(p.slow)target.slow=Math.max(target.slow,1.8);
  };
  if(p.splash){
    for(const other of enemies){
      if(!other.dead&&pointDist(e.x,e.y,other.x,other.y)<=p.splash)hitOne(other);
    }
  }else hitOne(e);

  for(let i=0;i<5;i++)particles.push({
    x:e.x,y:e.y,
    vx:(Math.random()-.5)*38,vy:(Math.random()-.5)*38,
    life:.24,size:2
  });
  tone('hit');
}

function updateProjectiles(dt){
  for(const p of projectiles){
    if(p.dead)continue;
    const e=p.target;
    if(!e||e.dead||!enemies.includes(e)){p.dead=true;continue}
    const dx=e.x-p.x,dy=e.y-p.y,d=Math.hypot(dx,dy);
    if(d<6){hitEnemy(p,e);p.dead=true;continue}
    const step=Math.min(d,p.speed*dt);
    p.x+=dx/d*step;p.y+=dy/d*step;
  }
  projectiles=projectiles.filter(p=>!p.dead);
}

function killEnemy(e){
  if(e.dead)return;
  e.dead=true;money+=e.reward;score+=10+wave*2;
  for(let i=0;i<8;i++)particles.push({
    x:e.x,y:e.y,vx:(Math.random()-.5)*65,vy:(Math.random()-.5)*65,
    life:.4,size:2+Math.random()*2
  });
}

function updateEnemies(dt){
  for(const e of enemies){
    e.slow=Math.max(0,e.slow-dt);e.flash=Math.max(0,e.flash-dt);
    e.travel+=e.speed*(e.slow>0?.57:1)*dt;
    const p=pathPosition(pathData[e.routeKey],e.travel);
    e.x=p.x;e.y=p.y;e.progress=p.progress;e.row=p.row;

    if(e.hp<=0){killEnemy(e);continue}
    if(e.progress>=1){
      e.dead=true;
      lives=Math.max(0,lives-e.leak);
      leaksThisWave+=e.leak;
      objectiveHit=.42;
      showBanner('-'+e.leak+' PRESENT'+(e.leak===1?'':'S'));
      tone('leak');
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
      spawnClock=Math.max(.38,.82-wave*.032);
    }
  }else if(enemies.length===0&&projectiles.length===0)finishWave();
}

function updateParticles(dt){
  for(const p of particles){
    p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=15*dt;p.life-=dt;
  }
  particles=particles.filter(p=>p.life>0);
}

function update(dt){
  if(paused||gameEnded)return;
  animClock+=dt;
  objectiveHit=Math.max(0,objectiveHit-dt);
  if(bannerTimer>0){
    bannerTimer-=dt;
    if(bannerTimer<=0)waveBanner.classList.remove('show');
  }
  updateSpawning(dt);
  updateEnemies(dt);
  updateTowers(dt);
  updateProjectiles(dt);
  updateParticles(dt);
  updateUI();
}

function drawAtlasCell(col,row,x,y,scale=1){
  const im=images.winter;if(!im)return;
  const s=TILE*scale;
  ctx.drawImage(im,col*TILE,row*TILE,TILE,TILE,Math.round(x),Math.round(y),s,s);
}

function drawAtlasRegion(col,row,wTiles,hTiles,x,y,scale=1){
  const im=images.winter;if(!im)return;
  ctx.drawImage(
    im,col*TILE,row*TILE,wTiles*TILE,hTiles*TILE,
    Math.round(x),Math.round(y),wTiles*TILE*scale,hTiles*TILE*scale
  );
}

function drawRoute(points){
  ctx.save();
  ctx.lineCap='square';ctx.lineJoin='miter';
  ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);
  for(let i=1;i<points.length;i++)ctx.lineTo(points[i][0],points[i][1]);

  ctx.strokeStyle='rgba(39,31,38,.28)';
  ctx.lineWidth=PATH_WIDTH+4;ctx.stroke();

  ctx.strokeStyle=pathPattern||'#94543f';
  ctx.lineWidth=PATH_WIDTH;ctx.stroke();
  ctx.restore();
}

function drawObjective(){
  // Build the protected Workshop Gate only from the same Gherwit winter atlas:
  // matching pine clusters, snow piles and the pack's snowy sign sprite.
  drawAtlasRegion(3,6,3,4,101,-19,.95);
  drawAtlasRegion(0,6,3,4,190,-19,.95);
  drawAtlasCell(0,0,128,44,1);
  drawAtlasCell(1,0,192,44,1);
  drawAtlasCell(0,2,144,5,3);

  ctx.save();
  ctx.imageSmoothingEnabled=false;

  // The label is gameplay UI over the real Gherwit objective asset, not replacement artwork.
  ctx.fillStyle=objectiveHit>0?'#8f3037':'#202934';
  ctx.fillRect(132,47,72,14);
  ctx.fillStyle='#f7fbff';
  ctx.font='700 7px monospace';
  ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText('WORKSHOP GATE',168,54);

  // Make the route destination unmistakable and flash it when a present is lost.
  ctx.strokeStyle=objectiveHit>0?'#f5c45a':'rgba(32,41,52,.55)';
  ctx.lineWidth=objectiveHit>0?3:1;
  ctx.strokeRect(150,61,36,8);
  ctx.restore();
}

function drawTerrain(){
  ctx.fillStyle=snowPattern||'#f8fbff';
  ctx.fillRect(0,0,W,H);

  // Same Gherwit sheet, larger multi-tile pine sprites framing the board.
  drawAtlasRegion(3,6,3,4,-5,76,1);
  drawAtlasRegion(0,6,3,4,W-43,78,1);
  drawAtlasRegion(0,6,3,4,-8,302,1);
  drawAtlasRegion(3,6,3,4,W-42,304,1);

  // Small snow piles from the same sheet.
  drawAtlasCell(0,0,24,250,1);
  drawAtlasCell(1,0,W-43,190,1);
  drawAtlasCell(0,0,W-50,444,1);
  drawAtlasCell(1,0,18,444,1);

  drawRoute(ROUTES[routeKey]);
  drawObjective();
}

function drawSheetFrame(key,cols,row,frame,x,y,dest=128,alpha=1){
  const im=images[key];if(!im)return;
  const cell=128;
  const safeRow=clamp(row|0,0,3);
  const safeFrame=((frame%cols)+cols)%cols;
  ctx.save();
  ctx.globalAlpha=alpha;
  ctx.imageSmoothingEnabled=false;
  ctx.drawImage(
    im,safeFrame*cell,safeRow*cell,cell,cell,
    Math.round(x-dest/2),Math.round(y-dest/2),dest,dest
  );
  ctx.restore();
}

function drawTower(t,index){
  const def=TOWERS[t.type];

  if(def.support){
    const aura=def.range*(1+(t.level-1)*.08);
    ctx.save();
    ctx.beginPath();ctx.arc(t.x,t.y,aura,0,Math.PI*2);
    ctx.fillStyle='rgba(245,196,90,.055)';ctx.fill();
    ctx.strokeStyle='rgba(214,160,47,.36)';ctx.lineWidth=1;
    ctx.setLineDash([2,4]);ctx.stroke();ctx.restore();
  }

  if(selectedTower===index){
    const range=def.range*(1+(t.level-1)*.08);
    ctx.save();
    ctx.beginPath();ctx.arc(t.x,t.y,range,0,Math.PI*2);
    ctx.fillStyle='rgba(112,196,226,.08)';ctx.fill();
    ctx.strokeStyle='rgba(70,153,184,.6)';ctx.lineWidth=1;ctx.setLineDash([3,3]);ctx.stroke();
    ctx.restore();
  }

  const frame=(Math.floor(animClock*5)+t.seed)%4;
  const recoil=t.pulse>0?2:0;
  let ox=0,oy=0;
  if(recoil){
    if(t.row===1)ox=-recoil;
    else if(t.row===2)ox=recoil;
    else if(t.row===0)oy=-recoil;
    else oy=recoil;
  }
  drawSheetFrame(def.asset,4,t.row,frame,t.x+ox,t.y+oy,128);

  ctx.save();
  ctx.imageSmoothingEnabled=false;
  ctx.fillStyle='#17384a';ctx.fillRect(t.x+7,t.y+7,11,9);
  ctx.fillStyle='#fff';ctx.font='700 7px monospace';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText(String(t.level),t.x+12.5,t.y+11.5);
  ctx.restore();
}

function drawEnemy(e){
  const def=ENEMIES[e.kind];
  const frame=(Math.floor(animClock*7)+e.seed)%6;
  drawSheetFrame(def.asset,6,e.row,frame,e.x,e.y,def.draw,e.flash>0?.55:1);

  const w=def.boss?42:25;
  const ratio=clamp(e.hp/e.maxHp,0,1);
  const barY=e.y-(def.boss?30:21);
  ctx.fillStyle='rgba(15,30,40,.62)';ctx.fillRect(Math.round(e.x-w/2),Math.round(barY),w,4);
  ctx.fillStyle=ratio>.5?'#3fa56d':ratio>.25?'#e1ae47':'#cf4d55';
  ctx.fillRect(Math.round(e.x-w/2),Math.round(barY),Math.round(w*ratio),4);

  if(e.slow>0){
    ctx.save();ctx.strokeStyle='#78d5ee';ctx.lineWidth=2;
    ctx.strokeRect(Math.round(e.x-11),Math.round(e.y-11),22,22);ctx.restore();
  }
}

function drawProjectile(p){
  ctx.save();ctx.imageSmoothingEnabled=false;
  const x=Math.round(p.x),y=Math.round(p.y);
  if(p.kind==='frost'){
    ctx.fillStyle='#71cbe7';ctx.fillRect(x-4,y-4,8,8);
    ctx.fillStyle='#dff9ff';ctx.fillRect(x-2,y-3,4,4);
  }else if(p.kind==='heavy'){
    ctx.fillStyle='#a4d4e5';ctx.fillRect(x-5,y-5,10,10);
    ctx.fillStyle='#fff';ctx.fillRect(x-4,y-4,7,7);
  }else if(p.kind==='long'){
    ctx.fillStyle='#79bdd7';ctx.fillRect(x-5,y-2,10,4);
    ctx.fillStyle='#effcff';ctx.fillRect(x-3,y-1,7,2);
  }else{
    ctx.fillStyle='#9dcadd';ctx.fillRect(x-3,y-3,7,7);
    ctx.fillStyle='#fff';ctx.fillRect(x-2,y-2,5,5);
  }
  ctx.restore();
}

function drawPlacementGhost(){
  if(!buildType||!pointer.inside)return;
  const def=TOWERS[buildType];
  const valid=money>=def.cost&&canPlaceTower(pointer.x,pointer.y);

  ctx.save();
  ctx.globalAlpha=.18;
  ctx.fillStyle=valid?'#3dbb75':'#d65055';
  ctx.beginPath();ctx.arc(pointer.x,pointer.y,def.range,0,Math.PI*2);ctx.fill();
  ctx.globalAlpha=.75;
  ctx.strokeStyle=valid?'#2d9b60':'#bd3d42';ctx.lineWidth=2;
  ctx.strokeRect(Math.round(pointer.x-11),Math.round(pointer.y-11),22,22);
  ctx.restore();

  const frame=Math.floor(animClock*5)%4;
  drawSheetFrame(def.asset,4,0,frame,pointer.x,pointer.y,128,valid?.75:.45);
}

function draw(){
  ctx.clearRect(0,0,W,H);
  ctx.imageSmoothingEnabled=false;
  drawTerrain();

  towers.forEach(drawTower);
  enemies.forEach(drawEnemy);
  projectiles.forEach(drawProjectile);

  ctx.save();
  for(const p of particles){
    ctx.globalAlpha=clamp(p.life*2.4,0,1);
    ctx.fillStyle='#f7fbff';
    ctx.fillRect(Math.round(p.x),Math.round(p.y),Math.ceil(p.size),Math.ceil(p.size));
  }
  ctx.restore();

  drawPlacementGhost();

  if(!waveActive&&!gameEnded){
    ctx.save();
    ctx.fillStyle='rgba(20,50,66,.85)';
    ctx.fillRect(91,H-18,154,13);
    ctx.fillStyle='#fff';ctx.font='700 7px monospace';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText('ROUTE '+(routeKey==='left'?'A':'B')+' · SHIFT BETWEEN WAVES',168,H-11);
    ctx.restore();
  }
}

function updateUI(){
  waveHud.textContent=pad(Math.min(wave,10),2)+'/10';
  moneyHud.textContent=money;
  livesHud.textContent=lives;
  scoreHud.textContent=pad(score,4);
  routeLabel.textContent=routeKey==='left'?'LEFT LOOP':'RIGHT LOOP';
  startWaveButton.textContent=waveActive?'WAVE '+wave+' IN PROGRESS':'START WAVE '+Math.min(wave,10);
  shiftRouteButton.disabled=waveActive||gameEnded;
  startWaveButton.disabled=waveActive||gameEnded;

  for(const b of towerChoices){
    const def=TOWERS[b.dataset.tower];
    b.disabled=gameEnded||money<def.cost;
    b.classList.toggle('selected',b.dataset.tower===buildType);
  }

  if(selectedTower>=0&&towers[selectedTower]){
    const t=towers[selectedTower];
    const cost=upgradeCost(t);
    upgradeButton.disabled=t.level>=3||money<cost;
    upgradeButton.textContent=t.level>=3?'MAX LEVEL':'UPGRADE '+cost;
  }
}

function pointerToGame(e){
  const r=canvas.getBoundingClientRect();
  return{
    x:(e.clientX-r.left)*W/r.width,
    y:(e.clientY-r.top)*H/r.height
  };
}

function handleCanvasPointer(e){
  if(gameEnded||paused)return;
  const p=pointerToGame(e);
  pointer={x:p.x,y:p.y,inside:true};

  // Existing snowmen always take selection priority.
  let hit=-1,bestD=18;
  towers.forEach((t,i)=>{
    const d=pointDist(p.x,p.y,t.x,t.y);
    if(d<bestD){bestD=d;hit=i}
  });
  if(hit>=0){selectTower(hit);draw();return}

  if(buildType){
    if(placeTower(p.x,p.y))draw();
    return;
  }

  selectedTower=-1;towerPanel.classList.remove('show');
  buildHint.textContent='Choose a snowman, then tap any clear snow to place it.';
  draw();
}

function toggleRoute(){
  if(waveActive||gameEnded)return;
  routeKey=routeKey==='left'?'right':'left';

  // Any tower now too close to the newly shifted route is automatically refunded.
  const keep=[];
  let refunded=0;
  for(const t of towers){
    if(distanceToActivePath(t.x,t.y)<PATH_WIDTH/2+10){
      refunded+=sellValue(t);
    }else keep.push(t);
  }
  towers=keep;
  if(refunded){money+=refunded;showBanner('ROUTE SHIFT · '+refunded+' REFUNDED')}
  else showBanner(routeKey==='left'?'ROUTE SHIFTED LEFT':'ROUTE SHIFTED RIGHT');

  selectedTower=-1;towerPanel.classList.remove('show');
  tone('build');updateUI();draw();
}

function openPause(){
  if(gameEnded||startOverlay.classList.contains('show'))return;
  paused=true;
  pauseSheet.classList.add('show');
  pauseSheet.setAttribute('aria-hidden','false');
}
function closePauseSheet(){
  pauseSheet.classList.remove('show');
  pauseSheet.setAttribute('aria-hidden','true');
  paused=false;last=performance.now();
}
function openHow(fromPause=false){
  howFromPause=fromPause;
  howSheet.classList.add('show');
  howSheet.setAttribute('aria-hidden','false');
}
function closeHowSheet(){
  howSheet.classList.remove('show');
  howSheet.setAttribute('aria-hidden','true');
  if(howFromPause){
    howFromPause=false;
    pauseSheet.classList.add('show');
    pauseSheet.setAttribute('aria-hidden','false');
  }
}

function loop(now){
  const dt=Math.min(.04,(now-last)/1000||.016);
  last=now;
  update(dt);draw();
  if(!gameEnded)raf=requestAnimationFrame(loop);
}

canvas.addEventListener('pointerdown',handleCanvasPointer);
canvas.addEventListener('pointermove',e=>{
  const p=pointerToGame(e);pointer={x:p.x,y:p.y,inside:true};
  if(buildType)draw();
});
canvas.addEventListener('pointerleave',()=>{pointer.inside=false;if(buildType)draw()});

shiftRouteButton.addEventListener('click',toggleRoute);
startWaveButton.addEventListener('click',startWave);
towerChoices.forEach(b=>b.addEventListener('click',()=>chooseBuildType(b.dataset.tower)));
upgradeButton.addEventListener('click',upgradeSelected);
sellButton.addEventListener('click',sellSelected);
playButton.addEventListener('click',startGame);
againButton.addEventListener('click',startGame);
pauseButton.addEventListener('click',openPause);
closePause.addEventListener('click',closePauseSheet);
resumeButton.addEventListener('click',closePauseSheet);
restartButton.addEventListener('click',()=>{closePauseSheet();startGame()});
soundButton.addEventListener('click',()=>{
  soundOn=!soundOn;
  soundButton.textContent=soundOn?'SOUND ON':'SOUND OFF';
});
introHowButton.addEventListener('click',()=>openHow(false));
pauseHowButton.addEventListener('click',()=>{
  pauseSheet.classList.remove('show');
  pauseSheet.setAttribute('aria-hidden','true');
  openHow(true);
});
closeHow.addEventListener('click',closeHowSheet);
closeHowButton.addEventListener('click',closeHowSheet);
document.addEventListener('visibilitychange',()=>{
  if(document.hidden&&!gameEnded&&!startOverlay.classList.contains('show'))openPause();
});

loadAssets();
updateUI();
draw();
})();