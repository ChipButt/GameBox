(() => {
  'use strict';

  const ROSTER_KEY='gamebox.players.v1';
  const PROFILE_KEY='gamebox.gridline.profiles.v4';
  const TICK_MS=300;
  const MAX_GRID=12;
  const TRACKS=[
    {name:'Harbour Sprint',discipline:'Open Wheel',weather:'Dry',laps:8,difficulty:58},
    {name:'Alpine Ring',discipline:'Open Wheel',weather:'Cool',laps:10,difficulty:61},
    {name:'Desert Oval',discipline:'Stock Car',weather:'Hot',laps:12,difficulty:64},
    {name:'Forest Stage',discipline:'Rally',weather:'Damp',laps:7,difficulty:67}
  ];
  const BOT_NAMES=['Apex North','Redline Works','Vector GP','Copper Fox','Nightshift','Kestrel','Orion Motorsport','Blackbird','Summit Racing','Halo Autosport','Cinder Team','Blue Arrow','Forge Racing','Velocity Union'];
  const STAT_META={
    pace:{label:'Pace',desc:'Higher raw speed'},
    handling:{label:'Handling',desc:'Cleaner overtakes'},
    focus:{label:'Focus',desc:'Fewer mistakes'},
    reliability:{label:'Reliability',desc:'Less race-time loss'}
  };
  const DECISIONS=[
    {id:'traffic',title:'Traffic ahead',text:'You are closing quickly on a slower car.',choices:[['attack','Attack now',1.8,.08],['wait','Wait for a clean gap',.7,-.03]]},
    {id:'tyres',title:'Tyres are fading',text:'The car is starting to slide in the longer corners.',choices:[['push','Keep pushing',1.5,.10],['manage','Manage the tyres',.45,-.05]]},
    {id:'gap',title:'Small gap ahead',text:'You can burn extra energy to close the gap before the next sector.',choices:[['close','Close it now',1.7,.07],['steady','Stay steady',.5,-.02]]}
  ];

  const $=id=>document.getElementById(id);
  const $$=sel=>Array.from(document.querySelectorAll(sel));
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
  const money=n=>'£'+Math.max(0,Math.round(Number(n)||0)).toLocaleString('en-GB');
  const uid=()=>globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const read=(key,fallback)=>{try{const v=JSON.parse(localStorage.getItem(key));return v??fallback}catch{return fallback}};
  const write=(key,v)=>{try{localStorage.setItem(key,JSON.stringify(v))}catch{}};

  let selectedSingleId='';
  let localPlayer=null;
  let playMode='single';
  let role=null;
  let session=null;
  let game=null;
  let hostTimer=null;
  let nextRaceTimer=null;
  let pendingHello=false;

  function roster(){
    const items=read(ROSTER_KEY,[]);
    return Array.isArray(items)?items.filter(p=>p&&p.id&&String(p.name||'').trim()).map(p=>({id:String(p.id),name:String(p.name).trim()})):[];
  }
  function profiles(){const p=read(PROFILE_KEY,{});return p&&typeof p==='object'?p:{}}
  function getProfile(player){
    const all=profiles(),saved=all[player.id]||{};
    return {playerId:player.id,name:player.name,cash:Number(saved.cash)||200,levels:{pace:Number(saved.levels?.pace)||1,handling:Number(saved.levels?.handling)||1,focus:Number(saved.levels?.focus)||1,reliability:Number(saved.levels?.reliability)||1},races:Number(saved.races)||0,best:Number(saved.best)||0};
  }
  function saveProfileFromEntrant(e){
    if(!e||!e.playerId||!e.human)return;
    const all=profiles();
    const old=all[e.playerId]||{};
    all[e.playerId]={name:e.name,cash:Math.round(e.cash),levels:{...e.levels},races:Math.max(Number(old.races)||0,Number(e.races)||0),best:e.best||old.best||0};
    write(PROFILE_KEY,all);
  }

  function showSetup(id){
    $$('.setupView').forEach(v=>v.classList.toggle('hidden',v.id!==id));
    $('raceScreen').classList.add('hidden');
    $('exitRace').classList.add('hidden');
    window.scrollTo({top:0,behavior:'smooth'});
    if(id==='singleSetup')renderSinglePlayers();
    if(id==='hostSetup'||id==='joinSetup')syncPlayerSelects();
  }
  function showRace(){
    $$('.setupView').forEach(v=>v.classList.add('hidden'));
    $('raceScreen').classList.remove('hidden');
    $('exitRace').classList.remove('hidden');
    window.scrollTo({top:0,behavior:'smooth'});
  }

  function renderSinglePlayers(){
    const people=roster(),wrap=$('singlePlayerList');wrap.innerHTML='';
    $('singleRosterEmpty').classList.toggle('hidden',people.length>0);
    if(!people.some(p=>p.id===selectedSingleId))selectedSingleId='';
    people.forEach(p=>{const b=document.createElement('button');b.type='button';b.className='playerChoice'+(p.id===selectedSingleId?' selected':'');b.textContent=p.name;b.onclick=()=>{selectedSingleId=p.id;renderSinglePlayers()};wrap.appendChild(b)});
    $('startSingle').disabled=!selectedSingleId;
  }
  function syncPlayerSelects(){
    const people=roster();
    for(const id of ['hostPlayerSelect','joinPlayerSelect']){
      const select=$(id),old=select.value;select.innerHTML=people.length?people.map(p=>`<option value="${esc(p.id)}">${esc(p.name)}</option>`).join(''):'<option value="">No GameBox players saved</option>';
      if(people.some(p=>p.id===old))select.value=old;
    }
  }

  function entrantFromPlayer(player,owner='local'){
    const p=getProfile(player);
    return {id:'human-'+player.id,playerId:player.id,name:player.name,human:true,owner,levels:{...p.levels},cash:p.cash,races:p.races,best:p.best||0,progress:0,finishTick:null,position:null,tactic:'steady',tacticUntil:0,decision:null,decisionBoost:0,decisionUntil:0};
  }
  function botEntrant(name,i,difficulty){
    const power=Math.round(difficulty-5+Math.random()*12);
    const level=Math.max(1,Math.round((power-48)/3.2));
    return {id:'bot-'+i+'-'+uid().slice(0,4),name,human:false,levels:{pace:level,handling:level,focus:level,reliability:level},cash:0,progress:0,finishTick:null,position:null,tactic:'steady',tacticUntil:0,decision:null,decisionBoost:0,decisionUntil:0};
  }
  function sponsorRate(e){if(!e.human)return 0;return 7+Math.floor((e.levels.pace+e.levels.handling+e.levels.focus+e.levels.reliability-4)*1.35)}
  function power(e){return Math.round(48+(e.levels.pace+e.levels.handling+e.levels.focus+e.levels.reliability)*3)}
  function upgradeCost(e,stat){const lvl=e.levels[stat]||1;return 70+lvl*55}
  function localEntrant(){return game?.entrants?.find(e=>e.human&&e.playerId===localPlayer?.id)||null}

  function buildGame(humans){
    const trackIndex=((humans[0]?.races||0))%TRACKS.length,track=TRACKS[trackIndex];
    const entrants=humans.map(h=>entrantFromPlayer(h.player,h.owner));
    const botPool=[...BOT_NAMES].sort(()=>Math.random()-.5);
    for(let i=entrants.length;i<MAX_GRID;i++)entrants.push(botEntrant(botPool[i%botPool.length],i,track.difficulty));
    return {phase:'race',raceNo:(humans[0]?.races||0)+1,trackIndex,tick:0,maxTicks:110,entrants,results:[]};
  }
  function resetRound(){
    if(!game)return;
    game.trackIndex=(game.trackIndex+1)%TRACKS.length;game.raceNo++;game.tick=0;game.phase='race';game.results=[];
    const track=TRACKS[game.trackIndex];
    game.entrants.forEach((e,i)=>{e.progress=0;e.finishTick=null;e.position=null;e.tactic='steady';e.tacticUntil=0;e.decision=null;e.decisionBoost=0;e.decisionUntil=0;if(!e.human){const b=botEntrant(e.name,i,track.difficulty);e.levels=b.levels}});
    broadcastGame();renderGame();
  }

  function speedFor(e){
    const p=power(e),pace=(e.levels.pace-1)*.035,handling=(e.levels.handling-1)*.015,focus=(e.levels.focus-1)*.012,reliability=(e.levels.reliability-1)*.010;
    let tactical=0,risk=0;
    if(e.tacticUntil>game.tick){if(e.tactic==='push'){tactical=.22;risk=.035}else if(e.tactic==='defend'){tactical=.08;risk=.010}else if(e.tactic==='clean'){tactical=.13;risk=.015}}
    if(e.decisionUntil>game.tick)tactical+=e.decisionBoost||0;
    const reliabilityProtection=Math.min(.025,(e.levels.reliability-1)*.003),incident=Math.random()<Math.max(.003,risk-reliabilityProtection)?-(.18+Math.random()*.22):0;
    return Math.max(.38,.72+(p-60)*.009+pace+handling+focus+reliability+tactical+incident+(Math.random()-.5)*.08);
  }
  function maybeCreateDecisions(){
    if(!game||game.phase!=='race'||![24,52,76].includes(game.tick))return;
    game.entrants.filter(e=>e.human&&!e.finishTick).forEach((e,idx)=>{const template=DECISIONS[(game.tick/24+idx)%DECISIONS.length|0];e.decision={...template,expires:game.tick+14}});
  }
  function hostTick(){
    if(!game||game.phase!=='race')return;
    game.tick++;
    maybeCreateDecisions();
    for(const e of game.entrants){
      if(e.human)e.cash+=sponsorRate(e)*(TICK_MS/1000);
      if(e.decision&&game.tick>e.decision.expires)e.decision=null;
      if(e.finishTick!==null)continue;
      e.progress=Math.min(100,e.progress+speedFor(e));
      if(e.progress>=100)e.finishTick=game.tick+Math.random()*.2;
    }
    if(game.entrants.every(e=>e.finishTick!==null)||game.tick>=game.maxTicks)finishRound();
    broadcastGame();renderGame();
  }
  function finishRound(){
    if(!game||game.phase!=='race')return;
    game.phase='result';
    const sorted=[...game.entrants].sort((a,b)=>{
      if(a.finishTick!==null&&b.finishTick!==null)return a.finishTick-b.finishTick;
      if(a.finishTick!==null)return -1;if(b.finishTick!==null)return 1;return b.progress-a.progress;
    });
    sorted.forEach((e,i)=>{e.position=i+1});game.results=sorted.map(e=>e.id);
    const payouts=[650,500,400,330,275,230,195,165,140,120,105,90];
    for(const e of sorted.filter(x=>x.human)){
      const pay=payouts[e.position-1]||80,sponsorBonus=e.position<=3?Math.round(sponsorRate(e)*8):Math.round(sponsorRate(e)*3);
      e.cash+=pay+sponsorBonus;e.races=(e.races||0)+1;e.best=!e.best?e.position:Math.min(e.best,e.position);saveProfileFromEntrant(e);
    }
    broadcastGame();renderGame();
    clearTimeout(nextRaceTimer);nextRaceTimer=setTimeout(()=>{if(role==='host'||playMode==='single')resetRound()},5000);
  }

  function applyAction(playerId,msg){
    if(!game||game.phase!=='race')return;
    const e=game.entrants.find(x=>x.human&&x.playerId===playerId);if(!e)return;
    if(msg.action==='upgrade'&&STAT_META[msg.stat]){
      const cost=upgradeCost(e,msg.stat);if(e.cash<cost)return;e.cash-=cost;e.levels[msg.stat]++;saveProfileFromEntrant(e);
    }
    if(msg.action==='tactic'&&['push','defend','clean'].includes(msg.tactic)){
      e.tactic=msg.tactic;e.tacticUntil=game.tick+16;
    }
    if(msg.action==='decision'&&e.decision){
      const choice=e.decision.choices.find(c=>c[0]===msg.choice);if(choice){e.decisionBoost=choice[2]*.10;e.decisionUntil=game.tick+18;e.decision=null}
    }
    broadcastGame();renderGame();
  }
  function requestAction(msg){
    if(!localPlayer||!game||game.phase!=='race')return;
    if(playMode==='single'||role==='host')applyAction(localPlayer.id,msg);
    else session?.sendToHost({type:'race-action',playerId:localPlayer.id,...msg});
  }

  function publicGame(){
    if(!game)return null;
    return {phase:game.phase,raceNo:game.raceNo,trackIndex:game.trackIndex,tick:game.tick,maxTicks:game.maxTicks,results:game.results,entrants:game.entrants.map(e=>({id:e.id,playerId:e.playerId,name:e.name,human:e.human,owner:e.owner,levels:e.levels,cash:e.cash,races:e.races,best:e.best,progress:e.progress,finishTick:e.finishTick,position:e.position,tactic:e.tactic,tacticUntil:e.tacticUntil,decision:e.decision,decisionBoost:e.decisionBoost,decisionUntil:e.decisionUntil}))};
  }
  function broadcastGame(){if(role==='host'&&session)session.broadcast({type:'race-state',game:publicGame()})}
  function applyRemoteGame(remote){game=remote;const me=localEntrant();if(me)saveProfileFromEntrant(me);showRace();renderGame()}

  function renderGame(){
    if(!game||!localPlayer)return;
    const track=TRACKS[game.trackIndex]||TRACKS[0],me=localEntrant();if(!me)return;
    $('activePlayerName').textContent=localPlayer.name;$('cash').textContent=money(me.cash);$('sponsorRate').textContent=money(sponsorRate(me))+'/s';$('raceNumber').textContent=game.raceNo;$('trackName').textContent=track.name;$('trackMeta').textContent=`${track.discipline} · ${track.weather}`;$('sponsorName').textContent='Chip In Performance';$('power').textContent=power(me);
    const sorted=[...game.entrants].sort((a,b)=>(b.progress-a.progress)||String(a.name).localeCompare(String(b.name)));const currentPos=me.position||sorted.findIndex(e=>e.id===me.id)+1;$('position').textContent=currentPos;$('liveSponsor').textContent='+'+money(sponsorRate(me));
    const lap=Math.min(track.laps,Math.max(1,Math.ceil((game.tick/Math.max(1,game.maxTicks))*track.laps)));$('lapText').textContent=`Lap ${lap} / ${track.laps}`;$('lapBar').style.width=`${clamp(game.tick/game.maxTicks*100,0,100)}%`;
    $('raceLanes').innerHTML=sorted.map((e,i)=>`<div class="raceLane ${e.human?'human':''} ${e.playerId===localPlayer.id?'you':''}"><span class="pos">${e.position||i+1}</span><span class="name">${esc(e.name)}</span><div class="lane"><i class="carDot" style="left:calc(${clamp(e.progress*.96,0,96)}% - 10px)"></i></div></div>`).join('');
    $('upgradeGrid').innerHTML=Object.entries(STAT_META).map(([key,m])=>{const cost=upgradeCost(me,key),disabled=game.phase!=='race'||me.cash<cost;return `<button class="upgradeButton" data-upgrade="${key}" type="button" ${disabled?'disabled':''}><strong>${esc(m.label)} · Lv ${me.levels[key]}</strong><small>${esc(m.desc)} · ${money(cost)}</small></button>`}).join('');
    const activeTactic=game.tick<(me.tacticUntil||0)?me.tactic:'steady';$('tacticState').textContent=activeTactic==='steady'?'Ready':activeTactic[0].toUpperCase()+activeTactic.slice(1);$$('[data-tactic]').forEach(b=>b.disabled=game.phase!=='race');
    renderDecision(me);
    if(game.phase==='race'){$('raceStatus').innerHTML='<strong>Race live</strong><span>Earn sponsor cash, upgrade and make calls while the field is moving.</span>';$('resultCard').classList.add('hidden')}
    else renderResult(me);
  }
  function renderDecision(me){
    const card=$('decisionCard');if(!me.decision||game.phase!=='race'){card.classList.add('hidden');return}card.classList.remove('hidden');$('decisionTitle').textContent=me.decision.title;$('decisionText').textContent=me.decision.text;$('decisionChoices').innerHTML=me.decision.choices.map(c=>`<button type="button" data-decision="${esc(c[0])}">${esc(c[1])}</button>`).join('');const left=clamp((me.decision.expires-game.tick)/14*100,0,100);$('decisionTimerBar').style.width=left+'%';
  }
  function renderResult(me){
    const card=$('resultCard');card.classList.remove('hidden');const payouts=[650,500,400,330,275,230,195,165,140,120,105,90],pay=payouts[(me.position||12)-1]||80,bonus=me.position<=3?Math.round(sponsorRate(me)*8):Math.round(sponsorRate(me)*3);card.innerHTML=`<span class="eyebrow">RACE COMPLETE</span><h2>${ordinal(me.position||12)} place</h2><div class="resultGrid"><div><span>Finish money</span><strong>${money(pay)}</strong></div><div><span>Sponsor bonus</span><strong>${money(bonus)}</strong></div><div><span>Next race</span><strong>5 sec</strong></div></div>`;$('raceStatus').innerHTML='<strong>Race complete</strong><span>The host is loading the next race.</span>';
  }
  function ordinal(n){n=Number(n)||0;const s=['th','st','nd','rd'],v=n%100;return n+(s[(v-20)%10]||s[v]||s[0])}

  function installSession(){
    if(!window.GameBoxLAN?.Session)throw new Error('Local multiplayer is unavailable in this browser.');
    session=new window.GameBoxLAN.Session({game:'gridline-v4',onStatus:text=>{if(role==='host')$('hostState').textContent=text;if(role==='client')$('joinState').textContent=text},onPeersChanged:()=>{if(role==='client'&&session.peers().length&&pendingHello){pendingHello=false;sendClientHello()}if(role==='host'){renderHostLobby();broadcastLobby()}},onMessage:handleNetworkMessage});
  }
  function ensureSession(){if(!session)installSession();return session}
  function sendClientHello(){if(!localPlayer)return;session?.sendToHost({type:'hello',player:localPlayer,profile:getProfile(localPlayer)})}
  function handleNetworkMessage(msg,source){
    if(role==='host'){
      if(msg.type==='hello'&&source.peer){source.peer.meta.player={id:String(msg.player?.id||uid()),name:String(msg.player?.name||'Friend').slice(0,24)};source.peer.meta.profile=msg.profile||null;renderHostLobby();broadcastLobby();return}
      if(msg.type==='race-action'){applyAction(String(msg.playerId||''),msg);return}
    }else if(role==='client'){
      if(msg.type==='lobby'){renderJoinLobby(msg.players||[]);return}
      if(msg.type==='race-state'&&msg.game){applyRemoteGame(msg.game);return}
    }
  }
  function hostPlayers(){
    const hp=roster().find(p=>p.id===$('hostPlayerSelect').value);const players=[];if(hp)players.push({id:hp.id,name:hp.name,host:true});if(session)session.peers().forEach(peer=>{if(peer.meta?.player)players.push({...peer.meta.player,host:false})});return players;
  }
  function renderHostLobby(){const players=hostPlayers();$('hostLobby').innerHTML=players.length?players.map((p,i)=>`<div class="leaderRow"><span class="rank">${i+1}</span><strong>${esc(p.name)}${p.host?' · Host':''}</strong><small>Ready</small></div>`).join(''):'<div class="emptyState">Choose the host player, then connect friends.</div>';$('startHostRace').disabled=players.length<2}
  function renderJoinLobby(players){$('joinLobby').innerHTML=players.length?players.map((p,i)=>`<div class="leaderRow"><span class="rank">${i+1}</span><strong>${esc(p.name)}${p.host?' · Host':''}</strong><small>Ready</small></div>`).join(''):'<div class="emptyState">Waiting for the host lobby.</div>'}
  function broadcastLobby(){if(role==='host'&&session)session.broadcast({type:'lobby',players:hostPlayers()})}

  async function createInvite(){
    role='host';ensureSession();$('hostState').textContent='Creating';try{$('hostOffer').value=await session.createHostOffer();$('hostState').textContent='Invite ready'}catch(err){console.error(err);$('hostState').textContent='Error'}
  }
  async function acceptAnswer(){
    role='host';ensureSession();try{await session.acceptHostAnswer($('hostAnswer').value);$('hostAnswer').value='';$('hostOffer').value='';$('hostState').textContent='Connecting'}catch(err){console.error(err);$('hostState').textContent='Invalid answer'}
  }
  async function makeAnswer(){
    role='client';ensureSession();const p=roster().find(x=>x.id===$('joinPlayerSelect').value);if(!p)return;localPlayer=p;pendingHello=true;try{$('joinAnswer').value=await session.createClientAnswer($('joinOffer').value);$('joinState').textContent='Answer ready'}catch(err){console.error(err);$('joinState').textContent='Invalid invite'}
  }
  function startHostRace(){
    const hp=roster().find(p=>p.id===$('hostPlayerSelect').value);if(!hp)return;localPlayer=hp;playMode='multi';role='host';const humans=[{player:hp,owner:'host'}];session.peers().forEach(peer=>{if(peer.meta?.player)humans.push({player:peer.meta.player,owner:peer.id})});if(humans.length<2)return;game=buildGame(humans);showRace();renderGame();broadcastGame();clearInterval(hostTimer);hostTimer=setInterval(hostTick,TICK_MS);
  }
  function startSingleRace(){const p=roster().find(x=>x.id===selectedSingleId);if(!p)return;localPlayer=p;playMode='single';role='host';game=buildGame([{player:p,owner:'local'}]);showRace();renderGame();clearInterval(hostTimer);hostTimer=setInterval(hostTick,TICK_MS)}
  function leaveRace(){clearInterval(hostTimer);clearTimeout(nextRaceTimer);hostTimer=null;nextRaceTimer=null;game=null;session?.close();session=null;role=null;playMode='single';showSetup('setupHome')}

  function bind(){
    $('chooseSingle').onclick=()=>showSetup('singleSetup');$('chooseMulti').onclick=()=>showSetup('multiSetup');$('chooseWifi').onclick=()=>showSetup('wifiRole');$('chooseBluetooth').onclick=()=>{$('bluetoothNote').classList.remove('hidden')};$('chooseHost').onclick=()=>{role='host';showSetup('hostSetup');renderHostLobby()};$('chooseJoin').onclick=()=>{role='client';showSetup('joinSetup');renderJoinLobby([])};$$('[data-back]').forEach(b=>b.onclick=()=>showSetup(b.dataset.back));$('startSingle').onclick=startSingleRace;$('hostPlayerSelect').onchange=renderHostLobby;$('createInvite').onclick=createInvite;$('acceptAnswer').onclick=acceptAnswer;$('makeAnswer').onclick=makeAnswer;$('startHostRace').onclick=startHostRace;$('exitRace').onclick=leaveRace;
    document.addEventListener('click',e=>{const up=e.target.closest('[data-upgrade]');if(up){requestAction({action:'upgrade',stat:up.dataset.upgrade});return}const tac=e.target.closest('[data-tactic]');if(tac){requestAction({action:'tactic',tactic:tac.dataset.tactic});return}const dec=e.target.closest('[data-decision]');if(dec){requestAction({action:'decision',choice:dec.dataset.decision})}});
    window.addEventListener('beforeunload',()=>{try{session?.close()}catch{};clearInterval(hostTimer);clearTimeout(nextRaceTimer)});
  }

  syncPlayerSelects();renderSinglePlayers();bind();showSetup('setupHome');
})();