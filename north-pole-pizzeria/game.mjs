import {TOPPINGS,UPGRADES,ORDERS_PER_DAY,availableToppings,requiredCuts,makeOrder,newPizza,applyIngredient,evaluate,buyUpgrade,ovenDuration,customerSeconds} from './engine.mjs';

const $=id=>document.getElementById(id);
const STORAGE='gamebox.north-pole-pizzeria.v1';
const saved=(()=>{try{return JSON.parse(localStorage.getItem(STORAGE)||'{}')}catch{return {}}})();
const shop={day:Math.max(1,Number(saved.day)||1),cash:Number.isFinite(saved.cash)?saved.cash:25,best:Number(saved.best)||0,upgrades:saved.upgrades||{},sound:saved.sound!==false};
let order=null,pizza=newPizza(),orderIndex=0,dayStartCash=shop.cash,results=[],stage='prep',selected='pepperoni',paused=true,shown='welcome',remaining=85,lastFrame=performance.now(),history=[],toaster=0,audio=null;
const canvas=$('pizzaCanvas'),ctx=canvas.getContext('2d');
const money=n=>'£'+Number(n).toFixed(2);
function save(){try{localStorage.setItem(STORAGE,JSON.stringify(shop))}catch{}}
function show(name){shown=name;for(const el of document.querySelectorAll('.overlay'))el.classList.toggle('show',el.id===name);paused=!!name;}
function sound(pitch=450){if(!shop.sound)return;try{audio??=new (window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();const o=audio.createOscillator(),g=audio.createGain(),at=audio.currentTime;o.type='sine';o.frequency.setValueAtTime(pitch,at);o.frequency.exponentialRampToValueAtTime(pitch*.72,at+.13);g.gain.setValueAtTime(.045,at);g.gain.exponentialRampToValueAtTime(.001,at+.14);o.connect(g).connect(audio.destination);o.start(at);o.stop(at+.15)}catch{}}
function toast(text){$('toast').textContent=text;$('toast').classList.add('show');clearTimeout(toaster);toaster=setTimeout(()=>$('toast').classList.remove('show'),1300)}
function setLabel(id,value){$(id).textContent=value}
function portrait(kind){
  const skin=kind==='santa'?'#f3bf9e':kind==='reindeer'?'#c99065':kind==='snow'?'#fff2e4':'#f2bb93';
  const hat=kind==='santa'?'#bb433e':kind==='snow'?'#3d6a68':'#268367';
  const outfit=kind==='santa'?'#bd514b':kind==='snow'?'#77b4ad':kind==='reindeer'?'#99674d':'#398a68';
  const ears=kind==='elf'?'<path d="M31 65 4 48 17 83 40 87M115 65 143 48 130 83 106 87" fill="#e6ac85" stroke="#ac7358" stroke-width="2"/>':'';
  const antlers=kind==='reindeer'?'<path d="M38 50 24 12M24 12 11 23M24 12 41 9M106 50 122 12M122 12 135 23M122 12 105 9" stroke="#785136" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" fill="none"/>':'';
  const beard=kind==='santa'?'<path d="M36 99Q35 137 73 142Q115 136 108 98L94 107Q78 117 72 113Q62 115 49 108Z" fill="#fff9e9"/><path d="M61 105Q71 97 81 105" stroke="#dcd8c9" stroke-width="4" fill="none"/>':'';
  const snowNose=kind==='snow'?'<path d="M73 80 106 86 74 89Z" fill="#e1844f"/>':'<ellipse cx="73" cy="85" rx="6" ry="4" fill="#c78165"/>';
  return `<svg viewBox="0 0 148 158" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <ellipse cx="73" cy="165" rx="69" ry="61" fill="${outfit}"/><path d="M72 110v49" stroke="#ffe1a5" stroke-width="8"/>
    ${antlers}${ears}<ellipse cx="73" cy="77" rx="45" ry="48" fill="${skin}"/>
    <circle cx="56" cy="77" r="4.5" fill="#363b32"/><circle cx="89" cy="77" r="4.5" fill="#363b32"/>
    <circle cx="53" cy="92" r="7" fill="#d8757860"/><circle cx="93" cy="92" r="7" fill="#d8757860"/>
    ${snowNose}<path d="M65 100Q73 109 81 100" fill="none" stroke="#8d554e" stroke-width="2.7" stroke-linecap="round"/>
    ${beard}<path d="M27 53Q31 7 79 8Q112 11 116 55L99 51Q75 33 48 53Z" fill="${hat}"/>
    <path d="M28 53Q71 41 115 52" stroke="#f9eacb" stroke-width="12" stroke-linecap="round"/>
    <circle cx="104" cy="13" r="11" fill="#fff9e9"/>
    <path d="M26 139Q47 122 69 129Q102 123 123 139" fill="none" stroke="#e8dba8" stroke-width="5"/>
  </svg>`;
}
function ingredientsUI(){
  const foods=[{id:'sauce',name:'Tomato sauce',icon:'🍅'},{id:'cheese',name:'Mozzarella',icon:'🧀'},...availableToppings(shop.day).map(id=>({id,name:TOPPINGS[id].label,icon:{pepperoni:'🔴',mushroom:'🍄',pepper:'🫑',basil:'🌿'}[id]}))];
  $('ingredients').replaceChildren();
  for(const food of foods){
    const b=document.createElement('button');b.type='button';b.className='ingredientBtn';b.dataset.ingredient=food.id;
    b.innerHTML='<span class="foodIcon" aria-hidden="true">'+food.icon+'</span><span>'+food.name+'</span>';
    b.addEventListener('click',()=>{
      if(stage!=='prep'||paused)return;
      if(food.id==='sauce'||food.id==='cheese'){add(food.id,.5,.5);return;}
      selected=food.id;refresh();sound(330);
    });
    $('ingredients').appendChild(b);
  }
}
function updateTop(){
  setLabel('dayLabel',String(shop.day).padStart(2,'0'));
  setLabel('orderLabel',(orderIndex+1)+' / '+ORDERS_PER_DAY);
  setLabel('cashLabel',money(shop.cash));
  setLabel('bestLabel',money(shop.best));
  setLabel('ingredientCost',money(pizza.spend));
  setLabel('customerName',order?.customer.toUpperCase()||'CUSTOMER');
  setLabel('orderText',order?.description||'');
  setLabel('orderReminder',order?.description||'');
  setLabel('orderPrice',money(order?.price||0));
  if(order)$('customerPortrait').innerHTML=portrait(order.portrait);
  const pct=Math.max(0,Math.round(100*remaining/customerSeconds(shop.upgrades)));
  setLabel('patienceLabel','HAPPY '+pct+'%');
  $('patienceFill').style.width=pct+'%';
  $('patienceFill').style.background=pct<30?'#c36550':pct<55?'#d7ae65':'linear-gradient(90deg,#75b98d,#b4d994)';
}
function refresh(){
  updateTop();
  const steps={prep:0,oven:1,slice:2,ready:3};
  setLabel('phaseCount','0'+(steps[stage]+1)+' / 04');
  setLabel('stageLabel',{prep:'PREPARING',oven:'IN THE OVEN',slice:'SLICING',ready:'READY TO SERVE'}[stage]);
  setLabel('stationLabel',{prep:'FRESH PIZZA DOUGH',oven:'COOKING TO PERFECTION',slice:'FRESH FROM THE OVEN',ready:'BOXED & READY'}[stage]);
  setLabel('stepTitle',{prep:'Build their pizza',oven:'Watch the oven!',slice:'Time to slice',ready:'Send it out!'}[stage]);
  setLabel('stepHelp',{
    prep:'Tap sauce or cheese to spread it. Select a topping, then tap around the pizza to place each piece.',
    oven:'The pizza is baking. Pull it out when the golden zone is reached. Be careful not to burn it.',
    slice:'Cut the pizza into the number of slices requested by your customer.',
    ready:'Finish this order and hear what your customer thought.'
  }[stage]);
  const prepare=stage==='prep',baking=stage==='oven',cutting=stage==='slice';
  $('ingredients').hidden=!prepare;$('prepActions').hidden=!prepare;
  $('ovenPanel').hidden=!baking;$('slicePanel').hidden=!cutting;
  $('mainBtn').innerHTML=({prep:'BAKE PIZZA',oven:'PULL FROM OVEN',slice:'SERVE CUSTOMER',ready:'SERVE CUSTOMER'}[stage])+' <span>➜</span>';
  $('mainBtn').disabled=baking&&pizza.bake<.62;
  $('cutBtn').hidden=!cutting;
  $('canvasHint').textContent={prep:('SELECT '+(selected==='sauce'?'SAUCE':selected==='cheese'?'CHEESE':TOPPINGS[selected]?.label.toUpperCase()||'TOPPINGS')+' · TAP PIZZA'),oven:'THE OVEN IS HEATING UP',slice:'TAP CUT PIZZA TO ADD A SLICE',ready:'READY FOR THE CUSTOMER'}[stage];
  setLabel('slicesDone',pizza.cuts);setLabel('slicesNeeded',requiredCuts(order?.needed.slices||6));
  setLabel('tipText',{prep:'For the best review, aim for six pieces of each topping — three for a half pizza.',oven:'Regular pizzas need a golden bake. Extra crispy ones need a deeper colour.',slice:'Each cut passes through the middle and creates two more slices.',ready:'A good pizza earns a tip. Wasted ingredients reduce your profit.'}[stage]);
  document.querySelectorAll('.ingredientBtn').forEach(b=>b.classList.toggle('selected',b.dataset.ingredient===selected));
  paint();
}
function startOrder(i){
  orderIndex=i;order=makeOrder(shop.day,i);pizza=newPizza();history=[];stage='prep';remaining=customerSeconds(shop.upgrades);selected='sauce';
  ingredientsUI();setLabel('bakePercent','0%');$('ovenFill').style.width='0%';setLabel('heatLabel','WARMING UP');show(null);refresh();sound(610);
}
function add(id,x,y){
  if(stage!=='prep'||paused)return;
  const before=structuredClone(pizza);
  if(!applyIngredient(pizza,id,x,y)){if(id==='sauce'||id==='cheese')toast('Already added!');return;}
  history.push(before);refresh();sound(420);
}
canvas.addEventListener('pointerdown',event=>{
  if(paused||stage!=='prep')return;
  const r=canvas.getBoundingClientRect(),x=(event.clientX-r.left)/r.width,y=(event.clientY-r.top)/r.height;
  add(selected,x,y);
});
canvas.addEventListener('keydown',event=>{if(event.code==='Enter'||event.code==='Space'){event.preventDefault();add(selected,.5,.5)}});
$('undoBtn').addEventListener('click',()=>{if(!history.length||stage!=='prep'||paused)return;pizza=history.pop();refresh()});
$('resetBtn').addEventListener('click',()=>{if(stage!=='prep'||paused)return;pizza=newPizza();history=[];refresh();toast('Fresh dough ready')});
function serve(){
  const review=evaluate(order,pizza,remaining/customerSeconds(shop.upgrades),shop.upgrades);
  shop.cash=+(shop.cash+review.earned).toFixed(2);
  results.push(review);save();updateTop();
  setLabel('resultEyebrow',review.accuracy>=74?'A HAPPY CUSTOMER':'ROOM FOR IMPROVEMENT');
  setLabel('reviewStars','★'.repeat(review.stars)+'☆'.repeat(3-review.stars));
  setLabel('reviewTitle',review.accuracy>=92?'Christmas perfection!':review.accuracy>=74?'Delicious delivery!':review.accuracy>=52?'Not quite perfect...':'Something went wrong!');
  setLabel('reviewMessage',order.customer+' rated your pizza '+review.accuracy+'% accurate. '+(review.refund?'Part of the price was refunded.':'A warm North Pole welcome!'));
  setLabel('receiptPrice',money(order.price));setLabel('receiptTip',money(review.tip));
  setLabel('receiptCosts','−'+money(review.refund+pizza.spend));
  setLabel('receiptTotal',(review.earned<0?'−':'')+money(Math.abs(review.earned)));
  $('nextOrderBtn').textContent=orderIndex===ORDERS_PER_DAY-1?'CLOSE THE SHOP →':'NEXT CUSTOMER →';
  show('orderResult');sound(review.stars>=2?880:230);
}
$('mainBtn').addEventListener('click',()=>{
  if(paused)return;
  if(stage==='prep'){stage='oven';pizza.bake=0;setLabel('bakePercent','0%');$('ovenFill').style.width='0%';setLabel('heatLabel','WARMING UP');refresh();sound(290);}
  else if(stage==='oven'){if(pizza.bake<.62)return;stage='slice';refresh();sound(540);}
  else if(stage==='slice'||stage==='ready')serve();
});
$('cutBtn').addEventListener('click',()=>{
  if(paused||stage!=='slice')return;
  if(pizza.cuts>=5){toast('Five cuts is plenty!');return;}
  pizza.cuts++;refresh();sound(770);
});
function endShift(){
  const profit=+(shop.cash-dayStartCash).toFixed(2);
  shop.best=Math.max(shop.best,profit);
  save();
  setLabel('ordersServed',results.length);
  setLabel('dayProfit',(profit<0?'−':'')+money(Math.abs(profit)));
  setLabel('dayCash',money(shop.cash));
  const list=$('upgradesList');list.replaceChildren();
  for(const [key,u] of Object.entries(UPGRADES)){
    const row=document.createElement('div');row.className='upgradeItem';
    const details=document.createElement('div'),btn=document.createElement('button');
    const owned=!!shop.upgrades[key];
    details.innerHTML='<strong>'+u.name+'</strong><small>'+u.detail+'</small>';
    btn.type='button';btn.disabled=owned||shop.cash<u.cost;btn.textContent=owned?'OWNED':money(u.cost);
    btn.addEventListener('click',()=>{
      const purchase=buyUpgrade(shop.cash,shop.upgrades,key);if(!purchase)return;
      shop.cash=purchase.cash;shop.upgrades=purchase.upgrades;save();endShift();toast('Kitchen upgrade purchased!');sound(860);
    });
    row.append(details,btn);list.append(row);
  }
  const nextTopping=Object.entries(TOPPINGS).find(([k,v])=>v.day===shop.day+1);
  setLabel('unlockNote',nextTopping?'NEXT DAY UNLOCK: '+nextTopping[1].label.toUpperCase():'NEW CHALLENGES AWAIT TOMORROW!');
  show('endDay');
}
$('nextOrderBtn').addEventListener('click',()=>{if(orderIndex+1>=ORDERS_PER_DAY)endShift();else startOrder(orderIndex+1)});
$('nextDayBtn').addEventListener('click',()=>{shop.day++;save();dayStartCash=shop.cash;results=[];startOrder(0)});
$('playBtn').addEventListener('click',()=>{dayStartCash=shop.cash;results=[];startOrder(0)});
$('menuBtn').addEventListener('click',()=>{if(!shown)show('pauseMenu')});
$('resumeBtn').addEventListener('click',()=>{show(null);lastFrame=performance.now()});
$('soundBtn').addEventListener('click',()=>{shop.sound=!shop.sound;save();setLabel('soundBtn','SOUND: '+(shop.sound?'ON':'OFF'))});
$('helpBtn').addEventListener('click',()=>toast('Sauce & cheese → tap toppings → bake → cut → serve!'));
window.addEventListener('keydown',e=>{if(e.key==='Escape'){if(shown==='pauseMenu')show(null);else if(!shown)show('pauseMenu')}});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&!shown)show('pauseMenu');lastFrame=performance.now()});

// High-resolution procedural food illustration: original painted artwork,
// no copied sprites from Good Pizza, Great Pizza.
const TWO_PI=Math.PI*2;
function rand(seed){let s=seed>>>0;return()=>{s=(1664525*s+1013904223)>>>0;return s/4294967296}}
function circle(x,y,r,fill,stroke=null,w=1){ctx.beginPath();ctx.arc(x,y,r,0,TWO_PI);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=w;ctx.stroke()}}
function stroke(x1,y1,x2,y2,colour,w){ctx.strokeStyle=colour;ctx.lineWidth=w;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke()}
function ingredientArt(t,i){
  const x=t.x*560,y=t.y*560,seed=i*489+127;
  const r=rand(seed);ctx.save();ctx.translate(x,y);ctx.rotate(r()*6.2);
  if(t.kind==='pepperoni'){
    circle(0,0,19,'#ad3d35','#f19665',2.5);circle(-3,-4,13,'#cb5640');
    for(let j=0;j<7;j++){const a=r()*TWO_PI,d=r()*12;circle(Math.cos(a)*d,Math.sin(a)*d,1.5+r()*2,'#f0a16b')}
    circle(3,5,2,'#f5ba82');
  }else if(t.kind==='mushroom'){
    ctx.fillStyle='#e6c39b';ctx.strokeStyle='#866248';ctx.lineWidth=2.5;
    ctx.beginPath();ctx.moveTo(-7,5);ctx.lineTo(-8,15);ctx.quadraticCurveTo(0,19,9,14);ctx.lineTo(7,4);ctx.quadraticCurveTo(0,0,-7,5);ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.moveTo(-20,2);ctx.quadraticCurveTo(-17,-18,0,-17);ctx.quadraticCurveTo(17,-18,21,2);ctx.quadraticCurveTo(0,9,-20,2);ctx.fillStyle='#d9b28b';ctx.fill();ctx.stroke();
    for(let j=-1;j<=1;j++)stroke(j*6,0,j*6+1,5,'#9f7956',1.4);
  }else if(t.kind==='pepper'){
    ctx.beginPath();ctx.arc(0,0,16,.45,5.1);ctx.strokeStyle='#23764d';ctx.lineWidth=9;ctx.stroke();
    ctx.beginPath();ctx.arc(0,0,16,.45,5.1);ctx.strokeStyle='#84ca54';ctx.lineWidth=3;ctx.stroke();
  }else if(t.kind==='basil'){
    ctx.beginPath();ctx.moveTo(-1,19);ctx.bezierCurveTo(-26,6,-14,-22,1,-21);ctx.bezierCurveTo(22,-16,20,10,-1,19);
    ctx.fillStyle='#348e44';ctx.fill();ctx.strokeStyle='#23623b';ctx.lineWidth=2;ctx.stroke();
    stroke(0,-14,0,15,'#9ec569',1.4);
  }
  ctx.restore();
}
function paint(){
  ctx.clearRect(0,0,560,560);
  const cx=280,cy=278;
  ctx.save();ctx.shadowColor='#42220f70';ctx.shadowBlur=33;ctx.shadowOffsetY=15;
  circle(cx,cy,234,'#bd8b5b');ctx.restore();
  const r=rand(253);
  const bread=ctx.createRadialGradient(246,234,35,280,280,231);
  bread.addColorStop(0,'#f7d588');bread.addColorStop(.73,'#e7b76d');bread.addColorStop(.86,'#e5a35c');bread.addColorStop(1,'#a76238');
  ctx.beginPath();
  for(let k=0;k<=90;k++){
    const a=k/90*TWO_PI,rr=229+(Math.sin(a*14)+Math.cos(a*21))*2.6+(r()-.5)*4.5;
    const x=cx+Math.cos(a)*rr,y=cy+Math.sin(a)*rr;
    if(!k)ctx.moveTo(x,y);else ctx.lineTo(x,y);
  }
  ctx.closePath();ctx.fillStyle=bread;ctx.fill();ctx.strokeStyle='#ad6f42';ctx.lineWidth=5;ctx.stroke();
  // Hand-formed crust bubbles.
  for(let i=0;i<35;i++){const a=r()*TWO_PI,rr=211+r()*12,x=cx+Math.cos(a)*rr,y=cy+Math.sin(a)*rr;circle(x,y,2+r()*6,r()>.5?'#f9d89b':'#c3854f')}
  if(pizza.sauce){
    const sauce=ctx.createRadialGradient(271,265,40,280,280,202);
    sauce.addColorStop(0,'#dc6046');sauce.addColorStop(.8,'#c84634');sauce.addColorStop(1,'#9f392c');
    circle(cx,cy,198,sauce);
    for(let j=0;j<74;j++){let a=r()*TWO_PI,dist=Math.sqrt(r())*189;circle(cx+Math.cos(a)*dist,cy+Math.sin(a)*dist,1+r()*3,r()>.5?'#f17c4c':'#ae342a')}
  }
  if(pizza.cheese){
    circle(cx,cy,pizza.sauce?191:197,pizza.sauce?'#f9dca28c':'#f6db9ad7');
    // Uneven melted mozzarella islands leave the red tomato sauce visible.
    for(let j=0;j<27;j++){
      const angle=r()*TWO_PI,dist=Math.sqrt(r())*164;
      const px=cx+Math.cos(angle)*dist,py=cy+Math.sin(angle)*dist;
      ctx.save();ctx.translate(px,py);ctx.rotate(r()*TWO_PI);
      ctx.beginPath();ctx.ellipse(0,0,8+r()*20,6+r()*13,0,0,TWO_PI);
      ctx.fillStyle=r()>.35?'#fff0b5da':'#f6d17cbb';ctx.fill();ctx.restore();
    }
    for(let j=0;j<290;j++){
      let a=r()*TWO_PI,dist=Math.sqrt(r())*184,x=cx+Math.cos(a)*dist,y=cy+Math.sin(a)*dist;
      ctx.save();ctx.translate(x,y);ctx.rotate(r()*TWO_PI);ctx.fillStyle=r()>.36?'#fff0ac':'#e6ae57';
      ctx.fillRect(-1.2,-1.7,1.5+r()*5,1.6+r()*4);ctx.restore();
    }
    for(let j=0;j<38;j++){let a=r()*TWO_PI,dist=Math.sqrt(r())*187;circle(cx+Math.cos(a)*dist,cy+Math.sin(a)*dist,1+r()*2.6,'#de8e3a99')}
  }
  pizza.toppings.forEach(ingredientArt);
  if(stage!=='prep'&&pizza.bake>.05){
    const burn=Math.min(.25,pizza.bake*.09);
    circle(cx,cy,202,'rgba(120,45,15,'+burn.toFixed(3)+')');
    for(let i=0;i<35;i++){const a=r()*TWO_PI,dist=Math.sqrt(r())*190;circle(cx+Math.cos(a)*dist,cy+Math.sin(a)*dist,1+r()*4,'#995c3088')}
  }
  if(pizza.cuts){
    const cutTotal=Math.max(1,pizza.cuts);
    for(let n=0;n<cutTotal;n++){
      const a=n*Math.PI/Math.max(1,requiredCuts(order?.needed.slices||6)),dx=Math.cos(a)*210,dy=Math.sin(a)*210;
      stroke(cx-dx,cy-dy,cx+dx,cy+dy,'#7c50359e',3.7);
      stroke(cx-dx+1,cy-dy+1,cx+dx+1,cy+dy+1,'#fff6d18c',1);
    }
  }
}
function frame(t){
  const elapsed=Math.min(90,t-lastFrame);lastFrame=t;
  if(!paused&&order){
    remaining=Math.max(0,remaining-elapsed/1000);
    const pct=Math.max(0,Math.round(100*remaining/customerSeconds(shop.upgrades)));
    setLabel('patienceLabel','HAPPY '+pct+'%');$('patienceFill').style.width=pct+'%';
    if(stage==='oven'){
      pizza.bake=Math.min(1.65,pizza.bake+elapsed/ovenDuration(shop.upgrades));
      const pc=pizza.bake;
      $('ovenFill').style.width=Math.min(100,pc/1.65*100).toFixed(1)+'%';
      setLabel('bakePercent',Math.round(pc*100)+'%');
      setLabel('heatLabel',pc<.72?'HEATING UP':pc<1.05?'GOLDEN & READY':pc<1.45?'EXTRA CRISPY':'GET IT OUT!');
      $('mainBtn').disabled=pc<.62;
      if(pc>=1.65)toast('The pizza is burning — pull it out!');
      if((Math.floor(t/180)!==Math.floor((t-elapsed)/180)))paint();
    }
  }
  requestAnimationFrame(frame);
}
setLabel('soundBtn','SOUND: '+(shop.sound?'ON':'OFF'));updateTop();paint();requestAnimationFrame(frame);
