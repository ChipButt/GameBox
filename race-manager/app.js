(() => {
  'use strict';

  const ROSTER_KEY='gamebox.players.v1';
  const PROFILE_KEY='gamebox.gridline.profiles.v4';
  const TICK_MS=300;
  const MAX_GRID=12;
  const RACE_TICKS=200;
  const NEXT_RACE_DELAY=3000;

  const TRACKS=[
    {name:'Harbour Sprint',discipline:'Open Wheel',weather:'Dry',laps:8,profile:'Stop-start · Technical',risk:1.0,weights:{engine:1.25,tyres:1.25,brakes:1.40,fuel:.85}},
    {name:'Alpine Ring',discipline:'Open Wheel',weather:'Cool',laps:10,profile:'Corner-heavy · Big braking zones',risk:1.15,weights:{engine:.85,tyres:1.75,brakes:1.55,fuel:.65}},
    {name:'Desert Oval',discipline:'Stock Car',weather:'Hot',laps:12,profile:'Long straights · High speed',risk:.85,weights:{engine:1.35,tyres:.55,brakes:.65,fuel:1.80}},
    {name:'Forest Stage',discipline:'Rally',weather:'Damp',laps:7,profile:'Technical · Constant direction changes',risk:1.50,weights:{engine:.90,tyres:1.55,brakes:1.45,fuel:.70}}
  ];

  const BOT_NAMES=['Apex North','Redline Works','Vector GP','Copper Fox','Nightshift','Kestrel','Orion Motorsport','Blackbird','Summit Racing','Halo Autosport','Cinder Team','Blue Arrow','Forge Racing','Velocity Union'];

  const UPGRADE_META={
    engine:{label:'Engine',desc:'Acceleration',kind:'car',base:38,step:8},
    tyres:{label:'Tyres',desc:'Cornering grip',kind:'car',base:42,step:8},
    brakes:{label:'Brakes',desc:'Braking performance',kind:'car',base:40,step:8},
    fuel:{label:'Fuel',desc:'Top speed',kind:'car',base:46,step:8},
    sponsors:{label:'Sponsors',desc:'Income multiplier',kind:'income',base:80,factor:1.25},
    fans:{label:'Fan Base',desc:'Advertising multiplier',kind:'income',base:65,factor:1.15}
  };
  const CAR_KEYS=['engine','tyres','brakes','fuel'];
  const INCOME_KEYS=['sponsors','fans'];
  const UPGRADE_KEYS=[...CAR_KEYS,...INCOME_KEYS];

  const UPGRADE_ICONS={
    engine:`<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M7 10h15l3 4v10H7z"/><path d="M11 7h8v3M4 14h3v7H4M25 16h3v6h-3M10 15h5v5h-5M18 14h4v7h-4"/></svg>`,
    tyres:`<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="11"/><circle cx="16" cy="16" r="5"/><path d="M10 7l3 5M18 5l2 6M23 8l-4 5M25 17l-6 1M21 25l-4-6M13 27l1-7M7 22l6-3M6 14l6 1"/></svg>`,
    brakes:`<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="15" cy="16" r="10"/><circle cx="15" cy="16" r="3"/><path d="M21 9h5v14h-5l-3-3V12z"/><path d="M11 8l2 4M9 16h5M12 24l2-4"/></svg>`,
    fuel:`<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M8 5h12v22H8z"/><path d="M11 9h6v6h-6zM20 10h3l4 4v10c0 2-1 3-3 3s-3-1-3-3v-5"/><path d="M23 10l3-3"/></svg>`,
    sponsors:`<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M4 15l7-7 6 3 4-2 7 7-9 9-4-4-3 3z"/><path d="M11 14l5 5M15 12l5 5M8 17l4 4"/></svg>`,
    fans:`<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="9" r="4"/><circle cx="7" cy="13" r="3"/><circle cx="25" cy="13" r="3"/><path d="M9 27v-5c0-4 3-7 7-7s7 3 7 7v5M2 26v-4c0-3 2-5 5-5M30 26v-4c0-3-2-5-5-5"/></svg>`
  };
  const upgradeIcon=key=>`<span class="upgradeIcon">${UPGRADE_ICONS[key]||''}</span>`;

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

  function normaliseLevels(raw={},legacySponsor=0){
    return {
      engine:Math.max(1,finite(raw.engine,finite(raw.throttle,finite(raw.attack,1)))),
      tyres:Math.max(1,finite(raw.tyres,finite(raw.cornering,finite(raw.handling,1)))),
      brakes:Math.max(1,finite(raw.brakes,finite(raw.defence,finite(raw.focus,1)))),
      fuel:Math.max(1,finite(raw.fuel,finite(raw.passing,finite(raw.reliability,1)))),
      sponsors:Math.max(1,finite(raw.sponsors,1+finite(legacySponsor,0))),
      fans:Math.max(1,finite(raw.fans,1))
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
      levels:normaliseLevels(saved.levels,saved.sponsorLevel),
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
      races:p.races,
      best:p.best||0,
      progress:0,
      finishTick:null,
      position:null
    };
  }

  const STAT_KEYS=UPGRADE_KEYS;

  function botSkill(raceNo,i){
    return clamp(.12+Math.max(0,(raceNo||1)-1)*.045+(i%4)*.025,.12,.94);
  }

  function botDecisionDelay(skill){
    return Math.max(7,Math.round(34-skill*25+Math.random()*7));
  }

  function botEntrant(name,i,track,raceNo=1){
    const levels={};STAT_KEYS.forEach(key=>levels[key]=1);
    const skill=botSkill(raceNo,i);
    return {
      id:'bot-'+i+'-'+uid().slice(0,4),name,human:false,levels,
      cash:180,gems:0,
      aiSkill:skill,
      aiFocus:STAT_KEYS[i%STAT_KEYS.length],
      nextDecision:18+Math.round(Math.random()*botDecisionDelay(skill)),
      progress:0,finishTick:null,position:null
    };
  }

  function carLevelTotal(e){return CAR_KEYS.reduce((sum,key)=>sum+finite(e.levels?.[key],1),0)}
  function incomeFactor(level,key){return Math.pow(UPGRADE_META[key].factor,Math.max(0,finite(level,1)-1))}
  function incomeRate(e){
    const sponsors=incomeFactor(e.levels?.sponsors,'sponsors');
    const fans=incomeFactor(e.levels?.fans,'fans');
    return 5*sponsors*fans;
  }
  function power(e){return Math.round(48+carLevelTotal(e)*3)}
  function statPercent(e,stat){return Math.max(0,(Math.max(1,finite(e.levels?.[stat],1))-1)*UPGRADE_META[stat].step)}
  function upgradeCost(e,stat){
    const lvl=Math.max(1,finite(e.levels?.[stat],1));
    const growth=UPGRADE_META[stat].kind==='income'?1.50:1.40;
    return Math.round(UPGRADE_META[stat].base*Math.pow(growth,lvl-1));
  }
  function localEntrant(){return game?.entrants?.find(e=>e.human&&e.playerId===localPlayer?.id)||null}

  function seedGrid(entrants){
    entrants.sort(()=>Math.random()-.5);
    entrants.forEach((e,i)=>{
      e.progress=(entrants.length-i-1)*0.16;
      e.finishTick=null;
      e.position=null;
    });
  }

  function readyMap(){
    const ready={};
    for(const e of game?.entrants||[])if(e.human)ready[e.playerId]=false;
    return ready;
  }

  function buildGame(humans){
    const trackIndex=((humans[0]?.profile?.races??humans[0]?.races??0))%TRACKS.length;
    const track=TRACKS[trackIndex];
    const entrants=humans.map(h=>entrantFromPlayer(h.player,h.owner,h.profile||null));
    const botPool=[...BOT_NAMES].sort(()=>Math.random()-.5);
    for(let i=entrants.length;i<MAX_GRID;i++)entrants.push(botEntrant(botPool[i%botPool.length],i,track,(entrants.find(e=>e.human)?.races||0)+1));
    seedGrid(entrants);
    return {phase:'countdown',countdownTicks:13,raceNo:(entrants.find(e=>e.human)?.races||0)+1,trackIndex,tick:0,maxTicks:RACE_TICKS,entrants,results:[],ready:{}};
  }

  function resetRound(){
    if(!game)return;
    game.trackIndex=(game.trackIndex+1)%TRACKS.length;
    game.raceNo++;
    game.tick=0;
    game.phase='countdown';
    game.countdownTicks=13;
    game.results=[];
    game.ready={};
    const track=TRACKS[game.trackIndex];
    game.entrants.forEach((e,i)=>{
      e.progress=0;e.finishTick=null;e.position=null;
      if(!e.human){
        e.aiSkill=botSkill(game.raceNo,i);
        e.aiFocus=e.aiFocus||STAT_KEYS[i%STAT_KEYS.length];
        e.nextDecision=12+Math.round(Math.random()*botDecisionDelay(e.aiSkill));
      }
    });
    seedGrid(game.entrants);
    broadcastGame();
    renderGame();
  }

  function speedFor(e,ahead){
    const track=TRACKS[game.trackIndex]||TRACKS[0];
    const launch=clamp(game.tick/18,.28,1);
    const levels=normaliseLevels(e.levels);
    const engine=Math.max(0,levels.engine-1);
    const tyres=Math.max(0,levels.tyres-1);
    const brakes=Math.max(0,levels.brakes-1);
    const fuel=Math.max(0,levels.fuel-1);

    const lapPhase=((e.progress/100)*(track.laps||8))%1;
    const brakingZone=(lapPhase>.16&&lapPhase<.25)||(lapPhase>.56&&lapPhase<.65);
    const cornerZone=(lapPhase>=.25&&lapPhase<.40)||(lapPhase>=.65&&lapPhase<.82);
    const accelerationZone=(lapPhase>=.40&&lapPhase<.52)||(lapPhase>=.82&&lapPhase<.94);
    const straightZone=!brakingZone&&!cornerZone&&!accelerationZone;

    let speed=.468-(e.human?0:.003);
    speed+=fuel*.0060*(track.weights.fuel||1);
    speed+=engine*.0035*(track.weights.engine||1);

    if(straightZone)speed+=fuel*.0080*(track.weights.fuel||1);
    if(accelerationZone)speed+=engine*.0110*(track.weights.engine||1);
    if(brakingZone){
      speed-=.020*(track.weights.brakes||1);
      speed+=brakes*.0100*(track.weights.brakes||1);
    }
    if(cornerZone){
      speed-=.025*(track.weights.tyres||1);
      speed+=tyres*.0110*(track.weights.tyres||1);
      speed+=brakes*.0025*(track.weights.brakes||1);
    }

    const stability=1+tyres*.05+brakes*.04;
    const noise=(Math.random()-.5)*((e.human ? .026 : .022)/stability);
    const incidentChance=(.0038*(track.risk||1))/stability;
    const incident=Math.random()<incidentChance?-(.05+Math.random()*.08):0;

    if(ahead&&ahead.finishTick===null){
      const gap=ahead.progress-e.progress;
      if(gap>0&&gap<.24){
        const control=Math.max(0,(levels.tyres-1)+(levels.brakes-1));
        const contactPenalty=Math.max(.003,.016-control*.0014);
        speed-=contactPenalty*(1-gap/.24);
      }
    }

    return Math.max(.16,(speed+noise+incident)*launch);
  }

  function botUpgradeScore(e,stat,rank,track,remainingSec){
    const meta=UPGRADE_META[stat];
    const cost=upgradeCost(e,stat);
    let value=0;

    if(meta.kind==='income'){
      const current=incomeRate(e);
      const preview={...e,levels:{...e.levels,[stat]:finite(e.levels?.[stat],1)+1}};
      const gain=incomeRate(preview)-current;
      const paybackValue=(gain*remainingSec)/Math.max(1,cost);
      value=paybackValue*60;
      if(remainingSec<18)value*=.15;
    }else{
      const affinity=track.weights[stat]||1;
      const baseEffect={engine:.0145,tyres:.0135,brakes:.0125,fuel:.0140}[stat]||.01;
      value=(baseEffect*affinity*10000)/Math.pow(cost,.68);
      if(rank>6&&stat==='engine')value*=1.08;
      if((track.risk||1)>1.2&&(stat==='tyres'||stat==='brakes'))value*=1.10;
    }

    const focusBias=stat===e.aiFocus?1+(1-e.aiSkill)*1.8:1;
    return value*focusBias;
  }

  function maybeBotDecision(e,order){
    if(e.human||e.finishTick!==null||game.tick<finite(e.nextDecision,0))return;

    const track=TRACKS[game.trackIndex]||TRACKS[0];
    const skill=clamp(finite(e.aiSkill,.15),.1,.95);
    const rank=Math.max(1,order.findIndex(x=>x.id===e.id)+1);
    const remainingSec=Math.max(0,(game.maxTicks-game.tick)*TICK_MS/1000);

    const options=STAT_KEYS.map(stat=>({
      stat,
      cost:upgradeCost(e,stat),
      score:botUpgradeScore(e,stat,rank,track,remainingSec)
    })).sort((a,b)=>b.score-a.score);

    const best=options[0];

    if(best&&e.cash>=best.cost){
      const optimality=.25+skill*.72;
      if(Math.random()<optimality){
        e.cash-=best.cost;
        e.levels[best.stat]=Math.max(1,finite(e.levels[best.stat],1))+1;
      }else{
        const affordable=options.filter(o=>e.cash>=o.cost);
        const choice=affordable.find(o=>o.stat===e.aiFocus)||affordable[Math.floor(Math.random()*Math.max(1,affordable.length))];
        if(choice){
          e.cash-=choice.cost;
          e.levels[choice.stat]=Math.max(1,finite(e.levels[choice.stat],1))+1;
        }
      }
    }else if(best){
      const affordable=options.filter(o=>e.cash>=o.cost);
      const saveForBest=skill>.38||best.cost-e.cash<incomeRate(e)*5;
      if(!saveForBest&&affordable.length){
        const choice=affordable.find(o=>o.stat===e.aiFocus)||affordable[0];
        e.cash-=choice.cost;
        e.levels[choice.stat]=Math.max(1,finite(e.levels[choice.stat],1))+1;
      }
    }

    e.nextDecision=game.tick+botDecisionDelay(skill);
  }

  function hostTick(){
    if(!game)return;

    if(game.phase==='countdown'){
      game.countdownTicks=Math.max(0,finite(game.countdownTicks,13)-1);
      if(game.countdownTicks<=0){
        game.phase='race';
        game.tick=0;
      }
      broadcastGame();
      renderGame();
      return;
    }

    if(game.phase!=='race')return;
    game.tick++;
    const order=[...game.entrants].sort((a,b)=>b.progress-a.progress);
    for(const e of game.entrants)e.cash+=incomeRate(e)*(TICK_MS/1000);
    for(const e of game.entrants)maybeBotDecision(e,order);
    for(const e of game.entrants){
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
    game.phase='intermission';
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
    for(const e of sorted){
      const cash=cashPayouts[e.position-1]||35;
      e.cash+=cash;
      if(e.human){
        const gems=gemPayouts[e.position-1]||1;
        e.gems=(e.gems||0)+gems;
        e.races=(e.races||0)+1;
        e.best=!e.best?e.position:Math.min(e.best,e.position);
        saveProfileFromEntrant(e);
      }
    }

    game.ready=readyMap();
    broadcastGame();
    renderGame();
  }

  function applyAction(playerId,msg){
    if(!game)return;
    const e=game.entrants.find(x=>x.human&&x.playerId===playerId);
    if(!e)return;

    if(msg.action==='ready'){
      if(game.phase!=='intermission')return;
      game.ready=game.ready||readyMap();
      game.ready[playerId]=true;
      const humans=game.entrants.filter(x=>x.human);
      const allReady=humans.length>0&&humans.every(x=>game.ready?.[x.playerId]);
      if(allReady){
        resetRound();
        return;
      }
      broadcastGame();
      renderGame();
      return;
    }

    if(game.phase!=='race'||msg.action!=='upgrade'||!UPGRADE_META[msg.stat])return;
    const cost=upgradeCost(e,msg.stat);
    if(e.cash<cost)return;
    e.cash-=cost;
    e.levels[msg.stat]=Math.max(1,finite(e.levels[msg.stat],1))+1;
    saveProfileFromEntrant(e);
    broadcastGame();
    renderGame();
  }

  function requestAction(msg){
    if(!localPlayer||!game)return;
    if(msg.action==='upgrade'&&game.phase!=='race')return;
    if(msg.action==='ready'&&game.phase!=='intermission')return;
    if(playMode==='single'||role==='host')applyAction(localPlayer.id,msg);
    else session?.sendToHost({type:'race-action',playerId:localPlayer.id,...msg});
  }

  function publicGame(){
    if(!game)return null;
    return {
      phase:game.phase,countdownTicks:game.countdownTicks,ready:game.ready||{},raceNo:game.raceNo,trackIndex:game.trackIndex,tick:game.tick,maxTicks:game.maxTicks,results:game.results,
      entrants:game.entrants.map(e=>({
        id:e.id,playerId:e.playerId,name:e.name,human:e.human,owner:e.owner,levels:e.levels,cash:e.cash,gems:e.gems,aiSkill:e.aiSkill,aiFocus:e.aiFocus,nextDecision:e.nextDecision,races:e.races,best:e.best,progress:e.progress,finishTick:e.finishTick,position:e.position
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
    $('trackMeta').textContent=`${track.discipline} · ${track.weather}`;
    if($('trackFocus'))$('trackFocus').textContent=track.profile;
    if($('sponsorName'))$('sponsorName').textContent='Chip In Racing';
    if($('power'))$('power').textContent=power(me);

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

    renderRaceLanes(sorted);

    $('upgradeGrid').innerHTML=UPGRADE_KEYS.map(key=>{
      const m=UPGRADE_META[key];
      const lvl=Math.max(1,finite(me.levels[key],1));
      const cost=upgradeCost(me,key);
      const disabled=game.phase!=='race'||me.cash<cost;

      if(m.kind==='income'){
        const currentFactor=incomeFactor(lvl,key);
        const nextFactor=incomeFactor(lvl+1,key);
        return `<button class="upgradeButton incomeUpgrade ${key}" data-upgrade="${key}" type="button" ${disabled?'disabled':''}>
          ${upgradeIcon(key)}
          <strong class="upgradeTitle">${esc(m.label)}</strong>
          <span class="upgradeLevel">LEVEL ${lvl}</span>
          <span class="upgradeCost">UPGRADE ${money(cost)}</span>
          <small class="upgradeMath">${esc(m.desc)} · ×${currentFactor.toFixed(2)} → ×${nextFactor.toFixed(2)}</small>
        </button>`;
      }

      const current=statPercent(me,key);
      const next=current+m.step;
      const affinity=track.weights[key]||1;
      const hot=affinity>=1.30?' trackHot':'';
      return `<button class="upgradeButton carUpgrade${hot}" data-upgrade="${key}" type="button" ${disabled?'disabled':''}>
        ${upgradeIcon(key)}
        <strong class="upgradeTitle">${esc(m.label)}</strong>
        <span class="upgradeLevel">LEVEL ${lvl}</span>
        <span class="upgradeCost">UPGRADE ${money(cost)}</span>
        <small class="upgradeMath">${esc(m.desc)} · +${current}% → +${next}% · Track ×${affinity.toFixed(1)}</small>
      </button>`;
    }).join('');

    renderCountdown();

    if(game.phase==='race'||game.phase==='countdown'){
      if($('raceStatus'))$('raceStatus').innerHTML=game.phase==='race'
        ?'<strong>Race live</strong><span>Income keeps coming in. Upgrade while the field races automatically.</span>'
        :'<strong>Get ready</strong><span>Race start sequence in progress.</span>';
      $('resultCard').classList.add('hidden');
    }else if(game.phase==='intermission'){
      renderResult(me);
    }
  }

  function renderRaceLanes(sorted){
    const wrap=$('raceLanes');
    const existing=new Map(
      Array.from(wrap.querySelectorAll('.raceLane')).map(row=>[row.dataset.racerId,row])
    );

    for(const e of sorted){
      let row=existing.get(e.id);
      if(!row){
        row=document.createElement('div');
        row.className='raceLane';
        row.dataset.racerId=e.id;
        row.innerHTML='<span class="pos" aria-hidden="true"></span><span class="name"></span>';
        wrap.appendChild(row);
      }
      row.className=`raceLane ${e.human?'human':''} ${e.playerId===localPlayer.id?'you':''}`;
      row.dataset.progress=String(clamp(e.progress,0,100));
      row.querySelector('.name').textContent=e.name;
      existing.delete(e.id);
    }

    for(const row of existing.values())row.remove();
  }

  function renderCountdown(){
    const overlay=$('countdownOverlay');
    if(!overlay)return;
    if(game.phase!=='countdown'){
      overlay.classList.add('hidden');
      return;
    }

    const ticks=Math.max(0,finite(game.countdownTicks,13));
    const label=ticks>=10?'3':ticks>=7?'2':ticks>=4?'1':'GO!';
    const lit=label==='3'?1:label==='2'?2:3;
    overlay.classList.remove('hidden');
    overlay.classList.toggle('go',label==='GO!');
    $('countdownText').textContent=label;
    Array.from(overlay.querySelectorAll('.startLight')).forEach((light,index)=>{
      light.classList.toggle('lit',index<lit);
      light.classList.toggle('green',label==='GO!');
    });
  }

  function renderResult(me){
    const card=$('resultCard');
    const cashPayouts=[220,180,150,125,105,90,78,68,60,52,46,40];
    const gemPayouts=[5,4,3,2,2,1,1,1,1,1,1,1];
    const cash=cashPayouts[(me.position||12)-1]||35;
    const gems=gemPayouts[(me.position||12)-1]||1;
    const humans=game.entrants.filter(e=>e.human);
    const readyCount=humans.filter(e=>game.ready?.[e.playerId]).length;
    const amReady=!!game.ready?.[me.playerId];
    card.classList.remove('hidden');
    card.innerHTML=`
      <span class="eyebrow">RACE COMPLETE</span>
      <h2>${ordinal(me.position||12)} place</h2>
      <div class="resultGrid">
        <div><span>Cash</span><strong>+${money(cash)}</strong></div>
        <div><span>Gems</span><strong>+${gems}</strong></div>
        <div><span>Players ready</span><strong>${readyCount} / ${humans.length}</strong></div>
      </div>
      <button class="readyRaceButton" data-ready-race type="button" ${amReady?'disabled':''}>${amReady?'READY ✓':'READY FOR NEXT RACE'}</button>
      <small class="readyRaceNote">${amReady?'Waiting for the other players…':'The countdown starts when every player is ready.'}</small>
    `;
    if($('raceStatus'))$('raceStatus').innerHTML='<strong>Race complete</strong><span>Waiting for every player to confirm the next start.</span>';
  }

  function ordinal(n){n=Number(n)||0;const s=['th','st','nd','rd'],v=n%100;return n+(s[(v-20)%10]||s[v]||s[0])}

  function animateCoinTransfer(button){
    const source=$('cash');
    if(!source||!button)return;
    const from=source.getBoundingClientRect();
    const to=button.getBoundingClientRect();
    const sx=from.left+from.width/2;
    const sy=from.top+from.height/2;
    const tx=to.left+to.width/2;
    const ty=to.top+to.height/2;

    button.classList.add('receivingCoins');
    for(let i=0;i<6;i++){
      const coin=document.createElement('span');
      coin.className='upgradeCoinFx';
      coin.textContent='£';
      coin.style.left=`${sx-8}px`;
      coin.style.top=`${sy-8}px`;
      document.body.appendChild(coin);
      const bend=(i-2.5)*9;
      const animation=coin.animate([
        {transform:'translate(0,0) scale(.65)',opacity:0},
        {transform:`translate(${(tx-sx)*.38+bend}px,${(ty-sy)*.32-18-Math.abs(bend)*.25}px) scale(1)`,opacity:1,offset:.35},
        {transform:`translate(${tx-sx+bend*.08}px,${ty-sy}px) scale(.55)`,opacity:.15}
      ],{duration:430+i*24,delay:i*35,easing:'cubic-bezier(.22,.74,.32,1)',fill:'forwards'});
      animation.onfinish=()=>coin.remove();
    }
    setTimeout(()=>button.classList.remove('receivingCoins'),620);
  }

  function installSession(){
    if(!window.GameBoxLAN?.Session)throw new Error('Local multiplayer is unavailable in this browser.');
    session=new window.GameBoxLAN.Session({
      game:'gridline-v11',
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

    document.addEventListener('click',e=>{
      const ready=e.target.closest('[data-ready-race]');
      if(ready&&!ready.disabled){
        requestAction({action:'ready'});
        return;
      }
      const up=e.target.closest('[data-upgrade]');
      if(up&&!up.disabled){
        animateCoinTransfer(up);
        requestAction({action:'upgrade',stat:up.dataset.upgrade});
      }
    });

    window.addEventListener('beforeunload',()=>{try{session?.close()}catch{};clearInterval(hostTimer);clearTimeout(nextRaceTimer)});
  }

  syncPlayerSelects();
  renderSinglePlayers();
  bind();
  showSetup('setupHome');
})();