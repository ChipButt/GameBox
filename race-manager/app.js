(() => {
  'use strict';

  const ROSTER_KEY='gamebox.players.v1';
  const PROFILE_KEY='gamebox.gridline.profiles.v4';
  const TICK_MS=300;
  const MAX_GRID=12;
  const RACE_TICKS=200;

  const TRACKS=[
    {name:'Autumn River Valley',asset:'autumn_river_valley_circuit.png',discipline:'GT',weather:'Clear',laps:8,profile:'Flowing bends · River bridge',risk:1.15,weights:{engine:1.05,tyres:1.45,brakes:1.20,fuel:1.00}},
    {name:'Forest Lake',asset:'forest_lake_circuit.png',discipline:'GT',weather:'Dry',laps:7,profile:'Technical · Lakeside sweepers',risk:1.25,weights:{engine:1.00,tyres:1.55,brakes:1.25,fuel:.85}},
    {name:'Desert Canyon',asset:'desert_canyon_circuit.png',discipline:'GT',weather:'Hot',laps:8,profile:'Long straights · Tight hairpins',risk:1.10,weights:{engine:1.35,tyres:.90,brakes:1.10,fuel:1.55}},
    {name:'Tropical Island',asset:'tropical_island_circuit.png',discipline:'GT',weather:'Sunny',laps:8,profile:'Coastal sweepers · Fast exits',risk:1.20,weights:{engine:1.20,tyres:1.35,brakes:1.05,fuel:1.15}}
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

  const RACE_EVENTS=[
    {title:'Rain on the next sector',prompt:'What is the call?',choices:['Change tyres','Push on'],correct:0,boost:{stat:'tyres',amount:2,label:'Cornering grip'},duration:20},
    {title:'Clear track ahead',prompt:'How do you use it?',choices:['Push on','Save the car'],correct:0,boost:{stat:'engine',amount:2,label:'Acceleration'},duration:18},
    {title:'Heavy braking zone ahead',prompt:'Choose the approach.',choices:['Brake earlier','Send it deep'],correct:0,boost:{stat:'brakes',amount:2,label:'Braking'},duration:20},
    {title:'Long straight opening up',prompt:'Choose the setup.',choices:['Lean the fuel mix','Protect the tyres'],correct:0,boost:{stat:'fuel',amount:2,label:'Top speed'},duration:18},
    {title:'Cars bunching ahead',prompt:'Pick your move.',choices:['Hold the clean line','Dive immediately'],correct:0,boost:{stat:'speed',amount:.035,label:'Clear-air speed'},duration:17},
    {title:'Grip is coming to you',prompt:'What do you do?',choices:['Use the grip now','Wait another lap'],correct:0,boost:{stat:'tyres',amount:2,label:'Cornering grip'},duration:18}
  ];

  const ASSET_ROOT='assets';
  const upgradeAsset=(key,enabled)=>`${ASSET_ROOT}/ui/upgrades/${enabled?'enabled':'disabled'}/${key==='fans'?'fan_base':key}.png`;

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
  let pendingHello=false;
  let raceSetup={mode:'quick',trackIndex:0,races:5};
  const prizeAnimations=new Set();

  function roster(){
    const items=read(ROSTER_KEY,[]);
    return Array.isArray(items)?items.filter(p=>p&&p.id&&String(p.name||'').trim()).map(p=>({id:String(p.id),name:String(p.name).trim()})):[];
  }

  function profiles(){const p=read(PROFILE_KEY,{});return p&&typeof p==='object'?p:{}}

  function baseLevels(){
    return {engine:1,tyres:1,brakes:1,fuel:1,sponsors:1,fans:1};
  }

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
      cash:0,
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
      cash:0,
      gems:Math.max(0,Math.round(e.gems||0)),
      levels:old.levels||baseLevels(),
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
    if(id==='singleSetup'){renderSinglePlayers();renderRaceSetup()}
    if(id==='hostSetup'){syncPlayerSelects();renderRaceSetup()}
    if(id==='joinSetup')syncPlayerSelects();
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

  function setupConfig(){
    return {
      mode:raceSetup.mode==='tournament'?'tournament':'quick',
      trackIndex:clamp(Math.round(finite(raceSetup.trackIndex,0)),0,TRACKS.length-1),
      totalRaces:raceSetup.mode==='tournament'?clamp(Math.round(finite(raceSetup.races,5)),3,15):1
    };
  }

  function renderRaceSetup(){
    const config=setupConfig();
    $$('[data-race-mode]').forEach(button=>button.classList.toggle('selected',button.dataset.raceMode===config.mode));
    for(const prefix of ['single','host']){
      const length=$(prefix+'TournamentLength');
      if(length)length.classList.toggle('hidden',config.mode!=='tournament');
      const input=$(prefix+'RaceCount');
      const value=$(prefix+'RaceCountValue');
      if(input)input.value=String(config.totalRaces===1?raceSetup.races:config.totalRaces);
      if(value)value.textContent=`${config.totalRaces===1?raceSetup.races:config.totalRaces} races`;
      const wrap=$(prefix+'TrackChoices');
      if(wrap)wrap.innerHTML=TRACKS.map((track,index)=>`
        <button class="trackChoice ${index===config.trackIndex?'selected':''}" data-track-index="${index}" type="button">
          <img src="${ASSET_ROOT}/tracks/${esc(track.asset)}" alt="">
          <span><strong>${esc(track.name)}</strong><small>${esc(track.profile)} · ${track.laps} laps</small></span>
        </button>
      `).join('');
    }
    if(role==='host'&&session){
      const p=roster().find(x=>x.id===$('hostPlayerSelect')?.value);
      session.updateHost?.({
        hostName:p?`${p.name}'s Gridline Race`:'Gridline Race',
        raceMode:config.mode,
        trackName:TRACKS[config.trackIndex].name,
        totalRaces:config.totalRaces
      });
      broadcastLobby();
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
      levels:baseLevels(),
      cash:0,
      gems:p.gems,
      races:p.races,
      best:p.best||0,
      progress:0,
      finishTick:null,
      position:null,
      eventCount:0,
      eventCooldownUntil:18,
      activeEvent:null,
      boost:null,
      eventResult:null
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
      cash:0,gems:0,
      aiSkill:skill,
      aiFocus:STAT_KEYS[i%STAT_KEYS.length],
      nextDecision:18+Math.round(Math.random()*botDecisionDelay(skill)),
      progress:0,finishTick:null,position:null,
      eventCount:0,eventCooldownUntil:18,activeEvent:null,boost:null,eventResult:null
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
    entrants.forEach(e=>{
      e.progress=0;
      e.finishTick=null;
      e.position=null;
    });
  }

  function readyMap(){
    const ready={};
    for(const e of game?.entrants||[])if(e.human)ready[e.playerId]=false;
    return ready;
  }

  function buildGame(humans,config=setupConfig()){
    const mode=config.mode==='tournament'?'tournament':'quick';
    const startTrackIndex=clamp(Math.round(finite(config.trackIndex,0)),0,TRACKS.length-1);
    const totalRaces=mode==='tournament'?clamp(Math.round(finite(config.totalRaces,5)),3,15):1;
    const track=TRACKS[startTrackIndex];
    const entrants=humans.map(h=>entrantFromPlayer(h.player,h.owner,h.profile||null));
    const botPool=[...BOT_NAMES].sort(()=>Math.random()-.5);
    for(let i=entrants.length;i<MAX_GRID;i++)entrants.push(botEntrant(botPool[i%botPool.length],i,track,1));
    entrants.forEach(e=>{e.levels=baseLevels();e.cash=0;e.lastPrize=0;e.cashBeforePrize=0});
    seedGrid(entrants);
    prizeAnimations.clear();
    return {
      phase:'countdown',
      countdownTicks:12,
      mode,
      totalRaces,
      raceNo:1,
      startTrackIndex,
      trackIndex:startTrackIndex,
      tick:0,
      maxTicks:RACE_TICKS,
      entrants,
      results:[],
      ready:{}
    };
  }

  function resetRound(){
    if(!game||game.raceNo>=game.totalRaces)return;
    game.raceNo++;
    game.trackIndex=(game.startTrackIndex+game.raceNo-1)%TRACKS.length;
    game.tick=0;
    game.phase='countdown';
    game.countdownTicks=12;
    game.results=[];
    game.ready={};
    game.entrants.forEach((e,i)=>{
      e.progress=0;e.finishTick=null;e.position=null;
      e.lastPrize=0;e.cashBeforePrize=e.cash;
      e.eventCount=0;e.eventCooldownUntil=18;e.activeEvent=null;e.boost=null;e.eventResult=null;
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
    const activeBoost=e.boost&&finite(e.boost.untilTick,0)>game.tick?e.boost:null;
    const engine=Math.max(0,levels.engine-1)+(activeBoost?.stat==='engine'?finite(activeBoost.amount,0):0);
    const tyres=Math.max(0,levels.tyres-1)+(activeBoost?.stat==='tyres'?finite(activeBoost.amount,0):0);
    const brakes=Math.max(0,levels.brakes-1)+(activeBoost?.stat==='brakes'?finite(activeBoost.amount,0):0);
    const fuel=Math.max(0,levels.fuel-1)+(activeBoost?.stat==='fuel'?finite(activeBoost.amount,0):0);

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
        const control=Math.max(0,tyres+brakes);
        const contactPenalty=Math.max(.003,.016-control*.0014);
        speed-=contactPenalty*(1-gap/.24);
      }
    }

    if(activeBoost?.stat==='speed')speed+=finite(activeBoost.amount,.035);

    return Math.max(.16,(speed+noise+incident)*launch);
  }

  function eventChanceForRank(rank,total){
    if(rank<=1||total<=1)return 0;
    const backness=clamp((rank-1)/(total-1),0,1);
    return Math.pow(backness,1.55)*.042;
  }

  function maybeCreateRaceEvent(e,rank,total){
    if(!e.human||e.finishTick!==null||game.tick<18||game.tick>game.maxTicks-16)return;
    if(finite(e.eventCount,0)>=3||e.activeEvent||game.tick<finite(e.eventCooldownUntil,0))return;
    if(Math.random()>=eventChanceForRank(rank,total))return;

    const template=RACE_EVENTS[Math.floor(Math.random()*RACE_EVENTS.length)];
    const eventId=uid().slice(0,8);
    let choices=[...template.choices];
    let correct=template.correct;
    if(Math.random()<.5){
      choices=choices.reverse();
      correct=1-correct;
    }
    e.eventCount=finite(e.eventCount,0)+1;
    e.activeEvent={
      id:eventId,
      title:template.title,
      prompt:template.prompt,
      choices,
      correct,
      boost:{...template.boost},
      duration:template.duration,
      expiresTick:game.tick+15
    };
    e.eventCooldownUntil=game.tick+40;
  }

  function updateRaceEvents(order){
    const humans=game.entrants.filter(e=>e.human);
    for(const e of humans){
      if(e.boost&&finite(e.boost.untilTick,0)<=game.tick)e.boost=null;
      if(e.eventResult&&finite(e.eventResult.untilTick,0)<=game.tick)e.eventResult=null;
      if(e.activeEvent&&finite(e.activeEvent.expiresTick,0)<=game.tick){
        e.activeEvent=null;
        e.eventCooldownUntil=Math.max(finite(e.eventCooldownUntil,0),game.tick+24);
      }
      const rank=Math.max(1,order.findIndex(x=>x.id===e.id)+1);
      maybeCreateRaceEvent(e,rank,order.length);
    }
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
      game.countdownTicks=Math.max(0,finite(game.countdownTicks,12)-1);
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
    updateRaceEvents(order);
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
      const prize=cashPayouts[e.position-1]||35;
      e.cashBeforePrize=e.cash;
      e.lastPrize=prize;
      e.cash+=prize;
      if(e.human){
        const gems=gemPayouts[e.position-1]||1;
        e.gems=(e.gems||0)+gems;
        e.races=(e.races||0)+1;
        e.best=!e.best?e.position:Math.min(e.best,e.position);
        saveProfileFromEntrant(e);
      }
    }

    game.phase=game.raceNo>=game.totalRaces?'complete':'intermission';
    game.ready=game.phase==='intermission'?readyMap():{};
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

    if(msg.action==='event-choice'){
      if(game.phase!=='race'||!e.activeEvent)return;
      if(String(msg.eventId)!==String(e.activeEvent.id))return;
      const choice=Number(msg.choice);
      const correct=choice===Number(e.activeEvent.correct);
      if(correct){
        const bonus=e.activeEvent.boost||{};
        e.boost={
          stat:bonus.stat,
          amount:bonus.amount,
          label:bonus.label||'Performance',
          untilTick:game.tick+Math.max(12,finite(e.activeEvent.duration,18))
        };
        e.eventResult={correct:true,text:`${e.boost.label} boost`,untilTick:game.tick+8};
      }else{
        e.eventResult={correct:false,text:'No bonus — keep racing',untilTick:game.tick+7};
      }
      e.activeEvent=null;
      e.eventCooldownUntil=Math.max(finite(e.eventCooldownUntil,0),game.tick+28);
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
    if((msg.action==='upgrade'||msg.action==='event-choice')&&game.phase!=='race')return;
    if(msg.action==='ready'&&game.phase!=='intermission')return;
    if(playMode==='single'||role==='host')applyAction(localPlayer.id,msg);
    else session?.sendToHost({type:'race-action',playerId:localPlayer.id,...msg});
  }

  function publicGame(){
    if(!game)return null;
    return {
      phase:game.phase,countdownTicks:game.countdownTicks,ready:game.ready||{},mode:game.mode,totalRaces:game.totalRaces,startTrackIndex:game.startTrackIndex,raceNo:game.raceNo,trackIndex:game.trackIndex,tick:game.tick,maxTicks:game.maxTicks,results:game.results,
      entrants:game.entrants.map(e=>({
        id:e.id,playerId:e.playerId,name:e.name,human:e.human,owner:e.owner,levels:e.levels,cash:e.cash,cashBeforePrize:e.cashBeforePrize,lastPrize:e.lastPrize,gems:e.gems,aiSkill:e.aiSkill,aiFocus:e.aiFocus,nextDecision:e.nextDecision,races:e.races,best:e.best,progress:e.progress,finishTick:e.finishTick,position:e.position,eventCount:e.eventCount,eventCooldownUntil:e.eventCooldownUntil,activeEvent:e.activeEvent,boost:e.boost,eventResult:e.eventResult
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

    $('raceScreen').dataset.phase=game.phase;
    $('activePlayerName').textContent=localPlayer.name;
    if($('profilePlayerName'))$('profilePlayerName').textContent=localPlayer.name;
    $('cash').textContent=money(me.cash);
    $('sponsorRate').textContent=money(incomeRate(me))+'/s';
    $('raceNumber').textContent=`Race\n${game.totalRaces>1?`${game.raceNo}/${game.totalRaces}`:String(game.raceNo)}`;
    if($('gems'))$('gems').textContent=Math.round(me.gems||0);
    $('trackName').textContent=track.name;
    $('trackMeta').textContent=`${track.discipline} · ${track.weather}`;
    if($('trackFocus'))$('trackFocus').textContent=track.profile;
    if($('sponsorName'))$('sponsorName').textContent='Chip In Racing';
    if($('power'))$('power').textContent=power(me);

    const sorted=[...game.entrants].sort((a,b)=>(b.progress-a.progress)||String(a.name).localeCompare(String(b.name)));
    const currentPos=me.position||sorted.findIndex(e=>e.id===me.id)+1;
    $('position').textContent=ordinal(currentPos);
    if($('liveSponsor'))$('liveSponsor').textContent='+'+money(incomeRate(me));

    const racePct=clamp(me.progress,0,100);
    const lap=Math.min(track.laps,Math.max(1,Math.floor((racePct/100)*track.laps)+1));
    $('lapText').textContent=`Lap ${lap} / ${track.laps}`;
    $('lapBar').style.width=`${racePct}%`;
    const finalLap=$('finalLapBadge');
    if(finalLap)finalLap.classList.toggle('hidden',!(game.phase==='race'&&lap===track.laps));
    const greenFlag=$('greenFlagBadge');
    if(greenFlag)greenFlag.classList.toggle('hidden',!(game.phase==='race'&&game.tick<=8));
    if($('raceTimer')){
      const seconds=Math.max(0,Math.ceil((game.maxTicks-game.tick)*TICK_MS/1000));
      $('raceTimer').textContent=`0:${String(seconds).padStart(2,'0')}`;
    }

    renderRaceLanes(sorted);

    $('upgradeGrid').innerHTML=UPGRADE_KEYS.map(key=>{
      const m=UPGRADE_META[key];
      const lvl=Math.max(1,finite(me.levels[key],1));
      const cost=upgradeCost(me,key);
      const enabled=game.phase==='race'&&me.cash>=cost;
      let mathText='';
      if(m.kind==='income'){
        const currentFactor=incomeFactor(lvl,key);
        const nextFactor=incomeFactor(lvl+1,key);
        mathText=`×${currentFactor.toFixed(2)} → ×${nextFactor.toFixed(2)}`;
      }else{
        const current=statPercent(me,key);
        const next=current+m.step;
        const affinity=track.weights[key]||1;
        mathText=`+${current}% → +${next}% · ×${affinity.toFixed(1)}`;
      }
      return `<button class="upgradeButton ${m.kind==='income'?'incomeUpgrade':'carUpgrade'} ${key}" data-upgrade="${key}" type="button" ${enabled?'':'disabled'} style="--upgrade-asset:url('${upgradeAsset(key,enabled)}')">
        <span class="upgradeLevel">Lv ${lvl}</span>
        <strong class="upgradeCost">${money(cost)}</strong>
        <small class="upgradeMath">${esc(mathText)}</small>
      </button>`;
    }).join('');

    renderCountdown();
    renderRaceEvent(me);

    if(game.phase==='race'||game.phase==='countdown'){
      if($('raceStatus'))$('raceStatus').innerHTML=game.phase==='race'
        ?'<strong>Race live</strong><span>Income keeps coming in. Upgrade while the field races automatically.</span>'
        :'<strong>Get ready</strong><span>Race start sequence in progress.</span>';
      $('resultCard').classList.add('hidden');
    }else if(game.phase==='intermission'||game.phase==='complete'){
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

    const ticks=Math.max(0,finite(game.countdownTicks,12));
    const state=ticks>=10?'3':ticks>=7?'2':ticks>=4?'1':'go';
    overlay.classList.remove('hidden');

    const lights=[$('countdownLight1'),$('countdownLight2'),$('countdownLight3')];
    const litCount=state==='3'?1:state==='2'?2:3;
    lights.forEach((light,index)=>{
      if(!light)return;
      light.classList.toggle('hidden',index>=litCount);
      light.src=state==='go'
        ?`${ASSET_ROOT}/ui/countdown/light_green.png`
        :`${ASSET_ROOT}/ui/countdown/light_red.png`;
    });

    const number3=$('countdownNumber3');
    const number2=$('countdownNumber2');
    const number1=$('countdownNumber1');
    const go=$('countdownGo');
    if(number3)number3.classList.toggle('hidden',state!=='3');
    if(number2)number2.classList.toggle('hidden',state!=='2');
    if(number1)number1.classList.toggle('hidden',state!=='1');
    if(go)go.classList.toggle('hidden',state!=='go');
  }

  function renderRaceEvent(me){
    const card=$('raceEventCard');
    if(!card)return;
    if(game.phase!=='race'){
      card.className='raceEventCard hidden';
      return;
    }

    if(me.activeEvent){
      const evt=me.activeEvent;
      const seconds=Math.max(1,Math.ceil((finite(evt.expiresTick,game.tick)-game.tick)*TICK_MS/1000));
      card.className='raceEventCard';
      card.innerHTML=`
        <img class="raceEventAsset" src="${ASSET_ROOT}/ui/popups/choice_50_50.png" alt="">
        <div class="raceEventCopy">
          <span class="raceEventEyebrow">PIT WALL · ${seconds}s</span>
          <strong class="raceEventTitle">${esc(evt.title)}</strong>
          <small class="raceEventPrompt">${esc(evt.prompt)}</small>
        </div>
        <div class="raceEventChoices">
          ${evt.choices.map((choice,index)=>`<button type="button" data-event-choice="${index}" data-event-id="${esc(evt.id)}">${esc(choice)}</button>`).join('')}
        </div>
      `;
      return;
    }

    if(me.eventResult&&finite(me.eventResult.untilTick,0)>game.tick){
      card.className=`raceEventCard compactEvent ${me.eventResult.correct?'correct':'neutral'}`;
      card.innerHTML=`<strong>${me.eventResult.correct?'GOOD CALL':'NO GAIN'}</strong><small>${esc(me.eventResult.text)}</small>`;
      return;
    }

    if(me.boost&&finite(me.boost.untilTick,0)>game.tick){
      const seconds=Math.max(1,Math.ceil((me.boost.untilTick-game.tick)*TICK_MS/1000));
      card.className='raceEventCard compactEvent activeBoost';
      card.innerHTML=`<strong>BOOST ACTIVE</strong><small>${esc(me.boost.label)} · ${seconds}s</small>`;
      return;
    }

    card.className='raceEventCard hidden';
  }

  function renderResult(me){
    const card=$('resultCard');
    const prize=Math.max(0,finite(me.lastPrize,0));
    const humans=game.entrants.filter(e=>e.human);
    const complete=game.phase==='complete';
    const readyCount=humans.filter(e=>game.ready?.[e.playerId]).length;
    const amReady=!!game.ready?.[me.playerId];

    card.classList.remove('hidden');
    card.classList.toggle('seriesComplete',complete);
    card.innerHTML=complete
      ?`
        <img class="resultAsset" src="${ASSET_ROOT}/ui/popups/race_complete.png" alt="">
        <div class="resultPrize">+${money(prize)}</div>
        <div class="resultPosition">${ordinal(me.position||12)} place · ${game.raceNo}/${game.totalRaces}</div>
        <button class="resultAction" data-exit-series type="button">RETURN TO SETUP</button>
      `
      :`
        <img class="resultAsset" src="${ASSET_ROOT}/ui/popups/ready_next_race.png" alt="">
        <div class="resultPosition">${ordinal(me.position||12)} place · Prize +${money(prize)}</div>
        <div class="resultReady">${readyCount} / ${humans.length} ready</div>
        <button class="resultAction" data-ready-race type="button" ${amReady?'disabled':''}>${amReady?'READY ✓':'NEXT RACE'}</button>
      `;

    const prizeKey=`${game.mode}:${game.raceNo}:${me.playerId}:prize`;
    if(game.mode==='tournament'&&prize>0&&!prizeAnimations.has(prizeKey)){
      prizeAnimations.add(prizeKey);
      const cashEl=$('cash');
      if(cashEl)cashEl.textContent=money(finite(me.cashBeforePrize,me.cash-prize));
      requestAnimationFrame(()=>setTimeout(()=>{
        animatePrizeTransfer(card,cashEl,()=>{if(cashEl)cashEl.textContent=money(me.cash)});
      },180));
    }
  }

  function ordinal(n){n=Number(n)||0;const s=['th','st','nd','rd'],v=n%100;return n+(s[(v-20)%10]||s[v]||s[0])}

  function animatePrizeTransfer(source,target,onDone){
    if(!source||!target){onDone?.();return}
    const from=source.getBoundingClientRect();
    const to=target.getBoundingClientRect();
    const sx=from.left+from.width/2;
    const sy=from.top+Math.min(from.height*.42,55);
    const tx=to.left+to.width/2;
    const ty=to.top+to.height/2;
    let finished=0;
    for(let i=0;i<8;i++){
      const coin=document.createElement('span');
      coin.className='upgradeCoinFx';
      coin.textContent='£';
      coin.style.left=`${sx-8}px`;
      coin.style.top=`${sy-8}px`;
      document.body.appendChild(coin);
      const bend=(i-3.5)*10;
      const animation=coin.animate([
        {transform:'translate(0,0) scale(.7)',opacity:0},
        {transform:`translate(${(tx-sx)*.42+bend}px,${(ty-sy)*.30-24-Math.abs(bend)*.18}px) scale(1.05)`,opacity:1,offset:.34},
        {transform:`translate(${tx-sx+bend*.05}px,${ty-sy}px) scale(.58)`,opacity:.15}
      ],{duration:500+i*22,delay:i*38,easing:'cubic-bezier(.22,.74,.32,1)',fill:'forwards'});
      animation.onfinish=()=>{
        coin.remove();
        finished++;
        if(finished===8)onDone?.();
      };
    }
  }

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
    if(!window.GameBoxLAN?.DiscoverySession)throw new Error('Automatic multiplayer discovery is unavailable in this browser.');
    session=new window.GameBoxLAN.DiscoverySession({
      game:'gridline-v18',
      onStatus:text=>{if(role==='host')$('hostState').textContent=text;if(role==='client')$('joinState').textContent=text},
      onHostsChanged:hosts=>renderAvailableHosts(hosts),
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
      if(msg.type==='lobby'){renderJoinLobby(msg.players||[],msg.config||null);return}
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

  function renderJoinLobby(players,config=null){
    $('joinLobby').innerHTML=players.length?players.map((p,i)=>`<div class="leaderRow"><span class="rank">${i+1}</span><strong>${esc(p.name)}${p.host?' · Host':''}</strong><small>Ready</small></div>`).join(''):'<div class="emptyState">Choose an available host above.</div>';
    const summary=$('joinRaceConfig');
    if(summary&&config){
      const track=TRACKS[clamp(Math.round(finite(config.trackIndex,0)),0,TRACKS.length-1)]||TRACKS[0];
      const mode=config.mode==='tournament'?'Tournament':'Quick Race';
      const detail=config.mode==='tournament'?`${clamp(Math.round(finite(config.totalRaces,5)),3,15)} races · starts at ${track.name}`:track.name;
      summary.classList.remove('hidden');
      summary.innerHTML=`<strong>${mode}</strong><small>${esc(detail)}</small>`;
    }else if(summary){
      summary.classList.add('hidden');
    }
  }

  function renderAvailableHosts(hosts=[]){
    const wrap=$('availableHosts');
    if(!wrap||role!=='client')return;
    if(session?.peers?.().length){
      $('joinState').textContent='Connected';
      wrap.innerHTML='<div class="discoveryConnected">Connected to host ✓</div>';
      return;
    }
    const open=hosts.filter(host=>!host.started&&finite(host.playerCount,1)<finite(host.maxPlayers,4));
    if(!open.length){
      $('joinState').textContent='Scanning';
      wrap.innerHTML='<div class="discoveryScanning"><span class="scanPulse"></span><strong>Scanning for games…</strong><small>Keep the host on the Host Game screen.</small></div>';
      return;
    }
    $('joinState').textContent=`${open.length} found`;
    wrap.innerHTML=open.map(host=>`
      <button class="hostDiscoveryCard" type="button" data-auto-host="${esc(host.peerId)}">
        <span class="hostDiscoveryIcon">🏁</span>
        <span class="hostDiscoveryCopy">
          <strong>${esc(host.hostName||((host.playerName||'Host')+"'s Race"))}</strong>
          <small>${finite(host.playerCount,1)} / ${finite(host.maxPlayers,4)} players · ${host.raceMode==='tournament'?`${finite(host.totalRaces,5)} race tournament`:'Quick Race'} · ${esc(host.trackName||'Forest Lake')}</small>
        </span>
        <span class="hostDiscoveryJoin">JOIN</span>
      </button>
    `).join('');
  }

  function broadcastLobby(){if(role==='host'&&session)session.broadcast({type:'lobby',players:hostPlayers(),config:setupConfig()})}

  function resetNetworkSession(){
    try{session?.close()}catch{}
    session=null;
    pendingHello=false;
  }

  async function startAutoHost(){
    const p=roster().find(x=>x.id===$('hostPlayerSelect').value);
    if(!p){$('hostState').textContent='Choose player';return}
    role='host';
    const current=ensureSession();
    $('hostState').textContent='Starting';
    try{
      const config=setupConfig();
      await current.startHost({
        hostName:`${p.name}'s Gridline Race`,
        player:p,
        profile:getProfile(p),
        raceMode:config.mode,
        trackName:TRACKS[config.trackIndex].name,
        totalRaces:config.totalRaces
      });
      renderHostLobby();
    }catch(err){
      console.error(err);
      $('hostState').textContent='Discovery error';
    }
  }

  async function startAutoScan(){
    role='client';
    const current=ensureSession();
    $('joinState').textContent='Scanning';
    renderAvailableHosts([]);
    try{
      await current.startScanner();
    }catch(err){
      console.error(err);
      $('joinState').textContent='Discovery error';
      const wrap=$('availableHosts');
      if(wrap)wrap.innerHTML='<div class="emptyState">Could not start automatic host discovery. Check the network connection and try again.</div>';
    }
  }

  async function joinDiscoveredHost(peerId){
    const p=roster().find(x=>x.id===$('joinPlayerSelect').value);
    if(!p)return;
    localPlayer=p;
    pendingHello=true;
    $('joinState').textContent='Joining';
    try{
      await ensureSession().joinHost(peerId,{player:p,profile:getProfile(p)});
      $('joinState').textContent='Connected';
      renderAvailableHosts([]);
    }catch(err){
      console.error(err);
      pendingHello=false;
      $('joinState').textContent=err?.message||'Join failed';
    }
  }

  function startHostRace(){
    const hp=roster().find(p=>p.id===$('hostPlayerSelect').value);if(!hp)return;
    localPlayer=hp;playMode='multi';role='host';
    const humans=[{player:hp,owner:'host',profile:getProfile(hp)}];
    session.peers().forEach(peer=>{if(peer.meta?.player)humans.push({player:peer.meta.player,owner:peer.id,profile:peer.meta.profile||null})});
    if(humans.length<2)return;
    session?.updateHost?.({started:true});
    game=buildGame(humans,setupConfig());showRace();renderGame();broadcastGame();
    clearInterval(hostTimer);hostTimer=setInterval(hostTick,TICK_MS);
  }

  function startSingleRace(){
    const p=roster().find(x=>x.id===selectedSingleId);if(!p)return;
    localPlayer=p;playMode='single';role='host';
    game=buildGame([{player:p,owner:'local',profile:getProfile(p)}],setupConfig());
    showRace();renderGame();
    clearInterval(hostTimer);hostTimer=setInterval(hostTick,TICK_MS);
  }

  function leaveRace(){
    clearInterval(hostTimer);hostTimer=null;game=null;
    session?.close();session=null;role=null;playMode='single';showSetup('setupHome');
  }

  function bind(){
    $('chooseSingle').onclick=()=>showSetup('singleSetup');
    $('chooseMulti').onclick=()=>showSetup('multiSetup');
    $('chooseWifi').onclick=()=>showSetup('wifiRole');
    $('chooseBluetooth').onclick=()=>{$('bluetoothNote').classList.remove('hidden')};
    $('chooseHost').onclick=()=>{
      resetNetworkSession();
      role='host';
      showSetup('hostSetup');
      renderHostLobby();
      startAutoHost();
    };
    $('chooseJoin').onclick=()=>{
      resetNetworkSession();
      role='client';
      showSetup('joinSetup');
      renderJoinLobby([]);
      startAutoScan();
    };
    $$('[data-back]').forEach(b=>b.onclick=()=>{
      if(b.closest('#hostSetup,#joinSetup')){
        resetNetworkSession();
        role=null;
      }
      showSetup(b.dataset.back);
    });
    $('startSingle').onclick=startSingleRace;
    $('hostPlayerSelect').onchange=()=>{
      renderHostLobby();
      const p=roster().find(x=>x.id===$('hostPlayerSelect').value);
      if(p&&session?.updateHost)session.updateHost({hostName:`${p.name}'s Gridline Race`,player:p,profile:getProfile(p)});
    };
    for(const id of ['singleRaceCount','hostRaceCount']){
      const input=$(id);
      if(input)input.oninput=()=>{
        raceSetup.races=clamp(Math.round(finite(input.value,5)),3,15);
        renderRaceSetup();
      };
    }
    $('startHostRace').onclick=startHostRace;
    $('exitRace').onclick=leaveRace;
    const gameboxBack=document.getElementById('gameboxBack');
    if(gameboxBack)gameboxBack.onclick=e=>{
      e.preventDefault();
      clearInterval(hostTimer);
      hostTimer=null;
      resetNetworkSession();
      window.location.href='../index.html';
    };

    document.addEventListener('click',e=>{
      const raceMode=e.target.closest('[data-race-mode]');
      if(raceMode){
        raceSetup.mode=raceMode.dataset.raceMode==='tournament'?'tournament':'quick';
        renderRaceSetup();
        return;
      }
      const trackChoice=e.target.closest('[data-track-index]');
      if(trackChoice){
        raceSetup.trackIndex=clamp(Math.round(finite(trackChoice.dataset.trackIndex,0)),0,TRACKS.length-1);
        renderRaceSetup();
        return;
      }
      const exitSeries=e.target.closest('[data-exit-series]');
      if(exitSeries){
        leaveRace();
        return;
      }
      const autoHost=e.target.closest('[data-auto-host]');
      if(autoHost){
        joinDiscoveredHost(autoHost.dataset.autoHost);
        return;
      }
      const ready=e.target.closest('[data-ready-race]');
      if(ready&&!ready.disabled){
        requestAction({action:'ready'});
        return;
      }
      const eventChoice=e.target.closest('[data-event-choice]');
      if(eventChoice){
        requestAction({action:'event-choice',eventId:eventChoice.dataset.eventId,choice:Number(eventChoice.dataset.eventChoice)});
        return;
      }
      const up=e.target.closest('[data-upgrade]');
      if(up&&!up.disabled){
        animateCoinTransfer(up);
        requestAction({action:'upgrade',stat:up.dataset.upgrade});
      }
    });

    const cleanupNetworking=()=>{try{session?.close()}catch{};clearInterval(hostTimer)};
    window.addEventListener('beforeunload',cleanupNetworking);
    window.addEventListener('pagehide',cleanupNetworking);
  }

  syncPlayerSelects();
  renderSinglePlayers();
  bind();
  showSetup('setupHome');
})();