(() => {
'use strict';
const $=id=>document.getElementById(id);
const $$=sel=>[...document.querySelectorAll(sel)];
const ROSTER_KEY='gamebox.players.v1';
const LOCAL_PICK_KEY='gamebox.discrally.players.v1';
const COLORS=['#f7bd18','#0a65c7','#d94f5c','#24a47f'];
const TRACKS=[
  {id:'harbour',name:'Harbour Loop',desc:'Fast flowing corners',icon:'M12 52 C12 18 84 18 84 48 C84 75 52 82 32 68 C17 58 18 42 34 37',inner:{x:250,y:160,w:500,h:280,r:120},bumpers:[],boosts:[{x:665,y:488,w:120,h:34,a:0}],slow:[]},
  {id:'bumper',name:'Bumper Beware',desc:'Rebound posts guard the line',icon:'M14 64 L14 24 L52 24 L52 44 L82 44 L82 72 L45 72 L45 55 L27 55',inner:{x:250,y:160,w:500,h:280,r:120},bumpers:[{x:820,y:180,r:26},{x:180,y:420,r:26}],boosts:[{x:440,y:72,w:120,h:34,a:0}],slow:[]},
  {id:'goldrush',name:'Gold Rush',desc:'Boost pads and a slow patch',icon:'M12 60 C20 20 48 18 60 38 C72 58 80 28 88 20 M22 70 L78 70',inner:{x:270,y:170,w:460,h:260,r:105},bumpers:[{x:835,y:390,r:22}],boosts:[{x:640,y:486,w:130,h:34,a:0},{x:205,y:72,w:110,h:34,a:0}],slow:[{x:75,y:225,w:120,h:150}]},
  {id:'switchback',name:'Switchback',desc:'Slalom through alternating posts',icon:'M15 25 L70 25 L70 45 L30 45 L30 68 L85 68',inner:{x:235,y:145,w:530,h:310,r:95},bumpers:[{x:790,y:205,r:23},{x:680,y:92,r:22},{x:315,y:92,r:22},{x:205,y:395,r:23}],boosts:[{x:635,y:490,w:105,h:32,a:0}],slow:[]},
  {id:'roundabout',name:'Roundabout',desc:'Busy centre-line obstacles',icon:'M18 50 C18 20 82 20 82 50 C82 80 18 80 18 50 M40 50 C40 38 60 38 60 50 C60 62 40 62 40 50',inner:{x:285,y:175,w:430,h:250,r:125},bumpers:[{x:810,y:300,r:25},{x:500,y:85,r:24},{x:190,y:300,r:25},{x:500,y:515,r:24}],boosts:[],slow:[{x:445,y:55,w:110,h:70}]},
  {id:'lightning',name:'Force Lightning',desc:'Long boosts reward commitment',icon:'M14 62 L35 23 L35 47 L60 47 L45 76 L86 28',inner:{x:245,y:155,w:510,h:290,r:135},bumpers:[{x:850,y:300,r:20}],boosts:[{x:620,y:485,w:150,h:34,a:0},{x:430,y:62,w:140,h:34,a:0},{x:92,y:245,w:34,h:115,a:0}],slow:[]}
];
const TRACK_OUTER={x:35,y:35,w:930,h:530,r:155};
const DISC_R=22,MAX_DRAG_SCREEN=190,MAX_SPEED=24,FRICTION=.982,BOUNCE=.72,STEPS_MAX=900;
const VIEW={w:720,h:1280,horizon:250,focal:820,cameraHeight:205,setback:200};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`;
const read=(k,f=[])=>{try{const v=JSON.parse(localStorage.getItem(k));return v??f}catch{return f}};
const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const roster=()=>{
  const saved=read(ROSTER_KEY,[]);
  const defaults=[{id:'default-chip',name:'Chip'},{id:'default-jess',name:'Jess'}];
  const clean=(Array.isArray(saved)?saved:[]).filter(p=>p?.id&&String(p.name||'').trim()).map(p=>({id:String(p.id),name:String(p.name).trim()}));
  const map=new Map(defaults.map(p=>[p.id,p]));
  clean.forEach(p=>map.set(p.id,p));
  return [...map.values()];
};

let currentView='modeView';
let mode='local',role=null,session=null,localPlayerId='',selectedTrack='random',selectedLaps=2,connectedLobby=[],drag=null,animating=false,turboArmed=false,lastHosts=[];
let game=null,pendingSnapshot=null;
const canvas=$('raceCanvas'),ctx=canvas.getContext('2d');
const trackPath=new Path2D();

function showView(id){
  currentView=id;
  $$('.view').forEach(v=>v.classList.toggle('hidden',v.id!==id));
  window.scrollTo({top:0,behavior:'smooth'});
}
function selectedLocal(){
  const valid=new Set(roster().map(p=>p.id));
  return read(LOCAL_PICK_KEY,[]).filter(id=>valid.has(id)).slice(0,4);
}
function renderPlayerPicks(){
  const wrap=$('localPlayers');if(!wrap)return;wrap.innerHTML='';
  const picked=selectedLocal(),map=new Map(roster().map(p=>[p.id,p]));
  for(let i=0;i<4;i++){
    const person=map.get(picked[i]),slot=document.createElement('div');
    slot.className='playerSlot '+(person?'filled':'empty');
    slot.innerHTML=person
      ? `<span class="playerDisc" style="background:${COLORS[i%COLORS.length]}"></span><strong>${esc(person.name)}</strong>`
      : '<span class="playerDisc"></span><strong>EMPTY</strong>';
    wrap.appendChild(slot);
  }
  const picker=$('passRosterOptions');
  if(picker){
    picker.innerHTML=roster().map(p=>`<button type="button" data-pass-player="${esc(p.id)}" class="${picked.includes(p.id)?'selected':''}">${esc(p.name)}</button>`).join('');
  }
}
function syncPlayerSelects(){
  ['hostPlayer','joinPlayer'].forEach(id=>{
    const el=$(id),prev=el.value;el.innerHTML=roster().map(p=>`<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('');
    if(roster().some(p=>p.id===prev))el.value=prev;
  });
}
function renderTracks(containerId){
  const wrap=$(containerId);if(!wrap)return;wrap.innerHTML='';
  if(containerId==='trackGrid'){
    const random=document.createElement('button');
    random.type='button';random.className='trackCard random'+(selectedTrack==='random'?' selected':'');
    random.innerHTML='<span class="trackCardArt">?</span><strong>Random Track</strong>';
    random.onclick=()=>selectTrack('random',true);wrap.appendChild(random);
    TRACKS.forEach(t=>{
      const b=document.createElement('button');b.type='button';b.className='trackCard'+(t.id===selectedTrack?' selected':'');
      b.innerHTML=`<span class="trackCardArt"><svg viewBox="0 0 100 100" aria-hidden="true"><path d="${t.icon}"></path></svg></span><strong>${esc(t.name)}</strong>`;
      b.onclick=()=>selectTrack(t.id,true);wrap.appendChild(b);
    });
    return;
  }
  TRACKS.forEach(t=>{
    const b=document.createElement('button');b.type='button';b.className='trackChoice'+(t.id===selectedTrack?' selected':'');
    b.innerHTML=`<strong>${esc(t.name)}</strong><small>${esc(t.desc)}</small>`;
    b.onclick=()=>selectTrack(t.id,false);wrap.appendChild(b);
  });
}
function selectTrack(id,returnToSetup=false){
  selectedTrack=id;
  renderTracks('trackGrid');renderTracks('hostTracks');renderTrackSummary();
  if(role==='host')updateHostAdvert();
  if(returnToSetup)showView('localSetup');
}
function renderTrackSummary(){
  const t=TRACKS.find(x=>x.id===selectedTrack);
  if($('selectedTrackName'))$('selectedTrackName').textContent=t?t.name:'Random Track';
  if($('selectedTrackIcon'))$('selectedTrackIcon').innerHTML=t?`<svg viewBox="0 0 100 100"><path d="${t.icon}"></path></svg>`:'?';
}
function track(){return TRACKS.find(t=>t.id===(game?.trackId||selectedTrack))||TRACKS[0]}

function buildRace(players,laps=2){
  const starts=[{x:390,y:500},{x:340,y:500},{x:290,y:500},{x:240,y:500}];
  const raceTrack=selectedTrack==='random'?TRACKS[Math.floor(Math.random()*TRACKS.length)].id:selectedTrack;
  return {
    id:uid(),trackId:raceTrack,laps:Number(laps)||2,current:0,turn:1,winner:null,phase:'aim',
    players:players.map((p,i)=>({id:String(p.id),name:String(p.name).slice(0,24),color:COLORS[i%COLORS.length],x:starts[i].x,y:starts[i].y,vx:0,vy:0,lap:0,nextCheckpoint:1,turbo:1,finished:false}))
  };
}
function snapshot(){
  return game?JSON.parse(JSON.stringify(game)):null;
}
function applySnapshot(s){
  if(!s)return;
  game=s;selectedTrack=s.trackId||selectedTrack;selectedLaps=s.laps||2;turboArmed=false;animating=false;renderRace();showView('raceView');
}
function activePlayer(){return game?.players?.[game.current]||null}
function localCanShoot(){
  const p=activePlayer();
  if(!p||animating||game?.winner||game?.phase!=='aim')return false;
  return mode==='local'||localPlayerId===p.id;
}
function localCanFinish(){
  const p=activePlayer();
  if(!p||animating||game?.winner||game?.phase!=='settled')return false;
  return mode==='local'||localPlayerId===p.id;
}
function nextTurn(){
  if(!game||game.winner)return;
  let n=game.current;
  for(let i=0;i<game.players.length;i++){n=(n+1)%game.players.length;if(!game.players[n].finished){game.current=n;break}}
  game.turn++;
}

function roundedRectPath(p,x,y,w,h,r){
  const rr=Math.min(r,w/2,h/2);
  p.moveTo(x+rr,y);p.lineTo(x+w-rr,y);p.quadraticCurveTo(x+w,y,x+w,y+rr);p.lineTo(x+w,y+h-rr);p.quadraticCurveTo(x+w,y+h,x+w-rr,y+h);p.lineTo(x+rr,y+h);p.quadraticCurveTo(x,y+h,x,y+h-rr);p.lineTo(x,y+rr);p.quadraticCurveTo(x,y,x+rr,y);p.closePath();
}
function makeTrackPath(){
  const p=new Path2D();roundedRectPath(p,TRACK_OUTER.x,TRACK_OUTER.y,TRACK_OUTER.w,TRACK_OUTER.h,TRACK_OUTER.r);
  const inn=track().inner;roundedRectPath(p,inn.x,inn.y,inn.w,inn.h,inn.r);return p;
}
function roadContains(x,y){return ctx.isPointInPath(makeTrackPath(),x,y,'evenodd')}
function hitRect(p,r){return p.x>r.x&&p.x<r.x+r.w&&p.y>r.y&&p.y<r.y+r.h}

function cameraForView(){
  const p=activePlayer()||{x:390,y:500};
  // Track tangent: bottom -> right -> top -> left -> bottom.
  // Using an ellipse tangent makes the camera rotate progressively through corners
  // instead of snapping between four compass directions.
  const dx=p.x-500,dy=p.y-300,rx=420,ry=220;
  let hx=dy/(ry*ry),hy=-dx/(rx*rx);
  const m=Math.hypot(hx,hy)||1;hx/=m;hy/=m;
  return{x:p.x,y:p.y,hx,hy,rx:-hy,ry:hx};
}
function projectPoint(x,y,camera=cameraForView()){
  const dx=x-camera.x,dy=y-camera.y;
  const forward=dx*camera.hx+dy*camera.hy;
  const lateral=dx*camera.rx+dy*camera.ry;
  const depth=forward+VIEW.setback;
  if(depth<18)return null;
  const scale=VIEW.focal/depth;
  return{x:VIEW.w/2+lateral*scale,y:VIEW.horizon+(VIEW.cameraHeight*VIEW.focal)/depth,scale,depth,forward,lateral};
}
function roundedRectPoints(rect,edgeSteps=8,cornerSteps=10){
  const x=rect.x,y=rect.y,w=rect.w,h=rect.h,r=Math.min(rect.r,w/2,h/2),pts=[];
  const line=(ax,ay,bx,by,steps)=>{for(let i=0;i<steps;i++){const t=i/steps;pts.push({x:ax+(bx-ax)*t,y:ay+(by-ay)*t})}};
  const arc=(cx,cy,a0,a1,steps)=>{for(let i=0;i<steps;i++){const a=a0+(a1-a0)*(i/steps);pts.push({x:cx+Math.cos(a)*r,y:cy+Math.sin(a)*r})}};
  line(x+r,y,x+w-r,y,edgeSteps);arc(x+w-r,y+r,-Math.PI/2,0,cornerSteps);
  line(x+w,y+r,x+w,y+h-r,edgeSteps);arc(x+w-r,y+h-r,0,Math.PI/2,cornerSteps);
  line(x+w-r,y+h,x+r,y+h,edgeSteps);arc(x+r,y+h-r,Math.PI/2,Math.PI,cornerSteps);
  line(x,y+h-r,x,y+r,edgeSteps);arc(x+r,y+r,Math.PI,Math.PI*1.5,cornerSteps);
  return pts;
}
function drawProjectedQuad(points,fill,stroke=null,width=1){
  const ps=points.map(p=>projectPoint(p.x,p.y));
  if(ps.some(p=>!p))return false;
  ctx.beginPath();ctx.moveTo(ps[0].x,ps[0].y);for(let i=1;i<ps.length;i++)ctx.lineTo(ps[i].x,ps[i].y);ctx.closePath();
  if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke()}return true;
}
function drawPerspectiveRoad(){
  const t=track(),cam=cameraForView(),outer=roundedRectPoints(TRACK_OUTER),inner=roundedRectPoints(t.inner);
  ctx.clearRect(0,0,canvas.width,canvas.height);

  const sky=ctx.createLinearGradient(0,0,0,VIEW.horizon+170);
  sky.addColorStop(0,'#b8daf2');sky.addColorStop(.72,'#eaf6fb');sky.addColorStop(1,'#f7fbf6');
  ctx.fillStyle=sky;ctx.fillRect(0,0,VIEW.w,VIEW.horizon+190);
  const ground=ctx.createLinearGradient(0,VIEW.horizon,0,VIEW.h);
  ground.addColorStop(0,'#a9d1b9');ground.addColorStop(1,'#72a487');
  ctx.fillStyle=ground;ctx.fillRect(0,VIEW.horizon,VIEW.w,VIEW.h-VIEW.horizon);

  // Road is rendered as paired outer/inner perimeter strips in perspective.
  for(let i=0;i<outer.length;i++){
    const j=(i+1)%outer.length;
    const a=projectPoint(outer[i].x,outer[i].y,cam),b=projectPoint(outer[j].x,outer[j].y,cam),
          d=projectPoint(inner[i].x,inner[i].y,cam),e=projectPoint(inner[j].x,inner[j].y,cam);
    if(!a||!b||!d||!e)continue;
    if(Math.max(a.forward,b.forward,d.forward,e.forward)<-90)continue;
    ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineTo(e.x,e.y);ctx.lineTo(d.x,d.y);ctx.closePath();
    ctx.fillStyle='#526b68';ctx.fill();
  }

  // Bright kerbs make the track edges readable from the low camera.
  const drawEdge=pts=>{
    ctx.strokeStyle='#f4fbf8';ctx.lineWidth=4;ctx.setLineDash([]);
    for(let i=0;i<pts.length;i++){
      const a=projectPoint(pts[i].x,pts[i].y,cam),b=projectPoint(pts[(i+1)%pts.length].x,pts[(i+1)%pts.length].y,cam);
      if(!a||!b||Math.max(a.forward,b.forward)<-80)continue;
      ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
    }
  };
  drawEdge(outer);drawEdge(inner);

  // Dashed centre line.
  ctx.strokeStyle='rgba(255,255,255,.48)';ctx.lineWidth=3;
  for(let i=0;i<outer.length;i+=2){
    const j=(i+1)%outer.length;
    const ca={x:(outer[i].x+inner[i].x)/2,y:(outer[i].y+inner[i].y)/2};
    const cb={x:(outer[j].x+inner[j].x)/2,y:(outer[j].y+inner[j].y)/2};
    const a=projectPoint(ca.x,ca.y,cam),b=projectPoint(cb.x,cb.y,cam);
    if(!a||!b||Math.max(a.forward,b.forward)<0)continue;
    ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
  }

  // Start / finish stripe on the bottom straight.
  const stripe={x:465,y:476,w:80,h:50};
  for(let i=0;i<8;i++){
    drawProjectedQuad([
      {x:stripe.x+i*10,y:stripe.y},{x:stripe.x+(i+1)*10,y:stripe.y},
      {x:stripe.x+(i+1)*10,y:stripe.y+stripe.h},{x:stripe.x+i*10,y:stripe.y+stripe.h}
    ],i%2?'#ffffff':'#082f68');
  }

  t.boosts.forEach(b=>{
    if(drawProjectedQuad([{x:b.x,y:b.y},{x:b.x+b.w,y:b.y},{x:b.x+b.w,y:b.y+b.h},{x:b.x,y:b.y+b.h}],'#f7bd18','#9b7100',2)){
      const p=projectPoint(b.x+b.w/2,b.y+b.h/2,cam);
      if(p&&p.forward>15){ctx.fillStyle='#082f68';ctx.font=`${Math.max(10,Math.min(20,15*p.scale))}px Fredoka`;ctx.textAlign='center';ctx.fillText('BOOST',p.x,p.y)}
    }
  });
  t.slow.forEach(s=>drawProjectedQuad([{x:s.x,y:s.y},{x:s.x+s.w,y:s.y},{x:s.x+s.w,y:s.y+s.h},{x:s.x,y:s.y+s.h}],'rgba(45,118,169,.48)'));

  // Bumpers are vertical posts in the world rather than top-down circles.
  [...t.bumpers].sort((a,b)=>{
    const pa=projectPoint(a.x,a.y,cam),pb=projectPoint(b.x,b.y,cam);return (pb?.depth||0)-(pa?.depth||0);
  }).forEach(b=>{
    const p=projectPoint(b.x,b.y,cam);if(!p||p.forward<-40)return;
    const r=Math.max(4,b.r*p.scale),height=Math.max(9,r*2.2);
    ctx.fillStyle='rgba(0,0,0,.18)';ctx.beginPath();ctx.ellipse(p.x,p.y+3,r*.95,r*.28,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#082f68';ctx.fillRect(p.x-r*.75,p.y-height,r*1.5,height);
    ctx.beginPath();ctx.ellipse(p.x,p.y-height,r*.75,r*.3,0,0,Math.PI*2);ctx.fillStyle='#f7bd18';ctx.fill();
    ctx.lineWidth=Math.max(2,3*p.scale);ctx.strokeStyle='#fff';ctx.stroke();
  });
}
function drawTrack(){drawPerspectiveRoad()}

function drawDiscs(){
  if(!game)return;
  const cam=cameraForView();
  const visible=game.players.map((p,i)=>({p,i,sp:projectPoint(p.x,p.y,cam)})).filter(x=>x.sp&&x.sp.forward>-80).sort((a,b)=>b.sp.depth-a.sp.depth);
  visible.forEach(({p,i,sp})=>{
    const r=Math.max(7,DISC_R*sp.scale),active=i===game.current&&!game.winner;
    ctx.save();ctx.translate(sp.x,sp.y);
    ctx.fillStyle='rgba(0,0,0,.22)';ctx.beginPath();ctx.ellipse(0,5,r*1.05,r*.32,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=p.color;ctx.beginPath();ctx.ellipse(0,-2,r,r*.42,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='rgba(0,0,0,.18)';ctx.fillRect(-r,-2,r*2,Math.max(3,r*.23));
    ctx.beginPath();ctx.ellipse(0,-4-r*.10,r,r*.42,0,0,Math.PI*2);ctx.fillStyle=p.color;ctx.fill();
    ctx.lineWidth=active?5:2;ctx.strokeStyle=active?'#fff':'rgba(8,47,104,.7)';ctx.stroke();
    ctx.beginPath();ctx.ellipse(-r*.28,-r*.18,r*.2,r*.08,0,0,Math.PI*2);ctx.fillStyle='rgba(255,255,255,.6)';ctx.fill();
    if(r>15){ctx.fillStyle='#082f68';ctx.font=`800 ${Math.max(10,r*.55)}px Fredoka`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(i+1),0,-r*.13)}
    ctx.restore();
  });
}
function drawAim(){
  if(!drag||!activePlayer())return;
  const sp=projectPoint(activePlayer().x,activePlayer().y);
  if(!sp)return;
  const dx=drag.x-sp.x,dy=drag.y-sp.y,d=Math.hypot(dx,dy)||1,cap=Math.min(MAX_DRAG_SCREEN,d),ux=dx/d,uy=dy/d;
  ctx.save();ctx.lineCap='round';
  ctx.strokeStyle='rgba(255,255,255,.95)';ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(sp.x,sp.y);ctx.lineTo(sp.x+ux*cap,sp.y+uy*cap);ctx.stroke();
  ctx.strokeStyle='#082f68';ctx.lineWidth=3;ctx.stroke();
  ctx.fillStyle='#f7bd18';ctx.beginPath();ctx.arc(sp.x+ux*cap,sp.y+uy*cap,9,0,Math.PI*2);ctx.fill();ctx.restore();
}
function draw(){drawTrack();drawDiscs();drawAim()}
function pointerPoint(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*1000/r.width,y:(e.clientY-r.top)*600/r.height}}
function onPointerDown(e){
  if(!localCanShoot())return;
  const q=pointerPoint(e),p=activePlayer(),sp=projectPoint(p.x,p.y);if(!sp||Math.hypot(q.x-sp.x,q.y-sp.y)>90)return;
  canvas.setPointerCapture?.(e.pointerId);drag=q;turboArmed=turboArmed&&p.turbo>0;draw();e.preventDefault();
}
function onPointerMove(e){
  if(!drag)return;drag=pointerPoint(e);const p=activePlayer(),sp=projectPoint(p.x,p.y);if(!sp)return;
  const power=clamp(Math.hypot(drag.x-sp.x,drag.y-sp.y)/MAX_DRAG_SCREEN,0,1);$('powerFill').style.width=`${Math.round(power*100)}%`;draw();e.preventDefault();
}
function onPointerUp(e){
  if(!drag||!localCanShoot())return;
  const q=pointerPoint(e),p=activePlayer(),sp=projectPoint(p.x,p.y),cam=cameraForView();
  if(!sp){drag=null;return}
  const sx=q.x-sp.x,sy=q.y-sp.y,d=Math.hypot(sx,sy);drag=null;$('powerFill').style.width='0%';draw();
  if(d<20)return;
  const power=clamp(d/MAX_DRAG_SCREEN,.12,1),speed=(5+power*MAX_SPEED)*(turboArmed?1.35:1);
  // Up-screen is forward along the track. Horizontal drag steers left/right.
  const forward=-sy,lateral=sx*.9,dm=Math.hypot(forward,lateral)||1;
  const ux=(cam.hx*forward+cam.rx*lateral)/dm,uy=(cam.hy*forward+cam.ry*lateral)/dm;
  const vx=ux*speed,vy=uy*speed,useTurbo=turboArmed;
  turboArmed=false;renderRace();
  if(mode==='multi'&&role==='client')session?.sendToHost({type:'flick',playerId:p.id,vx,vy,useTurbo});
  else startAuthoritativeFlick(p.id,vx,vy,useTurbo);
  e.preventDefault();
}

function processCheckpoints(){
  if(!game)return;
  game.players.forEach(p=>{
    if(p.finished)return;
    let zone=0;
    if(p.x>835&&p.y>215&&p.y<385)zone=1;
    else if(p.y<125&&p.x>420&&p.x<580)zone=2;
    else if(p.x<165&&p.y>215&&p.y<385)zone=3;
    else if(p.y>470&&p.x>430&&p.x<590)zone=4;
    if(p.nextCheckpoint===1&&zone===1)p.nextCheckpoint=2;
    else if(p.nextCheckpoint===2&&zone===2)p.nextCheckpoint=3;
    else if(p.nextCheckpoint===3&&zone===3)p.nextCheckpoint=4;
    else if(p.nextCheckpoint===4&&zone===4){
      p.lap++;p.nextCheckpoint=1;p.turbo=1;
      if(p.lap>=game.laps){p.finished=true;if(!game.winner)game.winner={id:p.id,name:p.name,turn:game.turn}}
    }
  });
}

function roundedRectSdf(x,y,r){
  const cx=r.x+r.w/2,cy=r.y+r.h/2;
  const bx=r.w/2-r.r,by=r.h/2-r.r;
  const qx=Math.abs(x-cx)-bx,qy=Math.abs(y-cy)-by;
  const ox=Math.max(qx,0),oy=Math.max(qy,0);
  return Math.hypot(ox,oy)+Math.min(Math.max(qx,qy),0)-r.r;
}
function roadClearContains(x,y){
  const outer=roundedRectSdf(x,y,TRACK_OUTER);
  const inner=roundedRectSdf(x,y,track().inner);
  return outer<=-DISC_R&&inner>=DISC_R;
}
function sdfNormal(x,y,rect){
  const e=1.25;
  const gx=roundedRectSdf(x+e,y,rect)-roundedRectSdf(x-e,y,rect);
  const gy=roundedRectSdf(x,y+e,rect)-roundedRectSdf(x,y-e,rect);
  const m=Math.hypot(gx,gy)||1;
  return{x:gx/m,y:gy/m};
}
function applyWalls(p){
  const sx=p.vx*.5,sy=p.vy*.5,target={x:p.x+sx,y:p.y+sy};
  if(roadClearContains(target.x,target.y)){p.x=target.x;p.y=target.y;return}

  // Find the last valid point along this movement step so the disc contacts the
  // barrier rather than teleporting back from a corner.
  let lo=0,hi=1;
  for(let i=0;i<9;i++){
    const mid=(lo+hi)/2,x=p.x+sx*mid,y=p.y+sy*mid;
    if(roadClearContains(x,y))lo=mid;else hi=mid;
  }
  p.x+=sx*lo;p.y+=sy*lo;

  const probeX=p.x+sx*Math.max(.02,hi-lo),probeY=p.y+sy*Math.max(.02,hi-lo);
  const outerViolation=roundedRectSdf(probeX,probeY,TRACK_OUTER)+DISC_R;
  const innerViolation=DISC_R-roundedRectSdf(probeX,probeY,track().inner);
  let n;
  if(innerViolation>outerViolation){
    const g=sdfNormal(p.x,p.y,track().inner);
    n={x:-g.x,y:-g.y}; // into the infield = out of the legal road
  }else{
    n=sdfNormal(p.x,p.y,TRACK_OUTER); // away from the circuit = out of the legal road
  }

  // Reflect only the velocity component travelling into the wall. Tangential
  // speed is preserved, so shallow impacts glance along the barrier naturally.
  const dot=p.vx*n.x+p.vy*n.y;
  if(dot>0){
    p.vx-=(1+BOUNCE)*dot*n.x;
    p.vy-=(1+BOUNCE)*dot*n.y;
  }

  // Tiny inward nudge prevents the following physics sub-step from detecting
  // the same contact again and producing a double-bounce.
  p.x-=n.x*1.5;p.y-=n.y*1.5;
  p.x=clamp(p.x,DISC_R,1000-DISC_R);p.y=clamp(p.y,DISC_R,600-DISC_R);
}
function applyBumpers(p){
  track().bumpers.forEach(b=>{
    const dx=p.x-b.x,dy=p.y-b.y,d=Math.hypot(dx,dy),min=DISC_R+b.r;
    if(d>0&&d<min){
      const nx=dx/d,ny=dy/d,dot=p.vx*nx+p.vy*ny;
      p.x=b.x+nx*(min+1);p.y=b.y+ny*(min+1);
      p.vx=(p.vx-2*dot*nx)*.88;p.vy=(p.vy-2*dot*ny)*.88;
    }
  });
}
function applyDiscCollisions(){
  const ps=game.players;
  for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++){
    const a=ps[i],b=ps[j],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),min=DISC_R*2;
    if(d>0&&d<min){
      const nx=dx/d,ny=dy/d,over=min-d;a.x-=nx*over/2;a.y-=ny*over/2;b.x+=nx*over/2;b.y+=ny*over/2;
      const va=a.vx*nx+a.vy*ny,vb=b.vx*nx+b.vy*ny,swap=(vb-va)*.92;
      a.vx+=swap*nx;a.vy+=swap*ny;b.vx-=swap*nx;b.vy-=swap*ny;
    }
  }
}
function applySurface(p,boosted){
  let friction=FRICTION;
  if(track().slow.some(s=>hitRect(p,s)))friction=.95;
  p.vx*=friction;p.vy*=friction;
  if(!boosted.has(p.id)){
    for(const b of track().boosts){
      if(hitRect(p,b)){p.vx*=1.28;p.vy*=1.28;boosted.add(p.id);break}
    }
  }
  if(Math.hypot(p.vx,p.vy)<.06){p.vx=0;p.vy=0}
}
async function animatePhysics(){
  animating=true;renderRace();
  const boosted=new Set();
  let steps=0;
  await new Promise(resolve=>{
    const frame=()=>{
      let moving=false;
      for(let k=0;k<2;k++){
        game.players.forEach(p=>{if(Math.hypot(p.vx,p.vy)>.001){moving=true;applyWalls(p);applyBumpers(p)}});
        applyDiscCollisions();
        game.players.forEach(p=>applySurface(p,boosted));
        processCheckpoints();steps++;
      }
      draw();renderHudOnly();
      if(moving&&steps<STEPS_MAX)requestAnimationFrame(frame);else resolve();
    };
    requestAnimationFrame(frame);
  });
  game.players.forEach(p=>{p.vx=0;p.vy=0});
  animating=false;
}
async function startAuthoritativeFlick(playerId,vx,vy,useTurbo){
  if(!game||game.winner||animating)return;
  const p=activePlayer();if(!p||p.id!==playerId)return;
  if(useTurbo&&p.turbo>0)p.turbo--;
  p.vx=clamp(vx,-36,36);p.vy=clamp(vy,-36,36);
  if(mode==='multi'&&role==='host')session?.broadcast({type:'flick-start',playerId:p.id,vx:p.vx,vy:p.vy,useTurbo});
  await animatePhysics();
  if(!game.winner)nextTurn();
  renderRace();
  if(mode==='multi'&&role==='host')broadcastState();
}
async function playRemoteFlick(msg){
  if(!game||animating)return;
  const p=game.players.find(x=>x.id===msg.playerId);if(!p)return;
  if(msg.useTurbo&&p.turbo>0)p.turbo--;
  p.vx=Number(msg.vx)||0;p.vy=Number(msg.vy)||0;
  await animatePhysics();
  if(pendingSnapshot){const finalState=pendingSnapshot;pendingSnapshot=null;applySnapshot(finalState)}
}

function renderHudOnly(){
  if(!game)return;
  const p=activePlayer(),your=localCanShoot();
  $('turnText').textContent=game.winner?`${game.winner.name} wins!`:p?`${p.name}${your?' — your shot':''}`:'—';
  $('turnHint').textContent=game.winner?'Race complete':animating?'Discs moving…':your?'Drag your disc and release':`Waiting for ${p?.name||'player'}`;
  $('turnBanner').classList.toggle('yours',your&&!game.winner);$('turnBanner').classList.toggle('finished',!!game.winner);
  $('turboState').textContent=p?.turbo>0?(turboArmed?'ARMED':'Ready'):'Used this lap';
  $('turboButton').disabled=!your||animating||!!game.winner||!(p?.turbo>0);$('turboButton').classList.toggle('active',turboArmed);
  $('scoreboard').innerHTML=game.players.map((x,i)=>`<div class="scoreRow${i===game.current&&!game.winner?' active':''}"><div class="scoreIdentity"><span class="scoreDot" style="background:${x.color}"></span><strong>${esc(x.name)}</strong></div><small>${x.finished?'FINISHED':`Lap ${Math.min(x.lap+1,game.laps)} / ${game.laps}`} · Turbo ${x.turbo?'⚡':'—'}</small></div>`).join('');
}
function renderRace(){
  if(!game)return;
  $('trackName').textContent=(TRACKS.find(t=>t.id===game.trackId)||TRACKS[0]).name;
  $('raceNetwork').classList.toggle('hidden',mode!=='multi');
  renderHudOnly();draw();
  if(game.winner){
    $('finishOverlay').classList.remove('hidden');
    $('finishOverlay').innerHTML=`<div class="finishCard"><span>RACE WINNER</span><strong>${esc(game.winner.name)}</strong><small>Finished ${game.laps} lap${game.laps===1?'':'s'} on turn ${game.winner.turn}.</small><button id="finishExit" type="button">Back to GameBox</button></div>`;
    $('finishExit').onclick=leaveRace;
  }else $('finishOverlay').classList.add('hidden');
}

function broadcastState(){if(role==='host'&&session&&game)session.broadcast({type:'state',state:snapshot()})}
function lobbyPlayers(){
  if(role!=='host')return connectedLobby;
  const hp=roster().find(p=>p.id===$('hostPlayer').value),list=[];
  if(hp)list.push({id:hp.id,name:hp.name,host:true});
  session?.peers().forEach(peer=>{if(peer.meta?.player)list.push({...peer.meta.player,host:false})});
  return list.slice(0,4);
}
function renderLobby(target,players){
  const wrap=$(target);if(!wrap)return;
  wrap.innerHTML=players.length?players.map((p,i)=>`<div class="lobbyPlayer"><strong>${i+1}. ${esc(p.name)}${p.host?' · Host':''}</strong><small>Ready</small></div>`).join(''):'<div class="empty">Waiting for players…</div>';
}
function updateHostAdvert(){
  if(role!=='host'||!session?.updateHost)return;
  const p=roster().find(x=>x.id===$('hostPlayer').value),t=track();
  session.updateHost({hostName:`${p?.name||'Host'}'s Disc Rally`,player:p,started:false,raceMode:'disc-rally',trackName:t.name,totalRaces:Number($('hostLaps').value)||2});
}
function installSession(kind){
  resetSession();
  if(!window.GameBoxLAN?.DiscoverySession)throw new Error('Multiplayer discovery is unavailable.');
  role=kind;
  session=new window.GameBoxLAN.DiscoverySession({
    game:'disc-rally-v1',
    onStatus:text=>{if(role==='host')$('hostStatus').textContent=text;if(role==='client')$('joinStatus').textContent=text},
    onHostsChanged:hosts=>{lastHosts=hosts;renderHosts(hosts)},
    onPeersChanged:()=>{
      if(role==='host'){renderLobby('hostLobby',lobbyPlayers());$('startHost').disabled=lobbyPlayers().length<2;updateHostAdvert();broadcastLobby()}
    },
    onMessage:networkMessage
  });
}
function resetSession(){try{session?.close()}catch{}session=null;connectedLobby=[];lastHosts=[]}
async function startHostDiscovery(){
  try{
    installSession('host');localPlayerId=$('hostPlayer').value;
    const p=roster().find(x=>x.id===localPlayerId);selectedLaps=Number($('hostLaps').value)||2;
    $('hostStatus').textContent='Starting…';
    await session.startHost({hostName:`${p?.name||'Host'}'s Disc Rally`,player:p,raceMode:'disc-rally',trackName:track().name,totalRaces:selectedLaps});
    renderLobby('hostLobby',lobbyPlayers());$('startHost').disabled=lobbyPlayers().length<2;
  }catch(err){console.error(err);$('hostStatus').textContent='Discovery error — tap Restart discovery';}
}
async function startScan(){
  try{
    installSession('client');localPlayerId=$('joinPlayer').value;$('joinStatus').textContent='Scanning';renderHosts([]);
    await session.startScanner();
  }catch(err){console.error(err);$('joinStatus').textContent='Discovery error';}
}
function renderHosts(hosts=[]){
  if(role!=='client')return;
  const wrap=$('availableHosts');if(session?.peers?.().length){wrap.innerHTML='<div class="scanning"><strong>Connected ✓</strong></div>';$('joinStatus').textContent='Connected';return}
  const open=hosts.filter(h=>!h.started&&(h.raceMode||'')==='disc-rally'&&Number(h.playerCount||1)<Number(h.maxPlayers||4));
  if(!open.length){wrap.innerHTML='<div class="scanning"><span class="scanPulse"></span><strong>Scanning for Disc Rally hosts…</strong></div>';$('joinStatus').textContent='Scanning';return}
  $('joinStatus').textContent=`${open.length} found`;
  wrap.innerHTML=open.map(h=>`<button class="hostCard" type="button" data-host="${esc(h.peerId)}"><div><strong>${esc(h.hostName||"Disc Rally")}</strong><small>${esc(h.trackName||'Track')} · ${Number(h.totalRaces)||2} laps · ${Number(h.playerCount)||1}/4 players</small></div><span>JOIN</span></button>`).join('');
}
async function joinHost(peerId){
  const p=roster().find(x=>x.id===$('joinPlayer').value);if(!p)return;
  localPlayerId=p.id;$('joinStatus').textContent='Joining…';
  try{await session.joinHost(peerId,{player:p});session.sendToHost({type:'hello',player:p});$('joinStatus').textContent='Connected';renderHosts([])}
  catch(err){console.error(err);$('joinStatus').textContent=err?.message||'Join failed';}
}
function broadcastLobby(){if(role==='host')session?.broadcast({type:'lobby',players:lobbyPlayers(),trackId:selectedTrack,laps:Number($('hostLaps').value)||2})}
function networkMessage(msg,source){
  if(role==='host'){
    if(msg.type==='hello'&&source.peer){source.peer.meta.player={id:String(msg.player?.id||uid()),name:String(msg.player?.name||'Friend').slice(0,24)};renderLobby('hostLobby',lobbyPlayers());$('startHost').disabled=lobbyPlayers().length<2;broadcastLobby();return}
    if(msg.type==='flick'){const p=activePlayer();if(p&&source.peer?.meta?.player?.id===p.id&&msg.playerId===p.id)startAuthoritativeFlick(p.id,Number(msg.vx)||0,Number(msg.vy)||0,!!msg.useTurbo);return}
  }else{
    if(msg.type==='lobby'){connectedLobby=Array.isArray(msg.players)?msg.players:[];selectedTrack=msg.trackId||selectedTrack;selectedLaps=Number(msg.laps)||2;renderLobby('joinLobby',connectedLobby);return}
    if(msg.type==='start'&&msg.state){mode='multi';applySnapshot(msg.state);return}
    if(msg.type==='flick-start'){playRemoteFlick(msg);return}
    if(msg.type==='state'){if(animating)pendingSnapshot=msg.state;else applySnapshot(msg.state);return}
  }
}
function startHostRace(){
  const players=lobbyPlayers();if(players.length<2)return;
  mode='multi';role='host';localPlayerId=$('hostPlayer').value;selectedLaps=Number($('hostLaps').value)||2;
  game=buildRace(players,selectedLaps);session?.updateHost?.({started:true});session?.broadcast({type:'start',state:snapshot()});renderRace();showView('raceView');
}
function startLocalRace(){
  const ids=selectedLocal();if(ids.length<2){$('localStatus').textContent='Choose at least 2 players.';return}
  const map=new Map(roster().map(p=>[p.id,p]));const players=ids.map(id=>map.get(id)).filter(Boolean);
  selectedLaps=Number($('localLaps').value)||2;mode='local';role=null;localPlayerId='';game=buildRace(players,selectedLaps);renderRace();showView('raceView');
}
function leaveRace(){
  resetSession();game=null;drag=null;animating=false;turboArmed=false;mode='local';role=null;showView('modeView');
}
function bind(){
  renderPlayerPicks();syncPlayerSelects();renderTracks('localTracks');renderTracks('hostTracks');
  $('localMode').onclick=()=>showView('localSetup');$('multiMode').onclick=()=>showView('multiSetup');
  $$('[data-back]').forEach(b=>b.onclick=()=>{if(currentView==='hostSetup'||currentView==='joinSetup')resetSession();showView(b.dataset.back)});
  $('startLocal').onclick=startLocalRace;
  $('hostMode').onclick=()=>{showView('hostSetup');syncPlayerSelects();renderTracks('hostTracks');startHostDiscovery()};
  $('joinMode').onclick=()=>{showView('joinSetup');syncPlayerSelects();startScan()};
  $('restartHostDiscovery').onclick=startHostDiscovery;$('restartScan').onclick=startScan;
  $('hostPlayer').onchange=()=>{localPlayerId=$('hostPlayer').value;updateHostAdvert();renderLobby('hostLobby',lobbyPlayers());broadcastLobby()};
  $('hostLaps').onchange=()=>{selectedLaps=Number($('hostLaps').value)||2;updateHostAdvert();broadcastLobby()};
  $('joinPlayer').onchange=()=>{localPlayerId=$('joinPlayer').value;const p=roster().find(x=>x.id===localPlayerId);if(role==='client'&&session?.peers?.().length&&p)session.sendToHost({type:'hello',player:p})};
  $('startHost').onclick=startHostRace;$('exitRace').onclick=leaveRace;
  $('turboButton').onclick=()=>{if(localCanShoot()&&activePlayer()?.turbo>0){turboArmed=!turboArmed;renderRace()}};
  canvas.addEventListener('pointerdown',onPointerDown);canvas.addEventListener('pointermove',onPointerMove);canvas.addEventListener('pointerup',onPointerUp);canvas.addEventListener('pointercancel',()=>{drag=null;$('powerFill').style.width='0%';draw()});
  document.addEventListener('click',e=>{const host=e.target.closest('[data-host]');if(host)joinHost(host.dataset.host)});
  const cleanup=()=>{try{session?.close()}catch{}};
  window.addEventListener('pagehide',e=>{if(!e.persisted)cleanup()});
  window.addEventListener('pageshow',e=>{
    if(!e.persisted||!session?.closed)return;
    if(currentView==='hostSetup')startHostDiscovery();
    if(currentView==='joinSetup')startScan();
  });
  drawTrack();
}
bind();
})();