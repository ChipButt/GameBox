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

const F={
  piste:[0,2,3,5],
  offPiste:[1,4],
  bankLeft:[12,14,50,61,72,77],
  bankRight:[15,17,51,60,73,76],
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
  skiers:[71,78,79,80,82,83],
  rock:[81]
};
const REQUIRED=[...new Set(Object.values(F).flat())];
const images={};

let W=360,H=720,dpr=1;
let running=false,paused=false,crashing=false,gameOver=false,soundOn=true;
let last=0,raf=0,audioCtx=null;
let speed=155,distance=0,scrollTotal=0,gates=0,nearMisses=0,bonus=0;
let spawnTravel=0,featureTravel=0,trackClock=0,courseTurn=0;
let player=null,courseNodes=[],obstacles=[],scenery=[],gatesOnCourse=[],features=[],tracks=[],snowPuffs=[],feedback=[];
let shake=0,crashClock=0;
const input={left:false,right:false,pointerId:null,startX:0,analog:0};
const BEST_KEY='gamebox.tinySkiRun.best.v3';
let best=Number(localStorage.getItem(BEST_KEY)||0)||0;

bestEl.textContent=pad(best,4);
startBestEl.textContent=pad(best,4);

function pad(v,n){return String(Math.max(0,Math.floor(v))).padStart(n,'0')}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function rand(a,b){return a+Math.random()*(b-a)}
function pick(arr){return arr[Math.floor(Math.random()*arr.length)]}
function hash2(a,b){let n=(a*73856093)^(b*19349663);n=(n^(n>>>13))*1274126177;return (n^(n>>>16))>>>0}
function metres(){return Math.floor(distance/18)}

function loadImage(frame){
  return new Promise((resolve,reject)=>{
    const img=new Image();
    img.decoding='async';
    img.onload=()=>{images[frame]=img;resolve()};
    img.onerror=()=>reject(new Error('Failed Tiny Ski tile '+frame));
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
  canvas.width=Math.max(1,Math.round(r.width*dpr));
  canvas.height=Math.max(1,Math.round(r.height*dpr));
  if(player)player.y=H*.29;
  if(courseNodes.length)ensureCourseCoverage();
  render();
}
new ResizeObserver(resizeCanvas).observe(canvas);
addEventListener('orientationchange',()=>setTimeout(resizeCanvas,60));
resizeCanvas();

function resetWorld(){
  speed=155;distance=0;scrollTotal=0;gates=0;nearMisses=0;bonus=0;
  spawnTravel=105;featureTravel=0;trackClock=0;courseTurn=0;
  crashing=false;gameOver=false;shake=0;crashClock=0;
  obstacles=[];scenery=[];gatesOnCourse=[];features=[];tracks=[];snowPuffs=[];feedback=[];
  player={x:W/2,y:H*.29,vx:0,angle:0,spin:0,slide:0};
  initCourse();
  for(let i=0;i<28;i++)spawnScenery(rand(-20,H+120),true);
  for(let i=0;i<3;i++)spawnFeature(H*.58+i*235);
  updateHud();
}

function initCourse(){
  courseNodes=[];
  let center=W/2,width=238;
  for(let y=-96;y<=H+144;y+=48){
    courseNodes.push(makeCourseNode(y,center,width));
  }
}
function makeCourseNode(y,center,width){
  return {y,center,width,edgeL:pick(F.bankLeft),edgeR:pick(F.bankRight)};
}
function ensureCourseCoverage(){
  while(courseNodes.length<3||courseNodes[courseNodes.length-1].y<H+150)appendCourseNode();
}
function appendCourseNode(){
  const prev=courseNodes[courseNodes.length-1]||makeCourseNode(0,W/2,238);
  courseTurn=clamp(courseTurn+rand(-.17,.17),-.58,.58);
  if(Math.random()<.12)courseTurn*=.35;
  const targetCenter=clamp(prev.center+courseTurn*20+rand(-5,5),112,W-112);
  const m=metres();
  const targetWidth=clamp(prev.width+rand(-15,15)-(m>650?2:0),184,258);
  courseNodes.push(makeCourseNode(prev.y+48,targetCenter,targetWidth));
}

function boundsAt(y){
  if(!courseNodes.length)return {left:60,right:300,center:180,width:240};
  let a=courseNodes[0],b=courseNodes[courseNodes.length-1];
  for(let i=0;i<courseNodes.length-1;i++){
    if(y>=courseNodes[i].y&&y<=courseNodes[i+1].y){a=courseNodes[i];b=courseNodes[i+1];break}
  }
  const den=b.y-a.y||1;
  const t=clamp((y-a.y)/den,0,1);
  const center=a.center+(b.center-a.center)*t;
  const width=a.width+(b.width-a.width)*t;
  return {left:center-width/2,right:center+width/2,center,width};
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
  if(crashing){updateCrash(dt);return}

  distance+=speed*dt;
  scrollTotal+=speed*dt;
  const m=metres();
  speed=Math.min(345,155+m*.13);
  spawnTravel+=speed*dt;
  featureTravel+=speed*dt;

  updateCourse(speed*dt);

  const steer=((input.left?-1:0)+(input.right?1:0))||input.analog;
  const target=steer*(106+speed*.13);
  player.vx+=(target-player.vx)*Math.min(1,dt*8.4);
  if(!steer)player.vx*=Math.pow(.1,dt);
  player.x+=player.vx*dt;
  player.angle=clamp(player.vx/300,-.42,.42);

  trackClock-=dt;
  if(trackClock<=0){
    tracks.push({x:player.x,y:player.y+16,a:player.angle,life:1});
    if(tracks.length>68)tracks.shift();
    trackClock=.06;
  }
  if(Math.abs(steer)>.2&&Math.random()<dt*13){
    snowPuffs.push({x:player.x-rand(-8,8),y:player.y+17,vx:rand(-22,22)-steer*12,vy:rand(10,28),life:rand(.18,.32),size:pick([2,2,3])});
  }

  updateEntities(speed*dt,dt);

  const spawnEvery=clamp(160-m*.028,108,160);
  if(spawnTravel>spawnEvery){spawnTravel=0;spawnPattern(m)}
  if(featureTravel>650){featureTravel=0;if(Math.random()<.68)spawnFeature(H+90)}

  checkCourseBoundary();
  if(!crashing)checkObstacleCollisions();
  if(!crashing)checkGates();
  updateFeedback(dt);
  updateHud();
}

function updateCourse(scroll){
  for(const n of courseNodes)n.y-=scroll;
  while(courseNodes.length>3&&courseNodes[1].y<-70)courseNodes.shift();
  ensureCourseCoverage();
}

function updateEntities(scroll,dt){
  for(let i=scenery.length-1;i>=0;i--){
    const s=scenery[i];s.y-=scroll*s.rate;
    if(s.y<-70){scenery.splice(i,1);spawnScenery(H+rand(30,150),false)}
  }
  for(let i=obstacles.length-1;i>=0;i--){
    const o=obstacles[i];o.y-=scroll*(o.kind==='skier'?.82:1);
    if(o.kind==='skier'){o.phase+=dt*o.weaveSpeed;o.t=clamp(o.baseT+Math.sin(o.phase)*o.weave,.12,.88)}
    const b=boundsAt(o.y);o.x=b.left+b.width*o.t;
    if(o.y<-70){obstacles.splice(i,1);continue}
    if(!o.nearChecked&&o.y<player.y-18){
      o.nearChecked=true;
      const dx=Math.abs(o.x-player.x);
      if(dx<o.radius+19&&dx>o.radius+7){nearMisses++;bonus+=25;addFeedback('NEAR +25','#1c668f');tone('near')}
    }
  }
  for(let i=gatesOnCourse.length-1;i>=0;i--){
    const g=gatesOnCourse[i];g.y-=scroll;
    if(g.y<-70)gatesOnCourse.splice(i,1);
  }
  for(let i=features.length-1;i>=0;i--){
    features[i].y-=scroll*.76;
    if(features[i].y<-100)features.splice(i,1);
  }
  for(const t of tracks){t.y-=scroll;t.life-=dt*.18}
  tracks=tracks.filter(t=>t.y>-40&&t.life>0);
  for(const p of snowPuffs){p.x+=p.vx*dt;p.y+=p.vy*dt-scroll*.22;p.life-=dt}
  snowPuffs=snowPuffs.filter(p=>p.life>0);
}

function spawnScenery(y,initial){
  const side=Math.random()<.5?'left':'right';
  const r=Math.random();
  let frame;
  if(r<.55)frame=pick([...F.tree,...F.deadTree]);
  else if(r<.7)frame=pick(side==='left'?F.signLeft:F.signRight);
  else if(r<.82)frame=F.shrub[0];
  else if(r<.92)frame=F.snowman[0];
  else frame=pick([...F.redNet,...F.blueNet]);
  scenery.push({y:initial?y:y+rand(0,70),side,frame,rate:rand(.94,1.02),margin:rand(16,42)});
}

function spawnFeature(y){
  features.push({
    y,
    towerL:pick(F.liftTower),
    towerR:pick(F.liftTower),
    seat:pick(F.liftSeat),
    gondola:pick(F.gondola),
    cable:pick(F.cable)
  });
}

function spawnPattern(m){
  const y=H+70;
  const roll=Math.random();

  if(roll<.24){
    addObstacle(rand(.2,.8),y,pick(['tree','tree','rock','snowman']));
  }else if(roll<.44){
    addObstacle(rand(.12,.3),y,pick(['tree','deadTree']));
    addObstacle(rand(.7,.88),y,pick(['tree','deadTree']));
  }else if(roll<.66){
    addGate(y);
  }else if(roll<.84){
    const gapT=rand(.27,.73);
    for(const t of [.14,.3,.46,.62,.78,.88]){
      if(Math.abs(t-gapT)>.16)addObstacle(t,y+rand(-8,8),pick(['tree','deadTree','rock']));
    }
  }else{
    addObstacle(.22,y,'tree');
    addObstacle(.78,y+74,pick(['rock','snowman','deadTree']));
    if(m>700)addObstacle(.5,y+146,pick(['tree','rock']));
    if(m>1050&&Math.random()<.45)addOtherSkier(y+215);
  }
}

function addObstacle(t,y,kind){
  let frame,radius=10;
  if(kind==='tree'){frame=pick(F.tree);radius=12}
  else if(kind==='deadTree'){frame=pick(F.deadTree);radius=11}
  else if(kind==='snowman'){frame=F.snowman[0];radius=10}
  else{frame=F.rock[0];radius=10}
  const b=boundsAt(y);
  obstacles.push({t,x:b.left+b.width*t,y,kind,frame,radius,nearChecked:false,baseT:t,phase:0,weave:0,weaveSpeed:0});
}
function addOtherSkier(y){
  const t=rand(.24,.76),b=boundsAt(y);
  obstacles.push({t,baseT:t,x:b.left+b.width*t,y,kind:'skier',frame:pick(F.skiers),radius:9,nearChecked:false,phase:rand(0,6.2),weave:rand(.035,.075),weaveSpeed:rand(1.2,2)});
}
function addGate(y){
  const centreT=rand(.42,.58);
  const half=rand(.18,.22);
  gatesOnCourse.push({y,leftT:centreT-half,rightT:centreT+half,passed:false,redLeft:Math.random()<.5});
}

function checkCourseBoundary(){
  const b=boundsAt(player.y);
  if(player.x<b.left+8||player.x>b.right-8)startCrash('bank');
}
function checkObstacleCollisions(){
  for(const o of obstacles){
    if(Math.hypot(player.x-o.x,player.y-o.y)<9+o.radius){startCrash(o.kind);return}
  }
}
function checkGates(){
  for(const g of gatesOnCourse){
    if(g.passed||g.y>player.y+3)continue;
    g.passed=true;
    const b=boundsAt(g.y);
    const lx=b.left+b.width*g.leftT;
    const rx=b.left+b.width*g.rightT;
    if(player.x>lx+5&&player.x<rx-5){
      gates++;bonus+=75;addFeedback('GATE +75','#cf474d');tone('gate');vibrate(10);
    }else{
      addFeedback('MISSED GATE','#657c8b');tone('miss');
    }
  }
}

function startCrash(){
  if(crashing||gameOver)return;
  crashing=true;crashClock=0;shake=7;input.left=input.right=false;input.analog=0;input.pointerId=null;
  vibrate([60,35,90]);tone('crash');
  for(let i=0;i<18;i++)snowPuffs.push({x:player.x+rand(-7,7),y:player.y+rand(2,16),vx:rand(-70,70),vy:rand(-10,65),life:rand(.3,.65),size:pick([2,3,4])});
}
function updateCrash(dt){
  crashClock+=dt;
  player.spin+=dt*5;
  player.slide+=dt*20;
  player.x+=player.vx*dt*.25;
  shake=Math.max(0,shake-dt*18);
  for(const p of snowPuffs){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=18*dt;p.life-=dt}
  snowPuffs=snowPuffs.filter(p=>p.life>0);
  updateFeedback(dt);
  if(crashClock>.68)finishRun();
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
  bestEl.textContent=pad(best,4);startBestEl.textContent=pad(best,4);
  render();
  gameOverOverlay.classList.add('show');
}

function addFeedback(textValue,color){feedback.push({x:player.x,y:player.y-30,text:textValue,color,life:1})}
function updateFeedback(dt){for(const f of feedback){f.y-=20*dt;f.life-=dt*1.3}feedback=feedback.filter(f=>f.life>0)}
function updateHud(){
  distanceEl.textContent=pad(metres(),4);
  gatesEl.textContent=pad(gates,2);
  bestEl.textContent=pad(Math.max(best,metres()),4);
  speedLabel.textContent=speed<205?'CRUISE':speed<255?'CARVING':speed<305?'FAST':'FLYING';
}

function drawSprite(frame,x,y,size,angle=0,alpha=1,flip=false){
  const img=images[frame];if(!img)return;
  ctx.save();ctx.globalAlpha=alpha;ctx.translate(Math.round(x),Math.round(y));ctx.rotate(angle);ctx.scale(flip?-1:1,1);ctx.imageSmoothingEnabled=false;ctx.drawImage(img,-size/2,-size/2,size,size);ctx.restore();
}

function drawTileField(frames){
  const size=32;
  const firstWorldRow=Math.floor(scrollTotal/size)-1;
  const yOffset=-(scrollTotal%size);
  for(let sy=yOffset-size,row=firstWorldRow;sy<H+size;sy+=size,row++){
    for(let x=0,col=0;x<W+size;x+=size,col++){
      const h=hash2(col,row);
      const frame=frames[h%frames.length];
      const img=images[frame];
      if(img)ctx.drawImage(img,Math.round(x),Math.round(sy),size,size);
    }
  }
}

function pistePolygon(){
  const left=[],right=[];
  for(let y=-20;y<=H+20;y+=16){
    const b=boundsAt(y);left.push([b.left,y]);right.push([b.right,y]);
  }
  return {left,right};
}

function drawPiste(){
  drawTileField(F.offPiste);
  const p=pistePolygon();
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(p.left[0][0],p.left[0][1]);
  for(let i=1;i<p.left.length;i++)ctx.lineTo(p.left[i][0],p.left[i][1]);
  for(let i=p.right.length-1;i>=0;i--)ctx.lineTo(p.right[i][0],p.right[i][1]);
  ctx.closePath();ctx.clip();
  drawTileField(F.piste);
  ctx.restore();

  for(const n of courseNodes){
    if(n.y<-40||n.y>H+40)continue;
    const b=boundsAt(n.y);
    const next=boundsAt(n.y+18);
    const bankAngle=Math.atan2(next.left-b.left,18)*-.4;
    drawSprite(n.edgeL,b.left,n.y,32,bankAngle);
    drawSprite(n.edgeR,b.right,n.y,32,-bankAngle);
  }
}

function sceneryX(s){
  const b=boundsAt(s.y);
  return s.side==='left'?b.left-s.margin:b.right+s.margin;
}

function drawFeature(f){
  const y=f.y;
  const b=boundsAt(y);
  const leftX=Math.max(20,b.left-36),rightX=Math.min(W-20,b.right+36);
  for(let x=leftX+14;x<rightX-14;x+=28)drawSprite(f.cable,x,y,32);
  drawSprite(f.towerL,leftX,y,32);
  drawSprite(f.towerR,rightX,y,32);
  drawSprite(f.seat,leftX+(rightX-leftX)*.35,y+4,32);
  drawSprite(f.gondola,leftX+(rightX-leftX)*.7,y+4,32);
}

function render(){
  if(!canvas.width||!canvas.height)return;
  ctx.save();
  ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);
  ctx.imageSmoothingEnabled=false;
  if(shake>0)ctx.translate(rand(-shake,shake),rand(-shake,shake));

  drawPiste();

  const backScenery=[...scenery].sort((a,b)=>a.y-b.y);
  for(const s of backScenery)drawSprite(s.frame,sceneryX(s),s.y,32);
  for(const f of features)drawFeature(f);

  for(const t of tracks)drawSprite(F.tracks[0],t.x,t.y,32,t.a,t.life*.58);

  for(const g of gatesOnCourse){
    const b=boundsAt(g.y);
    const lx=b.left+b.width*g.leftT,rx=b.left+b.width*g.rightT;
    drawSprite(g.redLeft?F.redFlag[0]:F.blueFlag[0],lx,g.y,32);
    drawSprite(g.redLeft?F.blueFlag[0]:F.redFlag[0],rx,g.y,32);
  }

  const sorted=[...obstacles].sort((a,b)=>a.y-b.y);
  for(const o of sorted){
    const angle=o.kind==='skier'?Math.sin(o.phase)*.18:0;
    drawSprite(o.frame,o.x,o.y,32,angle);
  }

  for(const p of snowPuffs){
    ctx.globalAlpha=clamp(p.life*2.2,0,1);ctx.fillStyle='#ffffff';
    ctx.fillRect(Math.round(p.x),Math.round(p.y),p.size,p.size);
  }
  ctx.globalAlpha=1;

  if(player){
    ctx.fillStyle='rgba(57,95,116,.12)';ctx.beginPath();ctx.ellipse(player.x,player.y+15,13,4,0,0,Math.PI*2);ctx.fill();
    drawSprite(F.player[0],player.x,player.y+player.slide,32,crashing?player.spin:player.angle);
  }

  for(const f of feedback){
    ctx.save();ctx.globalAlpha=clamp(f.life,0,1);ctx.font='900 11px ui-rounded, Arial Rounded MT Bold, sans-serif';ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='rgba(255,255,255,.9)';ctx.strokeText(f.text,f.x,f.y);ctx.fillStyle=f.color;ctx.fillText(f.text,f.x,f.y);ctx.restore();
  }

  ctx.restore();
}

function setDigital(side,on){input[side]=on;if(on&&running&&!paused&&!crashing)tone('carve')}
canvas.addEventListener('pointerdown',e=>{
  if(!running||paused||crashing||gameOver)return;
  const r=canvas.getBoundingClientRect();
  input.pointerId=e.pointerId;input.startX=e.clientX-r.left;
  input.analog=input.startX<r.width/2?-1:1;
  canvas.setPointerCapture?.(e.pointerId);
  e.preventDefault();
});
canvas.addEventListener('pointermove',e=>{
  if(input.pointerId!==e.pointerId)return;
  const r=canvas.getBoundingClientRect();
  const x=e.clientX-r.left,delta=x-input.startX;
  input.analog=Math.abs(delta)>12?clamp(delta/(r.width*.2),-1,1):(x<r.width/2?-1:1);
  e.preventDefault();
});
function clearPointer(e){
  if(input.pointerId===null||!e||input.pointerId===e.pointerId){input.pointerId=null;input.analog=0}
}
canvas.addEventListener('pointerup',clearPointer);
canvas.addEventListener('pointercancel',clearPointer);
canvas.addEventListener('lostpointercapture',clearPointer);
canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('dblclick',e=>e.preventDefault());

addEventListener('keydown',e=>{
  if(e.key==='ArrowLeft'||e.key==='a'||e.key==='A'){setDigital('left',true);e.preventDefault()}
  if(e.key==='ArrowRight'||e.key==='d'||e.key==='D'){setDigital('right',true);e.preventDefault()}
  if((e.key==='Escape'||e.key==='p'||e.key==='P')&&running){paused?resume():openPause();e.preventDefault()}
});
addEventListener('keyup',e=>{
  if(e.key==='ArrowLeft'||e.key==='a'||e.key==='A')input.left=false;
  if(e.key==='ArrowRight'||e.key==='d'||e.key==='D')input.right=false;
});

function openPause(){
  if(!running||gameOver||crashing)return;
  paused=true;input.left=input.right=false;input.analog=0;input.pointerId=null;
  pauseSheet.classList.add('open');pauseSheet.setAttribute('aria-hidden','false');
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
  try{audioCtx=audioCtx||new(window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==='suspended')audioCtx.resume();return audioCtx}catch(_){return null}
}
function tone(type){
  const a=getAudio();if(!a)return;
  if(type==='carve'&&Math.random()>.28)return;
  const o=a.createOscillator(),g=a.createGain();
  o.type=type==='crash'?'square':'sine';
  const freq=type==='gate'?650:type==='near'?510:type==='miss'?170:type==='crash'?100:type==='start'?340:145;
  o.frequency.setValueAtTime(freq,a.currentTime);o.frequency.exponentialRampToValueAtTime(type==='crash'?50:freq*1.16,a.currentTime+.07);
  g.gain.setValueAtTime(.0001,a.currentTime);g.gain.exponentialRampToValueAtTime(type==='crash'?.085:.02,a.currentTime+.006);g.gain.exponentialRampToValueAtTime(.0001,a.currentTime+(type==='crash'?.15:.05));
  o.connect(g);g.connect(a.destination);o.start();o.stop(a.currentTime+.17);
}
function vibrate(pattern){if(navigator.vibrate)navigator.vibrate(pattern)}

document.addEventListener('visibilitychange',()=>{if(document.hidden&&running&&!paused&&!gameOver&&!crashing)openPause()});
addEventListener('pagehide',()=>{input.left=input.right=false;input.analog=0;input.pointerId=null});
})();
