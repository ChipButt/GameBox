(() => {
'use strict';
const $=id=>document.getElementById(id);
const $$=sel=>[...document.querySelectorAll(sel)];
const ROSTER_KEY='gamebox.players.v1';
const LOCAL_PICK_KEY='gamebox.discrally.players.v1';
const COLORS=['#f7bd18','#0a65c7','#d94f5c','#24a47f'];
const TRACKS=[
  {id:'harbour',name:'Harbour Loop',desc:'Fast flowing corners',icon:'M12 52 C12 18 84 18 84 48 C84 75 52 82 32 68 C17 58 18 42 34 37',inner:{x:250,y:160,w:500,h:280,r:120},bumpers:[],boosts:[{x:665,y:488,w:120,h:34,a:0}],slow:[]},
  {id:'bumper',name:'Bumper Beware',desc:'Rebound posts guard the line',icon:'M14 64 L14 24 L52 24 L52 44 L82 44 L82 72 L45 72 L45 55 L27 55',inner:{x:250,y:160,w:500,h:280,r:120},bumpers:[{x:812,y:190,r:15},{x:188,y:410,r:15}],boosts:[{x:440,y:72,w:120,h:34,a:0}],slow:[]},
  {id:'goldrush',name:'Gold Rush',desc:'Boost pads and a slow patch',icon:'M12 60 C20 20 48 18 60 38 C72 58 80 28 88 20 M22 70 L78 70',inner:{x:270,y:170,w:460,h:260,r:105},bumpers:[{x:830,y:390,r:14}],boosts:[{x:640,y:486,w:130,h:34,a:0},{x:205,y:72,w:110,h:34,a:0}],slow:[{x:75,y:225,w:120,h:150}]},
  {id:'switchback',name:'Switchback',desc:'Slalom through alternating posts',icon:'M15 25 L70 25 L70 45 L30 45 L30 68 L85 68',inner:{x:235,y:145,w:530,h:310,r:95},bumpers:[{x:798,y:215,r:14},{x:680,y:60,r:12},{x:315,y:120,r:12},{x:202,y:385,r:14}],boosts:[{x:635,y:490,w:105,h:32,a:0}],slow:[]},
  {id:'roundabout',name:'Roundabout',desc:'Busy centre-line obstacles',icon:'M18 50 C18 20 82 20 82 50 C82 80 18 80 18 50 M40 50 C40 38 60 38 60 50 C60 62 40 62 40 50',inner:{x:285,y:175,w:430,h:250,r:125},bumpers:[{x:805,y:300,r:15},{x:500,y:66,r:13},{x:195,y:300,r:15},{x:500,y:534,r:13}],boosts:[],slow:[{x:445,y:55,w:110,h:70}]},
  {id:'lightning',name:'Force Lightning',desc:'Long boosts reward commitment',icon:'M14 62 L35 23 L35 47 L60 47 L45 76 L86 28',inner:{x:245,y:155,w:510,h:290,r:135},bumpers:[{x:842,y:300,r:14}],boosts:[{x:620,y:485,w:150,h:34,a:0},{x:430,y:62,w:140,h:34,a:0},{x:92,y:245,w:34,h:115,a:0}],slow:[]}
];
const TRACK_OUTER={x:35,y:35,w:930,h:530,r:155};
const DISC_R=22,MAX_DRAG_SCREEN=190,MAX_SPEED=24,FRICTION=.982,STEPS_MAX=900;
const RAIL_RESTITUTION=.26,RAIL_TANGENT_DAMP=.96,SECOND_FLICK_SCALE=.72,TURN_END_DELAY=3000;
const VIEW={w:720,h:1280,horizon:250,focal:820,cameraHeight:205,setback:200};
const TURBO_CHARGE_PER_UNIT=.00135,TURBO_DRAIN_PER_STEP=.006,TURBO_ACCEL=.34,TURBO_MAX_SPEED=36;
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
let mode='local',role=null,session=null,localPlayerId='',selectedTrack='random',selectedLaps=2,connectedLobby=[],drag=null,lookDrag=null,lookYaw=0,lookPitch=0,animating=false,turboHolding=false,lastHosts=[];
let game=null,pendingSnapshot=null,turnEndTimer=null;
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
  if(containerId==='hostTracks'){
    const random=document.createElement('button');random.type='button';random.className='trackChoice'+(selectedTrack==='random'?' selected':'');
    random.innerHTML='<strong>Random Track</strong><small>Choose a track when the race begins</small>';
    random.onclick=()=>selectTrack('random',false);wrap.appendChild(random);
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
function finishLine(){
  const t=track(),innerBottom=t.inner.y+t.inner.h,outerBottom=TRACK_OUTER.y+TRACK_OUTER.h;
  return{x:500,w:28,y1:innerBottom,y2:outerBottom};
}

function buildRace(players,laps=2){
  const starts=[{x:390,y:500},{x:340,y:500},{x:290,y:500},{x:240,y:500}];
  const raceTrack=selectedTrack==='random'?TRACKS[Math.floor(Math.random()*TRACKS.length)].id:selectedTrack;
  return {
    id:uid(),trackId:raceTrack,laps:Number(laps)||2,current:0,turn:1,winner:null,phase:'aim',flicksUsed:0,turnEndsAt:0,
    players:players.map((p,i)=>({id:String(p.id),name:String(p.name).slice(0,24),color:COLORS[i%COLORS.length],x:starts[i].x,y:starts[i].y,vx:0,vy:0,lap:0,nextCheckpoint:1,turboCharge:0,turboReady:false,turboHeld:false,finished:false}))
  };
}
function snapshot(){
  return game?JSON.parse(JSON.stringify(game)):null;
}
function applySnapshot(s){
  if(!s)return;
  game=s;if(!game.phase)game.phase='aim';if(!Number.isFinite(game.flicksUsed))game.flicksUsed=0;if(!Number.isFinite(game.turnEndsAt))game.turnEndsAt=0;
  game.players=(game.players||[]).map(p=>({
    ...p,
    turboCharge:clamp(Number.isFinite(p.turboCharge)?p.turboCharge:0,0,1),
    turboReady:!!p.turboReady,
    turboHeld:false
  }));
  selectedTrack=s.trackId||selectedTrack;selectedLaps=s.laps||2;
  lookDrag=null;lookYaw=0;lookPitch=0;turboHolding=false;animating=false;
  renderRace();showView('raceView');
}
function activePlayer(){return game?.players?.[game.current]||null}
function localCanShoot(){
  const p=activePlayer();
  if(!p||game?.winner)return false;
  const owned=mode==='local'||localPlayerId===p.id;
  if(!owned)return false;
  if(game?.phase==='aim'&&!animating&&game.flicksUsed===0)return true;
  if(game?.phase==='moving'&&animating&&game.flicksUsed===1&&Math.hypot(p.vx,p.vy)>.18)return true;
  return false;
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
  game.turn++;game.flicksUsed=0;game.turnEndsAt=0;
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
  const dx=p.x-500,dy=p.y-300,rx=420,ry=220;
  let baseX=dy/(ry*ry),baseY=-dx/(rx*rx);
  const m=Math.hypot(baseX,baseY)||1;baseX/=m;baseY/=m;
  const cos=Math.cos(lookYaw),sin=Math.sin(lookYaw);
  const hx=baseX*cos-baseY*sin,hy=baseX*sin+baseY*cos;
  return{x:p.x,y:p.y,hx,hy,rx:-hy,ry:hx,horizon:VIEW.horizon+lookPitch};
}
function projectPoint(x,y,camera=cameraForView()){
  const dx=x-camera.x,dy=y-camera.y;
  const forward=dx*camera.hx+dy*camera.hy;
  const lateral=dx*camera.rx+dy*camera.ry;
  const depth=forward+VIEW.setback;
  if(depth<18)return null;
  const scale=VIEW.focal/depth;
  return{x:VIEW.w/2+lateral*scale,y:(camera.horizon??VIEW.horizon)+(VIEW.cameraHeight*VIEW.focal)/depth,scale,depth,forward,lateral};
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

  const sky=ctx.createLinearGradient(0,0,0,VIEW.horizon+240);
  sky.addColorStop(0,'#f9fbff');sky.addColorStop(.45,'#f2f1ff');sky.addColorStop(1,'#b8ddff');
  ctx.fillStyle=sky;ctx.fillRect(0,0,VIEW.w,VIEW.horizon+280);

  // Distant stylised skyline/water, deliberately soft so the track stays dominant.
  ctx.fillStyle='rgba(119,111,216,.20)';
  for(let i=0;i<10;i++){
    const w=35+(i%3)*18,h=45+(i%4)*28,x=i*82-35;
    ctx.fillRect(x,VIEW.horizon+65-h,w,h);
  }
  const world=ctx.createLinearGradient(0,VIEW.horizon,0,VIEW.h);
  world.addColorStop(0,'#55c9f5');world.addColorStop(.38,'#168ed6');world.addColorStop(1,'#0b6fb9');
  ctx.fillStyle=world;ctx.fillRect(0,VIEW.horizon,VIEW.w,VIEW.h-VIEW.horizon);

  const roadGrad=ctx.createLinearGradient(0,VIEW.horizon,0,VIEW.h);
  roadGrad.addColorStop(0,'#3ab7ff');roadGrad.addColorStop(.55,'#118fe8');roadGrad.addColorStop(1,'#0879d5');

  for(let i=0;i<outer.length;i++){
    const j=(i+1)%outer.length;
    const a=projectPoint(outer[i].x,outer[i].y,cam),b=projectPoint(outer[j].x,outer[j].y,cam),
          d=projectPoint(inner[i].x,inner[i].y,cam),e=projectPoint(inner[j].x,inner[j].y,cam);
    if(!a||!b||!d||!e)continue;
    if(Math.max(a.forward,b.forward,d.forward,e.forward)<-80)continue;
    ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineTo(e.x,e.y);ctx.lineTo(d.x,d.y);ctx.closePath();
    ctx.fillStyle=roadGrad;ctx.fill();
  }

  const drawBarrier=pts=>{
    for(let i=0;i<pts.length;i++){
      const a=projectPoint(pts[i].x,pts[i].y,cam),b=projectPoint(pts[(i+1)%pts.length].x,pts[(i+1)%pts.length].y,cam);
      if(!a||!b||Math.max(a.forward,b.forward)<-65)continue;
      ctx.lineCap='round';
      ctx.strokeStyle='#344354';ctx.lineWidth=Math.max(5,18*Math.min(1.3,(a.scale+b.scale)/2));ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
      ctx.strokeStyle='#d9e1e7';ctx.lineWidth=Math.max(4,12*Math.min(1.2,(a.scale+b.scale)/2));ctx.stroke();
      ctx.strokeStyle='#ffffff';ctx.lineWidth=Math.max(1.5,3*Math.min(1.2,(a.scale+b.scale)/2));ctx.stroke();
      if(i%4===0){
        const mx=(a.x+b.x)/2,my=(a.y+b.y)/2;
        ctx.fillStyle='#ffb914';ctx.beginPath();ctx.ellipse(mx,my,Math.max(2,5*a.scale),Math.max(1.5,2.1*a.scale),0,0,Math.PI*2);ctx.fill();
      }
    }
  };
  drawBarrier(outer);drawBarrier(inner);

  // Bright technical lane markings.
  ctx.strokeStyle='rgba(232,251,255,.92)';ctx.lineWidth=4;
  for(let i=0;i<outer.length;i+=2){
    const j=(i+1)%outer.length;
    const ca={x:(outer[i].x+inner[i].x)/2,y:(outer[i].y+inner[i].y)/2};
    const cb={x:(outer[j].x+inner[j].x)/2,y:(outer[j].y+inner[j].y)/2};
    const a=projectPoint(ca.x,ca.y,cam),b=projectPoint(cb.x,cb.y,cam);
    if(!a||!b||Math.max(a.forward,b.forward)<0)continue;
    ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
  }
  // Cross-track seams give a stronger sense of depth/speed.
  for(let i=0;i<outer.length;i+=6){
    const a=projectPoint(outer[i].x,outer[i].y,cam),b=projectPoint(inner[i].x,inner[i].y,cam);
    if(!a||!b||Math.max(a.forward,b.forward)<10)continue;
    ctx.strokeStyle='rgba(222,249,255,.65)';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
  }

  // Full-width start/finish line: a clear checker strip spanning barrier to barrier.
  const finish=finishLine(),rows=12,cols=2,rowH=(finish.y2-finish.y1)/rows,colW=finish.w/cols;
  drawProjectedQuad([
    {x:finish.x-finish.w/2-5,y:finish.y1},{x:finish.x+finish.w/2+5,y:finish.y1},
    {x:finish.x+finish.w/2+5,y:finish.y2},{x:finish.x-finish.w/2-5,y:finish.y2}
  ],'#ffffff');
  for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
    const x1=finish.x-finish.w/2+col*colW,y1=finish.y1+row*rowH;
    drawProjectedQuad([
      {x:x1,y:y1},{x:x1+colW,y:y1},
      {x:x1+colW,y:y1+rowH},{x:x1,y:y1+rowH}
    ],(row+col)%2?'#ffffff':'#092c45');
  }

  t.boosts.forEach(b=>{
    if(drawProjectedQuad([{x:b.x,y:b.y},{x:b.x+b.w,y:b.y},{x:b.x+b.w,y:b.y+b.h},{x:b.x,y:b.y+b.h}],'#ffd116','#fff0a2',2)){
      const p=projectPoint(b.x+b.w/2,b.y+b.h/2,cam);
      if(p&&p.forward>12){ctx.fillStyle='#063b5d';ctx.font=`${Math.max(10,Math.min(22,13*p.scale))}px Fredoka`;ctx.textAlign='center';ctx.fillText('BOOST',p.x,p.y)}
    }
  });
  t.slow.forEach(s=>drawProjectedQuad([{x:s.x,y:s.y},{x:s.x+s.w,y:s.y},{x:s.x+s.w,y:s.y+s.h},{x:s.x,y:s.y+s.h}],'rgba(92,61,191,.48)'));

  [...t.bumpers].sort((a,b)=>{
    const pa=projectPoint(a.x,a.y,cam),pb=projectPoint(b.x,b.y,cam);return (pb?.depth||0)-(pa?.depth||0);
  }).forEach(b=>{
    const p=projectPoint(b.x,b.y,cam);if(!p||p.forward<-35)return;
    const r=Math.max(4,b.r*p.scale),height=Math.max(9,r*1.35);
    ctx.fillStyle='rgba(0,0,0,.20)';ctx.beginPath();ctx.ellipse(p.x,p.y+3,r*.95,r*.24,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#343b47';ctx.fillRect(p.x-r*.62,p.y-height,r*1.24,height);
    ctx.beginPath();ctx.ellipse(p.x,p.y-height,r*.62,r*.25,0,0,Math.PI*2);ctx.fillStyle='#d54a43';ctx.fill();
    ctx.lineWidth=Math.max(2,3*p.scale);ctx.strokeStyle='#ffcf18';ctx.stroke();
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
function pointerPoint(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*canvas.width/r.width,y:(e.clientY-r.top)*canvas.height/r.height}}
function resetLook(){lookDrag=null;lookYaw=0;lookPitch=0}
function onPointerDown(e){
  if(!localCanShoot())return;
  const q=pointerPoint(e),p=activePlayer(),sp=projectPoint(p.x,p.y);
  if(!sp)return;
  canvas.setPointerCapture?.(e.pointerId);
  const discHit=Math.hypot(q.x-sp.x,q.y-sp.y)<=Math.max(95,DISC_R*sp.scale*1.35);
  if(discHit){
    drag=q;
  }else{
    lookDrag={x:q.x,y:q.y,startYaw:lookYaw,startPitch:lookPitch,pointerId:e.pointerId};
  }
  draw();e.preventDefault();
}
function onPointerMove(e){
  if(lookDrag){
    const q=pointerPoint(e);
    lookYaw=clamp(lookDrag.startYaw-(q.x-lookDrag.x)*.0065,-Math.PI,Math.PI);
    lookPitch=clamp(lookDrag.startPitch+(q.y-lookDrag.y)*.22,-120,150);
    draw();e.preventDefault();return;
  }
  if(!drag)return;
  drag=pointerPoint(e);draw();e.preventDefault();
}
function onPointerUp(e){
  if(lookDrag){
    lookDrag=null;draw();e.preventDefault();return;
  }
  if(!drag||!localCanShoot())return;
  const q=pointerPoint(e),p=activePlayer(),sp=projectPoint(p.x,p.y),cam=cameraForView();
  if(!sp){drag=null;return}
  const sx=q.x-sp.x,sy=q.y-sp.y,d=Math.hypot(sx,sy);drag=null;
  if(d<20){draw();return}
  const power=clamp(d/MAX_DRAG_SCREEN,.12,1),speed=5+power*MAX_SPEED;
  const forward=-sy,lateral=sx*.9,dm=Math.hypot(forward,lateral)||1;
  const ux=(cam.hx*forward+cam.rx*lateral)/dm,uy=(cam.hy*forward+cam.ry*lateral)/dm;
  const vx=ux*speed,vy=uy*speed;
  resetLook();draw();renderRace();
  if(mode==='multi'&&role==='client')session?.sendToHost({type:'flick',playerId:p.id,vx,vy});
  else startAuthoritativeFlick(p.id,vx,vy);
  e.preventDefault();
}

function processCheckpoints(previous=[]){
  if(!game)return;
  const finish=finishLine();
  game.players.forEach((p,i)=>{
    if(p.finished)return;
    let zone=0;
    if(p.x>835&&p.y>215&&p.y<385)zone=1;
    else if(p.y<125&&p.x>420&&p.x<580)zone=2;
    else if(p.x<165&&p.y>215&&p.y<385)zone=3;
    if(p.nextCheckpoint===1&&zone===1)p.nextCheckpoint=2;
    else if(p.nextCheckpoint===2&&zone===2)p.nextCheckpoint=3;
    else if(p.nextCheckpoint===3&&zone===3)p.nextCheckpoint=4;

    const prev=previous[i];
    const crossedFinish=p.nextCheckpoint===4&&prev&&
      prev.x<finish.x&&p.x>=finish.x&&
      p.y>=finish.y1-DISC_R&&p.y<=finish.y2+DISC_R;
    if(crossedFinish){
      p.lap++;p.nextCheckpoint=1;
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
function updateTurboFromMovement(p,moved,isActive){
  p.turboCharge=clamp(Number(p.turboCharge)||0,0,1);
  p.turboReady=!!p.turboReady;

  if(isActive&&p.turboHeld&&p.turboCharge>0){
    p.turboReady=false;
    p.turboCharge=clamp(p.turboCharge-TURBO_DRAIN_PER_STEP,0,1);
    const speed=Math.hypot(p.vx,p.vy);
    if(speed>.01){
      const target=Math.min(TURBO_MAX_SPEED,speed+TURBO_ACCEL);
      const scale=target/speed;p.vx*=scale;p.vy*=scale;
    }
    if(p.turboCharge<=0){
      p.turboCharge=0;p.turboHeld=false;turboHolding=false;
    }
    return;
  }

  if(!p.turboHeld&&moved>0&&p.turboCharge<1){
    p.turboCharge=clamp(p.turboCharge+moved*TURBO_CHARGE_PER_UNIT,0,1);
    if(p.turboCharge>=.999){p.turboCharge=1;p.turboReady=true}
  }
}
async function animatePhysics(){
  animating=true;renderRace();
  const boosted=new Set();
  let steps=0;
  await new Promise(resolve=>{
    const frame=()=>{
      let moving=false;
      for(let k=0;k<2;k++){
        const before=game.players.map(p=>({x:p.x,y:p.y}));
        game.players.forEach(p=>{if(Math.hypot(p.vx,p.vy)>.001){moving=true;applyWalls(p);applyBumpers(p)}});
        applyDiscCollisions();
        const activeId=activePlayer()?.id;
        game.players.forEach((p,i)=>{
          const moved=Math.hypot(p.x-before[i].x,p.y-before[i].y);
          updateTurboFromMovement(p,moved,p.id===activeId);
          applySurface(p,boosted);
        });
        processCheckpoints(before);steps++;
      }
      draw();renderHudOnly();
      if(moving&&steps<STEPS_MAX)requestAnimationFrame(frame);else resolve();
    };
    requestAnimationFrame(frame);
  });
  game.players.forEach(p=>{p.vx=0;p.vy=0;p.turboHeld=false});
  turboHolding=false;animating=false;
}
async function startAuthoritativeFlick(playerId,vx,vy){
  if(!game||game.winner||animating||game.phase!=='aim')return;
  const p=activePlayer();if(!p||p.id!==playerId)return;
  game.phase='moving';p.turboHeld=false;turboHolding=false;
  p.vx=clamp(vx,-36,36);p.vy=clamp(vy,-36,36);
  if(mode==='multi'&&role==='host')session?.broadcast({type:'flick-start',playerId:p.id,vx:p.vx,vy:p.vy});
  await animatePhysics();
  game.phase=game.winner?'finished':'settled';
  renderRace();
  if(mode==='multi'&&role==='host')broadcastState();
}
async function playRemoteFlick(msg){
  if(!game||animating)return;
  const p=game.players.find(x=>x.id===msg.playerId);if(!p)return;
  game.phase='moving';p.turboHeld=false;
  p.vx=Number(msg.vx)||0;p.vy=Number(msg.vy)||0;
  await animatePhysics();
  if(!game.winner)game.phase='settled';
  if(pendingSnapshot){const finalState=pendingSnapshot;pendingSnapshot=null;applySnapshot(finalState)}else renderRace();
}
function completeTurn(){
  if(!game||game.winner||game.phase!=='settled')return;
  game.players.forEach(p=>p.turboHeld=false);
  turboHolding=false;nextTurn();game.phase='aim';resetLook();renderRace();
  if(mode==='multi'&&role==='host')broadcastState();
}
function requestFinishTurn(){
  if(!localCanFinish())return;
  const p=activePlayer();
  if(mode==='multi'&&role==='client')session?.sendToHost({type:'finish-turn',playerId:p.id});
  else completeTurn();
}
function localCanTurbo(){
  const p=activePlayer();
  if(!p||game?.winner||game?.phase!=='moving'||!animating)return false;
  const owned=mode==='local'||localPlayerId===p.id;
  return owned&&(p.turboHeld||(p.turboReady&&p.turboCharge>=.999));
}
function applyTurboHeld(playerId,held,force=false){
  const p=game?.players?.find(x=>x.id===playerId);if(!p)return false;
  if(held){
    if(!force&&(game?.phase!=='moving'||p.id!==activePlayer()?.id||!p.turboReady||p.turboCharge<.999))return false;
    p.turboReady=false;p.turboHeld=true;
  }else{
    p.turboHeld=false;
  }
  renderHudOnly();return true;
}
function requestTurboHeld(held){
  const p=activePlayer();if(!p)return;
  if(held&&!localCanTurbo())return;
  if(!held&&!p.turboHeld&&!turboHolding)return;
  turboHolding=held;
  if(mode==='multi'&&role==='client'){
    if(held)applyTurboHeld(p.id,true);else applyTurboHeld(p.id,false);
    session?.sendToHost({type:'turbo-hold',playerId:p.id,held});
  }else{
    const changed=applyTurboHeld(p.id,held);
    if(changed&&mode==='multi'&&role==='host')session?.broadcast({type:'turbo-hold',playerId:p.id,held});
  }
}

function raceProgress(p){
  if(p.finished)return 1e9;
  const angle=Math.atan2(p.y-300,p.x-500);
  const around=(Math.PI/2-angle+Math.PI*2)%(Math.PI*2);
  return p.lap*Math.PI*2+around;
}
function ordinal(n){
  const m=n%100;if(m>=11&&m<=13)return n+'TH';
  return n+({1:'ST',2:'ND',3:'RD'}[n%10]||'TH');
}
function playerPosition(player){
  const ordered=[...game.players].sort((a,b)=>raceProgress(b)-raceProgress(a));
  return Math.max(1,ordered.findIndex(p=>p.id===player.id)+1);
}
function renderHudOnly(){
  if(!game)return;
  const p=activePlayer(),yourShot=localCanShoot(),yourFinish=localCanFinish(),phase=game.phase||'aim';
  const turboCharge=clamp(Number(p?.turboCharge)||0,0,1),canTurbo=localCanTurbo();
  $('turnText').textContent=game.winner?`${game.winner.name} wins!`:p?`${p.name}${(yourShot||yourFinish||canTurbo)?' — your turn':''}`:'—';
  $('turnHint').textContent=game.winner?'Race complete':
    phase==='moving'?(p?.turboHeld?'Turbo boosting — release to save charge':canTurbo?'Disc moving — hold Turbo to boost':'Disc moving…'):
    phase==='settled'?(yourFinish?'Review the result, then Finish Turn':`Waiting for ${p?.name||'player'} to finish turn`):
    yourShot?'Drag anywhere to look around · drag from your disc to flick':`Waiting for ${p?.name||'player'}`;
  $('turnBanner').classList.toggle('yours',(yourShot||yourFinish||canTurbo)&&!game.winner);$('turnBanner').classList.toggle('finished',!!game.winner);

  $('turboFill').style.height=`${Math.round(turboCharge*100)}%`;
  $('turboState').textContent=p?.turboHeld?'BOOSTING':p?.turboReady?'READY — HOLD':`CHARGING ${Math.round(turboCharge*100)}%`;
  $('turboButton').disabled=!canTurbo;
  $('turboButton').classList.toggle('ready',!!p?.turboReady&&!p?.turboHeld);
  $('turboButton').classList.toggle('active',!!p?.turboHeld);

  $('finishTurnButton').disabled=!yourFinish;
  if($('hudPlayerName'))$('hudPlayerName').textContent=p?.name||'—';
  if($('hudDisc'))$('hudDisc').style.background=p?.color||'#0b82dd';
  if($('hudPosition'))$('hudPosition').textContent=p?ordinal(playerPosition(p)):'—';
  if($('hudLap'))$('hudLap').textContent=p?`${Math.min(p.lap+1,game.laps)}/${game.laps}`:'—';
  $('scoreboard').innerHTML=game.players.map((x,i)=>`<div class="scoreRow${i===game.current&&!game.winner?' active':''}"><div class="scoreIdentity"><span class="scoreDot" style="background:${x.color}"></span><strong>${esc(x.name)}</strong></div><small>${x.finished?'FINISHED':`Lap ${Math.min(x.lap+1,game.laps)} / ${game.laps}`} · ${ordinal(playerPosition(x))} · Turbo ${Math.round((x.turboCharge||0)*100)}%</small></div>`).join('');
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
function selectedTrackLabel(){return selectedTrack==='random'?'Random Track':(TRACKS.find(t=>t.id===selectedTrack)?.name||'Track')}
function updateHostAdvert(){
  if(role!=='host'||!session?.updateHost)return;
  const p=roster().find(x=>x.id===$('hostPlayer').value);
  session.updateHost({hostName:`${p?.name||'Host'}'s Disc Rally`,player:p,started:false,raceMode:'disc-rally',trackName:selectedTrackLabel(),totalRaces:Number($('hostLaps').value)||2});
}
function installSession(kind){
  if(!window.GameBoxLAN?.DiscoverySession)throw new Error('Multiplayer discovery is unavailable.');
  if(!session){
    session=new window.GameBoxLAN.DiscoverySession({
      game:'disc-rally-v1',
      onStatus:text=>{if(role==='host')$('hostStatus').textContent=text;if(role==='client')$('joinStatus').textContent=text},
      onHostsChanged:hosts=>{lastHosts=hosts;renderHosts(hosts)},
      onPeersChanged:()=>{
        if(role==='host'){renderLobby('hostLobby',lobbyPlayers());$('startHost').disabled=lobbyPlayers().length<2;updateHostAdvert();broadcastLobby()}
      },
      onMessage:networkMessage
    });
  }else{
    try{session.suspend?.()}catch{}
  }
  role=kind;
}
function resetSession(hard=false){
  try{hard?session?.close():session?.suspend?.()}catch{}
  if(hard)session=null;
  connectedLobby=[];lastHosts=[];role=null;
}
async function startHostDiscovery(){
  try{
    installSession('host');localPlayerId=$('hostPlayer').value;
    const p=roster().find(x=>x.id===localPlayerId);selectedLaps=Number($('hostLaps').value)||2;
    $('hostStatus').textContent='Starting…';
    await session.startHost({hostName:`${p?.name||'Host'}'s Disc Rally`,player:p,raceMode:'disc-rally',trackName:selectedTrackLabel(),totalRaces:selectedLaps});
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
    if(msg.type==='flick'){const p=activePlayer();if(p&&source.peer?.meta?.player?.id===p.id&&msg.playerId===p.id)startAuthoritativeFlick(p.id,Number(msg.vx)||0,Number(msg.vy)||0);return}
    if(msg.type==='turbo-hold'){
      const p=activePlayer();
      if(p&&source.peer?.meta?.player?.id===p.id&&msg.playerId===p.id){
        const changed=applyTurboHeld(p.id,!!msg.held);
        if(changed)session?.broadcast({type:'turbo-hold',playerId:p.id,held:!!msg.held});
      }
      return;
    }
    if(msg.type==='finish-turn'){const p=activePlayer();if(p&&game?.phase==='settled'&&source.peer?.meta?.player?.id===p.id&&msg.playerId===p.id)completeTurn();return}
  }else{
    if(msg.type==='lobby'){connectedLobby=Array.isArray(msg.players)?msg.players:[];selectedTrack=msg.trackId||selectedTrack;selectedLaps=Number(msg.laps)||2;renderLobby('joinLobby',connectedLobby);return}
    if(msg.type==='start'&&msg.state){mode='multi';applySnapshot(msg.state);return}
    if(msg.type==='flick-start'){playRemoteFlick(msg);return}
    if(msg.type==='turbo-hold'){applyTurboHeld(String(msg.playerId||''),!!msg.held,true);return}
    if(msg.type==='state'){if(animating)pendingSnapshot=msg.state;else applySnapshot(msg.state);return}
  }
}
function startHostRace(){
  const players=lobbyPlayers();if(players.length<2)return;
  const button=$('startHost');button.disabled=true;
  mode='multi';role='host';localPlayerId=$('hostPlayer').value;selectedLaps=Number($('hostLaps').value)||2;
  game=buildRace(players,selectedLaps);
  try{
    renderRace();
    showView('raceView');
  }catch(err){
    console.error('Could not start host race',err);
    game=null;showView('hostSetup');$('hostStatus').textContent='Could not start race — try again';button.disabled=false;return;
  }
  session?.updateHost?.({started:true});
  session?.broadcast({type:'start',state:snapshot()});
}
function startLocalRace(){
  const ids=selectedLocal();if(ids.length<2){$('localStatus').textContent='Choose at least 2 players.';return}
  const map=new Map(roster().map(p=>[p.id,p]));const players=ids.map(id=>map.get(id)).filter(Boolean);
  selectedLaps=Number($('localLaps').value)||2;mode='local';role=null;localPlayerId='';game=buildRace(players,selectedLaps);renderRace();showView('raceView');
}
function leaveRace(){
  resetSession();game=null;drag=null;lookDrag=null;animating=false;turboHolding=false;resetLook();mode='local';role=null;renderPlayerPicks();renderTrackSummary();showView('modeView');
}
function bind(){
  renderPlayerPicks();syncPlayerSelects();renderTracks('localTracks');renderTracks('hostTracks');renderTracks('trackGrid');renderTrackSummary();

  $('localMode').onclick=()=>showView('passMenuView');
  $('multiMode').onclick=()=>showView('multiSetup');
  $('openSettings').onclick=()=>showView('settingsView');
  $('newPassRace').onclick=$('newPassRaceBottom').onclick=()=>{
    $('localStatus').textContent='';
    renderPlayerPicks();renderTrackSummary();showView('localSetup');
  };
  $('openTrackSelection').onclick=()=>{renderTracks('trackGrid');showView('trackSelectView')};

  $$('[data-back]').forEach(b=>b.onclick=()=>{
    if(currentView==='hostSetup'||currentView==='joinSetup')resetSession();
    showView(b.dataset.back);
  });

  $('addPassPlayer').onclick=()=>$('passRosterOptions').classList.toggle('hidden');
  $('removePassPlayer').onclick=()=>{
    const picked=selectedLocal();picked.pop();write(LOCAL_PICK_KEY,picked);renderPlayerPicks();
  };

  $('startLocal').onclick=startLocalRace;
  $('hostMode').onclick=()=>{
    if(selectedTrack==='random')selectedTrack='harbour';
    showView('hostSetup');syncPlayerSelects();renderTracks('hostTracks');startHostDiscovery();
  };
  $('joinMode').onclick=()=>{showView('joinSetup');syncPlayerSelects();startScan()};
  $('restartHostDiscovery').onclick=startHostDiscovery;
  $('restartScan').onclick=startScan;
  $('hostPlayer').onchange=()=>{localPlayerId=$('hostPlayer').value;updateHostAdvert();renderLobby('hostLobby',lobbyPlayers());broadcastLobby()};
  $('hostLaps').onchange=()=>{selectedLaps=Number($('hostLaps').value)||2;updateHostAdvert();broadcastLobby()};
  $('joinPlayer').onchange=()=>{
    localPlayerId=$('joinPlayer').value;
    const p=roster().find(x=>x.id===localPlayerId);
    if(role==='client'&&session?.peers?.().length&&p)session.sendToHost({type:'hello',player:p});
  };

  $('startHost').onclick=startHostRace;
  $('exitRace').onclick=leaveRace;
  $('finishTurnButton').onclick=requestFinishTurn;
  const turboButton=$('turboButton');
  turboButton.addEventListener('pointerdown',e=>{
    e.preventDefault();turboButton.setPointerCapture?.(e.pointerId);requestTurboHeld(true);
  });
  const releaseTurbo=e=>{e?.preventDefault?.();requestTurboHeld(false)};
  turboButton.addEventListener('pointerup',releaseTurbo);
  turboButton.addEventListener('pointercancel',releaseTurbo);
  turboButton.addEventListener('lostpointercapture',()=>{if(turboHolding)requestTurboHeld(false)});

  canvas.addEventListener('pointerdown',onPointerDown);
  canvas.addEventListener('pointermove',onPointerMove);
  canvas.addEventListener('pointerup',onPointerUp);
  canvas.addEventListener('pointercancel',()=>{drag=null;lookDrag=null;draw()});

  document.addEventListener('click',e=>{
    const host=e.target.closest('[data-host]');if(host){joinHost(host.dataset.host);return}
    const player=e.target.closest('[data-pass-player]');
    if(player){
      let picked=selectedLocal(),id=player.dataset.passPlayer;
      if(picked.includes(id))picked=picked.filter(x=>x!==id);else if(picked.length<4)picked.push(id);
      write(LOCAL_PICK_KEY,picked);renderPlayerPicks();
    }
  });

  const settings=read('gamebox.discrally.settings.v1',{cameraFollow:true,motion:true});
  $('cameraFollowSetting').checked=settings.cameraFollow!==false;
  $('motionSetting').checked=settings.motion!==false;
  const saveSettings=()=>write('gamebox.discrally.settings.v1',{
    cameraFollow:$('cameraFollowSetting').checked,
    motion:$('motionSetting').checked
  });
  $('cameraFollowSetting').onchange=saveSettings;
  $('motionSetting').onchange=saveSettings;

  const cleanup=()=>{try{resetSession(true)}catch{}};
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