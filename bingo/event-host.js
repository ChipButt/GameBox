/* Bingo In — single-operator event dashboard, cash ledger and local audio. */
(()=>{
'use strict';
const core=window.GameBoxBingo,M=window.BingoEventModel;
if(!core||!M){console.error('Bingo In needs the Bingo engine and accounting model.');return}
const KEY='gamebox.bingo.host-event.v1',DISPLAY_KEY='gamebox.bingo.public.v1';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=p=>'£'+M.pounds(p),stageLabel={line:'1 Line',two:'2 Lines',house:'Full House'};
let event=loadEvent(),tab='run',toastTimer=null,tracks=[],trackIndex=-1,objectUrl='',lastDrawCount=0,lastDrawGame=0;
const audio=new Audio();audio.preload='none';audio.volume=.6;
audio.addEventListener('ended',()=>playTrack(trackIndex+1));
audio.addEventListener('error',()=>notice('Audio could not be played. Try another file.'));
let channel=null;try{channel=new BroadcastChannel('gamebox-bingo-public')}catch{}
function loadEvent(){try{const d=JSON.parse(localStorage.getItem(KEY));if(d?.version===1&&Array.isArray(d.sales)&&Array.isArray(d.payouts)&&d.gameCount===5)return d}catch{}return M.createEvent()}
function save(){localStorage.setItem(KEY,JSON.stringify(event));publish();render()}
function notice(msg){const el=document.getElementById('hostNotice');if(!el)return;el.textContent=msg;el.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{el.hidden=true},5500)}
function snapshot(){return core.snapshot()}
function stage(){return snapshot().winTarget}
function remaining(){return M.stageRemaining(event,event.gameIndex,stage())}
function accounting(){return M.reconcile(event)}
function publish(){
 const s=snapshot(),pot=M.allocate(event)[event.gameIndex]||{total:0,line:0,two:0,house:0};
 const publicState={title:event.title,venue:event.venue,game:event.gameIndex+1,gameCount:event.gameCount,stage:stageLabel[s.winTarget],
  number:s.called.at(-1)||null,called:s.called,stagePotPence:pot[s.winTarget]||0,gamePotPence:pot.total,
  started:s.started,finished:!!event.finishedAt,updatedAt:Date.now()};
 try{localStorage.setItem(DISPLAY_KEY,JSON.stringify(publicState))}catch{}
 try{channel?.postMessage(publicState)}catch{}
}
const host=document.createElement('section');
host.id='bingoEventHost';
host.className='hostDashboard';
host.innerHTML='<div class="hostBanner"><div><span class="hostEyebrow">BINGO IN! · EVENT HOST</span><h2 id="hostTitle">Your bingo night</h2><p id="hostContext">Five games · complete host control</p></div><div class="hostBannerActions"><button id="audienceDisplay" class="hostButton">Open audience screen ↗</button><button id="eventReport" class="hostButton">End-of-night report</button></div></div><div id="hostNotice" class="hostNotice" role="status" hidden></div><div class="hostTabs"><button data-host-tab="run">Run the night</button><button data-host-tab="tickets">Tickets & cards</button><button data-host-tab="prizes">Prizes & reports</button><button data-host-tab="settings">Event setup</button></div><div id="hostMain"></div>';
const master=document.getElementById('masterScreen');
master.querySelector('.masterHeader').after(host);
master.classList.add('withHost');
function render(){
 if(!document.getElementById('hostMain'))return;
 const state=snapshot(),s=stage(),a=accounting(),pot=a.gamePots[event.gameIndex]||{line:0,two:0,house:0,total:0};
 document.getElementById('hostTitle').textContent=event.title;
 document.getElementById('hostContext').textContent=[event.venue,'Game '+(event.gameIndex+1)+' of 5',event.finishedAt?'Finished':event.started?'In progress':'Ready to host'].filter(Boolean).join(' · ');
 master.dataset.hostTab=tab;
 document.querySelectorAll('[data-host-tab]').forEach(b=>b.classList.toggle('active',b.dataset.hostTab===tab));
 const main=document.getElementById('hostMain');
 const banner='<div class="hostMetrics">'+
  '<div class="hostMetric"><small>Ticket takings</small><strong>'+money(a.takingsPence)+'</strong></div>'+
  '<div class="hostMetric"><small>Prizes paid</small><strong>'+money(a.paidPence)+'</strong></div>'+
  '<div class="hostMetric"><small>Still to pay out</small><strong>'+money(a.outstandingPence)+'</strong></div>'+
  '<div class="hostMetric"><small>Current game fund</small><strong>'+money(pot.total)+'</strong></div></div>';
 const steps='<div class="hostSteps">'+Array.from({length:5},(_,i)=>'<span class="'+(i===event.gameIndex?'now':i<event.gameIndex?'done':'')+'">Game '+(i+1)+'</span>').join('')+'</div>';
 if(tab==='run'){
  const rem=M.stageRemaining(event,event.gameIndex,s);
  main.innerHTML=banner+steps+
    '<div class="hostColumns"><section class="hostCard hostFeature"><span class="hostEyebrow">NOW PLAYING</span><h3>Game '+(event.gameIndex+1)+' · '+stageLabel[s]+'</h3>'+
    '<div class="hostBall">'+(state.called.at(-1)||'—')+'</div><p>'+state.called.length+' of 90 numbers called</p>'+
    '<button class="hostButton hostPrimary hostBig" data-host-action="draw" '+(event.finishedAt?'disabled':'')+'>Draw next number</button>'+
    '<div class="hostButtonRow"><button class="hostButton" data-host-action="advance" '+(event.finishedAt||s==='house'?'disabled':'')+'>Next prize stage →</button>'+
    '<button class="hostButton" data-host-action="undo">Undo last number</button></div>'+
    '<div class="hostPrize"><span>Current '+stageLabel[s]+' allocation</span><strong>'+money(pot[s])+'</strong><small>'+money(rem)+' remains to be paid</small></div>'+
    '<button class="hostButton hostNext" data-host-action="next-game" '+(event.finishedAt?'disabled':'')+'>'+(event.gameIndex===4?'Finish evening':'Complete game → Next game')+'</button>'+
    '</section><section class="hostCard"><span class="hostEyebrow">CHECK & PAY A WINNER</span><h3>Check the card serial</h3>'+
    '<form id="hostPayout"><label>Winning ticket serial<input name="cardId" placeholder="CI-017" autocomplete="off" required></label>'+
    '<label>Winner / table<input name="winner" placeholder="e.g. Table 4 — Alex" maxlength="80" required></label>'+
    '<label>Prize to pay (£)<input name="amount" type="number" min=".01" step=".01" value="'+M.pounds(rem)+'" required></label>'+
    '<p class="hostMuted">Checks the serial against all drawn numbers before paying. Split winners by recording separate payments.</p>'+
    '<button class="hostButton hostPrimary" type="submit" '+(!rem?'disabled':'')+'>Verify claim & record cash paid</button></form>'+
    '<div id="hostPayoutStatus" role="status"></div>'+
    '<div class="hostMiniInfo"><strong>Remember</strong><p>Mark any numbers you call through the microphone; keep ticket sales and prize cash separate from your venue hosting fee.</p></div></section></div>'+
    musicMarkup();
 }else if(tab==='tickets'){
   const sales=[...event.sales].reverse();
   main.innerHTML=banner+'<div class="hostColumns"><section class="hostCard"><span class="hostEyebrow">TICKET DESK</span><h3>Sell a five-game ticket book</h3>'+
    '<p class="hostMuted">One reusable numbered card covers all five games. Each book costs <strong>'+money(event.ticketPricePence*5)+'</strong>. Record cash collected and hand out its printed card.</p>'+
    '<form id="hostSale"><label>Player / seat reference<input name="name" placeholder="e.g. Alex — Table 3" maxlength="80" required></label>'+
    '<label>How many tickets for this player?<select name="quantity">'+Array.from({length:5},(_,i)=>'<option value="'+(i+1)+'">'+(i+1)+' — '+money((i+1)*event.ticketPricePence*5)+'</option>').join('')+'</select></label>'+
    '<button type="submit" class="hostButton hostPrimary" '+(event.started||event.finishedAt?'disabled':'')+'>Record cash sale & issue cards</button></form>'+
    (event.started?'<p class="hostWarning">Ticket sales are locked after the first number is drawn.</p>':'')+
    '<div class="hostMiniInfo"><strong>'+core.availableCards().length+' unsold cards available</strong><p>Print the library first, then issue the exact serial numbers shown in the sale ledger.</p>'+
    '<button class="hostButton" data-host-action="print">Print / save ticket cards</button> '+
    '<button class="hostButton" data-host-action="more-cards">Create 24 more cards</button></div></section>'+
    '<section class="hostCard"><span class="hostEyebrow">ISSUED CARDS</span><h3>'+event.sales.reduce((a,x)=>a+x.quantity,0)+' cards sold</h3>'+
    '<div class="hostLedger">'+(sales.length?sales.map(x=>'<div class="hostLedgerRow"><div><strong>'+esc(x.name)+'</strong><small>'+esc(x.cardIds.join(', '))+'</small></div><div class="hostSoldAction"><strong>'+money(x.collectedPence)+'</strong>'+(event.started?'':'<button class="hostButton" data-host-action="refund" data-sale-id="'+esc(x.id)+'">Void / refund</button>')+'</div></div>').join(''):'<p class="hostMuted">No sales recorded yet.</p>')+'</div>'+
    '<p class="hostMuted">When checking winners, enter the CI-xxx serial printed on the card.</p></section></div>';
 }else if(tab==='prizes'){
   const pots=a.gamePots;
   main.innerHTML=banner+
    '<div class="hostCard"><h3>All five game prize pots</h3><div class="hostTableScroll"><table class="hostTable"><thead><tr><th>Game</th><th>1 line</th><th>2 lines</th><th>Full house</th><th>Total</th></tr></thead><tbody>'+
    pots.map(p=>'<tr><th>'+p.game+'</th><td>'+money(p.line)+'</td><td>'+money(p.two)+'</td><td>'+money(p.house)+'</td><td><strong>'+money(p.total)+'</strong></td></tr>').join('')+
    '</tbody></table></div><p class="hostMuted">Every penny collected is allocated to prizes. Stage totals are split 20% / 30% / remaining 50%, with pennies balanced to the full house.</p></div>'+
    '<div class="hostCard"><div class="hostCardHeader"><h3>Confirmed prize payments</h3><button class="hostButton" data-host-action="export">Export CSV</button></div>'+
    '<div class="hostLedger">'+(event.payouts.length?event.payouts.map(p=>'<div class="hostLedgerRow"><div><strong>Game '+(p.gameIndex+1)+' · '+stageLabel[p.stage]+'</strong><small>'+esc(p.winner)+' · '+esc(p.cardId)+'</small></div><strong>'+money(p.amountPence)+'</strong></div>').join(''):'<p class="hostMuted">No prizes recorded yet.</p>')+'</div></div>';
 }else{
   main.innerHTML='<div class="hostColumns"><section class="hostCard"><span class="hostEyebrow">BEFORE THE PUB OPENS</span><h3>Set up your evening</h3>'+
    '<form id="hostSettings"><label>Evening name<input name="title" maxlength="80" value="'+esc(event.title)+'" required></label>'+
    '<label>Pub / venue<input name="venue" maxlength="90" value="'+esc(event.venue)+'" placeholder="e.g. The King\'s Arms"></label>'+
    '<label>Event date<input type="date" name="date" value="'+esc(event.date)+'"></label>'+
    '<label>Pub hosting fee (£, minimum £150)<input type="number" name="hostingFee" min="150" step="1" value="'+M.pounds(event.hostingFeePence??15000)+'" required></label>'+
    '<label>Ticket price, per game (£)<select name="ticketPrice">'+[50,100,150,200,250,300,400,500].map(p=>'<option value="'+p+'" '+(event.ticketPricePence===p?'selected':'')+'>'+money(p)+'</option>').join('')+'</select></label>'+
    '<div class="hostMiniInfo"><strong>Five games included</strong><p>Each printed card is reused for all five separately drawn games. Full-book price is five times the per-game ticket price.</p></div>'+
    '<button class="hostButton hostPrimary" type="submit" '+(event.sales.length||event.started?'disabled':'')+'>Save event details</button></form>'+
    '<div class="hostMiniInfo"><strong>Caller voice</strong><p>Use your microphone for a traditional hosted evening. Alternatively, let your Mac speak the numbers.</p><label class="hostCheck"><input id="hostVoice" type="checkbox" '+(document.getElementById('speakCalls').checked?'checked':'')+'> Computer reads called numbers aloud</label></div>'+
    '<div class="hostMiniInfo"><strong>Start a completely new event</strong><p>This clears live calls and ticket assignments. Export your report first; local records for the current event are replaced.</p><button class="hostButton hostDanger" data-host-action="reset">New event (clear this evening)</button></div></section>'+
    '<section class="hostCard"><span class="hostEyebrow">RUNNING CHECKLIST</span><h3>Ready for the pub?</h3>'+
    '<ul class="hostChecklist"><li>Bring your speaker, microphone, Mac, power lead and cash tin</li><li>Print enough reusable numbered cards and bring pens</li><li>Check your venue\'s bingo arrangements and permitted stakes</li><li>Check you have permission for every uploaded music track to be played publicly</li><li>Record each sale before drawing the first number</li><li>Open the audience display on the venue screen</li><li>Reconcile all cash prizes and export the report afterwards</li></ul></section></div>';
 }
}
function musicMarkup(){
 return '<section class="hostCard hostMusic"><div class="hostCardHeader"><div><span class="hostEyebrow">YOUR MUSIC · STORED ON THIS DEVICE</span><h3>Interval music</h3></div><label class="hostButton hostUpload">Add licensed tracks<input id="hostMusicUpload" type="file" multiple accept="audio/*" hidden></label></div>'+
 '<div class="hostMusicControls"><button class="hostButton hostPrimary" data-host-action="music-toggle">'+(audio.paused?'▶ Play':'Ⅱ Pause')+'</button>'+
 '<button class="hostButton" data-host-action="music-next">Next track →</button>'+
 '<label class="hostVolume">Volume <input type="range" id="hostVolume" min="0" max="100" value="'+Math.round(audio.volume*100)+'"></label>'+
 '<label class="hostCheck"><input id="hostPauseOnCall" type="checkbox" '+(localStorage.getItem('gamebox.bingo.pause-music')!=='no'?'checked':'')+'> Pause music when a number is called</label></div>'+
 '<p class="hostMuted" id="hostMusicNow">'+(tracks[trackIndex]?'Playing: '+esc(tracks[trackIndex].name):'No track selected. Upload tracks you have permission to play publicly.')+'</p>'+
 '<div class="hostTrackList">'+tracks.map((t,i)=>'<div class="hostTrack"><span>'+(i===trackIndex?'♪ ':'')+esc(t.name)+'</span><span><button class="hostButton" data-host-action="music-play" data-index="'+i+'">Play</button><button class="hostButton" data-host-action="music-remove" data-index="'+i+'" aria-label="Remove '+esc(t.name)+'">×</button></span></div>').join('')+'</div></section>';
}
function csvCell(v){const s=String(v??'');return /[,"\r\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s}
function makeCSV(){
 const lines=[['BINGO IN EVENT REPORT',event.title],['Venue',event.venue],['Date',event.date],['Game count',event.gameCount],[],['Venue hosting fee (separate invoice)',M.pounds(event.hostingFeePence??15000)],['Total stakes collected',M.pounds(accounting().takingsPence)],['Cash prizes paid',M.pounds(accounting().paidPence)],['Unpaid prizes',M.pounds(accounting().outstandingPence)],[],['TICKET SALES'],['Player','Cards','Card serials','Cash collected']];
 event.sales.forEach(s=>lines.push([s.name,s.quantity,s.cardIds.join(' '),M.pounds(s.collectedPence)]));
 lines.push([],['VOIDED / REFUNDED SALES'],['Player','Cards','Refund paid']);(event.refunds||[]).forEach(s=>lines.push([s.name,s.cardIds.join(' '),M.pounds(s.collectedPence)]));
 lines.push([],['PRIZES PAID'],['Game','Prize','Winner','Card serial','Amount']);
 event.payouts.forEach(p=>lines.push([p.gameIndex+1,stageLabel[p.stage],p.winner,p.cardId,M.pounds(p.amountPence)]));
 lines.push([],['GAME PRIZE ALLOCATION'],['Game','1 Line','2 Lines','Full House','Total']);
 M.allocate(event).forEach(p=>lines.push([p.game,M.pounds(p.line),M.pounds(p.two),M.pounds(p.house),M.pounds(p.total)]));
 return lines.map(row=>row.map(csvCell).join(',')).join('\r\n')+'\r\n';
}
function downloadReport(){
 const url=URL.createObjectURL(new Blob([makeCSV()],{type:'text/csv;charset=utf-8'}));
 const a=document.createElement('a');a.href=url;a.download='bingo-in-'+(event.date||'event')+'-accounts.csv';document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),5000);
}
function printReport(){
 const a=accounting();const w=window.open('','_blank');
 if(!w){notice('Allow pop-ups to print the report, or use Export CSV.');return}
 const rows=event.payouts.map(p=>'<tr><td>'+(p.gameIndex+1)+'</td><td>'+stageLabel[p.stage]+'</td><td>'+esc(p.winner)+'</td><td>'+esc(p.cardId)+'</td><td>'+money(p.amountPence)+'</td></tr>').join('');
 w.document.open();
 w.document.write('<!doctype html><html><head><title>Bingo In event report</title><style>body{font:15px Arial;margin:32px;color:#17283b}h1{font-size:27px}table{border-collapse:collapse;width:100%;margin-top:16px}th,td{border-bottom:1px solid #ddd;padding:10px 5px;text-align:left}section{margin:22px 0}strong{font-weight:800}.summary{display:flex;gap:32px;flex-wrap:wrap}.muted{color:#667}</style></head><body><h1>BINGO IN! — End-of-night report</h1><p>'+esc(event.title)+' · '+esc(event.venue)+' · '+esc(event.date)+'</p><div class="summary"><p><strong>Stakes: '+money(a.takingsPence)+'</strong></p><p><strong>Prizes paid: '+money(a.paidPence)+'</strong></p><p><strong>Unpaid: '+money(a.outstandingPence)+'</strong></p></div><p class="muted">Venue hosting fee (invoiced separately): '+money(event.hostingFeePence??15000)+'. This fee is not bingo stake or prize money.</p><section><h2>Prize payments</h2><table><thead><tr><th>Game</th><th>Prize</th><th>Winner</th><th>Card</th><th>Amount</th></tr></thead><tbody>'+rows+'</tbody></table></section><section><h2>Sales</h2><table><thead><tr><th>Player / seat</th><th>Card serials</th><th>Cash collected</th></tr></thead><tbody>'+event.sales.map(s=>'<tr><td>'+esc(s.name)+'</td><td>'+esc(s.cardIds.join(', '))+'</td><td>'+money(s.collectedPence)+'</td></tr>').join('')+'</tbody></table></section></body></html>');
 w.document.close();w.focus();setTimeout(()=>w.print(),200);
}
async function db(){
 return new Promise((resolve,reject)=>{const r=indexedDB.open('bingo-in-local-music',1);r.onupgradeneeded=()=>r.result.createObjectStore('tracks',{keyPath:'id'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
}
async function store(op,value){
 const database=await db();return new Promise((resolve,reject)=>{const tx=database.transaction('tracks',op==='list'?'readonly':'readwrite'),os=tx.objectStore('tracks');
 const request=op==='list'?os.getAll():op==='put'?os.put(value):os.delete(value);
 request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);tx.oncomplete=()=>database.close()});
}
async function loadTracks(){try{tracks=(await store('list')).sort((a,b)=>a.added-b.added);render()}catch(e){notice('This browser could not load saved music; check private browsing/storage permissions.')}}
async function addTracks(files){
 let added=0;for(const file of files){
 if(!(file.type.startsWith('audio/')||/\.(mp3|wav|m4a|ogg|flac|aac)$/i.test(file.name))){notice('Skipped a non-audio file: '+file.name);continue}
 try{await store('put',{id:'music-'+Date.now()+'-'+Math.random().toString(36).slice(2,8),name:file.name,blob:file,added:Date.now()+added});added++}
 catch(e){notice('Music storage full or unavailable. Try smaller files.');break}
 }await loadTracks();if(added)notice(added+' track'+(added===1?'':'s')+' saved on this device, not uploaded to a server.');
}
async function playTrack(index){
 if(!tracks.length){notice('Add your own properly licensed audio files first.');return}
 if(index>=tracks.length)index=0;
 if(index<0)index=0;
 if(objectUrl){URL.revokeObjectURL(objectUrl);objectUrl=''}
 trackIndex=index;audio.pause();objectUrl=URL.createObjectURL(tracks[index].blob);audio.src=objectUrl;
 try{await audio.play();render()}catch(e){notice('Tap Play to allow this browser to play audio.')}
}
function toggleMusic(){if(audio.paused){if(trackIndex<0)playTrack(0);else audio.play().then(render).catch(()=>notice('Browser blocked playback; tap Play again.'))}else{audio.pause();render()}}
async function removeTrack(index){
 if(index===trackIndex){audio.pause();audio.removeAttribute('src');if(objectUrl)URL.revokeObjectURL(objectUrl);objectUrl='';trackIndex=-1}
 await store('delete',tracks[index].id);await loadTracks();
}
function markCall(){
 const s=snapshot(),newNumber=s.called.length>lastDrawCount;
 lastDrawCount=s.called.length;lastDrawGame=event.gameIndex;
 if(!event.started&&s.called.length){event.started=true;event.firstCallAt=new Date().toISOString();save()}
 else publish();
 if(newNumber&&localStorage.getItem('gamebox.bingo.pause-music')!=='no'&&!audio.paused){audio.pause();render()}
}
function showError(e){notice(e?.message||String(e))}
host.addEventListener('click',async e=>{
 const tabButton=e.target.closest('.hostTabs > button[data-host-tab]');
 if(tabButton){tab=tabButton.dataset.hostTab;render();return}
 const b=e.target.closest('[data-host-action]');if(!b)return;
 const action=b.dataset.hostAction;
 try{
  if(action==='draw'){if(event.finishedAt)throw Error('This event is finished.');document.getElementById('drawNumber').click()}
  if(action==='undo')document.getElementById('undoCall').click();
  if(action==='advance'){if(stage()==='house')throw Error('Full House is the final stage. Complete this game instead.');if(remaining()>0)throw Error('Record the '+money(remaining())+' '+stageLabel[stage()]+' prize payout before advancing.');document.getElementById('advancePrize').click()}
  if(action==='print')core.print();
  if(action==='more-cards'){core.addCards(24);render();notice('Added 24 unique ticket cards. Print them before selling.')}
  if(action==='export')downloadReport();
  if(action==='refund'){
    if(event.started||event.finishedAt)throw Error('Refunds are only possible before the first ball is called.');
    const sale=event.sales.find(x=>x.id===b.dataset.saleId);
    if(!sale)throw Error('Sale not found.');
    if(!window.confirm('Void '+sale.cardIds.join(', ')+' and refund '+money(sale.collectedPence)+' to '+sale.name+'?'))return;
    for(const serial of sale.cardIds){
      const issue=snapshot().assignments.find(x=>x.cardId===serial);
      if(issue)core.returnIssue(issue.id);
    }
    event.sales=event.sales.filter(x=>x.id!==sale.id);
    (event.refunds||(event.refunds=[])).push({...sale,refundedAt:new Date().toISOString()});
    save();notice('Sale voided. Return '+money(sale.collectedPence)+' cash to '+sale.name+'.');
  }
  if(action==='music-toggle')toggleMusic();
  if(action==='music-next')playTrack(trackIndex+1);
  if(action==='music-play')playTrack(Number(b.dataset.index));
  if(action==='music-remove')await removeTrack(Number(b.dataset.index));
  if(action==='next-game'){
    const r=accounting().gamePots[event.gameIndex];
    const remaining=['line','two','house'].reduce((n,k)=>n+M.stageRemaining(event,event.gameIndex,k),0);
    if(!event.started||!snapshot().called.length)throw Error('Call some numbers to start this game first.');
    if(remaining)throw Error('Record the '+money(remaining)+' outstanding prize payments for this game before moving on.');
    if(event.gameIndex===4){if(!window.confirm('Finish this bingo evening and prepare the report?'))return;event.finishedAt=new Date().toISOString();save();printReport();notice('Event complete. The account balances with no unpaid prizes.')}
    else{core.nextGame();event.finishedGames.push(event.gameIndex);event.gameIndex++;save();notice('Game '+(event.gameIndex+1)+' ready. Existing sold cards remain valid.')}
  }
  if(action==='reset'){
    if(!window.confirm('Create a NEW evening? Current sales and prize records will be replaced. Export a report first.'))return;
    event=M.createEvent();core.freshEvent();core.setPrice(1);lastDrawCount=0;lastDrawGame=0;tab='settings';save();notice('New bingo evening created. Set the venue and ticket price.')
  }
 }catch(err){showError(err)}
});
host.addEventListener('submit',e=>{
 const form=e.target;
 if(!['hostSale','hostPayout','hostSettings'].includes(form.id))return;
 e.preventDefault();
 const data=new FormData(form);
 try{
  if(form.id==='hostSettings'){
    if(event.sales.length||event.started)throw Error('Event setup is locked after tickets are sold.');
    event.title=String(data.get('title')||'Bingo In!').trim();event.venue=String(data.get('venue')||'').trim();event.date=String(data.get('date')||'');
    event.ticketPricePence=Number(data.get('ticketPrice'));event.hostingFeePence=M.toPence(data.get('hostingFee'));if(event.hostingFeePence<15000)throw Error('The minimum hosting fee is £150.');core.setPrice(event.ticketPricePence/100);
    document.getElementById('eventName').value=event.title;document.getElementById('eventName').dispatchEvent(new Event('change'));
    save();notice('Evening configured. Go to Tickets & cards to start selling.');
  }
  if(form.id==='hostSale'){
    if(event.started||event.finishedAt)throw Error('Ticket sales are locked.');
    const name=String(data.get('name')||'').trim(),quantity=Number(data.get('quantity'));
    const ids=core.availableCards().slice(0,quantity);
    // Dry run prevents issuing a card if the transaction would be disallowed.
    const draft=JSON.parse(JSON.stringify(event));M.recordSale(draft,{name,quantity,cardIds:ids});
    const issued=[];
    try{
      for(const id of ids){
        const ownerId='event-buyer-'+name.toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,45);
        const response=core.issue(name,ownerId,id);
        if(!response.ok)throw Error(response.reason||'Could not issue '+id);
        const a=snapshot().assignments.find(x=>x.cardId===id);
        if(a)issued.push(a.id);
      }
      M.recordSale(event,{name,quantity,cardIds:ids});save();
      notice('Collected '+money(quantity*event.ticketPricePence*5)+'. Issue '+ids.join(', ')+'.');
    }catch(err){issued.forEach(id=>core.returnIssue(id));throw err}
  }
  if(form.id==='hostPayout'){
    const cardId=String(data.get('cardId')||'').trim().toUpperCase(),winner=String(data.get('winner')||'').trim();
    const validIssued=event.sales.some(s=>s.cardIds.includes(cardId));
    if(!validIssued)throw Error('This serial has not been sold for the current event.');
    const result=core.verify(cardId,stage());
    if(!result||!result.valid)throw Error('The claimed '+stageLabel[stage()]+' is NOT valid yet for '+cardId+'. Check the called numbers.');
    const p=M.recordPayout(event,{gameIndex:event.gameIndex,stage:stage(),cardId,winner,amount:data.get('amount')});
    save();notice('VALID claim. Record '+money(p.amountPence)+' paid to '+winner+' in cash.');
  }
 }catch(err){showError(err)}
});
host.addEventListener('change',async e=>{
 if(e.target.id==='hostMusicUpload'){await addTracks([...e.target.files]);e.target.value=''}
 if(e.target.id==='hostVoice'){document.getElementById('speakCalls').checked=e.target.checked;localStorage.setItem('bingoin.speak',e.target.checked?'yes':'no')}
 if(e.target.id==='hostPauseOnCall')localStorage.setItem('gamebox.bingo.pause-music',e.target.checked?'yes':'no');
 if(e.target.id==='hostVolume')audio.volume=Number(e.target.value)/100;
});
host.addEventListener('input',e=>{if(e.target.id==='hostVolume')audio.volume=Number(e.target.value)/100});
document.getElementById('audienceDisplay').onclick=()=>{
 const displayUrl=new URL('display.html',new URL('bingo/',document.baseURI)).href;
 const windowRef=window.open(displayUrl,'bingo-in-audience','width=1100,height=720');
 if(!windowRef)notice('Allow pop-ups or open bingo/display.html on the projector browser.');
 publish();
};
document.getElementById('eventReport').onclick=printReport;
document.getElementById('newSession').addEventListener('click',e=>{
 e.preventDefault();e.stopImmediatePropagation();notice('Use Event setup → New event, or Complete game → Next game. This prevents losing the five-game ledger.');
},true);
window.addEventListener('gamebox-bingo-change',()=>{markCall();render()});
window.addEventListener('storage',e=>{if(e.key===KEY){event=loadEvent();render();publish()}});
document.getElementById('speakCalls').checked=localStorage.getItem('bingoin.speak')==='yes';
render();publish();loadTracks();
if(typeof navigator!=='undefined'&&'serviceWorker' in navigator){
  // The /bingo/ route is cached for unreliable pub Wi-Fi. Offline music stays
  // in local IndexedDB; external digital-player networking is not offline.
  navigator.serviceWorker.register(new URL('sw.js',new URL('bingo/',document.baseURI)).href).catch(()=>{});
}
})();