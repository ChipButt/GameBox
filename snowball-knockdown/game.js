(function(){
"use strict";
const E=window.SnowballEngine,$=id=>document.getElementById(id);
const canvas=$("game"),ctx=canvas.getContext("2d",{alpha:false});
const pref="chipin-snowball-v1";
const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(pref+key))??fallback;}catch{return fallback;}};
const save=(key,v)=>{try{localStorage.setItem(pref+key,JSON.stringify(v));}catch{}};
let unlocked=read("-unlocked",1),best=read("-best",0),records=read("-stars",{}),sound=read("-sound",true);
let state=E.makeLevel(1),mode="intro",aim={x:210,y:325},holding=false,down=null,scale=1,ox=0,oy=0,dpr=1;
let sparks=[],toastUntil=0,toastText="",last=0,roundToken=0,announced=false;
const SNOW=Array.from({length:62},(_,i)=>({x:(i*103.71+47)%420,y:(i*127.23+81)%640,r:((i*7)%3)+.6,s:.7+(i%6)*.16}));
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const rand=(a,b)=>a+Math.random()*(b-a);
let audio=null;
function beep(kind){
 if(!sound)return;
 try{
  audio=audio||new (window.AudioContext||window.webkitAudioContext)();
  if(audio.state==="suspended")audio.resume();
  const t=audio.currentTime,o=audio.createOscillator(),g=audio.createGain();
  o.type=kind==="throw"?"sine":kind==="win"?"triangle":"square";
  const f=kind==="throw"?280:kind==="blast"?130:kind==="win"?660:kind==="lose"?170:410;
  o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(kind==="win"?990:Math.max(75,f*.55),t+.13);
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(kind==="blast"?.11:.045,t+.012);
  g.gain.exponentialRampToValueAtTime(.0001,t+.16);o.connect(g);g.connect(audio.destination);o.start(t);o.stop(t+.18);
 }catch{}
}
function vibrate(){if(navigator.vibrate)try{navigator.vibrate(15);}catch{}}
function msg(txt,seconds=1.1){toastText=txt;toastUntil=performance.now()+seconds*1000;$("message").textContent=txt;$("announcer").textContent=txt;}
function updateHUD(){
 $("level").textContent=String(state.level).padStart(2,"0");
 $("balls").textContent=Array.from({length:state.initialBalls},(_,i)=>i<state.balls?"●":"○").join(" ");
 $("score").textContent=state.score.toLocaleString("en-GB");
 $("best").textContent=best.toLocaleString("en-GB");
}
function setOverlay(next){
 mode=next;const ov=$("overlay");ov.classList.add("show");
 $("resultMeta").hidden=true;$("secondBtn").hidden=false;$("levelBtn").hidden=false;
 const headline=$("overlayTitle"),k=$("overlayKicker"),p=$("overlayText"),play=$("playBtn"),secondary=$("secondBtn");
 if(next==="intro"){k.textContent="THE NORTH POLE WINTER FAIR";headline.innerHTML="SNOWBALL<br><em>KNOCKDOWN</em>";
  p.textContent="Aim your snowballs and topple every festive tin. Clear the shelf with fewer throws to earn more stars!";
  play.textContent="LET'S PLAY  ➜";secondary.textContent="HOW TO PLAY";$("levelBtn").textContent="CHOOSE LEVEL";}
 if(next==="menu"){k.textContent="TAKE A BREATHER";headline.innerHTML="GAME<br><em>PAUSED</em>";
  p.textContent="Snowballs at the ready. The North Pole fair is right where you left it.";
  play.textContent="RESUME  ➜";secondary.textContent="RESTART LEVEL";$("levelBtn").textContent="CHOOSE LEVEL";}
 if(next==="help"){k.textContent="HOW TO PLAY";headline.innerHTML="READY, AIM,<br><em>SNOW!</em>";
  p.innerHTML="Tap a tin to throw, or drag to line up your shot and release. Knock over <b>every tin</b> before you run out of snowballs. <b>Red star tins</b> set off a chain reaction. Bank shots off the side walls. Keyboard: ← → aim · Space shoot.";
  play.textContent="GOT IT  ➜";secondary.textContent="RESTART LEVEL";$("levelBtn").hidden=true;}
 if(next==="win"){
  const stars=E.stars(state);
  if(state.level+1>unlocked){unlocked=state.level+1;save("-unlocked",unlocked);}
  records[state.level]=Math.max(stars,records[state.level]||0);save("-stars",records);
  best=Math.max(best,state.score);save("-best",best);updateHUD();
  k.textContent="THE SHELF IS CLEAR!";headline.innerHTML="BRILLIANT<br><em>SHOT!</em>";
  p.textContent=stars===3?"Snowball superstar! That was a perfect little demolition.":"Every tin down! Think you can use fewer snowballs next time?";
  $("resultMeta").hidden=false;$("resultStars").textContent="★".repeat(stars)+"☆".repeat(3-stars);
  $("resultScore").textContent=state.score.toLocaleString("en-GB")+" PTS";
  play.textContent="NEXT LEVEL  ➜";secondary.textContent="PLAY AGAIN";$("levelBtn").textContent="CHOOSE LEVEL";
 }
 if(next==="lose"){k.textContent="SO CLOSE!";headline.innerHTML="OUT OF<br><em>SNOWBALLS</em>";
  p.textContent=state.tins.filter(t=>!t.fallen).length+" tin(s) still standing. Try another angle or bounce a snowball off the sides.";
  $("resultMeta").hidden=false;$("resultStars").textContent="☆☆☆";$("resultScore").textContent=state.score.toLocaleString("en-GB")+" PTS";
  play.textContent="TRY AGAIN  ➜";secondary.textContent="HOW TO PLAY";$("levelBtn").textContent="CHOOSE LEVEL";
 }
 $("soundBtn").textContent=sound?"♪ SOUND ON":"♪ SOUND OFF";$("soundBtn").setAttribute("aria-pressed",String(sound));
}
function hideOverlay(){mode="playing";$("overlay").classList.remove("show");$("levelOverlay").hidden=true;canvas.focus({preventScroll:true});}
function start(level){roundToken++;state=E.makeLevel(level);aim={x:210,y:325};holding=false;announced=false;sparks=[];hideOverlay();updateHUD();msg("READY, AIM, SNOW!",.9);}
function finish(kind){const token=roundToken;if(announced)return;announced=true;beep(kind);if(kind==="win")vibrate();
 setTimeout(()=>{if(token===roundToken&&mode==="playing")setOverlay(kind);},560);
}
$("playBtn").addEventListener("click",()=>{
 if(mode==="intro")start(Math.min(unlocked,read("-current",1)));
 else if(mode==="menu"){hideOverlay();}
 else if(mode==="help"){hideOverlay();}
 else if(mode==="win")start(state.level+1);
 else if(mode==="lose")start(state.level);
});
$("secondBtn").addEventListener("click",()=>{
 if(mode==="intro"||mode==="lose")setOverlay("help");
 else if(mode==="menu"||mode==="win")start(state.level);
 else if(mode==="help")start(state.level);
});
$("menuBtn").addEventListener("click",()=>{if(mode==="playing")setOverlay("menu");else if(mode==="menu")hideOverlay();});
$("restartBtn").addEventListener("click",()=>start(state.level));
$("soundBtn").addEventListener("click",()=>{sound=!sound;save("-sound",sound);$("soundBtn").textContent=sound?"♪ SOUND ON":"♪ SOUND OFF";$("soundBtn").setAttribute("aria-pressed",String(sound));if(sound)beep("tin");});
function renderLevels(){
 const grid=$("levelGrid");grid.replaceChildren();
 for(let i=1;i<=Math.min(36,Math.max(12,unlocked));i++){
  const b=document.createElement("button");b.type="button";b.disabled=i>unlocked;
  if(i===state.level)b.classList.add("selected");
  b.innerHTML=String(i).padStart(2,"0")+"<small>"+(i>unlocked?"LOCKED":records[i]?"★".repeat(records[i]):"○")+"</small>";
  b.addEventListener("click",()=>{save("-current",i);start(i);});
  grid.appendChild(b);
 }
}
$("levelBtn").addEventListener("click",()=>{renderLevels();$("levelOverlay").hidden=false;});
$("closeLevels").addEventListener("click",()=>{$("levelOverlay").hidden=true;});
function resize(){
 const rect=canvas.getBoundingClientRect();if(!rect.width||!rect.height)return;
 dpr=Math.min(2,window.devicePixelRatio||1);
 canvas.width=Math.round(rect.width*dpr);canvas.height=Math.round(rect.height*dpr);
 scale=Math.min(canvas.width/E.W,canvas.height/E.H);
 ox=(canvas.width-E.W*scale)/2;oy=(canvas.height-E.H*scale)/2;
}
window.addEventListener("resize",resize,{passive:true});
if("ResizeObserver" in window)new ResizeObserver(resize).observe(canvas);resize();
function point(e){const r=canvas.getBoundingClientRect();return{x:clamp(((e.clientX-r.left)*dpr-ox)/scale,8,E.W-8),y:clamp(((e.clientY-r.top)*dpr-oy)/scale,120,610)};}
function shoot(x,y){if(mode!=="playing")return;aim={x,y};if(E.launch(state,x,y)){beep("throw");updateHUD();}else if(!state.ball)msg("AIM ABOVE THE SNOWBALL",.8);}
canvas.addEventListener("pointerdown",e=>{if(mode!=="playing"||state.ball)return;down=point(e);holding=true;aim=down;try{canvas.setPointerCapture(e.pointerId);}catch{}});
canvas.addEventListener("pointermove",e=>{if(!holding||mode!=="playing")return;aim=point(e);});
canvas.addEventListener("pointerup",e=>{if(!holding||mode!=="playing")return;holding=false;const p=point(e);shoot(p.x,p.y);down=null;});
canvas.addEventListener("pointercancel",()=>{holding=false;down=null;});
document.addEventListener("keydown",e=>{
 if(e.key==="Escape"||e.key.toLowerCase()==="p"){if(!$("levelOverlay").hidden){$("levelOverlay").hidden=true;return;}if(mode==="playing")setOverlay("menu");else if(mode==="menu")hideOverlay();}
 if(mode!=="playing")return;
 if(e.key==="ArrowLeft"||e.key==="a"){aim.x=clamp(aim.x-15,10,410);e.preventDefault();}
 if(e.key==="ArrowRight"||e.key==="d"){aim.x=clamp(aim.x+15,10,410);e.preventDefault();}
 if(e.key==="ArrowUp"){aim.y=clamp(aim.y-15,180,450);e.preventDefault();}
 if(e.key==="ArrowDown"){aim.y=clamp(aim.y+15,180,450);e.preventDefault();}
 if(e.key===" "||e.key==="Enter"){shoot(aim.x,aim.y);e.preventDefault();}
});
function rr(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);}
function label(txt,x,y,size,color="#fff0d0",align="center"){
 ctx.font="900 "+size+"px 'Barlow Condensed',system-ui";ctx.textAlign=align;ctx.fillStyle=color;ctx.fillText(txt,x,y);
}
function scenery(t){
 const g=ctx.createLinearGradient(0,0,0,640);g.addColorStop(0,"#102a40");g.addColorStop(.48,"#375b61");g.addColorStop(1,"#7eada8");ctx.fillStyle=g;ctx.fillRect(0,0,420,640);
 ctx.fillStyle="#e9edd7";ctx.beginPath();ctx.arc(332,66,30,0,Math.PI*2);ctx.fill();
 ctx.fillStyle="#f9ebd5";ctx.globalAlpha=.1;ctx.beginPath();ctx.arc(332,66,50,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
 for(let k=0;k<2;k++){
  const y=197+k*60;ctx.fillStyle=k?"#1b4651":"#284f59";ctx.beginPath();ctx.moveTo(-5,280);
  for(let i=0;i<10;i++){let x=i*54-12;ctx.lineTo(x,y+(i%2)*15);ctx.lineTo(x+23,y-55-(i%3)*12);ctx.lineTo(x+52,y+(i%2)*12);}
  ctx.lineTo(425,470);ctx.closePath();ctx.fill();
 }
 ctx.fillStyle="#143b3b";for(let i=0;i<9;i++){const x=i*53-8,h=80+(i*17)%54;ctx.beginPath();ctx.moveTo(x,365);ctx.lineTo(x+22,365-h);ctx.lineTo(x+46,365);ctx.closePath();ctx.fill();ctx.fillStyle="#f3f5e6";ctx.beginPath();ctx.moveTo(x+9,365-h+27);ctx.lineTo(x+22,365-h);ctx.lineTo(x+35,365-h+27);ctx.closePath();ctx.fill();ctx.fillStyle="#143b3b";}
 // Wooden shooting gallery posts and canvas awning.
 ctx.fillStyle="#704537";ctx.fillRect(17,91,17,414);ctx.fillRect(386,91,17,414);
 ctx.fillStyle="#a46e49";ctx.fillRect(20,92,7,413);ctx.fillRect(390,92,7,413);
 ctx.fillStyle="#76333c";rr(26,101,368,89,10);ctx.fill();
 ctx.fillStyle="#bd504d";rr(31,106,358,70,7);ctx.fill();
 for(let i=0;i<12;i++){ctx.fillStyle=i%2?"#f3dcc0":"#c45150";ctx.beginPath();ctx.moveTo(31+i*30,161);ctx.lineTo(61+i*30,161);ctx.lineTo(46+i*30,197);ctx.closePath();ctx.fill();}
 label("THE NORTH POLE",210,133,19,"#f5e9ca");label("SNOWBALL TOSS",210,162,37,"#fff4da");
 // Bulbs on a suspended wire.
 ctx.strokeStyle="#263a37";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(25,207);ctx.quadraticCurveTo(210,245,394,207);ctx.stroke();
 for(let i=0;i<11;i++){const x=33+i*35,y=208+Math.sin(i/10*Math.PI)*18;ctx.fillStyle=["#edb65f","#cf5557","#80cbb2"][i%3];ctx.shadowBlur=8;ctx.shadowColor=ctx.fillStyle;ctx.beginPath();ctx.arc(x,y,4.5,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;}
 // Falling snow.
 for(const s of SNOW){const x=(s.x+t*7*s.s)%430,y=(s.y+t*11*s.s)%640;ctx.fillStyle="rgba(241,251,251,.43)";ctx.beginPath();ctx.arc(x,y,s.r,0,6.29);ctx.fill();}
}
function platform(){
 ctx.fillStyle="#23383a";ctx.fillRect(24,414,370,103);
 const wood=ctx.createLinearGradient(0,437,0,512);wood.addColorStop(0,"#c6915f");wood.addColorStop(.35,"#794938");wood.addColorStop(1,"#4a3434");
 ctx.fillStyle=wood;rr(23,437,373,78,5);ctx.fill();
 ctx.fillStyle="#d3a070";ctx.fillRect(27,457,367,5);ctx.fillRect(27,493,367,4);
 ctx.fillStyle="#513b32";for(let i=0;i<6;i++){const x=50+i*58;ctx.fillRect(x,461,3,32);ctx.beginPath();ctx.arc(x+2,450,3,0,6.29);ctx.fill();}
 ctx.fillStyle="#eaf7ef";ctx.beginPath();ctx.moveTo(18,439);ctx.lineTo(18,432);
 for(let x=20;x<=399;x+=17){ctx.quadraticCurveTo(x+8,425+Math.sin(x)*3,x+17,434);}ctx.lineTo(399,440);ctx.closePath();ctx.fill();
 // Foreground snow bank and snowball loading ramp.
 ctx.fillStyle="#d5e9e5";ctx.beginPath();ctx.moveTo(0,560);ctx.quadraticCurveTo(60,543,121,558);ctx.quadraticCurveTo(290,541,420,557);ctx.lineTo(420,640);ctx.lineTo(0,640);ctx.fill();
 ctx.fillStyle="#f5fcf3";ctx.beginPath();ctx.moveTo(0,573);ctx.quadraticCurveTo(192,556,420,574);ctx.lineTo(420,640);ctx.lineTo(0,640);ctx.fill();
 // Wooden ammunition box.
 ctx.fillStyle="#684735";rr(150,587,120,40,7);ctx.fill();
 ctx.fillStyle="#ad7848";rr(153,587,114,27,4);ctx.fill();ctx.fillStyle="#f3d0a0";ctx.fillRect(160,599,100,3);
 label("SNOWBALLS",210,612,15,"#392c2b");
}
function drawBarrier(q){
 ctx.save();ctx.fillStyle="#2b3b3b";ctx.fillRect(q.x+3,q.y+5,q.w,q.h);
 const g=ctx.createLinearGradient(0,q.y,0,q.y+q.h);g.addColorStop(0,"#e3b479");g.addColorStop(1,"#7b493b");
 ctx.fillStyle=g;rr(q.x,q.y,q.w,q.h,3);ctx.fill();
 ctx.strokeStyle="#553d36";ctx.lineWidth=2;ctx.strokeRect(q.x+3,q.y+2,q.w-6,q.h-4);
 for(let i=1;i<q.w/21;i++){ctx.fillStyle="#65433b";ctx.fillRect(q.x+i*21,q.y+3,2,q.h-5);}
 ctx.fillStyle="#f0f5ee";ctx.fillRect(q.x,q.y-2,q.w,3);ctx.restore();
}
function tin(t){
 ctx.save();
 const x=t.x,y=t.y,fall=t.fallen;
 ctx.fillStyle="#172f35aa";ctx.beginPath();ctx.ellipse(x+3,y+28,fall?32:20,6,0,0,6.29);ctx.fill();
 ctx.translate(x,y);ctx.rotate(t.angle);
 const w=36,h=48;
 const colors=t.type==="blast"?["#a72438","#ff7971","#7a2134"]:[["#9d3440","#e3756b","#7c2937"],["#1a6659","#61b38f","#165048"],["#a77a31","#eec975","#8c592f"]][t.color];
 const g=ctx.createLinearGradient(-w/2,0,w/2,0);g.addColorStop(0,colors[2]);g.addColorStop(.33,colors[1]);g.addColorStop(.72,colors[0]);g.addColorStop(1,colors[2]);
 ctx.fillStyle=g;rr(-w/2,-h/2,w,h,6);ctx.fill();
 ctx.strokeStyle="#392d34";ctx.lineWidth=1.5;ctx.stroke();
 ctx.fillStyle="#c7d0ca";ctx.beginPath();ctx.ellipse(0,-h/2,17.5,5.5,0,0,6.29);ctx.fill();
 ctx.fillStyle="#7a8985";ctx.beginPath();ctx.ellipse(0,-h/2+1,12.2,2.7,0,0,6.29);ctx.fill();
 ctx.fillStyle="#e8cfa8";ctx.fillRect(-16,-h/2+11,32,4);ctx.fillRect(-16,h/2-10,32,3);
 ctx.fillStyle="#fff7db";ctx.beginPath();
 if(t.type==="blast"){for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2,r=i%2?7:12;ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r+1);}ctx.closePath();ctx.fill();ctx.fillStyle="#82303b";label("!",0,7,14,"#913441");}
 else{
  ctx.strokeStyle="#fff5d9";ctx.lineWidth=2.2;
  for(let i=0;i<3;i++){let a=i*Math.PI/3;ctx.beginPath();ctx.moveTo(-Math.sin(a)*10,Math.cos(a)*10);ctx.lineTo(Math.sin(a)*10,-Math.cos(a)*10);ctx.stroke();}
  ctx.fillStyle="#fdf3d5";ctx.beginPath();ctx.arc(0,0,3,0,6.29);ctx.fill();
 }
 ctx.fillStyle="#e0e4d7";ctx.beginPath();ctx.ellipse(0,h/2,16.5,4.5,0,0,6.29);ctx.fill();
 if(!fall){ctx.fillStyle="#ffffff29";ctx.fillRect(-13,-16,3,28);}
 ctx.restore();
}
function snowball(x,y,r){
 ctx.save();
 ctx.fillStyle="#1b4d5988";ctx.beginPath();ctx.ellipse(x+3,y+r*.6,r*1.1,r*.38,0,0,6.29);ctx.fill();
 const g=ctx.createRadialGradient(x-r*.37,y-r*.4,1,x,y,r);
 g.addColorStop(0,"#fff");g.addColorStop(.47,"#edfaff");g.addColorStop(1,"#78b7cb");
 ctx.fillStyle=g;ctx.strokeStyle="#c4e4e9";ctx.lineWidth=1.4;ctx.beginPath();ctx.arc(x,y,r,0,6.29);ctx.fill();ctx.stroke();
 ctx.fillStyle="#ffffffb9";ctx.beginPath();ctx.arc(x-r*.3,y-r*.36,r*.22,0,6.29);ctx.fill();ctx.restore();
}
function snowflakes(){
 for(const f of sparks){
  ctx.globalAlpha=clamp(f.life/.7,0,1);
  ctx.fillStyle=f.color;ctx.save();ctx.translate(f.x,f.y);ctx.rotate(f.rot);
  ctx.fillRect(-f.r/2,-f.r/2,f.r,f.r);ctx.restore();
 }
 ctx.globalAlpha=1;
}
function launcher(){
 if(state.ball||mode!=="playing"){snowball(E.START.x,E.START.y,20);return;}
 ctx.save();
 const dx=aim.x-E.START.x,dy=aim.y-E.START.y,n=Math.hypot(dx,dy)||1;
 ctx.setLineDash([4,12]);ctx.lineDashOffset=-(state.clock*26)%16;ctx.strokeStyle="#fffbe0a8";ctx.lineWidth=3;
 ctx.beginPath();ctx.moveTo(E.START.x,E.START.y);ctx.lineTo(E.START.x+dx/n*Math.min(n,430),E.START.y+dy/n*Math.min(n,430));ctx.stroke();ctx.setLineDash([]);
 ctx.strokeStyle="#ffe7a0";ctx.lineWidth=2;ctx.beginPath();ctx.arc(aim.x,aim.y,14,0,6.29);ctx.stroke();
 ctx.beginPath();ctx.moveTo(aim.x-21,aim.y);ctx.lineTo(aim.x-8,aim.y);ctx.moveTo(aim.x+8,aim.y);ctx.lineTo(aim.x+21,aim.y);ctx.moveTo(aim.x,aim.y-21);ctx.lineTo(aim.x,aim.y-8);ctx.moveTo(aim.x,aim.y+8);ctx.lineTo(aim.x,aim.y+21);ctx.stroke();
 ctx.restore();snowball(E.START.x,E.START.y,20);
}
function render(){
 if(!scale)return;ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle="#142b32";ctx.fillRect(0,0,canvas.width,canvas.height);
 ctx.setTransform(scale,0,0,scale,ox,oy);
 scenery(state.clock);platform();
 state.barriers.forEach(drawBarrier);
 [...state.tins].sort((a,b)=>a.y-b.y).forEach(tin);
 launcher();
 if(state.ball){
  const b=state.ball;
  b.trail.forEach((p,i)=>{ctx.globalAlpha=(i+1)/b.trail.length*.26;snowball(p[0],p[1],6+i/b.trail.length*7);});
  ctx.globalAlpha=1;
  snowball(b.x,b.y,clamp(11+(b.y-250)/23,8,23));
 }
 snowflakes();
 if(mode==="playing"&&!state.ball&&state.balls>0&&state.clock<5){label("TAP THE TINS OR DRAG TO AIM",210,533,14,"#245863");}
}
function addParticles(x,y,kind){
 const color=kind==="blast"?"#ffbf62":kind==="tin"?"#f7ecd2":"#e5f8fa",num=kind==="blast"?48:kind==="tin"?20:7;
 for(let i=0;i<num;i++){const a=i/num*Math.PI*2,v=rand(40,200);sparks.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-40,r:rand(3,8),life:rand(.28,.86),color:i%4?"#e9f6e8":color,rot:rand(0,6.28)});}
 if(sparks.length>150)sparks.splice(0,sparks.length-150);
}
function tick(now){
 const dt=Math.min(.033,(now-last)/1000||0);last=now;
 if(mode==="playing"){
  E.step(state,dt);
  for(const ev of state.events){
   if(ev.kind==="tin"||ev.kind==="blast"){addParticles(ev.x,ev.y,ev.kind);beep(ev.kind);vibrate();}
   if(ev.kind==="wood")addParticles(ev.x,ev.y,"snow");
   if(ev.kind==="win"){msg("SHELF CLEARED!",1.3);finish("win");}
   if(ev.kind==="lose"){msg("OUT OF SNOWBALLS!",1.3);finish("lose");}
  }
  updateHUD();
 }
 for(const f of sparks){f.x+=f.vx*dt;f.y+=f.vy*dt;f.vy+=190*dt;f.life-=dt;f.rot+=dt*5;}
 sparks=sparks.filter(f=>f.life>0);
 $("message").classList.toggle("on",now<toastUntil&&mode==="playing");
 render();requestAnimationFrame(tick);
}
setOverlay("intro");updateHUD();requestAnimationFrame(tick);
})();
