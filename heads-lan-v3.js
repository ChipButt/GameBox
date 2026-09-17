(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const lines=v=>[...new Set(String(v||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean))];
  if(!window.GameBoxLAN?.Session)return;

  const net={active:false,role:null,localName:'',players:[],current:0,scores:{},config:null,reportedTurn:-1,live:null,session:null};

  function status(text,strong=''){
    const el=$('headsLanStatus');
    if(el)el.innerHTML=strong?`<strong>${esc(strong)}</strong> ${esc(text)}`:esc(text);
  }

  function installUI(){
    const setup=$('headsSetup');
    if(!setup||$('headsLanPanel'))return;
    const panel=document.createElement('section');
    panel.id='headsLanPanel';
    panel.className='panel headsLanPanel';
    panel.innerHTML=`<div><h3>Play on separate phones</h3><p>Connect over the same Wi-Fi. Each player's phone becomes active for their round while everyone else sees whose turn it is and the live card.</p></div>
      <div class="headsLanModes"><button class="btn secondary" id="headsLanHostMode">Host Wi-Fi game</button><button class="btn secondary" id="headsLanJoinMode">Join Wi-Fi game</button></div>
      <div id="headsLanStatus" class="headsLanStatus">Normal single-phone play is ready.</div>
      <div id="headsLanHost" class="headsLanControls hidden">
        <label>Host player name<input id="headsLanHostName" maxlength="24" placeholder="e.g. Chip"></label>
        <button class="btn secondary" id="headsLanCreateInvite">Create friend invite</button>
        <label>Invite code<textarea id="headsLanOffer" readonly></textarea></label>
        <label>Friend answer<textarea id="headsLanAnswerIn" placeholder="Paste their answer"></textarea></label>
        <button class="btn secondary" id="headsLanAcceptAnswer">Connect friend</button>
        <div id="headsLanDevices" class="headsLanDevices"></div>
        <button class="btn good" id="headsLanStart">Start Wi-Fi game</button>
        <span class="sub">Create a separate invite for each additional phone.</span>
      </div>
      <div id="headsLanJoin" class="headsLanControls hidden">
        <label>Your name<input id="headsLanJoinName" maxlength="24" placeholder="e.g. Jess"></label>
        <label>Host invite<textarea id="headsLanOfferIn" placeholder="Paste the host invite"></textarea></label>
        <button class="btn secondary" id="headsLanMakeAnswer">Create answer</button>
        <label>Answer code<textarea id="headsLanAnswerOut" readonly></textarea></label>
        <span class="sub">Send the answer back to the host and keep this page open.</span>
      </div>`;
    setup.querySelector('.headsSetupMain')?.appendChild(panel);
    const arena=$('headsArena');
    if(arena){
      const spectator=document.createElement('div');
      spectator.id='headsSpectator';
      spectator.className='headsSpectator hidden';
      arena.appendChild(spectator);
    }
  }

  function customDecks(){try{return JSON.parse(localStorage.getItem('gamebox.heads.custom.v1'))||[]}catch{return[]}}
  function categoryLabels(){return[...document.querySelectorAll('#headsCategories .headsCategory')].map(label=>({label,input:label.querySelector('input'),name:label.querySelector('.headsCategoryCard strong')?.textContent?.trim()||''}))}
  function selectedCategoryNames(){return categoryLabels().filter(x=>x.input?.checked).map(x=>x.name).filter(Boolean)}

  function collectConfig(){
    const selected=selectedCategoryNames();
    const custom=customDecks();
    const customNames=new Set(custom.map(x=>x.name));
    const customCards=[];
    selected.filter(name=>customNames.has(name)).forEach(name=>{const deck=custom.find(x=>x.name===name);if(deck)customCards.push(...(deck.cards||[]))});
    const builtinSelected=selected.filter(name=>!customNames.has(name));
    const activeTimer=document.querySelector('#headsTimer button.active');
    return{
      duration:Math.max(10,parseInt(activeTimer?.textContent,10)||30),
      roundName:$('headsRoundName')?.value.trim()||'Wi-Fi Round',
      categories:builtinSelected,
      extraCards:[...new Set([...lines($('headsExtraCards')?.value),...customCards])]
    };
  }

  function applyConfig(config,playerName){
    if(!config)return;
    const wanted=new Set(config.categories||[]);
    categoryLabels().forEach(({input,name})=>{
      if(!input)return;
      const should= wanted.has(name);
      if(input.checked!==should){input.checked=should;input.dispatchEvent(new Event('change',{bubbles:true}))}
    });
    if($('headsExtraCards'))$('headsExtraCards').value=(config.extraCards||[]).join('\n');
    if($('headsRoundName'))$('headsRoundName').value=config.roundName||'Wi-Fi Round';
    if($('headsPlayerName'))$('headsPlayerName').value=playerName||net.localName;
    [...document.querySelectorAll('#headsTimer button')].find(b=>parseInt(b.textContent,10)===Number(config.duration))?.click();
  }

  function renderDevices(){
    const wrap=$('headsLanDevices');
    if(!wrap)return;
    let html='';
    const host=$('headsLanHostName')?.value.trim()||net.localName;
    if(host)html+=`<div class="headsLanDevice"><strong>${esc(host)}</strong><span>This phone · Host</span></div>`;
    (net.session?.peers()||[]).forEach(p=>{html+=`<div class="headsLanDevice"><strong>${esc(p.meta?.name||'Connected phone')}</strong><span>${p.meta?.name?'Ready':'Waiting for name'}</span></div>`});
    wrap.innerHTML=html||'<span class="sub">No friend phones connected yet.</span>';
    syncStartButton();
  }

  function syncStartButton(){const b=$('headsLanStart');if(b)b.disabled=!(net.role==='host'&&$ ('headsLanHostName')?.value.trim()&&(net.session?.peers()||[]).some(p=>p.meta?.name))}

  function showMode(mode){
    net.role=mode;
    $('headsLanHost').classList.toggle('hidden',mode!=='host');
    $('headsLanJoin').classList.toggle('hidden',mode!=='client');
    if(mode==='host'){
      const existing=$('headsPlayerName')?.value.trim();
      if(existing&&!$('headsLanHostName').value)$('headsLanHostName').value=existing;
      status('Create an invite for each friend.','Host:');
    }else status('Enter your name, paste the host invite, then create an answer.','Join:');
  }

  async function createInvite(){try{$('headsLanOffer').value=await net.session.createHostOffer();status('Send this invite to one friend.','Invite ready:')}catch(err){console.error(err);status('Could not create an invite.','Error:')}}
  async function acceptAnswer(){try{await net.session.acceptHostAnswer($('headsLanAnswerIn').value);$('headsLanAnswerIn').value='';$('headsLanOffer').value='';status('Waiting for the friend phone to connect.','Connecting:')}catch(err){console.error(err);status('That answer code was not accepted.','Error:')}}
  async function makeAnswer(){
    const name=$('headsLanJoinName').value.trim();
    if(!name)return status('Enter your name first.');
    net.localName=name;
    try{$('headsLanAnswerOut').value=await net.session.createClientAnswer($('headsLanOfferIn').value);status('Send this answer back to the host.','Answer ready:')}catch(err){console.error(err);status('That invite code could not be read.','Error:')}
  }

  function hostNames(){
    const host=$('headsLanHostName').value.trim();
    return[host,...(net.session?.peers()||[]).map(p=>p.meta?.name).filter(Boolean)].filter((n,i,a)=>n&&a.findIndex(x=>x.toLowerCase()===n.toLowerCase())===i);
  }

  function networkState(){return{players:net.players,current:net.current,scores:net.scores,config:net.config,live:net.live}}

  function startNetworkGame(){
    const config=collectConfig(),players=hostNames();
    if(players.length<2)return status('Connect at least one friend first.');
    if(!(config.categories.length||config.extraCards.length))return status('Select a category or add cards before starting.');
    net.active=true;net.role='host';net.localName=players[0];net.players=players;net.current=0;net.scores={};net.config=config;net.reportedTurn=-1;net.live=null;
    net.session.broadcast({type:'heads-session-start',state:networkState()});
    renderNetworkTurn();
  }

  function receiveState(s){
    net.active=true;net.players=Array.isArray(s.players)?s.players:[];net.current=Number(s.current)||0;net.scores=s.scores||{};net.config=s.config||null;net.live=s.live||null;net.reportedTurn=-1;
    renderNetworkTurn();
  }

  function hideInternalPlayPanels(){['headsReady','headsCountdownWrap','headsLive','headsResults'].forEach(id=>$(id)?.classList.add('hidden'))}
  function showSpectator(){
    try{$('headsResultsSetup')?.click()}catch{}
    $('headsSetup')?.classList.add('hidden');
    $('headsPlay')?.classList.remove('hidden');
    hideInternalPlayPanels();
    $('headsSpectator')?.classList.remove('hidden');
  }
  function scoreRows(){return net.players.map(name=>{const r=net.scores[name];return`<div class="headsMultiScoreRow ${name===net.localName?'you':''}"><strong>${esc(name)}</strong><span>${r?`${r.correct} correct`:'Waiting'}</span><span>${r?`${r.passes} passed`:''}</span></div>`}).join('')}

  function renderNetworkTurn(){
    if(!net.active)return;
    const currentName=net.players[net.current];
    if(!currentName){renderFinal();return}
    const mine=currentName.toLowerCase()===net.localName.toLowerCase();
    if(mine){
      $('headsSpectator')?.classList.add('hidden');
      applyConfig(net.config,net.localName);
      $('headsSetup')?.classList.remove('hidden');
      $('headsPlay')?.classList.add('hidden');
      setTimeout(()=>$('headsStart')?.click(),0);
    }else{
      showSpectator();
      const live=net.live&&net.live.player===currentName?net.live:null;
      $('headsSpectator').innerHTML=`<div class="spectatorPlayer">${esc(currentName)}'s turn</div><p>${live?'Currently guessing':'Getting ready on their phone…'}</p><div class="spectatorWord">${esc(live?.word||'—')}</div><div class="spectatorScore">${esc(live?.score||'')}</div><div class="headsMultiScore">${scoreRows()}</div>`;
    }
  }

  function renderFinal(){
    showSpectator();
    const ranked=net.players.slice().sort((a,b)=>(net.scores[b]?.correct||0)-(net.scores[a]?.correct||0));
    $('headsSpectator').innerHTML=`<div class="spectatorPlayer">Wi-Fi game complete</div><p>Every player has finished a round.</p><div class="headsMultiScore">${ranked.map((name,i)=>{const r=net.scores[name]||{correct:0,passes:0};return`<div class="headsMultiScoreRow ${name===net.localName?'you':''}"><strong>${i+1}. ${esc(name)}</strong><span>${r.correct} correct</span><span>${r.passes} passed</span></div>`}).join('')}</div><button class="btn secondary" id="headsLanFinish">Back to setup</button>`;
    $('headsLanFinish').onclick=()=>{net.active=false;try{$('headsResultsSetup')?.click()}catch{}$('headsSpectator').classList.add('hidden');$('headsPlay').classList.add('hidden');$('headsSetup').classList.remove('hidden')};
  }

  function sendLive(){
    if(!net.active)return;
    const current=net.players[net.current];
    if(!current||current.toLowerCase()!==net.localName.toLowerCase()||$('headsLive')?.classList.contains('hidden'))return;
    const live={player:net.localName,word:$('headsWord')?.textContent||'',category:$('headsCardCategory')?.textContent||'',score:$('headsLiveScore')?.textContent||''};
    net.live=live;
    if(net.role==='host')net.session.broadcast({type:'heads-live',live});else net.session.sendToHost({type:'heads-live',live});
  }

  function reportRound(){
    if(!net.active||net.reportedTurn===net.current)return;
    const current=net.players[net.current];
    if(!current||current.toLowerCase()!==net.localName.toLowerCase()||$('headsResults')?.classList.contains('hidden'))return;
    net.reportedTurn=net.current;
    const result={player:net.localName,correct:parseInt($('headsCorrectCount')?.textContent,10)||0,passes:parseInt($('headsPassCount')?.textContent,10)||0};
    if(net.role==='host')completeRound(result);
    else{
      net.session.sendToHost({type:'heads-round-complete',result});
      showSpectator();
      $('headsSpectator').innerHTML=`<div class="spectatorPlayer">Round sent</div><p>${result.correct} correct · ${result.passes} passed</p><p>Waiting for the next turn…</p><div class="headsMultiScore">${scoreRows()}</div>`;
    }
  }

  function completeRound(result){
    const current=net.players[net.current];
    if(!current||result.player.toLowerCase()!==current.toLowerCase())return;
    net.scores[current]={correct:Number(result.correct)||0,passes:Number(result.passes)||0};
    net.current++;net.live=null;net.reportedTurn=-1;
    if(net.current>=net.players.length){net.session.broadcast({type:'heads-complete',state:networkState()});renderFinal()}
    else{net.session.broadcast({type:'heads-turn',state:networkState()});renderNetworkTurn()}
  }

  function handleMessage(msg,source){
    if(source.role==='host'){
      if(msg.type==='hello'){
        const name=String(msg.name||'').trim();
        if(!name)return;
        const used=hostNames().map(n=>n.toLowerCase());
        if(used.includes(name.toLowerCase())){net.session.sendToPeer(source.peer,{type:'heads-name-error',message:'That player name is already connected.'});return}
        source.peer.meta.name=name;
        net.session.sendToPeer(source.peer,{type:'heads-assigned',name});
        renderDevices();
        return;
      }
      if(msg.type==='heads-live'&&net.active&&source.peer.meta?.name===net.players[net.current]){
        net.live=msg.live;
        net.session.peers().forEach(p=>{if(p!==source.peer)net.session.sendToPeer(p,{type:'heads-live',live:msg.live})});
        renderNetworkTurn();
        return;
      }
      if(msg.type==='heads-round-complete'&&net.active&&source.peer.meta?.name===net.players[net.current]){completeRound(msg.result);return}
    }else{
      if(msg.type==='heads-assigned'){net.localName=msg.name;status(`Connected as ${msg.name}. Waiting for the host to start.`,'Ready:');return}
      if(msg.type==='heads-name-error'){status(msg.message||'That name could not be used.','Name error:');return}
      if(msg.type==='heads-session-start'||msg.type==='heads-turn'){receiveState(msg.state);return}
      if(msg.type==='heads-live'){net.live=msg.live;renderNetworkTurn();return}
      if(msg.type==='heads-complete'){net.players=msg.state.players||net.players;net.scores=msg.state.scores||net.scores;net.current=net.players.length;net.active=true;renderFinal();return}
    }
  }

  function wire(){
    installUI();
    net.session=new GameBoxLAN.Session({game:'heads-up',onStatus:t=>status(t,net.role==='host'?'Host:':'Join:'),onPeersChanged:()=>{if(net.role==='client'&&net.session.clientChannel?.readyState==='open'){const name=$('headsLanJoinName').value.trim();if(name)net.session.sendToHost({type:'hello',name})}renderDevices()},onMessage:handleMessage});
    $('headsLanHostMode').onclick=()=>showMode('host');
    $('headsLanJoinMode').onclick=()=>showMode('client');
    $('headsLanCreateInvite').onclick=createInvite;
    $('headsLanAcceptAnswer').onclick=acceptAnswer;
    $('headsLanMakeAnswer').onclick=makeAnswer;
    $('headsLanStart').onclick=startNetworkGame;
    $('headsLanHostName').oninput=syncStartButton;
    $('headsLanJoinName').onchange=()=>{if(net.role==='client'&&net.session.clientChannel?.readyState==='open')net.session.sendToHost({type:'hello',name:$('headsLanJoinName').value.trim()})};
    const resultObserver=new MutationObserver(()=>setTimeout(reportRound,0));
    if($('headsResults'))resultObserver.observe($('headsResults'),{attributes:true,attributeFilter:['class']});
    const liveObserver=new MutationObserver(()=>setTimeout(sendLive,0));
    if($('headsWord'))liveObserver.observe($('headsWord'),{childList:true,characterData:true,subtree:true});
    if($('headsLiveScore'))liveObserver.observe($('headsLiveScore'),{childList:true,characterData:true,subtree:true});
    renderDevices();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire);else wire();
})();