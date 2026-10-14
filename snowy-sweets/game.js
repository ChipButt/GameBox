/* Snowy Sweets · GameBox. Original match-three engine using existing Kenney artwork. */
(() => {
  "use strict";
  const N = 8;
  // All normal match pieces come from the same Kenney Pixel Platformer Food Expansion.
  // Sprite art is bundled locally; CSS only arranges the artwork and animates it.
  const ART = ["0014","0041","0043","0056","0058","0108"].map(n=>"assets/tile_"+n+".png");
  const NAMES = ["ICED DONUTS","CANDY CANES","ICE POPS","MARSHMALLOWS","BISCUITS","FROSTED CAKES"];
  const GLASS = "assets/ice_block.png";
  const REDUCED_MOTION = !!window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  const POWER_STRIPE = "assets/tile_0057.png";
  const GIFT = "../assets/gamebox/kenney/2d/Platformer Assets Holiday/present_small_red.png";
  const LEVELS = [
    {kind:"collect",target:0,goal:8,moves:24},
    {kind:"collect",target:1,goal:12,moves:23},
    {kind:"score",goal:1900,moves:22},
    {kind:"ice",moves:28,pattern:0},
    {kind:"collect",target:2,goal:16,moves:24},
    {kind:"score",goal:3600,moves:22},
    {kind:"ice",moves:32,pattern:1},
    {kind:"collect",target:3,goal:17,moves:22},
    {kind:"score",goal:5300,moves:21},
    {kind:"ice",moves:37,pattern:2},
    {kind:"collect",target:5,goal:20,moves:23},
    {kind:"score",goal:7500,moves:20}
  ];
  const ICE_PATTERNS = [
    [9,14,17,22,41,46,49,54],
    [9,10,13,14,17,22,25,30,33,38,41,46,49,54],
    [9,10,11,12,13,14,17,22,25,30,33,38,41,46,49,50,53,54]
  ];
  const $ = (id) => document.getElementById(id);
  const boardEl = $("board");
  let audioContext = null, touch = null, selected = -1, currentLevel = 0;
  let board = [], ice = [], goal = 0, progress = 0, moves = 0, score = 0;
  let mode = "ready", toastTimer = null, lastFocused = null, generation = 0;
  let settings = {last:0,best:0,sound:true,stars:{},levelBest:{}};
  try {
    const data = JSON.parse(localStorage.getItem("gamebox-snowy-sweets-v1") || "{}");
    if (data && typeof data === "object") settings = Object.assign(settings,data);
  } catch (_) {}
  if (!settings.stars || typeof settings.stars !== "object") settings.stars = {};
  if (!settings.levelBest || typeof settings.levelBest !== "object") settings.levelBest = {};
  const save = () => {try{localStorage.setItem("gamebox-snowy-sweets-v1",JSON.stringify(settings));}catch(_){}};
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve,ms));
  const rand = (n) => Math.floor(Math.random()*n);
  let candyIdentity=0;
  const makeSweet = () => ({id:++candyIdentity,t:rand(ART.length),s:null});
  const neighbours = (i) => {
    const x=i%N,y=Math.floor(i/N),out=[];
    if(x>0)out.push(i-1);if(x<N-1)out.push(i+1);
    if(y>0)out.push(i-N);if(y<N-1)out.push(i+N);
    return out;
  };
  const adjacent = (a,b) => a>=0 && b>=0 && neighbours(a).includes(b);
  const swap = (a,b) => {const t=board[a];board[a]=board[b];board[b]=t;};
  function matches(cells) {
    const groups=[];
    for(let y=0;y<N;y++){
      let x=0;
      while(x<N){
        const start=x,kind=cells[y*N+x]?.t;
        if(kind===undefined){x++;continue;}
        while(x<N && cells[y*N+x]?.t===kind)x++;
        if(x-start>=3)groups.push({axis:"row",indexes:Array.from({length:x-start},(_,k)=>y*N+start+k)});
      }
    }
    for(let x=0;x<N;x++){
      let y=0;
      while(y<N){
        const start=y,kind=cells[y*N+x]?.t;
        if(kind===undefined){y++;continue;}
        while(y<N && cells[y*N+x]?.t===kind)y++;
        if(y-start>=3)groups.push({axis:"col",indexes:Array.from({length:y-start},(_,k)=>(start+k)*N+x)});
      }
    }
    return groups;
  }
  function findMove(cells) {
    for(let i=0;i<N*N;i++){
      if(cells[i]?.s){const ns=neighbours(i);if(ns.length)return [i,ns[0]];}
      for(const j of [i+1,i+N]){
        if(j>=N*N || !adjacent(i,j))continue;
        const temp=cells[i];cells[i]=cells[j];cells[j]=temp;
        const good=matches(cells).length>0;
        cells[j]=cells[i];cells[i]=temp;
        if(good)return [i,j];
      }
    }
    return null;
  }
  function newBoard() {
    let test=[];
    for(let attempt=0;attempt<100;attempt++){
      test=[];
      for(let i=0;i<N*N;i++){
        const invalid=[];
        if(i%N>=2 && test[i-1].t===test[i-2].t)invalid.push(test[i-1].t);
        if(i>=2*N && test[i-N].t===test[i-2*N].t)invalid.push(test[i-N].t);
        const choices=Array.from({length:ART.length},(_,t)=>t).filter(t=>!invalid.includes(t));
        test.push({id:++candyIdentity,t:choices[rand(choices.length)],s:null});
      }
      if(findMove(test))return test;
    }
    return test;
  }
  function goalAmount(config) {
    if(config.kind!=="ice")return config.goal;
    return ice.reduce((sum,n)=>sum+n,0);
  }
  function startLevel(index) {
    generation++;
    currentLevel=Math.max(0,Math.min(LEVELS.length-1,index));
    settings.last=currentLevel;save();
    const config=LEVELS[currentLevel];
    board=newBoard();
    ice=Array(N*N).fill(0);
    if(config.kind==="ice"){
      for(const cell of ICE_PATTERNS[config.pattern]){
        ice[cell]=config.pattern===2 && cell%3===0 ? 2:1;
      }
    }
    goal=goalAmount(config);
    progress=0;moves=config.moves;score=0;selected=-1;touch=null;mode="playing";
    hideAll();render();updateHUD();
  }
  function updateHUD() {
    const level=LEVELS[currentLevel];
    $("levelNumber").textContent=String(currentLevel+1).padStart(2,"0");
    $("movesValue").textContent=moves;
    $("scoreValue").textContent=score.toLocaleString("en-GB");
    $("bestValue").textContent=(settings.levelBest[currentLevel]||0).toLocaleString("en-GB");
    let label="";
    if(level.kind==="collect")label="COLLECT "+NAMES[level.target];
    else if(level.kind==="ice")label="BREAK ALL THE ICE";
    else label="REACH THE SCORE";
    $("missionLabel").textContent=label;
    $("missionIcon").src=level.kind==="collect"?ART[level.target]:level.kind==="ice"?GLASS:GIFT;
    $("movesValue").classList.toggle("lowMoves",moves<=5);
    $("missionProgress").textContent=progress.toLocaleString("en-GB")+" / "+goal.toLocaleString("en-GB");
    $("missionFill").style.width=(Math.min(1,progress/goal)*100)+"%";
    const thresholds=[0.35,0.65,0.9];
    thresholds.forEach((ratio,i)=>$("star"+(i+1)).classList.toggle("earned",progress>=goal*ratio));
  }
  function render(flags={}) {
    const fragment=document.createDocumentFragment();
    for(let i=0;i<N*N;i++){
      const el=document.createElement("button");
      el.type="button";el.className="cell";el.dataset.index=i;
      el.setAttribute("role","gridcell");
      el.setAttribute("aria-label", "Row "+(1+Math.floor(i/N))+", column "+(1+i%N)+": "+(board[i] ? NAMES[board[i].t].toLowerCase() : "empty")+(ice[i]?", ice "+ice[i]:""));
      el.tabIndex=i===0 ? 0 : -1;
      if(i===selected)el.classList.add("selected");
      if(flags.spawn?.has(i))el.classList.add("spawn");
      if(flags.swap?.has(i))el.classList.add("swap");
      if(flags.clearing?.has(i))el.classList.add("clearing");
      if(board[i]){
        const piece=document.createElement("span");
        piece.className="piece";
        piece.dataset.pieceId=String(board[i].id);
        const art=document.createElement("img");
        art.className="candy";
        art.src=board[i].s==="burst"?GIFT:ART[board[i].t];
        art.alt="";art.draggable=false;
        piece.appendChild(art);
        if(board[i].s){
          el.classList.add("power-"+board[i].s);
          if(board[i].s!=="burst"){
            const mark=document.createElement("img");
            mark.className="powerStripe";mark.src=POWER_STRIPE;mark.alt="";
            mark.draggable=false;piece.appendChild(mark);
          }else{
            const mark=document.createElement("img");
            mark.className="powerBurstMark";mark.src=POWER_STRIPE;mark.alt="";
            piece.appendChild(mark);
          }
        }
        el.appendChild(piece);
      }
      if(flags.clearing?.has(i)){
        for(let j=0;j<3;j++){
          const particle=document.createElement("img");
          particle.src=POWER_STRIPE;particle.alt="";particle.className="popParticle";
          particle.style.setProperty("--direction",String((j*120+i*41)%360)+"deg");
          particle.style.setProperty("--distance",String(20+((i+j)%5)*5)+"px");
          particle.style.setProperty("--delay",String(j*24)+"ms");
          el.appendChild(particle);
        }
      }
      if(ice[i]>0){
        const glass=document.createElement("img");
        glass.src=GLASS;glass.alt="";glass.className="iceOverlay";el.appendChild(glass);
        el.classList.add("ice"+ice[i]);
        if(ice[i]>1){const badge=document.createElement("span");badge.className="iceBadge";badge.textContent=ice[i];el.appendChild(badge);}
      }
      fragment.appendChild(el);
    }
    boardEl.replaceChildren(fragment);
  }
  function toast(message,ms=1100) {
    const el=$("gameToast");clearTimeout(toastTimer);
    el.textContent=message;el.classList.add("show");
    toastTimer=setTimeout(()=>el.classList.remove("show"),ms);
  }
  function tone(freq=500,duration=.09,shape="sine") {
    if(!settings.sound)return;
    try{
      const Audio=window.AudioContext||window.webkitAudioContext;
      if(!Audio)return;
      if(!audioContext)audioContext=new Audio();
      if(audioContext.state==="suspended")audioContext.resume();
      const start=audioContext.currentTime;
      const osc=audioContext.createOscillator(),gain=audioContext.createGain();
      osc.type=shape;osc.frequency.setValueAtTime(freq,start);
      gain.gain.setValueAtTime(.055,start);
      gain.gain.exponentialRampToValueAtTime(.001,start+duration);
      osc.connect(gain);gain.connect(audioContext.destination);
      osc.start(start);osc.stop(start+duration);
    }catch(_){}
  }
  function vibrate(){try{navigator.vibrate?.(16);}catch(_){}}
  function hideAll() {
    document.querySelectorAll(".sheet").forEach(el=>el.classList.remove("show"));
  }
  function show(id) {
    if(mode==="busy")return;
    hideAll();$(id).classList.add("show");
    lastFocused=document.activeElement;
  }
  function closeSheet(id){
    $(id).classList.remove("show");
    lastFocused?.focus?.({preventScroll:true});
  }
  function hasOverlay(){return !!document.querySelector(".sheet.show");}
  function applyGravity() {
    const fall=new Map(),spawn=new Set();
    for(let x=0;x<N;x++){
      const kept=[];
      for(let y=N-1;y>=0;y--){
        const piece=board[y*N+x];
        if(piece)kept.push({piece,row:y});
      }
      for(let y=N-1;y>=0;y--){
        const index=y*N+x;
        const old=kept[N-1-y];
        if(old){
          board[index]=old.piece;
          if(old.row!==y)fall.set(index,old.row);
        }else{
          board[index]=makeSweet();
          spawn.add(index);
          fall.set(index,y-(N-kept.length)-1);
        }
      }
    }
    return {fall,spawn};
  }
  function animatePositions(movements,spawn){
    const size=(boardEl.children[0]?.getBoundingClientRect?.().height||42)+2;
    const promises=[];
    if(REDUCED_MOTION)return Promise.resolve();
    for(const [index,originalRow] of movements){
      const cell=boardEl.children[index],piece=cell?.querySelector(".piece");
      if(!piece?.animate)continue;
      const destinationRow=Math.floor(index/N);
      const travel=(originalRow-destinationRow)*size;
      cell.style.zIndex="5";
      const animation=piece.animate([
        {transform:"translate3d(0,"+travel+"px,0) scale(.97)",opacity:spawn.has(index)?.85:1},
        {transform:"translate3d(0,0,0) scale(1.08)",offset:.83,opacity:1},
        {transform:"translate3d(0,0,0) scale(1)",opacity:1}
      ],{duration:235+Math.min(105,Math.abs(travel)*.21),delay:(index%N)*9,easing:"cubic-bezier(.21,.72,.24,1)",fill:"both"});
      promises.push(animation.finished.catch(()=>{}).then(()=>{cell.style.zIndex="";}));
    }
    return Promise.all(promises);
  }
  function animateSwap(a,b,reverse=false){
    if(REDUCED_MOTION)return sleep(70);
    const first=boardEl.children[a],second=boardEl.children[b];
    const pieceA=first?.querySelector(".piece"),pieceB=second?.querySelector(".piece");
    if(!pieceA?.animate || !pieceB?.animate)return sleep(170);
    const rectA=first.getBoundingClientRect(),rectB=second.getBoundingClientRect();
    const dx=rectB.left-rectA.left,dy=rectB.top-rectA.top;
    const both=[[pieceA,dx,dy],[pieceB,-dx,-dy]];
    return Promise.all(both.map(([piece,x,y])=>{
      const initial=reverse?"translate3d("+x+"px,"+y+"px,0)":"translate3d(0,0,0)";
      const ending=reverse?"translate3d(0,0,0)":"translate3d("+x+"px,"+y+"px,0)";
      const anim=piece.animate([
        {transform:initial+" scale(1)",filter:"brightness(1)"},
        {transform:ending+" scale(1.12)",offset:.68,filter:"brightness(1.14)"},
        {transform:ending+" scale(1)",filter:"brightness(1)"}
      ],{duration:reverse?155:198,easing:"cubic-bezier(.24,.76,.28,1)",fill:"forwards"});
      return anim.finished.catch(()=>{});
    }));
  }
  function showScoreFloat(index,points,chain){
    if(REDUCED_MOTION)return;
    const cell=boardEl.children[index];
    const root=$("board").parentElement;
    if(!cell || !root || !cell.getBoundingClientRect)return;
    const bounds=cell.getBoundingClientRect(),holder=root.getBoundingClientRect();
    const el=document.createElement("span");
    el.className="scoreFloat";
    el.textContent=chain>1?"COMBO ×"+chain:"+"+points;
    el.style.left=(bounds.left-holder.left+bounds.width/2)+"px";
    el.style.top=(bounds.top-holder.top+bounds.height/2)+"px";
    el.style.color=chain>1?"#ffe873":"#ffffff";
    el.addEventListener("animationend",()=>el.remove(),{once:true});
    root.appendChild(el);
    setTimeout(()=>el.remove(),850);
  }
  function collectPower(index,cleared,queue,activated) {
    const piece=board[index];
    if(!piece?.s || activated.has(index))return;
    activated.add(index);
    const x=index%N,y=Math.floor(index/N);
    if(piece.s==="row")for(let col=0;col<N;col++)queue.push(y*N+col);
    else if(piece.s==="col")for(let row=0;row<N;row++)queue.push(row*N+x);
    else {
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
        if(x+dx>=0&&x+dx<N&&y+dy>=0&&y+dy<N)queue.push((y+dy)*N+x+dx);
      }
    }
  }
  async function resolveTurn(a,b) {
    if(mode!=="playing" || hasOverlay() || !adjacent(a,b))return;
    const myGeneration=generation;
    mode="busy";selected=-1;
    tone(470,.045);
    swap(a,b);
    const groupsAtSwap=matches(board);
    const forced=[a,b].filter(i=>board[i]?.s);
    swap(a,b);
    // Keep the old pieces on screen while they actually move, not an instant re-render.
    await animateSwap(a,b);
    if(myGeneration!==generation)return;
    if(!groupsAtSwap.length && !forced.length){
      await animateSwap(a,b,true);
      if(myGeneration!==generation)return;
      mode="playing";render();tone(170,.08);toast("Try another match!");
      return;
    }
    swap(a,b);
    render({swap:new Set([a,b])});
    let groups=groupsAtSwap;
    moves--;
    updateHUD();
    let chain=0, clearedTotal=0;
    do{
      chain++;
      const clear=new Set(groups.flatMap(g=>g.indexes));
      const spawns=new Map();
      for(const group of groups){
        if(group.indexes.length<4)continue;
        const candidate=group.indexes.includes(b)?b:group.indexes.includes(a)?a:group.indexes[Math.floor(group.indexes.length/2)];
        const crossing=groups.some(other=>other!==group && other.indexes.includes(candidate));
        const special=group.indexes.length>=5 || crossing?"burst":group.axis;
        if(!spawns.has(candidate)||special==="burst")spawns.set(candidate,special);
      }
      const queue=Array.from(clear).concat(chain===1?forced:[]);
      const activated=new Set();
      for(let qi=0;qi<queue.length;qi++){
        const at=queue[qi];
        if(at<0||at>=N*N)continue;
        if(!clear.has(at))clear.add(at);
        collectPower(at,clear,queue,activated);
      }
      // A freshly made power sweet remains on the board until matched later.
      for(const index of spawns.keys())if(!activated.has(index))clear.delete(index);
      if(!clear.size)break;
      clearedTotal+=clear.size;
      if(chain>1)toast("Sweet chain ×"+chain,530);
      showScoreFloat([...clear][Math.floor(clear.size/2)],clear.size*(80+Math.min(chain,6)*20),chain);
      for(const index of clear){
        if(ice[index]>0){
          ice[index]--;
          if(LEVELS[currentLevel].kind==="ice")progress++;
        }
        if(LEVELS[currentLevel].kind==="collect" && board[index]?.t===LEVELS[currentLevel].target)progress++;
        score+=60+Math.min(chain,6)*20;
      }
      score+=Math.max(0,clear.size-3)*15;
      if(LEVELS[currentLevel].kind==="score")progress=score;
      render({clearing:clear});
      tone(Math.min(920,425+chain*110),.1);
      if(chain===1)vibrate();
      await sleep(205);
      if(myGeneration!==generation)return;
      for(const index of clear)board[index]=null;
      for(const [index,power] of spawns){
        if(clear.has(index))continue;
        const piece=board[index];
        if(piece)piece.s=power;
      }
      const falling=applyGravity();
      render();
      updateHUD();
      await animatePositions(falling.fall,falling.spawn);
      if(myGeneration!==generation)return;
      groups=matches(board);
    }while((groups.length>0) && chain<40);
    if(myGeneration!==generation)return;
    render();updateHUD();
    if(progress>=goal){
      finish(true);
    }else if(moves<=0){
      finish(false);
    }else{
      mode="playing";
      if(!findMove(board)){
        board=newBoard();render({spawn:new Set(Array.from({length:N*N},(_,i)=>i))});
        toast("Sweet shuffle!");
      }else if(chain>2)toast("Wonderful combo!");
    }
  }
  function starsEarned(){
    const original=LEVELS[currentLevel].moves;
    const share=moves/original;
    return share>=.43?3:share>=.18?2:1;
  }
  function finish(won){
    mode=won?"won":"lost";
    settings.best=Math.max(settings.best,score);
    settings.levelBest[currentLevel]=Math.max(settings.levelBest[currentLevel]||0,score);
    if(won){
      const stars=starsEarned();
      settings.stars[currentLevel]=Math.max(settings.stars[currentLevel]||0,stars);
    }
    save();
    updateHUD();
    $("resultEyebrow").textContent=won?"SWEET SUCCESS":"OUT OF MOVES";
    $("resultTitle").textContent=won?"Level Complete!":"Snowed In!";
    $("resultStars").textContent=won?"★".repeat(starsEarned())+"☆".repeat(3-starsEarned()):"☆☆☆";
    $("resultScore").textContent=score.toLocaleString("en-GB");
    $("resultBest").textContent=settings.levelBest[currentLevel].toLocaleString("en-GB");
    $("resultMessage").textContent=won?"Goal cleared with "+moves+" moves left!":"You were "+Math.max(0,goal-progress).toLocaleString("en-GB")+" away from the goal.";
    $("resultPrimaryLabel").textContent=won?(currentLevel===LEVELS.length-1?"All Levels Complete":"Next Level"):"Try Again";
    if(won){tone(760,.16);setTimeout(()=>tone(960,.22),130);}
    else tone(190,.26,"triangle");
    show("resultSheet");
  }
  function clickCell(i) {
    if(mode!=="playing"||hasOverlay())return;
    if(selected===i){selected=-1;render();return;}
    if(selected>=0 && adjacent(selected,i)){
      const a=selected;selected=-1;resolveTurn(a,i);return;
    }
    selected=i;render();tone(400,.045);
  }
  boardEl.addEventListener("pointerdown",e=>{
    const button=e.target.closest(".cell");
    if(!button || mode!=="playing" || hasOverlay())return;
    touch={i:Number(button.dataset.index),x:e.clientX,y:e.clientY,pointer:e.pointerId};
    try{boardEl.setPointerCapture(e.pointerId);}catch(_){}
  });
  boardEl.addEventListener("pointerup",e=>{
    if(!touch||touch.pointer!==e.pointerId)return;
    const {i,x,y}=touch;touch=null;
    const dx=e.clientX-x,dy=e.clientY-y;
    if(Math.abs(dx)>20||Math.abs(dy)>20){
      let j=i;
      if(Math.abs(dx)>Math.abs(dy))j+=dx>0?1:-1;
      else j+=dy>0?N:-N;
      if(adjacent(i,j))resolveTurn(i,j);else clickCell(i);
    }else clickCell(i);
  });
  boardEl.addEventListener("pointercancel",()=>touch=null);
  boardEl.addEventListener("keydown",e=>{
    const b=e.target.closest(".cell");if(!b)return;
    const i=Number(b.dataset.index),next={ArrowRight:i+1,ArrowLeft:i-1,ArrowDown:i+N,ArrowUp:i-N}[e.key];
    if(e.key==="Enter"||e.key===" "){e.preventDefault();clickCell(i);}
    if(next!==undefined && adjacent(i,next)){
      e.preventDefault();boardEl.querySelectorAll(".cell").forEach(el=>el.tabIndex=-1);
      const target=boardEl.querySelector('[data-index="'+next+'"]');
      target.tabIndex=0;target.focus({preventScroll:true});
    }
  });
  function hint() {
    if(mode!=="playing"||hasOverlay())return;
    const possible=findMove(board);
    if(!possible)return toast("Shuffling...");
    selected=-1;render();
    possible.forEach(i=>boardEl.children[i]?.classList.add("hint"));
    toast("Try these sweets");
    tone(700,.08);
  }
  function showLevels() {
    if(mode==="busy")return;
    $("levelsGrid").replaceChildren();
    LEVELS.forEach((level,i)=>{
      const button=document.createElement("button");button.type="button";
      button.className="levelChoice"+(i===currentLevel?" current":"");
      button.innerHTML="<span>"+String(i+1).padStart(2,"0")+"</span><small>"+("★".repeat(settings.stars[i]||0)||"PLAY")+"</small>";
      button.setAttribute("aria-label","Level "+(i+1)+(settings.stars[i]?", "+settings.stars[i]+" stars":""));
      button.addEventListener("click",()=>startLevel(i));
      $("levelsGrid").appendChild(button);
    });
    show("levelsSheet");
  }
  const bind=(id,fn)=>$(id).addEventListener("click",fn);
  bind("playButton",()=>{closeSheet("startSheet");mode="playing";});
  bind("startLevels",showLevels);
  bind("menuButton",()=>{if(mode==="playing"||mode==="won"||mode==="lost"){ $("menuBest").textContent=settings.best.toLocaleString("en-GB");show("menuSheet");}});
  bind("closeMenu",()=>closeSheet("menuSheet"));
  bind("soundButton",()=>{
    settings.sound=!settings.sound;save();
    $("soundLabel").textContent="Sound "+(settings.sound?"On":"Off");
    $("soundButton").querySelector("img").src="../assets/gamebox/kenney/icons/Game Icons/White/2x/"+(settings.sound?"audioOn":"audioOff")+".png";
    tone(640,.1);
  });
  bind("helpButton",()=>show("helpSheet"));
  bind("closeHelp",()=>closeSheet("helpSheet"));
  bind("levelPicker",showLevels);bind("openLevels",showLevels);
  bind("closeLevels",()=>closeSheet("levelsSheet"));
  bind("restartQuick",()=>{if(mode!=="busy"&&!hasOverlay())startLevel(currentLevel);});
  bind("menuRestart",()=>startLevel(currentLevel));
  bind("hintButton",hint);
  bind("resultPrimary",()=>{
    if(mode==="won" && currentLevel===LEVELS.length-1)showLevels();
    else if(mode==="won")startLevel(currentLevel+1);
    else startLevel(currentLevel);
  });
  bind("resultRetry",()=>startLevel(currentLevel));
  bind("resultLevels",showLevels);
  window.addEventListener("keydown",e=>{
    if(e.key==="Escape"){
      if($("helpSheet").classList.contains("show"))show("menuSheet");
      else if($("levelsSheet").classList.contains("show"))closeSheet("levelsSheet");
      else if($("menuSheet").classList.contains("show"))closeSheet("menuSheet");
    }
  });
  startLevel(Math.min(LEVELS.length-1,Math.max(0,Number(settings.last)||0)));
  $("startSheet").classList.add("show");
  $("playButton").textContent="Play Level "+(currentLevel+1);
  $("soundLabel").textContent="Sound "+(settings.sound?"On":"Off");
  $("soundButton").querySelector("img").src="../assets/gamebox/kenney/icons/Game Icons/White/2x/"+(settings.sound?"audioOn":"audioOff")+".png";
})();
