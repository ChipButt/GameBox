/* Santa Invaders — original Christmas arcade game for GameBox. No external libraries. */
(() => {
  "use strict";
  const W = 360, H = 600, ROWS = 4, COLS = 8;
  const $ = id => document.getElementById(id);
  const canvas = $("game"), ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false;
  const ui = { score:$("score"), wave:$("wave"), lives:$("lives"), banner:$("waveBanner"),
    overlay:$("overlay"), title:$("overlayTitle"), text:$("overlayText"),
    primary:$("primaryButton"), secondary:$("secondaryButton"),
    result:$("resultStrip"), endScore:$("endScore"), endBest:$("endBest"),
    hint:$("controlsHint"), sound:$("soundButton"), announce:$("announce") };
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const rand=(a,b)=>a+Math.random()*(b-a);
  const sprites = {};
  const colours = { X:"#213147", K:"#304158", W:"#f7fcff", w:"#b6d6e4",
    R:"#d84c54",r:"#973649",G:"#3c9a67",g:"#84d28d",Y:"#ffe28a",
    B:"#a56943",b:"#deaa6a",S:"#ffceb0",O:"#f9a65a",T:"#81cadb",t:"#35799d" };
  const patterns = {
    sleigh:[
      "...........KKK...................","..........KKKKK..................","..........RRRRR..................",
      "..........SSXSS..................",".........WRRRRRWW................",".........RRRRRRRR..YY............",
      ".....RRRRRRRRRRRRYYYYYY..........","...RRRRRRRRRRRRRRRRRYYYYY........","..RRRRRRRRRRRRRRRRRRRRRYYYY......",
      "..RRRRRRRRRRRRRRRRRRRRRRRRRRR....","...RRRRRRRRRRRRRRRRRRRRRRRRR.....",
      "...XXXXXXXXXXXXXXXRRRRRRRR......","....YYYYYYYYYYYYYYYYYYYYY.......",".....YYYYYYYYYYYYYYYYYYY........",
      ".......YY...............YY......"],
    bonus:[
      "......YYYYYYY.................","....YYWWWWYYYY...............","...YYWSSWWYYYY......YY.......",
      "...YRWXXWRRRYYYY...YYYY......","...RRRRRRRRRYYYYYYYYYYYY.....",
      ".RRRRRRRRRRRRRYYYYYYYYYYYYY..","RRRRRRRRRRRRRRRRRRRRRRRRRRR..","RRRRRRRRRRRRRRRRRRRRRRRRRRR..",
      ".XXXXXXXXXXXXRRRRRRRRRRRRR...","..YYYYYYYYYYYYYYYYYYYYYYY....","....YYYYYYYYYYYYYYYYYYYY....."]
  };
  for (const [name,rows] of Object.entries(patterns)) {
    const c=document.createElement("canvas");
    c.width=Math.max(...rows.map(r=>r.length));c.height=rows.length;
    const g=c.getContext("2d");g.imageSmoothingEnabled=false;
    rows.forEach((row,y)=>{for(let x=0;x<row.length;x++){const ink=colours[row[x]];if(ink){g.fillStyle=ink;g.fillRect(x,y,1,1);}}});
    sprites[name]=c;
  }

  // Reuse original Christmas monster art already committed for Workshop Watch.
  // Source sheets: Admurin Monster Pack 82/85, 128x128 cells, 4 idle frames.
  // Trim transparent margins once at load time so each monster is legible in the
  // tight Space Invaders formation. Cache the 28x28 cut-outs for cheap draw calls.
  const WORKSHOP="../workshop-watch/assets/vendor/admurin/";
  const CHRISTMAS_SPRITES={
    defender:WORKSHOP+"pack82/Monster%20Pack%2082%20(Event)/Snowmen/Christmas_Snowman_A_Idle.png",
    snowman:WORKSHOP+"pack82/Monster%20Pack%2082%20(Event)/Snowmen/Christmas_Snowman_C_Idle.png",
    ginger:WORKSHOP+"pack85/Monster%20Pack%2085%20(Event%203)/Spritesheets/Gingerbread/Christmas_Gingerbread_Idle.png",
    slime:WORKSHOP+"pack85/Monster%20Pack%2085%20(Event%203)/Spritesheets/Slime/Christmas_Slime_Idle.png",
    devil:WORKSHOP+"pack85/Monster%20Pack%2085%20(Event%203)/Spritesheets/Devil/Christmas_Devil_Idle.png"
  };
  const animationFrames={};
  let winterSheet=null;
  let artworkReady=false,artworkLoading=false;
  function trimFrame(img,index){
    const cell=128,raw=document.createElement("canvas");
    raw.width=raw.height=cell;
    const g=raw.getContext("2d",{willReadFrequently:true});
    g.clearRect(0,0,cell,cell);
    g.drawImage(img,index*cell,0,cell,cell,0,0,cell,cell);
    const pixels=g.getImageData(0,0,cell,cell).data;
    let left=cell,top=cell,right=-1,bottom=-1;
    for(let y=0;y<cell;y++)for(let x=0;x<cell;x++){
      if(pixels[(y*cell+x)*4+3]<20)continue;
      left=Math.min(left,x);right=Math.max(right,x);
      top=Math.min(top,y);bottom=Math.max(bottom,y);
    }
    if(right<left)throw Error("Christmas sprite frame is empty");
    const out=document.createElement("canvas");out.width=out.height=32;
    const o=out.getContext("2d");o.imageSmoothingEnabled=false;
    const w=right-left+1,h=bottom-top+1;
    const scale=Math.min(28/w,28/h,2.2);
    const dw=Math.round(w*scale),dh=Math.round(h*scale);
    o.drawImage(raw,left,top,w,h,Math.round((32-dw)/2),Math.round((32-dh)/2),dw,dh);
    return out;
  }
  function loadArtwork(){
    if(artworkLoading)return;
    artworkLoading=true;artworkReady=false;
    ui.primary.disabled=true;ui.primary.textContent="LOADING CHRISTMAS ART…";
    Promise.all(Object.entries(CHRISTMAS_SPRITES).map(([key,src])=>new Promise((resolve,reject)=>{
      const img=new Image();
      img.onload=()=>{
        try{
          if(img.naturalWidth<512||img.naturalHeight<128)throw Error("Invalid Christmas sprite sheet");
          animationFrames[key]=[0,1,2,3].map(i=>trimFrame(img,i));
          resolve();
        }catch(error){reject(error);}
      };
      img.onerror=()=>reject(Error("Artwork could not load: "+key));
      img.src=src;
    })).concat([new Promise((resolve,reject)=>{
      const img=new Image();
      img.onload=()=>{winterSheet=img;drawWinterScenery(img);resolve();};
      img.onerror=()=>reject(Error("Winter scenery could not load"));
      img.src="../workshop-watch/assets/vendor/gherwit/winter/Winter-Download/Winter-tiles.png";
    })])).then(()=>{
      artworkReady=true;artworkLoading=false;
      if(game.phase==="ready"){
        ui.primary.disabled=false;
        ui.primary.textContent="DEFEND THE NORTH POLE";
      }
    }).catch(error=>{
      console.error("Santa Invaders: existing Christmas asset failed",error);
      artworkLoading=false;
      ui.primary.disabled=false;
      ui.primary.textContent="RETRY ARTWORK";
      ui.text.textContent="Christmas artwork could not load. Check the connection and try again.";
    });
  }
  function drawChristmasSprite(kind,x,y,w=28,h=28,offset=0){
    const frames=animationFrames[kind];
    if(!frames)return;
    const frame=frames[Math.floor(game.elapsed*5+offset)%frames.length];
    ctx.drawImage(frame,Math.round(x),Math.round(y),w,h);
  }
  const artImage=src=>{const i=new Image();i.src=src;return i;};
  const snowball=artImage("../assets/gamebox/kenney/2d/Platformer Assets Holiday/ball_lightBlue.png");
  const giftImages={
    rapid:artImage("../assets/gamebox/kenney/2d/Platformer Assets Holiday/present_small_yellow.png"),
    triple:artImage("../assets/gamebox/kenney/2d/Platformer Assets Holiday/present_small_green.png"),
    fort:artImage("../assets/gamebox/kenney/2d/Platformer Assets Holiday/present_small_blue.png")};
  let audio=null,soundEnabled=true;
  try { soundEnabled=localStorage.getItem("gamebox-santa-invaders-sound")!=="off"; }catch(e){}
  function chime(frequency=460,duration=.06,kind="sine",level=.055){
    if(!soundEnabled)return;
    try {
      const AC=window.AudioContext||window.webkitAudioContext;
      if(!AC)return;
      if(!audio)audio=new AC();
      if(audio.state==="suspended")audio.resume();
      const oscillator=audio.createOscillator(), gain=audio.createGain(), now=audio.currentTime;
      oscillator.type=kind;oscillator.frequency.setValueAtTime(frequency,now);
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(70,frequency*.68),now+duration);
      gain.gain.setValueAtTime(level,now);gain.gain.exponentialRampToValueAtTime(.001,now+duration);
      oscillator.connect(gain);gain.connect(audio.destination);
      oscillator.start(now);oscillator.stop(now+duration+.01);
    } catch(e){}
  }
  let high=0;
  try {high=+(localStorage.getItem("gamebox-santa-invaders-best")||0)||0;}catch(e){}
  const held={left:false,right:false,fire:false};
  const player={x:W/2,y:H-75,invuln:0,rapid:0,triple:0};
  const game={phase:"ready",wave:1,score:0,lives:3,elapsed:0,shake:0,whiteout:0,
    formationX:26,formationY:65,dir:1,fireClock:0,bonusClock:0,bonus:null,
    enemies:[],bullets:[],enemyShots:[],particles:[],forts:[],gifts:[],
    fireWait:0,transition:0,toastClock:0};
  const starfield=Array.from({length:82},(_,i)=>({x:(i*127+29)%W,y:(i*71+13)%(H-100),size:i%8===0?2:1,t:i*.41}));
  const flakes=Array.from({length:45},()=>({x:rand(0,W),y:rand(0,H),speed:rand(8,25),size:Math.random()>.78?2:1}));
  const ground=document.createElement("canvas");ground.width=W;ground.height=H;
  const bg=ground.getContext("2d");bg.imageSmoothingEnabled=false;
  const sky=bg.createLinearGradient(0,0,0,H);
  sky.addColorStop(0,"#0b1c35");sky.addColorStop(.55,"#1e4265");sky.addColorStop(1,"#34657f");
  bg.fillStyle=sky;bg.fillRect(0,0,W,H);
  bg.fillStyle="#bddbea";bg.beginPath();bg.arc(300,75,21,0,Math.PI*2);bg.fill();
  bg.fillStyle="#c9e6f2";bg.fillRect(0,H-35,W,35);
  bg.fillStyle="#93becd";bg.fillRect(0,H-34,W,2);
  function fir(x,top,s,height){
    bg.fillStyle="#142f41";bg.fillRect(x-2,top+height-3,4,10);
    for(let i=0;i<3;i++){
      const y=top+i*height*.24, width=(11+i*5)*s;
      bg.fillStyle=i===0?"#20556a":"#174356";
      bg.beginPath();bg.moveTo(x,y);bg.lineTo(x-width,y+height*.36);bg.lineTo(x+width,y+height*.36);bg.fill();
      bg.fillStyle="#c7e8f2";bg.fillRect(x-width*.65,y+height*.25,width*.95,2);
    }
  }
  for(let i=0;i<11;i++){const x=i*38+(i%2)*7;fir(x,H-65-(i%3)*14,.6+i%3*.15,30+i%3*11);}
  // Distant lit toy workshop, with a snowy pitched roof.
  bg.fillStyle="#14384b";bg.fillRect(133,H-71,94,41);bg.fillStyle="#eefaff";
  for(let i=0;i<7;i++)bg.fillRect(125+i*15,H-72-Math.min(i,6-i)*5,19,5);
  bg.fillStyle="#214359";bg.fillRect(144,H-53,18,17);bg.fillRect(170,H-53,18,17);bg.fillRect(196,H-53,18,17);
  bg.fillStyle="#ffc56c";bg.fillRect(147,H-50,12,10);bg.fillRect(173,H-50,12,10);bg.fillRect(199,H-50,12,10);
  bg.fillStyle="#e8f7ff";bg.fillRect(0,H-21,W,21);
  function drawWinterScenery(im){
    // Gherwit Winter tiles: 14 columns x 12 rows, each source tile 16x16.
    bg.save();bg.imageSmoothingEnabled=false;
    for(let y=H-27;y<H;y+=16)for(let x=0;x<W;x+=16)
      bg.drawImage(im,12*16,1*16,16,16,x,y,16,16);
    for(const x of [9,W-60])bg.drawImage(im,9*16,6*16,48,48,x,H-95,48,48);
    bg.restore();
  }
  const alive=()=>game.enemies.filter(e=>e.alive);
  const coord=e=>({x:game.formationX+e.col*39,y:game.formationY+e.row*35});
  function announce(s){ui.announce.textContent=s;}
  function refreshHUD(){
    ui.score.textContent=String(game.score).padStart(6,"0");
    ui.wave.textContent=String(game.wave).padStart(2,"0");
    ui.lives.textContent=Array.from({length:game.lives},()=> "♥").join(" ")||"—";
  }
  function newForts(){
    game.forts=[];
    for(let bank=0;bank<4;bank++)for(let row=0;row<2;row++)for(let col=0;col<3;col++){
      if(row===1&&col===1)continue;
      game.forts.push({x:24+bank*86+col*15,y:H-175+row*15,hp:3});
    }
  }
  function buildWave(){
    game.formationX=25;game.formationY=76;game.dir=1;game.fireClock=1.1;
    game.bonusClock=11;game.bonus=null;game.bullets=[];game.enemyShots=[];game.gifts=[];
    game.enemies=[];
    for(let row=0;row<ROWS;row++)for(let col=0;col<COLS;col++)
      game.enemies.push({row,col,kind:["devil","ginger","snowman","slime"][row],
        points:[40,30,20,10][row],alive:true,step:Math.random()*6});
    newForts();refreshHUD();
  }
  function setOverlay(which){
    game.phase=which;
    ui.overlay.classList.add("show");ui.overlay.setAttribute("aria-hidden","false");
    ui.result.hidden=which!=="over";ui.hint.hidden=which==="over";
    ui.sound.hidden=which==="over"||which==="help";ui.sound.textContent=soundEnabled?"SOUND ON":"SOUND OFF";
    ui.secondary.hidden=false;
    if(which==="ready"){
      ui.title.innerHTML="SANTA <em>INVADERS</em>";
      ui.text.textContent="The toy workshop is under attack! Fire snowballs, protect the snow forts and hold the line.";
      ui.primary.textContent="DEFEND THE NORTH POLE";ui.secondary.textContent="HOW TO PLAY";
    }else if(which==="paused"){
      ui.title.innerHTML="GAME <em>PAUSED</em>";
      ui.text.textContent="The North Pole is counting on you.";
      ui.primary.textContent="RESUME GAME";ui.secondary.textContent="RESTART RUN";
    }else if(which==="help"){
      ui.title.innerHTML="HOW TO <em>PLAY</em>";
      ui.text.textContent="Shoot the approaching toys before they reach Santa. Avoid the returning candy-cane shots. Catch falling presents for rapid fire, triple shots or snow-fort repairs. Clear all enemies to reach the next wave.";
      ui.primary.textContent="GOT IT";ui.secondary.hidden=true;
    }else if(which==="over"){
      ui.title.innerHTML="NORTH POLE <em>OVERRUN</em>";
      ui.text.textContent="The workshop needs another hero. Try again!";
      ui.endScore.textContent=game.score.toLocaleString();
      ui.endBest.textContent=high.toLocaleString();
      ui.primary.textContent="PLAY AGAIN";ui.secondary.hidden=true;
    }
  }
  let helpFrom="ready";
  function hideOverlay(){ui.overlay.classList.remove("show");ui.overlay.setAttribute("aria-hidden","true");}
  function reset(){
    if(!artworkReady){loadArtwork();return;}
    game.wave=1;game.score=0;game.lives=3;game.elapsed=0;game.shake=0;game.whiteout=0;
    game.particles=[];game.fireWait=0;player.x=W/2;player.invuln=1.3;player.rapid=0;player.triple=0;
    buildWave();hideOverlay();game.phase="playing";flashBanner("WAVE 01");announce("Wave one started");
    chime(625,.13,"triangle",.09);
  }
  function pause(){if(game.phase!=="playing"&&game.phase!=="between")return;game.lastPhase=game.phase;setOverlay("paused");releaseControls();}
  function resume(){hideOverlay();game.phase=game.lastPhase==="between"?"between":"playing";}
  function gameOver(){
    game.phase="over";releaseControls();
    if(game.score>high){high=game.score;try{localStorage.setItem("gamebox-santa-invaders-best",String(high));}catch(e){}}
    setOverlay("over");announce("Game over. Final score "+game.score);
    chime(245,.28,"sawtooth",.035);
  }
  function flashBanner(message){ui.banner.textContent=message;ui.banner.classList.add("on");game.toastClock=1.65;}
  function spark(x,y,colour,count=9){
    for(let i=0;i<count;i++)game.particles.push({x,y,vx:rand(-95,95),vy:rand(-100,55),life:rand(.22,.65),max:.65,colour,sz:rand(1.5,4)});
  }
  function shoot(){
    const boost=player.rapid>0;
    if(game.fireWait>0)return;
    game.fireWait=boost?.115:.26;
    const spread=player.triple>0?[-80,0,80]:[0];
    for(const vx of spread)game.bullets.push({x:player.x,y:player.y-21,vx,vy:-455,r:5});
    chime(boost?780:670,.045,"triangle",.045);
  }
  function enemyAttack(){
    const candidates=[];
    for(let col=0;col<COLS;col++){
      const column=game.enemies.filter(e=>e.alive&&e.col===col);
      if(column.length)candidates.push(column[column.length-1]);
    }
    if(!candidates.length)return;
    const e=candidates[Math.floor(Math.random()*candidates.length)],p=coord(e);
    game.enemyShots.push({x:p.x+12,y:p.y+22,vy:142+game.wave*13,r:5});
  }
  function hitRect(b,r){return b.x+b.r>r.x&&b.x-b.r<r.x+r.w&&b.y+b.r>r.y&&b.y-b.r<r.y+r.h;}
  function award(points){game.score+=points;refreshHUD();}
  function nextWave(){
    game.wave++;buildWave();game.phase="between";game.transition=1.65;
    flashBanner("WAVE "+String(game.wave).padStart(2,"0"));
    announce("Wave "+game.wave);chime(880,.16,"sine",.1);
  }
  function damagePlayer(){
    if(player.invuln>0)return;
    game.lives--;player.invuln=1.7;game.shake=8;game.whiteout=.23;
    spark(player.x,player.y,"#ff9e90",22);refreshHUD();chime(160,.18,"sawtooth",.06);
    if(game.lives<=0)gameOver();
  }
  function maybeGift(x,y){
    if(Math.random()>.09)return;
    const options=["rapid","triple","fort"];
    game.gifts.push({x,y,vy:52,kind:options[Math.floor(Math.random()*3)]});
  }
  function collectGift(g){
    if(g.kind==="rapid")player.rapid=8;
    if(g.kind==="triple")player.triple=8;
    if(g.kind==="fort")game.forts.forEach(f=>f.hp=Math.min(3,f.hp+2));
    flashBanner(g.kind==="rapid"?"RAPID SNOW!":g.kind==="triple"?"TRIPLE SHOT!":"FORTS REPAIRED!");
    chime(950,.14,"sine",.09);
  }
  function update(dt){
    game.elapsed+=dt;game.shake=Math.max(0,game.shake-dt*35);
    game.whiteout=Math.max(0,game.whiteout-dt);player.invuln=Math.max(0,player.invuln-dt);
    player.rapid=Math.max(0,player.rapid-dt);player.triple=Math.max(0,player.triple-dt);
    game.fireWait=Math.max(0,game.fireWait-dt);
    for(const f of flakes){f.y+=f.speed*dt;f.x+=Math.sin(game.elapsed+f.y*.014)*dt*5;if(f.y>H){f.y=0;f.x=rand(0,W);} }
    for(let i=game.particles.length-1;i>=0;i--){
      const p=game.particles[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=140*dt;p.life-=dt;
      if(p.life<=0)game.particles.splice(i,1);
    }
    if(game.toastClock>0){game.toastClock-=dt;if(game.toastClock<=0)ui.banner.classList.remove("on");}
    if(game.phase==="between"){
      game.transition-=dt;if(game.transition<=0)game.phase="playing";
      return;
    }
    if(game.phase!=="playing")return;
    const motion=Number(held.right)-Number(held.left);
    player.x=clamp(player.x+motion*260*dt,24,W-24);
    if(held.fire)shoot();
    const remaining=alive(),fraction=remaining.length/(ROWS*COLS);
    const speed=(23+Math.min(90,game.wave*6))*(1+(1-fraction)*1.9);
    game.formationX+=game.dir*speed*dt;
    const pts=remaining.map(coord);
    if(pts.length){
      const minX=Math.min(...pts.map(p=>p.x)),maxX=Math.max(...pts.map(p=>p.x+24));
      if((game.dir>0&&maxX>W-12)||(game.dir<0&&minX<12)){
        game.formationX+=game.dir>0?W-12-maxX:12-minX;
        game.dir*=-1;game.formationY+=14;
        chime(120,.02,"square",.013);
      }
      if(pts.some(p=>p.y+23>player.y-16)){gameOver();return;}
    }
    game.fireClock-=dt;
    if(game.fireClock<=0){enemyAttack();game.fireClock=rand(.75,1.42)*Math.max(.38,1-(game.wave-1)*.055);}
    game.bonusClock-=dt;
    if(game.bonusClock<=0&&!game.bonus){
      game.bonus={x:-45,y:33,vx:80+game.wave*4};
      game.bonusClock=rand(15,22);
    }
    if(game.bonus){
      game.bonus.x+=game.bonus.vx*dt;
      if(game.bonus.x>W+50)game.bonus=null;
    }
    for(let i=game.bullets.length-1;i>=0;i--){
      const b=game.bullets[i];b.y+=b.vy*dt;b.x+=b.vx*dt;
      if(b.y<-12||b.x<-10||b.x>W+10){game.bullets.splice(i,1);continue;}
      let hit=false;
      if(game.bonus&&hitRect(b,{x:game.bonus.x,y:game.bonus.y,w:44,h:24})){
        spark(b.x,b.y,"#ffdb8e",14);award(150);game.bonus=null;hit=true;chime(1050,.12);
      }
      if(!hit)for(const e of game.enemies){
        if(!e.alive)continue;
        const p=coord(e);
        if(hitRect(b,{x:p.x,y:p.y,w:24,h:24})){
          e.alive=false;award(e.points);spark(p.x+12,p.y+12,"#ffe3a2",12);maybeGift(p.x+12,p.y);
          chime(470+e.points*5,.07,"triangle",.06);hit=true;break;
        }
      }
      if(hit)game.bullets.splice(i,1);
    }
    for(let i=game.enemyShots.length-1;i>=0;i--){
      const b=game.enemyShots[i];b.y+=b.vy*dt;
      if(b.y>H+15){game.enemyShots.splice(i,1);continue;}
      let hit=false;
      for(const f of game.forts){
        if(f.hp<=0)continue;
        if(hitRect(b,{x:f.x,y:f.y,w:14,h:14})){
          f.hp--;spark(b.x,b.y,"#c7eafa",5);hit=true;break;
        }
      }
      if(!hit&&player.invuln<=0&&hitRect(b,{x:player.x-19,y:player.y-12,w:38,h:25})){damagePlayer();hit=true;}
      if(hit)game.enemyShots.splice(i,1);
    }
    for(let i=game.gifts.length-1;i>=0;i--){
      const g=game.gifts[i];g.y+=g.vy*dt;
      if(g.y>H){game.gifts.splice(i,1);continue;}
      if(Math.abs(g.x-player.x)<22&&Math.abs(g.y-player.y)<22){collectGift(g);game.gifts.splice(i,1);}
    }
    if(game.phase==="playing"&&!game.enemies.some(e=>e.alive))nextWave();
  }
  function image(name,x,y,w,h){const img=sprites[name];ctx.drawImage(img,Math.round(x),Math.round(y),w,h);}
  function snow(x,y,r){ctx.fillStyle="#173b5f";ctx.beginPath();ctx.arc(x+1,y+2,r+1,0,7);ctx.fill();
    if(snowball.complete&&snowball.naturalWidth)ctx.drawImage(snowball,x-r,y-r,2*r,2*r);
    else {ctx.fillStyle="#e5fbff";ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.fill();ctx.fillStyle="#fff";ctx.fillRect(x-r/2,y-r/2,r,1);}
  }
  function drawFort(f){
    if(f.hp<=0)return;
    ctx.fillStyle="#24475a";ctx.fillRect(f.x,f.y+2,14,12);
    ctx.fillStyle=f.hp===1?"#6da0bf":f.hp===2?"#86bbd2":"#a5dcf0";
    ctx.fillRect(f.x+1,f.y+3,12,10);
    if(winterSheet)ctx.drawImage(winterSheet,12*16,1*16,16,16,f.x+1,f.y+3,12,10);
    ctx.fillStyle="#effaff";ctx.fillRect(f.x+1,f.y,12,4);
    ctx.fillStyle="#fff";ctx.fillRect(f.x+3,f.y,5,2);
    if(f.hp<3){ctx.fillStyle="#2e5f7d";ctx.fillRect(f.x+7,f.y+5,2,6);ctx.fillRect(f.x+9,f.y+8,3,2);}
    if(f.hp===1){ctx.fillStyle="#213f5a";ctx.fillRect(f.x+2,f.y+8,4,5);}
  }
  function draw(){
    ctx.save();ctx.clearRect(0,0,W,H);
    if(game.shake){ctx.translate(Math.round(rand(-game.shake,game.shake)),Math.round(rand(-game.shake,game.shake)));}
    ctx.drawImage(ground,0,0);
    for(const s of starfield){
      const pulse=Math.sin(game.elapsed*1.3+s.t)>-.2;
      ctx.fillStyle=pulse?"#d3f1fc":"#527d9b";ctx.fillRect(s.x,s.y,s.size,s.size);
    }
    for(const f of flakes){ctx.fillStyle="#d3f0f6";ctx.globalAlpha=.55;ctx.fillRect(f.x|0,f.y|0,f.size,f.size);}
    ctx.globalAlpha=1;
    ctx.strokeStyle="#5b9eb9";ctx.lineWidth=1;ctx.setLineDash([2,5]);
    ctx.beginPath();ctx.moveTo(9,38);ctx.lineTo(9,H-40);ctx.moveTo(W-9,38);ctx.lineTo(W-9,H-40);ctx.stroke();ctx.setLineDash([]);
    for(const fort of game.forts)drawFort(fort);
    if(game.bonus){image("bonus",game.bonus.x,game.bonus.y,46,24);}
    for(const e of game.enemies){
      if(!e.alive)continue;
      const p=coord(e);
      const bob=Math.sin(game.elapsed*5+e.step)*1.2;
      drawChristmasSprite(e.kind,p.x-3,p.y-4+bob,30,30,e.col*.3);
    }
    for(const b of game.bullets){snow(b.x,b.y,b.r);}
    for(const b of game.enemyShots){
      ctx.fillStyle="#621b3a";ctx.fillRect(b.x-3,b.y-5,7,12);
      ctx.fillStyle="#e6525b";ctx.fillRect(b.x-2,b.y-6,5,11);
      ctx.fillStyle="#fff5ec";ctx.fillRect(b.x-2,b.y-2,5,3);ctx.fillRect(b.x-2,b.y+4,5,2);
    }
    for(const g of game.gifts){
      const sprite=giftImages[g.kind];
      if(sprite.complete&&sprite.naturalWidth)ctx.drawImage(sprite,g.x-11,g.y-12,22,22);
      else image("present",g.x-9,g.y-10,20,20);
    }
    if(player.invuln<=0||Math.floor(game.elapsed*12)%2===0||game.phase==="ready"){
      ctx.fillStyle="rgba(9,30,49,.4)";ctx.fillRect(player.x-21,player.y+16,42,4);
      image("sleigh",player.x-24,player.y-19,48,34);
      drawChristmasSprite("defender",player.x-15,player.y-30,30,30);
      ctx.fillStyle="#fff";ctx.fillRect(player.x-22,player.y+7,2,2);
    }
    if(player.triple>0||player.rapid>0){
      ctx.strokeStyle=player.triple>0?"#97e8bf":"#ffe58f";ctx.lineWidth=2;
      ctx.strokeRect(player.x-24,player.y-22,48,38);
    }
    for(const p of game.particles){ctx.globalAlpha=clamp(p.life/p.max,0,1);ctx.fillStyle=p.colour;ctx.fillRect(p.x,p.y,p.sz,p.sz);}
    ctx.globalAlpha=1;
    if(game.whiteout){ctx.fillStyle="rgba(255,142,154,"+(game.whiteout*1.5)+")";ctx.fillRect(0,0,W,H);}
    ctx.restore();
  }
  function releaseControls(){
    held.left=false;held.right=false;held.fire=false;
    for(const b of document.querySelectorAll(".control"))b.classList.remove("down");
  }
  for(const [id,key] of [["moveLeft","left"],["moveRight","right"],["fire","fire"]]){
    const el=$(id);
    el.addEventListener("pointerdown",e=>{
      e.preventDefault();if(game.phase!=="playing")return;
      el.setPointerCapture(e.pointerId);held[key]=true;el.classList.add("down");
      if(key==="fire")shoot();
    });
    const up=()=>{held[key]=false;el.classList.remove("down");};
    el.addEventListener("pointerup",up);el.addEventListener("pointercancel",up);el.addEventListener("lostpointercapture",up);
  }
  document.addEventListener("keydown",e=>{
    const k=e.key.toLowerCase();
    if(["arrowleft","arrowright"," ","arrowup","a","d","escape","p"].includes(k))e.preventDefault();
    if(k==="arrowleft"||k==="a")held.left=true;
    if(k==="arrowright"||k==="d")held.right=true;
    if(k===" ")held.fire=true;
    if((k==="p"||k==="escape")&&!e.repeat){
      if(game.phase==="paused")resume();
      else if(game.phase==="playing"||game.phase==="between")pause();
    }
    if(k==="enter"&&game.phase==="ready")reset();
  });
  document.addEventListener("keyup",e=>{
    const k=e.key.toLowerCase();
    if(k==="arrowleft"||k==="a")held.left=false;
    if(k==="arrowright"||k==="d")held.right=false;
    if(k===" ")held.fire=false;
  });
  window.addEventListener("blur",()=>{releaseControls();pause();});
  document.addEventListener("visibilitychange",()=>{if(document.hidden){releaseControls();pause();}});
  let drag=null;
  canvas.addEventListener("pointerdown",e=>{
    if(game.phase!=="playing")return;
    drag={id:e.pointerId,x:e.clientX,start:player.x};
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove",e=>{
    if(!drag||e.pointerId!==drag.id||game.phase!=="playing")return;
    const rect=canvas.getBoundingClientRect(),scale=Math.min(rect.width/W,rect.height/H);
    player.x=clamp(drag.start+(e.clientX-drag.x)/Math.max(.1,scale),24,W-24);
  });
  for(const evt of ["pointerup","pointercancel","lostpointercapture"])canvas.addEventListener(evt,()=>drag=null);
  $("menuButton").addEventListener("click",()=>{
    if(game.phase==="playing"||game.phase==="between")pause();
    else if(game.phase==="paused")resume();
  });
  ui.sound.addEventListener("click",()=>{
    soundEnabled=!soundEnabled;
    try{localStorage.setItem("gamebox-santa-invaders-sound",soundEnabled?"on":"off");}catch(e){}
    ui.sound.textContent=soundEnabled?"SOUND ON":"SOUND OFF";
    if(soundEnabled)chime(680,.11,"triangle");
  });
  ui.primary.addEventListener("click",()=>{
    if(game.phase==="ready"||game.phase==="over")reset();
    else if(game.phase==="paused")resume();
    else if(game.phase==="help")setOverlay(helpFrom);
  });
  ui.secondary.addEventListener("click",()=>{
    if(game.phase==="ready"){helpFrom="ready";setOverlay("help");}
    else if(game.phase==="paused")reset();
  });
  buildWave();setOverlay("ready");loadArtwork();
  let last=0;
  function tick(now){
    const dt=last?Math.min(.034,(now-last)/1000):0;last=now;
    if(game.phase==="playing"||game.phase==="between")update(dt);
    draw();requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();