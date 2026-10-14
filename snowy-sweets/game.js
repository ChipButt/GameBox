/* Snowy Sweets · GameBox. Original match-three engine using existing Kenney artwork. */
(() => {
  "use strict";
  const N = 8;
  // All normal match pieces come from the same Kenney Pixel Platformer Food Expansion.
  // Sprite art is bundled locally; CSS only arranges the artwork and animates it.
  const ART = ["assets/tile_0014.png","assets/candy-cane-complete.png","assets/ice-lolly-complete.png","assets/tile_0058.png","assets/tile_0080.png","assets/tile_0082.png"];
  const NAMES = ["ICED DOUGHNUTS","CANDY CANES","ICE LOLLIES","BISCUITS","ICE CREAMS","FROSTED SUNDAES"];
  const GLASS = "assets/ice_block.png";
  const SPECIAL_NAMES = ["doughnut","cane","lolly","biscuit","icecream","sundae"];
  const SPECIAL_ART = Object.fromEntries(["row","col","burst"].map(kind=>[
    kind,SPECIAL_NAMES.map(name=>"assets/pieces/"+name+"_"+kind+".svg")
  ]));
  const FX_ART = {row:"assets/fx/row.svg",col:"assets/fx/col.svg",burst:"assets/fx/burst.svg"};
  function spriteUrl(piece){return piece.s ? SPECIAL_ART[piece.s]?.[piece.t]||ART[piece.t]:ART[piece.t];}
  const REDUCED_MOTION = !!window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  const LEVELS = [
    {kind:"collect",target:0,goal:8,moves:24},
    {kind:"collect",target:1,goal:12,moves:23},
    {kind:"score",goal:3050,moves:22},
    {kind:"ice",moves:26,pattern:0},
    {kind:"collect",target:2,goal:16,moves:24},
    {kind:"score",goal:4700,moves:22},
    {kind:"ice",moves:30,pattern:1},
    {kind:"collect",target:3,goal:17,moves:22},
    {kind:"score",goal:6600,moves:21},
    {kind:"ice",moves:36,pattern:2},
    {kind:"collect",target:5,goal:20,moves:23},
    {kind:"score",goal:8600,moves:20}
  ];
  const ICE_PATTERNS = [
    [18,19,20,21,34,35],
    [9,14,18,21,27,28,35,36,42,45],
    [9,10,13,14,17,22,25,30,33,38,41,46,49,50,53,54]
  ];
  const $ = (id) => document.getElementById(id);
  const boardEl = $("board");
  // A stable 8×8 DOM and keyed candy nodes replace full-board redraws.
  const spriteEls = new Map();
  const CELL_COUNT = N*N;
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
    clearSpriteNodes();
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
    $("missionIcon").src=level.kind==="collect"?ART[level.target]:level.kind==="ice"?GLASS:ART[0];
    $("movesValue").classList.toggle("lowMoves",moves<=5);
    $("missionProgress").textContent=progress.toLocaleString("en-GB")+" / "+goal.toLocaleString("en-GB");
    $("missionFill").style.width=(Math.min(1,progress/goal)*100)+"%";
    const thresholds=[0.35,0.65,0.9];
    thresholds.forEach((ratio,i)=>$("star"+(i+1)).classList.toggle("earned",progress>=goal*ratio));
  }
  function cellAt(i){return boardEl.children[i];}
  function ensureCells(){
    if(boardEl.children.length===CELL_COUNT)return;
    const frag=document.createDocumentFragment();
    for(let i=0;i<CELL_COUNT;i++){
      const el=document.createElement("button");
      el.type="button";
      el.className="cell";
      el.dataset.index=i;
      el.tabIndex=i===0?0:-1;
      el.setAttribute("role","gridcell");
      frag.appendChild(el);
    }
    boardEl.replaceChildren(frag);
  }
  function spriteFor(piece){
    let node=spriteEls.get(piece.id);
    if(!node){
      node=document.createElement("span");
      node.className="piece";
      node.dataset.pieceId=String(piece.id);
      const img=document.createElement("img");
      img.className="candy"+((piece.t===1||piece.t===2)?" fullLengthCandy":"");
      img.alt="";img.draggable=false;
      node.appendChild(img);
      spriteEls.set(piece.id,node);
    }
    const img=node.querySelector(".candy");
    const src=spriteUrl(piece);
    if(img.getAttribute("src")!==src)img.setAttribute("src",src);
    return node;
  }
  function render(){
    ensureCells();
    for(let i=0;i<CELL_COUNT;i++){
      const cell=cellAt(i),piece=board[i];
      // Move an existing DOM image into its next cell, keeping its identity.
      if(piece){
        const sprite=spriteFor(piece);
        if(sprite.parentElement!==cell)cell.appendChild(sprite);
      }else{
        const old=cell.querySelector(".piece");
        if(old)old.remove();
      }
      cell.classList.toggle("selected",selected===i);
      cell.classList.remove("hint");
      for(const kind of ["row","col","burst"])cell.classList.toggle("power-"+kind,piece?.s===kind);
      cell.setAttribute("aria-label","Row "+(1+Math.floor(i/N))+", column "+(1+i%N)+": "+
        (piece?NAMES[piece.t].toLowerCase():"empty")+(piece?.s?", "+piece.s+" power":"")+(ice[i]?", ice "+ice[i]:""));
      let glass=cell.querySelector(".iceOverlay");
      if(ice[i]){
        if(!glass){
          glass=document.createElement("img");
          glass.className="iceOverlay";glass.src=GLASS;glass.alt="";glass.draggable=false;
          cell.appendChild(glass);
        }
      }else if(glass)glass.remove();
      let badge=cell.querySelector(".iceBadge");
      if(ice[i]>1){
        if(!badge){badge=document.createElement("span");badge.className="iceBadge";cell.appendChild(badge);}
        badge.textContent=String(ice[i]);
      }else if(badge)badge.remove();
    }
  }
  function clearSpriteNodes(){
    for(const el of spriteEls.values())el.remove();
    spriteEls.clear();
  }
  async function clearMatches(indices){
    const effects=[];
    if(!REDUCED_MOTION){
      for(const i of indices){
        const node=board[i]&&spriteEls.get(board[i].id);
        if(!node || !node.animate)continue;
        const a=node.animate([
          {transform:"scale(1)",opacity:1,offset:0},
          {transform:"scale(1.16)",opacity:1,offset:.36},
          {transform:"scale(.15)",opacity:0,offset:1}
        ],{duration:125,easing:"cubic-bezier(.25,.1,.7,.42)",fill:"forwards"});
        effects.push(a);
      }
      if(effects.length)await Promise.all(effects.map(a=>a.finished.catch(()=>{})));
      else await sleep(125);
    }
    for(const a of effects)a.cancel();
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
  function cellStride(){
    ensureCells();
    const a=cellAt(0).getBoundingClientRect();
    const right=cellAt(1).getBoundingClientRect();
    const down=cellAt(N).getBoundingClientRect();
    return {x:right.left-a.left,y:down.top-a.top};
  }
  async function animatePositions(movements,spawn){
    if(REDUCED_MOTION)return;
    const step=cellStride(),effects=[],movingCells=[];
    for(const [index,originalRow] of movements){
      const sprite=board[index]&&spriteEls.get(board[index].id);
      if(!sprite?.animate)continue;
      const cell=cellAt(index);
      cell.classList.add("is-falling");movingCells.push(cell);
      const dist=(originalRow-Math.floor(index/N))*step.y;
      const isNew=spawn.has(index);
      const a=sprite.animate([
        {transform:"translate3d(0,"+dist+"px,0) scale(1)",opacity:isNew?.9:1,offset:0},
        {transform:"translate3d(0,0,0) scale(1.045,.95)",opacity:1,offset:.84},
        {transform:"translate3d(0,0,0) scale(1)",opacity:1,offset:1}
      ],{duration:175+Math.min(115,Math.abs(dist)*.19),
        delay:0,easing:"cubic-bezier(.18,.79,.22,1)",fill:"both"});
      effects.push(a);
    }
    if(effects.length)await Promise.all(effects.map(a=>a.finished.catch(()=>{})));
    for(const a of effects)a.cancel();
    for(const cell of movingCells)cell.classList.remove("is-falling");
  }
  async function animateSwap(a,b,valid,preview=null){
    const na=board[a]&&spriteEls.get(board[a].id);
    const nb=board[b]&&spriteEls.get(board[b].id);
    if(!na||!nb){await sleep(65);return;}
    const ca=cellAt(a),cb=cellAt(b);
    ca.classList.add("is-dragging");cb.classList.add("is-dragging");
    if(REDUCED_MOTION){
      na.style.transform="";nb.style.transform="";
      ca.classList.remove("is-dragging");cb.classList.remove("is-dragging");
      return;
    }
    const step=cellStride(),dx=(b%N-a%N)*step.x,dy=(Math.floor(b/N)-Math.floor(a/N))*step.y;
    const fromA=preview&&preview.b===b?[preview.dx,preview.dy]:[0,0];
    const fromB=preview&&preview.b===b?[-preview.dx*.28,-preview.dy*.28]:[0,0];
    const effects=[];
    const moves=[[na,dx,dy,fromA],[nb,-dx,-dy,fromB]];
    for(const [node,x,y,from] of moves){
      if(!node.animate)continue;
      const initial="translate3d("+from[0]+"px,"+from[1]+"px,0)";
      const dest="translate3d("+x+"px,"+y+"px,0)";
      const frames=valid?[
        {transform:initial+" scale(1)",offset:0},
        {transform:dest+" scale(1.035)",offset:.81},
        {transform:dest+" scale(1)",offset:1}
      ]:(preview&&preview.b===b?[
        {transform:initial,offset:0},
        {transform:"translate3d(0,0,0)",offset:1}
      ]:[
        {transform:initial,offset:0},
        {transform:dest,offset:.44},
        {transform:initial,offset:1}
      ]);
      effects.push(node.animate(frames,{duration:valid?Math.max(95,150-(Math.abs(from[0]+from[1])*1.05)):(preview?115:170),
        easing:"cubic-bezier(.19,.73,.25,1)",fill:"forwards"}));
    }
    if(effects.length)await Promise.all(effects.map(anim=>anim.finished.catch(()=>{})));
    else await sleep(valid?135:160);
    // Cancel just before reparenting. The next render happens in the same task.
    na.style.transform="";nb.style.transform="";
    for(const effect of effects)effect.cancel();
    ca.classList.remove("is-dragging");cb.classList.remove("is-dragging");
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
  function playPowerEffects(activated){
    if(REDUCED_MOTION || !activated.size)return;
    const shell=boardEl.parentElement;
    if(!shell)return;
    const boardRect=boardEl.getBoundingClientRect();
    const shellRect=shell.getBoundingClientRect();
    const cell=cellAt(0).getBoundingClientRect();
    const stride=cellStride();
    for(const index of activated){
      const kind=board[index]?.s;
      if(!FX_ART[kind])continue;
      const x=index%N,y=Math.floor(index/N);
      const flash=document.createElement("img");
      flash.className="power-effect power-effect-"+kind;
      flash.src=FX_ART[kind];flash.alt="";
      flash.setAttribute("aria-hidden","true");
      flash.draggable=false;
      const originX=boardRect.left-shellRect.left;
      const originY=boardRect.top-shellRect.top;
      if(kind==="row"){
        flash.style.left=originX+"px";flash.style.top=(originY+y*stride.y+cell.height*.2)+"px";
        flash.style.width=boardRect.width+"px";flash.style.height=(cell.height*.6)+"px";
      }else if(kind==="col"){
        flash.style.left=(originX+x*stride.x+cell.width*.2)+"px";flash.style.top=originY+"px";
        flash.style.width=(cell.width*.6)+"px";flash.style.height=boardRect.height+"px";
      }else{
        flash.style.left=(originX+x*stride.x-cell.width)+"px";
        flash.style.top=(originY+y*stride.y-cell.height)+"px";
        flash.style.width=cell.width*3+"px";flash.style.height=cell.height*3+"px";
      }
      shell.appendChild(flash);
      const anim=flash.animate(kind==="row"?[
        {transform:"scaleX(.02)",opacity:.8},{transform:"scaleX(1)",opacity:1,offset:.55},{transform:"scaleX(1)",opacity:0}
      ]:kind==="col"?[
        {transform:"scaleY(.02)",opacity:.8},{transform:"scaleY(1)",opacity:1,offset:.55},{transform:"scaleY(1)",opacity:0}
      ]:[
        {transform:"scale(.15) rotate(-12deg)",opacity:0},
        {transform:"scale(1.12) rotate(0deg)",opacity:1,offset:.55},
        {transform:"scale(1.5) rotate(12deg)",opacity:0}
      ],{duration:kind==="burst"?235:185,easing:"cubic-bezier(.18,.73,.3,1)",fill:"forwards"});
      anim.finished.catch(()=>{}).then(()=>{anim.cancel();flash.remove()});
    }
  }
  function playCreatedPowerEffect(indices){
    if(REDUCED_MOTION)return;
    for(const index of indices){
      const piece=board[index],sprite=piece&&spriteEls.get(piece.id);
      if(!piece?.s||!sprite?.animate)continue;
      // Animate only the glow: a second transform animation can fight a
      // simultaneous cascade/clear and make the candy snap on iOS Safari.
      const anim=sprite.animate([
        {filter:"drop-shadow(0 0 1px #fff)"},
        {filter:"drop-shadow(0 0 9px #ffe88a)",offset:.54},
        {filter:"drop-shadow(0 0 2px #ffe88a)"}
      ],{duration:185,easing:"cubic-bezier(.16,.78,.28,1)"});
      anim.finished.catch(()=>{});
    }
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
  async function resolveTurn(a,b,preview=null){
    if(mode!=="playing"||hasOverlay()||!adjacent(a,b))return;
    const currentGeneration=generation;
    mode="busy";selected=-1;
    render();
    swap(a,b);
    const groupsAtSwap=matches(board);
    const forced=[a,b].filter(i=>board[i]?.s);
    swap(a,b);
    const valid=groupsAtSwap.length>0||forced.length>0;
    tone(valid?510:230,.06);
    await animateSwap(a,b,valid,preview);
    if(currentGeneration!==generation)return;
    if(!valid){
      mode="playing";render();return;
    }
    swap(a,b);
    render();
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
      if(chain>2)toast("CHAIN ×"+chain,570);
      if(chain>1 || clear.size>=5)showScoreFloat([...clear][Math.floor(clear.size/2)],clear.size*(80+Math.min(chain,6)*20),chain);
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
      tone(Math.min(920,425+chain*110),.09);
      if(chain===1)vibrate();
      playPowerEffects(activated);
      await clearMatches(clear);
      if(currentGeneration!==generation)return;
      for(const index of clear){
        const old=board[index];
        if(old){const sprite=spriteEls.get(old.id);sprite?.remove();spriteEls.delete(old.id);}
        board[index]=null;
      }
      for(const [index,power] of spawns){
        if(clear.has(index))continue;
        const piece=board[index];
        if(piece)piece.s=power;
      }
      const falling=applyGravity();
      render();
      updateHUD();
      await animatePositions(falling.fall,falling.spawn);
      if(currentGeneration!==generation)return;
      playCreatedPowerEffect(spawns.keys());
      groups=matches(board);
    }while((groups.length>0) && chain<40);
    if(currentGeneration!==generation)return;
    render();updateHUD();
    if(progress>=goal){
      finish(true);
    }else if(moves<=0){
      finish(false);
    }else{
      mode="playing";
      if(!findMove(board)){
        clearSpriteNodes();board=newBoard();render();
        toast("Sweet shuffle!");
      }
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
  function clearDrag(drag){
    if(!drag)return;
    const a=cellAt(drag.i)?.querySelector(".piece");
    if(a)a.style.transform="";
    if(drag.b!=null){
      const b=cellAt(drag.b)?.querySelector(".piece");
      if(b)b.style.transform="";
      cellAt(drag.b)?.classList.remove("is-dragging");
    }
    cellAt(drag.i)?.classList.remove("is-dragging");
  }
  boardEl.addEventListener("pointerdown",e=>{
    const button=e.target.closest(".cell");
    if(!button||mode!=="playing"||hasOverlay())return;
    touch={i:Number(button.dataset.index),x:e.clientX,y:e.clientY,pointer:e.pointerId,
      b:null,dx:0,dy:0,didDrag:false,step:cellStride()};
    try{boardEl.setPointerCapture(e.pointerId)}catch(_){}
  });
  boardEl.addEventListener("pointermove",e=>{
    if(!touch||touch.pointer!==e.pointerId||mode!=="playing")return;
    const drag=touch;
    const rawX=e.clientX-drag.x,rawY=e.clientY-drag.y;
    if(Math.max(Math.abs(rawX),Math.abs(rawY))<7&&!drag.didDrag)return;
    drag.didDrag=true;
    const horizontal=Math.abs(rawX)>=Math.abs(rawY);
    const step=drag.step;
    const candidate=drag.i+(horizontal?(rawX>=0?1:-1):(rawY>=0?N:-N));
    const next=adjacent(drag.i,candidate)?candidate:null;
    if(drag.b!==null&&drag.b!==next){
      const old=cellAt(drag.b)?.querySelector(".piece");
      if(old)old.style.transform="";
      cellAt(drag.b)?.classList.remove("is-dragging");
    }
    drag.b=next;
    if(next===null){const current=cellAt(drag.i)?.querySelector(".piece");if(current)current.style.transform="";drag.dx=0;drag.dy=0;return;}
    drag.dx=horizontal?Math.max(-step.x,Math.min(step.x,rawX)):0;
    drag.dy=horizontal?0:Math.max(-step.y,Math.min(step.y,rawY));
    const a=cellAt(drag.i),b=cellAt(next);
    a.classList.add("is-dragging");b.classList.add("is-dragging");
    const current=a.querySelector(".piece"),other=b.querySelector(".piece");
    if(current)current.style.transform="translate3d("+drag.dx+"px,"+drag.dy+"px,0)";
    if(other)other.style.transform="translate3d("+(-drag.dx*.28)+"px,"+(-drag.dy*.28)+"px,0)";
  });
  boardEl.addEventListener("pointerup",e=>{
    if(!touch||touch.pointer!==e.pointerId)return;
    const drag=touch;touch=null;
    const rawX=e.clientX-drag.x,rawY=e.clientY-drag.y;
    const horizontal=Math.abs(rawX)>=Math.abs(rawY);
    const dest=drag.i+(horizontal?(rawX>=0?1:-1):(rawY>=0?N:-N));
    if(Math.max(Math.abs(rawX),Math.abs(rawY))>17&&adjacent(drag.i,dest)){
      // If the finger took another direction at release, discard earlier preview.
      if(drag.b!==dest)clearDrag(drag);
      resolveTurn(drag.i,dest,drag.b===dest?drag:null);
    }else{
      clearDrag(drag);
      if(!drag.didDrag)clickCell(drag.i);
    }
  });
  boardEl.addEventListener("pointercancel",()=>{clearDrag(touch);touch=null;});
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
    possible.forEach(i=>cellAt(i)?.classList.add("hint"));
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
  // Preload dedicated static artwork during the level-introduction screen.
  for(const artwork of Object.values(SPECIAL_ART).flat()){
    const img=new Image();img.src=artwork;
  }
  for(const artwork of Object.values(FX_ART)){
    const img=new Image();img.src=artwork;
  }
})();
