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

function applyWalls(p){
  const sx=p.vx*.5,sy=p.vy*.5,nx=p.x+sx,ny=p.y+sy;
  if(roadContains(nx,ny)){p.x=nx;p.y=ny;return}
  const canX=roadContains(p.x+sx,p.y),canY=roadContains(p.x,p.y+sy);
  if(canX){p.x+=sx;p.vy*=-BOUNCE}
  else if(canY){p.y+=sy;p.vx*=-BOUNCE}
  else{p.vx*=-BOUNCE;p.vy*=-BOUNCE}
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