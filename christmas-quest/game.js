(() => {
'use strict';
const cv=document.getElementById('world'),c=cv.getContext('2d'),mc=document.getElementById('miniCanvas'),m=mc.getContext('2d');
c.imageSmoothingEnabled=m.imageSmoothingEnabled=false;
const $=id=>document.getElementById(id),loc=$('locationLabel'),toast=$('toast'),action=$('actionBtn'),actionLabel=$('actionLabel'),dlg=$('dialogue'),dlgName=$('dialogueName'),dlgText=$('dialogueText'),dlgNext=$('dialogueNext'),portrait=$('portrait'),pc=portrait.getContext('2d');
const journal=$('journal'),dayGrid=$('dayGrid'),mini=$('miniScreen'),miniTitle=$('miniTitle'),miniDay=$('miniDay'),miniSubtitle=$('miniSubtitle'),miniScore=$('miniScore'),miniHelp=$('miniHelp'),miniButtons=$('miniButtons'),miniResult=$('miniResult'),resultTitle=$('resultTitle'),resultText=$('resultText');
const P=window.CHIPIN_WORLD_PROJECT,maps=Object.fromEntries(P.maps.map(x=>[x.name.trim(),x])),town=maps['Town Map'],npcMap=maps['NPC House - Downstairs'],W=160,H=240,STORE='advent-apprentice-v2';
const defs=[
['Holly Tinkerton','TF Gnome B.png','Light Lines','Planning ahead','I have three hundred lights and no intention of untangling them twice.'],
['Bernard Boxwood','TF Gnome A.png','Parcel Push','Organisation','Red labels left, gold labels right, and fragile things nowhere near the reindeer.'],
['Pip Wren','TF Elf B.png','Toy Train Tangle','Attention to detail','Making a toy work once is easy. Making sure it works every time is the job.'],
['Bramble','TF Reindeer Child.png','Reindeer Run','Confidence and control','Everybody says I am too young for the sleigh team. Race me and we will see.'],
['Nutmeg Crumb','TF Gnome B.png','Gingerbread Rush','Timing and preparation','Christmas baking is about having the right thing ready at the right moment.'],
['Rudi Lanternnose','TF Rudolph Child.png','Lantern Maze','Navigation','The nose only lets you see enough to make the next decision.'],
['Melody Bell','TF Elf B.png','Bell Choir','Listening and memory','Anybody can make a noise. The trick is knowing when your note belongs.'],
['Copper','TF Reindeer B.png','Sleigh Slide','Precision','Flying fast is easy. Stopping exactly where you are supposed to is skill.'],
['Bjorn Snowpaw','TF Polar Bear.png','Snow Shift','Problem solving','Move snow from one path and you will put it somewhere else.'],
['Merry Mistle','TF Gnome A.png','Wreath Weaver','Pattern recognition','You have been following my wreaths all week. About time you learned how they are made.'],
['Juniper','TF Reindeer.png','Winter Routes','Route planning','The shortest road is not always the fastest road.'],
['Cocoa Snowpaw','TF Polar Bear Cub.png','Snow Search','Observation','Finding the decorations is fun. Finding them efficiently is the clever bit.'],
['Clove Hearthwick','TF Gnome A.png','Chimney Drop','Spatial thinking','Santa going down the chimney is not the difficult bit. Try the parcels.'],
['Aurora','TF Rudolph Adult B.png','Star Flight','Adapting under pressure','A route can change while you are already flying it.'],
['Felix Ribbon','TF Elf B.png','Perfectly Packed','Efficiency','Paper costs money, ribbon tangles, and boxes are never the shape you want.'],
['Firkin Switchgear','TF Gnome B.png','Workshop Shift','Thinking ahead','Never move something just because you can. Know what happens next.'],
['Bellamy Frost','TF Jesus.png','Bell Tower','Timing','Too early is wrong. Too late is wrong. Christmas has quite a lot of that.'],
['Comet','TF Rudolph Adult.png','Snow Curling','Prediction','Training is not all running. Sometimes you have to beat me at something first.'],
['Nicholas Quill','TF Jesus.png','Christmas Chronicle','Memory and tradition','Traditions are stories people liked enough to repeat.'],
['Ember Hearth','TF Gnome B.png','Christmas Kitchen','Prioritisation','One dinner, twenty-four households, six ovens. Welcome to the busy part.'],
['Northwind','TF Rudolph Adult B.png','Formation','Anticipating others','Eight reindeer do not fly independently. Watch the others.'],
['Mrs Claus','TF Mrs Claus.png','Christmas Control','Coordination','Santa gets one very busy night. The rest of us get December.'],
['Star','TF Rudolph Adult.png','The Long Run','Leadership','Tomorrow everyone will be looking forward. Somebody has to know where we are going.'],
['Santa Claus','TF Santa.png','Christmas Eve','Putting it together','Twenty-three doors. Twenty-three teachers. There is only one thing left to do.']
];
const roles=[
'Village Decorator','Parcel Keeper','Toy Tester','Young Reindeer Trainee','Village Baker','Night Navigation Trainee',
'Carol Keeper','Sleigh Mechanic','Snow Keeper','Wreath Maker','Trail Reindeer','Decoration Finder',
'Chimney Keeper','Lead Pathfinder','Gift Wrapper','Workshop Engineer','Bell Ringer','Games Champion',
'Keeper of Christmas Stories','Village Cook','Senior Reindeer Trainer','Christmas Coordinator','Sleigh Leader','Father Christmas'
];
const positions=[[400,688],[272,80],[464,80],[752,80],[944,80],[1120,80],[80,336],[272,336],[464,336],[752,336],[944,336],[1120,336],[80,880],[272,880],[464,880],[752,880],[944,880],[1120,880],[80,1112],[272,1112],[464,1112],[752,1112],[944,1112],[1120,1112]];
const kinds=['rotate','push','rotate','race','sequence','maze','sequence','maze','push','rotate','route','maze','push','race','push','maze','timing','curl','sequence','timing','route','manage','race','final'];
const residents=defs.map((d,i)=>({day:i+1,name:d[0],asset:d[1],game:d[2],skill:d[3],intro:d[4],role:roles[i],kind:kinds[i],x:positions[i][0],y:positions[i][1],doorX:positions[i][0]+32,doorY:positions[i][1]+32,signX:positions[i][0]+48,signY:positions[i][1]+48}));
const house=town.assets.find(a=>a.asset==='house2.png');
const npcSign=town.assets.find(a=>a.asset==='sign-post.png'&&Math.abs(a.x-(house?.x+48||448))<2&&Math.abs(a.y-(house?.y+48||736))<2);
const playerHouse=town.assets.find(a=>a.asset==='house1.png');
const now=new Date(),unlock=now.getMonth()===11?Math.min(24,now.getDate()):24;
$('dayBadge').querySelector('strong').textContent=String(now.getMonth()===11?Math.min(24,now.getDate()):24);
const state={map:'Player House - Bedroom',x:P.initialSpawn.x,y:P.initialSpawn.y,dir:'down',moving:false,anim:performance.now(),walkPixels:0,step:0,linkCooldown:0,doorAnim:null,cam:{x:0,y:0},resident:null,met:{},done:{},scores:{},jx:0,jy:0};
try{const s=JSON.parse(localStorage.getItem(STORE)||'{}');state.met=s.met||{};state.done=s.done||{};state.scores=s.scores||{}}catch(e){}
let assets=null,extraAssets=null,sheetAssets=null,last=performance.now(),joyId=null,currentAction=null,queue=[],afterDlg=null,game=null,gameLast=0,finished=false;
const keys=new Set();
function save(){localStorage.setItem(STORE,JSON.stringify({met:state.met,done:state.done,scores:state.scores}))}
function msg(t){toast.textContent=t;toast.classList.add('show');clearTimeout(msg.t);msg.t=setTimeout(()=>toast.classList.remove('show'),1600)}
function activeMap(){return state.map==='NPC House - Downstairs'?npcMap:maps[state.map]}
function mapLabel(){return state.resident&&state.map==='NPC House - Downstairs'?'DAY '+state.resident.day+' · '+state.resident.name.toUpperCase():state.map.toUpperCase()}
function go(name,x,y,r=null){state.map=name;state.x=x;state.y=y;state.resident=r;state.moving=false;state.step=0;state.walkPixels=0;state.linkCooldown=.45;loc.textContent=mapLabel();msg(mapLabel())}
const VIRTUAL_ASSETS=P.assetAliases||{};
const virtualCanvasCache=new Map();

function assetProvider(name){
 if(!name)return null;
 const virtual=VIRTUAL_ASSETS[name];
 if(virtual)return assetProvider(virtual.source);
 if(assets?.names?.includes(name))return assets;
 if(extraAssets?.names?.includes(name))return extraAssets;
 if(sheetAssets?.names?.includes(name))return sheetAssets;
 return null;
}
function assetMeta(name){
 const virtual=VIRTUAL_ASSETS[name];
 if(virtual)return {width:virtual.crop.w,height:virtual.crop.h,cell:null,virtual:true};
 const p=assetProvider(name);
 try{return p?.metadata(name)||null}catch(_){return null}
}
function virtualCanvas(name){
 if(virtualCanvasCache.has(name))return virtualCanvasCache.get(name);
 const v=VIRTUAL_ASSETS[name],p=v&&assetProvider(v.source);
 if(!v||!p)return null;
 const src=p.canvas(v.source),out=document.createElement('canvas');
 out.width=v.crop.w;out.height=v.crop.h;
 const x=out.getContext('2d');x.imageSmoothingEnabled=false;
 x.drawImage(src,v.crop.x,v.crop.y,v.crop.w,v.crop.h,0,0,v.crop.w,v.crop.h);
 virtualCanvasCache.set(name,out);return out;
}
function ac(name,frame=null){
 try{
   if(VIRTUAL_ASSETS[name])return virtualCanvas(name);
   const p=assetProvider(name);if(!p)return null;
   const meta=p.metadata(name);
   if(frame!=null&&meta?.cell)return p.frame(name,frame,meta.cell.width,meta.cell.height);
   return p.canvas(name);
 }catch(e){return null}
}
function drawAsset(a,camx=0,camy=0,forcedFrame=undefined){
 const frame=forcedFrame===undefined?a.frame:forcedFrame;
 const src=ac(a.asset,frame),x=Math.round(a.x-camx),y=Math.round(a.y-camy);
 if(!src){c.fillStyle='rgba(122,102,80,.28)';c.fillRect(x,y,a.w,a.h);return}
 const rotation=((Math.round((Number(a.rotation)||0)/90)*90)%360+360)%360;
 const drawW=rotation%180===0?a.w:a.h,drawH=rotation%180===0?a.h:a.w;
 c.save();c.imageSmoothingEnabled=false;c.translate(x+a.w/2,y+a.h/2);
 if(rotation)c.rotate(rotation*Math.PI/180);
 c.scale(a.flipX?-1:1,a.flipY?-1:1);
 c.drawImage(src,-drawW/2,-drawH/2,drawW,drawH);c.restore();
}
function spriteFrame(name,step=0,dir='down'){
 const p=assetProvider(name),meta=assetMeta(name),cell=meta?.cell;
 if(!p||!cell)return null;
 const cols=Math.max(1,Math.floor(meta.width/cell.width)),rows=Math.max(1,Math.floor(meta.height/cell.height));
 let index=0;
 if(name==='character.png'&&cols>=16){
   const base={down:0,up:4,left:8,right:12}[dir]||0;index=base+(step%4);
 }else if(rows>=4){
   const row={down:0,left:1,right:2,up:3}[dir]??0;index=row*cols+(step%cols);
 }else index=step%(cols*rows);
 try{return p.frame(name,index,cell.width,cell.height)}catch(_){return null}
}
function spr(ctx,name,x,y,dir='down',step=0,size=null){
 const f=spriteFrame(name,step,dir),meta=assetMeta(name),cell=meta?.cell;
 if(!f||!cell){ctx.fillStyle='#a9363f';ctx.fillRect(Math.round(x-8),Math.round(y-16),16,16);return}
 const h=Math.max(8,Number(size)||cell.height),w=Math.max(8,Math.round(h*cell.width/cell.height));
 ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(f,Math.round(x-w/2),Math.round(y-h+4),w,h);ctx.restore();
}
function frameCount(name){
 const meta=assetMeta(name);if(!meta?.cell)return 1;
 return Math.max(1,Math.floor(meta.width/meta.cell.width)*Math.floor(meta.height/meta.cell.height));
}
function depthSpec(a){const size=16;return{size,cols:Math.max(1,Math.ceil(a.w/size)),rows:Math.max(1,Math.ceil(a.h/size))}}
function depthAbove(a,col,row){return Array.isArray(a.depthAboveTiles)&&a.depthAboveTiles.includes(col+','+row)}
function hasDepth(a){const d=depthSpec(a);return !!a.tileDepthEnabled&&(d.cols>1||d.rows>1)}
function drawPlacedBody(a,camx,camy){
 let frame=a.frame;
 const count=frameCount(a.asset),entry=state.doorAnim;
 if(entry&&a._houseKey===entry.houseKey&&count>1){
   const p=Math.max(0,Math.min(.999,(performance.now()-entry.start)/entry.duration));
   frame=Math.min(count-1,Math.floor(p*count));
 }else if(a.animated&&count>1){
   const fps=Math.max(1,Math.min(30,Number(a.animationFps)||6)),start=Number(a.frame)||0;
   frame=(start+Math.floor(performance.now()/1000*fps))%count;
 }
 drawAsset(a,camx,camy,frame);
}
function drawPlaced(a,pass,camx,camy){
 if(!hasDepth(a)){
   if((pass==='above')!==!!a.aboveCharacters)return;
   drawPlacedBody(a,camx,camy);return;
 }
 const d=depthSpec(a),wantAbove=pass==='above';
 c.save();c.beginPath();let clipped=0;
 for(let row=0;row<d.rows;row++)for(let col=0;col<d.cols;col++){
   if(depthAbove(a,col,row)!==wantAbove)continue;
   const wx=a.x+col*d.size,wy=a.y+row*d.size,w=Math.min(d.size,a.x+a.w-wx),h=Math.min(d.size,a.y+a.h-wy);
   if(w>0&&h>0){c.rect(Math.round(wx-camx),Math.round(wy-camy),w,h);clipped++}
 }
 if(clipped){c.clip();drawPlacedBody(a,camx,camy)}
 c.restore();
}
function drawStaticDoorOpening(entry,cam){
 if(!entry||entry.hasFrames)return;
 const p=Math.max(0,Math.min(1,(performance.now()-entry.start)/entry.duration));
 const x=Math.round(entry.linkX-cam.x),y=Math.round(entry.linkY-cam.y);
 c.save();
 c.fillStyle='#151915';c.fillRect(x,y,16,16);
 const remain=Math.max(0,Math.round(16*(1-p)));
 if(remain){
   c.fillStyle='#6d4931';
   c.fillRect(x+16-remain,y,remain,16);
   c.fillStyle='#d8ae58';c.fillRect(x+16-remain+2,y+8,2,2);
 }
 c.restore();
}
function worldDraw(t){
 const mp=activeMap(),cam=state.cam;c.fillStyle=mp.bg||'#e8eee9';c.fillRect(0,0,W,H);
 let arr=mp.assets.map(a=>Object.assign({},a,{_houseKey:a.id}));
 if(state.map==='Town Map'&&house){
   residents.forEach(r=>arr.push(Object.assign({},house,{x:r.x,y:r.y,id:'h'+r.day,_houseKey:'resident-'+r.day,layer:house.layer||1})));
   if(npcSign)residents.slice(1).forEach(r=>arr.push(Object.assign({},npcSign,{x:r.signX,y:r.signY,id:'sign'+r.day,_houseKey:null,sign:{enabled:true,title:'DAY '+r.day+' · '+r.name,message:r.role+'\nLesson: '+r.skill+'\nGame: '+r.game}})));
 }
 if(state.map==='Town Map'&&playerHouse){
   const base=arr.find(a=>a.id===playerHouse.id);if(base)base._houseKey='player-house';
 }
 if(state.map==='Town Map'&&house){
   const baseNpc=arr.find(a=>a.id===house.id);if(baseNpc)baseNpc._houseKey='resident-1';
 }
 arr.sort((a,b)=>(a.layer||0)-(b.layer||0)||a.y-b.y);
 arr.forEach(a=>drawPlaced(a,'below',cam.x,cam.y));
 if(state.map==='Town Map')residents.forEach(r=>{
   const x=r.doorX-cam.x,y=r.doorY-cam.y;c.fillStyle=r.day<=unlock?'#d8ae58':'#777';c.fillRect(x-7,y-24,18,10);
   c.fillStyle='#18231d';c.font='bold 7px monospace';c.textAlign='center';c.fillText(r.day,x+2,y-16);
 });
 if(state.map==='NPC House - Downstairs'&&state.resident)spr(c,state.resident.asset,80,112,'down',0);
 spr(c,'TF Elf A.png',state.x-cam.x,state.y-cam.y,state.dir,state.moving?state.step:0);
 arr.forEach(a=>drawPlaced(a,'above',cam.x,cam.y));
 drawStaticDoorOpening(state.doorAnim,cam);
}
function blocked(nx,ny){const mp=activeMap(),r=5;if(nx<6||ny<8||nx>mp.width-6||ny>mp.height-5)return true;for(const a of mp.assets)if(a.solid&&nx+r>a.x&&nx-r<a.x+a.w&&ny+r>a.y&&ny-r<a.y+a.h)return true;if(state.map==='Town Map')for(const h of residents.slice(1))if(nx+r>h.x+4&&nx-r<h.x+76&&ny+r>h.y+4&&ny-r<h.y+28)return true;return false}
function dist(x,y){return Math.hypot(state.x-x,state.y-y)}
function add(label,fn,p=1){if(!currentAction||p>currentAction.p)currentAction={label,fn,p}}
function transition(t){const target=P.maps.find(x=>x.id===t.targetMapId);if(target)go(target.name.trim(),Number(t.targetX),Number(t.targetY))}
function pointIn(t){return state.x>=t.x&&state.x<=t.x+t.w&&state.y>=t.y&&state.y<=t.y+t.h}
function talk(r){state.met[r.day]=true;save();dialog(r.name,r.asset,[r.intro,'Your lesson is '+r.skill.toLowerCase()+'.','Head upstairs when you are ready. The room up there is set up for '+r.game+'.'])}
function showSign(title,message){
 queue=[String(message||'').trim()||''];
 dlgName.textContent=title||'Sign';dlg.hidden=false;pc.clearRect(0,0,32,32);
 const sign=ac('sign-post.png');if(sign){pc.imageSmoothingEnabled=false;pc.drawImage(sign,8,8,16,16)}
 nextDlg();
}
function houseSign(r){showSign('DAY '+r.day+' · '+r.name,r.role+'\nLesson: '+r.skill+'\nGame: '+r.game)}
function actions(){
 currentAction=null;
 const mp=activeMap();
 for(const a of mp.assets||[]){
   if(a.asset==='sign-post.png'&&a.sign?.enabled&&dist(a.x+a.w/2,a.y+a.h/2)<25)add('READ',()=>showSign(a.sign.title,a.sign.message),5);
 }
 if(state.map==='Town Map'){
   for(const r of residents)if(dist(r.signX+8,r.signY+8)<25)add('READ',()=>houseSign(r),7);
 }else if(state.map==='NPC House - Downstairs'&&state.resident){
   if(dist(80,112)<23)add('TALK',()=>talk(state.resident),10);
 }
 action.disabled=!currentAction;action.classList.toggle('ready',!!currentAction);actionLabel.textContent=currentAction?currentAction.label:'ACTION';
}
function startDoorEntry({houseKey,asset,linkX,linkY,targetMap,targetX,targetY,resident=null}){
 if(state.doorAnim)return;
 const count=frameCount(asset),duration=Math.max(360,count>1?count*90:460);
 state.moving=false;state.step=0;
 state.doorAnim={houseKey,asset,linkX,linkY,targetMap,targetX,targetY,resident,start:performance.now(),duration,hasFrames:count>1};
 currentAction=null;action.disabled=true;action.classList.remove('ready');actionLabel.textContent='ACTION';
}
function completeDoorEntry(){
 const e=state.doorAnim;if(!e)return;
 state.doorAnim=null;go(e.targetMap,e.targetX,e.targetY,e.resident);
}
function triggerMapLinks(prevX,prevY){
 if(state.linkCooldown>0||state.doorAnim)return false;
 if(state.map==='Town Map'){
   for(const r of residents){
     const link={x:r.doorX,y:r.doorY,w:16,h:16};
     if(!pointIn(link))continue;
     if(r.day>unlock){state.x=prevX;state.y=prevY;state.linkCooldown=.65;msg('This door opens on December '+r.day+'.');return true}
     startDoorEntry({houseKey:'resident-'+r.day,asset:house?.asset||'house2.png',linkX:r.doorX,linkY:r.doorY,targetMap:'NPC House - Downstairs',targetX:72,targetY:200,resident:r});
     return true;
   }
   for(const t of town.transitions||[]){
     if(!pointIn(t))continue;
     const target=P.maps.find(x=>x.id===t.targetMapId);
     if(!target)return false;
     if(target.name.trim()==='NPC House - Downstairs')continue;
     const isPlayer=target.name.trim()==='Player House - Downstairs';
     if(isPlayer){
       startDoorEntry({houseKey:'player-house',asset:playerHouse?.asset||'house1.png',linkX:t.x,linkY:t.y,targetMap:target.name.trim(),targetX:Number(t.targetX),targetY:Number(t.targetY)});
     }else transition(t);
     return true;
   }
   return false;
 }
 if(state.map==='NPC House - Downstairs'&&state.resident){
   const stairs=npcMap.transitions.find(t=>t.targetMapId!==town.id);
   const outside=npcMap.transitions.find(t=>t.targetMapId===town.id);
   if(stairs&&pointIn(stairs)){
     if(state.met[state.resident.day])openGame(state.resident);
     else{state.x=prevX;state.y=prevY;state.linkCooldown=.65;msg('Speak to '+state.resident.name+' first.');}
     return true;
   }
   if(outside&&pointIn(outside)){go('Town Map',state.resident.doorX,state.resident.doorY+24);return true}
   return false;
 }
 for(const t of activeMap().transitions||[])if(pointIn(t)){transition(t);return true}
 return false;
}
function dialog(name,asset,lines){queue=lines.slice();dlgName.textContent=name;dlg.hidden=false;pc.clearRect(0,0,32,32);spr(pc,asset,16,27,'down',0,28);nextDlg()}
function nextDlg(){if(queue.length){dlgText.textContent=queue.shift();dlgNext.textContent=queue.length?'NEXT':'CLOSE'}else dlg.hidden=true}
dlgNext.onclick=nextDlg;action.onclick=()=>{if(currentAction&&dlg.hidden&&!state.doorAnim)currentAction.fn()};
const WALK_FRAME_PIXELS=8;
function update(dt,t){
 if(state.linkCooldown>0)state.linkCooldown=Math.max(0,state.linkCooldown-dt);
 if(state.doorAnim){if(t-state.doorAnim.start>=state.doorAnim.duration)completeDoorEntry();return}
 if(!dlg.hidden||!journal.hidden||!mini.hidden)return;
 let x=state.jx,y=state.jy;
 if(joyId===null){
   x=(keys.has('arrowright')||keys.has('d')?1:0)-(keys.has('arrowleft')||keys.has('a')?1:0);
   y=(keys.has('arrowdown')||keys.has('s')?1:0)-(keys.has('arrowup')||keys.has('w')?1:0);
 }
 const mag=Math.hypot(x,y),prevX=state.x,prevY=state.y;
 if(mag>.12){
   if(Math.abs(x)>=Math.abs(y)){x=Math.sign(x);y=0}else{x=0;y=Math.sign(y)}
   const sp=54,nx=state.x+x*sp*dt,ny=state.y+y*sp*dt;
   if(x&&!blocked(nx,state.y))state.x=nx;
   if(y&&!blocked(state.x,ny))state.y=ny;
   const moved=Math.hypot(state.x-prevX,state.y-prevY);
   if(moved>.001){
     const d=x<0?'left':x>0?'right':y<0?'up':'down';
     if(!state.moving||d!==state.dir){state.dir=d;state.walkPixels=0}
     state.walkPixels+=moved;state.step=Math.floor(state.walkPixels/WALK_FRAME_PIXELS)%3;state.moving=true;
   }else{state.moving=false;state.step=0}
 }else{state.moving=false;state.step=0}
 const mp=activeMap();state.cam.x=mp.width>W?Math.max(0,Math.min(mp.width-W,state.x-W/2)):0;state.cam.y=mp.height>H?Math.max(0,Math.min(mp.height-H,state.y-H/2)):0;
 if(triggerMapLinks(prevX,prevY))return;
 actions();
}
function bindDirection(id,dx,dy){
 const el=$(id);let pointer=null;
 const start=e=>{pointer=e.pointerId;el.setPointerCapture?.(e.pointerId);state.jx=dx;state.jy=dy;e.preventDefault()};
 const end=e=>{if(pointer!==e.pointerId)return;pointer=null;if(state.jx===dx&&state.jy===dy){state.jx=0;state.jy=0}e.preventDefault()};
 el.onpointerdown=start;el.onpointerup=end;el.onpointercancel=end;el.onlostpointercapture=end;
}
bindDirection('upBtn',0,-1);bindDirection('downBtn',0,1);bindDirection('leftBtn',-1,0);bindDirection('rightBtn',1,0);
if(window.AdventPixelUI){
 AdventPixelUI.drawFrame($('uiFrame'));
 document.querySelectorAll('.dirBtn canvas').forEach(cv=>AdventPixelUI.drawArrow(cv));
 AdventPixelUI.drawAction(action.querySelector('canvas'));
}
addEventListener('keydown',e=>{const k=e.key.toLowerCase();keys.add(k);if(['arrowleft','arrowright','arrowup','arrowdown',' '].includes(k))e.preventDefault();if(!mini.hidden&&game&&game.key)game.key(k);else if((k===' '||k==='enter')&&currentAction&&dlg.hidden)currentAction.fn()});addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
function renderJournal(){dayGrid.innerHTML='';residents.forEach(r=>{const d=document.createElement('div');d.className='dayCard'+(r.day>unlock?' locked':'')+(state.done[r.day]?' done':'');d.innerHTML='<strong>DAY '+r.day+' · '+r.name+'</strong><span>'+r.game+(state.done[r.day]?' · COMPLETE':'')+'</span>';dayGrid.appendChild(d)})}
$('journalBtn').onclick=()=>{renderJournal();journal.hidden=false};document.querySelector('[data-close="journal"]').onclick=()=>journal.hidden=true;
function setButtons(items){miniButtons.innerHTML='';items.forEach(v=>{const b=document.createElement('button');b.textContent=v[0];b.onclick=v[1];miniButtons.appendChild(b)})}
function done(text){if(finished)return;finished=true;state.done[game.r.day]=true;state.scores[game.r.day]=Math.max(state.scores[game.r.day]||0,Math.round(game.score||0));save();renderJournal();resultTitle.textContent=game.r.game+' complete';resultText.textContent=text;miniResult.hidden=false}
function back(){miniResult.hidden=true;mini.hidden=true;const r=game&&game.r?game.r:state.resident;game=null;go('NPC House - Downstairs',120,168,r)}
$('returnMap').onclick=back;$('resultReturn').onclick=back;$('playAgain').onclick=()=>{miniResult.hidden=true;openGame(state.resident)};$('restartMini').onclick=()=>openGame(state.resident);
function bg(title){m.fillStyle='#f2ead7';m.fillRect(0,0,360,560);m.fillStyle='#173c2a';m.fillRect(0,0,360,36);m.fillStyle='#fff';m.font='bold 14px monospace';m.textAlign='center';m.fillText(title,180,23)}
function cell(x,y,s,fill){m.fillStyle=fill;m.fillRect(x,y,s,s);m.strokeStyle='#304238';m.strokeRect(x,y,s,s)}
function rand(n){return Math.floor(Math.random()*n)}
function makeMaze(){const N=11,g=Array.from({length:N},(_,y)=>Array.from({length:N},(_,x)=>x===0||y===0||x===N-1||y===N-1||Math.random()<.2?1:0));for(let x=1;x<N-1;x++)g[1][x]=0;for(let y=1;y<N-1;y++)g[y][N-2]=0;return{N,g,p:[1,1],goal:[N-2,N-2],moves:0}}
function buildGame(r){
 const kind=r.kind;
 if(kind==='rotate'){let a=Array.from({length:25},()=>rand(4)),target=Array.from({length:25},()=>rand(4));return{r,score:0,draw(){bg(r.game);for(let y=0;y<5;y++)for(let x=0;x<5;x++){const i=y*5+x,px=55+x*50,py=105+y*50;cell(px,py,44,['#a9363f','#d8ae58','#4c7455','#596f91'][a[i]]);m.fillStyle='#fff';m.font='bold 16px monospace';m.fillText('↻',px+22,py+27)}m.fillStyle='#173c2a';m.font='9px monospace';m.fillText('Rotate every tile to match its hidden Christmas alignment.',180,390)},pointer(x,y){const gx=Math.floor((x-55)/50),gy=Math.floor((y-105)/50);if(gx>=0&&gx<5&&gy>=0&&gy<5){const i=gy*5+gx;a[i]=(a[i]+1)%4;this.score+=4;if(a.every((v,i)=>v===target[i]))done('Every piece is aligned correctly.')}}}}
 if(kind==='push'){let p=[1,5],boxes=[[2,4],[3,3],[4,2]],goals=[[5,1],[5,2],[5,3]],moves=0;function mv(dx,dy){let nx=p[0]+dx,ny=p[1]+dy;if(nx<0||ny<0||nx>6||ny>6)return;const bi=boxes.findIndex(b=>b[0]===nx&&b[1]===ny);if(bi>=0){const bx=nx+dx,by=ny+dy;if(bx<0||by<0||bx>6||by>6||boxes.some(b=>b[0]===bx&&b[1]===by))return;boxes[bi]=[bx,by]}p=[nx,ny];moves++;if(goals.every(g=>boxes.some(b=>b[0]===g[0]&&b[1]===g[1])))done('You solved the whole spatial puzzle.')}const g={r,get score(){return Math.max(0,800-moves*5)},draw(){bg(r.game);for(let y=0;y<7;y++)for(let x=0;x<7;x++){const px=40+x*40,py=95+y*40;cell(px,py,36,'#e0d3b4');if(goals.some(q=>q[0]===x&&q[1]===y)){m.strokeStyle='#d8ae58';m.lineWidth=4;m.strokeRect(px+5,py+5,26,26)}}boxes.forEach(q=>{m.fillStyle='#a9363f';m.fillRect(45+q[0]*40,100+q[1]*40,26,26)});spr(m,'TF Elf A.png',58+p[0]*40,126+p[1]*40,'down',0,24)},buttons(){return[['←',()=>mv(-1,0)],['↑',()=>mv(0,-1)],['↓',()=>mv(0,1)],['→',()=>mv(1,0)]]},key(k){if(k==='arrowleft')mv(-1,0);if(k==='arrowright')mv(1,0);if(k==='arrowup')mv(0,-1);if(k==='arrowdown')mv(0,1)}};return g}
 if(kind==='race'){let x=180,t=0,score=0,obs=[];return{r,get score(){return score},update(dt){t+=dt;score+=dt*20;if(Math.random()<dt*1.7)obs.push({x:45+rand(270),y:-20});obs.forEach(o=>o.y+=120*dt);for(const o of obs)if(Math.abs(o.x-x)<26&&Math.abs(o.y-445)<24){score=Math.max(0,score-80);o.y=999}obs=obs.filter(o=>o.y<600);if(t>=24)done('You completed the full run and kept control to the finish.')},draw(){bg(r.game);m.fillStyle='#dbe8ed';m.fillRect(35,50,290,500);obs.forEach(o=>{m.fillStyle='#fff';m.beginPath();m.arc(o.x,o.y,18,0,7);m.fill()});spr(m,r.asset,x,470,'up',1,32);m.fillStyle='#173c2a';m.fillText('TIME '+Math.max(0,24-t).toFixed(1),180,520)},buttons(){return[['LEFT',()=>x=Math.max(55,x-35)],['RIGHT',()=>x=Math.min(305,x+35)]]},key(k){if(k==='arrowleft')x=Math.max(55,x-25);if(k==='arrowright')x=Math.min(305,x+25)}}}
 if(kind==='sequence'){let seq=[rand(4),rand(4),rand(4)],inp=[],show=true,clock=0,round=0,score=0;return{r,get score(){return score},update(dt){clock+=dt;if(show&&clock>seq.length*.65+.4){show=false;clock=0}},draw(){bg(r.game);for(let i=0;i<4;i++){const on=show&&seq[Math.floor(clock/.65)]===i;m.fillStyle=on?'#ffe76a':['#a9363f','#d8ae58','#4c7455','#596f91'][i];m.beginPath();m.arc(70+i*75,255,28,0,7);m.fill();m.fillStyle='#fff';m.fillText(i+1,70+i*75,260)}m.fillStyle='#173c2a';m.fillText(show?'WATCH':'YOUR TURN',180,360)},buttons(){return[1,2,3,4].map((n,i)=>[''+n,()=>{if(show)return;if(i===seq[inp.length]){inp.push(i);score+=20;if(inp.length===seq.length){round++;if(round>=5)return done('You completed five increasingly difficult patterns.');seq.push(rand(4));inp=[];show=true;clock=0}}else{inp=[];score=Math.max(0,score-20)}}])}}}
 if(kind==='maze'){const q=makeMaze();function mv(dx,dy){const nx=q.p[0]+dx,ny=q.p[1]+dy;if(!q.g[ny]||q.g[ny][nx])return;q.p=[nx,ny];q.moves++;if(nx===q.goal[0]&&ny===q.goal[1])done('You found the route through the challenge.')}return{r,get score(){return Math.max(0,900-q.moves*4)},draw(){bg(r.game);for(let y=0;y<q.N;y++)for(let x=0;x<q.N;x++){const d=Math.hypot(x-q.p[0],y-q.p[1]);if(d<4.5)cell(38+x*26,90+y*26,23,q.g[y][x]?'#4d6255':'#dbcfae')}m.fillStyle='#d8ae58';m.fillRect(43+q.goal[0]*26,95+q.goal[1]*26,13,13);spr(m,'TF Elf A.png',49+q.p[0]*26,116+q.p[1]*26,'down',0,22)},buttons(){return[['←',()=>mv(-1,0)],['↑',()=>mv(0,-1)],['↓',()=>mv(0,1)],['→',()=>mv(1,0)]]},key(k){if(k==='arrowleft')mv(-1,0);if(k==='arrowright')mv(1,0);if(k==='arrowup')mv(0,-1);if(k==='arrowdown')mv(0,1)}}}
 if(kind==='route'){const N=7,terrain=Array.from({length:49},()=>1+rand(3));let p=0,cost=0;function mv(dx,dy){const x=p%N,y=Math.floor(p/N),nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=N||ny>=N)return;p=ny*N+nx;cost+=terrain[p];if(p===48)done('Route complete. Your total travel cost was '+cost+'.')}return{r,get score(){return Math.max(0,1000-cost*15)},draw(){bg(r.game);for(let y=0;y<N;y++)for(let x=0;x<N;x++){const i=y*N+x,px=40+x*40,py=100+y*40;cell(px,py,36,['#ddd0ad','#d8e8ee','#adc7d1'][terrain[i]-1]);m.fillStyle='#18231d';m.font='8px monospace';m.fillText(terrain[i],px+18,py+21)}m.fillStyle='#a9363f';m.fillRect(46+(p%N)*40,106+Math.floor(p/N)*40,24,24)},buttons(){return[['←',()=>mv(-1,0)],['↑',()=>mv(0,-1)],['↓',()=>mv(0,1)],['→',()=>mv(1,0)]]}}}
 if(kind==='timing'){let a=0,hits=0,score=0;function hit(){let d=Math.abs(((a%(Math.PI*2))+Math.PI*2)%(Math.PI*2)-Math.PI/2);d=Math.min(d,Math.PI*2-d);if(d<.3){hits++;score+=100;if(hits>=8)done('Eight perfect timings. Lesson complete.')}else score=Math.max(0,score-25)}return{r,get score(){return score},update(dt){a+=2.3*dt},draw(){bg(r.game);m.strokeStyle='#173c2a';m.lineWidth=8;m.beginPath();m.arc(180,270,120,0,7);m.stroke();m.strokeStyle='#d8ae58';m.lineWidth=18;m.beginPath();m.arc(180,270,120,Math.PI/2-.3,Math.PI/2+.3);m.stroke();m.fillStyle='#a9363f';m.beginPath();m.arc(180+Math.cos(a)*120,270+Math.sin(a)*120,13,0,7);m.fill();m.fillStyle='#173c2a';m.fillText('PERFECT '+hits+'/8',180,450)},buttons(){return[['GO',hit]]}}}
 if(kind==='curl'){let aim=0,shots=0,score=0;function shoot(){const precision=Math.max(0,100-Math.abs(aim)*80-rand(35));score+=precision;shots++;aim=(Math.random()-.5)*1.5;if(shots>=6)done('Six stones played. Your accuracy score was '+Math.round(score)+'.')}return{r,get score(){return score},update(dt){aim+=Math.sin(performance.now()/500)*dt*.8},draw(){bg(r.game);m.fillStyle='#d9e8ee';m.fillRect(40,60,280,470);for(const rr of [85,55,28]){m.strokeStyle=rr===28?'#a9363f':'#6a98aa';m.lineWidth=6;m.beginPath();m.arc(180,140,rr,0,7);m.stroke()}m.strokeStyle='#173c2a';m.beginPath();m.moveTo(180,480);m.lineTo(180+Math.sin(aim)*120,360);m.stroke();m.fillStyle='#173c2a';m.fillText('SHOTS '+shots+'/6',180,525)},buttons(){return[['AIM ←',()=>aim-=.15],['THROW',shoot],['AIM →',()=>aim+=.15]]}}}
 if(kind==='manage'){let bars=[70,65,75,60],t=0,score=0;function boost(i){bars[i]=Math.min(100,bars[i]+25)}return{r,get score(){return score},update(dt){t+=dt;bars=bars.map((v,i)=>v-(5+i)*dt);score=t*20;if(bars.some(v=>v<=0))return done('The shift ended. Replay to keep every system healthy longer.');if(t>=45)done('You kept every Christmas system running for a full shift.')},draw(){bg(r.game);['WORKSHOP','SLEIGH','KITCHEN','POST'].forEach((n,i)=>{const y=120+i*90;m.fillStyle='#173c2a';m.fillText(n,180,y);m.fillStyle='#57252a';m.fillRect(55,y+16,250,24);m.fillStyle=bars[i]<25?'#e24a50':'#4e8a5b';m.fillRect(55,y+16,250*bars[i]/100,24)})},buttons(){return[['TOOLS',()=>boost(0)],['FEED',()=>boost(1)],['OVEN',()=>boost(2)],['SORT',()=>boost(3)]]}}}
 let phase=0,score=0,progress=0,land=25,del=0;return{r,get score(){return score},update(dt){if(phase===1){progress+=20*dt;score+=dt*3;if(progress>=100)phase=2}},draw(){bg(r.game);m.fillStyle='#173c2a';m.font='bold 15px monospace';m.fillText(['PLAN THE ROUTE','FLY THE NIGHT','LAND THE SLEIGH','DELIVER THE GIFTS'][phase],180,90);if(phase===0){for(let i=0;i<6;i++){m.fillStyle=i<progress?'#d8ae58':'#d8cba9';m.fillRect(65+i*42,180,32,32)}}if(phase===1){m.fillStyle='#102a42';m.fillRect(40,145,280,270);spr(m,'TF Rudolph Adult.png',180,285,'up',1,34);m.fillStyle='#d8ae58';m.fillRect(40,380,280*Math.min(1,progress/100),18)}if(phase===2){m.strokeStyle='#d8ae58';m.lineWidth=6;m.strokeRect(110,220,140,80);m.fillStyle='#a9363f';m.fillRect(160+land,180,40,30)}if(phase===3){m.fillStyle='#7a543b';m.fillRect(140,170,80,180);m.fillStyle='#a9363f';m.fillRect(165,300-del*35,30,30)}},buttons(){if(phase===0)return[['ROUTE',()=>{progress++;score+=20;if(progress>=6){phase=1;progress=0}}]];if(phase===1)return[['STEADY',()=>score+=1]];if(phase===2)return[['LEFT',()=>land=Math.max(-40,land-10)],['LAND',()=>{if(Math.abs(land)<15){phase=3;score+=200}else score=Math.max(0,score-20)}],['RIGHT',()=>land=Math.min(40,land+10)]];return[['DELIVER',()=>{del++;score+=100;if(del>=3)done('You planned the route, flew it, landed safely and completed the Christmas Eve deliveries.')}]]}}
}
const helps={
1:'Rotate the tiles until every Christmas-light piece is aligned.',2:'Push every parcel onto a gold delivery square.',3:'Rotate the track pieces into the correct railway layout.',4:'Dodge the snowbanks and keep control to the finish.',5:'Watch the order, then repeat the recipe sequence.',6:'Your lantern reveals only nearby tiles. Find the far corner.',7:'Watch the bells, then repeat the pattern.',8:'Navigate the icy route to the target without losing your way.',9:'Push the snow piles into the marked clearing spaces.',10:'Rotate every wreath segment into its correct position.',11:'Reach the far corner while keeping your route cost low.',12:'Search the snowfield and find the hidden target route.',13:'Push the present blocks into the correct chimney positions.',14:'Fly through the storm and avoid every cloud bank you can.',15:'Fit all gifts into their correct packing spaces.',16:'Navigate the shifting workshop maze to the toy.',17:'Press GO when the moving marker crosses the gold zone.',18:'Aim and throw six snowballs as accurately as possible.',19:'Remember the story pattern and repeat it correctly.',20:'Time each kitchen action precisely.',21:'Move the formation along the most efficient route.',22:'Keep all four Christmas systems healthy for a full shift.',23:'Stay in control through the long senior reindeer run.',24:'Complete the final four-part Christmas Eve test.'
};
function openGame(r){state.resident=r;finished=false;game=buildGame(r);mini.hidden=false;miniResult.hidden=true;miniDay.textContent='DAY '+r.day;miniTitle.textContent=r.game;miniSubtitle.textContent=r.name+' · '+r.skill;miniHelp.textContent=helps[r.day];setButtons(game.buttons?game.buttons():[]);gameLast=performance.now();requestAnimationFrame(gameLoop)}
mc.onpointerdown=e=>{if(!game||!game.pointer)return;const r=mc.getBoundingClientRect();game.pointer((e.clientX-r.left)*360/r.width,(e.clientY-r.top)*560/r.height)};
function gameLoop(t){if(mini.hidden||!game)return;const dt=Math.min(.05,(t-gameLast)/1000);gameLast=t;if(!finished)game.update&&game.update(dt);game.draw();miniScore.textContent=Math.max(0,Math.round(game.score||0));if(game.r.kind==='final'&&!finished)setButtons(game.buttons());requestAnimationFrame(gameLoop)}
function loop(t){const dt=Math.min(.05,(t-last)/1000);last=t;update(dt,t);worldDraw(t);requestAnimationFrame(loop)}
Promise.all([
 VillagePixelAssets.ready,
 window.WorldBuilderExtraAssets?.ready||Promise.resolve(null),
 window.WorldBuilderSheetAssets?.ready||Promise.resolve(null)
]).then(([base,extra,sheets])=>{
 assets=base;extraAssets=extra;sheetAssets=sheets;
 loc.textContent=mapLabel();renderJournal();requestAnimationFrame(loop);
}).catch(e=>{console.error(e);msg('Could not load Christmas artwork')});
})();