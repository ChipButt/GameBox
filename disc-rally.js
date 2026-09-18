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
