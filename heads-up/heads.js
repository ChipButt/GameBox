(() => {
  const $ = id => document.getElementById(id);
  const CUSTOM_KEY = 'gamebox.heads.custom.v1';
  const ROUNDS_KEY = 'gamebox.heads.rounds.v1';
  const DURATIONS = [30,45,60,90];
  const BUILTIN = {
    movies:{name:'Movies',cards:['Jurassic Park','Titanic','The Matrix','Toy Story','Jaws','Ghostbusters','The Lion King','Home Alone','Gladiator','Finding Nemo','Shrek','Rocky','Back to the Future','Frozen','The Terminator','Harry Potter','The Avengers','Pirates of the Caribbean','The Godfather','E.T.','Star Wars','Indiana Jones','Men in Black','The Truman Show','Mean Girls']},
    animals:{name:'Animals',cards:['Elephant','Giraffe','Penguin','Kangaroo','Octopus','Gorilla','Crocodile','Flamingo','Dolphin','Hedgehog','Koala','Rhinoceros','Sloth','Peacock','Meerkat','Chameleon','Walrus','Ostrich','Jellyfish','Badger','Beagle','Lobster','Parrot','Polar Bear','Zebra']},
    food:{name:'Food & Drink',cards:['Pizza','Fish and Chips','Spaghetti','Chocolate','Cheeseburger','Sushi','Pancakes','Ice Cream','Curry','Popcorn','Tacos','Lasagne','Doughnut','Apple Pie','Hot Dog','Burrito','Milkshake','Cupcake','Nachos','Paella','Croissant','Peanut Butter','Watermelon','Coffee','Lemonade']},
    people:{name:'Famous People',cards:['Taylor Swift','David Beckham','Adele','Tom Hanks','Beyoncé','Elton John','Gordon Ramsay','Ed Sheeran','Dwayne Johnson','Lady Gaga','Daniel Radcliffe','Serena Williams','Leonardo DiCaprio','Rihanna','Lewis Hamilton','Dolly Parton','Keanu Reeves','Usain Bolt','Jennifer Aniston','Bruno Mars','Emma Watson','Will Smith','Shakira','Chris Hemsworth','Meryl Streep']},
    places:{name:'Places',cards:['London','Paris','New York','Rome','Tokyo','Sydney','Las Vegas','Dubai','Barcelona','Amsterdam','Hawaii','The Grand Canyon','Mount Everest','Disneyland','Stonehenge','The Eiffel Tower','The Great Wall of China','Hollywood','Venice','The Sahara Desert','Buckingham Palace','Niagara Falls','The North Pole','Times Square','Loch Ness']},
    sports:{name:'Sports',cards:['Football','Rugby','Tennis','Cricket','Golf','Boxing','Formula One','Basketball','Baseball','Swimming','Darts','Snooker','Cycling','Skiing','Surfing','Volleyball','Badminton','Gymnastics','Ice Hockey','Horse Racing','Table Tennis','Archery','Rowing','Wrestling','Skateboarding']},
    music:{name:'Music',cards:['The Beatles','Queen','ABBA','Coldplay','Oasis','Spice Girls','Michael Jackson','Madonna','Fleetwood Mac','Foo Fighters','Ariana Grande','Billie Eilish','Kylie Minogue','George Michael','Whitney Houston','Britney Spears','Bon Jovi','Dua Lipa','Stevie Wonder','Celine Dion','The Rolling Stones','Katy Perry','Eminem','Elvis Presley','Take That']},
    objects:{name:'Everyday Objects',cards:['Toothbrush','Umbrella','Remote Control','Toaster','Vacuum Cleaner','Shopping Trolley','Hairdryer','Alarm Clock','Sunglasses','Kettle','Headphones','Doorbell','Wheelbarrow','Pillow','Stapler','Backpack','Torch','Ladder','Scissors','Mirror','Washing Machine','Suitcase','Frying Pan','Binoculars','Rubber Duck']}
  };

  const state = {
    duration:60,
    selected:new Set(['movies']),
    deck:[],
    current:null,
    history:[],
    correct:0,
    passes:0,
    player:'Player 1',
    roundName:'',
    extraCards:[],
    reverseTilt:false,
    playing:false,
    endAt:0,
    timer:null,
    countdown:null,
    latestTilt:null,
    baseline:null,
    tiltEnabled:false,
    tiltArmed:true,
    tiltLastAction:0,
    orientationHandler:null,
    editCustomId:null
  };

  const esc = s => String(s ?? '').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const uid = () => (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const readStore = key => { try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; } };
  const writeStore = (key,value) => localStorage.setItem(key,JSON.stringify(value));
  const lines = value => [...new Set(String(value||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean))];
  const shuffle = input => { const a=[...input]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; };

  function allCategories(){
    const built = Object.entries(BUILTIN).map(([id,v])=>({id,type:'builtin',name:v.name,cards:[...v.cards]}));
    const custom = readStore(CUSTOM_KEY).map(x=>({id:x.id,type:'custom',name:x.name,cards:[...(x.cards||[])]}));
    return [...built,...custom];
  }

  function renderTimers(){
    const w=$('headsTimer'); w.innerHTML='';
    DURATIONS.forEach(n=>{ const b=document.createElement('button'); b.type='button'; b.textContent=`${n}s`; b.className=n===state.duration?'active':''; b.addEventListener('click',()=>{state.duration=n;renderTimers();}); w.appendChild(b); });
  }

  function renderCategories(){
    const w=$('headsCategories'); w.innerHTML='';
    allCategories().forEach(cat=>{
      const label=document.createElement('label'); label.className='headsCategory';
      const checked=state.selected.has(cat.id);
      label.innerHTML=`<input type="checkbox" data-heads-category="${esc(cat.id)}" ${checked?'checked':''}><span class="headsCategoryCard"><strong>${esc(cat.name)}</strong><span>${cat.cards.length} cards${cat.type==='custom'?' · custom':''}</span></span>`;
      const input=label.querySelector('input'); input.addEventListener('change',()=>{input.checked?state.selected.add(cat.id):state.selected.delete(cat.id);});
      w.appendChild(label);
    });
  }

  function renderCustomList(){
    const w=$('headsCustomList'); const items=readStore(CUSTOM_KEY); w.innerHTML='';
    if(!items.length){w.innerHTML='<div class="sub" style="margin:0">No custom categories yet.</div>';return;}
    items.forEach(item=>{
      const d=document.createElement('div'); d.className='headsCustomItem';
      d.innerHTML=`<div class="headsPresetInfo"><strong>${esc(item.name)}</strong><span>${(item.cards||[]).length} cards</span></div><div class="headsPresetActions"><button class="tiny edit">Edit</button><button class="tiny del">Delete</button></div>`;
      d.querySelector('.edit').addEventListener('click',()=>{state.editCustomId=item.id;$('headsCustomName').value=item.name;$('headsCustomCards').value=(item.cards||[]).join('\n');$('headsSaveCategory').textContent='Update Custom Category';$('headsCustomStatus').textContent=`Editing “${item.name}”.`;window.scrollTo({top:document.body.scrollHeight,behavior:'smooth'});});
      d.querySelector('.del').addEventListener('click',()=>{writeStore(CUSTOM_KEY,items.filter(x=>x.id!==item.id));state.selected.delete(item.id);if(state.editCustomId===item.id){clearCustomForm();}renderCustomList();renderCategories();});
      w.appendChild(d);
    });
  }

  function clearCustomForm(){state.editCustomId=null;$('headsCustomName').value='';$('headsCustomCards').value='';$('headsSaveCategory').textContent='Save Custom Category';}

  function saveCustomCategory(){
    const name=$('headsCustomName').value.trim(); const cards=lines($('headsCustomCards').value);
    if(!name){$('headsCustomStatus').textContent='Give the category a name.';return;}
    if(!cards.length){$('headsCustomStatus').textContent='Add at least one card.';return;}
    const items=readStore(CUSTOM_KEY);
    if(state.editCustomId){
      const ix=items.findIndex(x=>x.id===state.editCustomId); if(ix>=0) items[ix]={...items[ix],name,cards};
      $('headsCustomStatus').textContent=`Updated “${name}”.`;
    } else {
      const id=uid(); items.unshift({id,name,cards}); state.selected.add(id); $('headsCustomStatus').textContent=`Created “${name}”.`;
    }
    writeStore(CUSTOM_KEY,items); clearCustomForm(); renderCustomList(); renderCategories();
  }

  function collectSetup(){
    state.roundName=$('headsRoundName').value.trim();
    state.player=$('headsPlayerName').value.trim()||'Player 1';
    state.extraCards=lines($('headsExtraCards').value);
    state.reverseTilt=$('headsReverseTilt').checked;
  }

  function roundPayload(id=null){collectSetup();return {id:id||uid(),name:state.roundName||'Saved Round',player:state.player,duration:state.duration,categories:[...state.selected],extraCards:[...state.extraCards],reverseTilt:state.reverseTilt};}

  function saveRound(){
    collectSetup();
    if(!state.roundName){$('headsStatus').textContent='Give the round a name before saving.';$('headsRoundName').focus();return;}
    if(!state.selected.size&&!state.extraCards.length){$('headsStatus').textContent='Select a category or add extra cards first.';return;}
    const items=readStore(ROUNDS_KEY); const ix=items.findIndex(x=>String(x.name).toLowerCase()===state.roundName.toLowerCase()); const payload=roundPayload(ix>=0?items[ix].id:null);
    if(ix>=0)items[ix]=payload;else items.unshift(payload); writeStore(ROUNDS_KEY,items); renderSavedRounds(); $('headsStatus').textContent=`Saved “${state.roundName}”.`;
  }

  function renderSavedRounds(){
    const w=$('headsSavedRounds'); const items=readStore(ROUNDS_KEY); w.innerHTML='';
    if(!items.length){w.innerHTML='<div class="sub" style="margin:0">No saved rounds yet.</div>';return;}
    items.forEach(item=>{
      const d=document.createElement('div'); d.className='headsPresetLine';
      d.innerHTML=`<div class="headsPresetInfo"><strong>${esc(item.name)}</strong><span>${item.duration}s · ${(item.categories||[]).length} categor${(item.categories||[]).length===1?'y':'ies'} · ${(item.extraCards||[]).length} extra</span></div><div class="headsPresetActions"><button class="tiny load">Load</button><button class="tiny del">Delete</button></div>`;
      d.querySelector('.load').addEventListener('click',()=>loadRound(item.id));
      d.querySelector('.del').addEventListener('click',()=>{writeStore(ROUNDS_KEY,items.filter(x=>x.id!==item.id));renderSavedRounds();});
      w.appendChild(d);
    });
  }

  function loadRound(id){
    const item=readStore(ROUNDS_KEY).find(x=>x.id===id); if(!item)return;
    state.roundName=item.name||'';state.player=item.player||'Player 1';state.duration=DURATIONS.includes(item.duration)?item.duration:60;state.selected=new Set(item.categories||[]);state.extraCards=[...(item.extraCards||[])];state.reverseTilt=!!item.reverseTilt;
    $('headsRoundName').value=state.roundName;$('headsPlayerName').value=state.player;$('headsExtraCards').value=state.extraCards.join('\n');$('headsReverseTilt').checked=state.reverseTilt;renderTimers();renderCategories();$('headsStatus').textContent=`Loaded “${state.roundName}”.`;
  }

  function makeDeck(){
    collectSetup(); const cats=allCategories(); const chosen=cats.filter(c=>state.selected.has(c.id));
    const deck=[]; chosen.forEach(cat=>cat.cards.forEach(word=>deck.push({word,category:cat.name}))); state.extraCards.forEach(word=>deck.push({word,category:'Extra Cards'}));
    return shuffle(deck);
  }

  function setMode(mode){
    const setup=mode==='setup'; $('headsSetup').classList.toggle('hidden',!setup); $('headsPlay').classList.toggle('hidden',setup); $('headsSetupTab').classList.toggle('active',setup); $('headsPlayTab').classList.toggle('active',!setup); if(setup)stopActiveRound(); window.scrollTo({top:0,behavior:'smooth'});
  }

  function startRoundSetup(){
    const deck=makeDeck(); if(!deck.length){$('headsStatus').textContent='Select at least one category or add an extra card.';return;}
    state.deck=deck;state.current=null;state.history=[];state.correct=0;state.passes=0;state.playing=false;state.baseline=null;state.tiltArmed=true;state.tiltLastAction=0;
    $('headsReadyTitle').textContent=state.roundName||'Ready?';$('headsReadyMeta').textContent=`${state.player} · ${state.duration} seconds · ${deck.length} cards available`;
    $('headsReady').classList.remove('hidden');$('headsCountdownWrap').classList.add('hidden');$('headsLive').classList.add('hidden');$('headsResults').classList.add('hidden');$('headsTiltState').textContent='Tilt controls will be enabled when the round begins.';setMode('play');
  }

  function orientationAngle(){
    const a=screen.orientation?.angle; if(typeof a==='number')return a; const legacy=window.orientation; return typeof legacy==='number'?legacy:0;
  }

  function normalizedTilt(e){
    const angle=orientationAngle(); const beta=Number(e.beta), gamma=Number(e.gamma); if(!Number.isFinite(beta)||!Number.isFinite(gamma))return null;
    if(angle===90)return gamma;
    if(angle===270||angle===-90)return -gamma;
    return beta;
  }

  async function enableTilt(){
    state.tiltEnabled=false; state.latestTilt=null;
    if(!('DeviceOrientationEvent' in window)){ $('headsTiltState').textContent='Motion sensors are unavailable. Use the Correct and Pass buttons.'; return false; }
    try{
      if(typeof DeviceOrientationEvent.requestPermission==='function'){
        const result=await DeviceOrientationEvent.requestPermission(); if(result!=='granted')throw new Error('permission denied');
      }
      if(state.orientationHandler)window.removeEventListener('deviceorientation',state.orientationHandler,true);
      state.orientationHandler=e=>{const v=normalizedTilt(e);if(v==null)return;state.latestTilt=v;if(state.playing)processTilt(v);};
      window.addEventListener('deviceorientation',state.orientationHandler,true); state.tiltEnabled=true; $('headsTiltState').textContent='Tilt enabled. Put the phone against your forehead during the countdown.'; return true;
    } catch(err){ $('headsTiltState').textContent='Tilt permission was not granted. You can still play with the buttons.'; return false; }
  }

  function processTilt(value){
    if(!state.playing||state.baseline==null||Date.now()-state.tiltLastAction<550)return;
    let delta=value-state.baseline; if(state.reverseTilt)delta*=-1;
    const threshold=24, neutral=10;
    $('headsTiltReadout').textContent=Math.abs(delta)<neutral?'Hold level':delta>0?'Tilting down':'Tilting up';
    if(!state.tiltArmed){ if(Math.abs(delta)<=neutral){state.tiltArmed=true;state.baseline=value;$('headsTiltReadout').textContent='Ready for next tilt';} return; }
    if(delta>=threshold){ state.tiltArmed=false; state.tiltLastAction=Date.now(); markCurrent('correct'); }
    else if(delta<=-threshold){ state.tiltArmed=false; state.tiltLastAction=Date.now(); markCurrent('pass'); }
  }

  function beginCountdown(){
    if(state.countdown)clearInterval(state.countdown); $('headsReady').classList.add('hidden');$('headsCountdownWrap').classList.remove('hidden');let n=3;$('headsCountdown').textContent=n;
    state.countdown=setInterval(()=>{n--;if(n>0){$('headsCountdown').textContent=n;return;}clearInterval(state.countdown);state.countdown=null;$('headsCountdownWrap').classList.add('hidden');startLiveRound();},700);
  }

  async function beginRound(){ await enableTilt(); beginCountdown(); }

  function startLiveRound(){
    if(!state.deck.length)return endRound(); state.playing=true;state.baseline=state.latestTilt;state.tiltArmed=true;state.tiltLastAction=Date.now();state.endAt=Date.now()+state.duration*1000;
    $('headsLive').classList.remove('hidden');$('headsLivePlayer').textContent=state.player; nextCard(); tickTimer(); state.timer=setInterval(tickTimer,100);
  }

  function tickTimer(){
    const remaining=Math.max(0,state.endAt-Date.now());$('headsClock').textContent=(remaining/1000).toFixed(1); if(remaining<=0)endRound();
  }

  function nextCard(){
    if(!state.deck.length){state.deck=shuffle(state.history.map(x=>({word:x.word,category:x.category})));}
    state.current=state.deck.pop(); if(!state.current)return endRound();$('headsWord').textContent=state.current.word;$('headsCardCategory').textContent=state.current.category;$('headsLiveScore').textContent=`${state.correct} correct`;
  }

  function markCurrent(result){
    if(!state.playing||!state.current)return; const item={...state.current,result};state.history.push(item);if(result==='correct')state.correct++;else state.passes++; if(navigator.vibrate)navigator.vibrate(result==='correct'?[35]:[20,35,20]);nextCard();
  }

  function stopActiveRound(){
    state.playing=false;if(state.timer){clearInterval(state.timer);state.timer=null;}if(state.countdown){clearInterval(state.countdown);state.countdown=null;}
  }

  function endRound(){
    if(!state.playing&&$('headsResults').classList.contains('hidden')===false)return; stopActiveRound(); $('headsLive').classList.add('hidden');$('headsReady').classList.add('hidden');$('headsCountdownWrap').classList.add('hidden');$('headsResults').classList.remove('hidden');$('headsFinalScore').textContent=state.correct;$('headsCorrectCount').textContent=state.correct;$('headsPassCount').textContent=state.passes;$('headsFinalLabel').textContent=`correct answer${state.correct===1?'':'s'} for ${state.player}`;
    const w=$('headsHistory');w.innerHTML=''; if(!state.history.length){w.innerHTML='<div class="sub" style="text-align:center">No cards were completed.</div>';return;} state.history.forEach(item=>{const d=document.createElement('div');d.className='historyItem';d.innerHTML=`<div class="headsResultIcon ${item.result==='pass'?'pass':''}">${item.result==='correct'?'✓':'↗'}</div><div><strong>${esc(item.word)}</strong><span>${esc(item.category)} · ${item.result==='correct'?'Correct':'Passed'}</span></div>`;w.appendChild(d);});
  }

  function replay(){
    const deck=makeDeck();state.deck=deck;state.history=[];state.correct=0;state.passes=0;state.current=null;state.playing=false;state.baseline=null;$('headsResults').classList.add('hidden');$('headsReady').classList.remove('hidden');$('headsReadyTitle').textContent=state.roundName||'Ready?';$('headsReadyMeta').textContent=`${state.player} · ${state.duration} seconds · ${deck.length} cards available`;
  }

  $('headsSetupTab').addEventListener('click',()=>setMode('setup'));
  $('headsPlayTab').addEventListener('click',()=>{if(!$('headsPlay').classList.contains('hidden'))return;$('headsStatus').textContent='Start a round from Setup first.';});
  $('headsStart').addEventListener('click',startRoundSetup);
  $('headsSaveRound').addEventListener('click',saveRound);
  $('headsSaveCategory').addEventListener('click',saveCustomCategory);
  $('headsBegin').addEventListener('click',beginRound);
  $('headsBackSetup').addEventListener('click',()=>setMode('setup'));
  $('headsResultsSetup').addEventListener('click',()=>setMode('setup'));
  $('headsAgain').addEventListener('click',replay);
  $('headsCorrect').addEventListener('click',()=>markCurrent('correct'));
  $('headsPass').addEventListener('click',()=>markCurrent('pass'));
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&state.playing)endRound();});
  window.addEventListener('pagehide',stopActiveRound);

  renderTimers();renderCategories();renderCustomList();renderSavedRounds();$('headsPlayerName').value=state.player;
})();