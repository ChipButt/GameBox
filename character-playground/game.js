(() => {
'use strict';
const {Grid,PixelStage,PAL,mix,alpha,memo,clamp}=window.GBPixel;
const canvas=document.getElementById('game');
const wrap=document.getElementById('stageWrap');
const stage=new PixelStage(canvas,384,256,wrap);
const ctx=stage.ctx;
ctx.imageSmoothingEnabled=false;

const ACTIONS={
  idle:{frames:8,fps:5,label:'IDLE'},
  walk:{frames:6,fps:9,label:'WALK'},
  run:{frames:6,fps:13,label:'RUN'},
  punch:{frames:6,fps:14,label:'CROSS PUNCH'},
  kick:{frames:7,fps:13,label:'HIGH KICK'},
  fall:{frames:7,fps:9,label:'FALL'},
  jump:{frames:6,fps:11,label:'JUMP'}
};
const DIRS=['south','south-east','east','north-east','north','north-west','west','south-west'];
const VECTORS={
  south:[0,1],'south-east':[.707,.707],east:[1,0],'north-east':[.707,-.707],
  north:[0,-1],'north-west':[-.707,-.707],west:[-1,0],'south-west':[-.707,.707]
};

const VARIANTS=[
  {name:'Navy Guard',coat:'#395a88',coat2:'#273c61',legs:'#252d3a',hair:'#56392e',skin:'#d59b78'},
  {name:'Crimson',coat:'#a8494f',coat2:'#6d2d35',legs:'#31323a',hair:'#3c2a24',skin:'#d59b78'},
  {name:'Forest',coat:'#48785c',coat2:'#2f503d',legs:'#3a342e',hair:'#7d593c',skin:'#c98967'},
  {name:'Gold',coat:'#c69b37',coat2:'#7f6122',legs:'#35465d',hair:'#44322c',skin:'#e0aa83'},
  {name:'Violet',coat:'#745a9d',coat2:'#493865',legs:'#292d40',hair:'#2d2528',skin:'#b87558'},
  {name:'Slate',coat:'#64748b',coat2:'#3f4b5e',legs:'#262b33',hair:'#b47b43',skin:'#e0aa83'},
  {name:'Teal',coat:'#3e847e',coat2:'#285b57',legs:'#243641',hair:'#35261f',skin:'#c98967'},
  {name:'Rose',coat:'#b85f79',coat2:'#783c50',legs:'#4a3740',hair:'#6d4938',skin:'#d59b78'}
];

const state={
  variant:0,x:192,y:134,dir:'south',action:'idle',actionStart:0,
  moving:false,run:false,joyX:0,joyY:0,jumpOffset:0,last:performance.now()
};

function dirFromVector(x,y){
  if(Math.hypot(x,y)<.12)return state.dir;
  let a=Math.atan2(y,x)*180/Math.PI;
  if(a<0)a+=360;
  const map=['east','south-east','south','south-west','west','north-west','north','north-east'];
  return map[Math.round(a/45)%8];
}
function cardinal(dir){
  if(dir.includes('south'))return 'south';
  if(dir.includes('north'))return 'north';
  return dir.includes('west')?'west':'east';
}
function frameFor(now){
  const a=ACTIONS[state.action];
  const elapsed=(now-state.actionStart)/1000;
  if(['punch','kick','fall','jump'].includes(state.action)){
    return Math.min(a.frames-1,Math.floor(elapsed*a.fps));
  }
  return Math.floor(now/1000*a.fps)%a.frames;
}
function actionFinished(now){
  if(!['punch','kick','fall','jump'].includes(state.action))return false;
  const a=ACTIONS[state.action];
  return (now-state.actionStart)/1000>=a.frames/a.fps;
}
function setAction(name,now=performance.now()){
  if(!ACTIONS[name])return;
  state.action=name;state.actionStart=now;
  document.getElementById('actionLabel').textContent=ACTIONS[name].label;
}
function finishAction(now){
  if(state.moving)setAction(state.run?'run':'walk',now);
  else setAction('idle',now);
}
function perform(name){
  if(['punch','kick','fall','jump'].includes(state.action)&&!actionFinished(performance.now()))return;
  setAction(name);
}

function bodyPalette(v){
  return {
    ink:'#171923',skin:v.skin,skinShadow:mix(v.skin,'#5d342d',.36),skinHi:mix(v.skin,'#fff1d5',.28),
    hair:v.hair,hairDark:mix(v.hair,'#171923',.5),
    coat:v.coat,coatDark:v.coat2,coatHi:mix(v.coat,'#fff6d6',.24),
    legs:v.legs,legsHi:mix(v.legs,'#8ea0bd',.26),shoe:'#171923',shirt:'#e9e3d2'
  };
}
function limb(g,x0,y0,x1,y1,col,w=2){g.line(Math.round(x0),Math.round(y0),Math.round(x1),Math.round(y1),col,w)}
function buildSprite(variantIndex,dir,action,frame){
  const v=VARIANTS[variantIndex],c=bodyPalette(v),g=new Grid(36,36);
  const d=VECTORS[dir]||[0,1],side=d[0],front=d[1];
  const t=(frame/(Math.max(1,ACTIONS[action].frames-1)))*Math.PI*2;
  const walk=action==='walk'?Math.sin(t):action==='run'?Math.sin(t)*1.45:0;
  const bob=(action==='walk'?Math.abs(Math.sin(t))*1:action==='run'?Math.abs(Math.sin(t))*1.5:0);
  const cx=18,headY=8-bob*.25,shoulderY=14-bob*.2,hipY=23-bob*.1;
  let armA=walk*2.2,armB=-walk*2.2,legA=-walk*2.6,legB=walk*2.6;

  if(action==='punch'){
    const p=Math.sin(Math.min(1,frame/4)*Math.PI);
    armA=8*p;armB=-1.5*p;
  }
  if(action==='kick'){
    const p=Math.sin(Math.min(1,frame/5)*Math.PI);
    legA=8*p;armA=-2*p;armB=2*p;
  }

  // Back hair and shadow.
  g.ellipse(cx,headY,5,5,c.hairDark);
  if(front<-.2)g.rect(cx-5,headY+1,10,5,c.hairDark);

  // Far leg.
  const farShift=front>0?-1:1;
  limb(g,cx-2,hipY,cx-3+legB*side*.65+farShift,31+legB*front*.28,c.legs,3);
  g.rect(Math.round(cx-5+legB*side*.65+farShift),30+Math.round(legB*front*.28),5,2,c.shoe);

  // Torso.
  g.poly([[cx-5,shoulderY],[cx+5,shoulderY],[cx+4,hipY],[cx-4,hipY]],c.coatDark);
  g.poly([[cx-3,shoulderY],[cx+3,shoulderY],[cx+2,hipY-1],[cx-2,hipY-1]],c.coat);
  g.vline(cx,shoulderY+1,hipY-2,c.shirt);
  g.set(cx-1,shoulderY+2,c.coatHi);

  // Far arm.
  let farHandX=cx-6-side*armB*.2,farHandY=shoulderY+8+front*armB*.18;
  limb(g,cx-4,shoulderY+1,farHandX,farHandY,c.coatDark,3);
  g.ellipse(farHandX,farHandY+1,1.4,1.4,c.skinShadow);

  // Neck/head.
  g.rect(cx-2,headY+4,4,3,c.skinShadow);
  g.ellipse(cx,headY,4,4.3,c.skin);
  if(front>=-.25){
    const eyeY=headY,eyeDx=side>0?2:side<0?-2:0;
    if(Math.abs(side)>.55)g.set(cx+eyeDx,eyeY,c.ink);
    else {g.set(cx-2+eyeDx*.3,eyeY,c.ink);g.set(cx+2+eyeDx*.3,eyeY,c.ink)}
  }
  g.hline(cx-4,cx+3,headY-4,c.hair);
  g.set(cx-4,headY-3,c.hair);g.set(cx+4,headY-2,c.hairDark);g.set(cx-2,headY-4,c.coatHi);

  // Near arm / punch.
  let nearHandX=cx+6+side*armA*.25,nearHandY=shoulderY+8+front*armA*.18;
  if(action==='punch'){
    const p=Math.sin(Math.min(1,frame/4)*Math.PI);
    nearHandX=cx+side*10*p+(side===0?3:0);
    nearHandY=shoulderY+5+front*9*p;
  }
  limb(g,cx+4,shoulderY+1,nearHandX,nearHandY,c.coat,3);
  g.ellipse(nearHandX,nearHandY+1,1.5,1.5,c.skin);

  // Near leg / kick.
  if(action==='kick'){
    const p=Math.sin(Math.min(1,frame/5)*Math.PI);
    const kx=cx+side*11*p+(side===0?5*p:0);
    const ky=hipY+7+front*8*p-7*p;
    limb(g,cx+2,hipY,kx,ky,c.legsHi,3);
    g.rect(Math.round(kx-2),Math.round(ky),5,2,c.shoe);
  }else{
    limb(g,cx+2,hipY,cx+3+legA*side*.65,31+legA*front*.28,c.legsHi,3);
    g.rect(Math.round(cx+1+legA*side*.65),30+Math.round(legA*front*.28),5,2,c.shoe);
  }

  // Badge and belt details.
  if(front>=-.25){g.set(cx+3,shoulderY+3,'#f2bd4f');g.hline(cx-4,cx+4,hipY-1,c.ink)}
  g.outline(c.ink,true);

  let out=g.toCanvas();
  if(action==='fall'){
    const p=clamp(frame/(ACTIONS.fall.frames-1),0,1);
    const temp=document.createElement('canvas');temp.width=36;temp.height=36;
    const q=temp.getContext('2d');q.imageSmoothingEnabled=false;
    q.translate(18,18+6*p);q.rotate((side>=0?1:-1)*p*Math.PI*.46);q.drawImage(out,-18,-18);out=temp;
  }
  return out;
}
const sprite=memo((key)=>{
  const [vi,dir,action,frame]=key.split('|');
  return buildSprite(Number(vi),dir,action,Number(frame));
});

function world(){
  ctx.fillStyle='#203a4a';ctx.fillRect(0,0,384,256);
  // distant wall
  ctx.fillStyle='#355267';ctx.fillRect(0,0,384,54);
  ctx.fillStyle='#4c6b79';ctx.fillRect(0,48,384,6);
  for(let x=12;x<384;x+=48){ctx.fillStyle='#2b4556';ctx.fillRect(x,12,28,22);ctx.fillStyle='#88b0b0';ctx.fillRect(x+4,16,20,14)}
  // floor
  ctx.fillStyle='#b48e67';ctx.fillRect(0,54,384,202);
  for(let y=62;y<256;y+=16){ctx.fillStyle=(y/16)%2?'#a9815e':'#bd9872';ctx.fillRect(0,y,384,1)}
  for(let x=0;x<384;x+=32){ctx.fillStyle='#9d7758';ctx.fillRect(x,54,1,202)}
  // rug
  ctx.fillStyle='#263b56';ctx.fillRect(104,92,176,98);
  ctx.fillStyle='#365578';ctx.fillRect(108,96,168,90);
  ctx.fillStyle='#d2ad7f';ctx.fillRect(114,102,156,78);
  ctx.fillStyle='#9d5260';ctx.fillRect(120,108,144,66);
  ctx.fillStyle='#b86a72';ctx.fillRect(126,114,132,54);
  // furniture silhouettes
  ctx.fillStyle='#5d3e34';ctx.fillRect(20,75,52,43);ctx.fillRect(25,118,7,16);ctx.fillRect(60,118,7,16);
  ctx.fillStyle='#8e6048';ctx.fillRect(25,80,42,31);
  ctx.fillStyle='#4e342d';ctx.fillRect(310,75,52,66);ctx.fillStyle='#9d7255';ctx.fillRect(315,81,42,54);
  ctx.fillStyle='#ead8b6';ctx.fillRect(321,91,30,20);
}
function update(dt,now){
  if(actionFinished(now))finishAction(now);
  const mag=Math.hypot(state.joyX,state.joyY);
  const locked=['punch','kick','fall'].includes(state.action)&&!actionFinished(now);
  state.moving=mag>.12&&!locked;
  if(state.moving){
    state.dir=dirFromVector(state.joyX,state.joyY);
    const speed=state.run?78:46;
    state.x=clamp(state.x+(state.joyX/mag)*speed*dt,22,362);
    state.y=clamp(state.y+(state.joyY/mag)*speed*dt,76,224);
    if(!['jump'].includes(state.action))setAction(state.run?'run':'walk',now);
  }else if(!['punch','kick','fall','jump'].includes(state.action))setAction('idle',now);
  if(state.action==='jump'){
    const a=ACTIONS.jump,elapsed=(now-state.actionStart)/1000,p=clamp(elapsed/(a.frames/a.fps),0,1);
    state.jumpOffset=-Math.sin(p*Math.PI)*24;
  }else state.jumpOffset=0;
}
function draw(now){
  world();
  // shadow
  ctx.fillStyle='#17192355';ctx.beginPath();ctx.ellipse(Math.round(state.x),Math.round(state.y+7),10,4,0,0,Math.PI*2);ctx.fill();
  const frame=frameFor(now),dir=['punch','kick','fall'].includes(state.action)?cardinal(state.dir):state.dir;
  const img=sprite(`${state.variant}|${dir}|${state.action}|${frame}`);
  ctx.save();ctx.imageSmoothingEnabled=false;
  ctx.drawImage(img,Math.round(state.x-18),Math.round(state.y-31+state.jumpOffset));
  ctx.restore();
  // small guide marks
  ctx.fillStyle='#10131cbb';ctx.fillRect(8,8,116,18);ctx.fillStyle='#fff';ctx.font='bold 8px monospace';ctx.fillText(VARIANTS[state.variant].name.toUpperCase(),14,20);
}
function loop(now){
  const dt=Math.min(.05,(now-state.last)/1000);state.last=now;
  update(dt,now);draw(now);requestAnimationFrame(loop);
}

function buildPicker(){
  const host=document.getElementById('characterGrid');host.innerHTML='';
  VARIANTS.forEach((v,i)=>{
    const b=document.createElement('button');b.className='charChoice';b.type='button';
    const c=document.createElement('canvas');c.width=72;c.height=72;
    const x=c.getContext('2d');x.imageSmoothingEnabled=false;x.fillStyle='#24344a';x.fillRect(0,0,72,72);
    x.drawImage(buildSprite(i,'south','idle',0),0,0,36,36,9,4,54,54);
    const label=document.createElement('strong');label.textContent=v.name;b.append(c,label);
    b.onclick=()=>{state.variant=i;document.getElementById('picker').classList.add('hidden');setAction('idle');};
    host.appendChild(b);
  });
}
document.getElementById('changeCharacter').onclick=()=>document.getElementById('picker').classList.remove('hidden');

let joyPointer=null;
const joy=document.getElementById('joystick'),knob=document.getElementById('joyKnob');
function joyMove(ev){
  const r=joy.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,dx=ev.clientX-cx,dy=ev.clientY-cy,max=34,m=Math.hypot(dx,dy)||1,k=Math.min(1,max/m);
  const px=dx*k,py=dy*k;knob.style.transform=`translate(${px}px,${py}px)`;
  state.joyX=px/max;state.joyY=py/max;
}
joy.addEventListener('pointerdown',ev=>{joyPointer=ev.pointerId;joy.setPointerCapture(ev.pointerId);joyMove(ev)});
joy.addEventListener('pointermove',ev=>{if(ev.pointerId===joyPointer)joyMove(ev)});
function joyEnd(ev){if(ev.pointerId!==joyPointer)return;joyPointer=null;state.joyX=state.joyY=0;knob.style.transform='translate(0,0)'}
joy.addEventListener('pointerup',joyEnd);joy.addEventListener('pointercancel',joyEnd);

document.querySelectorAll('.action').forEach(b=>b.addEventListener('pointerdown',ev=>{ev.preventDefault();perform(b.dataset.action)}));
const runBtn=document.getElementById('runBtn');
function setRun(v){state.run=v;runBtn.classList.toggle('active',v)}
runBtn.addEventListener('pointerdown',ev=>{ev.preventDefault();setRun(true)});
runBtn.addEventListener('pointerup',()=>setRun(false));runBtn.addEventListener('pointercancel',()=>setRun(false));runBtn.addEventListener('pointerleave',()=>setRun(false));

const keys=new Set();
addEventListener('keydown',ev=>{
  const k=ev.key.toLowerCase();keys.add(k);
  if(['arrowup','arrowdown','arrowleft','arrowright',' ','shift'].includes(k))ev.preventDefault();
  if(k===' ')perform('jump');else if(k==='j')perform('punch');else if(k==='k')perform('kick');else if(k==='l')perform('fall');
  if(k==='shift')setRun(true);
});
addEventListener('keyup',ev=>{keys.delete(ev.key.toLowerCase());if(ev.key==='Shift')setRun(false)});
function keyboardJoy(){
  let x=0,y=0;if(keys.has('arrowleft')||keys.has('a'))x--;if(keys.has('arrowright')||keys.has('d'))x++;if(keys.has('arrowup')||keys.has('w'))y--;if(keys.has('arrowdown')||keys.has('s'))y++;
  if(x||y){state.joyX=x;state.joyY=y}else if(joyPointer===null){state.joyX=state.joyY=0}
  requestAnimationFrame(keyboardJoy);
}

buildPicker();setAction('idle');requestAnimationFrame(keyboardJoy);requestAnimationFrame(loop);
})();
