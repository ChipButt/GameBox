(() => {
  'use strict';

  const STORAGE_KEY = 'gamebox_relic_v1';
  const BIDFORD_CENTRE = { lat: 52.1635, lng: -1.8587 };
  const PREVIEW_START = { lat: 52.16302, lng: -1.85755 };
  const SEARCH_RADIUS = 58;

  const relics = [
    { id:'BID-01', name:"Bridgekeeper's Seal", short:'Bridgekeeper', lat:52.16362, lng:-1.85695, clue:'Follow the river towards the old stone bridge.', search:'Search near the meadow-side approach.', hint:'Look lower than eye level, close to the path edge.', xp:120, coins:42, material:'brass', sigil:'bridge' },
    { id:'BID-02', name:'Riverstone Mark', short:'Riverstone', lat:52.16296, lng:-1.85773, clue:'Stay with the Avon and follow the water west.', search:'Search where the river path opens into meadow.', hint:'The mark would rather face water than road.', xp:105, coins:38, material:'slate', sigil:'wave', gear:'Riverwalker Bandana' },
    { id:'BID-03', name:'Willow Sigil', short:'Willow', lat:52.16252, lng:-1.85882, clue:'Cross the open meadow towards the older trees.', search:'Search around the tree-line, not deep in it.', hint:'Think bark, shade and somewhere a dog might sniff.', xp:110, coins:39, material:'moss', sigil:'leaf' },
    { id:'BID-04', name:'Meadow Compass', short:'Compass', lat:52.16192, lng:-1.85976, clue:'Head deeper into Big Meadow.', search:'Search where paths and open ground meet.', hint:'A wayfinder belongs where choices split.', xp:115, coins:41, material:'iron', sigil:'compass' },
    { id:'BID-05', name:"Wayfarer's Coin", short:'Wayfarer', lat:52.16162, lng:-1.86082, clue:'Keep west across the meadow edge.', search:'Search for the old-trail mark near the boundary.', hint:'Check sturdy things that already guide a route.', xp:125, coins:45, material:'copper', sigil:'path', gear:'Field Scout Collar' },
    { id:'BID-06', name:'Avon Crest', short:'Avon Crest', lat:52.16218, lng:-1.86135, clue:'Turn back towards the river and follow its curve.', search:'Search close to the riverside path.', hint:'The crest sits where the Avon is easiest to hear.', xp:130, coins:47, material:'blue', sigil:'crest' },
    { id:'BID-07', name:'Old Mill Fragment', short:'Mill Fragment', lat:52.16301, lng:-1.86044, clue:'Head north-east across the upper meadow.', search:'Search around the edge of the recreation ground.', hint:'Look for something solid, not something living.', xp:135, coins:49, material:'stone', sigil:'mill' },
    { id:'BID-08', name:'Moon Hound Mark', short:'Moon Hound', lat:52.16355, lng:-1.85935, clue:'Follow the path back towards the village lights.', search:'Search near the route back towards the bridge.', hint:'A night mark hides best below the obvious sightline.', xp:150, coins:56, material:'night', sigil:'hound', gear:'Moon Hound Tag' },
    { id:'BID-09', name:'Saxon Way Seal', short:'Saxon Way', lat:52.16420, lng:-1.85772, clue:'Cross towards the village side of the Avon.', search:'Search near the old route into the village.', hint:'Stay on the public route and inspect only the clue area.', xp:155, coins:59, material:'gold', sigil:'knot' },
    { id:'BID-10', name:'Bidford Heart Relic', short:'Bidford Heart', lat:52.16461, lng:-1.85634, clue:'One final mark waits close to the heart of Bidford.', search:'Search the final area near the village centre.', hint:'The last relic carries the river and bridge together.', xp:220, coins:85, material:'final', sigil:'heart', gear:'Bidford Explorer Harness' }
  ];

  const routeCoords = [
    [PREVIEW_START.lng,PREVIEW_START.lat],
    ...relics.map(r => [r.lng,r.lat])
  ];

  const initialState = {
    seenIntro:false,
    seenTour:false,
    previewMode:false,
    adventureActive:false,
    currentIndex:0,
    discovered:[],
    xp:0,
    coins:0,
    dogName:'Scout',
    unlockedGear:['Plain Trail Collar'],
    equippedGear:'Plain Trail Collar',
    completedAdventures:0,
    completed:false
  };

  let state = loadState();
  let exploreMap = null, adventureMap = null;
  let exploreMarkers = [], adventureMarkers = [];
  let playerMarker = null;
  let watchId = null;
  let currentPosition = null;
  let previewPosition = PREVIEW_START;
  let previewArrived = false;
  let introIndex = 0;
  let tourIndex = 0;
  let pendingScan = new URLSearchParams(location.search).get('relic');

  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => [...root.querySelectorAll(sel)];

  function loadState(){
    try { return { ...initialState, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') }; }
    catch { return { ...initialState }; }
  }
  function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  function levelFromXp(xp){ return Math.max(1, Math.floor(xp / 500) + 1); }
  function clamp(n,a,b){ return Math.max(a,Math.min(b,n)); }
  function haptic(pattern=35){ if(navigator.vibrate) navigator.vibrate(pattern); }
  function tone(freq=420,duration=.08,type='sine',gain=.035){
    try{
      const C = window.AudioContext || window.webkitAudioContext; if(!C) return;
      const ctx = new C(); const osc=ctx.createOscillator(); const g=ctx.createGain();
      osc.type=type; osc.frequency.value=freq; g.gain.value=gain; osc.connect(g); g.connect(ctx.destination); osc.start();
      g.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+duration); osc.stop(ctx.currentTime+duration+.02);
    }catch{}
  }
  function rewardSound(){ tone(220,.09,'triangle',.05); setTimeout(()=>tone(440,.11,'triangle',.04),90); setTimeout(()=>tone(660,.16,'sine',.035),190); }
  function tapSound(){ tone(155,.06,'triangle',.04); }
  function toast(msg){ const el=$('#toast'); el.textContent=msg; el.classList.add('show'); clearTimeout(el._t); el._t=setTimeout(()=>el.classList.remove('show'),1700); }
  function meters(a,b){
    if(!a||!b) return Infinity;
    const R=6371000,toRad=x=>x*Math.PI/180,dLat=toRad(b.lat-a.lat),dLng=toRad(b.lng-a.lng),la1=toRad(a.lat),la2=toRad(b.lat);
    const h=Math.sin(dLat/2)**2+Math.cos(la1)*Math.cos(la2)*Math.sin(dLng/2)**2;
    return 2*R*Math.asin(Math.sqrt(h));
  }
  function formatDistance(m){ if(!isFinite(m)) return 'LOCATE'; if(m<1000) return `${Math.max(0,Math.round(m/5)*5)} m`; return `${(m/1609.34).toFixed(1)} mi`; }

  function materialFor(name){
    return {
      brass:['#d7b66a','#765323','#f3db92'], slate:['#59656a','#242d31','#a5b0b3'], moss:['#748060','#2d3c31','#b0b98c'], iron:['#6e7771','#29312e','#b8bdb7'], copper:['#b26e4a','#5f3529','#e0a079'], blue:['#477d82','#1d4145','#9bc2bf'], stone:['#aaa18d','#595449','#d9d1be'], night:['#26324a','#101725','#8a9cc6'], gold:['#c99a45','#62471f','#f0cd7b'], final:['#d7a54d','#5c4320','#ffe1a0']
    }[name] || ['#aaa18d','#595449','#d9d1be'];
  }

  function sigilMarkup(type, light){
    const s = light;
    const common=`fill="none" stroke="${s}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"`;
    const map={
      bridge:`<path ${common} d="M42 91h116M51 90c3-35 18-51 34-51s31 16 34 51M119 90c3-29 15-42 28-42s25 13 28 42M61 105h98"/><path ${common} d="M50 107c22 12 36-9 55 0s32 11 50 0"/>`,
      wave:`<path ${common} d="M38 73c19-17 37-17 56 0s37 17 56 0 37-17 52 0M38 99c19-17 37-17 56 0s37 17 56 0 37-17 52 0M64 49c12 4 23-1 34-13"/>`,
      leaf:`<path ${common} d="M102 133c-10-43 7-77 53-92 3 45-13 75-53 92ZM104 130c8-35 23-55 47-77M101 132c-13-26-31-39-54-42 2 27 17 45 46 50"/>`,
      compass:`<circle ${common} cx="100" cy="90" r="52"/><path ${common} d="M100 28v124M38 90h124M100 45l16 45-16 45-16-45Z"/>`,
      path:`<path ${common} d="M50 134c31-14 33-38 18-53s-5-44 32-54M92 136c36-16 44-39 26-55s-10-39 31-52"/><circle cx="49" cy="134" r="7" fill="${s}"/><circle cx="149" cy="29" r="7" fill="${s}"/>`,
      crest:`<path ${common} d="M100 30 151 49v41c0 31-20 50-51 66-31-16-51-35-51-66V49Z"/><path ${common} d="M65 86c16-16 31-16 46 0s29 16 44 0M70 108c13-12 25-12 38 0s25 12 39 0"/>`,
      mill:`<circle ${common} cx="100" cy="90" r="22"/><path ${common} d="M100 68V28M122 90h40M100 112v40M78 90H38M84 74 59 48M116 74l25-26M116 106l25 26M84 106l-25 26"/>`,
      hound:`<path ${common} d="M70 119c-19-13-22-36-12-58l19 14c13-12 34-12 47 0l19-14c10 22 7 45-12 58-18 13-43 13-61 0Z"/><path ${common} d="M80 99c12 8 28 8 40 0M86 88h1M113 88h1"/><path ${common} d="M50 45c18-17 45-24 70-16-25 3-41 18-48 38"/>`,
      knot:`<path ${common} d="M100 32c29 0 50 18 50 42 0 21-16 33-31 44l-19 15-19-15c-15-11-31-23-31-44 0-24 21-42 50-42Z"/><path ${common} d="M72 65c18 1 38 18 56 51M128 65c-18 1-38 18-56 51M63 92h74"/>`,
      heart:`<path ${common} d="M100 143c-31-24-58-44-58-76 0-22 17-36 36-36 12 0 21 6 28 17 7-11 16-17 28-17 19 0 36 14 36 36 0 32-27 52-70 76Z"/><path ${common} d="M66 82c14-11 28-11 42 0s28 11 42 0M100 52v63"/>`
    };
    return map[type] || map.compass;
  }

  function relicSVG(relic, opts={}){
    const [base,dark,light]=materialFor(relic.material), discovered=opts.discovered!==false;
    const dull = discovered ? '' : 'opacity=".58"';
    return `<svg viewBox="0 0 200 180" role="img" aria-label="${relic.name}" ${dull}>
      <defs><radialGradient id="g${relic.id}" cx="35%" cy="25%"><stop offset="0" stop-color="${light}"/><stop offset=".55" stop-color="${base}"/><stop offset="1" stop-color="${dark}"/></radialGradient><filter id="n${relic.id}"><feTurbulence baseFrequency=".9" numOctaves="2" seed="4" type="fractalNoise" result="n"/><feBlend in="SourceGraphic" in2="n" mode="soft-light"/></filter></defs>
      <ellipse cx="100" cy="159" rx="63" ry="10" fill="rgba(0,0,0,.16)"/>
      <circle cx="100" cy="90" r="75" fill="${dark}" stroke="#241d15" stroke-width="4"/>
      <circle cx="100" cy="90" r="68" fill="url(#g${relic.id})" stroke="${light}" stroke-opacity=".65" stroke-width="2" filter="url(#n${relic.id})"/>
      <circle cx="100" cy="90" r="58" fill="none" stroke="${dark}" stroke-opacity=".55" stroke-width="3" stroke-dasharray="2 8"/>
      ${sigilMarkup(relic.sigil, dark)}
      <path d="M48 136c26 12 81 12 104 0" fill="none" stroke="${light}" stroke-opacity=".32" stroke-width="2"/>
    </svg>`;
  }

  function dogSVG(compact=false){
    return `<svg viewBox="0 0 210 230" aria-label="Trail companion dog">
      <defs><linearGradient id="dogCoat" x1="0" x2="1"><stop stop-color="#9a6541"/><stop offset=".5" stop-color="#b67b52"/><stop offset="1" stop-color="#815336"/></linearGradient><linearGradient id="dogChest" y2="1"><stop stop-color="#ead8bd"/><stop offset="1" stop-color="#d0b999"/></linearGradient></defs>
      <ellipse cx="106" cy="213" rx="68" ry="12" fill="rgba(0,0,0,.18)"/>
      <g class="tail"><path d="M144 145c27-4 40-23 35-40 16 19 5 54-29 62" fill="url(#dogCoat)" stroke="#503724" stroke-width="4" stroke-linecap="round"/></g>
      <path d="M62 126c4-31 25-48 47-48 26 0 45 20 47 53l4 63H55Z" fill="url(#dogCoat)" stroke="#503724" stroke-width="4"/>
      <path d="M76 142c11 22 17 40 12 64H61c-4-26 1-46 15-64ZM139 143c-11 22-14 40-9 63h27c4-25-2-45-18-63Z" fill="#8d5c3d" stroke="#503724" stroke-width="4"/>
      <path d="M88 128c5 13 10 26 19 34 9-8 15-21 19-34-10 6-28 6-38 0Z" fill="url(#dogChest)"/>
      <ellipse cx="107" cy="76" rx="49" ry="47" fill="url(#dogCoat)" stroke="#503724" stroke-width="4"/>
      <g class="earL"><path d="M72 47C57 43 45 52 44 76c0 19 10 31 22 26 9-4 11-19 11-31" fill="#6d472f" stroke="#503724" stroke-width="4"/></g>
      <path d="M141 48c15-4 27 6 27 29 0 19-10 30-22 25-9-4-11-19-10-31" fill="#6d472f" stroke="#503724" stroke-width="4"/>
      <ellippse cx="107" cy="92" rx="29" ry="25" fill="#d9c0a0"/>
      <circle cx="88" cy="70" r="5" fill="#171b18"/><circle cx="127" cy="70" r="5" fill="#171b18"/><circle cx="89" cy="68" r="1.6" fill="#fff"/><circle cx="128" cy="68" r="1.6" fill="#fff"/>
      <path d="M100 88c4-5 11-5 15 0-1 7-13 7-15 0Z" fill="#25201c"/><path d="M107 94c0 8-6 11-13 12M107 94c0 8 6 11 13 12" fill="none" stroke="#5e4636" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M75 119c18 10 46 11 65 0" fill="none" stroke="#263a31" stroke-width="9"/><circle cx="108" cy="123" r="10" fill="#b98a43" stroke="#4c351a" stroke-width="3"/><path d="M104 121h8M108 117v8" stroke="#5d411d" stroke-width="2"/>
      <path d="M84 198c-11 1-17 7-16 13h26c1-6-2-11-10-13ZM143 198c11 1 17 7 16 13h-26c-1-6 2-11 10-13Z" fill="#5a3d2a"/>
    </svg>`;
  }

  function routeFeature(){ return { type:'Feature', geometry:{type:'LineString',coordinates:routeCoords} }; }
  function searchAreaFeature(relic){ return {type:'Feature',properties:{},geometry:{type:'Point',coordinates:[relic.lng,relic.lat]}}; }

  function initMap(container, adventure=falsi{
    if(!window.maplibregl){ $(container).style.background='linear-gradient(145deg,#aeb9a4,#c9bea5)'; return null; }
    const map = new maplibregl.Map({ container:container.replace('#',''), style:'https://tiles.openfreemap.org/styles/liberty', center:[-1.8591,52.1630], zoom:15.2, attributionControl:true, dragRotate:false, pitchWithRotate:false });
    map.on('load',()=>{
      map.addSource('route',{type:'geojson',data:routeFeature()});
      map.addLayer({id:'route-shadow',type:'line',source:'route',paint:{'line-color':'#17231d','line-width':7,'line-opacity':.24}});
      map.addLayer({id:'route',type:'line',source:'route',paint:{'line-color':'#b98a43','line-width':4,'line-opacity':.95,'line-dasharray':[1.1,.7]}});
      if(adventure){ updateAdventureMap(); }
      else addExploreMarkers(map);
    });
    return map;
  }

  function addExploreMarkers(map){
    exploreMarkers.forEach(m=>m.remove()); exploreMarkers=[];
    [0,3,6,9].forEach((idx,i)=>{
      const r=relics[idx], el=document.createElement('div'); el.className='mysteryMarker'; el.textContent=i===0?'◇':'?';
      const m=new maplibregl.Marker({element:el}).setLngLat([r.lng,r.lat]).addTo(map); exploreMarkers.push(m);
    });
  }

  function ensurePlayerMarker(map,pos){
    if(!map||!pos||!window.maplibregl) return;
    if(!playerMarker){ const el=document.createElement('div'); el.className='playerMarker'; playerMarker=new maplibregl.Marker({element:el}).setLngLat([pos.lng,pos.lat]).addTo(map); }
    else { playerMarker.setLngLat([pos.lng,pos.lat]); }
  }

  function circleGeoJSON(center,radiusM){
    const pts=64, coords=[]; const latRad=center.lat*Math.PI/180;
    for(let i=0;i<=pts;i++){
      const a=2*Math.PI*i/pts, dx=Math.cos(a)*radiusM, dy=Math.sin(a)*radiusM;
      coords.push([center.lng+dx/(111320*Math.cos(latRad)),center.lat+dy/110540]);
    }
    return {type:'Feature',geometry:{type:'Polygon',coordinates:[coords]}};
  }

  function updateAdventureMap(){
    if(!adventureMap||!adventureMap.loaded()) return;
    const r=relics[state.currentIndex] || relics[relics.length-1];
    const data=circleGeoJSON(r,SEARCH_RADIUS);
    if(adventureMap.getSource('search-zone')) adventureMap.getSource('search-zone').setData(data);
    else {
      adventureMap.addSource('search-zone',{type:'geojson',data});
      adventureMap.addLayer({id:'search-zone-fill',type:'fill',source:'search-zone',paint:{'fill-color':'#356b70','fill-opacity':.16}});
      adventureMap.addLayer({id:'search-zone-line',type:'line',source:'search-zone',paint:{'line-color':'#356b70','line-width':2,'line-dasharray':[2,2]}});
    }
    adventureMarkers.forEach(m=>m.remove()); adventureMarkers=[];
    if(window.maplibregl){ const el=document.createElement('div');el.className='mysteryMarker current';el.textContent='◇'; adventureMarkers.push(new maplibregl.Marker({element:el}).setLngLat([r.lng,r.lat]).addTo(adventureMap)); }
    const pos = state.previewMode ? previewPosition : currentPosition;
    ensurePlayerMarker(adventureMap,pos);
  }

  function fitWholeRoute(map){ if(!map||!window.maplibregl)return; const b=new maplibregl.LngLatBounds();routeCoords.forEach(c=>b.extend(c));map.fitBounds(b,{padding:{top:60,bottom:100,left:35,right:35},duration:700}); }

  function showScreen(name){
    $$('.screen').forEach(s=>s.classList.toggle('active',s.dataset.screen===name));
    $$('.navButton').forEach(b=>b.classList.toggle('active',b.dataset.nav===name));
    if(name==='explore'&&exploreMap) setTimeout(()=>exploreMap.resize(),50);
    renderAll();
  }

  function renderAll(){
    const level=levelFromXp(state.xp);
    $('#levelLabel').textContent=`LV ${level}`; $('#coinLabel').textContent=state.coins;
    $('#homeLevel').textContent=level; $('#homeRelics').textContent=state.discovered.length; $('#homeAdventures').textContent=state.completedAdventures;
    $('#collectionFound').textContent=state.discovered.length; $('#dogName').textContent=state.dogName; $('#equippedName').textContent=state.equippedGear;
    $('#collectionBadge').textContent=state.discovered.length; $('#collectionBadge').classList.toggle('hidden',state.discovered.length===0);
    $('#dogStage').innerHTML=dogSVG();
    renderCollection(); renderAdventures();
    $('#previewToggle').checked=state.previewMode;
  }

  function renderCollection(){
    const grid=$('#relicGrid'); if(!grid)return; grid.innerHTML='';
    relics.forEach((r,i)=>{
      const found=state.discovered.includes(r.id), d=document.createElement('div'); d.className=`relicSlot ${found?'':'locked'}`;
      d.innerHTML=`<div class="slotMedallion">${relicSVG(r,{discovered:found})}</div><strong>${found?r.short:'Unknown mark'}</strong><small>${found?`Relic ${String(i+1).padStart(2,'0')}`:'undiscovered'}</small>`;
      grid.appendChild(d);
    });
  }

  function renderAdventures(){
    const p=$('#activeAdventurePanel');
    const found=state.discovered.length, pct=state.completed?100:(found/relics.length*100);
    if(state.completed){
      $('#adventuresLead').textContent='Your first Bidford folio is complete.';
      p.innerHTML=`<article class="journeyCard"><span class="eyebrow">COMPLETED</span><h2>The Lost Relics of Bidford</h2><div class="journeyProgress"><div><i style="width:100%"></i></div><b>10 / 10</b></div><button class="primaryButton" data-open-collection>OPEN FIELD FOLIO <span>→</span></button></article>`;
    } else if(state.adventureActive || found>0){
      $('#adventuresLead').textContent='Your Bidford trail is in progress.';
      p.innerHTML=`<article class="journeyCard"><span class="eyebrow">ACTIVE · BIDFORD</span><h2>The Lost Relics of Bidford</h2><div class="journeyProgress"><div><i style="width:${pct}%"></i></div><b>${found} / 10</b></div><button class="primaryButton" data-continue-adventure>CONTINUE ADVENTURE <span>→</span></button></article>`;
    } else {
      $('#adventuresLead').textContent='One trail is waiting by the Avon.';
      p.innerHTML=`<article class="journeyCard"><span class="eyebrow">READY TO BEGIN</span><h2>The Lost Relics of Bidford</h2><div class="journeyProgress"><div><i style="width:0%"></i></div><b>0 / 10</b></div><button class="primaryButton" data-open-adventure>VIEW ADVENTURE <span>→</span></button></article>`;
    }
    $$('[data-open-collection]',p).forEach(b=>b.onclick=()=>showScreen('collection'));
    $$('[data-continue-adventure]',p).forEach(b=>b.onclick=()=>enterAdventureMode());
    $$('[data-open-adventure]',p).forEach(b=>b.onclick=()=>openOverlay('adventureSheet'));
  }

  function openOverlay(id){ $('#'+id).classList.remove('hidden'); }
  function closeOverlay(id){ $('#'+id).classList.add('hidden'); }

  function openAdventureSheet(){
    $('#sheetRelic').innerHTML=relicSVG(relics[9]);
    openOverlay('adventureSheet');
  }

  function startRequested(forcePreview=false){
    if(forcePreview){ state.previewMode=true; saveState(); beginAdventure(); return; }
    if(state.previewMode){ beginAdventure(); return; }
    if(!navigator.geolocation){ state.previewMode=true;saveState();beginAdventure();return; }
    navigator.geolocation.getCurrentPosition(pos=>{
      currentPosition={lat:pos.coords.latitude,lng:pos.coords.longitude};
      if(meters(currentPosition,BIDFORD_CENTRE)>10000) openOverlay('confirmOverlay'); else beginAdventure();
    },()=>openOverlay('confirmOverlay'),{enableHighAccuracy:true,timeout:6000});
  }

  function beginAdventure(){
    closeOverlay('adventureSheet');closeOverlay('confirmOverlay');
    if(!state.adventureActive&&!state.completed){ state.adventureActive=true; if(state.discovered.length===0)istate.currentIndex=0; }
    if(state.completed){ state.adventureActive=true; state.completed=false; state.currentIndex=0; state.discovered=[]; }
    previewPosition=PREVIEW_START; previewArrived=false; saveState(); renderAll(); enterAdventureMode();
  }

  function enterAdventureMode(){
    $('#adventureMode').classList.remove('hidden');
    if(!adventureMap) iadventureMap=initMap('#adventureMap',true); else setTimeout(()=>adventureMap.resize(),40);
   updateAdventureHUD(); startTracking();
    setTimeout(()=>{ if(adventureMap){adventureMap.resize(); fitWholeRoute(adventureMap);} },350);
  }

  function leaveAdventureMode(){ $('#adventureMode').classList.add('hidden'); stopTracking(); showScreen('adventures'); }

  function startTracking(){
    stopTracking();
    if(state.previewMode){ currentPosition=null; updateDistance(); return; }
    if(!navigator.geolocation){ toast('Location unavailable'); return; }
    watchId=navigator.geolocation.watchPosition(pos=>{
      currentPosition={lat:pos.coords.latitude,lng:pos.coords.longitude}; updateDistance(); updateAdventureMap();
    },()=>toast('Location access is needed for live play.'),{enableHighAccuracy:true,maximumAge:3000,timeout:12000});
  }
  function stopTracking(){ if(watchId!==null&&navigator.geolocation){navigator.geolocation.clearWatch(watchId);watchId=null;} }

  function updateAdventureHUD(){
    const r=relics[state.currentIndex]; if(!r){showCompletion();return;}
    $('#hudProgressLabel').textContent=`RELIC ${state.currentIndex+1} OF ${relics.length}`;
    $('#hudProgressBar').style.width=`${((state.currentIndex)/relics.length)*100}%`;
    $('#objectiveTitle').textContent=r.name; $('#objectiveClue').textContent=r.clue; $('#objectiveEyebrow').textContent=state.currentIndex===relics.length-1?'FINAL MARK':'NEXT MARK';
    $('#testAdvance').classList.toggle('hidden',!state.previewMode);
    previewArrived=false; updateDistance(); updateAdventureMap();
  }

  function updateDistance(){
    const r=relics[state.currentIndex]; if(!r)return;
    const pos=state.previewMode?previewPosition:currentPosition, d=meters(pos,r);
    $('#distanceLabel').textContent=formatDistance(d);
    const inside=d<=SEARCH_RADIUS || previewArrived;
    $('#enterSearch').disabled=!inside;
    $('#enterSearch').innerHTML=inside?'BEGIN SEARCH <span>◇</span>':'SEARCH AREA <span>◇</span>';
    if(adventureMap&&pos){ ensurePlayerMarker(adventureMap,pos); }
  }

  function previewArrive(){
    const r=relics[state.currentIndex]; previewPosition={lat:r.lat+0.00008,lng:r.lng-0.00005}; previewArrived=true; updateDistance(); updateAdventureMap();
    if(adventureMap) adventureMap.easeTo({center:[r.lng,r.lat],zoom:17.2,duration:800}); haptic(25); tone(280,.08,'sine',.025);
  }

  function enterSearchMode(){
    if($('#enterSearch').disabled)return;
    const r=relics[state.currentIndex]; $('#searchProgress').textContent=`${state.currentIndex+1} / ${relics.length}`; $('#searchRelic').innerHTML=relicSVG(r); $('#searchClue').textContent=r.search;
    $('#searchMode').classList.remove('hidden'); haptic([18,35,18]); tone(210,.09,'triangle',.03);
  }
  function exitSearchMode(){ $('#searchMode').classList.add('hidden'); }

  function showHint(){ const r=relics[state.currentIndex];$('#hintText').textContent=r.hint;openOverlay('hintOverlay');haptic(15); }

  function scanRelic(id=null){
    const r=relics[state.currentIndex]; if(!r)return;
    const scanId=id||r.id;
    if(scanId!==r.id){ toast('That mark belongs to another discovery.'); haptic([40,50,40]); return; }
    if(!state.previewMode){
      const d=meters(currentPosition,r); if(d>SEARCH_RADIUS*1.8){toast('That relic is not close enough yet.');return;}
    }
    tapSound(); haptic([55,40,90]); exitSearchMode(); revealReward(r);
  }

  function revealReward(r){
    $('#rewardRelic').innerHTML=relicSVG(r); $('#rewardName').textContent=r.name; $('#rewardXp').textContent=`+${r.xp} XP`; $('#rewardCoins').textContent=`+${r.coins} GOLD`;
    $('#itemUnlock').classList.toggle('hidden',!r.gear); if(r.gear) $('#itemUnlockName').textContent=r.gear;
    const parts=$('#rewardParticles');parts.innerHTML='';for(let i=0;i<28;i++){const p=document.createElement('i');p.className='particle';p.style.left=`${50+(Math.random()-.5)*12}%`;p.style.top=`${44+(Math.random()-.5)*10}%`;p.style.setProperty('--dx',`${(Math.random()-.5)*420}px`);p.style.setProperty('--dy',`${(Math.random()-.5)*651}px`);p.style.animationDelay=`${Math.random()*.18}s`;parts.appendChild(p);}
    $('#rewardOverlay').classList.remove('hidden'); rewardSound();
    if(!state.discovered.includes(r.id)){
      state.discovered.push(r.id); state.xp+=r.xp; state.coins+=r.coins; if(r.gear&&!state.unlockedGear.includes(r.gear))state.unlockedGear.push(r.gear); saveState(); renderAll();
    }
  }

  function continueReward(){
    const wasLast=state.currentIndex>=relics.length-1; $('#rewardOverlay').classList.add('hidden');
    if(wasLast){ state.adventureActive=false;state.completed=true;state.completedAdventures=Math.max(1,state.completedAdventures);saveState();renderAll();showCompletion();return; }
    state.currentIndex++; saveState(); previewPosition=relics[state.currentIndex-1]?{lat:relics[state.currentIndex-1].lat,lng:relics[state.currentIndex-1].lng}:PREVIEW_START; updateAdventureHUD();
    if(adventureMap) adventureMap.easeTo({center:[relics[state.currentIndex].lng,relics[state.currentIndex].lat],zoom:15.7,duration:900});
  }

  function showCompletion(){
    const totalXp=relics.reduce((s,r)=>s+r.xp,0),totalCoins=relics.reduce((s,r)=>s+r.coins,0);
    $('#completionSeal').innerHTML=relicSVG(relics[9]);$('#completionXp').textContent=totalXp;$('#completionCoins').textContent=totalCoins;$('#completionOverlay').classList.remove('hidden');
    setTimeout(()=>{haptic([70,45,70,45,120]);rewardSound();},120);
  }

  function finishAdventure(){ $('#completionOverlay').classList.add('hidden');$('#adventureMode').classList.add('hidden');stopTracking();showScreen('collection'); }

  function initIntro(){
    $('#splashRelic').innerHTML=relicSVG(relics[9]); $('#introGlyphOne').innerHTML=relicSVG(relics[0]); $('#introTapRelic').innerHTML=relicSVG(relics[1]); $('#introDog').innerHTML=dogSVG(true);
    const dots=$('#introDots'); dots.innerHTML='';for(let i=0;i<4;i++){const d=document.createElement('i');if(i===0)d.classList.add('active');dots.appendChild(d);}
    setTimeout(()=>{
      $('#splash').classList.add('hide');
      setTimeout(()=>{ if(!state.seenIntro) $('#introOverlay').classList.remove('hidden'); else $('#splash').classList.add('hidden'); },420);
    },1150);
  }

  function nextIntro(){
    if(introIndex<3){ introIndex++; $$('.introSlide').forEach((s,i)=>s.classList.toggle('active',i===introIndex)); $$('#introDots i').forEach((d,i)=>d.classList.toggle('active',i===introIndex)); $('#introNext').innerHTML=introIndex===3?'ENTER RELIC <span>→</span>':'NEXT <span>→</span>'; haptic(16); }
    else { state.seenIntro=true;saveState();$('#introOverlay').classList.add('hidden');setTimeout(startTour,250); }
  }

  const tourSteps=[
    {nav:'explore',title:'Explore',text:'Find adventures and discovery zones near you.'},
    {nav:'adventures',title:'Adventures',text:'Continue a trail and see what is waiting next.'},
    {nav:'collection',title:'Collection',text:'Every recovered relic is kept in your field folio.'},
    {nav:'home',title:'Home',text:'Your companion, level and unlocked trail gear live here.'}
  ];
  function startTour(){ if(state.seenTour)return; tourIndex=0;$('#tourOverlay').classList.remove('hidden');positionTour(); }
  function positionTour(){
    $$('.navButton').forEach(b=>b.classList.remove('tourTarget')); const step=tourSteps[tourIndex],target=$(`.navButton[data-nav="${step.nav}"]`);target.classList.add('tourTarget');
    $('#tourTitle').textContent=step.title;$('#tourText').textContent=step.text; const rect=target.getBoundingClientRect(),call=$('.tourCallout');call.style.left=`${clamp(rect.left+rect.width/2-105,10,innerWidth-220)}px`;call.style.bottom=`${innerHeight-rect.top+16}px`;
    $('#tourNext').textContent=tourIndex===tourSteps.length-1?'DONE':'NEXT';
  }
  function nextTour(){
    const current=tourSteps[tourIndex];$(`.navButton[data-nav="${current.nav}"]`).classList.remove('tourTarget');
    if(tourIndex<tourSteps.length-1){tourIndex++;positionTour();haptic(12);} else {state.seenTour=true;saveState();$('#tourOverlay').classList.add('hidden');showScreen('explore');}
  }

  function beginRename(){
    const holder=$('#renameDog'),strong=$('#dogName'); if(holder.querySelector('input'))return;
    const input=document.createElement('input');input.value=state.dogName;input.maxLength=18;input.setAttribute('aria-label','Dog name');input.style.cssText='width:130px;background:rgba(244,238,226,.12);border:0;border-bottom:1px solid #efe7d7;color:#fff;font:700 28px Fraunces,serif;outline:0;padding:0';strong.replaceWith(input);input.focus();input.select();
    const finish=()=>{state.dogName=(input.value.trim()||'Scout');saveState();const s=document.createElement('strong');s.id='dogName';s.textContent=state.dogName;input.replaceWith(s);};input.addEventListener('blur',finish,{once:true});input.addEventListener('keydown',e=>{if(e.key==='Enter')input.blur();});
  }

  function cycleGear(){ const i=state.unlockedGear.indexOf(state.equippedGear);state.equippedGear=state.unlockedGear[(i+1)%state.unlockedGear.length];saveState();renderAll();haptic(16); }

  function handlePendingScan(){
    if(!pendingScan)return; const found=relics.find(r=>r.id===pendingScan); if(!found){pendingScan=null;return;}
    setTimeout(()=>{
      if(!state.adventureActive){toast('Start the Bidford adventure before scanning this mark.');return;}
      if(relics[state.currentIndex].id!==found.id){toast(`${found.short} is not your current mark.`);return;}
      scanRelic(found.id);
    },1500);
  }

  function wireEvents(){
    $$('.navButton').forEach(b=>b.addEventListener('click',()=>{tapSound();haptic(10);showScreen(b.dataset.nav);}));
    $('#openAdventure').onclick=openAdventureSheet; $('#startAdventure').onclick=()=>startRequested(false); $('#previewAdventure').onclick=()=>startRequested(true);
    $('#confirmPreview').onclick=()=>{state.previewMode=true;saveState();beginAdventure();}; $('#cancelPreview').onclick=()=>closeOverlay('confirmOverlay');
    $('#leaveAdventure').onclick=leaveAdventureMode; $('#enterSearch').onclick=enterSearchMode; $('#exitSearch').onclick=exitSearchMode; $('#testAdvance').onclick=previewArrive; $('#simulateScan').onclick=()=>scanRelic(); $('#hintButton').onclick=showHint; $('#continueReward').onclick=continueReward; $('#finishAdventure').onclick=finishAdventure;
    $('#introNext').onclick=nextIntro;$('#tourNext').onclick=nextTour;$('#renameDog').onclick=beginRename;$('#cycleGear').onclick=cycleGear;
    $('#previewToggle').onchange=e=>{state.previewMode=e.target.checked;previewPosition=PREVIEW_START;previewArrived=false;saveState();renderAll();toast(state.previewMode?'Preview mode on':'Live GPS mode on');};
    $('#resetIntro').onclick=()=>{state.seenIntro=false;state.seenTour=false;saveState();location.reload();};
    $('#resetProgress').onclick=()=>{const keepIntro=state.seenIntro,keepTour=state.seenTour;state={...initialState,seenIntro:keepIntro,seenTour:keepTour,previewMode:true};saveState();renderAll();toast('Progress reset');};
    $('#locateButton').onclick=()=>locateOnMap(exploreMap);$('#adventureLocate').onclick=()=>locateOnMap(adventureMap);
    $('#adventureMenu').onclick=()=>toast(state.previewMode?'Preview mode · progress saves locally':'Live GPS mode · progress saves locally');
    $$('[data-close]').forEach(b=>b.addEventListener('click',()=>closeOverlay(b.dataset.close)));
  }

  function locateOnMap(map){
    if(!map)return;if(state.previewMode){map.easeTo({center:[previewPosition.lng,previewPosition.lat],zoom:16.3});return;}
    if(!navigator.geolocation){toast('Location unavailable');return;}
    navigator.geolocation.getCurrentPosition(p=>{const pos={lat:p.coords.latitude,lng:p.coords.longitude};if(map)map.easeTo({center:[pos.lng,pos.lat],zoom:16.3});},()=>toast('Allow location to centre the map'),{enableHighAccuracy:true});
  }

  function init(){
    wireEvents(); renderAll(); initIntro();
    exploreMap=initMap('#exploreMap',false);
    setTimeout(()=>{ if(exploreMap){exploreMap.resize();fitWholeRoute(exploreMap);} },700);
    handlePendingScan();
    if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(()=>{});
  }

  document.addEventListener('DOMContentLoaded',init);
})();
