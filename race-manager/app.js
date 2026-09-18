(() => {
  'use strict';

  const ROSTER_KEY='gamebox.players.v1';
  const PROFILE_KEY='gamebox.gridline.profiles.v4';
  const TICK_MS=300;
  const MAX_GRID=12;
  const RACE_TICKS=280;
  const MENU_DESIGN_W=390;
  const MENU_DESIGN_H=844;

  const TRACKS=[
    {name:'Autumn River Valley',asset:'autumn_river_valley_circuit.png',discipline:'GT',weather:'Clear',laps:8,profile:'Flowing bends · River bridge',risk:1.15,weights:{engine:1.05,tyres:1.45,brakes:1.20,fuel:1.00}},
    {name:'Forest Lake',asset:'forest_lake_circuit.png',discipline:'GT',weather:'Dry',laps:7,profile:'Technical · Lakeside sweepers',risk:1.25,weights:{engine:1.00,tyres:1.55,brakes:1.25,fuel:.85}},
    {name:'Desert Canyon',asset:'desert_canyon_circuit.png',discipline:'GT',weather:'Hot',laps:8,profile:'Long straights · Tight hairpins',risk:1.10,weights:{engine:1.35,tyres:.90,brakes:1.10,fuel:1.55}},
    {name:'Tropical Island',asset:'tropical_island_circuit.png',discipline:'GT',weather:'Sunny',laps:8,profile:'Coastal sweepers · Fast exits',risk:1.20,weights:{engine:1.20,tyres:1.35,brakes:1.05,fuel:1.15}}
  ];

  const CAR_ROSTER=[
    {color:'gold',label:'Gold',asset:'player_gold.png',racer:'Leo Vale'},
    {color:'blue',label:'Blue',asset:'blue.png',racer:'Mason Frost'},
    {color:'red',label:'Red',asset:'red.png',racer:'Ruby Kane'},
    {color:'green',label:'Green',asset:'green.png',racer:'Finn Hart'},
    {color:'cyan',label:'Cyan',asset:'cyan.png',racer:'Skye Rivers'},
    {color:'orange',label:'Orange',asset:'orange.png',racer:'Jax Ember'},
    {color:'pink',label:'Pink',asset:'pink.png',racer:'Lola Vance'},
    {color:'white',label:'White',asset:'white.png',racer:'Nico Snow'},
    {color:'black_red',label:'Black / Red',asset:'black_red.png',racer:'Axel Crow'},
    {color:'purple',label:'Purple',asset:'purple.png',racer:'Nova Quinn'},
    {color:'teal',label:'Teal',asset:'teal.png',racer:'Theo Cruz'},
    {color:'silver',label:'Silver',asset:'silver.png',racer:'Max Sterling'}
  ];
  const CAR_BY_COLOR=Object.fromEntries(CAR_ROSTER.map(car=>[car.color,car]));
  const normaliseCarColor=value=>CAR_BY_COLOR[value]?value:'gold';
  const validCarColor=value=>CAR_BY_COLOR[value]?value:'';

  const CAR_MENU_SLOTS=[
    {x:28.5,y:205},{x:143,y:205},{x:255,y:205},
    {x:28.5,y:359.688},{x:143,y:360},{x:255,y:360},
    {x:28.5,y:514.875},{x:143,y:515},{x:255,y:514.875},
    {x:28.5,y:670},{x:143,y:670},{x:255,y:670}
  ];
  const TRACK_MENU_SLOTS=[
    {x:17,y:235},{x:201,y:235},{x:17,y:500},{x:201,y:500}
  ];
  const LEADERBOARD_NAME_Y=[183.318,222.581,262.161,305.741,349.322,392.902,436.482,480.063,523.643,567.224,610.804,654.385];
  // Colour boxes use the same vertical centre as each racer-name box.
  // Name height is 31.262px and colour height is 26.956px, so colour top = name top + 2.153px.
  const LEADERBOARD_COLOUR_Y=LEADERBOARD_NAME_Y.map(y=>Number((y+2.153).toFixed(3)));

  const UPGRADE_META={
    engine:{label:'Engine',desc:'Acceleration',kind:'car',base:22,step:8},
    tyres:{label:'Tyres',desc:'Cornering grip',kind:'car',base:24,step:8},
    brakes:{label:'Brakes',desc:'Braking performance',kind:'car',base:23,step:8},
    fuel:{label:'Fuel',desc:'Top speed',kind:'car',base:26,step:8},
    sponsors:{label:'Sponsors',desc:'Income multiplier',kind:'income',base:38,factor:1.25},
    fans:{label:'Fan Base',desc:'Advertising multiplier',kind:'income',base:34,factor:1.15}
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

  // Pre-decode both visual states before the first upgrade becomes affordable.
  // This prevents the one-time grey/colour image flash on first use.
  const upgradeArtworkCache=[];
  function prewarmUpgradeArtwork(){
    for(const key of UPGRADE_KEYS){
      for(const enabled of [false,true]){
        const img=new Image();
        img.src=upgradeAsset(key,enabled);
        upgradeArtworkCache.push(img);
        if(typeof img.decode==='function')img.decode().catch(()=>{});
      }
    }
  }
  prewarmUpgradeArtwork();

  const menuArtworkCache=[];
  function prewarmMenuArtwork(){
    const paths=[
      '../Gridline_Menu_Asset_Pack/race_type/race_type_background_panel.png',
      '../Gridline_Menu_Asset_Pack/crew_size/crew_size_single_player_card.png',
      '../Gridline_Menu_Asset_Pack/crew_size/crew_size_multiplayer_card.png',
      '../Gridline_Menu_Asset_Pack/race_type/race_type_quick_race_card.png',
      '../Gridline_Menu_Asset_Pack/race_type/race_type_tournament_card.png',
      '../Gridline_Menu_Asset_Pack/crew_size/crew_size_card_blank.png',
      `${ASSET_ROOT}/ui/logo/gridline_racing_logo.png`,
      `${ASSET_ROOT}/ui/controls/back.png`,
      `${ASSET_ROOT}/ui/controls/settings.png`,
      `${ASSET_ROOT}/ui/controls/race_now.png`,
      ...CAR_ROSTER.map(car=>`${ASSET_ROOT}/cars/${car.asset}`),
      ...TRACKS.map(track=>`${ASSET_ROOT}/tracks/${track.asset}`)
    ];
    for(const src of paths){
      const img=new Image();
      img.decoding='async';
      img.src=src;
      menuArtworkCache.push(img);
      if(typeof img.decode==='function')img.decode().catch(()=>{});
    }
  }
  prewarmMenuArtwork();

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
  let selectedCarColor='gold';
  let latestLobbyPlayers=[];
  let multiplayerStage='lobby';
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

  function updateMenuScale(){
    const scale=Math.min(
      1,
      window.innerWidth/MENU_DESIGN_W,
      window.innerHeight/MENU_DESIGN_H
    );
    document.documentElement.style.setProperty('--menu-scale',String(scale));
  }

  function closeTrackStartPopup(){
    const popup=$('trackStartPopup');
    if(!popup)return;
    popup.classList.add('hidden');
    popup.classList.remove('showing');
  }

  function openTrackStartPopup(){
    const popup=$('trackStartPopup');
    if(!popup)return;
    updateTrackStartButton();
    popup.classList.remove('hidden','showing');
    void popup.offsetWidth;
    popup.classList.add('showing');
  }

  function showSetup(id){
    closeTrackStartPopup();
    Array.from(document.querySelectorAll('.setupView')).forEach(v=>v.classList.toggle('hidden',v.id!==id));
    $('raceScreen').classList.add('hidden');
    $('exitRace').classList.add('hidden');
    const menuMode=['setupHome','raceFormatSetup','carSetup','trackSetup'].includes(id);
    document.body.classList.toggle('gridline-menu-live',menuMode);
    if(menuMode)updateMenuScale();
    window.scrollTo(0,0);
    if(id==='raceFormatSetup')renderRaceSetup();
    if(id==='carSetup'&&!$('flowCarChoices')?.children.length)renderCarChoices('flow');
    if(id==='trackSetup'){
      const back=$('trackSetupBack');
      if(back)back.dataset.back=playMode==='multi'&&role==='host'?'hostSetup':'carSetup';
      renderRaceSetup();
      renderSinglePlayers();
      updateTrackStartButton();
    }
    if(id==='hostSetup'){syncPlayerSelects();renderHostLobby()}
    if(id==='joinSetup')syncPlayerSelects();
  }

  function showRace(){
    closeTrackStartPopup();
    $$('.setupView').forEach(v=>v.classList.add('hidden'));
    document.body.classList.remove('gridline-menu-live');
    $('raceScreen').classList.remove('hidden');
    $('exitRace').classList.remove('hidden');
    window.scrollTo(0,0);
  }

  function renderSinglePlayers(){
    const people=roster(),wrap=$('singlePlayerList');
    wrap.innerHTML='';
    $('singleRosterEmpty').classList.toggle('hidden',people.length>0);
    if(!people.some(p=>p.id===selectedSingleId))selectedSingleId=people[0]?.id||'';
    people.forEach(p=>{
      const b=document.createElement('button');
      b.type='button';
      b.className='playerChoice'+(p.id===selectedSingleId?' selected':'');
      b.textContent=p.name;
      b.onclick=()=>{selectedSingleId=p.id;renderSinglePlayers();renderCarChoices('single')};
      wrap.appendChild(b);
    });
    updateTrackStartButton();
  }

  function carLabel(color){return CAR_BY_COLOR[normaliseCarColor(color)]?.label||'Gold'}

  function renderCarChoices(prefix,lobbyPlayers=[]){
    const wrap=$(prefix+'CarChoices');
    if(!wrap)return;
    if(prefix==='flow'&&wrap.children.length){
      wrap.querySelectorAll('[data-car-color]').forEach(button=>{
        button.classList.toggle('selected',button.dataset.carColor===selectedCarColor);
      });
      return;
    }

    let taken=new Set();
    if(prefix==='host'&&session){
      session.peers().forEach(peer=>{
        const color=validCarColor(peer.meta?.carColor);
        if(color)taken.add(color);
      });
    }else if(prefix==='join'){
      const ownId=localPlayer?.id||$('joinPlayerSelect')?.value||'';
      for(const p of lobbyPlayers||[]){
        const color=validCarColor(p.carColor);
        if(String(p.id)!==String(ownId)&&color)taken.add(color);
      }
    }

    const lobbyLocked=prefix==='join'&&multiplayerStage==='track';
    wrap.innerHTML=CAR_ROSTER.map((car,index)=>{
      const unavailable=lobbyLocked||(taken.has(car.color)&&car.color!==selectedCarColor);
      const slot=CAR_MENU_SLOTS[index]||CAR_MENU_SLOTS[0];
      const replacementName=prefix==='flow'
        ?car.racer
        :prefix==='single'
          ?(roster().find(p=>p.id===selectedSingleId)?.name||car.racer)
          :prefix==='host'
            ?(roster().find(p=>p.id===$('hostPlayerSelect')?.value)?.name||car.racer)
            :(roster().find(p=>p.id===$('joinPlayerSelect')?.value)?.name||car.racer);
      return `
        <button class="carChoice ${car.color===selectedCarColor?'selected':''}" style="--slot-x:${slot.x}px;--slot-y:${slot.y}px" data-car-color="${car.color}" type="button" ${unavailable?'disabled':''} aria-label="${esc(car.label)} car, ${esc(replacementName)}">
          <img class="menuSelectionCardAsset" src="../Gridline_Menu_Asset_Pack/crew_size/crew_size_card_blank.png" alt="">
          <img class="carChoiceSprite" src="${ASSET_ROOT}/cars/${car.asset}" alt="">
          <span class="carDriverName">${esc(replacementName)}</span>
          <strong class="carChooseText">${unavailable?'TAKEN':car.color===selectedCarColor?'READY':'CHOOSE'}</strong>
        </button>
      `;
    }).join('');
  }

  function selectCarColor(color){
    const next=validCarColor(color);
    if(!next)return false;

    if(role==='host'&&playMode==='multi'){
      const taken=session?.peers?.().some(peer=>validCarColor(peer.meta?.carColor)===next);
      if(taken&&next!==selectedCarColor)return false;
      selectedCarColor=next;
      renderHostLobby();
      broadcastLobby();
      return true;
    }

    if(role==='client'&&playMode==='multi'){
      if(multiplayerStage==='track')return false;
      const ownId=localPlayer?.id||$('joinPlayerSelect')?.value||'';
      const taken=(latestLobbyPlayers||[]).some(player=>String(player.id)!==String(ownId)&&validCarColor(player.carColor)===next);
      if(taken&&next!==selectedCarColor)return false;
      selectedCarColor=next;
      renderCarChoices('join',latestLobbyPlayers);
      const state=$('joinCarState');
      if(state)state.textContent='Confirming…';
      if(session?.peers?.().length)session.sendToHost({type:'color-choice',carColor:selectedCarColor});
      return true;
    }

    selectedCarColor=next;
    renderCarChoices('flow');
    return true;
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
    Array.from(document.querySelectorAll('[data-race-mode]')).forEach(button=>button.classList.toggle('selected',button.dataset.raceMode===config.mode));

    const flowLength=$('flowTournamentLength');
    if(flowLength)flowLength.classList.toggle('hidden',config.mode!=='tournament');
    const flowCount=$('flowRaceCount');
    const flowValue=$('flowRaceCountValue');
    if(flowCount)flowCount.value=String(raceSetup.races);
    if(flowValue)flowValue.textContent=`${raceSetup.races} races`;

    const flowTracks=$('flowTrackChoices');
    if(flowTracks){
      if(!flowTracks.children.length){
        flowTracks.innerHTML=TRACKS.map((track,index)=>{
          const slot=TRACK_MENU_SLOTS[index]||TRACK_MENU_SLOTS[0];
          return `
            <button class="trackChoice ${index===config.trackIndex?'selected':''}" style="--slot-x:${slot.x}px;--slot-y:${slot.y}px" data-track-index="${index}" type="button" aria-label="${esc(track.name)}">
              <img class="menuSelectionCardAsset" src="../Gridline_Menu_Asset_Pack/crew_size/crew_size_card_blank.png" alt="">
              <img class="trackChoiceImage" src="${ASSET_ROOT}/tracks/${esc(track.asset)}" alt="">
              <strong class="trackChoiceName">${esc(track.name.toUpperCase())}</strong>
              <span class="trackChooseText">CHOOSE</span>
            </button>
          `;
        }).join('');
      }
      flowTracks.querySelectorAll('[data-track-index]').forEach(button=>{
        button.classList.toggle('selected',Number(button.dataset.trackIndex)===config.trackIndex);
      });
    }

    if(role==='host'&&session&&playMode==='multi'){
      const p=roster().find(x=>x.id===$('hostPlayerSelect')?.value);
      session.updateHost?.({
        hostName:p?`${p.name}'s Gridline Race`:'Gridline Race',
        raceMode:'gridline',
        trackName:multiplayerStage==='track'?TRACKS[config.trackIndex].name:'Track chosen by host',
        totalRaces:1,
        started:multiplayerStage==='track'
      });
      broadcastLobby();
    }
  }

  function entrantFromPlayer(player,owner='local',profileOverride=null,carColor='gold'){
    const p=getProfile(player,profileOverride);
    return {
      id:'human-'+player.id,
      playerId:player.id,
      name:player.name,
      carColor:normaliseCarColor(carColor),
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
    return clamp(.42+Math.max(0,(raceNo||1)-1)*.10+(i%4)*.04,.42,.94);
  }

  function botDecisionDelay(skill){
    return Math.max(2,Math.round(6-skill*3+Math.random()*2));
  }

  function botEntrant(car,i,track,raceNo=1){
    const levels={};STAT_KEYS.forEach(key=>levels[key]=1);
    const skill=botSkill(raceNo,i);
    return {
      id:'bot-'+car.color,name:car.racer,carColor:car.color,human:false,levels,
      cash:0,gems:0,
      aiSkill:skill,
      aiFocus:STAT_KEYS[i%STAT_KEYS.length],
      nextDecision:2+Math.round(Math.random()*botDecisionDelay(skill)),
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
    const growth=UPGRADE_META[stat].kind==='income'?1.34:1.28;
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

    const usedColors=new Set();
    const entrants=humans.map(h=>{
      let color=normaliseCarColor(h.carColor);
      if(usedColors.has(color)){
        color=CAR_ROSTER.find(car=>!usedColors.has(car.color))?.color||color;
      }
      usedColors.add(color);
      return entrantFromPlayer(h.player,h.owner,h.profile||null,color);
    });

    const remainingCars=CAR_ROSTER.filter(car=>!usedColors.has(car.color));
    remainingCars.forEach((car,i)=>entrants.push(botEntrant(car,i,track,1)));
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
        e.nextDecision=2+Math.round(Math.random()*botDecisionDelay(e.aiSkill));
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
      if(e.finishTick!==null){
        e.activeEvent=null;
        e.boost=null;
        e.eventResult=null;
        continue;
      }
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
    for(const e of game.entrants){
      if(e.finishTick===null)e.cash+=incomeRate(e)*(TICK_MS/1000);
    }
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

    if(msg.action==='claim'){
      if(game.phase!=='intermission')return;
      game.ready=game.ready||readyMap();
      game.ready[playerId]=true;
      const humans=game.entrants.filter(x=>x.human);
      const allClaimed=humans.length>0&&humans.every(x=>game.ready?.[x.playerId]);
      if(allClaimed){
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

    if(game.phase!=='race'||e.finishTick!==null||msg.action!=='upgrade'||!UPGRADE_META[msg.stat])return;
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
    if(msg.action==='claim'&&game.phase!=='intermission')return;
    if(playMode==='single'||role==='host')applyAction(localPlayer.id,msg);
    else session?.sendToHost({type:'race-action',playerId:localPlayer.id,...msg});
  }

  function publicGame(){
    if(!game)return null;
    return {
      phase:game.phase,countdownTicks:game.countdownTicks,ready:game.ready||{},mode:game.mode,totalRaces:game.totalRaces,startTrackIndex:game.startTrackIndex,raceNo:game.raceNo,trackIndex:game.trackIndex,tick:game.tick,maxTicks:game.maxTicks,results:game.results,
      entrants:game.entrants.map(e=>({
        id:e.id,playerId:e.playerId,name:e.name,carColor:e.carColor,human:e.human,owner:e.owner,levels:e.levels,cash:e.cash,cashBeforePrize:e.cashBeforePrize,lastPrize:e.lastPrize,gems:e.gems,aiSkill:e.aiSkill,aiFocus:e.aiFocus,nextDecision:e.nextDecision,races:e.races,best:e.best,progress:e.progress,finishTick:e.finishTick,position:e.position,eventCount:e.eventCount,eventCooldownUntil:e.eventCooldownUntil,activeEvent:e.activeEvent,boost:e.boost,eventResult:e.eventResult
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
    if($('playerLevelText'))$('playerLevelText').textContent='1';
    $('cash').textContent=money(me.cash);
    $('sponsorRate').textContent=me.finishTick===null?money(incomeRate(me))+'/s':'£0/s';
    $('raceNumber').textContent=`Race\n${game.totalRaces>1?`${game.raceNo}/${game.totalRaces}`:String(game.raceNo)}`;
    if($('gems'))$('gems').textContent=Math.round(me.gems||0);
    $('trackName').textContent=track.name;
    $('trackMeta').textContent=`${track.discipline} · ${track.weather}`;
    if($('trackFocus'))$('trackFocus').textContent=track.profile;
    if($('sponsorName'))$('sponsorName').textContent='Chip In Racing';
    if($('power'))$('power').textContent=power(me);

    const sorted=[...game.entrants].sort((a,b)=>(b.progress-a.progress)||String(a.name).localeCompare(String(b.name)));
    const currentPos=me.position||sorted.findIndex(e=>e.id===me.id)+1;
    $('position').innerHTML=ordinalHTML(currentPos);
    if($('liveSponsor'))$('liveSponsor').textContent='+'+money(incomeRate(me));

    const racePct=clamp(me.progress,0,100);
    const lap=Math.min(track.laps,Math.max(1,Math.floor((racePct/100)*track.laps)+1));
    $('lapText').textContent=`Lap ${lap} / ${track.laps}`;
    $('lapBar').style.width=`${racePct}%`;
    const lapProgress=(racePct/100)*track.laps;
    for(let i=1;i<=8;i++){
      const marker=$('lapMarker'+i);
      if(!marker)continue;
      marker.classList.toggle('hidden',i>track.laps);
      if(i<=track.laps){
        const fill=clamp((lapProgress-(i-1))*100,0,100);
        marker.style.setProperty('--lap-fill',`${fill}%`);
      }
    }

    const raceScreen=$('raceScreen');
    const finalLap=$('finalLapBadge');
    const greenFlag=$('greenFlagBadge');
    const uiRaceKey=`${game.mode}:${game.raceNo}:${game.trackIndex}`;
    const previousUiRaceKey=raceScreen.dataset.uiRaceKey||'';
    const isNewUiRace=previousUiRaceKey!==uiRaceKey;
    const previousUiPhase=isNewUiRace?'':(raceScreen.dataset.uiPhase||'');
    const previousUiLap=isNewUiRace?0:Number(raceScreen.dataset.uiLap||0);

    if(isNewUiRace){
      raceScreen.dataset.uiRaceKey=uiRaceKey;
      raceScreen.dataset.uiPhase='';
      raceScreen.dataset.uiLap='0';
      finalLap?.classList.add('hidden');
      finalLap?.classList.remove('finalLapIntro');
      greenFlag?.classList.add('hidden');
      greenFlag?.classList.remove('raceStartFlash');
    }

    const raceJustStarted=game.phase==='race'&&previousUiPhase!=='race';
    const onFinalLap=game.phase==='race'&&lap===track.laps;
    const finalLapJustStarted=onFinalLap&&previousUiLap!==track.laps;

    if(greenFlag){
      greenFlag.classList.toggle('hidden',game.phase!=='race'||onFinalLap);
      if(raceJustStarted&&!onFinalLap){
        greenFlag.classList.remove('raceStartFlash');
        void greenFlag.offsetWidth;
        greenFlag.classList.add('raceStartFlash');
      }
      if(game.phase!=='race')greenFlag.classList.remove('raceStartFlash');
    }

    if(finalLap){
      finalLap.classList.toggle('hidden',!onFinalLap);
      if(finalLapJustStarted){
        finalLap.classList.remove('finalLapIntro');
        void finalLap.offsetWidth;
        finalLap.classList.add('finalLapIntro');
        window.setTimeout(()=>finalLap.classList.remove('finalLapIntro'),950);
      }else if(!onFinalLap){
        finalLap.classList.remove('finalLapIntro');
      }
    }

    raceScreen.dataset.uiPhase=game.phase;
    raceScreen.dataset.uiLap=String(lap);
    if($('raceTimer')){
      const seconds=Math.max(0,Math.ceil((game.maxTicks-game.tick)*TICK_MS/1000));
      $('raceTimer').textContent=`0:${String(seconds).padStart(2,'0')}`;
    }

    renderRaceLanes(sorted);
    renderRaceLeaderboard();

    renderUpgradeButtons(me,track);

    renderCountdown();
    renderRaceEvent(me);

    if(game.phase==='race'||game.phase==='countdown'){
      if($('raceStatus'))$('raceStatus').innerHTML=game.phase==='race'
        ?(me.finishTick!==null
          ?'<strong>Finished</strong><span>Your race is complete. Income and upgrades are stopped.</span>'
          :'<strong>Race live</strong><span>Income keeps coming in. Upgrade while the field races automatically.</span>')
        :'<strong>Get ready</strong><span>Race start sequence in progress.</span>';
      $('resultCard').classList.add('hidden');
    }else if(game.phase==='intermission'||game.phase==='complete'){
      renderResult(me);
    }
  }

  function liveLeaderboardOrder(){
    if(!game)return[];
    return [...game.entrants].sort((a,b)=>{
      if(a.position&&b.position)return a.position-b.position;
      if(a.finishTick!==null&&b.finishTick!==null)return a.finishTick-b.finishTick;
      if(a.finishTick!==null)return -1;
      if(b.finishTick!==null)return 1;
      return b.progress-a.progress||String(a.name).localeCompare(String(b.name));
    });
  }

  function renderRaceLeaderboard(){
    const board=$('raceLeaderboard');
    const rows=$('raceLeaderboardRows');
    if(!board||!rows||!game)return;

    const hasFinisher=game.entrants.some(e=>e.finishTick!==null);
    const visible=(game.phase==='race'&&hasFinisher)||game.phase==='intermission'||game.phase==='complete';
    board.classList.toggle('hidden',!visible);
    if(!visible)return;

    const order=liveLeaderboardOrder();
    rows.innerHTML=order.slice(0,MAX_GRID).map((e,index)=>{
      const car=CAR_BY_COLOR[normaliseCarColor(e.carColor)]||CAR_ROSTER[0];
      const finished=e.finishTick!==null||!!e.position;
      const isYou=e.human&&e.playerId===localPlayer?.id;
      const nameY=LEADERBOARD_NAME_Y[index]??LEADERBOARD_NAME_Y[LEADERBOARD_NAME_Y.length-1];
      const colourY=LEADERBOARD_COLOUR_Y[index]??nameY;
      return `<div class="raceLeaderboardRow ${finished?'finished':''} ${isYou?'you':''}" data-place="${index+1}">
        <strong class="raceLeaderboardName" style="top:${nameY}px">${esc(e.name)}</strong>
        <span class="raceLeaderboardColour" style="top:${colourY}px">${esc(car.label)}</span>
      </div>`;
    }).join('');
  }

  function renderUpgradeButtons(me,track){
    const grid=$('upgradeGrid');
    if(!grid)return;

    for(const key of UPGRADE_KEYS){
      const m=UPGRADE_META[key];
      let button=grid.querySelector(`[data-upgrade="${key}"]`);
      if(!button){
        button=document.createElement('button');
        button.type='button';
        button.dataset.upgrade=key;
        button.classList.add('upgradeButton',key,m.kind==='income'?'incomeUpgrade':'carUpgrade');
        button.innerHTML='<span class="upgradeLevel"></span><strong class="upgradeCost"></strong><small class="upgradeMath"></small>';
        grid.appendChild(button);
      }

      const lvl=Math.max(1,finite(me.levels[key],1));
      const cost=upgradeCost(me,key);
      const enabled=game.phase==='race'&&me.finishTick===null&&me.cash>=cost;
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

      button.disabled=!enabled;
      button.style.setProperty('--upgrade-asset',`url('${upgradeAsset(key,enabled)}')`);
      button.querySelector('.upgradeLevel').textContent=`Lv ${lvl}`;
      button.querySelector('.upgradeCost').textContent=money(cost);
      button.querySelector('.upgradeMath').textContent=mathText;
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
        row.innerHTML='<span class="pos" aria-hidden="true"></span><span class="youTag" aria-hidden="true">YOU</span><span class="name"></span>';
        wrap.appendChild(row);
      }
      const isYou=e.playerId===localPlayer.id;
      row.className=`raceLane ${e.human?'human':''} ${isYou?'you':''}`;
      row.dataset.progress=String(clamp(e.progress,0,100));
      row.dataset.carColor=normaliseCarColor(e.carColor);
      row.querySelector('.name').textContent=e.name;
      const humanTag=row.querySelector('.youTag');
      if(humanTag)humanTag.textContent=isYou?'YOU':(e.human?String(e.name||'PLAYER').toUpperCase().slice(0,8):'');
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

  function fitTextInside(el,maxPx,minPx,box=el){
    if(!el||!box)return;
    let size=maxPx;
    el.style.fontSize=`${size}px`;
    el.style.lineHeight='1.02';
    const fits=()=>el.scrollWidth<=box.clientWidth+.5&&el.scrollHeight<=box.clientHeight+.5;
    while(size>minPx&&!fits()){
      size=Math.max(minPx,size-.5);
      el.style.fontSize=`${size}px`;
    }
  }

  function fitRaceEventText(card){
    const question=card.querySelector('.raceEventQuestion');
    const copy=card.querySelector('.raceEventQuestionCopy');
    if(question&&copy)fitTextInside(copy,15,6.25,question);
    card.querySelectorAll('.raceEventChoices button').forEach(button=>fitTextInside(button,15,6,button));
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
      card.className='raceEventCard';
      card.innerHTML=`
        <img class="raceEventAsset" src="${ASSET_ROOT}/ui/popups/choice_50_50.png" alt="">
        <div class="raceEventQuestion">
          <div class="raceEventQuestionCopy">
            <strong>${esc(evt.title)}</strong>
            <small>${esc(evt.prompt)}</small>
          </div>
        </div>
        <div class="raceEventChoices">
          ${evt.choices.map((choice,index)=>`<button type="button" data-event-choice="${index}" data-event-id="${esc(evt.id)}">${esc(choice)}</button>`).join('')}
        </div>
      `;
      requestAnimationFrame(()=>fitRaceEventText(card));
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
    const claimedCount=humans.filter(e=>game.ready?.[e.playerId]).length;
    const amClaimed=!!game.ready?.[me.playerId];

    card.classList.remove('hidden');
    card.classList.add('seriesComplete');
    card.classList.toggle('awaitingClaims',!complete);
    card.classList.toggle('claimed',!complete&&amClaimed);

    card.innerHTML=`
      <img class="resultAsset" src="${ASSET_ROOT}/ui/popups/race_complete.png" alt="">
      <div class="resultPrize">${money(prize)}</div>
      <div class="resultPosition">${ordinalHTML(me.position||12)}</div>
      ${complete
        ?'<button class="resultAction" data-exit-series type="button" aria-label="Claim and return to setup">CLAIM</button>'
        :`<button class="resultAction ${amClaimed?'claimedAction':''}" data-claim-race type="button" ${amClaimed?'disabled':''} aria-label="${amClaimed?'Prize claimed. Waiting for other players.':'Claim winnings'}">CLAIM</button>
           <div class="resultReady">${claimedCount} / ${humans.length} claimed</div>`
      }
    `;

    const cashEl=$('cash');
    if(cashEl&&!amClaimed&&prize>0){
      cashEl.textContent=money(finite(me.cashBeforePrize,me.cash-prize));
    }
  }

  function ordinalParts(n){
    n=Number(n)||0;
    const suffixes=['th','st','nd','rd'],v=n%100;
    return {number:n,suffix:suffixes[(v-20)%10]||suffixes[v]||suffixes[0]};
  }
  function ordinal(n){const p=ordinalParts(n);return p.number+p.suffix}
  function ordinalHTML(n){const p=ordinalParts(n);return `${p.number}<sup class="ordinalSuffix">${p.suffix}</sup>`}

  function animatePrizeTransfer(source,target,onDone){
    if(!source||!target){onDone?.();return}
    const from=source.getBoundingClientRect();
    const to=target.getBoundingClientRect();
    const sx=from.left+from.width/2;
    const sy=from.top+from.height/2;
    const tx=to.left+to.width/2;
    const ty=to.top+to.height/2;
    const count=12;
    let finished=0;

    for(let i=0;i<count;i++){
      const note=document.createElement('span');
      note.className='cashNoteFx claimPrizeNote';
      note.textContent='£';
      note.style.left=`${sx-11}px`;
      note.style.top=`${sy-6}px`;
      document.body.appendChild(note);

      const spread=(i-(count-1)/2)*7.5;
      const lift=22+(i%4)*7;
      const twist=(i%2?-1:1)*(16+(i%5)*7);
      const animation=note.animate([
        {transform:`translate(0,0) rotate(${-twist*.35}deg) scale(.62)`,opacity:0},
        {transform:`translate(${spread*.35}px,${-lift*.55}px) rotate(${twist}deg) scale(1.05)`,opacity:1,offset:.20},
        {transform:`translate(${(tx-sx)*.55+spread}px,${(ty-sy)*.42-lift}px) rotate(${-twist*.65}deg) scale(.92)`,opacity:.95,offset:.58},
        {transform:`translate(${tx-sx}px,${ty-sy}px) rotate(${twist*.18}deg) scale(.48)`,opacity:.08}
      ],{
        duration:590+(i%4)*42,
        delay:i*34,
        easing:'cubic-bezier(.18,.72,.25,1)',
        fill:'forwards'
      });
      animation.onfinish=()=>{
        note.remove();
        finished++;
        if(finished===count)onDone?.();
      };
    }
  }

  function claimPrizeThen(after){
    const me=localEntrant();
    const card=$('resultCard');
    const cashEl=$('cash');
    const prizeEl=card?.querySelector('.resultPrize');
    if(!me){after?.();return}

    const prize=Math.max(0,finite(me.lastPrize,0));
    const prizeKey=`${game?.mode}:${game?.raceNo}:${me.playerId}:claimed-prize`;

    if(prize<=0||prizeAnimations.has(prizeKey)){
      if(cashEl)cashEl.textContent=money(me.cash);
      after?.();
      return;
    }

    prizeAnimations.add(prizeKey);
    if(cashEl)cashEl.textContent=money(finite(me.cashBeforePrize,me.cash-prize));

    animatePrizeTransfer(prizeEl,cashEl,()=>{
      if(cashEl){
        cashEl.textContent=money(me.cash);
        cashEl.classList.remove('cashPotReceive');
        void cashEl.offsetWidth;
        cashEl.classList.add('cashPotReceive');
      }
      after?.();
    });
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
      coin.className='cashNoteFx';
      coin.textContent='£';
      coin.style.left=`${sx-11}px`;
      coin.style.top=`${sy-6}px`;
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

  function resolveSinglePlayer(){
    const people=roster();
    const saved=people.find(player=>player.id===selectedSingleId)||people[0]||null;
    if(saved){
      selectedSingleId=saved.id;
      return saved;
    }
    return {id:'gridline-local-player',name:'Player'};
  }

  function updateTrackStartButton(){
    const button=$('startConfiguredRace');
    if(!button)return;
    button.disabled=false;
  }

  function startConfiguredRace(event){
    event?.preventDefault?.();
    event?.stopPropagation?.();
    if(playMode==='single'){
      startSingleRace();
      return;
    }
    if(playMode==='multi'&&role==='host'){
      launchHostRace();
      return;
    }
  }

  function installSession(kind){
    if(!window.GameBoxLAN?.DiscoverySession)throw new Error('Automatic multiplayer discovery is unavailable in this browser.');
    if(!session){
      session=new window.GameBoxLAN.DiscoverySession({
        game:'gridline-v19',
        onStatus:text=>{if(role==='host')$('hostState').textContent=text;if(role==='client')$('joinState').textContent=text},
        onHostsChanged:hosts=>renderAvailableHosts(hosts),
        onPeersChanged:()=>{
          if(role==='host'){renderHostLobby();broadcastLobby()}
          if(role==='client'&&session.peers().length&&pendingHello){pendingHello=false;sendClientHello()}
        },
        onMessage:handleNetworkMessage
      });
    }else{
      try{session.suspend?.()}catch{}
    }
    role=kind;
  }

  function ensureSession(kind=role){
    if(!session)installSession(kind);
    return session;
  }

  function sendClientHello(){
    if(!localPlayer)return;
    session?.sendToHost({
      type:'hello',
      player:localPlayer,
      profile:getProfile(localPlayer),
      carColor:validCarColor(selectedCarColor)||null
    });
  }

  function hostColorTaken(color,excludePeerId=''){
    const wanted=validCarColor(color);
    if(!wanted)return false;
    if(validCarColor(selectedCarColor)===wanted)return true;
    return !!session?.peers?.().some(peer=>peer.id!==excludePeerId&&validCarColor(peer.meta?.carColor)===wanted);
  }

  function handleNetworkMessage(msg,source){
    if(role==='host'){
      if(msg.type==='hello'&&source.peer){
        source.peer.meta.player={id:String(msg.player?.id||uid()),name:String(msg.player?.name||'Friend').slice(0,24)};
        source.peer.meta.profile=msg.profile||null;
        const requested=validCarColor(msg.carColor);
        if(requested&&!hostColorTaken(requested,source.peer.id))source.peer.meta.carColor=requested;
        else if(!validCarColor(source.peer.meta.carColor))source.peer.meta.carColor='';
        renderHostLobby();broadcastLobby();return;
      }
      if(msg.type==='color-choice'&&source.peer){
        const requested=validCarColor(msg.carColor);
        if(!requested||hostColorTaken(requested,source.peer.id)){
          session.sendToPeer?.(source.peer,{type:'color-rejected',carColor:requested,players:hostPlayers(),config:{stage:multiplayerStage}});
          broadcastLobby();
          return;
        }
        source.peer.meta.carColor=requested;
        renderHostLobby();broadcastLobby();return;
      }
      if(msg.type==='race-action'){applyAction(String(msg.playerId||''),msg);return}
    }else if(role==='client'){
      if(msg.type==='lobby'){renderJoinLobby(msg.players||[],msg.config||null);return}
      if(msg.type==='color-rejected'){
        selectedCarColor='';
        if(Array.isArray(msg.players))renderJoinLobby(msg.players,msg.config||null);
        const state=$('joinCarState');if(state)state.textContent='Choose another';
        return;
      }
      if(msg.type==='race-state'&&msg.game){applyRemoteGame(msg.game);return}
    }
  }

  function hostPlayers(){
    const hp=roster().find(p=>p.id===$('hostPlayerSelect')?.value);
    const players=[];
    const hostColor=validCarColor(selectedCarColor);
    if(hp)players.push({id:hp.id,name:hp.name,host:true,carColor:hostColor,ready:!!hostColor});
    session?.peers?.().forEach(peer=>{
      if(!peer.meta?.player)return;
      const color=validCarColor(peer.meta?.carColor);
      players.push({...peer.meta.player,host:false,carColor:color,ready:!!color});
    });
    return players.slice(0,4);
  }

  function renderHostLobby(){
    const players=hostPlayers();
    const allReady=players.length>=2&&players.every(player=>player.ready);
    $('hostLobby').innerHTML=players.length?players.map((p,i)=>`<div class="leaderRow ${p.ready?'readyPlayer':'waitingPlayer'}"><span class="rank">${i+1}</span><strong>${esc(p.name)}${p.host?' · Host':''}</strong><small>${p.ready?`${esc(carLabel(p.carColor))} car · Ready`:'Choose a car'}</small></div>`).join(''):'<div class="emptyState">Choose the host player, then connect friends.</div>';
    $('startHostRace').disabled=!allReady;
    const state=$('hostCarState');if(state)state.textContent=validCarColor(selectedCarColor)?'Ready':'Not ready';
    const note=$('hostReadyNote');if(note)note.textContent=allReady?'Everybody is ready. Start Race will move the host to track selection.':'Every player must choose a different car before the host can continue.';
    renderCarChoices('host');
  }

  function renderJoinLobby(players,config=null){
    latestLobbyPlayers=Array.isArray(players)?players:[];
    multiplayerStage=config?.stage==='track'?'track':'lobby';
    const panel=$('joinCarPanel');
    if(panel)panel.classList.toggle('hidden',!session?.peers?.().length);
    const ownId=localPlayer?.id||$('joinPlayerSelect')?.value||'';
    const mine=latestLobbyPlayers.find(player=>String(player.id)===String(ownId));
    const authoritativeColor=validCarColor(mine?.carColor);
    if(authoritativeColor)selectedCarColor=authoritativeColor;

    $('joinLobby').innerHTML=latestLobbyPlayers.length?latestLobbyPlayers.map((p,i)=>`<div class="leaderRow ${p.ready?'readyPlayer':'waitingPlayer'}"><span class="rank">${i+1}</span><strong>${esc(p.name)}${p.host?' · Host':''}</strong><small>${p.ready?`${esc(carLabel(p.carColor))} car · Ready`:'Choosing a car…'}</small></div>`).join(''):'<div class="emptyState">Waiting for the host lobby.</div>';
    renderCarChoices('join',latestLobbyPlayers);

    const carState=$('joinCarState');
    if(carState)carState.textContent=authoritativeColor?'Ready':'Not ready';

    const summary=$('joinRaceConfig');
    if(summary){
      const stage=config?.stage||'lobby';
      if(stage==='track'){
        summary.innerHTML='<strong>Everybody is ready</strong><small>The host is choosing the track. Your race will start automatically when they press Start Race.</small>';
      }else{
        summary.innerHTML='<strong>Waiting for the host</strong><small>Choose an available car. The host will choose the track once everybody is ready.</small>';
      }
    }
  }

  function renderAvailableHosts(hosts=[]){
    const wrap=$('availableHosts');
    if(!wrap||role!=='client')return;
    if(session?.peers?.().length){
      $('joinState').textContent='Connected';
      wrap.innerHTML='<div class="discoveryConnected">Connected to host ✓</div>';
      const panel=$('joinCarPanel');if(panel)panel.classList.remove('hidden');
      return;
    }

    const open=hosts.filter(host=>
      !host.started&&
      finite(host.playerCount,1)<finite(host.maxPlayers,4)&&
      (host.raceMode||'')==='gridline'
    );

    if(!open.length){
      $('joinState').textContent='Scanning';
      wrap.innerHTML='<div class="discoveryScanning"><span class="scanPulse"></span><strong>Scanning for Gridline hosts…</strong><small>Join first — the host chooses the track later.</small></div>';
      return;
    }

    $('joinState').textContent=`${open.length} found`;
    wrap.innerHTML=open.map(host=>`
      <button class="hostDiscoveryCard" type="button" data-auto-host="${esc(host.peerId)}">
        <span class="hostDiscoveryIcon">🏁</span>
        <span class="hostDiscoveryCopy">
          <strong>${esc(host.hostName||((host.playerName||'Host')+"'s Race"))}</strong>
          <small>${finite(host.playerCount,1)} / ${finite(host.maxPlayers,4)} players · Track chosen after lobby is ready</small>
        </span>
        <span class="hostDiscoveryJoin">JOIN</span>
      </button>
    `).join('');
  }

  function broadcastLobby(){
    if(role!=='host'||!session)return;
    session.broadcast({
      type:'lobby',
      players:hostPlayers(),
      config:{stage:multiplayerStage,trackIndex:setupConfig().trackIndex}
    });
  }

  function resetNetworkSession(hard=false){
    try{hard?session?.close():session?.suspend?.()}catch{}
    if(hard)session=null;
    pendingHello=false;
    latestLobbyPlayers=[];
    multiplayerStage='lobby';
    role=null;
  }

  async function startAutoHost(){
    const p=roster().find(x=>x.id===$('hostPlayerSelect')?.value);
    if(!p){$('hostState').textContent='Choose player';return}
    installSession('host');
    const current=session;
    $('hostState').textContent='Starting';
    try{
      await current.startHost({
        hostName:`${p.name}'s Gridline Race`,
        player:p,
        profile:getProfile(p),
        raceMode:'gridline',
        trackName:'Track chosen by host',
        totalRaces:1
      });
      renderHostLobby();
      broadcastLobby();
    }catch(err){
      console.error(err);
      $('hostState').textContent='Discovery error';
    }
  }

  async function startAutoScan(){
    installSession('client');
    const current=session;
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
    const p=roster().find(x=>x.id===$('joinPlayerSelect')?.value);
    if(!p)return;
    localPlayer=p;
    selectedCarColor='';
    pendingHello=false;
    $('joinState').textContent='Joining';
    try{
      await ensureSession('client').joinHost(peerId,{player:p,profile:getProfile(p)});
      $('joinState').textContent='Connected';
      sendClientHello();
      renderAvailableHosts([]);
      renderCarChoices('join',latestLobbyPlayers);
    }catch(err){
      console.error(err);
      $('joinState').textContent=err?.message||'Join failed';
    }
  }

  function startHostRace(){
    const players=hostPlayers();
    if(players.length<2||!players.every(player=>player.ready))return;
    multiplayerStage='track';
    raceSetup.mode='quick';
    broadcastLobby();
    showSetup('trackSetup');
  }

  function launchHostRace(){
    const hp=roster().find(p=>p.id===$('hostPlayerSelect')?.value);
    if(!hp)return;
    const players=hostPlayers();
    if(players.length<2||!players.every(player=>player.ready)){
      multiplayerStage='lobby';
      broadcastLobby();
      showSetup('hostSetup');
      return;
    }

    localPlayer=hp;
    playMode='multi';
    role='host';
    const humans=[{player:hp,owner:'host',profile:getProfile(hp),carColor:validCarColor(selectedCarColor)}];
    session?.peers?.().forEach(peer=>{
      const color=validCarColor(peer.meta?.carColor);
      if(peer.meta?.player&&color)humans.push({player:peer.meta.player,owner:peer.id,profile:peer.meta.profile||null,carColor:color});
    });
    if(humans.length<2)return;

    game=buildGame(humans,setupConfig());
    try{
      showRace();
      renderGame();
    }catch(err){
      console.error('Could not start Gridline host race',err);
      game=null;
      multiplayerStage='track';
      showSetup('trackSetup');
      return;
    }
    session?.updateHost?.({started:true,raceMode:'gridline',trackName:TRACKS[setupConfig().trackIndex].name});
    broadcastGame();
    clearInterval(hostTimer);
    hostTimer=setInterval(hostTick,TICK_MS);
  }

  function startSingleRace(){
    const p=resolveSinglePlayer();
    localPlayer=p;playMode='single';role='host';
    game=buildGame([{player:p,owner:'local',profile:getProfile(p),carColor:selectedCarColor}],setupConfig());
    showRace();
    renderGame();
    clearInterval(hostTimer);
    hostTimer=setInterval(hostTick,TICK_MS);
  }

  function leaveRace(){
    clearInterval(hostTimer);hostTimer=null;game=null;
    resetNetworkSession(false);
    selectedCarColor='gold';
    playMode='single';
    showSetup('setupHome');
  }

  function bind(){
    $('chooseSingle').onclick=()=>{
      playMode='single';
      role=null;
      showSetup('raceFormatSetup');
    };
    $('chooseMulti').onclick=()=>{
      playMode='multi';
      role=null;
      selectedCarColor='';
      multiplayerStage='lobby';
      raceSetup.mode='quick';
      showSetup('wifiRole');
    };
    $('chooseHost').onclick=()=>{
      resetNetworkSession(false);
      playMode='multi';
      selectedCarColor='';
      multiplayerStage='lobby';
      showSetup('hostSetup');
      renderHostLobby();
      startAutoHost();
    };
    $('chooseJoin').onclick=()=>{
      resetNetworkSession(false);
      playMode='multi';
      selectedCarColor='';
      multiplayerStage='lobby';
      showSetup('joinSetup');
      renderJoinLobby([]);
      startAutoScan();
    };
    $$('[data-back]').forEach(b=>b.onclick=()=>{
      if(b.closest('#trackSetup')&&playMode==='multi'&&role==='host'){
        multiplayerStage='lobby';
        session?.updateHost?.({started:false,raceMode:'gridline',trackName:'Track chosen by host'});
        broadcastLobby();
      }
      if(b.closest('#hostSetup,#joinSetup'))resetNetworkSession(false);
      showSetup(b.dataset.back);
    });
    $('startConfiguredRace').onclick=startConfiguredRace;
    $('hostPlayerSelect').onchange=()=>{
      renderHostLobby();
      const p=roster().find(x=>x.id===$('hostPlayerSelect').value);
      if(p&&session?.updateHost)session.updateHost({hostName:`${p.name}'s Gridline Race`,player:p,profile:getProfile(p),raceMode:'gridline'});
      broadcastLobby();
    };
    $('joinPlayerSelect').onchange=()=>{
      localPlayer=roster().find(x=>x.id===$('joinPlayerSelect').value)||localPlayer;
      if(role==='client'&&session?.peers?.().length)sendClientHello();
    };
    const flowRaceCount=$('flowRaceCount');
    if(flowRaceCount)flowRaceCount.oninput=()=>{
      raceSetup.races=clamp(Math.round(finite(flowRaceCount.value,5)),3,15);
      renderRaceSetup();
    };
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
      const carChoice=e.target.closest('[data-car-color]');
      if(carChoice&&!carChoice.disabled){
        const advanceToTrack=playMode==='single'&&!!carChoice.closest('#carSetup');
        const selected=selectCarColor(carChoice.dataset.carColor);
        if(selected&&advanceToTrack)showSetup('trackSetup');
        return;
      }
      const raceMode=e.target.closest('[data-race-mode]');
      if(raceMode){
        raceSetup.mode=raceMode.dataset.raceMode==='tournament'?'tournament':'quick';
        renderRaceSetup();
        if(raceMode.closest('#raceFormatSetup'))showSetup('carSetup');
        return;
      }
      const trackChoice=e.target.closest('[data-track-index]');
      if(trackChoice){
        raceSetup.trackIndex=clamp(Math.round(finite(trackChoice.dataset.trackIndex,0)),0,TRACKS.length-1);
        renderRaceSetup();
        openTrackStartPopup();
        return;
      }
      const closeTrackStart=e.target.closest('[data-close-track-start]');
      if(closeTrackStart){
        closeTrackStartPopup();
        return;
      }
      const exitSeries=e.target.closest('[data-exit-series]');
      if(exitSeries){
        exitSeries.disabled=true;
        exitSeries.classList.add('claimingAction');
        claimPrizeThen(()=>leaveRace());
        return;
      }
      const autoHost=e.target.closest('[data-auto-host]');
      if(autoHost){
        joinDiscoveredHost(autoHost.dataset.autoHost);
        return;
      }
      const claim=e.target.closest('[data-claim-race]');
      if(claim&&!claim.disabled){
        claim.disabled=true;
        claim.classList.add('claimingAction');
        claimPrizeThen(()=>requestAction({action:'claim'}));
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

    window.addEventListener('resize',()=>{if(document.body.classList.contains('gridline-menu-live'))updateMenuScale()},{passive:true});
        const cleanupNetworking=()=>{try{resetNetworkSession(true)}catch{};clearInterval(hostTimer)};
    // Do not kill a live discovery session when the browser puts this page
    // into the back/forward cache. That left a restored lobby looking alive while
    // its underlying Trystero room had already been closed.
    window.addEventListener('pagehide',event=>{if(!event.persisted)cleanupNetworking()});
    window.addEventListener('pageshow',event=>{
      if(!event.persisted)return;
      if(document.getElementById('hostSetup')&&!document.getElementById('hostSetup').classList.contains('hidden'))startAutoHost();
      if(document.getElementById('joinSetup')&&!document.getElementById('joinSetup').classList.contains('hidden'))startAutoScan();
    });
  }

  syncPlayerSelects();
  renderSinglePlayers();
  renderRaceSetup();
  renderCarChoices('flow');
  bind();
  showSetup('setupHome');
})();