(() => {
'use strict';

const canvas=document.getElementById('game'),ctx=canvas.getContext('2d');
ctx.imageSmoothingEnabled=false;
const stage=document.getElementById('gameStage');
const creator=document.getElementById('creator');
const preview=document.getElementById('creatorPreview'),pctx=preview.getContext('2d');
const actionBtn=document.getElementById('actionBtn'),actionLabel=document.getElementById('actionLabel');
const locationLabel=document.getElementById('locationLabel');
const presentCount=document.getElementById('presentCount');
const toast=document.getElementById('toast');
const dialogue=document.getElementById('dialogue'),dialogueName=document.getElementById('dialogueName'),dialogueText=document.getElementById('dialogueText');
const dialogueNext=document.getElementById('dialogueNext'),portrait=document.getElementById('dialoguePortrait'),portraitCtx=portrait.getContext('2d');
const questPanel=document.getElementById('questPanel'),questList=document.getElementById('questList'),inventoryList=document.getElementById('inventoryList');
const puzzlePanel=document.getElementById('puzzlePanel'),puzzleTitle=document.getElementById('puzzleTitle'),puzzleText=document.getElementById('puzzleText'),puzzleDisplay=document.getElementById('puzzleDisplay'),puzzleButtons=document.getElementById('puzzleButtons');

const W=400,H=240,TILE=16,STORE='gamebox-christmas-quest-v1';
const keys=new Set();
let assets=null,last=performance.now(),currentAction=null,joyPointer=null,dialogueQueue=[],dialogueDone=null,currentPuzzle=null;
let previewTime=0;

const SOURCE={
  blue:[103,167,227], blueDark:[64,71,145],
  red:[230,27,31], redDark:[173,29,35],
  skin:[217,210,161], skinDark:[157,135,86],
  shoe:[140,109,63], outline:[0,0,0], shadow:[158,158,158]
};
const PRESETS={
 classic:{name:'Classic',hat:'#67a7e3',jacket:'#e61b1f',trousers:'#404791',skin:'#d9d2a1',shoes:'#8c6d3f'},
 holly:{name:'Holly',hat:'#4f8b55',jacket:'#b9363f',trousers:'#6b5437',skin:'#d9c79b',shoes:'#66452f'},
 frost:{name:'Frost',hat:'#a8d9ef',jacket:'#e7e4db',trousers:'#49657d',skin:'#dbcda8',shoes:'#5d4b3a'},
 berry:{name:'Berry',hat:'#8f4b68',jacket:'#c9444e',trousers:'#33374f',skin:'#cfa985',shoes:'#654132'}
};
const NPC_PALETTES={
 holly:{hat:'#6c995b',jacket:'#b9363f',trousers:'#684b34',skin:'#d7c797',shoes:'#6b4932'},
 noel:{hat:'#aa393f',jacket:'#49704a',trousers:'#3f465d',skin:'#d8c99e',shoes:'#70503a'},
 ivy:{hat:'#8a526e',jacket:'#467555',trousers:'#55466c',skin:'#d9c89f',shoes:'#604433'},
 finn:{hat:'#547e9e',jacket:'#bd683e',trousers:'#394459',skin:'#d4bf91',shoes:'#684a34'}
};

let theme={...PRESETS.classic};
const spriteCache=new Map(),baseFrameCache=new Map();

const state={
 map:'bedroom',x:190,y:164,dir:'down',moving:false,animStart:performance.now(),
 presents:0,inventory:[],quests:{},solved:{},character:{...PRESETS.classic},townReturn:{x:376,y:430}
};

const MAPS={
 bedroom:{label:"PLAYER'S HOUSE · BEDROOM",w:400,h:240,start:[190,164]},
 downstairs:{label:"PLAYER'S HOUSE · DOWNSTAIRS",w:400,h:240,start:[325,74]},
 town:{label:'CHRISTMAS VILLAGE',w:800,h:560,start:[382,446]},
 hollyHouse:{label:"HOLLY'S HOUSE",w:400,h:240,start:[200,190]},
 noelHouse:{label:"NOEL'S HOUSE",w:400,h:240,start:[200,190]},
 ivyHouse:{label:"IVY'S HOUSE",w:400,h:240,start:[200,190]}
};
const camera={x:0,y:0};

const QUESTS={
 cocoa:{npc:'Holly',title:'A Warm Mug',desc:'Bring Holly a hot chocolate from Ivy’s kitchen.',item:'Hot Chocolate',reward:'Present 1'},
 wreath:{npc:'Noel',title:'The Missing Wreath',desc:'Find Noel’s wreath near the snowman and bring it back.',item:'Wreath',reward:'Present 2'},
 stocking:{npc:'Ivy',title:'Fireplace Stocking',desc:'Solve Ivy’s fireplace-light puzzle and bring her stocking.',item:'Stocking',reward:'Present 3'},
 parcel:{npc:'Finn',title:'Upstairs Parcel',desc:'Open the little bedroom toy chest and bring Finn the wrapped parcel.',item:'Wrapped Parcel',reward:'Present 4'}
};

const npcs=[
 {id:'holly',name:'Holly',map:'town',x:235,y:253,minX:205,maxX:290,minY:220,maxY:294,palette:NPC_PALETTES.holly,quest:'cocoa',targetX:260,targetY:250,speed:15},
 {id:'finn',name:'Finn',map:'town',x:535,y:340,minX:500,maxX:625,minY:310,maxY:390,palette:NPC_PALETTES.finn,quest:'parcel',targetX:600,targetY:355,speed:14},
 {id:'noel',name:'Noel',map:'noelHouse',x:235,y:125,minX:200,maxX:300,minY:105,maxY:155,palette:NPC_PALETTES.noel,quest:'wreath',targetX:270,targetY:135,speed:11},
 {id:'ivy',name:'Ivy',map:'ivyHouse',x:230,y:130,minX:195,maxX:290,minY:105,maxY:160,palette:NPC_PALETTES.ivy,quest:'stocking',targetX:265,targetY:145,speed:10}
];

const townHouses=[
 {id:'player',x:336,y:390,frame:0,map:'downstairs',label:"Player's House"},
 {id:'holly',x:74,y:82,frame:1,map:'hollyHouse',label:"Holly's House"},
 {id:'noel',x:350,y:75,frame:3,map:'noelHouse',label:"Noel's House"},
 {id:'ivy',x:615,y:92,frame:5,map:'ivyHouse',label:"Ivy's House"}
];

function hexRgb(hex){const h=hex.replace('#','');return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)]}
function shade(hex,amount){const [r,g,b]=hexRgb(hex),m=amount>0?255:0,t=Math.abs(amount);return [Math.round(r+(m-r)*t),Math.round(g+(m-g)*t),Math.round(b+(m-b)*t)]}
function same(rgb,target){return rgb[0]===target[0]&&rgb[1]===target[1]&&rgb[2]===target[2]}
function baseFrame(i){if(baseFrameCache.has(i))return baseFrameCache.get(i);const c=assets.frame('character.png',i,16,16);baseFrameCache.set(i,c);return c}
function themedFrame(i,palette=theme){
 const key=i+'|'+Object.values(palette).join('|'); if(spriteCache.has(key))return spriteCache.get(key);
 const src=baseFrame(i),sx=src.getContext('2d',{willReadFrequently:true}),im=sx.getImageData(0,0,16,16),d=im.data;
 const hat=hexRgb(palette.hat),hatDark=shade(palette.hat,-.28),jacket=hexRgb(palette.jacket),jacketDark=shade(palette.jacket,-.25),trousers=hexRgb(palette.trousers),skin=hexRgb(palette.skin),skinDark=shade(palette.skin,-.22),shoes=hexRgb(palette.shoes);
 for(let y=0;y<16;y++)for(let x=0;x<16;x++){const q=(y*16+x)*4;if(!d[q+3])continue;const rgb=[d[q],d[q+1],d[q+2]];let c=null;
   if(same(rgb,SOURCE.blue))c=hat;
   else if(same(rgb,SOURCE.blueDark))c=y<8?hatDark:trousers;
   else if(same(rgb,SOURCE.red))c=jacket;
   else if(same(rgb,SOURCE.redDark))c=jacketDark;
   else if(same(rgb,SOURCE.skin))c=skin;
   else if(same(rgb,SOURCE.skinDark))c=y<11?skinDark:shoes;
   else if(same(rgb,SOURCE.shoe))c=shoes;
   if(c){d[q]=c[0];d[q+1]=c[1];d[q+2]=c[2]}
 }
 const out=document.createElement('canvas');out.width=16;out.height=16;out.getContext('2d').putImageData(im,0,0);spriteCache.set(key,out);return out;
}

function frameFor(dir,step){const base={down:0,up:4,left:8,right:12}[dir]||0;return base+(step%4)}
function drawCharacter(target,x,y,dir,step,palette,size=24){const f=themedFrame(frameFor(dir,step),palette);target.save();target.imageSmoothingEnabled=false;target.drawImage(f,Math.round(x-size/2),Math.round(y-size+4),size,size);target.restore()}
function previewDraw(t){if(!assets)return;previewTime=t;const step=Math.floor(t/180)%4;pctx.fillStyle='#dfe5dd';pctx.fillRect(0,0,144,144);for(let y=80;y<144;y+=16)for(let x=0;x<144;x+=16)assets.draw(pctx,'floor-tile.png',x,y,{width:16,height:16});drawCharacter(pctx,72,105,'down',step,theme,72);requestAnimationFrame(previewDraw)}

function save(){localStorage.setItem(STORE,JSON.stringify({presents:state.presents,inventory:state.inventory,quests:state.quests,solved:state.solved,character:state.character}))}
function load(){try{const s=JSON.parse(localStorage.getItem(STORE)||'null');if(!s)return;if(Number.isFinite(s.presents))state.presents=s.presents;if(Array.isArray(s.inventory))state.inventory=s.inventory;if(s.quests)state.quests=s.quests;if(s.solved)state.solved=s.solved;if(s.character){state.character=s.character;theme={...s.character};applyCreator(theme)}}catch(_){}}
function showToast(text){toast.textContent=text;toast.classList.add('show');clearTimeout(showToast.t);showToast.t=setTimeout(()=>toast.classList.remove('show'),1800)}
function hasItem(item){return state.inventory.includes(item)}
function addItem(item){if(!hasItem(item)){state.inventory.push(item);showToast('Added: '+item);save();renderQuestPanel()}}
function removeItem(item){state.inventory=state.inventory.filter(x=>x!==item);save()}
function questStatus(id){return state.quests[id]||'none'}
function acceptQuest(id){if(questStatus(id)==='none'){state.quests[id]='active';showToast('New quest: '+QUESTS[id].title);save();renderQuestPanel()}}
function completeQuest(id){if(questStatus(id)!=='complete'){state.quests[id]='complete';removeItem(QUESTS[id].item);state.presents++;presentCount.textContent=state.presents;showToast('Quest complete — Christmas present earned!');save();renderQuestPanel()}}

function renderQuestPanel(){
 questList.innerHTML='';
 for(const [id,q] of Object.entries(QUESTS)){const st=questStatus(id);if(st==='none')continue;const div=document.createElement('div');div.className='questItem'+(st==='complete'?' complete':'');div.innerHTML='<strong>'+q.title+' · '+(st==='complete'?'DONE':q.npc)+'</strong><span>'+q.desc+'</span>';questList.appendChild(div)}
 if(!questList.children.length)questList.innerHTML='<div class="questItem"><strong>No quests yet</strong><span>Talk to the elves around the village.</span></div>';
 inventoryList.innerHTML='';
 if(!state.inventory.length)inventoryList.innerHTML='<span class="bagItem">Bag is empty</span>';
 else for(const item of state.inventory){const s=document.createElement('span');s.className='bagItem';s.textContent=item;inventoryList.appendChild(s)}
}
document.getElementById('questBtn').onclick=()=>{renderQuestPanel();questPanel.hidden=false};
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>document.getElementById(b.dataset.close).hidden=true);

function setDialogue(name,palette,lines,onDone=null){
 dialogueQueue=[...lines];dialogueDone=onDone;dialogueName.textContent=name;dialogue.hidden=false;
 portraitCtx.clearRect(0,0,32,32);drawCharacter(portraitCtx,16,27,'down',0,palette,28);nextDialogue();
}
function nextDialogue(){if(dialogueQueue.length){dialogueText.textContent=dialogueQueue.shift();dialogueNext.textContent=dialogueQueue.length?'NEXT':'CLOSE'}else{dialogue.hidden=true;const done=dialogueDone;dialogueDone=null;if(done)done()}}
dialogueNext.onclick=nextDialogue;

function talkToNpc(n){
 const qid=n.quest,q=QUESTS[qid],st=questStatus(qid);
 if(st==='none'){
   const intro={
    cocoa:["Oh! You came at just the right time.","Could you bring me a hot chocolate from Ivy's kitchen? I'll wrap you a present for helping."],
    wreath:["My front-door wreath blew away in the snow.","I saw it tumble towards the snowman. Would you find it for me?"],
    stocking:["I put my favourite stocking away by the fireplace, but I locked the little box with the light code.","Solve the lights, bring me the stocking, and there's a present in it for you."],
    parcel:["I left a parcel in the little toy chest upstairs in your bedroom.","The latch has a simple number pattern. Bring the parcel to me and I'll swap it for a Christmas present."]
   }[qid];
   setDialogue(n.name,n.palette,intro,()=>acceptQuest(qid));return;
 }
 if(st==='active'&&hasItem(q.item)){
   setDialogue(n.name,n.palette,["You found it! That's exactly what I needed.","Thank you — this present is yours."],()=>completeQuest(qid));return;
 }
 if(st==='active'){setDialogue(n.name,n.palette,["Still looking? "+q.desc]);return}
 setDialogue(n.name,n.palette,["Thanks again for helping me. Merry Christmas!"]);
}

function openPuzzle(config){
 currentPuzzle={...config,index:0};puzzleTitle.textContent=config.title;puzzleText.textContent=config.text;puzzleDisplay.textContent=config.display;puzzleButtons.innerHTML='';
 for(let i=1;i<=4;i++){const b=document.createElement('button');b.textContent=String(i);b.onclick=()=>puzzlePress(i);puzzleButtons.appendChild(b)}
 puzzlePanel.hidden=false;
}
function puzzlePress(n){
 if(!currentPuzzle)return;
 if(n===currentPuzzle.sequence[currentPuzzle.index]){currentPuzzle.index++;puzzleDisplay.textContent=currentPuzzle.sequence.map((v,i)=>i<currentPuzzle.index?'✓':v).join(' · ');
   if(currentPuzzle.index===currentPuzzle.sequence.length){const done=currentPuzzle.onSolve;puzzlePanel.hidden=true;currentPuzzle=null;setTimeout(done,120)}
 } else {currentPuzzle.index=0;puzzleDisplay.textContent=currentPuzzle.display;showToast('Not quite — try the sequence again.')}
}
document.getElementById('puzzleCancel').onclick=()=>{puzzlePanel.hidden=true;currentPuzzle=null};

function transition(map,x,y){state.map=map;state.x=x;state.y=y;state.moving=false;state.animStart=performance.now();locationLabel.textContent=MAPS[map].label;currentAction=null;actionBtn.disabled=true;actionBtn.classList.remove('ready');showToast(MAPS[map].label)}
function dist(ax,ay,bx,by){return Math.hypot(ax-bx,ay-by)}
function near(x,y,r=24){return dist(state.x,state.y,x,y)<=r}
function addAction(label,fn,priority=1){if(!currentAction||priority>currentAction.priority)currentAction={label,fn,priority}}
function updateAction(){
 currentAction=null;const map=state.map;
 const localNpcs=npcs.filter(n=>n.map===map);
 for(const n of localNpcs)if(near(n.x,n.y,25))addAction('TALK',()=>talkToNpc(n),5);
 if(map==='bedroom'){
   if(near(334,54,25))addAction('STAIRS',()=>transition('downstairs',326,76),4);
   if(questStatus('parcel')==='active'&&!hasItem('Wrapped Parcel')&&near(76,72,25))addAction('PUZZLE',()=>openPuzzle({title:'Toy Chest Latch',text:'The scratched numbers on the lid show the order.',display:'3 · 1 · 4 · 2',sequence:[3,1,4,2],onSolve:()=>{state.solved.parcel=true;addItem('Wrapped Parcel')}}),6);
 } else if(map==='downstairs'){
   if(near(334,54,25))addAction('STAIRS',()=>transition('bedroom',326,74),4);
   if(near(200,210,27))addAction('OUTSIDE',()=>transition('town',376,448),4);
 } else if(map==='town'){
   if(questStatus('wreath')==='active'&&!hasItem('Wreath')&&near(675,370,25))addAction('TAKE',()=>addItem('Wreath'),6);
   for(const h of townHouses){const doorX=h.x+40,doorY=h.y+62;if(near(doorX,doorY,30)){if(h.id==='player')addAction('ENTER',()=>transition('downstairs',200,190),4);else addAction('ENTER',()=>transition(h.map,200,190),4)}}
 } else {
   if(near(200,211,27))addAction('LEAVE',()=>{const h=townHouses.find(h=>h.map===map);transition('town',h.x+40,h.y+84)},4);
   if(map==='ivyHouse'){
     if(questStatus('cocoa')==='active'&&!hasItem('Hot Chocolate')&&near(104,126,26))addAction('TAKE',()=>addItem('Hot Chocolate'),6);
     if(questStatus('stocking')==='active'&&!hasItem('Stocking')&&near(319,91,28))addAction('PUZZLE',()=>openPuzzle({title:'Fireplace Lights',text:'The four lights blink in this order. Repeat it on the buttons.',display:'2 · 4 · 1 · 3',sequence:[2,4,1,3],onSolve:()=>{state.solved.stocking=true;addItem('Stocking')}}),6);
   }
 }
 actionBtn.disabled=!currentAction;actionBtn.classList.toggle('ready',!!currentAction);actionLabel.textContent=currentAction?currentAction.label:'ACTION';
}
actionBtn.onclick=()=>{if(currentAction&&!dialogue.hidden===false)return; if(currentAction)currentAction.fn()};

function collideRect(x,y,r){return state.x+r>x.x&&state.x-r<x.x+x.w&&state.y+r>x.y&&state.y-r<x.y+x.h}
function blocked(nx,ny){
 const map=state.map,r=7;
 if(nx<12||ny<22||nx>MAPS[map].w-12||ny>MAPS[map].h-10)return true;
 const rects=[];
 if(map==='bedroom')rects.push({x:36,y:40,w:80,h:52},{x:250,y:35,w:60,h:42},{x:42,y:138,w:58,h:36});
 if(map==='downstairs')rects.push({x:40,y:50,w:86,h:52},{x:250,y:48,w:64,h:44},{x:126,y:128,w:72,h:40});
 if(map==='town')for(const h of townHouses)rects.push({x:h.x+4,y:h.y+8,w:72,h:55});
 if(map.endsWith('House'))rects.push({x:30,y:50,w:80,h:48},{x:270,y:48,w:75,h:48},{x:142,y:120,w:80,h:40});
 const ox=state.x,oy=state.y;state.x=nx;state.y=ny;const hit=rects.some(q=>collideRect(q,r));state.x=ox;state.y=oy;return hit;
}

function updateNpc(n,dt){
 if(n.map!==state.map)return;
 const dx=n.targetX-n.x,dy=n.targetY-n.y,d=Math.hypot(dx,dy);
 if(d<4){n.targetX=n.minX+Math.random()*(n.maxX-n.minX);n.targetY=n.minY+Math.random()*(n.maxY-n.minY);return}
 n.x+=dx/d*n.speed*dt;n.y+=dy/d*n.speed*dt;n.dir=Math.abs(dx)>Math.abs(dy)?(dx<0?'left':'right'):(dy<0?'up':'down');n.step=(Math.floor(performance.now()/180)%4);
}
function update(dt,now){
 if(!dialogue.hidden||!questPanel.hidden||!puzzlePanel.hidden)return;
 let vx=0,vy=0;
 if(joyPointer===null){if(keys.has('arrowleft')||keys.has('a'))vx--;if(keys.has('arrowright')||keys.has('d'))vx++;if(keys.has('arrowup')||keys.has('w'))vy--;if(keys.has('arrowdown')||keys.has('s'))vy++}
 else {vx=state.jx||0;vy=state.jy||0}
 const mag=Math.hypot(vx,vy);
 if(mag>.12){vx/=mag;vy/=mag;const speed=58;const nx=state.x+vx*speed*dt,ny=state.y+vy*speed*dt;if(!blocked(nx,state.y))state.x=nx;if(!blocked(state.x,ny))state.y=ny;const dir=Math.abs(vx)>Math.abs(vy)?(vx<0?'left':'right'):(vy<0?'up':'down');if(!state.moving||dir!==state.dir){state.animStart=now;state.dir=dir}state.moving=true}else{if(state.moving)state.animStart=now;state.moving=false}
 for(const n of npcs)updateNpc(n,dt);updateAction();
 camera.x=state.map==='town'?Math.max(0,Math.min(MAPS.town.w-W,state.x-W/2)):0;camera.y=state.map==='town'?Math.max(0,Math.min(MAPS.town.h-H,state.y-H/2)):0;
}

function tile(name,x,y,w=16,h=16,frame=null){assets.draw(ctx,name,Math.round(x-camera.x),Math.round(y-camera.y),frame==null?{width:w,height:h}:{frame,width:w,height:h})}
function fillFloor(name='floor-tile.png'){for(let y=0;y<MAPS[state.map].h;y+=16)for(let x=0;x<MAPS[state.map].w;x+=16)tile(name,x,y)}
function drawRoomShell(){
 ctx.fillStyle='#ccb98c';ctx.fillRect(0,0,W,H);for(let y=32;y<H;y+=16)for(let x=0;x<W;x+=16)assets.draw(ctx,'floor-tile.png',x,y,{width:16,height:16});
 ctx.fillStyle='#734b34';ctx.fillRect(0,0,W,32);ctx.fillStyle='#a57c58';ctx.fillRect(0,27,W,5);
 for(let x=0;x<W;x+=16)assets.draw(ctx,'christmas-lights.png',x,18,{frame:(x/16)%8,cellWidth:16,cellHeight:16,width:16,height:16});
}
function stairs(x,y){ctx.fillStyle='#4e3729';ctx.fillRect(x-2,y-2,52,58);for(let i=0;i<6;i++){ctx.fillStyle=i%2?'#8b6848':'#a47a54';ctx.fillRect(x,y+i*9,48,8)}ctx.fillStyle='#2b211a';ctx.fillRect(x+46,y,3,54)}
function roomAsset(name,x,y,opt={}){assets.draw(ctx,name,x,y,opt)}

function drawBedroom(){
 drawRoomShell();roomAsset('rug.png',142,138,{width:96,height:64});roomAsset('table.png',46,42,{width:48,height:48});roomAsset('chair.png',93,57,{width:32,height:32});roomAsset('small-tree.png',260,42,{width:32,height:64});roomAsset('stocking.png',280,38,{width:16,height:16});roomAsset('present2.png',68,66,{width:20,height:20});stairs(314,34);
 // bed + toy chest coded to match palette
 ctx.fillStyle='#1b211d';ctx.fillRect(28,118,90,48);ctx.fillStyle='#a9363f';ctx.fillRect(31,121,84,42);ctx.fillStyle='#efe3c5';ctx.fillRect(35,124,76,18);ctx.fillStyle='#762832';ctx.fillRect(35,146,76,15);
 ctx.fillStyle='#171d19';ctx.fillRect(55,54,44,28);ctx.fillStyle='#8c6d3f';ctx.fillRect(58,57,38,22);ctx.fillStyle='#d8ae58';ctx.fillRect(75,57,4,22);
 if(questStatus('parcel')==='active'&&!hasItem('Wrapped Parcel')){ctx.strokeStyle='#d8ae58';ctx.lineWidth=2;ctx.strokeRect(54,53,46,30)}
}
function drawDownstairs(){
 drawRoomShell();roomAsset('rug.png',135,122,{width:96,height:64});roomAsset('couch.png',40,45,{width:96,height:64});roomAsset('fireplace.png',255,47,{frame:2,cellWidth:16,cellHeight:16,width:64,height:64});roomAsset('table.png',146,128,{width:48,height:48});roomAsset('chair.png',122,140,{width:32,height:32});roomAsset('chair.png',196,140,{width:32,height:32});roomAsset('wreath.png',278,36,{width:16,height:16});stairs(314,34);
 ctx.fillStyle='#1d2a22';ctx.fillRect(184,199,32,41);ctx.fillStyle='#7b5138';ctx.fillRect(188,202,24,38);ctx.fillStyle='#d8ae58';ctx.fillRect(208,221,3,3);
}
function drawHouseInterior(which){
 drawRoomShell();roomAsset('rug.png',142,132,{width:96,height:64});roomAsset('couch.png',32,49,{width:96,height:64});roomAsset('table.png',155,124,{width:48,height:48});roomAsset('chair.png',132,138,{width:32,height:32});roomAsset('chair.png',204,138,{width:32,height:32});roomAsset('small-tree.png',278,45,{width:32,height:64});roomAsset('wreath.png',187,37,{width:16,height:16});ctx.fillStyle='#1d2a22';ctx.fillRect(184,199,32,41);ctx.fillStyle='#7b5138';ctx.fillRect(188,202,24,38);
 if(which==='ivyHouse'){roomAsset('fireplace.png',286,52,{frame:1,cellWidth:16,cellHeight:16,width:64,height:64});roomAsset('hot-chocolate.png',80,110,{frame:0,cellWidth:8,cellHeight:8,width:24,height:24});if(questStatus('stocking')==='active'&&!hasItem('Stocking'))roomAsset('stocking.png',320,78,{width:16,height:16})}
 if(which==='noelHouse')roomAsset('present1.png',72,117,{width:24,height:24});
 if(which==='hollyHouse')roomAsset('bench.png',270,118,{width:64,height:64});
}
function drawTown(){
 ctx.fillStyle='#eef1e9';ctx.fillRect(0,0,W,H);
 const worldW=MAPS.town.w,worldH=MAPS.town.h;
 // snow tile texture
 for(let y=0;y<worldH;y+=16)for(let x=0;x<worldW;x+=16)tile('snow-tilemap.png',x,y,16,16);
 // paths
 const pathRects=[{x:365,y:0,w:64,h:560},{x:0,y:180,w:800,h:48},{x:0,y:392,w:800,h:48}];
 for(const r of pathRects)for(let y=r.y;y<r.y+r.h;y+=16)for(let x=r.x;x<r.x+r.w;x+=16)tile('path-tilemap.png',x,y,16,16,(Math.floor(x/16)+Math.floor(y/16))%16);
 // houses
 for(const h of townHouses)assets.draw(ctx,'house1.png',Math.round(h.x-camera.x),Math.round(h.y-camera.y),{frame:h.frame,cellWidth:80,cellHeight:64,width:80,height:64});
 // scenery
 const trees=[[28,35],[170,35],[700,30],[735,270],[35,300],[170,465],[650,455],[735,480],[285,260],[515,255]];
 for(const [x,y] of trees)tile('main-tree.png',x,y,48,64);
 const small=[[145,155],[600,160],[256,460],[540,465]];for(const [x,y] of small)tile('small-tree.png',x,y,16,32);
 const lamps=[[340,170],[448,170],[340,382],[448,382]];for(const [x,y] of lamps)tile('lamp-post.png',x,y,16,32);
 tile('bench.png',455,300,48,32);tile('street-sign-post.png',384,245,16,32);tile('snowman1.png',668,352,32,32);
 if(questStatus('wreath')==='active'&&!hasItem('Wreath'))tile('wreath.png',675,362,16,16);
}
function drawWorld(now){
 ctx.clearRect(0,0,W,H);
 if(state.map==='bedroom')drawBedroom();else if(state.map==='downstairs')drawDownstairs();else if(state.map==='town')drawTown();else drawHouseInterior(state.map);
 const drawables=[];
 for(const n of npcs.filter(n=>n.map===state.map)){drawables.push({y:n.y,fn:()=>drawCharacter(ctx,n.x-camera.x,n.y-camera.y,n.dir||'down',n.step||0,n.palette,24)})}
 const step=state.moving?Math.floor((now-state.animStart)/150)%4:0;drawables.push({y:state.y,fn:()=>drawCharacter(ctx,state.x-camera.x,state.y-camera.y,state.dir,step,theme,24)});
 drawables.sort((a,b)=>a.y-b.y);for(const d of drawables)d.fn();
}

function resize(){const r=stage.getBoundingClientRect(),s=Math.max(.5,Math.min(r.width/W,r.height/H));canvas.style.width=Math.round(W*s)+'px';canvas.style.height=Math.round(H*s)+'px'}
function loop(now){const dt=Math.min(.05,(now-last)/1000);last=now;update(dt,now);drawWorld(now);requestAnimationFrame(loop)}

const joy=document.getElementById('joystick'),knob=document.getElementById('joyKnob');
function moveJoy(e){const r=joy.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,dx=e.clientX-cx,dy=e.clientY-cy,max=32,m=Math.hypot(dx,dy)||1,s=Math.min(1,max/m);const x=dx*s,y=dy*s;knob.style.transform='translate('+x+'px,'+y+'px)';state.jx=x/max;state.jy=y/max}
joy.onpointerdown=e=>{joyPointer=e.pointerId;joy.setPointerCapture(e.pointerId);moveJoy(e)};joy.onpointermove=e=>{if(e.pointerId===joyPointer)moveJoy(e)};function stopJoy(e){if(e.pointerId!==joyPointer)return;joyPointer=null;state.jx=state.jy=0;knob.style.transform='translate(0,0)'}joy.onpointerup=stopJoy;joy.onpointercancel=stopJoy;
addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();keys.add(k);if((k===' '||k==='enter')&&currentAction&&dialogue.hidden&&puzzlePanel.hidden)currentAction.fn()});addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));

function applyCreator(p){theme={...p};document.getElementById('hatColour').value=p.hat;document.getElementById('jacketColour').value=p.jacket;document.getElementById('trouserColour').value=p.trousers;document.getElementById('skinColour').value=p.skin;document.getElementById('shoeColour').value=p.shoes}
function readCreator(){return {hat:document.getElementById('hatColour').value,jacket:document.getElementById('jacketColour').value,trousers:document.getElementById('trouserColour').value,skin:document.getElementById('skinColour').value,shoes:document.getElementById('shoeColour').value}}
document.querySelectorAll('.preset').forEach(b=>b.onclick=()=>{document.querySelectorAll('.preset').forEach(x=>x.classList.toggle('active',x===b));const p=PRESETS[b.dataset.preset];applyCreator(p);document.getElementById('presetName').textContent=p.name.toUpperCase();spriteCache.clear()});
['hatColour','jacketColour','trouserColour','skinColour','shoeColour'].forEach(id=>document.getElementById(id).oninput=()=>{theme=readCreator();document.getElementById('presetName').textContent='CUSTOM';spriteCache.clear()});
document.getElementById('startGame').onclick=()=>{theme=readCreator();state.character={...theme};save();creator.hidden=true;stage.hidden=false;presentCount.textContent=state.presents;transition('bedroom',190,164);resize()};

window.addEventListener('resize',resize,{passive:true});window.visualViewport?.addEventListener('resize',resize,{passive:true});

VillagePixelAssets.ready.then(api=>{assets=api;load();applyCreator(state.character||PRESETS.classic);theme={...state.character};presentCount.textContent=state.presents;renderQuestPanel();requestAnimationFrame(previewDraw);requestAnimationFrame(loop)}).catch(err=>{console.error(err);document.querySelector('.creatorHead h1').textContent='Could not load Christmas village assets';});
})();