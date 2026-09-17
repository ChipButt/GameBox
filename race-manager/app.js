(() => {
  'use strict';

  const SAVE_KEY='gamebox-gridline-v3';
  const OLD_KEYS=['gamebox-gridline-v2','gamebox-gridline-v1'];
  const BOT_NAMES=['Apex North','Redline Works','Vector GP','Copper Fox','Nightshift','Kestrel','Orion Motorsport','Blackbird','Summit Racing','Halo Autosport','Cinder Team','Blue Arrow','Forge Racing','Velocity Union'];
  const TRACKS=[
    {name:'Harbour Sprint',discipline:'Open Wheel',laps:8,weather:'Dry',difficulty:58},
    {name:'Alpine Ring',discipline:'Open Wheel',laps:9,weather:'Cool',difficulty:61},
    {name:'Desert Oval',discipline:'Stock Car',laps:10,weather:'Hot',difficulty:64},
    {name:'Forest Run',discipline:'Rally',laps:8,weather:'Damp',difficulty:67}
  ];
  const PRIZES=[550,420,340,280,240,200,170,145,120,100,80,60];
  const UPGRADES={
    pace:{label:'Pace',desc:'Higher outright speed',base:150,growth:1.42},
    handling:{label:'Handling',desc:'Faster through traffic',base:125,growth:1.40},
    focus:{label:'Focus',desc:'More consistent laps',base:110,growth:1.38},
    reliability:{label:'Reliability',desc:'Fewer costly mistakes',base:120,growth:1.39}
  };
  const DECISIONS=[
    {title:'Traffic ahead',text:'Two cars are fighting in front. Make the call now.',choices:[
      {label:'Dive inside',boost:1.05,duration:18,risk:.035,msg:'Aggressive move: big short-term pace boost.'},
      {label:'Wait for a gap',boost:.35,duration:28,risk:0,msg:'Patient move: smaller but safer gain.'}
    ]},
    {title:'Tyres are heating up',text:'The racer is sliding more through the fast section.',choices:[
      {label:'Keep pushing',boost:.85,duration:20,risk:.028,msg:'You keep the pressure on.'},
      {label:'Settle the car',boost:.45,duration:32,risk:0,msg:'The car settles and finds rhythm.'}
    ]},
    {title:'Sponsor challenge',text:'Your sponsor wants a visible attack before the next lap.',choices:[
      {label:'Go for it',boost:.9,duration:22,risk:.02,cash:75,msg:'Sponsor pays £75 for the attack.'},
      {label:'Protect the finish',boost:.3,duration:30,risk:0,msg:'No bonus, but the pace remains stable.'}
    ]},
    {title:'Clear track opening',text:'You have a chance to use clean air before the pack closes again.',choices:[
      {label:'Use it now',boost:.75,duration:26,risk:.012,msg:'Clean air gives an immediate run.'},
      {label:'Save the tyres',boost:.25,duration:38,risk:0,msg:'You trade speed now for consistency.'}
    ]}
  ];

  const DEFAULT_STATE={
    cash:900,fans:0,division:'Rookie',racesRun:0,bestFinish:null,sponsorLevel:1,
    upgrades:{pace:1,handling:1,focus:1,reliability:1},
    sponsorName:'Chip In Performance'
  };

  let state=loadState();
  let runtime=null;
  let raceTimer=null;
  let sponsorTimer=null;
  let nextRaceTimer=null;
  let tacticCooldownUntil=0;
  let hostPending=null,hostPeers=[],joinPeer=null,joinChannel=null;
  let networkMode=null,networkLocalId=null;

  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const clone=o=>JSON.parse(JSON.stringify(o));
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const money=n=>'£'+Math.max(0,Math.round(Number(n)||0)).toLocaleString('en-GB');
  const uid=()=>Math.random().toString(36).slice(2,10);

  function escapeHtml(v){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
  function loadState(){
    let raw=null;
    try{
      raw=localStorage.getItem(SAVE_KEY);
      if(!raw){for(const key of OLD_KEYS){raw=localStorage.getItem(key);if(raw)break;}}
      if(!raw)return clone(DEFAULT_STATE);
      const saved=JSON.parse(raw);
      const merged=clone(DEFAULT_STATE);
      if(typeof saved.cash==='number')merged.cash=saved.cash;
      else if(saved.team&&typeof saved.team.credits==='number')merged.cash=saved.team.credits;
      merged.fans=Number(saved.fans ?? saved.team?.fans ?? 0)||0;
      merged.division=String(saved.division ?? saved.team?.division ?? 'Rookie');
      merged.racesRun=Number(saved.racesRun ?? saved.history?.length ?? 0)||0;
      merged.bestFinish=saved.bestFinish||null;
      merged.sponsorLevel=Math.max(1,Number(saved.sponsorLevel)||1);
      merged.sponsorName=String(saved.sponsorName||merged.sponsorName);
      if(saved.upgrades)merged.upgrades=Object.assign(merged.upgrades,saved.upgrades);
      else if(saved.drivers?.[0]&&saved.cars?.[0]){
        const d=saved.drivers[0],c=saved.cars[0];
        merged.upgrades.pace=Math.max(1,Math.round(((d.pace||65)-60)/3));
        merged.upgrades.handling=Math.max(1,Math.round(((c.grip||65)-60)/3));
        merged.upgrades.focus=Math.max(1,Math.round(((d.focus||65)-60)/3));
        merged.upgrades.reliability=Math.max(1,Math.round(((c.reliability||65)-60)/3));
      }
      return merged;
    }catch(err){console.warn('Save load failed',err);return clone(DEFAULT_STATE);}
  }
  function persist(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(state));}catch(err){console.warn('Save failed',err);}}
  function sponsorRate(){return 8+state.sponsorLevel*5+Math.floor(state.fans/250);}
  function power(){
    const u=state.upgrades;
    return Math.round(54+u.pace*2.6+u.handling*2.0+u.focus*1.65+u.reliability*1.45);
  }
  function upgradeCost(key){
    const cfg=UPGRADES[key],lvl=Math.max(1,state.upgrades[key]||1);
    return Math.round(cfg.base*Math.pow(cfg.growth,lvl-1)/10)*10;
  }
  function updateDivision(){
    state.division=state.fans>=2000?'Elite':state.fans>=1000?'Pro':state.fans>=400?'Club':'Rookie';
  }

  function renderHud(){
    $('#cash').textContent=money(state.cash);
    $('#sponsorRate').textContent=money(sponsorRate())+'/s';
    $('#raceNumber').textContent=String(state.racesRun+1);
    $('#power').textContent=String(power());
    $('#fans').textContent=Math.round(state.fans).toLocaleString('en-GB');
    $('#division').textContent=state.division;
    $('#bestFinish').textContent=state.bestFinish?ordinal(state.bestFinish):'—';
    $('#racesRun').textContent=String(state.racesRun);
    $('#sponsorName').textContent=state.sponsorName;
    renderUpgrades();
  }
  function renderUpgrades(){
    const running=!!runtime&&runtime.running;
    $('#upgradeGrid').innerHTML=Object.entries(UPGRADES).map(([key,cfg])=>{
      const level=state.upgrades[key],cost=upgradeCost(key),afford=state.cash>=cost;
      return `<button class="upgradeButton" data-upgrade="${key}" type="button" ${(!running||!afford)?'disabled':''}>
        <strong>${cfg.label} · Lv ${level}</strong><span>${cfg.desc}</span><b>${money(cost)}</b>
      </button>`;
    }).join('');
  }
  function ordinal(n){const v=n%100;return n+(v>=11&&v<=13?'th':({1:'st',2:'nd',3:'rd'}[n%10]||'th'));}
  function shuffle(arr){for(let i=arr.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];}return arr;}

  function makeEntrants(track,friendEntrants=[]){
    const entrants=[{id:'you',name:'You',distance:0,power:power(),kind:'you',finish:null}];
    friendEntrants.forEach(f=>entrants.push({id:f.id,name:f.name,distance:0,power:f.power||60,kind:'friend',finish:null}));
    const need=Math.max(0,12-entrants.length);
    shuffle(BOT_NAMES.slice()).slice(0,need).forEach((name,i)=>{
      entrants.push({id:'bot-'+i,name,distance:0,power:track.difficulty-5+Math.random()*13,kind:'bot',finish:null});
    });
    return entrants;
  }

  function startRace(opts={}){
    clearTimeout(nextRaceTimer);
    const trackIndex=opts.trackIndex ?? (state.racesRun%TRACKS.length);
    const track=TRACKS[trackIndex];
    runtime={
      running:true,trackIndex,track,total:track.laps*100,tick:0,entrants:opts.entrants||makeEntrants(track),
      boost:0,boostUntil:0,risk:0,tactic:null,tacticUntil:0,nextDecisionAt:35+Math.floor(Math.random()*18),
      decision:null,decisionExpires:0,networkHost:opts.networkHost||false,remote:opts.remote||false
    };
    $('#startSeason').classList.add('hidden');
    $('#resultCard').classList.add('hidden');
    $('#raceStatus').innerHTML='<strong>Race live</strong><span>Earn, upgrade and make calls while the cars are moving.</span>';
    renderTrackHeader();
    renderRaceLanes();
    renderHud();
    startSponsorClock();
    if(!runtime.remote){
      clearInterval(raceTimer);
      raceTimer=setInterval(raceTick,300);
    }
  }

  function renderTrackHeader(){
    if(!runtime)return;
    $('#trackName').textContent=runtime.track.name;
    $('#trackMeta').textContent=`${runtime.track.discipline} · ${runtime.track.weather}`;
    $('#lapText').textContent=`Lap 1 / ${runtime.track.laps}`;
    $('#lapBar').style.width='0%';
  }
  function renderRaceLanes(){
    if(!runtime)return;
    const sorted=runtime.entrants.slice().sort((a,b)=>b.distance-a.distance);
    const positionById=Object.fromEntries(sorted.map((e,i)=>[e.id,i+1]));
    const localId=networkLocalId||'you';
    const local=runtime.entrants.find(e=>e.id===localId)||runtime.entrants.find(e=>e.id==='you');
    const localPos=local?positionById[local.id]:12;
    $('#position').textContent=String(localPos);
    $('#raceLanes').innerHTML=runtime.entrants.map(e=>{
      const pct=(e.distance%100);
      const cls=e.id===localId||(!networkLocalId&&e.id==='you')?'you':e.kind==='friend'?'friend':'';
      return `<div class="raceLane ${cls}" data-id="${escapeHtml(e.id)}">
        <span class="pos">${positionById[e.id]}</span><span class="name">${escapeHtml(e.name)}</span>
        <div class="lane"><i class="carDot" style="left:calc(${Math.min(96,pct*.96)}% - 12px)"></i></div>
      </div>`;
    }).join('');
    const ref=local||runtime.entrants[0];
    const lap=Math.min(runtime.track.laps,Math.floor(ref.distance/100)+1);
    const lapPct=Math.min(100,ref.distance>=runtime.total?100:(ref.distance%100));
    $('#lapText').textContent=`Lap ${lap} / ${runtime.track.laps}`;
    $('#lapBar').style.width=lapPct+'%';
  }

  function raceTick(){
    if(!runtime||!runtime.running||runtime.remote)return;
    runtime.tick++;
    const nowTick=runtime.tick;
    if(runtime.boostUntil<=nowTick){runtime.boost=0;runtime.risk=0;}
    if(runtime.tacticUntil<=nowTick)runtime.tactic=null;

    const active=runtime.entrants.filter(e=>e.finish===null);
    active.forEach(e=>{
      let speed;
      if(e.id==='you'){
        e.power=power();
        const u=state.upgrades;
        const consistency=(u.focus-1)*.035;
        speed=4.55+(e.power-60)*.042+runtime.boost+(Math.random()-.5)*(1.05-Math.min(.7,consistency));
        if(runtime.tactic==='push')speed+=.85;
        if(runtime.tactic==='defend')speed+=.36;
        if(runtime.tactic==='clean')speed+=.48;
        const mistakeBase=.012-Math.min(.009,(u.reliability-1)*.0012);
        if(Math.random()<mistakeBase+runtime.risk+(runtime.tactic==='push'?.014:0))speed-=2.5+Math.random()*2.3;
      }else if(e.kind==='friend'){
        speed=4.5+(e.power-60)*.042+(Math.random()-.5)*.85;
      }else{
        speed=4.48+(e.power-60)*.042+(Math.random()-.5)*.95;
      }
      e.distance=Math.min(runtime.total,e.distance+Math.max(1.35,speed));
      if(e.distance>=runtime.total&&e.finish===null)e.finish=runtime.tick+Math.random()*.2;
    });

    if(!runtime.decision&&runtime.tick>=runtime.nextDecisionAt&&runtime.entrants.find(e=>e.id==='you')?.finish===null){
      openDecision();
    }
    if(runtime.decision){
      const remaining=runtime.decisionExpires-runtime.tick;
      $('#decisionTimerBar').style.width=clamp((remaining/20)*100,0,100)+'%';
      if(remaining<=0)resolveDecision(1,true);
    }

    renderRaceLanes();
    if(runtime.networkHost&&runtime.tick%2===0)broadcastSnapshot();

    if(runtime.entrants.every(e=>e.finish!==null))finishRace();
  }

  function startSponsorClock(){
    if(sponsorTimer)return;
    sponsorTimer=setInterval(()=>{
      if(!runtime||!runtime.running)return;
      const income=sponsorRate();
      state.cash+=income;
      $('#liveSponsor').textContent='+'+money(income);
      renderHud();
      persist();
      if(networkMode==='guest'&&joinChannel?.readyState==='open'){
        joinChannel.send(JSON.stringify({type:'local-money',cash:state.cash}));
      }
    },1000);
  }

  function buyUpgrade(key){
    if(!runtime||!runtime.running)return toast('Upgrades are bought during a live race.');
    const cfg=UPGRADES[key];if(!cfg)return;
    const cost=upgradeCost(key);
    if(state.cash<cost)return toast('Not enough sponsor cash yet.');
    state.cash-=cost;
    state.upgrades[key]++;
    persist();
    renderHud();
    toast(`${cfg.label} upgraded — it affects this race immediately.`);
    if(networkMode==='guest'&&joinChannel?.readyState==='open'){
      joinChannel.send(JSON.stringify({type:'power',power:power()}));
    }
  }

  function useTactic(name){
    if(!runtime||!runtime.running)return toast('Start racing first.');
    const now=Date.now();
    if(now<tacticCooldownUntil)return;
    runtime.tactic=name;runtime.tacticUntil=runtime.tick+18;
    tacticCooldownUntil=now+5200;
    $('#tacticState').textContent=name==='push'?'Pushing':name==='defend'?'Defending':'Clean air';
    $$('.tacticButton').forEach(b=>b.disabled=true);
    setTimeout(()=>{
      $('#tacticState').textContent='Ready';
      $$('.tacticButton').forEach(b=>b.disabled=!(runtime&&runtime.running));
    },5200);
  }

  function openDecision(){
    const d=DECISIONS[Math.floor(Math.random()*DECISIONS.length)];
    runtime.decision=d;
    runtime.decisionExpires=runtime.tick+20;
    $('#decisionTitle').textContent=d.title;
    $('#decisionText').textContent=d.text;
    $('#decisionChoices').innerHTML=d.choices.map((c,i)=>`<button type="button" data-decision-choice="${i}">${escapeHtml(c.label)}</button>`).join('');
    $('#decisionTimerBar').style.width='100%';
    $('#decisionCard').classList.remove('hidden');
  }
  function resolveDecision(index,auto=false){
    if(!runtime?.decision)return;
    const c=runtime.decision.choices[index]||runtime.decision.choices[0];
    runtime.boost=c.boost||0;runtime.boostUntil=runtime.tick+(c.duration||18);runtime.risk=c.risk||0;
    if(c.cash){state.cash+=c.cash;persist();}
    runtime.nextDecisionAt=runtime.tick+42+Math.floor(Math.random()*28);
    runtime.decision=null;
    $('#decisionCard').classList.add('hidden');
    toast((auto?'Pit wall auto-call: ':'')+c.msg);
  }

  function finishRace(){
    if(!runtime||!runtime.running)return;
    runtime.running=false;
    clearInterval(raceTimer);raceTimer=null;
    const results=runtime.entrants.slice().sort((a,b)=>(a.finish??9999)-(b.finish??9999));
    const localId=networkLocalId||'you';
    const localIndex=Math.max(0,results.findIndex(e=>e.id===localId));
    const pos=localIndex+1;
    const prize=PRIZES[localIndex]||60;
    const sponsorBonus=Math.max(0,(7-pos)*25)+state.sponsorLevel*20;
    state.cash+=prize+sponsorBonus;
    state.fans+=Math.max(3,13-pos)*6;
    state.racesRun++;
    state.bestFinish=state.bestFinish?Math.min(state.bestFinish,pos):pos;
    if(state.racesRun%3===0)state.sponsorLevel++;
    updateDivision();
    persist();
    renderHud();
    $('#decisionCard').classList.add('hidden');
    $('#raceStatus').innerHTML=`<strong>${ordinal(pos)} place</strong><span>Next race starts automatically.</span>`;
    $('#resultCard').innerHTML=`<span class="eyebrow">CHEQUERED FLAG</span><h2>${ordinal(pos)} place</h2>
      <div class="resultMoney"><div><span>Finish money</span><strong>+${money(prize)}</strong></div><div><span>Sponsor bonus</span><strong>+${money(sponsorBonus)}</strong></div></div>`;
    $('#resultCard').classList.remove('hidden');

    if(runtime.networkHost){
      const packet=JSON.stringify({type:'finish',results:results.map((r,i)=>({id:r.id,name:r.name,position:i+1}))});
      hostPeers.forEach(p=>{if(p.channel?.readyState==='open')p.channel.send(packet);});
      return;
    }
    if(networkMode==='guest')return;
    nextRaceTimer=setTimeout(()=>startRace(),2400);
  }

  function toast(text){
    let el=$('#gridToast');
    if(!el){el=document.createElement('div');el.id='gridToast';el.style.cssText='position:fixed;z-index:100;left:50%;bottom:18px;transform:translateX(-50%);max-width:calc(100% - 24px);background:#082f68;color:#fff;padding:10px 14px;border-radius:999px;font:700 13px Inter,system-ui;text-align:center;box-shadow:0 10px 30px rgba(8,47,104,.22)';document.body.appendChild(el);}
    el.textContent=text;el.hidden=false;clearTimeout(el._t);el._t=setTimeout(()=>el.hidden=true,2200);
  }

  function showFriends(show){
    $('#raceScreen').classList.toggle('hidden',show);
    $('#friendsScreen').classList.toggle('hidden',!show);
    if(show){clearTimeout(nextRaceTimer);}
  }

  function makePeer(){
    if(typeof RTCPeerConnection!=='function')throw new Error('This browser does not support direct Wi-Fi play.');
    return new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'}]});
  }
  function waitIce(pc){
    if(pc.iceGatheringState==='complete')return Promise.resolve();
    return new Promise(resolve=>{
      let done=false;
      const finish=()=>{if(done)return;done=true;pc.removeEventListener('icegatheringstatechange',check);resolve();};
      const check=()=>{if(pc.iceGatheringState==='complete')finish();};
      pc.addEventListener('icegatheringstatechange',check);setTimeout(finish,5000);
    });
  }
  function encodeSignal(desc){return btoa(unescape(encodeURIComponent(JSON.stringify(desc))));}
  function decodeSignal(code){return JSON.parse(decodeURIComponent(escape(atob(String(code||'').trim()))));}

  async function createInvite(){
    try{
      $('#hostState').textContent='Creating';
      const pc=makePeer(),channel=pc.createDataChannel('gridline-v3'),peer={id:uid(),pc,channel,player:null};
      wireHostPeer(peer);
      await pc.setLocalDescription(await pc.createOffer());await waitIce(pc);
      hostPending=peer;$('#hostOffer').value=encodeSignal(pc.localDescription);$('#hostState').textContent='Invite ready';
    }catch(err){console.error(err);toast(err.message||'Could not create invite');$('#hostState').textContent='Error';}
  }
  function wireHostPeer(peer){
    peer.channel.onopen=()=>{$('#hostState').textContent='Connected';renderHostPlayers();};
    peer.channel.onmessage=evt=>{
      try{
        const msg=JSON.parse(evt.data);
        if(msg.type==='hello'){peer.player={id:peer.id,name:String(msg.name||'Friend').slice(0,24),power:Number(msg.power)||60};renderHostPlayers();}
        if(msg.type==='power'&&peer.player){peer.player.power=Number(msg.power)||peer.player.power;const e=runtime?.entrants.find(x=>x.id===peer.id);if(e)e.power=peer.player.power;}
      }catch(err){console.warn(err);}
    };
    peer.channel.onclose=renderHostPlayers;
  }
  async function acceptAnswer(){
    if(!hostPending)return toast('Create an invite first.');
    try{
      await hostPending.pc.setRemoteDescription(decodeSignal($('#hostAnswer').value));
      hostPeers.push(hostPending);hostPending=null;$('#hostOffer').value='';$('#hostAnswer').value='';$('#hostState').textContent='Connecting';renderHostPlayers();
    }catch(err){console.error(err);toast('That answer code is not valid.');}
  }
  function renderHostPlayers(){
    const open=hostPeers.filter(p=>p.channel?.readyState==='open'&&p.player);
    $('#hostPlayers').innerHTML=[{name:'You',power:power()},...open.map(p=>p.player)].map((p,i)=>`<div class="playerChip"><strong>${escapeHtml(p.name)}${i===0?' · Host':''}</strong><span>Power ${Math.round(p.power)}</span></div>`).join('');
    $('#startFriendRace').disabled=open.length===0;
  }
  async function makeAnswer(){
    try{
      $('#joinState').textContent='Connecting';
      joinPeer=makePeer();
      joinPeer.ondatachannel=evt=>{
        joinChannel=evt.channel;
        joinChannel.onopen=()=>{$('#joinState').textContent='Connected';joinChannel.send(JSON.stringify({type:'hello',name:'Friend',power:power()}));};
        joinChannel.onmessage=evt=>handleGuestMessage(JSON.parse(evt.data));
        joinChannel.onclose=()=>$('#joinState').textContent='Disconnected';
      };
      await joinPeer.setRemoteDescription(decodeSignal($('#joinOffer').value));
      await joinPeer.setLocalDescription(await joinPeer.createAnswer());await waitIce(joinPeer);
      $('#joinAnswer').value=encodeSignal(joinPeer.localDescription);$('#joinState').textContent='Answer ready';
    }catch(err){console.error(err);toast('That invite code is not valid.');$('#joinState').textContent='Error';}
  }

  function startFriendRace(){
    const peers=hostPeers.filter(p=>p.channel?.readyState==='open'&&p.player);
    if(!peers.length)return;
    networkMode='host';networkLocalId='you';showFriends(false);
    const trackIndex=state.racesRun%TRACKS.length,track=TRACKS[trackIndex];
    const friends=peers.map(p=>({id:p.id,name:p.player.name,power:p.player.power}));
    const entrants=makeEntrants(track,friends);
    startRace({trackIndex,entrants,networkHost:true});
    peers.forEach(p=>p.channel.send(JSON.stringify({type:'race-start',payload:{trackIndex,entrants:entrants.map(e=>({id:e.id,name:e.name,power:e.power,kind:e.kind})),localId:p.id}})));
  }
  function broadcastSnapshot(){
    if(!runtime)return;
    const data={type:'snapshot',tick:runtime.tick,entrants:runtime.entrants.map(e=>({id:e.id,distance:e.distance,power:e.power,finish:e.finish}))};
    const packet=JSON.stringify(data);
    hostPeers.forEach(p=>{if(p.channel?.readyState==='open')p.channel.send(packet);});
  }
  function handleGuestMessage(msg){
    if(msg.type==='race-start'){
      networkMode='guest';networkLocalId=msg.payload.localId;showFriends(false);
      const track=TRACKS[msg.payload.trackIndex]||TRACKS[0];
      const entrants=msg.payload.entrants.map(e=>Object.assign({distance:0,finish:null},e));
      startRace({trackIndex:msg.payload.trackIndex,entrants,remote:true});
    }
    if(msg.type==='snapshot'&&runtime?.remote){
      runtime.tick=msg.tick;
      msg.entrants.forEach(update=>{const e=runtime.entrants.find(x=>x.id===update.id);if(e)Object.assign(e,update);});
      renderRaceLanes();
    }
    if(msg.type==='finish'&&runtime?.remote){
      runtime.running=false;
      const mine=msg.results.find(r=>r.id===networkLocalId);
      const pos=mine?.position||12,prize=PRIZES[pos-1]||60,sponsorBonus=Math.max(0,(7-pos)*25)+state.sponsorLevel*20;
      state.cash+=prize+sponsorBonus;state.fans+=Math.max(3,13-pos)*6;state.racesRun++;state.bestFinish=state.bestFinish?Math.min(state.bestFinish,pos):pos;if(state.racesRun%3===0)state.sponsorLevel++;updateDivision();persist();renderHud();
      $('#raceStatus').innerHTML=`<strong>${ordinal(pos)} place</strong><span>Friend race complete.</span>`;
      $('#resultCard').innerHTML=`<span class="eyebrow">CHEQUERED FLAG</span><h2>${ordinal(pos)} place</h2><div class="resultMoney"><div><span>Finish money</span><strong>+${money(prize)}</strong></div><div><span>Sponsor bonus</span><strong>+${money(sponsorBonus)}</strong></div></div>`;
      $('#resultCard').classList.remove('hidden');
    }
  }

  document.addEventListener('click',e=>{
    const upgrade=e.target.closest('[data-upgrade]');if(upgrade){buyUpgrade(upgrade.dataset.upgrade);return;}
    const tactic=e.target.closest('[data-tactic]');if(tactic){useTactic(tactic.dataset.tactic);return;}
    const choice=e.target.closest('[data-decision-choice]');if(choice){resolveDecision(Number(choice.dataset.decisionChoice)||0);return;}
  });
  $('#startSeason').addEventListener('click',()=>{networkMode=null;networkLocalId=null;startRace();});
  $('#friendsButton').addEventListener('click',()=>showFriends(true));
  $('#backToRace').addEventListener('click',()=>showFriends(false));
  $('#hostMode').addEventListener('click',()=>{$('#hostPanel').classList.remove('hidden');$('#joinPanel').classList.add('hidden');renderHostPlayers();});
  $('#joinMode').addEventListener('click',()=>{$('#joinPanel').classList.remove('hidden');$('#hostPanel').classList.add('hidden');});
  $('#createInvite').addEventListener('click',createInvite);
  $('#acceptAnswer').addEventListener('click',acceptAnswer);
  $('#makeAnswer').addEventListener('click',makeAnswer);
  $('#startFriendRace').addEventListener('click',startFriendRace);

  window.addEventListener('error',e=>{console.error(e.error||e.message);toast('Gridline hit an error. Refresh if controls stop responding.');});

  renderHud();
  $('#raceLanes').innerHTML=BOT_NAMES.slice(0,11).concat(['You']).map((n,i)=>`<div class="raceLane ${n==='You'?'you':''}"><span class="pos">${i+1}</span><span class="name">${escapeHtml(n)}</span><div class="lane"><i class="carDot"></i></div></div>`).join('');
})();