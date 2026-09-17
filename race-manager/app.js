(() => {
  'use strict';

  const ROSTER_KEY='gamebox.players.v1';
  const PROFILE_KEY='gamebox.gridline.profiles.v4';
  const TICK_MS=300;
  const MAX_GRID=12;
  const RACE_TICKS=200;
  const NEXT_RACE_DELAY=3000;

  const TRACKS=[
    {name:'Harbour Sprint',discipline:'Open Wheel',weather:'Dry',laps:8,profile:'Technical · Heavy traffic',risk:1.0,botPace:.505,weights:{passing:1.35,attack:1.20,defence:.85,throttle:.95,cornering:1.25,composure:.80}},
    {name:'Alpine Ring',discipline:'Open Wheel',weather:'Cool',laps:10,profile:'Corner-heavy · Low traffic',risk:1.15,botPace:.508,weights:{passing:.65,attack:.85,defence:.75,throttle:.80,cornering:1.75,composure:1.20}},
    {name:'Desert Oval',discipline:'Stock Car',weather:'Hot',laps:12,profile:'Long straights · Drafting',risk:.85,botPace:.510,weights:{passing:1.00,attack:1.25,defence:1.15,throttle:1.70,cornering:.45,composure:.75}},
    {name:'Forest Stage',discipline:'Rally',weather:'Damp',laps:7,profile:'Technical · High-risk',risk:1.55,botPace:.506,weights:{passing:.55,attack:.80,defence:.65,throttle:.70,cornering:1.45,composure:1.75}}
  ];

  const BOT_NAMES=['Apex North','Redline Works','Vector GP','Copper Fox','Nightshift','Kestrel','Orion Motorsport','Blackbird','Summit Racing','Halo Autosport','Cinder Team','Blue Arrow','Forge Racing','Velocity Union'];

  const STAT_META={
    passing:{label:'Passing',desc:'Improves overtaking',base:32,step:4,pace:.0090},
    attack:{label:'Attack',desc:'More pace in traffic',base:36,step:4,pace:.0105},
    defence:{label:'Defence',desc:'Makes you harder to pass',base:40,step:4,pace:.0060},
    throttle:{label:'Throttle',desc:'Improves straight-line acceleration',base:45,step:4,pace:.0125},
    cornering:{label:'Cornering',desc:'Carries speed through bends',base:52,step:4,pace:.0125},
    composure:{label:'Composure',desc:'Cuts mistakes and pace swings',base:48,step:4,pace:.0080}
  };

  const $=id=>document.getElementById(id);
  const $$=sel=>Array.from(document.querySelectorAll(sel));
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
  const money=n=>'£'+Math.max(0,Math.round(Number(n)||0)).toLocaleString('en-GB');
  const uid=()=>globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const read=(key,fallback)=>{try{const v=JSON.parse(localStorage.getItem(key));return v??fallback}catch{return fallback}};
  const write=(key,v)=>{try{localStorage.setItem(key,JSON.stringify(v))}catch{}};
  const finite=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;

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

  function normaliseLevels(raw={}){
    return {
      passing:Math.max(1,finite(raw.passing,finite(raw.pace,1))),
      attack:Math.max(1,finite(raw.attack,finite(raw.handling,1))),
      defence:Math.max(1,finite(raw.defence,finite(raw.focus,1))),
      throttle:Math.max(1,finite(raw.throttle,finite(raw.reliability,1))),
      cornering:Math.max(1,finite(raw.cornering,1)),
      composure:Math.max(1,finite(raw.composure,1))
    };
  }

  function getProfile(player,override=null){
    const saved=override||profiles()[player.id]||{};
    const savedCash=Number(saved.cash);
    return {
      playerId:player.id,
      name:player.name,
      cash:Number.isFinite(savedCash)?savedCash:240,
      gems:Math.max(0,finite(saved.gems,0)),
      sponsorLevel:Math.max(0,finite(saved.sponsorLevel,0)),
      levels:normaliseLevels(saved.levels),
      races:Math.max(0,finite(saved.races,0)),
      best:Math.max(0,finite(saved.best,0))
    };
  }

  function saveProfileFromEntrant(e){
    if(!e||!e.playerId||!e.human)return;
    const all=profiles();
    const old=all[e.playerId]||{};
    all[e.playerId]={
      name:e.name,
      cash:Math.round(e.cash),
      gems:Math.max(0,Math.round(e.gems||0)),
      sponsorLevel:Math.max(0,Math.round(e.sponsorLevel||0)),
      levels:{...e.levels},
      races:Math.max(finite(old.races,0),finite(e.races,0)),
      best:e.best||old.best||0
    };
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
    const people=roster(),wrap=$('singlePlayerList');
    wrap.innerHTML='';
    $('singleRosterEmpty').classList.toggle('hidden',people.length>0);
    if(!people.some(p=>p.id===selectedSingleId))selectedSingleId='';
    people.forEach(p=>{
      const b=document.createElement('button');
      b.type='button';
      b.className='playerChoice'+(p.id===selectedSingleId?' selected':'');
      b.textContent=p.name;
      b.onclick=()=>{selectedSingleId=p.id;renderSinglePlayers()};
      wrap.appendChild(b);
    });
    $('startSingle').disabled=!selectedSingleId;
  }

  function syncPlayerSelects(){
    const people=roster();
    for(const id of ['hostPlayerSelect','joinPlayerSelect']){
      const select=$(id),old=select.value;
      select.innerHTML=people.length?people.map(p=>`<option value="${esc(p.id)}">${esc(p.name)}</option>`).join(''):'<option value="">No GameBox players saved</option>';
      if(people.some(p=>p.id===old))select.value=old;
    }
  }

  function entrantFromPlayer(player,owner='local',profileOverride=null){
    const p=getProfile(player,profileOverride);
    return {
      id:'human-'+player.id,
      playerId:player.id,
      name:player.name,
      human:true,
      owner,
      levels:{...p.levels},
      cash:p.cash,
      gems:p.gems,
      sponsorLevel:p.sponsorLevel,
      races:p.races,
      best:p.best||0,
      progress:0,
      finishTick:null,
      position:null
    };
  }

  function botEntrant(name,i,track){
    const levels={};Object.keys(STAT_META).forEach(key=>levels[key]=1);
    const spread=((i%7)-3)*.0017;
    return {id:'bot-'+i+'-'+uid().slice(0,4),name,human:false,levels,cash:0,gems:0,sponsorLevel:0,botPace:track.botPace+spread,progress:0,finishTick:null,position:null};
  }

  function sumLevels(e){return Object.keys(STAT_META).reduce((sum,key)=>sum+finite(e.levels?.[key],1),0)}
  function incomeRate(e){if(!e.human)return 0;return 5+Math.max(0,finite(e.sponsorLevel,0))*2}
  function sponsorCost(e){const lvl=Math.max(0,finite(e.sponsorLevel,0));return Math.round(80*Math.pow(1.55,lvl))}
  function power(e){return Math.round(48+sumLevels(e)*2)}
  function statPercent(e,stat){return 2+Math.max(1,finite(e.levels?.[stat],1))*STAT_META[stat].step}
  function upgradeCost(e,stat){const lvl=Math.max(1,finite(e.levels?.[stat],1));return Math.round(STAT_META[stat].base*Math.pow(1.42,lvl-1))}
  function localEntrant(){return game?.entrants?.find(e=>e.human&&e.playerId===localPlayer?.id)||null}

  function seedGrid(entrants){
    entrants.sort(()=>Math.random()-.5);
    entrants.forEach((e,i)=>{e.progress=(entrants.length-i-1)*0.035;e.finishTick=null;e.position=null});
  }

  function buildGame(humans){
    const trackIndex=((humans[0]?.profile?.races??humans[0]?.races??0))%TRACKS.length;
    const track=TRACKS[trackIndex];
    const entrants=humans.map(h=>entrantFromPlayer(h.player,h.owner,h.profile||null));
    const botPool=[...BOT_NAMES].sort(()=>Math.random()-.5);
    for(let i=entrants.length;i<MAX_GRID;i++)entrants.push(botEntrant(botPool[i%botPool.length],i,track));
    seedGrid(entrants);
    return {phase:'race',raceNo:(entrants.find(e=>e.human)?.races||0)+1,trackIndex,tick:0,maxTicks:RACE_TICKS,entrants,results:[]};
  }

  function resetRound(){
    if(!game)return;
    game.trackIndex=(game.trackIndex+1)%TRACKS.length;
    game.raceNo++;
    game.tick=0;
    game.phase='race';
    game.results=[];
    const track=TRACKS[game.trackIndex];
    game.entrants.forEach((e,i)=>{
      e.progress=0;e.finishTick=null;e.position=null;
      if(!e.human){const b=botEntrant(e.name,i,track);e.levels=b.levels;e.botPace=b.botPace}
    });
    seedGrid(game.entrants);
    broadcastGame();
    renderGame();
  }

  function speedFor(e,ahead){
    const track=TRACKS[game.trackIndex]||TRACKS[0];
    const launch=clamp(game.tick/18,.28,1);

    if(!e.human){
      const noise=(Math.random()-.5)*.010;
      return Math.max(.16,(finite(e.botPace,track.botPace)+noise)*launch);
    }

    const levels=normaliseLevels(e.levels);
    let speed=.468;
    for(const [stat,meta] of Object.entries(STAT_META)){
      const gained=Math.max(0,levels[stat]-1);
      speed+=gained*meta.pace*(track.weights[stat]||1);
    }

    if(ahead){
      const gap=ahead.progress-e.progress;
      if(gap>0&&gap<1.45){
        speed+=Math.max(0,levels.passing-1)*.0045*(track.weights.passing||1);
        speed+=Math.max(0,levels.attack-1)*.0035*(track.weights.attack||1);
        speed-=Math.max(0,finite(ahead.levels?.defence,1)-1)*.0025*(track.weights.defence||1);
      }
    }

    const calm=1+Math.max(0,levels.composure-1)*.16*(track.weights.composure||1);
    const noise=(Math.random()-.5)*(.030/calm);
    const incidentChance=(.0048*(track.risk||1))/calm;
    const incident=Math.random()<incidentChance?-(.07+Math.random()*.10):0;
    return Math.max(.16,(speed+noise+incident)*launch);
  }

  function hostTick(){
    if(!game||game.phase!=='race')return;
    game.tick++;
    const order=[...game.entrants].sort((a,b)=>b.progress-a.progress);
    for(const e of game.entrants){
      if(e.human)e.cash+=incomeRate(e)*(TICK_MS/1000);
      if(e.finishTick!==null)continue;
      const rank=order.findIndex(x=>x.id===e.id);
      const ahead=rank>0?order[rank-1]:null;
      e.progress=Math.min(100,e.progress+speedFor(e,ahead));
      if(e.progress>=100)e.finishTick=game.tick+Math.random()*.2;
    }
    if(game.entrants.every(e=>e.finishTick!==null)||game.tick>=game.maxTicks)finishRound();
    broadcastGame();
    renderGame();
  }

  function finishRound(){
    if(!game||game.phase!=='race')return;
    game.phase='result';
    const sorted=[...game.entrants].sort((a,b)=>{
      if(a.finishTick!==null&&b.finishTick!==null)return a.finishTick-b.finishTick;
      if(a.finishTick!==null)return -1;
      if(b.finishTick!==null)return 1;
      return b.progress-a.progress;
    });
    sorted.forEach((e,i)=>{e.position=i+1});
    game.results=sorted.map(e=>e.id);

    const cashPayouts=[220,180,150,125,105,90,78,68,60,52,46,40];
    const gemPayouts=[5,4,3,2,2,1,1,1,1,1,1,1];
    for(const e of sorted.filter(x=>x.human)){
      const cash=cashPayouts[e.position-1]||35;
      const gems=gemPayouts[e.position-1]||1;
      e.cash+=cash;
      e.gems=(e.gems||0)+gems;
      e.races=(e.races||0)+1;
      e.best=!e.best?e.position:Math.min(e.best,e.position);
      saveProfileFromEntrant(e);
    }

    broadcastGame();
    renderGame();
    clearTimeout(nextRaceTimer);
    nextRaceTimer=setTimeout(()=>{if(role==='host'||playMode==='single')resetRound()},NEXT_RACE_DELAY);
  }

  function applyAction(playerId,msg){
    if(!game||game.phase!=='race')return;
    const e=game.entrants.find(x=>x.human&&x.playerId===playerId);
    if(!e)return;

    if(msg.action==='sponsor'){
      const cost=sponsorCost(e);
      if(e.cash<cost)return;
      e.cash-=cost;
      e.sponsorLevel=Math.max(0,finite(e.sponsorLevel,0))+1;
      saveProfileFromEntrant(e);
      broadcastGame();
      renderGame();
      return;
    }

    if(msg.action!=='upgrade'||!STAT_META[msg.stat])return;
    const cost=upgradeCost(e,msg.stat);
    if(e.cash<cost)return;
    e.cash-=cost;
    e.levels[msg.stat]=Math.max(1,finite(e.levels[msg.stat],1))+1;
    saveProfileFromEntrant(e);
    broadcastGame();
    renderGame();
  }

  function requestAction(msg){
    if(!localPlayer||!game||game.phase!=='race')return;
    if(playMode==='single'||role==='host')applyAction(localPlayer.id,msg);
    else session?.sendToHost({type:'race-action',playerId:localPlayer.id,...msg});
  }

  function publicGame(){
    if(!game)return null;
    return {
      phase:game.phase,raceNo:game.raceNo,trackIndex:game.trackIndex,tick:game.tick,maxTicks:game.maxTicks,results:game.results,
      entrants:game.entrants.map(e=>({
        id:e.id,playerId:e.playerId,name:e.name,human:e.human,owner:e.owner,levels:e.levels,cash:e.cash,gems:e.gems,sponsorLevel:e.sponsorLevel,botPace:e.botPace,races:e.races,best:e.best,progress:e.progress,finishTick:e.finishTick,position:e.position
      }))
    };
  }

  function broadcastGame(){if(role==='host'&&session)session.broadcast({type:'race-state',game:publicGame()})}
  function applyRemoteGame(remote){game=remote;const me=localEntrant();if(me)saveProfileFromEntrant(me);showRace();renderGame()}

  function renderGame(){
    if(!game||!localPlayer)return;
    const track=TRACKS[game.trackIndex]||TRACKS[0];
    const me=localEntrant();
    if(!me)return;

    $('activePlayerName').textContent=localPlayer.name;
    $('cash').textContent=money(me.cash);
    $('sponsorRate').textContent=money(incomeRate(me))+'/s';
    $('raceNumber').textContent=game.raceNo;
    if($('gems'))$('gems').textContent=Math.round(me.gems||0);
    $('trackName').textContent=track.name;
    $('trackMeta').textContent=`Race ${game.raceNo} · ${track.discipline} · ${track.weather}`;
    if($('trackFocus'))$('trackFocus').textContent=track.profile;
    if($('sponsorName'))$('sponsorName').textContent='Chip In Racing';
    if($('buySponsor')){
      const cost=sponsorCost(me);
      $('buySponsor').disabled=game.phase!=='race'||me.cash<cost;
      $('buySponsor').innerHTML=`<span>+£2/s</span><small>${money(cost)}</small>`;
    }
    $('power').textContent=power(me);

    const sorted=[...game.entrants].sort((a,b)=>(b.progress-a.progress)||String(a.name).localeCompare(String(b.name)));
    const currentPos=me.position||sorted.findIndex(e=>e.id===me.id)+1;
    $('position').textContent=currentPos;
    if($('liveSponsor'))$('liveSponsor').textContent='+'+money(incomeRate(me));

    const racePct=clamp(me.progress,0,100);
    const lap=Math.min(track.laps,Math.max(1,Math.floor((racePct/100)*track.laps)+1));
    $('lapText').textContent=`Lap ${lap} / ${track.laps}`;
    $('lapBar').style.width=`${racePct}%`;
    if($('raceTimer')){
      const seconds=Math.max(0,Math.ceil((game.maxTicks-game.tick)*TICK_MS/1000));
      $('raceTimer').textContent=`0:${String(seconds).padStart(2,'0')}`;
    }

    $('raceLanes').innerHTML=sorted.map((e,i)=>`<div class="raceLane ${e.human?'human':''} ${e.playerId===localPlayer.id?'you':''}"><span class="pos">${e.position||i+1}</span><span class="name">${esc(e.name)}</span><div class="lane"><i class="carDot" style="left:calc(${clamp(e.progress*.96,0,96)}% - 10px)"></i></div></div>`).join('');

    $('upgradeGrid').innerHTML=Object.entries(STAT_META).map(([key,m])=>{
      const lvl=Math.max(1,finite(me.levels[key],1));
      const cost=upgradeCost(me,key);
      const current=statPercent(me,key);
      const next=current+m.step;
      const disabled=game.phase!=='race'||me.cash<cost;
      const affinity=track.weights[key]||1;
      const hot=affinity>=1.30?' trackHot':'';
      return `<button class="upgradeButton${hot}" data-upgrade="${key}" type="button" ${disabled?'disabled':''}><strong>${esc(m.label)} · Lv ${lvl}</strong><small>${current}% → ${next}% · ${money(cost)} · Track ×${affinity.toFixed(1)}</small></button>`;
    }).join('');

    for(const [key,m] of Object.entries(STAT_META)){
      const dock=document.querySelector(`.raceActionDock [data-dock-stat="${key}"]`);
      if(!dock)continue;
      const lvl=Math.max(1,finite(me.levels[key],1));
      const cost=upgradeCost(me,key);
      dock.disabled=game.phase!=='race'||me.cash<cost;
      const label=dock.querySelector('strong');
      const meta=dock.querySelector('small');
      if(label)label.textContent=m.label;
      if(meta)meta.textContent=`Lv ${lvl} · ${money(cost)}`;
    }

    if(game.phase==='race'){
      if($('raceStatus'))$('raceStatus').innerHTML='<strong>Race live</strong><span>Income keeps coming in. Upgrade while the field races automatically.</span>';
      $('resultCard').classList.add('hidden');
    }else{
      renderResult(me);
    }
  }

  function renderResult(me){
    const card=$('resultCard');
    const cashPayouts=[220,180,150,125,105,90,78,68,60,52,46,40];
    const gemPayouts=[5,4,3,2,2,1,1,1,1,1,1,1];
    const cash=cashPayouts[(me.position||12)-1]||35;
    const gems=gemPayouts[(me.position||12)-1]||1;
    card.classList.remove('hidden');
    card.innerHTML=`<span class="eyebrow">RACE COMPLETE</span><h2>${ordinal(me.position||12)} place</h2><div class="resultGrid"><div><span>Cash</span><strong>+${money(cash)}</strong></div><div><span>Gems</span><strong>+${gems}</strong></div><div><span>Next race</span><strong>3 sec</strong></div></div>`;
    if($('raceStatus'))$('raceStatus').innerHTML='<strong>Race complete</strong><span>The next race starts automatically.</span>';
  }

  function ordinal(n){n=Number(n)||0;const s=['th','st','nd','rd'],v=n%100;return n+(s[(v-20)%10]||s[v]||s[0])}

  function installSession(){
    if(!window.GameBoxLAN?.Session)throw new Error('Local multiplayer is unavailable in this browser.');
    session=new window.GameBoxLAN.Session({
      game:'gridline-v6',
      onStatus:text=>{if(role==='host')$('hostState').textContent=text;if(role==='client')$('joinState').textContent=text},
      onPeersChanged:()=>{
        if(role==='client'&&session.peers().length&&pendingHello){pendingHello=false;sendClientHello()}
        if(role==='host'){renderHostLobby();broadcastLobby()}
      },
      onMessage:handleNetworkMessage
    });
  }

  function ensureSession(){if(!session)installSession();return session}
  function sendClientHello(){if(!localPlayer)return;session?.sendToHost({type:'hello',player:localPlayer,profile:getProfile(localPlayer)})}

  function handleNetworkMessage(msg,source){
    if(role==='host'){
      if(msg.type==='hello'&&source.peer){
        source.peer.meta.player={id:String(msg.player?.id||uid()),name:String(msg.player?.name||'Friend').slice(0,24)};
        source.peer.meta.profile=msg.profile||null;
        renderHostLobby();broadcastLobby();return;
      }
      if(msg.type==='race-action'){applyAction(String(msg.playerId||''),msg);return}
    }else if(role==='client'){
      if(msg.type==='lobby'){renderJoinLobby(msg.players||[]);return}
      if(msg.type==='race-state'&&msg.game){applyRemoteGame(msg.game);return}
    }
  }

  function hostPlayers(){
    const hp=roster().find(p=>p.id===$('hostPlayerSelect').value);
    const players=[];
    if(hp)players.push({id:hp.id,name:hp.name,host:true});
    if(session)session.peers().forEach(peer=>{if(peer.meta?.player)players.push({...peer.meta.player,host:false})});
    return players;
  }

  function renderHostLobby(){
    const players=hostPlayers();
    $('hostLobby').innerHTML=players.length?players.map((p,i)=>`<div class="leaderRow"><span class="rank">${i+1}</span><strong>${esc(p.name)}${p.host?' · Host':''}</strong><small>Ready</small></div>`).join(''):'<div class="emptyState">Choose the host player, then connect friends.</div>';
    $('startHostRace').disabled=players.length<2;
  }

  function renderJoinLobby(players){
    $('joinLobby').innerHTML=players.length?players.map((p,i)=>`<div class="leaderRow"><span class="rank">${i+1}</span><strong>${esc(p.name)}${p.host?' · Host':''}</strong><small>Ready</small></div>`).join(''):'<div class="emptyState">Waiting for the host lobby.</div>';
  }

  function broadcastLobby(){if(role==='host'&&session)session.broadcast({type:'lobby',players:hostPlayers()})}

  async function createInvite(){
    role='host';ensureSession();$('hostState').textContent='Creating';
    try{$('hostOffer').value=await session.createHostOffer();$('hostState').textContent='Invite ready'}catch(err){console.error(err);$('hostState').textContent='Error'}
  }

  async function acceptAnswer(){
    role='host';ensureSession();
    try{await session.acceptHostAnswer($('hostAnswer').value);$('hostAnswer').value='';$('hostOffer').value='';$('hostState').textContent='Connecting'}catch(err){console.error(err);$('hostState').textContent='Invalid answer'}
  }

  async function makeAnswer(){
    role='client';ensureSession();
    const p=roster().find(x=>x.id===$('joinPlayerSelect').value);if(!p)return;
    localPlayer=p;pendingHello=true;
    try{$('joinAnswer').value=await session.createClientAnswer($('joinOffer').value);$('joinState').textContent='Answer ready'}catch(err){console.error(err);$('joinState').textContent='Invalid invite'}
  }

  function startHostRace(){
    const hp=roster().find(p=>p.id===$('hostPlayerSelect').value);if(!hp)return;
    localPlayer=hp;playMode='multi';role='host';
    const humans=[{player:hp,owner:'host',profile:getProfile(hp)}];
    session.peers().forEach(peer=>{if(peer.meta?.player)humans.push({player:peer.meta.player,owner:peer.id,profile:peer.meta.profile||null})});
    if(humans.length<2)return;
    game=buildGame(humans);showRace();renderGame();broadcastGame();
    clearInterval(hostTimer);hostTimer=setInterval(hostTick,TICK_MS);
  }

  function startSingleRace(){
    const p=roster().find(x=>x.id===selectedSingleId);if(!p)return;
    localPlayer=p;playMode='single';role='host';
    game=buildGame([{player:p,owner:'local',profile:getProfile(p)}]);
    showRace();renderGame();
    clearInterval(hostTimer);hostTimer=setInterval(hostTick,TICK_MS);
  }

  function leaveRace(){
    clearInterval(hostTimer);clearTimeout(nextRaceTimer);hostTimer=null;nextRaceTimer=null;game=null;
    session?.close();session=null;role=null;playMode='single';showSetup('setupHome');
  }

  function bind(){
    $('chooseSingle').onclick=()=>showSetup('singleSetup');
    $('chooseMulti').onclick=()=>showSetup('multiSetup');
    $('chooseWifi').onclick=()=>showSetup('wifiRole');
    $('chooseBluetooth').onclick=()=>{$('bluetoothNote').classList.remove('hidden')};
    $('chooseHost').onclick=()=>{role='host';showSetup('hostSetup');renderHostLobby()};
    $('chooseJoin').onclick=()=>{role='client';showSetup('joinSetup');renderJoinLobby([])};
    $$('[data-back]').forEach(b=>b.onclick=()=>showSetup(b.dataset.back));
    $('startSingle').onclick=startSingleRace;
    $('hostPlayerSelect').onchange=renderHostLobby;
    $('createInvite').onclick=createInvite;
    $('acceptAnswer').onclick=acceptAnswer;
    $('makeAnswer').onclick=makeAnswer;
    $('startHostRace').onclick=startHostRace;
    $('exitRace').onclick=leaveRace;
    if($('buySponsor'))$('buySponsor').onclick=()=>requestAction({action:'sponsor'});

    document.addEventListener('click',e=>{
      const up=e.target.closest('[data-upgrade]');
      if(up){requestAction({action:'upgrade',stat:up.dataset.upgrade})}
    });

    window.addEventListener('beforeunload',()=>{try{session?.close()}catch{};clearInterval(hostTimer);clearTimeout(nextRaceTimer)});
  }

  syncPlayerSelects();
  renderSinglePlayers();
  bind();
  showSetup('setupHome');
})();