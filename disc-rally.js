(() => {
'use strict';
const $=id=>document.getElementById(id);
const $$=sel=>[...document.querySelectorAll(sel)];
const ROSTER_KEY='gamebox.players.v1';
const LOCAL_PICK_KEY='gamebox.discrally.players.v1';
const COLORS=['#f7bd18','#0a65c7','#d94f5c','#24a47f'];
const TRACKS=[
  {
    id:'harbour',name:'Harbour Loop',desc:'Long flowing waterfront circuit',width:140,smooth:3,
    points:[[500,850],[900,880],[1280,790],[1450,600],[1380,360],[1180,160],[880,130],[650,230],[430,100],[180,180],[80,430],[170,690],[320,820]],
    bumpers:[],boosts:[{s:.16,offset:0,length:105,width:54}],slow:[]
  },
  {
    id:'bumper',name:'Bumper Beware',desc:'Smooth technical bends with sparse rebound posts',width:126,smooth:3,
    points:[[500,850],[900,880],[1280,780],[1450,600],[1260,480],[1430,300],[1240,120],[950,150],[760,330],[560,170],[300,110],[100,300],[260,470],[90,650],[300,830]],
    bumpers:[{s:.29,offset:20,r:13},{s:.67,offset:-18,r:13}],boosts:[{s:.11,offset:0,length:90,width:48}],slow:[]
  },
  {
    id:'goldrush',name:'Gold Rush',desc:'Wide sweepers, S-bends and boost lanes',width:120,smooth:3,
    points:[[500,870],[850,900],[1210,820],[1450,650],[1260,500],[1450,320],[1240,120],[950,170],[760,370],[540,190],[270,100],[90,300],[260,480],[100,680],[310,850]],
    bumpers:[{s:.38,offset:18,r:12}],boosts:[{s:.14,offset:0,length:110,width:50},{s:.57,offset:0,length:100,width:50}],slow:[{s:.78,offset:0,length:120,width:78}]
  },
  {
    id:'switchback',name:'Switchback',desc:'Long rounded switchbacks with generous separation',width:90,smooth:3,
    points:[[600,1200],[1100,1200],[1550,1050],[1250,850],[1550,650],[1200,450],[1450,180],[1000,100],[750,300],[300,120],[100,350],[420,550],[120,760],[430,930],[250,1150]],
    bumpers:[{s:.47,offset:-12,r:9}],boosts:[{s:.09,offset:0,length:82,width:38}],slow:[]
  },
  {
    id:'roundabout',name:'Roundabout',desc:'Broad looping bends around a deep central section',width:124,smooth:3,
    points:[[550,930],[950,950],[1320,850],[1500,650],[1320,470],[1460,280],[1240,100],[950,120],[820,340],[650,500],[470,350],[390,120],[160,180],[70,420],[260,570],[90,760],[320,920]],
    bumpers:[{s:.24,offset:16,r:11},{s:.73,offset:-16,r:11}],boosts:[],slow:[{s:.5,offset:0,length:95,width:72}]
  },
  {
    id:'lightning',name:'Force Lightning',desc:'Fast sweeping direction changes without crossovers',width:112,smooth:3,
    points:[[600,1400],[1100,1420],[1600,1300],[1780,1080],[1450,900],[1760,700],[1400,520],[1700,300],[1450,100],[1100,180],[800,80],[480,180],[150,350],[460,560],[120,760],[430,960],[180,1180],[380,1360]],
    bumpers:[{s:.64,offset:14,r:10}],boosts:[{s:.12,offset:0,length:115,width:44},{s:.46,offset:0,length:110,width:44},{s:.82,offset:0,length:100,width:44}],slow:[]
  }
];
const TRACK_GEOMETRY=new Map();
const DISC_R=18,DISC_COLLISION_R=15,MAX_DRAG_SCREEN=190,MAX_SPEED=24,FRICTION=.982,STEPS_MAX=900;
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
let mode='local',role=null,session=null,localPlayerId='',selectedTrack='random',selectedLaps=3,connectedLobby=[],drag=null,lookDrag=null,lookYaw=0,lookPitch=0,animating=false,turboHolding=false,lastHosts=[],trackSelectReturn='localSetup';
let game=null,pendingSnapshot=null,turnEndTimer=null,cameraHeading=null;
const canvas=$('raceCanvas'),ctx=canvas.getContext('2d');
const trackPath=new Path2D();

function showView(id){
  currentView=id;
  $$('.view').forEach(v=>v.classList.toggle('hidden',v.id!==id));
  window.scrollTo(0,0);
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
    slot.className='passPlayPlayerSlot '+(person?'filled':'empty');
    slot.innerHTML=person
      ? `<img class="passPlaySlotAsset" src="04_player_panel.png?v=1" alt=""><strong>${esc(person.name)}</strong>`
      : '<span class="passPlayEmptyCrop"><img src="05_player_slot_empty.png?v=1" alt=""></span>';
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
      b.innerHTML=`<span class="trackCardArt"><svg viewBox="0 0 100 100" aria-hidden="true"><path d="${miniMapPath(t)}"></path></svg></span><strong>${esc(t.name)}</strong>`;
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
  if(returnToSetup)showView(trackSelectReturn);
}
function renderTrackSummary(){
  const t=TRACKS.find(x=>x.id===selectedTrack);
  const name=t?t.name:'Random Track';
  const localIcon=t
    ? `<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet"><rect width="100" height="100" rx="50" fill="#0754b8"></rect><path d="${miniMapPath(t)}"></path></svg>`
    : '<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet"><rect width="100" height="100" rx="50" fill="#0754b8"></rect><path d="M18 66 C26 34 44 62 52 38 S78 30 84 50 S76 77 62 73" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"></path></svg>';
  const hostIcon=t
    ? `<svg viewBox="0 0 100 100"><path d="${miniMapPath(t)}"></path></svg>`
    : '?';
  if($('selectedTrackName'))$('selectedTrackName').textContent=name;
  if($('selectedTrackIcon')){
    $('selectedTrackIcon').innerHTML=localIcon;
    $('selectedTrackIcon').classList.toggle('random',!t);
  }
  if($('hostSelectedTrackName'))$('hostSelectedTrackName').textContent=name;
  if($('hostSelectedTrackIcon'))$('hostSelectedTrackIcon').innerHTML=hostIcon;
}
function renderLapChoices(){
  $$('[data-laps]').forEach(btn=>{
    const isSelected=Number(btn.dataset.laps)===selectedLaps;
    btn.classList.toggle('selected',isSelected);
    btn.setAttribute('aria-pressed',isSelected?'true':'false');
  });
}
function setLapCount(laps){
  const next=Number(laps);
  if(![1,3,5,7,9].includes(next))return;
  selectedLaps=next;
  renderLapChoices();
  if(role==='host'){
    updateHostAdvert();
    broadcastLobby();
  }
}
function track(){return TRACKS.find(t=>t.id===(game?.trackId||selectedTrack))||TRACKS[0]}
function chaikinClosed(points,passes=3){
  let pts=(points||[]).map(p=>({x:Number(p[0]),y:Number(p[1])}));
  for(let pass=0;pass<passes;pass++){
    const next=[],n=pts.length;
    for(let i=0;i<n;i++){
      const a=pts[i],b=pts[(i+1)%n];
      next.push({x:a.x*.75+b.x*.25,y:a.y*.75+b.y*.25});
      next.push({x:a.x*.25+b.x*.75,y:a.y*.25+b.y*.75});
    }
    pts=next;
  }
  return pts;
}
function segmentsIntersect(a,b,c,d){
  const cross=(p,q,r)=>(q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x);
  const ab1=cross(a,b,c),ab2=cross(a,b,d),cd1=cross(c,d,a),cd2=cross(c,d,b);
  return ab1*ab2<0&&cd1*cd2<0;
}
function courseHasCrossings(samples){
  const n=samples.length;
  for(let i=0;i<n;i++){
    const a=samples[i],b=samples[(i+1)%n];
    for(let j=i+2;j<n;j++){
      if(i===0&&j===n-1)continue;
      if(Math.abs(i-j)<=1)continue;
      const c=samples[j],d=samples[(j+1)%n];
      if(segmentsIntersect(a,b,c,d))return true;
    }
  }
  return false;
}
function buildTrackRails(samples,half){
  const left=samples.map((p,i)=>{
    const prev=samples[(i-1+samples.length)%samples.length],next=samples[(i+1)%samples.length],dx=next.x-prev.x,dy=next.y-prev.y,m=Math.hypot(dx,dy)||1,nx=-dy/m,ny=dx/m;
    return{x:p.x+nx*half,y:p.y+ny*half};
  });
  const right=samples.map((p,i)=>{
    const prev=samples[(i-1+samples.length)%samples.length],next=samples[(i+1)%samples.length],dx=next.x-prev.x,dy=next.y-prev.y,m=Math.hypot(dx,dy)||1,nx=-dy/m,ny=dx/m;
    return{x:p.x-nx*half,y:p.y-ny*half};
  });
  return{left,right};
}
function trackGeometry(t=track()){
  if(TRACK_GEOMETRY.has(t.id))return TRACK_GEOMETRY.get(t.id);
  let samples=chaikinClosed(t.points,t.smooth??3);
  if(courseHasCrossings(samples)){
    console.warn('Track geometry crossed itself; using safer single smoothing pass',t.id);
    samples=chaikinClosed(t.points,1);
  }
  const segs=[],cumulative=[0];let total=0;
  for(let i=0;i<samples.length;i++){
    const j=(i+1)%samples.length,a=samples[i],b=samples[j],dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1;
    segs.push({a,b,dx,dy,len,tx:dx/len,ty:dy/len});
    total+=len;cumulative.push(total);
  }

  // Validate the actual rail edges as well as the centreline. Tight inside bends
  // can make an offset rail self-intersect even when the centreline itself is clean.
  let half=t.width/2,{left,right}=buildTrackRails(samples,half);
  const minHalf=DISC_R*2+7;
  while(half>minHalf&&(courseHasCrossings(left)||courseHasCrossings(right))){
    half-=2;
    ({left,right}=buildTrackRails(samples,half));
  }
  if(courseHasCrossings(left)||courseHasCrossings(right)){
    console.warn('Rail geometry still too tight',t.id);
  }

  const g={samples,segs,cumulative,total,left,right,halfWidth:half,selfCrossing:courseHasCrossings(samples),railCrossing:courseHasCrossings(left)||courseHasCrossings(right)};
  TRACK_GEOMETRY.set(t.id,g);return g;
}
function rawPointAtProgress(progress,t=track()){
  const g=trackGeometry(t),p=((progress%1)+1)%1,target=p*g.total;
  let i=0;while(i<g.segs.length-1&&g.cumulative[i+1]<target)i++;
  const seg=g.segs[i],within=(target-g.cumulative[i])/seg.len;
  return{x:seg.a.x+seg.dx*within,y:seg.a.y+seg.dy*within,progress:p,index:i};
}
function pointAtProgress(progress,t=track()){
  const g=trackGeometry(t),p=rawPointAtProgress(progress,t),look=Math.max(.004,Math.min(.012,34/g.total));
  const before=rawPointAtProgress(progress-look,t),after=rawPointAtProgress(progress+look,t);
  let dx=after.x-before.x,dy=after.y-before.y,m=Math.hypot(dx,dy)||1;
  dx/=m;dy/=m;
  return{...p,tx:dx,ty:dy,nx:-dy,ny:dx};
}
function nearestTrackPoint(x,y,t=track()){
  const g=trackGeometry(t);let best=null,bestD2=Infinity;
  for(let i=0;i<g.segs.length;i++){
    const s=g.segs[i],px=x-s.a.x,py=y-s.a.y,u=clamp((px*s.dx+py*s.dy)/(s.len*s.len),0,1);
    const qx=s.a.x+s.dx*u,qy=s.a.y+s.dy*u,dx=x-qx,dy=y-qy,d2=dx*dx+dy*dy;
    if(d2<bestD2){
      bestD2=d2;
      best={x:qx,y:qy,distance:Math.sqrt(d2),progress:(g.cumulative[i]+s.len*u)/g.total,index:i};
    }
  }
  const frame=pointAtProgress(best.progress,t);
  return{...best,tx:frame.tx,ty:frame.ty,nx:frame.nx,ny:frame.ny};
}

function miniMapPath(t){
  const g=trackGeometry(t),pts=g.samples;
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  pts.forEach(p=>{minX=Math.min(minX,p.x);minY=Math.min(minY,p.y);maxX=Math.max(maxX,p.x);maxY=Math.max(maxY,p.y)});
  const w=Math.max(1,maxX-minX),h=Math.max(1,maxY-minY),scale=Math.min(82/w,82/h),ox=50-(minX+maxX)*scale/2,oy=50-(minY+maxY)*scale/2;
  const stride=Math.max(1,Math.floor(pts.length/48)),out=[];
  for(let i=0;i<pts.length;i+=stride)out.push(`${(pts[i].x*scale+ox).toFixed(1)},${(pts[i].y*scale+oy).toFixed(1)}`);
  return out.length?`M${out.join(' L')} Z`:'';
}
function finishLine(t=track()){
  const p=pointAtProgress(0,t),half=trackGeometry(t).halfWidth-4,thickness=24;
  return{...p,half,thickness};
}
function featureAt(spec,t=track()){
  const p=pointAtProgress(spec.s||0,t),offset=spec.offset||0;
  return{...p,x:p.x+p.nx*offset,y:p.y+p.ny*offset,length:spec.length||40,width:spec.width||40,r:spec.r||12};
}
function hitTrackFeature(p,spec,t=track()){
  const f=featureAt(spec,t),dx=p.x-f.x,dy=p.y-f.y,along=dx*f.tx+dy*f.ty,across=dx*f.nx+dy*f.ny;
  return Math.abs(along)<=f.length/2&&Math.abs(across)<=f.width/2;
}

function buildRace(players,laps=3){
  const raceTrack=selectedTrack==='random'?TRACKS[Math.floor(Math.random()*TRACKS.length)].id:selectedTrack;
  const t=TRACKS.find(x=>x.id===raceTrack)||TRACKS[0],start=pointAtProgress(.025,t);
  const starts=players.map((_,i)=>{
    const col=i%2,row=Math.floor(i/2),lateral=(col?1:-1)*24,back=row*48;
    return{x:start.x+start.nx*lateral-start.tx*back,y:start.y+start.ny*lateral-start.ty*back};
  });
  return {
    id:uid(),trackId:raceTrack,laps:Number(laps)||3,current:0,turn:1,winner:null,phase:'aim',flicksUsed:0,turnEndsAt:0,finishSequence:0,
    players:players.map((p,i)=>{
      const pos=starts[i],nearest=nearestTrackPoint(pos.x,pos.y,t);
      return{id:String(p.id),name:String(p.name).slice(0,24),color:COLORS[i%COLORS.length],x:pos.x,y:pos.y,vx:0,vy:0,lap:0,nextCheckpoint:1,trackProgress:nearest.progress,turboCharge:0,turboReady:false,turboHeld:false,finished:false,pendingFinish:false,finishCrossedAt:0};
    })
  };
}
function snapshot(){
  return game?JSON.parse(JSON.stringify(game)):null;
}
function applySnapshot(s){
  if(!s)return;
  clearTurnEndTimer();
  game=s;if(!game.phase)game.phase='aim';if(!Number.isFinite(game.flicksUsed))game.flicksUsed=0;if(!Number.isFinite(game.turnEndsAt))game.turnEndsAt=0;if(!Number.isFinite(game.finishSequence))game.finishSequence=0;
  game.players=(game.players||[]).map(p=>({
    ...p,
    turboCharge:clamp(Number.isFinite(p.turboCharge)?p.turboCharge:0,0,1),
    turboReady:!!p.turboReady,
    turboHeld:false,
    pendingFinish:!!p.pendingFinish,
    finishCrossedAt:Number.isFinite(p.finishCrossedAt)?p.finishCrossedAt:0,
    trackProgress:Number.isFinite(p.trackProgress)?p.trackProgress:nearestTrackPoint(p.x,p.y,TRACKS.find(t=>t.id===s.trackId)||TRACKS[0]).progress
  }));
  selectedTrack=s.trackId||selectedTrack;selectedLaps=s.laps||3;
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

function roadContains(x,y){return nearestTrackPoint(x,y).distance<=trackGeometry().halfWidth}

function updateCameraHeading(){
  const p=activePlayer()||pointAtProgress(.025),nearest=nearestTrackPoint(p.x,p.y);
  const desired=Math.atan2(nearest.ty,nearest.tx);
  if(cameraHeading==null||!animating){
    cameraHeading=desired;
    return;
  }
  const delta=Math.atan2(Math.sin(desired-cameraHeading),Math.cos(desired-cameraHeading));
  cameraHeading+=delta*.16;
}
function cameraForView(){
  const p=activePlayer()||pointAtProgress(.025),nearest=nearestTrackPoint(p.x,p.y);
  const base=cameraHeading==null?Math.atan2(nearest.ty,nearest.tx):cameraHeading;
  const angle=base+lookYaw,hx=Math.cos(angle),hy=Math.sin(angle);
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
function drawProjectedQuad(points,fill,stroke=null,width=1){
  const ps=points.map(p=>projectPoint(p.x,p.y));
  if(ps.some(p=>!p))return false;
  ctx.beginPath();ctx.moveTo(ps[0].x,ps[0].y);for(let i=1;i<ps.length;i++)ctx.lineTo(ps[i].x,ps[i].y);ctx.closePath();
  if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke()}return true;
}
function trackFeatureQuad(spec,t=track()){
  const f=featureAt(spec,t),hl=f.length/2,hw=f.width/2;
  return[
    {x:f.x-f.tx*hl+f.nx*hw,y:f.y-f.ty*hl+f.ny*hw},
    {x:f.x+f.tx*hl+f.nx*hw,y:f.y+f.ty*hl+f.ny*hw},
    {x:f.x+f.tx*hl-f.nx*hw,y:f.y+f.ty*hl-f.ny*hw},
    {x:f.x-f.tx*hl-f.nx*hw,y:f.y-f.ty*hl-f.ny*hw}
  ];
}
function finishCellQuad(f,across0,across1,along0,along1){
  const p=(across,along)=>({x:f.x+f.nx*across+f.tx*along,y:f.y+f.ny*across+f.ty*along});
  return[p(across0,along0),p(across1,along0),p(across1,along1),p(across0,along1)];
}
function drawDirectionChevrons(t,cam){
  const half=trackGeometry(t).halfWidth;
  for(let progress=.055;progress<.98;progress+=.065){
    const f=pointAtProgress(progress,t),back=26,span=Math.min(half*.34,28);
    const left={x:f.x-f.tx*back+f.nx*span,y:f.y-f.ty*back+f.ny*span};
    const tip={x:f.x+f.tx*20,y:f.y+f.ty*20};
    const right={x:f.x-f.tx*back-f.nx*span,y:f.y-f.ty*back-f.ny*span};
    const a=projectPoint(left.x,left.y,cam),b=projectPoint(tip.x,tip.y,cam),d=projectPoint(right.x,right.y,cam);
    if(!a||!b||!d||b.forward<8)continue;
    ctx.save();
    ctx.lineCap='round';ctx.lineJoin='round';
    ctx.strokeStyle='rgba(255,255,255,.82)';
    ctx.lineWidth=Math.max(2.5,Math.min(9,6*b.scale));
    ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineTo(d.x,d.y);ctx.stroke();
    ctx.restore();
  }
}
function drawPerspectiveRoad(){
  const t=track(),g=trackGeometry(t),cam=cameraForView();
  ctx.clearRect(0,0,canvas.width,canvas.height);

  const sky=ctx.createLinearGradient(0,0,0,VIEW.horizon+240);
  sky.addColorStop(0,'#f9fbff');sky.addColorStop(.45,'#f2f1ff');sky.addColorStop(1,'#b8ddff');
  ctx.fillStyle=sky;ctx.fillRect(0,0,VIEW.w,VIEW.horizon+280);

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

  for(let i=0;i<g.samples.length;i++){
    const j=(i+1)%g.samples.length;
    const l0=projectPoint(g.left[i].x,g.left[i].y,cam),l1=projectPoint(g.left[j].x,g.left[j].y,cam),
          r0=projectPoint(g.right[i].x,g.right[i].y,cam),r1=projectPoint(g.right[j].x,g.right[j].y,cam);
    if(!l0||!l1||!r0||!r1)continue;
    if(Math.max(l0.forward,l1.forward,r0.forward,r1.forward)<-80)continue;
    ctx.beginPath();ctx.moveTo(l0.x,l0.y);ctx.lineTo(l1.x,l1.y);ctx.lineTo(r1.x,r1.y);ctx.lineTo(r0.x,r0.y);ctx.closePath();
    ctx.fillStyle=roadGrad;ctx.fill();
  }

  const drawBarrier=edge=>{
    for(let i=0;i<edge.length;i++){
      const a=projectPoint(edge[i].x,edge[i].y,cam),b=projectPoint(edge[(i+1)%edge.length].x,edge[(i+1)%edge.length].y,cam);
      if(!a||!b||Math.max(a.forward,b.forward)<-65)continue;
      const scale=Math.min(1.3,(a.scale+b.scale)/2);
      ctx.lineCap='round';
      ctx.strokeStyle='#344354';ctx.lineWidth=Math.max(5,18*scale);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
      ctx.strokeStyle='#d9e1e7';ctx.lineWidth=Math.max(4,12*Math.min(1.2,scale));ctx.stroke();
      ctx.strokeStyle='#ffffff';ctx.lineWidth=Math.max(1.5,3*Math.min(1.2,scale));ctx.stroke();
      if(i%6===0){
        ctx.fillStyle='#ffb914';ctx.beginPath();ctx.ellipse((a.x+b.x)/2,(a.y+b.y)/2,Math.max(2,5*a.scale),Math.max(1.5,2.1*a.scale),0,0,Math.PI*2);ctx.fill();
      }
    }
  };
  drawBarrier(g.left);drawBarrier(g.right);

  // Actual course centre line and transverse seams.
  ctx.strokeStyle='rgba(232,251,255,.88)';ctx.lineWidth=3;
  for(let i=0;i<g.samples.length;i+=2){
    const j=(i+1)%g.samples.length,a=projectPoint(g.samples[i].x,g.samples[i].y,cam),b=projectPoint(g.samples[j].x,g.samples[j].y,cam);
    if(!a||!b||Math.max(a.forward,b.forward)<0)continue;
    ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
  }
  for(let i=0;i<g.samples.length;i+=10){
    const a=projectPoint(g.left[i].x,g.left[i].y,cam),b=projectPoint(g.right[i].x,g.right[i].y,cam);
    if(!a||!b||Math.max(a.forward,b.forward)<10)continue;
    ctx.strokeStyle='rgba(222,249,255,.48)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
  }

  // Repeated chevrons show the correct race direction on every section.
  drawDirectionChevrons(t,cam);

  // Start/finish checker spans the full width of THIS course.
  const finish=finishLine(t),rows=12,cols=2,acrossStep=(finish.half*2)/rows,alongStep=finish.thickness/cols;
  drawProjectedQuad(finishCellQuad(finish,-finish.half,finish.half,-finish.thickness/2,finish.thickness/2),'#ffffff');
  for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
    const a0=-finish.half+row*acrossStep,a1=a0+acrossStep,l0=-finish.thickness/2+col*alongStep,l1=l0+alongStep;
    drawProjectedQuad(finishCellQuad(finish,a0,a1,l0,l1),(row+col)%2?'#ffffff':'#092c45');
  }

  t.boosts.forEach(spec=>{
    const q=trackFeatureQuad(spec,t);
    if(drawProjectedQuad(q,'#ffd116','#fff0a2',2)){
      const f=featureAt(spec,t),p=projectPoint(f.x,f.y,cam);
      if(p&&p.forward>12){ctx.fillStyle='#063b5d';ctx.font=`${Math.max(10,Math.min(22,13*p.scale))}px Fredoka`;ctx.textAlign='center';ctx.fillText('BOOST',p.x,p.y)}
    }
  });
  t.slow.forEach(spec=>drawProjectedQuad(trackFeatureQuad(spec,t),'rgba(92,61,191,.48)'));

  t.bumpers.map(spec=>({...featureAt(spec,t),spec})).sort((a,b)=>{
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

function projectedDiscPath(p,radius=DISC_COLLISION_R,cam=cameraForView(),lift=0){
  const pts=[];
  for(let i=0;i<28;i++){
    const a=i/28*Math.PI*2;
    const worldX=p.x+Math.cos(a)*radius,worldY=p.y+Math.sin(a)*radius;
    const sp=projectPoint(worldX,worldY,cam);
    if(!sp)return null;
    pts.push({x:sp.x,y:sp.y-lift*sp.scale});
  }
  return pts;
}
function fillProjectedPath(points,fill,stroke=null,width=1){
  if(!points?.length)return;
  ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);
  for(let i=1;i<points.length;i++)ctx.lineTo(points[i].x,points[i].y);
  ctx.closePath();ctx.fillStyle=fill;ctx.fill();
  if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke()}
}
function drawDiscs(){
  if(!game)return;
  const cam=cameraForView();
  const visible=game.players
    .map((p,i)=>({p,i,sp:projectPoint(p.x,p.y,cam)}))
    .filter(x=>x.sp&&x.sp.forward>-80)
    .sort((a,b)=>b.sp.depth-a.sp.depth);

  visible.forEach(({p,i,sp})=>{
    const active=i===game.current&&!game.winner;
    const footprint=projectedDiscPath(p,DISC_COLLISION_R,cam,0);
    if(!footprint)return;

    // Shadow matches the real collision footprint, so physical contact and
    // visible contact stay aligned even with perspective/depth differences.
    const shadow=footprint.map(q=>({x:q.x+2,y:q.y+5}));
    fillProjectedPath(shadow,'rgba(0,0,0,.20)');

    // Thin puck body and top face, both based on the same world footprint.
    const body=projectedDiscPath(p,DISC_COLLISION_R,cam,3.2);
    fillProjectedPath(body,'rgba(0,0,0,.20)');
    const top=projectedDiscPath(p,DISC_COLLISION_R,cam,5.4);
    fillProjectedPath(top,p.color,active?'#ffffff':'rgba(8,47,104,.72)',active?4:2);

    // Small highlight and player number stay screen-space for legibility.
    const label=projectPoint(p.x,p.y,cam);
    if(label){
      const rr=Math.max(8,DISC_COLLISION_R*label.scale);
      ctx.beginPath();ctx.ellipse(label.x-rr*.24,label.y-5*label.scale-rr*.12,rr*.20,rr*.07,0,0,Math.PI*2);
      ctx.fillStyle='rgba(255,255,255,.58)';ctx.fill();
      if(rr>13){
        ctx.fillStyle='#082f68';ctx.font=`800 ${Math.max(10,rr*.62)}px Fredoka`;
        ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.fillText(String(i+1),label.x,label.y-5*label.scale);
      }
    }
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
function draw(){updateCameraHeading();drawTrack();drawDiscs();drawAim()}
function pointerPoint(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*canvas.width/r.width,y:(e.clientY-r.top)*canvas.height/r.height}}
function resetLook(){lookDrag=null;lookYaw=0;lookPitch=0}
function onPointerDown(e){
  if(!localCanShoot())return;
  const q=pointerPoint(e),p=activePlayer(),sp=projectPoint(p.x,p.y);
  if(!sp)return;
  canvas.setPointerCapture?.(e.pointerId);
  const discHit=Math.hypot(q.x-sp.x,q.y-sp.y)<=Math.max(82,DISC_COLLISION_R*sp.scale*1.5);
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
  else handleAuthoritativeFlick(p.id,vx,vy);
  e.preventDefault();
}

function processCheckpoints(previous=[]){
  if(!game)return;
  const t=track();
  game.players.forEach((p,i)=>{
    if(p.finished||p.pendingFinish)return;
    const current=nearestTrackPoint(p.x,p.y,t),prev=previous[i]?nearestTrackPoint(previous[i].x,previous[i].y,t):null;
    const progress=current.progress;
    if(p.nextCheckpoint===1&&progress>=.20&&progress<.45)p.nextCheckpoint=2;
    else if(p.nextCheckpoint===2&&progress>=.45&&progress<.70)p.nextCheckpoint=3;
    else if(p.nextCheckpoint===3&&progress>=.70&&progress<.93)p.nextCheckpoint=4;

    const forwardDot=p.vx*current.tx+p.vy*current.ty;
    const crossedFinish=p.nextCheckpoint===4&&prev&&prev.progress>.82&&progress<.18&&forwardDot>-.05;
    p.trackProgress=progress;
    if(crossedFinish){
      p.lap++;p.nextCheckpoint=1;
      if(p.lap>=game.laps){
        p.pendingFinish=true;
        game.finishSequence=(Number(game.finishSequence)||0)+1;
        p.finishCrossedAt=game.finishSequence;
      }
    }
  });
}

function roadClearContains(x,y){
  return nearestTrackPoint(x,y).distance<=trackGeometry().halfWidth-DISC_R;
}
function applyWalls(p){
  const sx=p.vx*.5,sy=p.vy*.5,target={x:p.x+sx,y:p.y+sy};
  if(roadClearContains(target.x,target.y)){p.x=target.x;p.y=target.y;return}

  let lo=0,hi=1;
  for(let i=0;i<9;i++){
    const mid=(lo+hi)/2,x=p.x+sx*mid,y=p.y+sy*mid;
    if(roadClearContains(x,y))lo=mid;else hi=mid;
  }
  p.x+=sx*lo;p.y+=sy*lo;

  const hitX=p.x+sx*Math.max(.025,hi-lo),hitY=p.y+sy*Math.max(.025,hi-lo),nearest=nearestTrackPoint(hitX,hitY);
  let nx=hitX-nearest.x,ny=hitY-nearest.y,m=Math.hypot(nx,ny);
  if(m<.001){
    const side=((p.x-nearest.x)*nearest.nx+(p.y-nearest.y)*nearest.ny)>=0?1:-1;
    nx=nearest.nx*side;ny=nearest.ny*side;m=1;
  }
  nx/=m;ny/=m;

  const into=p.vx*nx+p.vy*ny;
  if(into>0){
    const tx=p.vx-into*nx,ty=p.vy-into*ny;
    const tangentSpeed=Math.hypot(tx,ty);
    const rebound=Math.min(into*RAIL_RESTITUTION,tangentSpeed*.45+.9);
    p.vx=tx*RAIL_TANGENT_DAMP-rebound*nx;
    p.vy=ty*RAIL_TANGENT_DAMP-rebound*ny;
  }
  p.x-=nx*2.4;p.y-=ny*2.4;
}

function applyBumpers(p){
  const t=track();
  t.bumpers.forEach(spec=>{
    const b=featureAt(spec,t),dx=p.x-b.x,dy=p.y-b.y,d=Math.hypot(dx,dy),min=DISC_R+b.r;
    if(d>0&&d<min){
      const nx=dx/d,ny=dy/d,dot=p.vx*nx+p.vy*ny;
      p.x=b.x+nx*(min+1);p.y=b.y+ny*(min+1);
      const normalKick=Math.max(0,-dot)*.55;
      p.vx=(p.vx-dot*nx)+normalKick*nx;
      p.vy=(p.vy-dot*ny)+normalKick*ny;
      p.vx*=.9;p.vy*=.9;
    }
  });
}

function applyDiscCollisions(){
  const ps=game.players;
  for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++){
    const a=ps[i],b=ps[j],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),min=DISC_COLLISION_R*2;
    if(d>0&&d<min){
      const nx=dx/d,ny=dy/d,over=min-d;a.x-=nx*over/2;a.y-=ny*over/2;b.x+=nx*over/2;b.y+=ny*over/2;
      const va=a.vx*nx+a.vy*ny,vb=b.vx*nx+b.vy*ny,swap=(vb-va)*.92;
      a.vx+=swap*nx;a.vy+=swap*ny;b.vx-=swap*nx;b.vy-=swap*ny;
    }
  }
}
function applySurface(p,boosted){
  const t=track();let friction=FRICTION;
  if(t.slow.some(s=>hitTrackFeature(p,s,t)))friction=.95;
  p.vx*=friction;p.vy*=friction;
  if(!boosted.has(p.id)){
    for(const b of t.boosts){
      if(hitTrackFeature(p,b,t)){p.vx*=1.28;p.vy*=1.28;boosted.add(p.id);break}
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
      draw();renderMotionHud();
      if(moving&&steps<STEPS_MAX)requestAnimationFrame(frame);else resolve();
    };
    requestAnimationFrame(frame);
  });
  game.players.forEach(p=>{p.vx=0;p.vy=0;p.turboHeld=false});
  turboHolding=false;animating=false;
}
function clearTurnEndTimer(){
  if(turnEndTimer){clearTimeout(turnEndTimer);turnEndTimer=null}
}
function scheduleTurnEnd(){
  clearTurnEndTimer();
  if(!game||game.winner||game.phase!=='settled')return;
  game.turnEndsAt=Date.now()+TURN_END_DELAY;
  renderHudOnly();
  if(mode==='multi'&&role==='host')broadcastState();
  if(mode==='local'||role==='host'){
    turnEndTimer=setTimeout(()=>{
      turnEndTimer=null;
      if(game&&!game.winner&&game.phase==='settled')completeTurn();
    },TURN_END_DELAY);
  }
}
function addSecondFlickImpulse(p,vx,vy){
  const addX=clamp(vx,-36,36)*SECOND_FLICK_SCALE,addY=clamp(vy,-36,36)*SECOND_FLICK_SCALE;
  p.vx+=addX;p.vy+=addY;
  const speed=Math.hypot(p.vx,p.vy),max=34;
  if(speed>max){const scale=max/speed;p.vx*=scale;p.vy*=scale}
}
function applySecondFlick(playerId,vx,vy,force=false){
  if(!game||game.winner||game.phase!=='moving'||!animating)return false;
  const p=activePlayer();if(!p||p.id!==playerId)return false;
  if(!force&&(game.flicksUsed!==1||Math.hypot(p.vx,p.vy)<=.18))return false;
  if(game.flicksUsed>=2)return false;
  game.flicksUsed=2;
  addSecondFlickImpulse(p,vx,vy);
  resetLook();renderHudOnly();draw();
  return true;
}
function handleAuthoritativeFlick(playerId,vx,vy){
  if(!game||game.winner)return;
  if(game.phase==='aim'&&game.flicksUsed===0){
    startAuthoritativeFlick(playerId,vx,vy);
    return;
  }
  if(game.phase==='moving'&&game.flicksUsed===1){
    const changed=applySecondFlick(playerId,vx,vy);
    if(changed&&mode==='multi'&&role==='host'){
      session?.broadcast({type:'second-flick-start',playerId,vx,vy});
    }
  }
}
async function startAuthoritativeFlick(playerId,vx,vy){
  if(!game||game.winner||animating||game.phase!=='aim'||game.flicksUsed!==0)return;
  clearTurnEndTimer();
  const p=activePlayer();if(!p||p.id!==playerId)return;
  game.phase='moving';game.flicksUsed=1;game.turnEndsAt=0;p.turboHeld=false;turboHolding=false;
  p.vx=clamp(vx,-36,36);p.vy=clamp(vy,-36,36);
  if(mode==='multi'&&role==='host')session?.broadcast({type:'flick-start',playerId:p.id,vx:p.vx,vy:p.vy});
  await animatePhysics();
  game.phase=game.winner?'finished':'settled';
  renderRace();
  if(!game.winner)scheduleTurnEnd();
  if(mode==='multi'&&role==='host')broadcastState();
}
async function playRemoteFlick(msg){
  if(!game||animating)return;
  const p=game.players.find(x=>x.id===msg.playerId);if(!p)return;
  game.phase='moving';game.flicksUsed=1;game.turnEndsAt=0;p.turboHeld=false;
  p.vx=Number(msg.vx)||0;p.vy=Number(msg.vy)||0;
  await animatePhysics();
  if(!game.winner)game.phase='settled';
  if(pendingSnapshot){const finalState=pendingSnapshot;pendingSnapshot=null;applySnapshot(finalState)}else renderRace();
}
function completeTurn(){
  if(!game||game.winner||game.phase!=='settled')return;
  clearTurnEndTimer();
  game.players.forEach(p=>p.turboHeld=false);
  turboHolding=false;

  const finishers=game.players
    .filter(p=>p.pendingFinish&&!p.finished)
    .sort((a,b)=>(a.finishCrossedAt||0)-(b.finishCrossedAt||0));
  if(finishers.length){
    const winner=finishers[0];
    winner.pendingFinish=false;
    winner.finished=true;
    game.winner={id:winner.id,name:winner.name,turn:game.turn};
    game.phase='finished';
    game.turnEndsAt=0;
    resetLook();renderRace();
    if(mode==='multi'&&role==='host')broadcastState();
    return;
  }

  nextTurn();game.phase='aim';resetLook();renderRace();
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
  if(p.pendingFinish)return game.laps+1;
  const progress=nearestTrackPoint(p.x,p.y).progress;
  p.trackProgress=progress;
  return p.lap+progress;
}

function ordinal(n){
  const m=n%100;if(m>=11&&m<=13)return n+'TH';
  return n+({1:'ST',2:'ND',3:'RD'}[n%10]||'TH');
}
function playerPosition(player){
  const ordered=[...game.players].sort((a,b)=>raceProgress(b)-raceProgress(a));
  return Math.max(1,ordered.findIndex(p=>p.id===player.id)+1);
}
function renderMotionHud(){
  if(!game)return;
  const p=activePlayer(),phase=game.phase||'aim';
  const turboCharge=clamp(Number(p?.turboCharge)||0,0,1),canTurbo=localCanTurbo();
  $('turboFill').style.height=`${Math.round(turboCharge*100)}%`;
  $('turboState').textContent=p?.turboHeld?'BOOSTING':p?.turboReady?'READY — HOLD':`CHARGING ${Math.round(turboCharge*100)}%`;
  $('turboButton').disabled=!canTurbo;
  $('turboButton').classList.toggle('ready',!!p?.turboReady&&!p?.turboHeld);
  $('turboButton').classList.toggle('active',!!p?.turboHeld);

  const secondAvailable=game.flicksUsed<2&&(phase==='aim'||(phase==='moving'&&Math.hypot(p?.vx||0,p?.vy||0)>.18));
  const secondUsed=game.flicksUsed>=2,second=$('secondFlickStatus');
  second.classList.toggle('available',secondAvailable&&!secondUsed);
  second.classList.toggle('used',secondUsed);
  $('secondFlickText').textContent=secondUsed?'USED':phase==='settled'?'NOT USED':'AVAILABLE';
}

function renderHudOnly(){
  if(!game)return;
  const p=activePlayer(),yourShot=localCanShoot(),yourFinish=localCanFinish(),phase=game.phase||'aim';
  const turboCharge=clamp(Number(p?.turboCharge)||0,0,1),canTurbo=localCanTurbo();
  const secondAvailable=game.flicksUsed<2&&(phase==='aim'||(phase==='moving'&&Math.hypot(p?.vx||0,p?.vy||0)>.18));
  const secondUsed=game.flicksUsed>=2;

  $('turnText').textContent=game.winner?`${game.winner.name} wins!`:p?`${p.name}${(yourShot||yourFinish||canTurbo)?' — your turn':''}`:'—';
  const finishPending=!!p?.pendingFinish;
  $('turnHint').textContent=game.winner?'Race complete':
    phase==='moving'&&finishPending?
      (secondAvailable&&yourShot?'Finish crossed — second flick still available':
       p?.turboHeld?'Finish crossed — Turbo boosting':
       canTurbo?'Finish crossed — hold Turbo to boost':'Finish crossed — complete your turn'):
    phase==='moving'?
      (secondAvailable&&yourShot?'Disc moving — second flick available':
       p?.turboHeld?'Turbo boosting — release to save charge':
       canTurbo?'Disc moving — hold Turbo to boost':'Disc moving…'):
    phase==='settled'?
      (yourFinish?(finishPending?'Finish crossed — finish your turn':'Finish Turn now · automatic handoff in 3 seconds'):`Waiting for ${p?.name||'player'}`):
    yourShot?'Drag anywhere to look around · drag from your disc to flick':`Waiting for ${p?.name||'player'}`;
  $('turnBanner').classList.toggle('yours',(yourShot||yourFinish||canTurbo)&&!game.winner);$('turnBanner').classList.toggle('finished',!!game.winner);

  $('turboFill').style.height=`${Math.round(turboCharge*100)}%`;
  $('turboState').textContent=p?.turboHeld?'BOOSTING':p?.turboReady?'READY — HOLD':`CHARGING ${Math.round(turboCharge*100)}%`;
  $('turboButton').disabled=!canTurbo;
  $('turboButton').classList.toggle('ready',!!p?.turboReady&&!p?.turboHeld);
  $('turboButton').classList.toggle('active',!!p?.turboHeld);

  const second=$('secondFlickStatus');
  second.classList.toggle('available',secondAvailable&&!secondUsed);
  second.classList.toggle('used',secondUsed);
  $('secondFlickText').textContent=secondUsed?'USED':phase==='settled'?'NOT USED':'AVAILABLE';

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
  session.updateHost({hostName:`${p?.name||'Host'}'s Disc Rally`,player:p,started:false,raceMode:'disc-rally',trackName:selectedTrackLabel(),totalRaces:selectedLaps});
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
    const p=roster().find(x=>x.id===localPlayerId);
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
  wrap.innerHTML=open.map(h=>`<button class="hostCard" type="button" data-host="${esc(h.peerId)}"><div><strong>${esc(h.hostName||"Disc Rally")}</strong><small>${esc(h.trackName||'Track')} · ${Number(h.totalRaces)||3} laps · ${Number(h.playerCount)||1}/4 players</small></div><span>JOIN</span></button>`).join('');
}
async function joinHost(peerId){
  const p=roster().find(x=>x.id===$('joinPlayer').value);if(!p)return;
  localPlayerId=p.id;$('joinStatus').textContent='Joining…';
  try{await session.joinHost(peerId,{player:p});session.sendToHost({type:'hello',player:p});$('joinStatus').textContent='Connected';renderHosts([])}
  catch(err){console.error(err);$('joinStatus').textContent=err?.message||'Join failed';}
}
function broadcastLobby(){if(role==='host')session?.broadcast({type:'lobby',players:lobbyPlayers(),trackId:selectedTrack,laps:selectedLaps})}
function networkMessage(msg,source){
  if(role==='host'){
    if(msg.type==='hello'&&source.peer){source.peer.meta.player={id:String(msg.player?.id||uid()),name:String(msg.player?.name||'Friend').slice(0,24)};renderLobby('hostLobby',lobbyPlayers());$('startHost').disabled=lobbyPlayers().length<2;broadcastLobby();return}
    if(msg.type==='flick'){const p=activePlayer();if(p&&source.peer?.meta?.player?.id===p.id&&msg.playerId===p.id)handleAuthoritativeFlick(p.id,Number(msg.vx)||0,Number(msg.vy)||0);return}
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
    if(msg.type==='lobby'){connectedLobby=Array.isArray(msg.players)?msg.players:[];selectedTrack=msg.trackId||selectedTrack;selectedLaps=Number(msg.laps)||3;renderLapChoices();renderLobby('joinLobby',connectedLobby);return}
    if(msg.type==='start'&&msg.state){mode='multi';applySnapshot(msg.state);return}
    if(msg.type==='flick-start'){playRemoteFlick(msg);return}
    if(msg.type==='second-flick-start'){applySecondFlick(String(msg.playerId||''),Number(msg.vx)||0,Number(msg.vy)||0,true);return}
    if(msg.type==='turbo-hold'){applyTurboHeld(String(msg.playerId||''),!!msg.held,true);return}
    if(msg.type==='state'){if(animating)pendingSnapshot=msg.state;else applySnapshot(msg.state);return}
  }
}
function startHostRace(){
  const players=lobbyPlayers();if(players.length<2)return;
  const button=$('startHost');button.disabled=true;
  mode='multi';role='host';localPlayerId=$('hostPlayer').value;
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
  mode='local';role=null;localPlayerId='';game=buildRace(players,selectedLaps);renderRace();showView('raceView');
}
function leaveRace(){
  clearTurnEndTimer();resetSession();game=null;drag=null;lookDrag=null;animating=false;turboHolding=false;resetLook();mode='local';role=null;renderPlayerPicks();renderTrackSummary();showView('modeView');
}
function openTrackPicker(returnView){
  trackSelectReturn=returnView;
  const back=$('trackSelectBack');if(back)back.dataset.back=returnView;
  renderTracks('trackGrid');
  showView('trackSelectView');
}
function bind(){
  try{
    renderPlayerPicks();
    syncPlayerSelects();
    renderTracks('localTracks');
    renderTracks('hostTracks');
    renderTracks('trackGrid');
    renderTrackSummary();
    renderLapChoices();
  }catch(err){
    console.error('Disc Rally initial setup render failed',err);
  }

  $('localMode').onclick=()=>{
    $('localStatus').textContent='';
    renderPlayerPicks();renderTrackSummary();showView('localSetup');
  };
  $('multiMode').onclick=()=>showView('multiSetup');
  $('openSettings').onclick=()=>showView('settingsView');
  $('openTrackSelection').onclick=()=>openTrackPicker('localSetup');
  $('hostOpenTrackSelection').onclick=()=>openTrackPicker('hostSetup');

  $$('[data-back]').forEach(b=>b.onclick=()=>{
    if(currentView==='hostSetup'||currentView==='joinSetup')resetSession();
    showView(b.dataset.back);
  });

  $('addPassPlayer').onclick=e=>{
    e.stopPropagation();
    $('passRosterOptions').classList.toggle('hidden');
  };
  $('removePassPlayer').onclick=()=>{
    const picked=selectedLocal();picked.pop();write(LOCAL_PICK_KEY,picked);renderPlayerPicks();
  };

  $('startLocal').onclick=startLocalRace;
  $('hostMode').onclick=()=>{
    showView('hostSetup');syncPlayerSelects();renderTrackSummary();startHostDiscovery();
  };
  $('joinMode').onclick=()=>{showView('joinSetup');syncPlayerSelects();startScan()};
  $('restartHostDiscovery').onclick=startHostDiscovery;
  $('restartScan').onclick=startScan;
  $('hostPlayer').onchange=()=>{localPlayerId=$('hostPlayer').value;updateHostAdvert();renderLobby('hostLobby',lobbyPlayers());broadcastLobby()};
  $$('[data-laps]').forEach(btn=>btn.onclick=()=>setLapCount(btn.dataset.laps));
  $('joinPlayer').onchange=()=>{
    localPlayerId=$('joinPlayer').value;
    const p=roster().find(x=>x.id===localPlayerId);
    if(role==='client'&&session?.peers?.().length&&p)session.sendToHost({type:'hello',player:p});
  };

  $('startHost').onclick=startHostRace;
  $('exitRace').onclick=leaveRace;
  $('finishTurnButton').onclick=requestFinishTurn;
  const raceSurface=$('raceView');
  ['selectstart','contextmenu','dragstart'].forEach(type=>{
    raceSurface.addEventListener(type,e=>e.preventDefault());
  });

  const turboButton=$('turboButton');
  turboButton.addEventListener('touchstart',e=>e.preventDefault(),{passive:false});
  turboButton.addEventListener('contextmenu',e=>e.preventDefault());
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
    const picker=$('passRosterOptions');
    const player=e.target.closest('[data-pass-player]');
    if(player){
      let picked=selectedLocal(),id=player.dataset.passPlayer;
      if(picked.includes(id))picked=picked.filter(x=>x!==id);else if(picked.length<4)picked.push(id);
      write(LOCAL_PICK_KEY,picked);renderPlayerPicks();
      picker?.classList.add('hidden');
      return;
    }
    if(picker && !picker.classList.contains('hidden') && !e.target.closest('#passRosterOptions') && !e.target.closest('#addPassPlayer')){
      picker.classList.add('hidden');
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