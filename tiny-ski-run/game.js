(function(){
'use strict';

const canvas=document.getElementById('gameCanvas');
const ctx=canvas.getContext('2d',{alpha:false});
ctx.imageSmoothingEnabled=false;

const scoreEl=document.getElementById('score');
const bestEl=document.getElementById('best');
const finalScoreEl=document.getElementById('finalScore');
const recordText=document.getElementById('recordText');
const speedLabel=document.getElementById('speedLabel');
const assetStatus=document.getElementById('assetStatus');
const startOverlay=document.getElementById('startOverlay');
const gameOverOverlay=document.getElementById('gameOverOverlay');
const pauseSheet=document.getElementById('pauseSheet');
const startButton=document.getElementById('startButton');
const pauseButton=document.getElementById('pauseButton');
const soundButton=document.getElementById('soundButton');
const soundIcon=document.getElementById('soundIcon');

const ASSET_BASE='https://chipbutt.github.io/ToolBox/assets/gamebox/kenney/2d/Tiny%20Ski/Tiles/';
const tileUrl=n=>ASSET_BASE+'tile_'+String(n).padStart(4,'0')+'.png';
const assetFrames={
  bg:3,
  tree:30,
  trail:58,
  snowman:69,
  skierA:70,
  skierB:71,
  snow:84,
  sparkle:85,
  burst:86,
  donut:92,
  crash:94,
  snowSpray:107
};
const images={};
const W=360,H=640;
let cssW=360,cssH=640;
let running=false,paused=false,gameOver=false,soundOn=true;
let last=0,raf=0;
let best=Number(localStorage.getItem('gamebox.tinySkiRun.best')||0)||0;
let audioCtx=null;
const input={left:false,right:false};
let player,obstacles=[],collectibles=[],decor=[],trails=[],particles=[],snow=[];
let distance=0,bonus=0,speed=170,spawnTravel=0,collectTravel=0,trailClock=0,animClock=0;

bestEl.textContent=String(best).padStart(4,'0');

function loadImage(frame){
  return new Promise((resolve,reject)=>{
    const img=new Image();
    img.decoding='async';
    img.onload=()=>{images[frame]=img;resolve(img);};
    img.onerror=()=>reject(new Error('Failed asset '+frame));
    img.src=tileUrl(frame);
  });
}

Promise.all([...new Set(Object.values(assetFrames))].map(loadImage)).then(()=>{
  assetStatus.textContent='Tiny Ski ready';
  assetStatus.classList.add('ready');
  startButton.disabled=false;
  resetScene();
  render();
}).catch(err=>{
  console.error(err);
  assetStatus.textContent='Tiny Ski assets failed to load';
});

function resizeCanvas(){
  const rect=canvas.getBoundingClientRect();
  cssW=Math.max(1,rect.width);
  cssH=Math.max(1,rect.height);
  const dpr=Math.min(2,window.devicePixelRatio||1);
  canvas.width=Math.round(W*dpr);
  canvas.height=Math.round(H*dpr);
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.imageSmoothingEnabled=false;
}
new ResizeObserver(resizeCanvas).observe(canvas);
resizeCanvas();

function resetScene(){
  player={x:W/2,y:190,vx:0,angle:0,frame:assetFrames.skierA,crashed:false};
  obstacles=[];
  collectibles=[];
  trails=[];
  particles=[];
  decor=[];
  snow=[];
  distance=0;bonus=0;speed=170;spawnTravel=0;collectTravel=0;trailClock=0;animClock=0;
  for(let i=0;i<28;i++) decor.push({x:rand(12,W-12),y:rand(0,H),scale:rand(.6,1.25),flip:Math.random()>.5});
  for(let i=0;i<34;i++) snow.push({x:rand(0,W),y:rand(0,H),s:rand(.4,1.05),drift:rand(-9,9)});
  updateHud();
}

function startGame(){
  resetScene();
  running=true;paused=false;gameOver=false;
  startOverlay.classList.remove('show');
  gameOverOverlay.classList.remove('show');
  closePause();
  last=performance.now();
  if(raf)cancelAnimationFrame(raf);
  raf=requestAnimationFrame(loop);
  blip('start');
}

function rand(a,b){return a+Math.random()*(b-a)}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function currentScore(){return Math.max(0,Math.floor(distance/18)+bonus)}

function updateHud(){
  const score=currentScore();
  scoreEl.textContent=String(score).padStart(4,'0');
  bestEl.textContent=String(Math.max(best,score)).padStart(4,'0');
  speedLabel.textContent=speed<215?'CRUISE':speed<275?'QUICK':speed<325?'FAST':'FLYING';
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
  distance+=speed*dt;
  speed=Math.min(355,170+distance*.011);
  spawnTravel+=speed*dt;
  collectTravel+=speed*dt;
  animClock+=dt;

  const steer=(input.left?-1:0)+(input.right?1:0);
  const target=steer*125;
  player.vx+=(target-player.vx)*Math.min(1,dt*7.5);
  if(!steer)player.vx*=Math.pow(.18,dt);
  player.x=clamp(player.x+player.vx*dt,24,W-24);
  player.angle=clamp(player.vx/260,-.42,.42);
  player.frame=(Math.floor(animClock*8)%2===0)?assetFrames.skierA:assetFrames.skierB;

  trailClock-=dt;
  if(trailClock<=0){
    trails.push({x:player.x,y:player.y+22,a:player.angle,life:1});
    trailClock=.055;
    if(trails.length>70)trails.shift();
  }

  const scroll=speed*dt;
  for(const d of decor){d.y-=scroll*.55;if(d.y<-25){d.y=H+rand(10,80);d.x=rand(10,W-10);}}
  for(const s of snow){s.y-=scroll*.18+s.s*18*dt;s.x+=s.drift*dt;if(s.y<-8){s.y=H+8;s.x=rand(0,W)} if(s.x<-8)s.x=W+8;if(s.x>W+8)s.x=-8;}
  for(const t of trails){t.y-=scroll;t.life-=dt*.34;}
  trails=trails.filter(t=>t.y>-30&&t.life>0);
  for(const o of obstacles)o.y-=scroll;
  for(const c of collectibles){c.y-=scroll;c.bob+=dt*5;}
  obstacles=obstacles.filter(o=>o.y>-50);
  collectibles=collectibles.filter(c=>c.y>-40);

  for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy-=25*dt;p.life-=dt;}
  particles=particles.filter(p=>p.life>0);

  if(spawnTravel>rand(120,170)){spawnTravel=0;spawnPattern();}
  if(collectTravel>rand(650,900)){collectTravel=0;spawnCollectible();}

  const pr=11;
  for(const o of obstacles){
    const r=o.kind==='tree'?15:13;
    if(Math.hypot(player.x-o.x,player.y-o.y)<pr+r){crash(o);return;}
  }
  for(let i=collectibles.length-1;i>=0;i--){
    const c=collectibles[i];
    if(Math.hypot(player.x-c.x,player.y-c.y)<24){
      collectibles.splice(i,1);
      bonus+=50;
      burst(c.x,c.y,'collect');
      vibrate(12);
      blip('pickup');
    }
  }
  updateHud();
}

function spawnPattern(){
  const y=H+45;
  const level=Math.min(3,1+Math.floor(currentScore()/350));
  const type=Math.floor(Math.random()*(level+2));
  if(type===0){
    addObstacle(rand(35,W-35),y,Math.random()<.18?'snowman':'tree');
  }else if(type===1){
    const gap=rand(96,130),centre=rand(100,W-100);
    addObstacle(centre-gap/2,y,'tree');addObstacle(centre+gap/2,y,'tree');
  }else if(type===2){
    const left=Math.random()<.5;
    addObstacle(left?72:W-72,y,'tree');
    addObstacle(left?W-86:86,y+72,'tree');
  }else if(type===3){
    addObstacle(52,y,'tree');addObstacle(W-52,y,'tree');
    addObstacle(W/2+rand(-28,28),y+92,'snowman');
  }else{
    const gapCentre=rand(80,W-80);
    [45,115,185,255,325].forEach(x=>{if(Math.abs(x-gapCentre)>50)addObstacle(x,y+rand(-15,15),'tree');});
  }
}
function addObstacle(x,y,kind){obstacles.push({x,y,kind,scale:kind==='tree'?2.7:2.35});}
function spawnCollectible(){collectibles.push({x:rand(35,W-35),y:H+35,bob:rand(0,6.2)});}

function crash(o){
  if(gameOver)return;
  gameOver=true;running=false;player.crashed=true;player.frame=assetFrames.crash;player.angle=0;
  burst(player.x,player.y,'crash');
  vibrate([70,35,100]);
  blip('crash');
  const score=currentScore();
  if(score>best){best=score;localStorage.setItem('gamebox.tinySkiRun.best',String(best));recordText.textContent='NEW BEST!';}
  else recordText.textContent='Best: '+best+'m';
  finalScoreEl.textContent=score;
  bestEl.textContent=String(best).padStart(4,'0');
  render();
  setTimeout(()=>gameOverOverlay.classList.add('show'),300);
}

function burst(x,y,type){
  const n=type==='crash'?18:12;
  for(let i=0;i<n;i++){
    const a=Math.random()*Math.PI*2,sp=rand(35,type==='crash'?130:85);
    particles.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:rand(.35,.8),frame:type==='crash'?assetFrames.burst:assetFrames.sparkle,scale:rand(1.1,2.2)});
  }
}

function drawSprite(img,x,y,size,angle=0,alpha=1,flip=false){
  if(!img)return;
  ctx.save();
  ctx.globalAlpha=alpha;
  ctx.translate(Math.round(x),Math.round(y));
  ctx.rotate(angle);
  ctx.scale(flip?-1:1,1);
  ctx.imageSmoothingEnabled=false;
  ctx.drawImage(img,-size/2,-size/2,size,size);
  ctx.restore();
}

function render(){
  ctx.save();ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);ctx.imageSmoothingEnabled=false;
  ctx.fillStyle='#cfe7f7';ctx.fillRect(0,0,W,H);

  ctx.fillStyle='rgba(255,255,255,.18)';
  for(let y=((distance*.35)%72)-72;y<H;y+=72)ctx.fillRect(0,Math.round(y),W,1);

  for(const d of decor)drawSprite(images[assetFrames.bg],d.x,d.y,20*d.scale,0,.24,d.flip);
  for(const t of trails)drawSprite(images[assetFrames.trail],t.x,t.y,34,t.a,t.life*.34);

  const sortedObstacles=[...obstacles].sort((a,b)=>a.y-b.y);
  for(const o of sortedObstacles){
    ctx.fillStyle='rgba(35,85,105,.11)';ctx.beginPath();ctx.ellipse(o.x,o.y+14,19,7,0,0,Math.PI*2);ctx.fill();
    drawSprite(images[o.kind==='tree'?assetFrames.tree:assetFrames.snowman],o.x,o.y,16*o.scale);
  }
  for(const c of collectibles){
    const bob=Math.sin(c.bob)*5;
    ctx.fillStyle='rgba(35,85,105,.12)';ctx.beginPath();ctx.ellipse(c.x,c.y+14,14,5,0,0,Math.PI*2);ctx.fill();
    drawSprite(images[assetFrames.donut],c.x,c.y+bob,34);
  }
  for(const p of particles)drawSprite(images[p.frame],p.x,p.y,16*p.scale,0,clamp(p.life*1.6,0,1));
  for(const s of snow)drawSprite(images[assetFrames.snow],s.x,s.y,10*s.s,0,.55);

  ctx.fillStyle='rgba(35,85,105,.14)';ctx.beginPath();ctx.ellipse(player.x,player.y+20,22,8,0,0,Math.PI*2);ctx.fill();
  drawSprite(images[player.frame],player.x,player.y,43,player.angle);
  ctx.restore();
}

function setInput(side,on){
  input[side]=on;
  if(on&&running&&!paused&&!gameOver){
    for(let i=0;i<3;i++)particles.push({x:player.x,y:player.y+22,vx:rand(-25,25),vy:rand(15,55),life:rand(.18,.35),frame:assetFrames.snowSpray,scale:rand(.7,1.2)});
  }
}
function bindHold(el,side){
  el.addEventListener('pointerdown',e=>{e.preventDefault();el.setPointerCapture?.(e.pointerId);setInput(side,true);blip('carve');});
  ['pointerup','pointercancel','lostpointercapture'].forEach(type=>el.addEventListener(type,()=>setInput(side,false)));
}
bindHold(document.getElementById('leftButton'),'left');
bindHold(document.getElementById('rightButton'),'right');

canvas.addEventListener('pointerdown',e=>{
  if(!running||paused||gameOver)return;
  const r=canvas.getBoundingClientRect();
  setInput((e.clientX-r.left)<r.width/2?'left':'right',true);
});
canvas.addEventListener('pointerup',()=>{input.left=false;input.right=false});
canvas.addEventListener('pointercancel',()=>{input.left=false;input.right=false});

addEventListener('keydown',e=>{
  if(e.key==='ArrowLeft'||e.key==='a'||e.key==='A'){input.left=true;e.preventDefault();}
  if(e.key==='ArrowRight'||e.key==='d'||e.key==='D'){input.right=true;e.preventDefault();}
  if((e.key==='Escape'||e.key==='p'||e.key==='P')&&running){paused?resume():openPause();e.preventDefault();}
});
addEventListener('keyup',e=>{
  if(e.key==='ArrowLeft'||e.key==='a'||e.key==='A')input.left=false;
  if(e.key==='ArrowRight'||e.key==='d'||e.key==='D')input.right=false;
});

function openPause(){
  if(!running||gameOver)return;
  paused=true;input.left=false;input.right=false;
  pauseSheet.classList.add('open');pauseSheet.setAttribute('aria-hidden','false');
}
function closePause(){pauseSheet.classList.remove('open');pauseSheet.setAttribute('aria-hidden','true');}
function resume(){
  if(!running||gameOver)return;
  closePause();paused=false;last=performance.now();raf=requestAnimationFrame(loop);
}
pauseButton.addEventListener('click',openPause);
document.getElementById('closePause').addEventListener('click',resume);
document.getElementById('resumeButton').addEventListener('click',resume);
document.getElementById('restartButton').addEventListener('click',startGame);
document.querySelector('.sheetBackdrop').addEventListener('click',resume);
startButton.addEventListener('click',startGame);
document.getElementById('againButton').addEventListener('click',startGame);

soundButton.addEventListener('click',()=>{
  soundOn=!soundOn;
  soundButton.querySelector('span').textContent='Sound: '+(soundOn?'On':'Off');
  soundIcon.src='../assets/gamebox/kenney/icons/Game%20Icons/White/2x/'+(soundOn?'audioOn.png':'audioOff.png');
});

function getAudio(){
  if(!soundOn)return null;
  try{
    audioCtx=audioCtx||new(window.AudioContext||window.webkitAudioContext)();
    if(audioCtx.state==='suspended')audioCtx.resume();
    return audioCtx;
  }catch(_){return null;}
}
function blip(type){
  const a=getAudio();if(!a)return;
  const o=a.createOscillator(),g=a.createGain();
  o.type=type==='crash'?'square':'sine';
  const f=type==='pickup'?620:type==='crash'?110:type==='start'?360:190;
  o.frequency.setValueAtTime(f,a.currentTime);
  o.frequency.exponentialRampToValueAtTime(type==='crash'?55:f*1.35,a.currentTime+.08);
  g.gain.setValueAtTime(.0001,a.currentTime);
  g.gain.exponentialRampToValueAtTime(type==='crash'?.12:.035,a.currentTime+.008);
  g.gain.exponentialRampToValueAtTime(.0001,a.currentTime+(type==='crash'?.18:.07));
  o.connect(g);g.connect(a.destination);o.start();o.stop(a.currentTime+.2);
}
function vibrate(pattern){if(navigator.vibrate)navigator.vibrate(pattern);}

document.addEventListener('visibilitychange',()=>{if(document.hidden&&running&&!paused&&!gameOver)openPause();});
})();
