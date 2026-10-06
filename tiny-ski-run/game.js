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

const BASE='https://chipbutt.github.io/ToolBox/assets/gamebox/kenney/2d/Tiny%20Ski/Tiles/';
const tileUrl=n=>BASE+'tile_'+String(n).padStart(4,'0')+'.png';
const TILE=16;
const SEGMENT=224;

const F={
  piste:[0,2,3,5],
  powder:[1,4],
  edgeLeft:[12,14,24,29,50,61,72,77],
  edgeRight:[15,17,25,28,51,60,73,76],
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
  chair:[47,57],
  gondola:[55,56,67,68],
  tracks:[58],
  snowman:[69],
  player:[70],
  skiers:[71,78,79,80,82,83],
  rock:[81]
};
const REQUIRED=[...new Set(Object.values(F).flat())];
const images={};

let W=360,H=720,dpr=1;
let running=false,paused=false,crashing=false,gameOver=false,soundOn=true;
let last=0,raf=0,audioCtx=null;
let speed=142,distance=0,scroll=0,gates=0,nearMisses=0,bonus=0;
let player=null,tracks=[],puffs=[],feedback=[];
let scenery=[],obstacles=[],courseGates=[],lifts=[];
let nextSegment=0,trackClock=0,shake=0,crashClock=0,elapsed=0;
const input={left:false,right:false,pointerId:null,startX:0,analog:0};
const BEST_KEY='gamebox.tinySkiRun.best.v4';
let best=Number(
  localStorage.getItem(BEST_KEY)||
  localStorage.getItem('gamebox.tinySkiRun.best.v3')||
  localStorage.getItem('gamebox.tinySkiRun.best')||
  0
)||0;

bestEl.textContent=pad(best,4);
startBestEl.textContent=pad(best,4);

function pad(v,n){return String(Math.max(0,Math.floor(v))).padStart(n,'0')}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function randRange(r,a,b){return a+r()*(b-a)}
function pickR(r,arr){return arr[Math.floor(r()*arr.length)]}
function metres(){return Math.floor(distance/18)}
function mulberry32(seed){return function(){let t=seed+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
function hash2(a,b){let n=(a*73856093)^(b*19349663);n=(n^(n>>>13))*1274126177;return(n^(n>>>16))>>>0}

function loadImage(frame){
  return new Promise((resolve,reject)=>{
    const img=new Image();
    img.decoding='async';
    img.onload=()=>{images[frame]=img;resolve()};
    img.onerror=()=>reject(new Error('Tiny Ski tile failed: '+frame));
    img.src=tileUrl(frame);
  });
}

Promise.all(REQUIRED.map(loadImage)).then(()=>{
  assetStatus.textContent='Mountain ready';
  assetStatus.classList.add('ready');
  startButton.disabled=false;
  resetWorld();
  render();
}).catch(err=>{
  console.error(err);
  assetStatus.textContent='Tiny Ski assets failed';
});

function resizeCanvas(){
  const r=canvas.getBoundingClientRect();
  if(!r.width||!r.height)return;
  W=360;
  H=clamp(Math.round(W*(r.height/r.width)),620,820);
  dpr=Math.min(2,window.devicePixelRatio||1);
  canvas.width=Math.round(r.width*dpr);
  canvas.height=Math.round(r.height*dpr);
  if(player)player.y=Math.round(H*.42);
  render();
}
new ResizeObserver(resizeCanvas).observe(canvas);
addEventListener('orientationchange',()=>setTimeout(resizeCanvas,60));
resizeCanvas();

function boundsAtWorld(worldY){
  const center=180
    +34*Math.sin(worldY/390+.35)
    +13*Math.sin(worldY/173+1.2);
  const width=190
    +8*Math.sin(worldY/310+2.1)
    +5*Math.sin(worldY/127+.6);
  const safeCenter=clamp(center,102,258);
  const safeWidth=clamp(width,176,202);
  return {center:safeCenter,width:safeWidth,left:safeCenter-safeWidth/2,right:safeCenter+safeWidth/2};
}
function boundsAtScreen(y){return boundsAtWorld(scroll+y)}

function resetWorld(){
  speed=142;distance=0;scroll=0;gates=0;nearMisses=0;bonus=0;elapsed=0;
  tracks=[];puffs=[];feedback=[];scenery=[];obstacles=[];courseGates=[];lifts=[];
  nextSegment=0;trackClock=0;shake=0;crashClock=0;crashing=false;gameOver=false;
  player={x:boundsAtWorld(H*.42).center,y:Math.round(H*.42),vx:0,angle:0,spin:0,slide:0};
  ensureWorld(true);
  updateHud();
}

function ensureWorld(initial){
  const ahead=scroll+H+SEGMENT;
  while(nextSegment*SEGMENT<ahead){
    generateSegment(nextSegment,initial&&nextSegment===0);
    nextSegment++;
  }
}

function generateSegment(index,isFirst){
  const r=mulberry32(92731+index*7919);
  const start=index*SEGMENT;

  // Side scenery is generated in small composed clusters, not loose random noise.
  const clusters=3+Math.floor(r()*3);
  for(let c=0;c<clusters;c++){
    const worldY=start+24+c*(SEGMENT/clusters)+randRange(r,-12,12);
    const side=r()<.5?'left':'right';
    const count=r()<.45?2:3;
    for(let i=0;i<count;i++){
      const rr=r();
      let kind='tree',frame,size=16;
      if(rr<.55){frame=pickR(r,F.tree);kind='tree'}
      else if(rr<.68){frame=pickR(r,F.deadTree);kind='dead'}
      else if(rr<.78){frame=F.rock[0];kind='rock'}
      else if(rr<.87){frame=F.shrub[0];kind='shrub'}
      else if(rr<.94){frame=F.snowman[0];kind='snowman'}
      else{frame=pickR(r,side==='left'?F.signLeft:F.signRight);kind='sign'}
      scenery.push({
        worldY:worldY+i*randRange(r,9,19),
        side,
        offset:randRange(r,18,58)+i*6,
        frame,
        kind,
        size
      });
    }
  }

  // Nets/fencing sit at the piste edge like the reference.
  if(index%3===1){
    const y=start+randRange(r,72,150);
    scenery.push({worldY:y,side:r()<.5?'left':'right',offset:12,frame:r()<.5?F.redNet[0]:F.blueNet[0],kind:'net',size:16});
  }

  // First screen deliberately contains a chairlift set-piece.
  if(isFirst){
    addLift(start+190,r);
    addGate(start+80,index,0,r,true);
  }else{
    if(index%5===0)addLift(start+96,r);
    const gateCount=index%5===0?1:2;
    for(let g=0;g<gateCount;g++)addGate(start+112+g*104,index,g,r,false);
  }

  // Keep the central piste visually open; hazards are sparse and readable.
  if(index>1){
    const worldY=start+166+randRange(r,-16,16);
    const kind=r()<.52?'rock':r()<.74?'snowman':r()<.9?'tree':'skier';
    const t=kind==='tree'?(r()<.5?randRange(r,.08,.18):randRange(r,.82,.92)):randRange(r,.2,.8);
    addObstacle(worldY,t,kind,r);
  }
}

function addGate(worldY,index,g,r,passed){
  const centerT=clamp(.5+Math.sin((index*2+g)*1.35)*.17,.28,.72);
  const half=.12;
  courseGates.push({worldY,leftT:centerT-half,rightT:centerT+half,redLeft:(index+g)%2===0,passed:!!passed});
}

function addObstacle(worldY,t,kind,r){
  let frame=F.rock[0],radius=5;
  if(kind==='tree'){frame=pickR(r,F.tree);radius=6}
  else if(kind==='snowman'){frame=F.snowman[0];radius=5}
  else if(kind==='skier'){frame=pickR(r,F.skiers);radius=5}
  obstacles.push({
    worldY,t,baseT:t,kind,frame,radius,nearChecked:false,
    phase:randRange(r,0,6.28),
    weave:kind==='skier'?randRange(r,.025,.055):0,
    weaveSpeed:kind==='skier'?randRange(r,1.1,1.7):0
  });
}

function addLift(worldY,r){
  lifts.push({
    worldY,
    cable:pickR(r,F.cable),
    towerLeft:pickR(r,F.liftTower),
    towerMid:pickR(r,F.liftTower),
    towerRight:pickR(r,F.liftTower),
    chairLeft:pickR(r,F.chair),
    gondola:pickR(r,F.gondola),
    chairRight:pickR(r,F.chair)
  });
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

function loop(now){
  if(!running||paused)return;
  const dt=Math.min(.033,Math.max(.001,(now-last)/1000||.016));
  last=now;
  update(dt);
  render();
  if(running&&!paused)raf=requestAnimationFrame(loop);
}

function update(dt){
  elapsed+=dt;
  if(crashing){updateCrash(dt);return}

  distance+=speed*dt;
  scroll+=speed*dt;
  const m=metres();
  speed=Math.min(300,142+m*.085);
  ensureWorld(false);
  pruneWorld();

  const steer=((input.left?-1:0)+(input.right?1:0))||input.analog;
  const target=steer*(92+speed*.1);
  player.vx+=(target-player.vx)*Math.min(1,dt*8.2);
  if(!steer)player.vx*=Math.pow(.1,dt);
  player.x+=player.vx*dt;
  player.angle=clamp(player.vx/270,-.34,.34);

  trackClock-=dt;
  if(trackClock<=0){
    tracks.push({x:player.x,y:player.y+8,a:player.angle,life:1});
    if(tracks.length>54)tracks.shift();
    trackClock=.07;
  }
  if(Math.abs(steer)>.25&&Math.random()<dt*10){
    puffs.push({x:player.x+randRange(Math.random,-4,4),y:player.y+7,vx:randRange(Math.random,-15,15),vy:randRange(Math.random,5,18),life:.24,size:2});
  }

  for(const o of obstacles){
    if(o.kind==='skier'){
      o.phase+=dt*o.weaveSpeed;
      o.t=clamp(o.baseT+Math.sin(o.phase)*o.weave,.12,.88);
    }
  }

  for(const t of tracks){t.y-=speed*dt;t.life-=dt*.2}
  tracks=tracks.filter(t=>t.y>-20&&t.life>0);
  for(const p of puffs){p.x+=p.vx*dt;p.y+=p.vy*dt-speed*dt*.18;p.life-=dt}
  puffs=puffs.filter(p=>p.life>0);

  checkBoundary();
  if(!crashing)checkObstacles();
  if(!crashing)checkGates();
  updateFeedback(dt);
  updateHud();
}

function pruneWorld(){
  const behind=scroll-100;
  scenery=scenery.filter(x=>x.worldY>behind);
  obstacles=obstacles.filter(x=>x.worldY>behind);
  courseGates=courseGates.filter(x=>x.worldY>behind);
  lifts=lifts.filter(x=>x.worldY>behind);
}

function checkBoundary(){
  const b=boundsAtWorld(scroll+player.y);
  if(player.x<b.left+5||player.x>b.right-5)startCrash();
}

function obstaclePosition(o){
  const y=o.worldY-scroll;
  const b=boundsAtWorld(o.worldY);
  return {x:b.left+b.width*o.t,y};
}

function checkObstacles(){
  for(const o of obstacles){
    const p=obstaclePosition(o);
    if(p.y<player.y-30||p.y>player.y+30)continue;
    const d=Math.hypot(player.x-p.x,player.y-p.y);
    if(d<5+o.radius){startCrash();return}
    if(!o.nearChecked&&p.y<player.y-8){
      o.nearChecked=true;
      if(d<19&&d>11){nearMisses++;addFeedback('CLOSE!','#1e638a');tone('near')}
    }
  }
}

function checkGates(){
  for(const g of courseGates){
    const y=g.worldY-scroll;
    if(g.passed||y>player.y+2)continue;
    g.passed=true;
    const b=boundsAtWorld(g.worldY);
    const lx=b.left+b.width*g.leftT;
    const rx=b.left+b.width*g.rightT;
    if(player.x>lx+3&&player.x<rx-3){
      gates++;addFeedback('GATE!','#cb424a');tone('gate');vibrate(8);
    }else{
      addFeedback('MISSED GATE','#687f8c');tone('miss');
    }
  }
}

function startCrash(){
  if(crashing||gameOver)return;
  crashing=true;crashClock=0;shake=5;
  input.left=input.right=false;input.analog=0;input.pointerId=null;
  vibrate([55,30,80]);tone('crash');
  for(let i=0;i<14;i++){
    puffs.push({x:player.x+randRange(Math.random,-4,4),y:player.y+randRange(Math.random,1,8),vx:randRange(Math.random,-45,45),vy:randRange(Math.random,-6,42),life:randRange(Math.random,.28,.55),size:2});
  }
}

function updateCrash(dt){
  crashClock+=dt;
  player.spin+=dt*4.8;
  player.slide+=dt*14;
  player.x+=player.vx*dt*.22;
  shake=Math.max(0,shake-dt*16);
  for(const p of puffs){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt}
  puffs=puffs.filter(p=>p.life>0);
  updateFeedback(dt);
  if(crashClock>.62)finishRun();
}

function finishRun(){
  if(gameOver)return;
  gameOver=true;running=false;crashing=false;
  const m=metres();
  const isBest=m>best;
  if(isBest){best=m;localStorage.setItem(BEST_KEY,String(best))}
  finalDistanceEl.textContent=m;
  runBreakdownEl.textContent=gates+' gate'+(gates===1?'':'s')+' · '+nearMisses+' near miss'+(nearMisses===1?'':'es');
  recordText.textContent=isBest?'NEW BEST!':'Best: '+best+'m';
  bestEl.textContent=pad(best,4);
  startBestEl.textContent=pad(best,4);
  render();
  gameOverOverlay.classList.add('show');
}

function addFeedback(textValue,color){feedback.push({x:player.x,y:player.y-14,text:textValue,color,life:1})}
function updateFeedback(dt){
  for(const f of feedback){f.y-=16*dt;f.life-=dt*1.4}
  feedback=feedback.filter(f=>f.life>0);
}
function updateHud(){
  distanceEl.textContent=pad(metres(),4);
  gatesEl.textContent=pad(gates,2);
  bestEl.textContent=pad(Math.max(best,metres()),4);
  speedLabel.textContent=speed<175?'CRUISE':speed<215?'CARVING':speed<260?'FAST':'FLYING';
}

function drawSprite(frame,x,y,size=TILE,angle=0,alpha=1,flip=false){
  const img=images[frame];if(!img)return;
  ctx.save();
  ctx.globalAlpha=alpha;
  ctx.translate(Math.round(x),Math.round(y));
  ctx.rotate(angle);
  ctx.scale(flip?-1:1,1);
  ctx.imageSmoothingEnabled=false;
  ctx.drawImage(img,-size/2,-size/2,size,size);
  ctx.restore();
}

function drawTileField(frames){
  const yOffset=-(scroll%TILE);
  const firstRow=Math.floor(scroll/TILE)-1;
  for(let sy=yOffset-TILE,row=firstRow;sy<H+TILE;sy+=TILE,row++){
    for(let x=0,col=0;x<W+TILE;x+=TILE,col++){
      const frame=frames[hash2(col,row)%frames.length];
      const img=images[frame];
      if(img)ctx.drawImage(img,x,Math.round(sy),TILE,TILE);
    }
  }
}

function drawPiste(){
  drawTileField(F.powder);

  ctx.save();
  ctx.beginPath();
  for(let y=-16;y<=H+16;y+=8){
    const b=boundsAtWorld(scroll+y);
    if(y===-16)ctx.moveTo(b.left,y);else ctx.lineTo(b.left,y);
  }
  for(let y=H+16;y>=-16;y-=8){
    const b=boundsAtWorld(scroll+y);
    ctx.lineTo(b.right,y);
  }
  ctx.closePath();
  ctx.clip();
  drawTileField(F.piste);
  ctx.restore();

  const yOffset=-(scroll%TILE);
  const firstRow=Math.floor(scroll/TILE)-1;
  for(let y=yOffset-TILE,row=firstRow;y<H+TILE;y+=TILE,row++){
    const worldY=scroll+y;
    const b=boundsAtWorld(worldY);
    const next=boundsAtWorld(worldY+TILE);
    const leftFrame=F.edgeLeft[hash2(13,row)%F.edgeLeft.length];
    const rightFrame=F.edgeRight[hash2(31,row)%F.edgeRight.length];
    const leftAngle=Math.atan2(next.left-b.left,TILE)*-.18;
    const rightAngle=Math.atan2(next.right-b.right,TILE)*-.18;
    drawSprite(leftFrame,b.left,y,TILE,leftAngle);
    drawSprite(rightFrame,b.right,y,TILE,rightAngle);
  }
}

function sceneryPosition(s){
  const b=boundsAtWorld(s.worldY);
  const raw=s.side==='left'?b.left-s.offset:b.right+s.offset;
  return {x:clamp(raw,9,W-9),y:s.worldY-scroll};
}

function drawScenery(){
  const visible=scenery
    .filter(s=>{const y=s.worldY-scroll;return y>-24&&y<H+24})
    .sort((a,b)=>a.worldY-b.worldY);
  for(const s of visible){
    const p=sceneryPosition(s);
    drawSprite(s.frame,p.x,p.y,s.size);
  }
}

function drawLift(lift){
  const y=lift.worldY-scroll;
  if(y<-30||y>H+30)return;
  const b=boundsAtWorld(lift.worldY);
  const leftTower=clamp(b.left-32,18,W-18);
  const midTower=clamp(b.center,18,W-18);
  const rightTower=clamp(b.right+32,18,W-18);

  for(let x=0;x<=W;x+=TILE)drawSprite(lift.cable,x+TILE/2,y,TILE);
  drawSprite(lift.towerLeft,leftTower,y,TILE);
  drawSprite(lift.towerMid,midTower,y,TILE);
  drawSprite(lift.towerRight,rightTower,y,TILE);
  drawSprite(lift.chairLeft,(leftTower+midTower)/2,y+5,TILE);
  drawSprite(lift.gondola,(midTower+rightTower)/2,y+5,TILE);
  drawSprite(lift.chairRight,clamp(rightTower+34,8,W-8),y+5,TILE);
}

function render(){
  if(!canvas.width||!canvas.height)return;
  ctx.save();
  ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);
  ctx.imageSmoothingEnabled=false;
  if(shake>0)ctx.translate(randRange(Math.random,-shake,shake),randRange(Math.random,-shake,shake));

  drawPiste();
  drawScenery();

  for(const t of tracks)drawSprite(F.tracks[0],t.x,t.y,TILE,t.a,t.life*.55);

  for(const g of courseGates){
    const y=g.worldY-scroll;
    if(y<-24||y>H+24)continue;
    const b=boundsAtWorld(g.worldY);
    const lx=b.left+b.width*g.leftT;
    const rx=b.left+b.width*g.rightT;
    drawSprite(g.redLeft?F.redFlag[0]:F.blueFlag[0],lx,y,TILE);
    drawSprite(g.redLeft?F.blueFlag[0]:F.redFlag[0],rx,y,TILE);
  }

  for(const o of obstacles){
    const p=obstaclePosition(o);
    if(p.y<-24||p.y>H+24)continue;
    drawSprite(o.frame,p.x,p.y,TILE,o.kind==='skier'?Math.sin(o.phase)*.12:0);
  }

  for(const p of puffs){
    ctx.globalAlpha=clamp(p.life*3,0,1);
    ctx.fillStyle='#fff';
    ctx.fillRect(Math.round(p.x),Math.round(p.y),p.size,p.size);
  }
  ctx.globalAlpha=1;

  if(player){
    drawSprite(F.player[0],player.x,player.y+player.slide,TILE,crashing?player.spin:player.angle);
  }

  // The chairlift is overhead, so it is intentionally drawn over the skier.
  for(const lift of lifts)drawLift(lift);

  for(const f of feedback){
    ctx.save();
    ctx.globalAlpha=clamp(f.life,0,1);
    ctx.font='900 10px ui-rounded, Arial Rounded MT Bold, sans-serif';
    ctx.textAlign='center';
    ctx.lineWidth=3;
    ctx.strokeStyle='#fff';
    ctx.strokeText(f.text,f.x,f.y);
    ctx.fillStyle=f.color;
    ctx.fillText(f.text,f.x,f.y);
    ctx.restore();
  }

  ctx.restore();
}

canvas.addEventListener('pointerdown',e=>{
  if(!running||paused||crashing||gameOver)return;
  const r=canvas.getBoundingClientRect();
  input.pointerId=e.pointerId;
  input.startX=e.clientX-r.left;
  input.analog=input.startX<r.width/2?-1:1;
  canvas.setPointerCapture?.(e.pointerId);
  e.preventDefault();
});
canvas.addEventListener('pointermove',e=>{
  if(input.pointerId!==e.pointerId)return;
  const r=canvas.getBoundingClientRect();
  const x=e.clientX-r.left;
  const delta=x-input.startX;
  input.analog=Math.abs(delta)>10?clamp(delta/(r.width*.18),-1,1):(x<r.width/2?-1:1);
  e.preventDefault();
});
function clearPointer(e){
  if(input.pointerId===null||!e||input.pointerId===e.pointerId){
    input.pointerId=null;
    input.analog=0;
  }
}
canvas.addEventListener('pointerup',clearPointer);
canvas.addEventListener('pointercancel',clearPointer);
canvas.addEventListener('lostpointercapture',clearPointer);
canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('dblclick',e=>e.preventDefault());

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
  paused=true;
  input.left=input.right=false;input.analog=0;input.pointerId=null;
  pauseSheet.classList.add('open');
  pauseSheet.setAttribute('aria-hidden','false');
}
function closePause(){pauseSheet.classList.remove('open');pauseSheet.setAttribute('aria-hidden','true')}
function resume(){
  if(!running||gameOver)return;
  closePause();paused=false;last=performance.now();raf=requestAnimationFrame(loop);
  document.activeElement?.blur?.();
}

document.getElementById('pauseButton').addEventListener('click',e=>{e.currentTarget.blur();openPause()});
document.getElementById('closePause').addEventListener('click',e=>{e.currentTarget.blur();resume()});
document.getElementById('resumeButton').addEventListener('click',e=>{e.currentTarget.blur();resume()});
document.getElementById('restartButton').addEventListener('click',e=>{e.currentTarget.blur();startGame()});
document.querySelector('.sheetBackdrop').addEventListener('click',resume);
startButton.addEventListener('click',e=>{e.currentTarget.blur();startGame()});
document.getElementById('againButton').addEventListener('click',e=>{e.currentTarget.blur();startGame()});

soundButton.addEventListener('click',e=>{
  e.currentTarget.blur();
  soundOn=!soundOn;
  soundButton.querySelector('span').textContent=soundOn?'SOUND ON':'SOUND OFF';
  soundIcon.src='../assets/gamebox/kenney/icons/Game%20Icons/White/2x/'+(soundOn?'audioOn.png':'audioOff.png');
});

function getAudio(){
  if(!soundOn)return null;
  try{
    audioCtx=audioCtx||new(window.AudioContext||window.webkitAudioContext)();
    if(audioCtx.state==='suspended')audioCtx.resume();
    return audioCtx;
  }catch(_){return null}
}
function tone(type){
  const a=getAudio();if(!a)return;
  const o=a.createOscillator(),g=a.createGain();
  o.type=type==='crash'?'square':'sine';
  const f=type==='gate'?650:type==='near'?500:type==='miss'?165:type==='crash'?100:type==='start'?330:145;
  o.frequency.setValueAtTime(f,a.currentTime);
  o.frequency.exponentialRampToValueAtTime(type==='crash'?50:f*1.14,a.currentTime+.06);
  g.gain.setValueAtTime(.0001,a.currentTime);
  g.gain.exponentialRampToValueAtTime(type==='crash'?.08:.018,a.currentTime+.006);
  g.gain.exponentialRampToValueAtTime(.0001,a.currentTime+(type==='crash'?.14:.05));
  o.connect(g);g.connect(a.destination);o.start();o.stop(a.currentTime+.16);
}
function vibrate(pattern){if(navigator.vibrate)navigator.vibrate(pattern)}

document.addEventListener('visibilitychange',()=>{if(document.hidden&&running&&!paused&&!gameOver&&!crashing)openPause()});
addEventListener('pagehide',()=>{input.left=input.right=false;input.analog=0;input.pointerId=null});
})();
