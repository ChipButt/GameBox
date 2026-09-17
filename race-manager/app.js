(() => {
  'use strict';

  const SAVE_KEY = 'gamebox-gridline-v2';
  const POINTS = [25,18,15,12,10,8,6,4,2,1,0,0];
  const BOT_NAMES = ['Apex North','Redline Works','Vector GP','Copper Fox','Nightshift','Kestrel','Orion Motorsport','Blackbird','Summit Racing','Halo Autosport','Cinder Team','Blue Arrow','Forge Racing','Velocity Union'];
  const TRACKS = [
    {id:'harbour', name:'Harbour Sprint', discipline:'Open Wheel', laps:8, weather:'Dry', bias:'balanced', reward:420, difficulty:58},
    {id:'alpine', name:'Alpine Ring', discipline:'Open Wheel', laps:10, weather:'Cool', bias:'grip', reward:520, difficulty:62},
    {id:'desert', name:'Desert Oval', discipline:'Stock Car', laps:12, weather:'Hot', bias:'speed', reward:610, difficulty:66},
    {id:'forest', name:'Forest Stage', discipline:'Rally', laps:7, weather:'Damp', bias:'control', reward:680, difficulty:69}
  ];

  const DEFAULT_STATE = {
    team:{name:'Gridline Racing', credits:2500, fans:0, division:'Rookie'},
    selectedDriver:'d1', selectedCar:'c1',
    drivers:[
      {id:'d1',name:'Alex Vale',level:1,xp:0,pace:68,racecraft:65,consistency:64,focus:67},
      {id:'d2',name:'Maya Hart',level:1,xp:0,pace:64,racecraft:69,consistency:70,focus:62}
    ],
    cars:[
      {id:'c1',name:'GX-01',discipline:'Open Wheel',owned:true,level:1,speed:66,accel:64,grip:65,reliability:67},
      {id:'c2',name:'Thunder 8',discipline:'Stock Car',owned:false,cost:3200,level:1,speed:70,accel:60,grip:58,reliability:72},
      {id:'c3',name:'Trailhawk R',discipline:'Rally',owned:false,cost:4200,level:1,speed:61,accel:66,grip:73,reliability:69}
    ],
    workshop:{engine:1,aero:1,tyres:1,pit:1},
    championship:{round:1,points:0,season:1,botPoints:{}}, history:[]
  };

  let state, raceTimer=null, hostPending=null, hostPeers=[], joinPeer=null, joinChannel=null;
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const clone=o=>JSON.parse(JSON.stringify(o));
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
  const average=a=>a.reduce((x,y)=>x+y,0)/Math.max(1,a.length);
  const money=n=>Math.round(Number(n)||0).toLocaleString('en-GB');
  const uid=()=>Math.random().toString(36).slice(2,10);

  function escapeHtml(v){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
  function initials(name){return String(name).trim().split(/\s+/).filter(Boolean).map(x=>x[0]).join('').slice(0,2).toUpperCase()||'CI';}
  function capitalize(s){s=String(s||'');return s?s[0].toUpperCase()+s.slice(1):'';}

  function mergeState(saved){
    const base=clone(DEFAULT_STATE);
    if(!saved||typeof saved!=='object')return base;
    base.team=Object.assign(base.team,saved.team||{});
    base.selectedDriver=saved.selectedDriver||base.selectedDriver;
    base.selectedCar=saved.selectedCar||base.selectedCar;
    if(Array.isArray(saved.drivers)&&saved.drivers.length)base.drivers=saved.drivers;
    if(Array.isArray(saved.cars)&&saved.cars.length)base.cars=saved.cars;
    base.workshop=Object.assign(base.workshop,saved.workshop||{});
    base.championship=Object.assign(base.championship,saved.championship||{});
    base.championship.botPoints=Object.assign({},(saved.championship&&saved.championship.botPoints)||{});
    base.history=Array.isArray(saved.history)?saved.history:[];
    return base;
  }
  function loadState(){
    try{const raw=localStorage.getItem(SAVE_KEY)||localStorage.getItem('gamebox-gridline-v1');return raw?mergeState(JSON.parse(raw)):clone(DEFAULT_STATE);}
    catch(err){console.warn('Could not load Gridline save',err);return clone(DEFAULT_STATE);}
  }
  function persist(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(state));}catch(err){console.warn('Could not save Gridline progress',err);}}

  function driverRating(d){return d?Math.round(average([d.pace,d.racecraft,d.consistency,d.focus])+(d.level-1)*1.5):0;}
  function carRating(c){return c?Math.round(average([c.speed,c.accel,c.grip,c.reliability])+(c.level-1)*1.5):0;}
  function workshopBonus(){const w=state.workshop;return((w.engine||1)+(w.aero||1)+(w.tyres||1)+(w.pit||1)-4)*.7;}
  function currentDriver(){return state.drivers.find(d=>d.id===state.selectedDriver)||state.drivers[0];}
  function currentCar(){return state.cars.find(c=>c.id===state.selectedCar&&c.owned)||state.cars.find(c=>c.owned)||state.cars[0];}
  function teamRating(driverId=state.selectedDriver,carId=state.selectedCar){const d=state.drivers.find(x=>x.id===driverId)||currentDriver(),c=state.cars.find(x=>x.id===carId&&x.owned)||currentCar();return Math.round(driverRating(d)*.55+carRating(c)*.45+workshopBonus());}

  function toast(text){
    let el=$('#gridToast');
    if(!el){el=document.createElement('div');el.id='gridToast';Object.assign(el.style,{position:'fixed',left:'50%',bottom:'92px',transform:'translateX(-50%)',background:'#082f68',color:'#fff',padding:'10px 15px',borderRadius:'999px',zIndex:'100',fontWeight:'700',boxShadow:'0 10px 30px rgba(8,47,104,.25)',maxWidth:'calc(100% - 28px)',textAlign:'center'});document.body.appendChild(el);}
    el.textContent=text;el.style.display='block';clearTimeout(el._hideTimer);el._hideTimer=setTimeout(()=>el.style.display='none',2300);
  }
  function showFatal(message){
    console.error(message);let box=$('#gridlineFatal');
    if(!box){box=document.createElement('div');box.id='gridlineFatal';box.style.cssText='margin:14px;padding:14px;border-radius:16px;background:#fff3f3;border:1px solid #e2a5aa;color:#7a2030;font:600 14px/1.4 system-ui';($('#mainView')||document.body).prepend(box);}
    box.textContent='Gridline Racing hit an error: '+message;
  }

  function openView(name){
    $$('.view').forEach(v=>v.classList.toggle('active',v.id===`view-${name}`));
    $$('.bottomNav button').forEach(b=>b.classList.toggle('active',b.dataset.open===name));
    if(name==='race')renderRaceSetup();if(name==='multiplayer')renderMultiplayerPlayers();
    try{window.scrollTo({top:0,behavior:'smooth'});}catch(_){window.scrollTo(0,0);}
  }
  function renderTop(){
    const next=TRACKS[(Math.max(1,state.championship.round)-1)%TRACKS.length];
    $('#credits').textContent=money(state.team.credits);$('#fans').textContent=money(state.team.fans);$('#division').textContent=state.team.division;$('#teamName').textContent=state.team.name;
    $('#driverSummary').textContent=`${state.drivers.length} signed · ${teamRating()} rating`;$('#garageSummary').textContent=`${state.cars.filter(c=>c.owned).length} owned`;$('#champSummary').textContent=`${state.championship.points} pts`;
    $('#nextRaceName').textContent=next.name;$('#nextRaceTag').textContent=next.discipline;$('#nextRaceLaps').textContent=`${next.laps} laps`;$('#nextRaceWeather').textContent=`${next.weather} · ${capitalize(next.bias)}`;
  }
  function stat(label,value){const v=clamp(Number(value)||0,0,100);return `<div class="stat"><span><b>${escapeHtml(label)}</b><b>${Math.round(v)}</b></span><div class="statBar"><i style="width:${clamp(v,5,100)}%"></i></div></div>`;}
  function renderDrivers(){
    $('#driverList').innerHTML=state.drivers.map(d=>{const selected=d.id===state.selectedDriver,cost=350+d.level*250;return `<article class="driverCard ${selected?'selectedCard':''}"><div class="cardTop"><div class="avatar">${initials(d.name)}</div><div class="cardIdentity"><h3>${escapeHtml(d.name)}</h3><small>Level ${d.level} · ${d.xp} XP</small></div><div class="ratingBubble">${driverRating(d)}</div></div><div class="statGrid">${stat('Pace',d.pace)}${stat('Racecraft',d.racecraft)}${stat('Consistency',d.consistency)}${stat('Focus',d.focus)}</div><div class="cardActions"><button class="secondaryButton" data-select-driver="${d.id}">${selected?'Selected':'Select'}</button><button class="primaryButton" data-upgrade-driver="${d.id}">Train · ${money(cost)}</button></div></article>`;}).join('');
  }
  function renderCars(){
    $('#carList').innerHTML=state.cars.map(c=>{const selected=c.id===state.selectedCar,upgradeCost=500+c.level*320,action=c.owned?`<button class="secondaryButton" data-select-car="${c.id}">${selected?'Selected':'Select'}</button><button class="primaryButton" data-upgrade-car="${c.id}">Upgrade · ${money(upgradeCost)}</button>`:`<button class="primaryButton full" data-buy-car="${c.id}">Buy · ${money(c.cost)}</button>`,icon=c.discipline==='Rally'?'R':c.discipline==='Stock Car'?'S':'OW';return `<article class="carCard ${selected?'selectedCard':''}"><div class="cardTop"><div class="avatar">${icon}</div><div class="cardIdentity"><h3>${escapeHtml(c.name)}</h3><small>${escapeHtml(c.discipline)} · Level ${c.level}</small></div><div class="ratingBubble">${carRating(c)}</div></div><div class="statGrid">${stat('Speed',c.speed)}${stat('Acceleration',c.accel)}${stat('Grip',c.grip)}${stat('Reliability',c.reliability)}</div><div class="cardActions">${action}</div></article>`;}).join('');
    const names={engine:'Engine Lab',aero:'Aero Bay',tyres:'Tyre Lab',pit:'Pit Crew'};
    $('#workshopUpgrades').innerHTML=Object.keys(state.workshop).map(key=>{const level=state.workshop[key],cost=700+level*500;return `<div class="upgradeRow"><div><strong>${names[key]}</strong><p>Level ${level} · boosts race performance</p></div><button class="primaryButton" data-upgrade-workshop="${key}">${money(cost)}</button></div>`;}).join('');
  }
  function ensureTrackOptions(){const html=TRACKS.map(t=>`<option value="${t.id}">${escapeHtml(t.name)} · ${escapeHtml(t.discipline)}</option>`).join(''),r=$('#raceTrack'),m=$('#multiTrack');if(r&&!r.options.length)r.innerHTML=html;if(m&&!m.options.length)m.innerHTML=html;}
  function renderRaceSetup(){
    ensureTrackOptions();const raceTrack=$('#raceTrack'),raceDriver=$('#raceDriver'),raceCar=$('#raceCar');if(!raceTrack||!raceDriver||!raceCar)return;
    const track=TRACKS.find(t=>t.id===raceTrack.value)||TRACKS[0],oldDriver=raceDriver.value||state.selectedDriver,oldCar=raceCar.value||state.selectedCar;
    raceDriver.innerHTML=state.drivers.map(d=>`<option value="${d.id}">${escapeHtml(d.name)} · ${driverRating(d)}</option>`).join('');raceDriver.value=state.drivers.some(d=>d.id===oldDriver)?oldDriver:state.drivers[0].id;
    let owned=state.cars.filter(c=>c.owned&&c.discipline===track.discipline);if(!owned.length)owned=state.cars.filter(c=>c.owned);
    raceCar.innerHTML=owned.map(c=>`<option value="${c.id}">${escapeHtml(c.name)} · ${carRating(c)}</option>`).join('');raceCar.value=owned.some(c=>c.id===oldCar)?oldCar:(owned[0]?owned[0].id:'');renderRaceSummary();
  }
  function renderRaceSummary(){const rt=$('#raceTrack'),rd=$('#raceDriver'),rc=$('#raceCar'),summary=$('#raceSetupSummary');if(!rt||!rd||!rc||!summary)return;const track=TRACKS.find(t=>t.id===rt.value)||TRACKS[0],d=state.drivers.find(x=>x.id===rd.value)||currentDriver(),c=state.cars.find(x=>x.id===rc.value)||currentCar();if(!d||!c){summary.textContent='No valid driver/car combination available.';return;}const rating=Math.round(driverRating(d)*.55+carRating(c)*.45+workshopBonus()+(c.discipline===track.discipline?3:-8));summary.innerHTML=`<div class="summaryStat"><span>Team rating</span><strong>${rating}</strong></div><div class="summaryStat"><span>Difficulty</span><strong>${track.difficulty}</strong></div><div class="summaryStat"><span>Reward</span><strong>${money(track.reward)}</strong></div>`;}

  function seeded(seed){let s=seed>>>0;return()=>{s+=0x6D2B79F5;let t=s;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
  function shuffle(arr,rng=Math.random){for(let i=arr.length-1;i>0;i--){const j=Math.floor(rng()*(i+1)),tmp=arr[i];arr[i]=arr[j];arr[j]=tmp;}return arr;}
  function buildSoloEntrants(track,driverId,carId,seed){
    const rng=seeded(seed),d=state.drivers.find(x=>x.id===driverId)||currentDriver(),c=state.cars.find(x=>x.id===carId)||currentCar();if(!d||!c)throw new Error('No driver or car available');
    let biasBonus=0;if(track.bias==='speed')biasBonus=(c.speed-65)*.08;else if(track.bias==='grip')biasBonus=(c.grip-65)*.08;else if(track.bias==='control')biasBonus=((d.consistency+d.focus)/2-65)*.08;
    const power=driverRating(d)*.55+carRating(c)*.45+workshopBonus()+(c.discipline===track.discipline?3:-8)+biasBonus,entrants=[{id:'you',name:state.team.name,power,kind:'player',local:true}];
    shuffle(BOT_NAMES.slice(),rng).slice(0,11).forEach((name,i)=>entrants.push({id:`b${i}`,name,power:track.difficulty-8+rng()*19,kind:'bot'}));return entrants;
  }
  function simulateRace(track,entrants,seed){
    const rng=seeded(seed),progress=entrants.map(e=>Object.assign({},e,{p:0,speed:0,finishTick:null})),frames=[];let tick=0;
    while(progress.some(e=>e.p<100)&&tick<120){tick++;progress.forEach(e=>{if(e.p>=100)return;const variance=(rng()-.5)*2.9,incident=rng()<.018?-(2+rng()*5):0,surge=rng()<.05?rng()*3.5:0;e.speed=Math.max(.55,1.55+(e.power-55)*.027+variance*.16+incident*.12+surge*.12);e.p=Math.min(100,e.p+e.speed);if(e.p>=100&&e.finishTick===null)e.finishTick=tick+(1-rng())*.25;});frames.push(progress.map(e=>({id:e.id,p:e.p})));}
    progress.forEach(e=>{if(e.finishTick===null)e.finishTick=999+(100-e.p);});const results=progress.slice().sort((a,b)=>a.finishTick-b.finishTick);results.forEach((e,i)=>e.position=i+1);return{frames,results};
  }
  function startSoloRace(){
    try{if(raceTimer){clearInterval(raceTimer);raceTimer=null;}const track=TRACKS.find(t=>t.id===$('#raceTrack').value)||TRACKS[0],driverId=$('#raceDriver').value,carId=$('#raceCar').value;state.selectedDriver=driverId;state.selectedCar=carId;persist();const seed=(Date.now()&0xffffffff)>>>0,entrants=buildSoloEntrants(track,driverId,carId,seed),sim=simulateRace(track,entrants,seed);runRaceAnimation(track,entrants,sim,{mode:'solo'});}catch(err){console.error(err);toast('Race could not start');showFatal(err.message||String(err));}
  }
  function runRaceAnimation(track,entrants,sim,opts={}){
    openView('race');const arena=$('#raceArena'),result=$('#raceResult');arena.classList.remove('hidden');result.classList.add('hidden');$('#liveRaceTitle').textContent=opts.mode==='multi'?`${track.name} · Local Race`:track.name;
    $('#raceLanes').innerHTML=entrants.map((e,i)=>`<div class="raceLane ${e.kind==='player'?'player':e.kind==='friend'?'friend':''}" data-racer="${escapeHtml(e.id)}"><span class="position">${i+1}</span><span class="name">${escapeHtml(e.name)}</span><div class="laneTrack"><i class="racerDot"></i></div></div>`).join('');
    let frame=0,total=Math.max(1,sim.frames.length);const update=()=>{const f=sim.frames[frame];if(!f)return;const sorted=f.slice().sort((a,b)=>b.p-a.p),positions={};sorted.forEach((r,i)=>positions[r.id]=i+1);f.forEach(r=>{const row=document.querySelector(`[data-racer="${String(r.id).replace(/"/g,'')}"]`);if(row){const dot=row.querySelector('.racerDot'),pos=row.querySelector('.position');if(dot)dot.style.left=`calc(${Math.min(96,r.p*.96)}% - 10px)`;if(pos)pos.textContent=positions[r.id];}});$('#raceLap').textContent=`Lap ${Math.min(track.laps,Math.max(1,Math.ceil(((frame+1)/total)*track.laps)))}/${track.laps}`;frame++;};
    update();raceTimer=setInterval(()=>{if(frame>=sim.frames.length){clearInterval(raceTimer);raceTimer=null;finishRace(track,sim.results,opts);}else update();},180);
  }
  function finishRace(track,results,opts){
    const box=$('#raceResult');box.classList.remove('hidden');const playerResult=results.find(r=>r.local||r.id==='you'||r.id==='host');let rewardText='';
    if(opts.mode==='solo'&&playerResult){const reward=Math.max(90,Math.round(track.reward*(1.15-(playerResult.position-1)*.055))),fans=Math.max(4,Math.round((13-playerResult.position)*7));state.team.credits+=reward;state.team.fans+=fans;state.championship.points+=POINTS[playerResult.position-1]||0;state.championship.round=state.championship.round>=6?1:state.championship.round+1;updateBotChampionship();state.history.unshift({date:Date.now(),track:track.name,position:playerResult.position,reward});state.history=state.history.slice(0,30);const d=state.drivers.find(x=>x.id===state.selectedDriver);if(d)d.xp+=20+Math.max(0,12-playerResult.position)*2;updateDivision();persist();rewardText=`+${money(reward)} credits · +${fans} fans · +${POINTS[playerResult.position-1]||0} championship points`;}else if(opts.mode==='multi')rewardText='Local multiplayer race complete — bots filled the unused grid slots.';
    box.innerHTML=`<h3>Race result</h3><div class="resultList">${results.map((r,i)=>`<div class="resultRow"><b>${i+1}</b><span>${escapeHtml(r.name)}</span><b>${Math.round(r.power)}</b></div>`).join('')}</div>${rewardText?`<div class="rewardBox">${rewardText}</div>`:''}`;renderAll(false);
  }
  function updateBotChampionship(){BOT_NAMES.slice(0,9).forEach(name=>state.championship.botPoints[name]=(state.championship.botPoints[name]||0)+(POINTS[Math.min(11,Math.floor(Math.random()*9))]||0));}
  function updateDivision(){const f=state.team.fans;state.team.division=f>=1800?'Elite':f>=900?'Pro':f>=350?'Club':'Rookie';}
  function renderStandings(){
    $('#seasonTitle').textContent=`Season ${state.championship.season} · ${state.team.division} Cup`;$('#seasonRound').textContent=`Round ${state.championship.round}/6`;const all=[{name:state.team.name,points:state.championship.points,you:true}];Object.keys(state.championship.botPoints||{}).forEach(name=>all.push({name,points:state.championship.botPoints[name],you:false}));if(all.length===1)BOT_NAMES.slice(0,7).forEach((name,i)=>all.push({name,points:Math.max(0,18-i*2),you:false}));all.sort((a,b)=>b.points-a.points);$('#standings').innerHTML=all.slice(0,10).map((t,i)=>`<div class="standingRow ${t.you?'you':''}"><b>${i+1}</b><span>${escapeHtml(t.name)}${t.you?' · You':''}</span><b>${t.points}</b></div>`).join('');
  }

  function trainDriver(id){const d=state.drivers.find(x=>x.id===id);if(!d)return;const cost=350+d.level*250;if(state.team.credits<cost)return toast('Not enough credits');state.team.credits-=cost;d.level++;d.pace=clamp(d.pace+1+(Math.random()<.4?1:0),1,99);d.racecraft=clamp(d.racecraft+1,1,99);d.consistency=clamp(d.consistency+1,1,99);d.focus=clamp(d.focus+1,1,99);persist();renderAll();}
  function upgradeCar(id){const c=state.cars.find(x=>x.id===id);if(!c||!c.owned)return;const cost=500+c.level*320;if(state.team.credits<cost)return toast('Not enough credits');state.team.credits-=cost;c.level++;c.speed=clamp(c.speed+1,1,99);c.accel=clamp(c.accel+1,1,99);c.grip=clamp(c.grip+1,1,99);c.reliability=clamp(c.reliability+1,1,99);persist();renderAll();}
  function buyCar(id){const c=state.cars.find(x=>x.id===id);if(!c||c.owned)return;if(state.team.credits<c.cost)return toast('Not enough credits');state.team.credits-=c.cost;c.owned=true;state.selectedCar=c.id;persist();renderAll();}
  function upgradeWorkshop(key){const level=Number(state.workshop[key]);if(!level)return;const cost=700+level*500;if(state.team.credits<cost)return toast('Not enough credits');state.team.credits-=cost;state.workshop[key]=level+1;persist();renderAll();}

  function renderMultiplayerPlayers(){const self={name:state.team.name,rating:teamRating()},connected=hostPeers.filter(p=>p.channel&&p.channel.readyState==='open'&&p.player).map(p=>p.player),list=$('#hostPlayers');if(list)list.innerHTML=[self].concat(connected).map((p,i)=>`<div class="playerChip"><strong>${escapeHtml(p.name)}${i===0?' · Host':''}</strong><small>Rating ${Math.round(p.rating||60)}</small></div>`).join('');const start=$('#startMultiRace');if(start)start.disabled=connected.length===0;}
  function makePeer(){if(typeof RTCPeerConnection==='undefined')throw new Error('This browser does not support WebRTC multiplayer.');return new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'}]});}
  function waitIce(pc){if(pc.iceGatheringState==='complete')return Promise.resolve();return new Promise(resolve=>{let finished=false;const done=()=>{if(finished)return;finished=true;pc.removeEventListener('icegatheringstatechange',check);resolve();},check=()=>{if(pc.iceGatheringState==='complete')done();};pc.addEventListener('icegatheringstatechange',check);setTimeout(done,5000);});}
  function encodeSignal(desc){return btoa(unescape(encodeURIComponent(JSON.stringify(desc))));}function decodeSignal(code){return JSON.parse(decodeURIComponent(escape(atob(String(code||'').trim()))));}
  async function createHostInvite(){try{$('#hostConnectionState').textContent='Creating';const pc=makePeer(),channel=pc.createDataChannel('gridline'),peer={id:uid(),pc,channel,player:null};wireHostChannel(peer);const offer=await pc.createOffer();await pc.setLocalDescription(offer);await waitIce(pc);hostPending=peer;$('#hostOffer').value=encodeSignal(pc.localDescription);$('#hostConnectionState').textContent='Invite ready';}catch(err){console.error(err);toast(err.message||'Could not create invite');$('#hostConnectionState').textContent='Error';}}
  function wireHostChannel(peer){peer.channel.onopen=()=>{$('#hostConnectionState').textContent='Connected';broadcastLobby();};peer.channel.onmessage=evt=>{try{const msg=JSON.parse(evt.data);if(msg.type==='hello'){peer.player={id:peer.id,name:String((msg.player&&msg.player.name)||'Friend').slice(0,24),rating:Number(msg.player&&msg.player.rating)||60};renderMultiplayerPlayers();broadcastLobby();}}catch(err){console.warn(err);}};peer.channel.onclose=()=>{renderMultiplayerPlayers();broadcastLobby();};}
  async function acceptHostAnswer(){if(!hostPending)return toast('Create an invite first');try{await hostPending.pc.setRemoteDescription(decodeSignal($('#hostAnswer').value));hostPeers.push(hostPending);hostPending=null;$('#hostOffer').value='';$('#hostAnswer').value='';$('#hostConnectionState').textContent='Connecting';}catch(err){console.error(err);toast('That answer code is not valid');}}
  async function makeJoinAnswer(){try{$('#joinConnectionState').textContent='Connecting';joinPeer=makePeer();joinPeer.ondatachannel=evt=>{joinChannel=evt.channel;joinChannel.onopen=()=>{$('#joinConnectionState').textContent='Connected';joinChannel.send(JSON.stringify({type:'hello',player:{name:state.team.name,rating:teamRating()}}));};joinChannel.onmessage=evt2=>{try{const msg=JSON.parse(evt2.data);if(msg.type==='lobby')renderJoinLobby(msg.players||[]);if(msg.type==='race-start')runIncomingMultiRace(msg.payload||{});}catch(err){console.warn(err);}};joinChannel.onclose=()=>$('#joinConnectionState').textContent='Disconnected';};await joinPeer.setRemoteDescription(decodeSignal($('#joinOffer').value));const answer=await joinPeer.createAnswer();await joinPeer.setLocalDescription(answer);await waitIce(joinPeer);$('#joinAnswer').value=encodeSignal(joinPeer.localDescription);$('#joinConnectionState').textContent='Answer ready';}catch(err){console.error(err);toast(err.message||'That invite code is not valid');$('#joinConnectionState').textContent='Error';}}
  function renderJoinLobby(players){$('#joinLobby').innerHTML=players.map(p=>`<div class="playerChip"><strong>${escapeHtml(p.name)}</strong><small>Rating ${Math.round(p.rating||60)}</small></div>`).join('');}
  function broadcastLobby(){const players=[{name:state.team.name,rating:teamRating()}].concat(hostPeers.filter(p=>p.channel&&p.channel.readyState==='open'&&p.player).map(p=>p.player)),msg=JSON.stringify({type:'lobby',players});hostPeers.forEach(p=>{if(p.channel&&p.channel.readyState==='open')p.channel.send(msg);});renderMultiplayerPlayers();}
  function startHostMultiRace(){try{const track=TRACKS.find(t=>t.id===$('#multiTrack').value)||TRACKS[0],seed=(Date.now()&0xffffffff)>>>0,connected=hostPeers.filter(p=>p.channel&&p.channel.readyState==='open'&&p.player),entrants=[{id:'host',name:state.team.name,power:teamRating(),kind:'player',local:true}];connected.forEach((p,i)=>entrants.push({id:`friend-${i}`,name:p.player.name,power:p.player.rating,kind:'friend'}));const rng=seeded(seed);shuffle(BOT_NAMES.slice(),rng).slice(0,Math.max(0,12-entrants.length)).forEach((name,i)=>entrants.push({id:`bot-${i}`,name,power:track.difficulty-7+rng()*17,kind:'bot'}));const payload={trackId:track.id,seed,entrants};connected.forEach(p=>p.channel.send(JSON.stringify({type:'race-start',payload})));runRaceAnimation(track,entrants,simulateRace(track,entrants,seed),{mode:'multi'});}catch(err){console.error(err);toast('Multiplayer race could not start');}}
  function runIncomingMultiRace(payload){const track=TRACKS.find(t=>t.id===payload.trackId)||TRACKS[0],incoming=Array.isArray(payload.entrants)?payload.entrants:[],entrants=incoming.map(e=>{const local=e.name===state.team.name;return Object.assign({},e,{local,kind:local?'player':e.kind==='player'?'friend':e.kind});});runRaceAnimation(track,entrants,simulateRace(track,entrants,(payload.seed>>>0)||1),{mode:'multi'});}

  function renderAll(includeRaceSetup=true){renderTop();renderDrivers();renderCars();ensureTrackOptions();if(includeRaceSetup)renderRaceSetup();renderStandings();renderMultiplayerPlayers();}
  function bindEvents(){
    document.addEventListener('click',e=>{const open=e.target.closest('[data-open]');if(open){openView(open.dataset.open);return;}const dsel=e.target.closest('[data-select-driver]');if(dsel){state.selectedDriver=dsel.dataset.selectDriver;persist();renderAll();return;}const dup=e.target.closest('[data-upgrade-driver]');if(dup){trainDriver(dup.dataset.upgradeDriver);return;}const csel=e.target.closest('[data-select-car]');if(csel){state.selectedCar=csel.dataset.selectCar;persist();renderAll();return;}const cup=e.target.closest('[data-upgrade-car]');if(cup){upgradeCar(cup.dataset.upgradeCar);return;}const cbuy=e.target.closest('[data-buy-car]');if(cbuy){buyCar(cbuy.dataset.buyCar);return;}const wup=e.target.closest('[data-upgrade-workshop]');if(wup){upgradeWorkshop(wup.dataset.upgradeWorkshop);return;}});
    $('#raceTrack').addEventListener('change',renderRaceSetup);$('#raceDriver').addEventListener('change',renderRaceSummary);$('#raceCar').addEventListener('change',renderRaceSummary);$('#startSoloRace').addEventListener('click',startSoloRace);
    $('#hostMode').addEventListener('click',()=>{$('#hostPanel').classList.remove('hidden');$('#joinPanel').classList.add('hidden');renderMultiplayerPlayers();});$('#joinMode').addEventListener('click',()=>{$('#joinPanel').classList.remove('hidden');$('#hostPanel').classList.add('hidden');});
    $('#createInvite').addEventListener('click',createHostInvite);$('#acceptAnswer').addEventListener('click',acceptHostAnswer);$('#makeAnswer').addEventListener('click',makeJoinAnswer);$('#startMultiRace').addEventListener('click',startHostMultiRace);
    $('#resetSave').addEventListener('click',()=>{if(confirm('Reset Gridline Racing progress on this device?')){localStorage.removeItem(SAVE_KEY);localStorage.removeItem('gamebox-gridline-v1');state=clone(DEFAULT_STATE);persist();renderAll();openView('home');}});
  }
  function boot(){try{state=loadState();ensureTrackOptions();bindEvents();renderAll();openView('home');window.gridlineDebug={version:'2.0.0',state:()=>clone(state),startSoloRace};}catch(err){console.error('Gridline Racing failed to boot',err);showFatal(err.message||String(err));}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();