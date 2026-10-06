(function(){
'use strict';

const canvas=document.getElementById('gameCanvas');
const ctx=canvas.getContext('2d',{alpha:false});
ctx.imageSmoothingEnabled=false;

const distanceEl=document.getElementById('distance');
const gatesEl=document.getElementById('gates');
const bestEl=document.getElementById('best');
const startBestEl=document.getElementById('startBest');
const finalDistanceEl=document.getElementById('finalDistance');
const runBreakdownEl=document.getElementById('runBreakdown');
const recordText=document.getElementById('recordText');
const speedLabel=document.getElementById('speedLabel');
const assetStatus=document.getElementById('assetStatus');
const startOverlay=document.getElementById('startOverlay');
const gameOverOverlay=document.getElementById('gameOverOverlay');
const pauseSheet=document.getElementById('pauseSheet');
const startButton=document.getElementById('startButton');
const soundButton=document.getElementById('soundButton');
const soundIcon=document.getElementById('soundIcon');

const ASSET_BASE='https://chipbutt.github.io/ToolBox/assets/gamebox/kenney/2d/Tiny%20Ski/Tiles/';
const tileUrl=n=>ASSET_BASE+'tile_'+String(n).padStart(4,'0')+'.png';

/* Audited Tiny Ski tiles used by the game. No guessed glyph/effect substitutions. */
const F={
  snow:[0,1,2,3,4,5],
  tree:[6,18,30],
  deadTree:[7,19],
  redFlag:[8,20],
  blueFlag:[9,21],
  redNet:[10],
  blueNet:[11],
  signLeft:[32,34,35],
  signRight:[22,23,33],
  shrub:[31],
  liftTower:[42,66],
  cable:[43,44,45,46],
  liftSeat:[47,57],
  gondola:[55,56,67,68],
  tracks:[58],
  snowman:[69],
  player:[70],
  otherSkiers:[71,78,79,80,82,83],
  rock:[81]
};
const REQUIRED=[...new Set(Object.values(F).flat())];
const images={};

let W=360,H=700,dpr=1;
let running=false,paused=false,crashing=false,gameOver=false,soundOn=true;
let last=0,raf=0,audioCtx=null;
let player=null;
let distance=0,speed=158,bonus=0,gates=0,nearMisses=0;
let spawnTravel=0,featureTravel=0,trackClock=0,feedback=[];
let obstacles=[],gatePairs=[],worldFeatures=[],tracks=[],snowPuffs=[];
let obstaclePool=[],featurePool=[];
let shake=0,crashClock=0;
const input={left:false,right:false,pointer:null,analog:0};
const BEST_KEY='gamebox.tinySkiRun.best.v2';
let best=Number(localStorage.getItem(BEST_KEY)||0)||0;

bestEl.textContent=pad(best,4);
startBestEl.textContent=pad(best,4);

function pad(v,n){return String(Math.max(0,Math.floor(v))).padStart(n,'0')}
function rand(a,b){return a+Math.random()*(b-a)}
function pick(arr){return arr[Math.floor(Math.random()*arr.length)]}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function distanceMetres(){return Math.floor(distance/18)}
function totalScore(){return distanceMetres()+bonus}

function loadImage(frame){
  return new Promise((resolve,reject)=>{
    const img=new Image();
    img.decoding='async';
    img.onload=()=>{images[frame]=img;resolve();};
    img.onerror=()=>reject(new Error('Tiny Ski tile failed: '+frame));
    img.src=tileUrl(frame);
  });
}

Promise.all(REQUIRED.map(loadImage)).then(()=>{
  assetStatus.textContent='Tiny Ski ready';
  assetStatus.classList.add('ready');
  startButton.disabled=false;
  resetWorld();
  render();
}).catch(err=>{
  console.error(err);
  assetStatus.textContent='Tiny Ski assets failed to load';
});

function resizeCanvas(){
  const r=canvas.getBoundingClientRect();
  if(!r.width||!r.height)return;
  W=360;
  H=clamp(Math.round(W*(r.height/r.width)),620,820);
  dpr=Math.min(2,window.devicePixelRatio||1);
  canvas.width=Math.max(1,Math.round(r.width*dpr));
  canvas.height=Math.max(1,Math.round(r.height*dpr));
  if(player)player.y=H*.29;
  render();
}
new ResizeObserver(resizeCanvas).observe(canvas);
addEventListener('orientationchange',()=>setTimeout(resizeCanvas,50));
resizeCanvas();

function obtain(pool){return pool.pop()||{}}
function recycleObstacle(o){obstaclePool.push(o)}
function recycleFeature(o){featurePool.push(o)}

function resetWorld(){
  obstacles.forEach(recycleObstacle);worldFeatures.forEach(recycleFeature);
  obstacles=[];gatePairs=[];worldFeatures=[];tracks=[];snowPuffs=[];feedback=[];
  distance=0;speed=158;bonus=0;gates=0;nearMisses=0;spawnTravel=80;featureTravel=0;trackClock=0;shake=0;crashClock=0;
  crashing=false;gameOver=false;
  player={x:W/2,y:H*.29,vx:0,angle:0,crashSpin:0,crashSlide:0};

  /* Fill both sides with real Tiny Ski scenery so the first frame already reads as a mountain. */
  for(let i=0;i<24;i++)spawnScenery(rand(0,H),true);
  for(let i=0;i<3;i++)spawnFeature(H*.55+i*210,true);
  updateHud();
}

function startGame(){
  resetWorld();
  running=true;paused=false;
  startOverlay.classList.remove('show');
  gameOverOverlay.classList.remove('show');
  closePause();
  last=performance.now();
  if(raf)cancelAnimationFrame(raf);
  raf=requestAnimationFrame(loop);
  tone('start');
}

function updateHud(){
  const metres=distanceMetres();
  distanceEl.textContent=pad(metres,4);
  gatesEl.textContent=pad(gates,2);
  bestEl.textContent=pad(Math.max(best,metres),4);
  speedLabel.textContent=speed<205?'CRUISE':speed<255?'CARVING':speed<305?'FAST':'FLYING';
}

function loop(now){
  if(!running||paused)return;
  const dt=Math.min(.033,Math.max(.001,(now-last)/1000||.016));
  last=now;
  update(dt);
  render();
  if(running&&!paused)raf=requestAnimationFrame(loop);
}

function update(dt){
  if(crashing){
    updateCrash(dt);
    return;
  }

  distance+=speed*dt;
  const metres=distanceMetres();
  speed=Math.min(350,158+metres*.14);
  spawnTravel+=speed*dt;
  featureTravel+=speed*dt;

  const digital=(input.left?-1:0)+(input.right?1:0);
  const steer=digital||input.analog;
  const target=steer*(108+speed*.13);
  player.vx+=(target-player.vx)*Math.min(1,dt*8.5);
  if(!steer)player.vx*=Math.pow(.12,dt);
  player.x=clamp(player.x+player.vx*dt,20,W-20);
  player.angle=clamp(player.vx/300,-.48,.48);

  trackClock-=dt;
  if(trackClock<=0){
    tracks.push({x:player.x,y:player.y+18,a:player.angle,life:1});
    if(tracks.length>70)tracks.shift();
    trackClock=.06;
  }
  if(Math.abs(steer)>.25 && Math.random()<dt*18){
    for(let i=0;i<2;i++)snowPuffs.push({x:player.x+rand(-10,10),y:player.y+18,vx:rand(-20,20)-steer*15,vy:rand(12,35),life:rand(.18,.34),size:rand(2,4)});
  }

  const scroll=speed*dt;
  updateWorld(scroll,dt);

  const gapMin=clamp(124-metres*.025,82,124);
  const spawnAt=clamp(152-metres*.025,102,152);
  if(spawnTravel>spawnAt){
    spawnTravel=0;
    spawnCoursePattern(gapMin,metres);
  }
  if(featureTravel>580){
    featureTravel=0;
    if(Math.random()<.7)spawnFeature(H+70,false);
  }

  checkCollisions();
  checkGates();
  updateFeedback(dt);
  updateHud();
}

function updateWorld(scroll,dt){
  for(const t of tracks){t.y-=scroll;t.life-=dt*.2}
  tracks=tracks.filter(t=>t.y>-30&&t.life>0);

  for(const p of snowPuffs){p.x+=p.vx*dt;p.y+=p.vy*dt-scroll*.25;p.life-=dt}
  snowPuffs=snowPuffs.filter(p=>p.life>0);

  for(let i=obstacles.length-1;i>=0;i--){
    const o=obstacles[i];
    const relative=o.kind==='skier'?.78:1;
    o.y-=scroll*relative;
    if(o.kind==='skier'){
      o.phase+=dt*o.weaveSpeed;
      o.x+=Math.sin(o.phase)*o.weave*dt;
      o.x=clamp(o.x,24,W-24);
    }
    if(o.y<-70){obstacles.splice(i,1);recycleObstacle(o);continue}
    if(!o.nearChecked && o.y<player.y-18){
      o.nearChecked=true;
      const dx=Math.abs(o.x-player.x);
      if(dx<o.radius+21 && dx>o.radius+7){
        nearMisses++;bonus+=25;addFeedback(player.x,player.y-28,'NEAR +25','#174d7a');tone('near');
      }
    }
  }

  for(let i=gatePairs.length-1;i>=0;i--){
    const g=gatePairs[i];g.y-=scroll;
    if(g.y<-60)gatePairs.splice(i,1);
  }

  for(let i=worldFeatures.length-1;i>=0;i--){
    const f=worldFeatures[i];f.y-=scroll*f.rate;
    if(f.y<-90){
      worldFeatures.splice(i,1);
      if(f.recyclable){f.y=H+rand(35,160);f.x=f.side==='left'?rand(10,65):rand(W-65,W-10);worldFeatures.push(f)}
      else recycleFeature(f);
    }
  }

  if(worldFeatures.filter(f=>f.recyclable).length<20)spawnScenery(H+rand(20,120),false);
}

function spawnCoursePattern(gapMin,metres){
  const y=H+56;
  const difficulty=metres<300?0:metres<750?1:metres<1400?2:3;
  const roll=Math.random();

  if(roll<.22){
    addObstacle(rand(40,W-40),y,pick(['tree','tree','rock','snowman']));
    return;
  }
  if(roll<.42){
    const centre=rand(94,W-94),gap=rand(gapMin,gapMin+36);
    addObstacle(centre-gap/2,y,pick(['tree','deadTree']));
    addObstacle(centre+gap/2,y,pick(['tree','deadTree']));
    return;
  }
  if(roll<.62){
    const centre=rand(90,W-90),gap=rand(Math.max(76,gapMin-8),gapMin+12);
    addGate(centre,gap,y);
    if(difficulty>1 && Math.random()<.42)addObstacle(clamp(centre+pick([-1,1])*rand(78,105),35,W-35),y+72,pick(['rock','tree']));
    return;
  }
  if(roll<.8){
    const safe=rand(72,W-72),rowY=y;
    const xs=[34,88,142,196,250,304,338];
    xs.forEach(x=>{if(Math.abs(x-safe)>Math.max(47,gapMin*.42))addObstacle(x,rowY+rand(-8,8),pick(['tree','deadTree','rock']))});
    return;
  }

  const side=Math.random()<.5?-1:1;
  const first=side<0?72:W-72;
  const second=side<0?W-88:88;
  addObstacle(first,y,'tree');
  addObstacle(second,y+76,pick(['rock','snowman','deadTree']));
  if(difficulty>=2)addObstacle(W/2+rand(-34,34),y+146,pick(['tree','rock']));
  if(difficulty>=2 && Math.random()<.34)addOtherSkier(y+210);
}

function addObstacle(x,y,kind){
  const o=obtain(obstaclePool);
  Object.assign(o,{x,y,kind,frame:0,scale:1,radius:10,nearChecked:false,phase:rand(0,6.2),weave:0,weaveSpeed:0});
  if(kind==='tree'){o.frame=pick(F.tree);o.scale=3.0;o.radius=13}
  else if(kind==='deadTree'){o.frame=pick(F.deadTree);o.scale=2.8;o.radius=12}
  else if(kind==='rock'){o.frame=F.rock[0];o.scale=2.65;o.radius=11}
  else if(kind==='snowman'){o.frame=F.snowman[0];o.scale=2.65;o.radius=11}
  obstacles.push(o);
}

function addOtherSkier(y){
  const o=obtain(obstaclePool);
  Object.assign(o,{x:rand(55,W-55),y,kind:'skier',frame:pick(F.otherSkiers),scale:2.7,radius:11,nearChecked:false,phase:rand(0,6.2),weave:rand(18,38),weaveSpeed:rand(1.2,2.1)});
  obstacles.push(o);
}

function addGate(centre,gap,y){
  gatePairs.push({y,left:centre-gap/2,right:centre+gap/2,passed:false,redLeft:Math.random()<.5});
}

function spawnScenery(y,initial){
  const f=obtain(featurePool);
  const side=Math.random()<.5?'left':'right';
  const group=Math.random();
  let frame,scale;
  if(group<.5){frame=pick([...F.tree,...F.deadTree]);scale=rand(2.35,3.25)}
  else if(group<.68){frame=pick([...F.signLeft,...F.signRight]);scale=rand(2.25,2.7)}
  else if(group<.82){frame=F.shrub[0];scale=rand(2.2,2.7)}
  else if(group<.92){frame=F.snowman[0];scale=rand(2.25,2.6)}
  else{frame=pick([...F.redNet,...F.blueNet]);scale=rand(2.2,2.5)}
  Object.assign(f,{kind:'scenery',side,frame,scale,rate:rand(.62,.78),recyclable:true,x:side==='left'?rand(10,64):rand(W-64,W-10),y:initial?y:y+rand(0,80)});
  worldFeatures.push(f);
}

function spawnFeature(y,initial){
  if(!initial && worldFeatures.some(f=>f.kind==='lift'&&Math.abs(f.y-y)<250))return;
  const f=obtain(featurePool);
  Object.assign(f,{kind:'lift',side:'none',frame:0,scale:1,rate:.74,recyclable:false,x:0,y});
  worldFeatures.push(f);
}

function checkCollisions(){
  const pr=10;
  for(const o of obstacles){
    if(Math.hypot(player.x-o.x,player.y-o.y)<pr+o.radius){startCrash();return}
  }
}

function checkGates(){
  for(const g of gatePairs){
    if(g.passed||g.y>player.y+4)continue;
    g.passed=true;
    if(player.x>g.left+7&&player.x<g.right-7){
      gates++;bonus+=75;addFeedback(player.x,player.y-34,'GATE +75','#d84c55');tone('gate');vibrate(10);
    }else{
      addFeedback(player.x,player.y-34,'MISSED GATE','#6e7f8b');tone('miss');
    }
  }
}

function startCrash(){
  if(crashing||gameOver)return;
  crashing=true;crashClock=0;shake=9;input.left=input.right=false;input.analog=0;
  vibrate([70,35,100]);tone('crash');
  for(let i=0;i<22;i++)snowPuffs.push({x:player.x+rand(-8,8),y:player.y+rand(4,18),vx:rand(-90,90),vy:rand(-25,80),life:rand(.35,.8),size:rand(2,6)});
}

function updateCrash(dt){
  crashClock+=dt;
  player.crashSpin+=dt*5.2;
  player.crashSlide+=dt*34;
  player.x=clamp(player.x+player.vx*dt*.32,18,W-18);
  player.y+=dt*22;
  shake=Math.max(0,shake-dt*22);
  for(const p of snowPuffs){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;p.vy+=18*dt}
  snowPuffs=snowPuffs.filter(p=>p.life>0);
  updateFeedback(dt);
  if(crashClock>.72)finishRun();
}

function finishRun(){
  if(gameOver)return;
  gameOver=true;running=false;crashing=false;
  const metres=distanceMetres();
  const isBest=metres>best;
  if(isBest){best=metres;localStorage.setItem(BEST_KEY,String(best))}
  finalDistanceEl.textContent=metres;
  runBreakdownEl.textContent=gates+' gate'+(gates===1?'':'s')+' · '+nearMisses+' near miss'+(nearMisses===1?'':'es');
  recordText.textContent=isBest?'NEW BEST!':'Best: '+best+'m';
  bestEl.textContent=pad(best,4);startBestEl.textContent=pad(best,4);
  render();
  gameOverOverlay.classList.add('show');
}

function addFeedback(x,y,textValue,color){feedback.push({x,y,text:textValue,color,life:1})}
function updateFeedback(dt){for(const f of feedback){f.y-=22*dt;f.life-=dt*1.35}feedback=feedback.filter(f=>f.life>0)}

function drawSprite(frame,x,y,size,angle=0,alpha=1,flip=false){
  const img=images[frame];if(!img)return;
  ctx.save();ctx.globalAlpha=alpha;ctx.translate(Math.round(x),Math.round(y));ctx.rotate(angle);ctx.scale(flip?-1:1,1);ctx.imageSmoothingEnabled=false;ctx.drawImage(img,-size/2,-size/2,size,size);ctx.restore();
}

function drawSnowField(){
  ctx.fillStyle='#cfe7f7';ctx.fillRect(0,0,W,H);
  const tileSize=32,offY=-((distance*.34)%tileSize);
  for(let y=offY-tileSize;y<H+tileSize;y+=tileSize){
    for(let x=0;x<W+tileSize;x+=tileSize){
      const index=(Math.floor(x/tileSize)+Math.floor((y+distance*.34)/tileSize)*3)&3;
      const frame=[0,2,3,5][Math.abs(index)];
      const img=images[frame];if(img)ctx.drawImage(img,x,y,tileSize,tileSize);
    }
  }
}

function drawLiftFeature(f){
  const y=f.y;
  const cableFrame=F.cable[0];
  for(let x=8;x<W;x+=28)drawSprite(cableFrame,x,y,32);
  drawSprite(F.liftTower[0],40,y,46);
  drawSprite(F.liftTower[1],W-40,y,46);
  drawSprite(pickStable(F.liftSeat,Math.round(y)),W*.29,y+5,38);
  drawSprite(pickStable(F.gondola,Math.round(y)+1),W*.68,y+5,42);
}
function pickStable(arr,seed){return arr[Math.abs(seed)%arr.length]}

function render(){
  if(!canvas.width||!canvas.height)return;
  ctx.save();
  ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);
  ctx.imageSmoothingEnabled=false;
  if(shake>0)ctx.translate(rand(-shake,shake),rand(-shake,shake));

  drawSnowField();

  const back=worldFeatures.filter(f=>f.kind==='scenery').sort((a,b)=>a.rate-b.rate);
  for(const f of back)drawSprite(f.frame,f.x,f.y,16*f.scale,0,.92,false);
  for(const f of worldFeatures)if(f.kind==='lift')drawLiftFeature(f);

  for(const t of tracks)drawSprite(F.tracks[0],t.x,t.y,31,t.a,t.life*.58);

  for(const g of gatePairs){
    const leftFrame=g.redLeft?F.redFlag[0]:F.blueFlag[0];
    const rightFrame=g.redLeft?F.blueFlag[0]:F.redFlag[0];
    drawSprite(leftFrame,g.left,g.y,38);
    drawSprite(rightFrame,g.right,g.y,38);
  }

  const sorted=[...obstacles].sort((a,b)=>a.y-b.y);
  for(const o of sorted){
    ctx.fillStyle='rgba(45,88,111,.12)';ctx.beginPath();ctx.ellipse(o.x,o.y+13,15,5,0,0,Math.PI*2);ctx.fill();
    const angle=o.kind==='skier'?Math.sin(o.phase)*.22:0;
    drawSprite(o.frame,o.x,o.y,16*o.scale,angle);
  }

  for(const p of snowPuffs){ctx.globalAlpha=clamp(p.life*2,0,1);ctx.fillStyle='#ffffff';ctx.fillRect(Math.round(p.x),Math.round(p.y),Math.max(1,Math.round(p.size)),Math.max(1,Math.round(p.size)))}
  ctx.globalAlpha=1;

  if(player){
    ctx.fillStyle='rgba(45,88,111,.13)';ctx.beginPath();ctx.ellipse(player.x,player.y+17,17,5,0,0,Math.PI*2);ctx.fill();
    drawSprite(F.player[0],player.x,player.y+player.crashSlide,44,crashing?player.crashSpin:player.angle);
  }

  for(const f of feedback){
    ctx.save();ctx.globalAlpha=clamp(f.life,0,1);ctx.font='900 12px ui-rounded, Arial Rounded MT Bold, sans-serif';ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='rgba(255,255,255,.9)';ctx.strokeText(f.text,f.x,f.y);ctx.fillStyle=f.color;ctx.fillText(f.text,f.x,f.y);ctx.restore();
  }
  ctx.restore();
}

function setDigital(side,on){
  input[side]=on;
  if(on&&running&&!paused&&!crashing)tone('carve');
}
function bindHold(el,side){
  el.addEventListener('pointerdown',e=>{e.preventDefault();el.setPointerCapture?.(e.pointerId);setDigital(side,true)});
  ['pointerup','pointercancel','lostpointercapture'].forEach(type=>el.addEventListener(type,()=>setDigital(side,false)));
}
bindHold(document.getElementById('leftButton'),'left');
bindHold(document.getElementById('rightButton'),'right');

canvas.addEventListener('pointerdown',e=>{
  if(!running||paused||crashing||gameOver)return;
  const r=canvas.getBoundingClientRect();
  const x=e.clientX-r.left;
  input.pointer={id:e.pointerId,startX:x,lastX:x};
  canvas.setPointerCapture?.(e.pointerId);
  input.analog=x<r.width/2?-1:1;
  e.preventDefault();
});
canvas.addEventListener('pointermove',e=>{
  if(!input.pointer||input.pointer.id!==e.pointerId)return;
  const r=canvas.getBoundingClientRect();
  const x=e.clientX-r.left;
  const delta=x-input.pointer.startX;
  input.pointer.lastX=x;
  input.analog=Math.abs(delta)>12?clamp(delta/(r.width*.22),-1,1):(x<r.width/2?-1:1);
  e.preventDefault();
});
function clearPointer(e){if(!input.pointer||!e||input.pointer.id===e.pointerId){input.pointer=null;input.analog=0}}
canvas.addEventListener('pointerup',clearPointer);canvas.addEventListener('pointercancel',clearPointer);canvas.addEventListener('lostpointercapture',clearPointer);

addEventListener('keydown',e=>{
  if(e.key==='ArrowLeft'||e.key==='a'||e.key==='A'){input.left=true;e.preventDefault()}
  if(e.key==='ArrowRight'||e.key==='d'||e.key==='D'){input.right=true;e.preventDefault()}
  if((e.key==='Escape'||e.key==='p'||e.key==='P')&&running){paused?resume():openPause();e.preventDefault()}
});
addEventListener('keyup',e=>{
  if(e.key==='ArrowLeft'||e.key==='a'||e.key==='A')input.left=false;
  if(e.key==='ArrowRight'||e.key==='d'||e.key==='D')input.right=false;
});

function openPause(){
  if(!running||gameOver||crashing)return;
  paused=true;input.left=input.right=false;input.analog=0;clearPointer();
  pauseSheet.classList.add('open');pauseSheet.setAttribute('aria-hidden','false');
}
function closePause(){pauseSheet.classList.remove('open');pauseSheet.setAttribute('aria-hidden','true')}
function resume(){if(!running||gameOver)return;closePause();paused=false;last=performance.now();raf=requestAnimationFrame(loop)}

document.getElementById('pauseButton').addEventListener('click',openPause);
document.getElementById('closePause').addEventListener('click',resume);
document.getElementById('resumeButton').addEventListener('click',resume);
document.getElementById('restartButton').addEventListener('click',startGame);
document.querySelector('.sheetBackdrop').addEventListener('click',resume);
startButton.addEventListener('click',startGame);
document.getElementById('againButton').addEventListener('click',startGame);

soundButton.addEventListener('click',()=>{
  soundOn=!soundOn;
  soundButton.querySelector('span').textContent=soundOn?'SOUND ON':'SOUND OFF';
  soundIcon.src='../assets/gamebox/kenney/icons/Game%20Icons/White/2x/'+(soundOn?'audioOn.png':'audioOff.png');
});

function getAudio(){
  if(!soundOn)return null;
  try{audioCtx=audioCtx||new(window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==='suspended')audioCtx.resume();return audioCtx}catch(_){return null}
}
function tone(type){
  const a=getAudio();if(!a)return;
  if(type==='carve'&&Math.random()>.35)return;
  const o=a.createOscillator(),g=a.createGain();
  o.type=type==='crash'?'square':'sine';
  const f=type==='gate'?660:type==='near'?520:type==='miss'?170:type==='crash'?105:type==='start'?340:150;
  o.frequency.setValueAtTime(f,a.currentTime);o.frequency.exponentialRampToValueAtTime(type==='crash'?52:f*1.18,a.currentTime+.07);
  g.gain.setValueAtTime(.0001,a.currentTime);g.gain.exponentialRampToValueAtTime(type==='crash'?.1:.025,a.currentTime+.006);g.gain.exponentialRampToValueAtTime(.0001,a.currentTime+(type==='crash'?.16:.055));
  o.connect(g);g.connect(a.destination);o.start();o.stop(a.currentTime+.18);
}
function vibrate(pattern){if(navigator.vibrate)navigator.vibrate(pattern)}

document.addEventListener('visibilitychange',()=>{if(document.hidden&&running&&!paused&&!gameOver&&!crashing)openPause()});
addEventListener('pagehide',()=>{input.left=input.right=false;input.analog=0});
})();
