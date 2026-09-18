(() => {
'use strict';
const $=id=>document.getElementById(id);
const $$=sel=>[...document.querySelectorAll(sel)];
const ROSTER_KEY='gamebox.players.v1';
const LOCAL_PICK_KEY='gamebox.discrally.players.v1';
const COLORS=['#f7bd18','#0a65c7','#d94f5c','#24a47f'];
const TRACKS=[
  {id:'harbour',name:'Harbour Loop',desc:'Fast, open corners',inner:{x:250,y:160,w:500,h:280,r:120},bumpers:[],boosts:[{x:665,y:488,w:120,h:34,a:0}],slow:[]},
  {id:'bumper',name:'Bumper Run',desc:'Two central rebound posts',inner:{x:250,y:160,w:500,h:280,r:120},bumpers:[{x:820,y:180,r:26},{x:180,y:420,r:26}],boosts:[{x:440,y:72,w:120,h:34,a:0}],slow:[]},
  {id:'goldrush',name:'Gold Rush',desc:'Boost pads and a slow patch',inner:{x:270,y:170,w:460,h:260,r:105},bumpers:[{x:835,y:390,r:22}],boosts:[{x:640,y:486,w:130,h:34,a:0},{x:205,y:72,w:110,h:34,a:0}],slow:[{x:75,y:225,w:120,h:150}]}
];
const TRACK_OUTER={x:35,y:35,w:930,h:530,r:155};
const DISC_R=22,MAX_DRAG=150,MAX_SPEED=24,FRICTION=.982,BOUNCE=.72,STEPS_MAX=900;
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
let mode='local',role=null,session=null,localPlayerId='',selectedTrack='harbour',selectedLaps=2,connectedLobby=[],drag=null,animating=false,turboArmed=false,lastHosts=[];
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
  const wrap=$('localPlayers');wrap.innerHTML='';
  const picked=selectedLocal();
  roster().forEach(p=>{
    const b=document.createElement('button');b.type='button';b.className='playerChoice'+(picked.includes(p.id)?' selected':'');b.textContent=p.name;
    b.onclick=()=>{let s=selectedLocal();if(s.includes(p.id))s=s.filter(x=>x!==p.id);else if(s.length<4)s.push(p.id);write(LOCAL_PICK_KEY,s);renderPlayerPicks()};
    wrap.appendChild(b);
  });
}
function syncPlayerSelects(){
  ['hostPlayer','joinPlayer'].forEach(id=>{
    const el=$(id),prev=el.value;el.innerHTML=roster().map(p=>`<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('');
    if(roster().some(p=>p.id===prev))el.value=prev;
  });
}
function renderTracks(containerId){
  const wrap=$(containerId);wrap.innerHTML='';
  TRACKS.forEach(t=>{
    const b=document.createElement('button');b.type='button';b.className='trackChoice'+(t.id===selectedTrack?' selected':'');
    b.innerHTML=`<strong>${esc(t.name)}</strong><small>${esc(t.desc)}</small>`;
    b.onclick=()=>{selectedTrack=t.id;['localTracks','hostTracks'].forEach(renderTracks);if(role==='host')updateHostAdvert()};
    wrap.appendChild(b);
  });
}
function track(){return TRACKS.find(t=>t.id===selectedTrack)||TRACKS[0]}

function buildRace(players,laps=2){
  const starts=[{x:390,y:500},{x:340,y:500},{x:290,y:500},{x:240,y:500}];
  return {
    id:uid(),trackId:selectedTrack,laps:Number(laps)||2,current:0,turn:1,winner:null,shotInProgress:false,
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
  if(!p||animating||game?.winner)return false;
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

function drawTrack(){
  const t=track();
  ctx.clearRect(0,0,canvas.width,canvas.height);
  const bg=ctx.createLinearGradient(0,0,0,600);bg.addColorStop(0,'#dff1e9');bg.addColorStop(1,'#c5e2d7');ctx.fillStyle=bg;ctx.fillRect(0,0,1000,600);
  ctx.fillStyle='#52776a';ctx.fill(makeTrackPath(),'evenodd');
  ctx.strokeStyle='#edf7f3';ctx.lineWidth=8;ctx.setLineDash([22,18]);ctx.stroke(makeTrackPath());ctx.setLineDash([]);
  const inn=t.inner;ctx.fillStyle='#b9dccd';const inner=new Path2D();roundedRectPath(inner,inn.x,inn.y,inn.w,inn.h,inn.r);ctx.fill(inner);
  ctx.fillStyle='rgba(255,255,255,.15)';ctx.beginPath();ctx.ellipse(500,300,170,78,0,0,Math.PI*2);ctx.fill();
  // Finish line
  for(let i=0;i<8;i++){ctx.fillStyle=i%2?'#fff':'#082f68';ctx.fillRect(465+i*10,476,10,50)}
  ctx.fillStyle='#082f68';ctx.font='700 16px Fredoka, sans-serif';ctx.textAlign='center';ctx.fillText('START / FINISH',505,465);
  // checkpoint hints
  ctx.globalAlpha=.25;ctx.fillStyle='#fff';ctx.fillRect(842,245,70,110);ctx.fillRect(465,58,70,54);ctx.fillRect(88,245,70,110);ctx.globalAlpha=1;
  t.boosts.forEach(b=>{ctx.save();ctx.translate(b.x+b.w/2,b.y+b.h/2);ctx.rotate(b.a||0);ctx.fillStyle='#f7bd18';ctx.strokeStyle='#9b7100';ctx.lineWidth=3;roundRect(ctx,-b.w/2,-b.h/2,b.w,b.h,12);ctx.fill();ctx.stroke();ctx.fillStyle='#082f68';ctx.font='800 16px Fredoka';ctx.fillText('BOOST',0,6);ctx.restore()});
  t.slow.forEach(s=>{ctx.fillStyle='rgba(55,123,168,.35)';roundRect(ctx,s.x,s.y,s.w,s.h,24);ctx.fill();ctx.fillStyle='#fff';ctx.font='700 15px Fredoka';ctx.fillText('SLOW',s.x+s.w/2,s.y+s.h/2+5)});
  t.bumpers.forEach(b=>{ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.fillStyle='#fff';ctx.fill();ctx.lineWidth=7;ctx.strokeStyle='#f7bd18';ctx.stroke();ctx.beginPath();ctx.arc(b.x,b.y,b.r-10,0,Math.PI*2);ctx.strokeStyle='#082f68';ctx.lineWidth=4;ctx.stroke()});
}
function roundRect(c,x,y,w,h,r){c.beginPath();c.roundRect(x,y,w,h,r)}

function drawDiscs(){
  if(!game)return;
  game.players.forEach((p,i)=>{
    ctx.save();ctx.translate(p.x,p.y);
    ctx.beginPath();ctx.arc(0,0,DISC_R,0,Math.PI*2);ctx.fillStyle='rgba(0,0,0,.18)';ctx.fill();
    ctx.translate(0,-4);ctx.beginPath();ctx.arc(0,0,DISC_R,0,Math.PI*2);ctx.fillStyle=p.color;ctx.fill();ctx.lineWidth=i===game.current&&!game.winner?6:3;ctx.strokeStyle=i===game.current&&!game.winner?'#fff':'rgba(8,47,104,.5)';ctx.stroke();
    ctx.beginPath();ctx.arc(-6,-7,6,0,Math.PI*2);ctx.fillStyle='rgba(255,255,255,.55)';ctx.fill();
    ctx.fillStyle='#082f68';ctx.font='800 14px Fredoka';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(i+1),0,1);
    ctx.restore();
  });
}
function drawAim(){
  if(!drag||!activePlayer())return;
  const p=activePlayer(),dx=drag.x-p.x,dy=drag.y-p.y,d=Math.hypot(dx,dy)||1,cap=Math.min(MAX_DRAG,d),ux=dx/d,uy=dy/d;
  ctx.save();ctx.strokeStyle='#fff';ctx.lineWidth=8;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x+ux*cap,p.y+uy*cap);ctx.stroke();
  ctx.strokeStyle='#082f68';ctx.lineWidth=3;ctx.stroke();
  ctx.fillStyle='#f7bd18';ctx.beginPath();ctx.arc(p.x+ux*cap,p.y+uy*cap,8,0,Math.PI*2);ctx.fill();ctx.restore();
}
function draw(){
  drawTrack();drawDiscs();drawAim();
}
function pointerPoint(e){
  const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*1000/r.width,y:(e.clientY-r.top)*600/r.height};
}
function onPointerDown(e){
  if(!localCanShoot())return;
  const q=pointerPoint(e),p=activePlayer();if(dist(q,p)>65)return;
  canvas.setPointerCapture?.(e.pointerId);drag=q;turboArmed=turboArmed&&p.turbo>0;draw();e.preventDefault();
}
function onPointerMove(e){
  if(!drag)return;drag=pointerPoint(e);const p=activePlayer(),power=clamp(dist(drag,p)/MAX_DRAG,0,1);$('powerFill').style.width=`${Math.round(power*100)}%`;draw();e.preventDefault();
}
function onPointerUp(e){
  if(!drag||!localCanShoot())return;
  const q=pointerPoint(e),p=activePlayer(),dx=q.x-p.x,dy=q.y-p.y,d=Math.hypot(dx,dy);drag=null;$('powerFill').style.width='0%';draw();
  if(d<18)return;
  const power=clamp(d/MAX_DRAG,.12,1),speed=(5+power*MAX_SPEED)*(turboArmed?1.35:1),vx=dx/d*speed,vy=dy/d*speed,useTurbo=turboArmed;
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
