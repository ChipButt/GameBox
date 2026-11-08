/* Dungeon Escape V8 — positions for 12 floor talismans, 12 wall holes,
   gold bag and shield; independently editable for desktop/mobile and wide/zoom. */
(()=>{
'use strict';
const STORE='BRM_DUNGEON_ASSET_LAYOUT_V8',ID='brm-dungeon-asset-positions';
const xs=[33.9,48.8,64],ys=[24.2,42.2,60.5,78.5];
const wideD=[[20,79],[41,78],[61,80],[80,79],[13,87],[33,86],[53,87],[73,86],[23,94],[44,93],[65,94],[86,93]];
const wideM=[[20,77],[40,76],[61,77],[81,78],[12,85],[36,84],[60,85],[85,84],[21,93],[44,92],[67,93],[85,92]];
const angles=[0,-17,8,27,-10,18,-15,11,23,-12,6,-21];
const box=(x,y,w,h,r=0)=>({x,y,w,h,r});
function defaultsFor(scene,device){
 const wide=scene==='wide',mobile=device==='mobile';
 const positions=wide?(mobile?wideM:wideD):wideM;
 return {
  stones:positions.map(([x,y],i)=>box(x,wide?y:20+(y-75)*2.7,wide?(mobile?11.5:6.4):(mobile?11.5:9.7),wide?(mobile?7.4:10.9):(mobile?20:24),angles[i])),
  sockets:Array.from({length:12},(_,i)=>box(xs[i%3],ys[Math.floor(i/3)],wide?9.4:10.55,wide?9.4:10.55)),
  gold:wide?box(34,55.5,18,7):box(32.9,57.375,17,12.75),
  shield:wide?box(63.3,55.5,18,7):box(62.2,57.675,15.8,11.75)
 };
}
const defaults=()=>({schema:ID,version:8,units:'percent',coordinates:'centres',
 wide:{desktop:defaultsFor('wide','desktop'),mobile:defaultsFor('wide','mobile')},
 zoom:{desktop:defaultsFor('zoom','desktop'),mobile:defaultsFor('zoom','mobile')}});
function validateBox(v,key){
 if(!v||typeof v!=='object')throw Error(key+' is missing');
 const out={};
 for(const a of ['x','y','w','h','r']){
  const n=v[a],min=a==='r'?-720:a==='w'||a==='h'?0.5:-25,max=a==='r'?720:a==='w'||a==='h'?100:125;
  if(typeof n!=='number'||!Number.isFinite(n)||n<min||n>max)throw Error(key+'.'+a+' is invalid');
  out[a]=Math.round(n*1000)/1000;
 }
 return out;
}
function validate(data){
 if(data?.schema!==ID||data.version!==8)throw Error('Use V8 asset-position JSON, not the older mobile-layout JSON.');
 const result=defaults();
 for(const scene of ['wide','zoom'])for(const device of ['desktop','mobile']){
  const src=data[scene]?.[device],dst=result[scene][device],p=scene+'.'+device;
  if(!src||src.stones?.length!==12||src.sockets?.length!==12||!Array.isArray(src.stones)||!Array.isArray(src.sockets))
   throw Error(p+' needs 12 floor stones and 12 wall sockets');
  dst.stones=src.stones.map((v,i)=>validateBox(v,p+'.stones['+i+']'));
  dst.sockets=src.sockets.map((v,i)=>validateBox(v,p+'.sockets['+i+']'));
  dst.gold=validateBox(src.gold,p+'.gold');dst.shield=validateBox(src.shield,p+'.shield');
 }
 return result;
}
let layout=defaults();
try{const saved=localStorage.getItem(STORE);if(saved)layout=validate(JSON.parse(saved))}
catch(e){console.warn('Invalid asset positions ignored',e)}
const state={open:false,device:'desktop',scene:'wide',area:'talismans',asset:'stone-0'};
const mobile=()=>window.matchMedia('(max-width:630px)').matches;
const device=()=>state.open?state.device:(mobile()?'mobile':'desktop');
const profile=scene=>layout[scene][device()];
function item(scene,id){
 const p=profile(scene);
 if(id.startsWith('stone-'))return p.stones[Number(id.slice(6))];
 if(id.startsWith('socket-'))return p.sockets[Number(id.slice(7))];
 return p[id];
}
function stoneStyle(n,id,scene){
 const o=item(scene,id);if(!n||!o)return;
 n.dataset.layoutAsset=id;
 n.style.left=o.x+'%';n.style.top=o.y+'%';
 n.style.width=o.w+'%';n.style.height=o.h+'%';n.style.aspectRatio='auto';
 n.style.setProperty('--stone-rot',o.r+'deg');n.style.setProperty('--stone-size','1');
}
function socketStyle(n,id,scene){
 const o=item(scene,id);if(!n||!o)return;
 n.dataset.layoutAsset=id;n.style.left=o.x+'%';n.style.top=o.y+'%';
 n.style.width=o.w+'%';n.style.height=o.h+'%';
}
function prizeStyle(n,id,scene){
 const o=item(scene,id);if(!n||!o)return;
 n.dataset.layoutAsset=id;n.style.left=(o.x-o.w/2)+'%';n.style.top=(o.y-o.h/2)+'%';
 n.style.width=o.w+'%';n.style.height=o.h+'%';n.style.rotate=o.r+'deg';
}
function applyWide(){
 document.querySelectorAll('#floorTalismans .floor-talisman').forEach(n=>{
  if(n.dataset.layoutAsset)stoneStyle(n,n.dataset.layoutAsset,'wide');
 });
 document.querySelectorAll('.room-wide-stone').forEach((n,i)=>socketStyle(n,'socket-'+(Number(n.dataset.socketIndex)||i),'wide'));
 const p=getHotspot('pipes');
 for(const id of ['gold','shield'])prizeStyle(p?.querySelector('.wide-prize.'+id),id,'wide');
}
function applyZoom(){
 if(view==='talismans'){
  document.querySelectorAll('.panel-stage .panel-socket').forEach((n,i)=>socketStyle(n,'socket-'+i,'zoom'));
  document.querySelectorAll('.floor-inspection .floor-talisman').forEach(n=>{
   if(n.dataset.layoutAsset)stoneStyle(n,n.dataset.layoutAsset,'zoom');
  });
 }else if(view==='pipes'){
  for(const id of ['gold','shield'])
   prizeStyle(document.querySelector('.pipes-stage .pipe-prize.'+(id==='gold'?'left':'right')),id,'zoom');
 }
}
window.DungeonPlacement={coords:(scene,i)=>{const o=profile(scene).sockets[i];return {x:o.x,y:o.y}},
 get:()=>JSON.parse(JSON.stringify(layout))};
const prevStone=stoneNode;
stoneNode=function(piece,context,p){
 const n=prevStone(piece,context,p);stoneStyle(n,'stone-'+piece.position,context==='room'?'wide':'zoom');return n;
};
const prevSocket=socketButton;
socketButton=function(slot,i){const n=prevSocket(slot,i);socketStyle(n,'socket-'+i,'zoom');return n};
const prevRender=render;
render=function(){prevRender();applyWide();if(state.open)requestAnimationFrame(refreshHandles)};
const prevTalismans=drawTalismanPuzzle;
drawTalismanPuzzle=function(p){prevTalismans(p);applyZoom();if(state.open)requestAnimationFrame(refreshHandles)};
const prevPipes=drawPipes;
drawPipes=function(p){prevPipes(p);applyZoom();if(state.open)requestAnimationFrame(refreshHandles)};
const prevClose=closeView;
closeView=function(){prevClose();if(state.open&&state.scene==='zoom'){state.scene='wide';syncControls();requestAnimationFrame(refreshHandles)}};
const ed=document.createElement('section');ed.id='placementEditor';ed.className='placement-editor';ed.hidden=true;ed.setAttribute('aria-label','Dungeon asset positioning editor');
ed.innerHTML=[
'<div class="placement-head"><strong>POSITIONING EDITOR · V8</strong><button type="button" id="placementDone">Done</button></div>',
'<div class="placement-selects">',
'<label>Screen<select id="pDevice"><option value="desktop">Desktop</option><option value="mobile">Mobile portrait</option></select></label>',
'<label>Perspective<select id="pScene"><option value="wide">Wide room</option><option value="zoom">Close-up</option></select></label>',
'<label>Mechanism<select id="pArea"><option value="talismans">Stones and holes</option><option value="pipes">Gold and shield</option></select></label>',
'<label>Asset<select id="pAsset"></select></label></div>',
'<div class="placement-fields"><label>X %<input type="number" step=".1" id="pX"></label>',
'<label>Y %<input type="number" step=".1" id="pY"></label>',
'<label>Width %<input type="number" step=".1" id="pW"></label>',
'<label>Height %<input type="number" step=".1" id="pH"></label>',
'<label>Angle °<input type="number" step="1" id="pR"></label></div>',
'<div class="placement-actions"><button type="button" id="pCopy">Copy JSON</button>',
'<button type="button" id="pImport">Apply pasted JSON</button>',
'<button type="button" id="pReset">Reset this view</button>',
'<button type="button" id="pDownload">Download JSON</button></div>',
'<textarea id="pJSON" rows="5" spellcheck="false" aria-label="Copy or paste all four layouts as JSON"></textarea>',
'<p role="status" id="pStatus">Drag an outline to move its asset; drag the corner to resize. Positions are saved automatically.</p>'
].join('');
document.body.append(ed);
const $e=id=>document.getElementById(id);
const handles=document.createElement('div');handles.id='placementHandles';handles.className='placement-handles';handles.hidden=true;document.body.append(handles);
function note(msg){$e('pStatus').textContent=msg}
function persist(){try{localStorage.setItem(STORE,JSON.stringify(layout))}catch{note('Storage unavailable. Copy your JSON to keep it.')}}
const ids=()=>state.area==='pipes'?['gold','shield']:
 Array.from({length:12},(_,i)=>'stone-'+i).concat(Array.from({length:12},(_,i)=>'socket-'+i));
function nameFor(id){if(id==='gold')return 'Gold bag';if(id==='shield')return 'Shield';return (id.startsWith('stone')?'Floor talisman ':'Wall socket ')+(Number(id.split('-')[1])+1)}
function syncControls(){
 $e('pDevice').value=state.device;$e('pScene').value=state.scene;$e('pArea').value=state.area;
 const all=ids();if(!all.includes(state.asset))state.asset=all[0];
 const select=$e('pAsset');select.replaceChildren();
 for(const id of all){const o=document.createElement('option');o.value=id;o.textContent=nameFor(id);select.append(o)}
 select.value=state.asset;syncFields();
}
function syncFields(){
 const o=item(state.scene,state.asset);if(!o)return;
 for(const [name,id] of [['x','pX'],['y','pY'],['w','pW'],['h','pH'],['r','pR']]){
  if(document.activeElement!==$e(id))$e(id).value=o[name];
 }
}
function targetParent(id){
 if(state.scene==='wide'){
  if(id.startsWith('stone-'))return $('roomStage');
  if(id.startsWith('socket-'))return getHotspot('panel');
  return getHotspot('pipes');
 }
 if(id.startsWith('stone-'))return document.querySelector('.floor-inspection');
 if(id.startsWith('socket-'))return document.querySelector('.panel-stage');
 return document.querySelector('.pipes-stage');
}
function boundsFor(id){
 const parent=targetParent(id),b=parent?.getBoundingClientRect(),o=item(state.scene,id);
 if(!b?.width||!b?.height||!o)return null;
 return {left:b.left+(o.x-o.w/2)*b.width/100,top:b.top+(o.y-o.h/2)*b.height/100,
  width:o.w*b.width/100,height:o.h*b.height/100,parent:b};
}
function ghost(parent,id,src){
 const image=document.createElement('img');image.className='placement-ghost';image.src=src;image.alt='';
 if(id.startsWith('stone-'))stoneStyle(image,id,state.scene);else prizeStyle(image,id,state.scene);
 parent.append(image);
}
function editorGhosts(){
 document.querySelectorAll('.placement-ghost').forEach(n=>n.remove());
 if(!state.open||!game)return;
 if(state.area==='talismans'){
  const p=self(),root=state.scene==='wide'?$('floorTalismans'):document.querySelector('.floor-inspection');
  if(!p||!root)return;
  const all=codeFor(library,p).map((c,i)=>({symbol:c.symbol,position:i}));
  for(let i=all.length-1;i>0;i--){const j=(i*7+p.index*5+3)%(i+1);[all[i],all[j]]=[all[j],all[i]]}
  all.forEach((c,i)=>{if(!root.querySelector('.floor-talisman[data-layout-asset="stone-'+i+'"]'))
    ghost(root,'stone-'+i,AS+'talismans/'+c.symbol+'_angled.webp')});
 }else{
  const root=state.scene==='wide'?getHotspot('pipes'):document.querySelector('.pipes-stage');
  if(!root)return;
  for(const id of ['gold','shield']){
   const selector=state.scene==='wide'?'.wide-prize.'+id:'.pipe-prize.'+(id==='gold'?'left':'right');
   const source=root.querySelector(selector);
   if(!source||source.hidden)ghost(root,id,AS+'rewards/'+(id==='gold'?'gold_sack.webp':'brm-original-shield.svg'));
  }
 }
}
function refreshHandles(){
 if(!state.open)return;
 applyWide();applyZoom();editorGhosts();syncFields();handles.replaceChildren();
 for(const id of ids()){
  const rect=boundsFor(id);if(!rect)continue;
  const h=document.createElement('div');h.className='placement-handle'+(id===state.asset?' chosen':'');
  h.dataset.id=id;h.style.left=rect.left+'px';h.style.top=rect.top+'px';
  h.style.width=Math.max(16,rect.width)+'px';h.style.height=Math.max(16,rect.height)+'px';
  const label=document.createElement('span');label.className='placement-handle-label';
  label.textContent=id.startsWith('stone-')?'T'+(Number(id.slice(6))+1):id.startsWith('socket-')?'H'+(Number(id.slice(7))+1):id==='gold'?'£':'S';
  const corner=document.createElement('span');corner.className='placement-corner';h.append(label,corner);
  h.addEventListener('pointerdown',ev=>{
   if(ev.button>0)return;ev.preventDefault();ev.stopPropagation();
   state.asset=id;syncControls();
   const base=targetParent(id)?.getBoundingClientRect();if(!base?.width||!base?.height)return;
   const before={...item(state.scene,id)},px=ev.clientX,py=ev.clientY,pointer=ev.pointerId;
   const resize=ev.target===corner;
   try{h.setPointerCapture(pointer)}catch{}
   const move=e=>{
    if(e.pointerId!==pointer||!state.open)return;
    const dx=(e.clientX-px)/base.width*100,dy=(e.clientY-py)/base.height*100,o=item(state.scene,id);
    if(resize){o.w=Math.max(.5,Math.min(100,before.w+dx));o.h=Math.max(.5,Math.min(100,before.h+dy))}
    else{o.x=Math.max(-25,Math.min(125,before.x+dx));o.y=Math.max(-25,Math.min(125,before.y+dy))}
    applyWide();applyZoom();syncFields();
    const b=boundsFor(id);if(b){h.style.left=b.left+'px';h.style.top=b.top+'px';h.style.width=Math.max(16,b.width)+'px';h.style.height=Math.max(16,b.height)+'px'}
   };
   const end=e=>{
    if(e.pointerId!==pointer)return;
    h.removeEventListener('pointermove',move);h.removeEventListener('pointerup',end);
    h.removeEventListener('pointercancel',end);persist();refreshHandles();
    note('Saved '+nameFor(id)+' · '+state.scene+' · '+state.device);
   };
   h.addEventListener('pointermove',move);h.addEventListener('pointerup',end);h.addEventListener('pointercancel',end);
  });
  handles.append(h);
 }
}
function preview(){
 document.body.classList.toggle('layout-preview-mobile',state.open&&state.device==='mobile');
 document.body.classList.toggle('layout-preview-desktop',state.open&&state.device==='desktop');
 if(state.open){
  // Preview whichever device the editor selects, not the actual browser width.
  for(const id of mobileOrder){
   const n=getHotspot(id);if(!n)continue;
   if(state.device==='mobile'){
    const o=mobileLayout[id];if(!o)continue;
    n.style.left=o.x+'%';n.style.top=o.y+'%';
    n.style.width=o.w+'%';n.style.height=o.h+'%';
   }else for(const field of ['left','top','width','height'])n.style.removeProperty(field);
  }
 }else showMobileLayout();
 if(!state.open)return;
 const kind=state.scene==='wide'?null:(state.area==='pipes'?'pipes':'talismans');
 if(kind&&view!==kind)setView(kind);
 else if(!kind&&view)closeView();
 applyWide();applyZoom();requestAnimationFrame(refreshHandles);
}
function toggle(open){
 if(open&&!game){notify('Start the local dungeon test first.');return}
 state.open=open;ed.hidden=!open;handles.hidden=!open;document.body.classList.toggle('placement-editing',open);
 if(open){
  state.device=mobile()?'mobile':'desktop';state.scene='wide';state.area='talismans';state.asset='stone-0';
  syncControls();$e('pJSON').value=JSON.stringify(layout,null,2);
 }else{
  if(view)closeView();document.querySelectorAll('.placement-ghost').forEach(n=>n.remove());
  document.body.classList.remove('layout-preview-mobile','layout-preview-desktop');showMobileLayout();persist();
 }
 preview();
}
function selectContext(){
 state.device=$e('pDevice').value;state.scene=$e('pScene').value;state.area=$e('pArea').value;
 state.asset=state.area==='pipes'?'gold':'stone-0';syncControls();preview();
}
const button=$('editMobile');button.textContent='Position assets';button.title='Edit four layouts and copy or paste JSON';
button.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();toggle(!state.open)},true);
$e('placementDone').addEventListener('click',()=>toggle(false));
for(const id of ['pDevice','pScene','pArea'])$e(id).addEventListener('change',selectContext);
$e('pAsset').addEventListener('change',e=>{state.asset=e.target.value;syncFields();refreshHandles()});
for(const [key,id] of [['x','pX'],['y','pY'],['w','pW'],['h','pH'],['r','pR']]){
 $e(id).addEventListener('change',e=>{
  const n=Number(e.target.value),o=item(state.scene,state.asset);
  if(!o||!Number.isFinite(n)){note('Enter a valid number');return}
  const min=key==='r'?-720:key==='w'||key==='h'?0.5:-25;
  const max=key==='r'?720:key==='w'||key==='h'?100:125;
  o[key]=Math.max(min,Math.min(max,n));persist();refreshHandles();
 });
}
$e('pCopy').addEventListener('click',async()=>{
 const data=JSON.stringify(layout,null,2);$e('pJSON').value=data;
 try{await navigator.clipboard.writeText(data);note('All four views copied as JSON.')}
 catch{$e('pJSON').focus();$e('pJSON').select();note('JSON selected: press Ctrl/Cmd+C to copy.')}
});
$e('pImport').addEventListener('click',()=>{
 try{const next=validate(JSON.parse($e('pJSON').value));layout=next;persist();preview();note('Imported and saved all four profiles.')}
 catch(e){note('Not imported: '+e.message)}
});
$e('pReset').addEventListener('click',()=>{
 if(!confirm('Reset '+state.scene+' '+state.device+' only?'))return;
 layout[state.scene][state.device]=defaultsFor(state.scene,state.device);
 persist();preview();note('Only the selected screen was reset.');
});
$e('pDownload').addEventListener('click',()=>{
 const u=URL.createObjectURL(new Blob([JSON.stringify(layout,null,2)],{type:'application/json'}));
 const a=document.createElement('a');a.href=u;a.download='dungeon_escape_asset_positions_v8.json';
 document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),600);
});
$('viewContent').addEventListener('click',e=>{if(state.open){e.preventDefault();e.stopImmediatePropagation()}},true);
window.addEventListener('resize',()=>{if(state.open)requestAnimationFrame(refreshHandles);else applyWide()});
window.addEventListener('scroll',()=>{if(state.open)requestAnimationFrame(refreshHandles)},{passive:true});
if(game){applyWide();if(view)applyZoom()}
})();
