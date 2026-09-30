
(() => {
  'use strict';

  const STORAGE_KEY = 'gamebox-relic-v1';
  const INTRO_KEY = 'gamebox-relic-intro-v1';

  const RELICS = [
    {id:'BIDFORD-01',name:"Bridgekeeper's Seal",short:'Bridge Seal',glyph:'bridge',coords:[-1.85666,52.16402],clue:'Follow the riverside path towards the old bridge.',search:'Search near the riverside approach to the bridge.',hint:'Look lower than eye level, close to the path edge.',xp:120,coins:42,gear:'Riverwalker Bandana'},
    {id:'BIDFORD-02',name:"Meadow Mark",short:'Meadow Mark',glyph:'meadow',coords:[-1.85698,52.16299],clue:'Head into Big Meadow and keep the river nearby.',search:'The mark is hiding around the meadow edge.',hint:'Think about places a small trail marker could sit without blocking anyone.',xp:90,coins:31},
    {id:'BIDFORD-03',name:"Willow Sigil",short:'Willow Sigil',glyph:'willow',coords:[-1.85805,52.16328],clue:'Continue west with the Avon on your right.',search:'Search the edge where meadow meets riverside trees.',hint:'Look for the willow-shaped symbol rather than a brightly coloured sign.',xp:100,coins:34},
    {id:'BIDFORD-04',name:"Ferryman's Token",short:'Ferryman',glyph:'ferry',coords:[-1.85916,52.16364],clue:'Stay on the riverside route and follow the bend.',search:'A ferryman once needed a way across. Search the riverward side.',hint:'You should not need to leave the established route.',xp:125,coins:45,gear:'Avon Trail Tag'},
    {id:'BIDFORD-05',name:"Field Compass",short:'Field Compass',glyph:'compass',coords:[-1.86002,52.16296],clue:'Turn away from the river and cross the open meadow route.',search:'Find the compass mark around the open-space path.',hint:'The four-point mark is easier to recognise than the object carrying it.',xp:105,coins:36},
    {id:'BIDFORD-06',name:"Hound Moon",short:'Hound Moon',glyph:'moon',coords:[-1.85931,52.16198],clue:'Follow the quieter southern edge of the meadow.',search:'The moon-hound mark is somewhere around this section of trail.',hint:'At night, use your torch — never leave the path just for a relic.',xp:145,coins:52,gear:'Moonwalker Collar'},
    {id:'BIDFORD-07',name:"Wayfarer's Coin",short:'Wayfarer',glyph:'wayfarer',coords:[-1.85798,52.16171],clue:'Curve back east along the lower meadow route.',search:'Search for the travelling mark near the path.',hint:'Look for a tiny walking-line symbol inside a round seal.',xp:110,coins:39},
    {id:'BIDFORD-08',name:"Avon Crest",short:'Avon Crest',glyph:'avon',coords:[-1.85670,52.16178],clue:'Keep heading east until the route begins to return north.',search:'The Avon crest waits close to the meadow path.',hint:'Water lines are engraved across this relic.',xp:115,coins:41},
    {id:'BIDFORD-09',name:"Millstone Fragment",short:'Millstone',glyph:'mill',coords:[-1.85588,52.16255],clue:'Follow the route back towards the village side of the meadow.',search:'Search around the path junction for the broken-ring symbol.',hint:'Look for a circle that appears deliberately incomplete.',xp:130,coins:47,gear:'Explorer Harness'},
    {id:'BIDFORD-10',name:"The Bidford Relic",short:'Bidford Relic',glyph:'crown',coords:[-1.85625,52.16348],clue:'Return towards the bridge. The final mark is waiting.',search:'Your final relic is hidden near the end of the riverside loop.',hint:'You have seen its shape in the app since the moment you arrived.',xp:220,coins:85,gear:'Relic Keeper Bandana'}
  ];

  const ROUTE = [
    [-1.85666,52.16402],[-1.85692,52.16361],[-1.85698,52.16299],[-1.85805,52.16328],
    [-1.85916,52.16364],[-1.86002,52.16296],[-1.85931,52.16198],[-1.85798,52.16171],
    [-1.85670,52.16178],[-1.85588,52.16255],[-1.85625,52.16348],[-1.85666,52.16402]
  ];
  const CENTER = [-1.85775,52.16285];

  const gear = [
    {name:'Plain Trail Collar',icon:'◇'},
    {name:'Riverwalker Bandana',icon:'⌁'},
    {name:'Avon Trail Tag',icon:'◆'},
    {name:'Moonwalker Collar',icon:'◐'},
    {name:'Explorer Harness',icon:'△'},
    {name:'Relic Keeper Bandana',icon:'✦'}
  ];

  const defaultState = () => ({
    found: [],
    xp: 0,
    coins: 0,
    dogName: 'Scout',
    equipped: 'Plain Trail Collar',
    current: 0,
    started: false,
    completed: false,
    adventuresCompleted: 0,
    preview: false,
    earnedGear: ['Plain Trail Collar'],
    runXp: 0,
    runCoins: 0
  });

  let state = loadState();
  let exploreMap = null;
  let adventureMap = null;
  let playerMarker = null;
  let watchId = null;
  let lastPosition = null;
  let introIndex = 0;
  let tourIndex = 0;
  let toastTimer = null;

  const $ = id => document.getElementById(id);
  const $$ = sel => [...document.querySelectorAll(sel)];

  function loadState(){
    try { return {...defaultState(), ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')}; }
    catch { return defaultState(); }
  }
  function saveState(){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    renderAll();
  }
  function levelForXp(xp){ return Math.max(1, Math.floor(xp / 500) + 1); }
  function vibrate(pattern){ try { if(navigator.vibrate) navigator.vibrate(pattern); } catch {} }
  function showToast(msg){
    const el = $('toast'); if(!el) return;
    el.textContent = msg; el.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(()=>el.classList.remove('show'),1800);
  }
  function setHidden(id, hidden){ const el=$(id); if(el) el.classList.toggle('hidden',hidden); }

  function medallionSVG(type, found=true, large=false){
    const motifs = {
      bridge:'<path d="M25 69h50M31 66V49c13-14 25-14 38 0v17M37 58h26" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>',
      meadow:'<path d="M23 66c12-20 20-20 28 0 8-20 16-20 26 0M28 42c8 5 14 5 22 0 8-5 15-5 23 0" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>',
      willow:'<path d="M50 25v48M50 33c-18 4-24 14-25 29M50 39c17 1 24 11 27 25M37 37l-10 14M63 41l11 13" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>',
      ferry:'<path d="M25 61h50l-9 12H34zM31 55h38M38 31v24M38 31l23 11-23 4" fill="none" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/>',
      compass:'<path d="M50 23l9 18 18 9-18 9-9 18-9-18-18-9 18-9z" fill="none" stroke="currentColor" stroke-width="5"/><circle cx="50" cy="50" r="5" fill="currentColor"/>',
      moon:'<path d="M63 26c-21 4-28 34-5 46-22 5-37-7-37-25 0-18 18-31 42-21z" fill="none" stroke="currentColor" stroke-width="5"/><path d="M61 55l8-8 9 8" fill="none" stroke="currentColor" stroke-width="4"/>',
      wayfarer:'<path d="M30 68c17-4 13-22 27-28 7-3 13-7 14-16M57 40l-3-13M57 40l12 2M38 70l-9-9" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>',
      avon:'<path d="M22 39c13-10 21 10 34 0s21 10 32 0M22 55c13-10 21 10 34 0s21 10 32 0M31 69h38" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>',
      mill:'<path d="M27 49a23 23 0 1 1 12 20M50 27v12M73 50H61M50 73V61M27 50h12" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>',
      crown:'<path d="M24 39l13 12 13-22 13 22 13-12-7 35H31z" fill="none" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/><path d="M31 63h38" stroke="currentColor" stroke-width="5"/>'
    };
    const mark = motifs[type] || motifs.crown;
    const id = 'g'+Math.random().toString(36).slice(2,8);
    const dull = found ? '' : ' opacity=".62"';
    return '<svg viewBox="0 0 100 100" aria-hidden="true"'+dull+'><defs><radialGradient id="'+id+'" cx="34%" cy="25%"><stop stop-color="'+(found?'#efd082':'#9a927e')+'"/><stop offset=".55" stop-color="'+(found?'#bd8a3f':'#77776d')+'"/><stop offset="1" stop-color="'+(found?'#5b3d1d':'#4e554f')+'"/></radialGradient></defs><circle cx="50" cy="50" r="46" fill="#17231d" stroke="#0d1511" stroke-width="4"/><circle cx="50" cy="50" r="40" fill="url(#'+id+')" stroke="'+(found?'#e7c370':'#aaa38e')+'" stroke-width="2"/><circle cx="50" cy="50" r="33" fill="none" stroke="rgba(71,48,25,.55)" stroke-width="2" stroke-dasharray="2 5"/><g color="'+(found?'#513718':'#555a52')+'">'+mark+'</g></svg>';
  }

  function dogSVG(){
    return '<svg viewBox="0 0 210 230" aria-hidden="true">'+
      '<ellipse cx="108" cy="207" rx="68" ry="12" fill="rgba(16,27,21,.28)"/>'+
      '<g class="tail"><path d="M145 143c36-1 44-28 25-40 30 1 34 43-11 60" fill="none" stroke="#9a6e42" stroke-width="18" stroke-linecap="round"/><path d="M166 108c13 8 8 21 1 28" fill="none" stroke="#d1a168" stroke-width="6" stroke-linecap="round"/></g>'+
      '<path d="M75 119c-22 21-27 71-16 84h101c10-36-1-76-24-87z" fill="#9b6d42" stroke="#3e2f24" stroke-width="4"/>'+
      '<path d="M75 166c-12 8-17 24-16 39h31l-1-43zm61-2 2 41h29c0-19-7-33-19-41z" fill="#d2a46d" stroke="#3e2f24" stroke-width="4"/>'+
      '<path d="M64 66c5-36 28-51 56-44 28 7 39 32 33 65-5 32-28 52-55 47-31-5-39-35-34-68z" fill="#ad7a49" stroke="#3e2f24" stroke-width="4"/>'+
      '<path class="earL" d="M75 60C47 44 46 26 61 21c18-6 31 15 33 31z" fill="#7f5838" stroke="#3e2f24" stroke-width="4"/>'+
      '<path d="M137 63c27-13 29-31 15-38-17-8-32 13-34 31z" fill="#7f5838" stroke="#3e2f24" stroke-width="4"/>'+
      '<path d="M86 83c3-7 10-7 14 0m23 0c3-7 10-7 14 0" fill="none" stroke="#28231e" stroke-width="4" stroke-linecap="round"/>'+
      '<path d="M104 94c8-5 16-4 21 1-2 8-7 12-13 12-6-1-9-5-8-13z" fill="#2a241f"/>'+
      '<path d="M112 108v9m0 0c-9 7-17 4-20-1m20 1c8 7 16 4 20-2" fill="none" stroke="#3e2f24" stroke-width="3" stroke-linecap="round"/>'+
      '<path d="M72 131c21 15 48 16 74 1" fill="none" stroke="#356b70" stroke-width="10" stroke-linecap="round"/>'+
      '<circle cx="110" cy="139" r="8" fill="#c6964b" stroke="#50391f" stroke-width="3"/>'+
      '<path d="M91 65c-4-13 2-24 14-29" fill="none" stroke="#c9955e" stroke-width="7" stroke-linecap="round" opacity=".45"/>'+
    '</svg>';
  }

  function renderRelics(){
    const grid = $('relicGrid'); if(!grid) return;
    grid.innerHTML = RELICS.map((r,i)=>{
      const found = state.found.includes(r.id);
      return '<div class="relicSlot '+(found?'':'locked')+'"><div class="slotMedallion">'+medallionSVG(r.glyph,found)+'</div><strong>'+(found?r.short:'Unknown Relic')+'</strong><small>'+(found?'Recovered':'Undiscovered')+'</small></div>';
    }).join('');
  }

  function renderDog(){
    ['dogStage','introDog'].forEach(id=>{const el=$(id); if(el) el.innerHTML=dogSVG();});
    if($('dogName')) $('dogName').textContent=state.dogName;
  }

  function renderAll(){
    const level = levelForXp(state.xp);
    if($('levelLabel')) $('levelLabel').textContent='LV '+level;
    if($('coinLabel')) $('coinLabel').textContent=state.coins;
    if($('collectionFound')) $('collectionFound').textContent=state.found.length;
    if($('homeLevel')) $('homeLevel').textContent=level;
    if($('homeRelics')) $('homeRelics').textContent=state.found.length;
    if($('homeAdventures')) $('homeAdventures').textContent=state.adventuresCompleted;
    if($('dogName')) $('dogName').textContent=state.dogName;
    if($('equippedName')) $('equippedName').textContent=state.equipped;
    const eq=gear.find(g=>g.name===state.equipped)||gear[0];
    if($('equippedIcon')) $('equippedIcon').textContent=eq.icon;
    if($('previewToggle')) $('previewToggle').checked=!!state.preview;
    renderRelics();
    renderAdventurePanel();
    updateHud();
  }

  function renderAdventurePanel(){
    const box=$('activeAdventurePanel'); if(!box) return;
    const found=state.found.length;
    if(state.completed){
      box.innerHTML='<div class="journeyCard"><span class="eyebrow">COMPLETED</span><h2>The Lost Relics of Bidford</h2><div class="journeyProgress"><div><i style="width:100%"></i></div><b>10 / 10</b></div><button class="primaryButton" id="journeyCollection">VIEW COLLECTION <span>→</span></button></div>';
      setTimeout(()=>{const b=$('journeyCollection'); if(b)b.onclick=()=>switchScreen('collection');},0);
    } else if(state.started){
      box.innerHTML='<div class="journeyCard"><span class="eyebrow">ACTIVE ADVENTURE</span><h2>The Lost Relics of Bidford</h2><div class="journeyProgress"><div><i style="width:'+(found*10)+'%"></i></div><b>'+found+' / 10</b></div><button class="primaryButton" id="journeyContinue">CONTINUE ADVENTURE <span>→</span></button></div>';
      setTimeout(()=>{const b=$('journeyContinue'); if(b)b.onclick=()=>openAdventureMode();},0);
    } else {
      box.innerHTML='<div class="journeyCard"><span class="eyebrow">READY TO BEGIN</span><h2>The Lost Relics of Bidford</h2><div class="journeyProgress"><div><i style="width:0%"></i></div><b>0 / 10</b></div><button class="primaryButton" id="journeyStart">BEGIN ADVENTURE <span>→</span></button></div>';
      setTimeout(()=>{const b=$('journeyStart'); if(b)b.onclick=()=>openSheet('adventureSheet');},0);
    }
    if($('adventuresLead')) $('adventuresLead').textContent=state.completed?'Your first Bidford folio is complete.':state.started?'Your trail is waiting by the Avon.':'One trail is waiting by the Avon.';
  }

  function switchScreen(name){
    $$('.screen').forEach(s=>s.classList.toggle('active',s.dataset.screen===name));
    $$('.navButton').forEach(b=>b.classList.toggle('active',b.dataset.nav===name));
    if(name==='explore' && exploreMap) setTimeout(()=>exploreMap.resize(),50);
  }

  function openSheet(id){ setHidden(id,false); }
  function closeSheet(id){ setHidden(id,true); }

  function mapStyle(){
    return 'https://tiles.openfreemap.org/styles/liberty';
  }

  function initMap(container, isAdventure=false){
    if(!window.maplibregl || !$(container)) return null;
    try{
      const map=new maplibregl.Map({
        container,
        style:mapStyle(),
        center:CENTER,
        zoom:isAdventure?15.5:14.6,
        attributionControl:true,
        pitch:isAdventure?18:0
      });
      map.on('load',()=>{
        map.addSource('trail-route',{type:'geojson',data:{type:'Feature',geometry:{type:'LineString',coordinates:ROUTE}}});
        map.addLayer({id:'trail-glow',type:'line',source:'trail-route',paint:{'line-color':'#efe7d7','line-width':8,'line-opacity':.68}});
        map.addLayer({id:'trail-line',type:'line',source:'trail-route',paint:{'line-color':'#b98a43','line-width':3.5,'line-opacity':.98,'line-dasharray':[1.5,1]}});
        RELICS.forEach((r,i)=>{
          const el=document.createElement('div');
          el.className='mysteryMarker '+(i===state.current&&state.started?'current':'');
          el.textContent=state.found.includes(r.id)?'◇':'?';
          new maplibregl.Marker({element:el}).setLngLat(r.coords).addTo(map);
        });
      });
      return map;
    }catch(err){
      console.warn('Map unavailable',err);
      return null;
    }
  }

  function initMaps(){
    exploreMap=initMap('exploreMap',false);
  }

  function ensureAdventureMap(){
    if(!adventureMap){
      adventureMap=initMap('adventureMap',true);
      if(adventureMap) setTimeout(()=>adventureMap.resize(),100);
    }
  }

  function distanceMeters(a,b){
    if(!a||!b)return Infinity;
    const R=6371000, lat1=a[1]*Math.PI/180, lat2=b[1]*Math.PI/180;
    const dlat=(b[1]-a[1])*Math.PI/180, dlon=(b[0]-a[0])*Math.PI/180;
    const h=Math.sin(dlat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dlon/2)**2;
    return 2*R*Math.asin(Math.sqrt(h));
  }

  function startLocationWatch(){
    if(!navigator.geolocation || watchId!==null) return;
    watchId=navigator.geolocation.watchPosition(pos=>{
      lastPosition=[pos.coords.longitude,pos.coords.latitude];
      updatePositionUI();
      updatePlayerMarker();
    },()=>{ if(!state.preview) showToast('Location unavailable · preview mode still works'); },
    {enableHighAccuracy:true,maximumAge:5000,timeout:12000});
  }

  function updatePlayerMarker(){
    const map=adventureMap||exploreMap;
    if(!map||!lastPosition||!window.maplibregl)return;
    if(!playerMarker){
      const el=document.createElement('div'); el.className='playerMarker';
      playerMarker=new maplibregl.Marker({element:el}).setLngLat(lastPosition).addTo(map);
    } else playerMarker.setLngLat(lastPosition);
  }

  function updatePositionUI(){
    if(!state.started || state.completed) return;
    const r=RELICS[state.current]; if(!r) return;
    const d=state.preview?0:distanceMeters(lastPosition,r.coords);
    if($('distanceLabel')) $('distanceLabel').textContent=d===Infinity?'GPS':d<1000?Math.round(d)+' m':(d/1000).toFixed(1)+' km';
    if($('enterSearch')) $('enterSearch').disabled=!(state.preview||d<=35);
    if(d<=35 && !state.preview) vibrate(35);
  }

  function updateHud(){
    if(!state.started||state.completed)return;
    const r=RELICS[state.current]||RELICS[0];
    if($('hudProgressLabel')) $('hudProgressLabel').textContent='RELIC '+(state.current+1)+' OF '+RELICS.length;
    if($('hudProgressBar')) $('hudProgressBar').style.width=((state.current)/RELICS.length*100+5)+'%';
    if($('objectiveTitle')) $('objectiveTitle').textContent=r.name;
    if($('objectiveClue')) $('objectiveClue').textContent=r.clue;
    if($('objectiveEyebrow')) $('objectiveEyebrow').textContent=state.current===0?'FIRST MARK':'NEXT MARK';
    if($('testAdvance')) $('testAdvance').classList.toggle('hidden',!state.preview);
    updatePositionUI();
  }

  function startAdventure(preview=false){
    state.started=true; state.completed=false; state.current=0; state.preview=preview||state.preview; state.runXp=0; state.runCoins=0;
    saveState();
    closeSheet('adventureSheet'); closeSheet('confirmOverlay');
    openAdventureMode();
  }

  function openAdventureMode(){
    setHidden('adventureMode',false);
    ensureAdventureMap();
    updateHud();
    startLocationWatch();
    const r=RELICS[state.current];
    if(adventureMap && r) setTimeout(()=>adventureMap.easeTo({center:r.coords,zoom:15.9,duration:900}),150);
  }

  function openSearch(){
    const r=RELICS[state.current]; if(!r)return;
    if(!state.preview && lastPosition && distanceMeters(lastPosition,r.coords)>50){showToast('Get closer to the search area first');return;}
    if($('searchProgress')) $('searchProgress').textContent=(state.current+1)+' / '+RELICS.length;
    if($('searchRelic')) $('searchRelic').innerHTML=medallionSVG(r.glyph,true,true);
    if($('searchClue')) $('searchClue').textContent=r.search;
    setHidden('searchMode',false);
    vibrate([30,45,30]);
  }

  function parseRelicFromUrl(){
    const params=new URLSearchParams(location.search);
    let id=params.get('relic');
    const m=location.pathname.match(/(?:relic\/)?(BIDFORD-\d{2})/i);
    if(!id && m) id=m[1].toUpperCase();
    if(id && RELICS.some(r=>r.id===id)) return id;
    return null;
  }

  function processIncomingRelic(id){
    const idx=RELICS.findIndex(r=>r.id===id);
    if(idx<0)return;
    if(!state.started){
      showToast('Start the Bidford adventure before recovering relics');
      switchScreen('adventures');
      return;
    }
    if(state.found.includes(id)){ showToast('You already recovered this relic'); return; }
    if(idx!==state.current){ showToast('A different relic is calling first'); return; }
    if(!state.preview && lastPosition && distanceMeters(lastPosition,RELICS[idx].coords)>120){
      showToast('Relic recognised · but you are too far from its location');
      return;
    }
    recoverCurrent();
  }

  function recoverCurrent(){
    const r=RELICS[state.current]; if(!r)return;
    if(state.found.includes(r.id)){showToast('Already recovered');return;}
    state.found.push(r.id);
    state.xp+=r.xp; state.coins+=r.coins; state.runXp+=r.xp; state.runCoins+=r.coins;
    if(r.gear && !state.earnedGear.includes(r.gear)) state.earnedGear.push(r.gear);
    if($('rewardRelic')) $('rewardRelic').innerHTML=medallionSVG(r.glyph,true,true);
    if($('rewardName')) $('rewardName').textContent=r.name;
    if($('rewardXp')) $('rewardXp').textContent='+'+r.xp+' XP';
    if($('rewardCoins')) $('rewardCoins').textContent='+'+r.coins+' GOLD';
    if($('itemUnlock')){
      $('itemUnlock').classList.toggle('hidden',!r.gear);
      if(r.gear && $('itemUnlockName')) $('itemUnlockName').textContent=r.gear;
    }
    createParticles();
    setHidden('searchMode',true); setHidden('rewardOverlay',false);
    vibrate([60,40,100]);
    saveState();
  }

  function createParticles(){
    const box=$('rewardParticles'); if(!box)return;
    box.innerHTML='';
    for(let i=0;i<28;i++){
      const p=document.createElement('i'); p.className='particle';
      p.style.left=(45+Math.random()*10)+'%'; p.style.top=(42+Math.random()*12)+'%';
      p.style.setProperty('--dx',((Math.random()-.5)*340)+'px');
      p.style.setProperty('--dy',((Math.random()-.5)*500)+'px');
      p.style.animationDelay=(Math.random()*.18)+'s';
      box.appendChild(p);
    }
  }

  function continueReward(){
    setHidden('rewardOverlay',true);
    if(state.current>=RELICS.length-1){
      state.completed=true; state.started=false; state.adventuresCompleted=Math.max(1,state.adventuresCompleted+1);
      saveState();
      if($('completionSeal')) $('completionSeal').innerHTML=medallionSVG('crown',true,true);
      if($('completionXp')) $('completionXp').textContent=state.runXp;
      if($('completionCoins')) $('completionCoins').textContent=state.runCoins;
      setHidden('completionOverlay',false);
      return;
    }
    state.current++;
    saveState();
    updateHud();
    const r=RELICS[state.current];
    if(adventureMap) adventureMap.easeTo({center:r.coords,zoom:15.9,duration:1000});
  }

  function finishAdventure(){
    setHidden('completionOverlay',true); setHidden('adventureMode',true);
    switchScreen('collection');
  }

  function openIntro(force=false){
    if(!force && localStorage.getItem(INTRO_KEY)==='done') return;
    introIndex=0; renderIntro();
    setHidden('introOverlay',false);
  }

  function renderIntro(){
    $$('.introSlide').forEach((s,i)=>s.classList.toggle('active',i===introIndex));
    if($('introDots')) $('introDots').innerHTML=[0,1,2,3].map(i=>'<i class="'+(i===introIndex?'active':'')+'"></i>').join('');
    if($('introNext')) $('introNext').innerHTML=introIndex===3?'ENTER THE WORLD <span>→</span>':'NEXT <span>→</span>';
  }

  function nextIntro(){
    if(introIndex<3){introIndex++;renderIntro();return;}
    localStorage.setItem(INTRO_KEY,'done');
    setHidden('introOverlay',true);
    startTour();
  }

  const tourSteps=[
    {sel:'[data-nav="explore"]',title:'Explore',text:'Find adventures near you.'},
    {sel:'[data-nav="adventures"]',title:'Adventures',text:'Continue journeys already underway.'},
    {sel:'[data-nav="collection"]',title:'Collection',text:'Every relic you recover lives here.'},
    {sel:'[data-nav="home"]',title:'Home',text:'Your dog, level and trail gear.'}
  ];

  function startTour(){
    tourIndex=0; setHidden('tourOverlay',false); showTourStep();
  }
  function showTourStep(){
    $$('.tourTarget').forEach(e=>e.classList.remove('tourTarget'));
    if(tourIndex>=tourSteps.length){setHidden('tourOverlay',true);return;}
    const step=tourSteps[tourIndex], el=document.querySelector(step.sel), call=document.querySelector('.tourCallout');
    if(!el||!call){tourIndex++;showTourStep();return;}
    el.classList.add('tourTarget');
    $('tourTitle').textContent=step.title; $('tourText').textContent=step.text;
    const r=el.getBoundingClientRect();
    call.style.left=Math.max(12,Math.min(innerWidth-222,r.left+r.width/2-105))+'px';
    call.style.top=Math.max(90,r.top-112)+'px';
  }

  function nextTour(){ tourIndex++; showTourStep(); }

  function renameDog(){
    const next=prompt('Trail companion name',state.dogName);
    if(next && next.trim()){state.dogName=next.trim().slice(0,18);saveState();}
  }

  function cycleGear(){
    const unlocked=gear.filter(g=>state.earnedGear.includes(g.name));
    let idx=unlocked.findIndex(g=>g.name===state.equipped);
    state.equipped=unlocked[(idx+1)%unlocked.length].name;
    saveState(); showToast(state.equipped+' equipped');
  }

  function resetProgress(){
    if(!confirm('Reset all Relic progress and rewards?')) return;
    const preview=state.preview, dogName=state.dogName;
    state={...defaultState(),preview,dogName};
    saveState(); showToast('Progress reset');
  }

  function bind(){
    $$('.navButton').forEach(b=>b.addEventListener('click',()=>switchScreen(b.dataset.nav)));
    $$('[data-close]').forEach(b=>b.addEventListener('click',()=>closeSheet(b.dataset.close)));
    $('openAdventure')?.addEventListener('click',()=>openSheet('adventureSheet'));
    $('startAdventure')?.addEventListener('click',()=>{
      if(state.preview) startAdventure(true);
      else if(lastPosition && distanceMeters(lastPosition,CENTER)<2500) startAdventure(false);
      else openSheet('confirmOverlay');
    });
    $('previewAdventure')?.addEventListener('click',()=>startAdventure(true));
    $('confirmPreview')?.addEventListener('click',()=>startAdventure(true));
    $('cancelPreview')?.addEventListener('click',()=>closeSheet('confirmOverlay'));
    $('enterSearch')?.addEventListener('click',openSearch);
    $('testAdvance')?.addEventListener('click',openSearch);
    $('exitSearch')?.addEventListener('click',()=>setHidden('searchMode',true));
    $('simulateScan')?.addEventListener('click',recoverCurrent);
    $('hintButton')?.addEventListener('click',()=>{
      const r=RELICS[state.current]; if(r&&$('hintText'))$('hintText').textContent=r.hint;
      openSheet('hintOverlay');
    });
    $('continueReward')?.addEventListener('click',continueReward);
    $('finishAdventure')?.addEventListener('click',finishAdventure);
    $('leaveAdventure')?.addEventListener('click',()=>setHidden('adventureMode',true));
    $('adventureMenu')?.addEventListener('click',()=>showToast(state.preview?'Preview mode is active':'GPS adventure mode'));
    $('previewToggle')?.addEventListener('change',e=>{state.preview=e.target.checked;saveState();showToast(state.preview?'Preview mode on':'GPS mode on');});
    $('resetIntro')?.addEventListener('click',()=>openIntro(true));
    $('resetProgress')?.addEventListener('click',resetProgress);
    $('renameDog')?.addEventListener('click',renameDog);
    $('cycleGear')?.addEventListener('click',cycleGear);
    $('introNext')?.addEventListener('click',nextIntro);
    $('tourNext')?.addEventListener('click',nextTour);
    $('locateButton')?.addEventListener('click',()=>{
      startLocationWatch();
      if(lastPosition&&exploreMap) exploreMap.easeTo({center:lastPosition,zoom:15.5,duration:700});
      else showToast('Finding your location…');
    });
    $('adventureLocate')?.addEventListener('click',()=>{
      startLocationWatch();
      if(lastPosition&&adventureMap) adventureMap.easeTo({center:lastPosition,zoom:16,duration:700});
    });
  }

  function registerServiceWorker(){
    if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(()=>{});
  }

  function boot(){
    if($('splashRelic')) $('splashRelic').innerHTML=medallionSVG('crown',true,true);
    if($('sheetRelic')) $('sheetRelic').innerHTML=medallionSVG('crown',true,true);
    if($('introGlyphOne')) $('introGlyphOne').innerHTML=medallionSVG('crown',true,true);
    if($('introTapRelic')) $('introTapRelic').innerHTML=medallionSVG('bridge',true,true);
    renderDog();
    bind();
    renderAll();
    initMaps();
    startLocationWatch();
    registerServiceWorker();

    setTimeout(()=>{$('splash')?.classList.add('hide');setTimeout(()=>setHidden('splash',true),600);},1250);
    setTimeout(()=>openIntro(false),1500);

    const incoming=parseRelicFromUrl();
    if(incoming) setTimeout(()=>processIncomingRelic(incoming),1900);

    document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible') updatePositionUI(); });
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot);
  else boot();
})();