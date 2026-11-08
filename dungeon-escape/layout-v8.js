/* Dungeon Escape V8 — positions for 12 floor talismans, 12 wall holes,
   gold bag and shield; independently editable for desktop/mobile and wide/zoom. */
(()=>{
'use strict';
const STORE='BRM_DUNGEON_ASSET_LAYOUT_V8_2_PRIZES_20261108',ID='brm-dungeon-asset-positions';
const xs=[33.9,48.8,64],ys=[24.2,42.2,60.5,78.5];
const wideD=[[20,79],[41,78],[61,80],[80,79],[13,87],[33,86],[53,87],[73,86],[23,94],[44,93],[65,94],[86,93]];
const wideM=[[20,77],[40,76],[61,77],[81,78],[12,85],[36,84],[60,85],[85,84],[21,93],[44,92],[67,93],[85,92]];
const angles=[0,-17,8,27,-10,18,-15,11,23,-12,6,-21];
const box=(x,y,w,h,r=0)=>({x,y,w,h,r});
const DEFAULT_FRAME_CORNERS=[[30,58],[192,161],[194,470],[30,495]]
 .map(([x,y])=>({x:x/214*100,y:y/563*100}));
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
// Approved positions exported after desktop, mobile close-up and mobile wide-view alignment.
const APPROVED_LAYOUT={"schema":"brm-dungeon-asset-positions","version":8,"units":"percent","coordinates":"centres","wide":{"desktop":{"stones":[{"x":32.647042410714285,"y":78.06001984126983,"w":6.4,"h":10.9,"r":0},{"x":46.765625,"y":79.98164682539682,"w":6.4,"h":10.9,"r":-17},{"x":60.305245535714285,"y":82.9186507936508,"w":6.4,"h":10.9,"r":8},{"x":68.39927455357143,"y":80.17857142857143,"w":6.4,"h":10.9,"r":27},{"x":25.945591517857146,"y":85.42857142857143,"w":6.4,"h":10.9,"r":-10},{"x":39.16880580357143,"y":81.07242063492063,"w":6.4,"h":10.9,"r":18},{"x":53,"y":87,"w":6.4,"h":10.9,"r":-15},{"x":78.86690848214286,"y":88.52132936507937,"w":6.4,"h":10.9,"r":11},{"x":34.304129464285715,"y":92.92113095238095,"w":6.4,"h":10.9,"r":23},{"x":44,"y":93,"w":6.4,"h":10.9,"r":-12},{"x":65,"y":94,"w":6.4,"h":10.9,"r":6},{"x":85.97712053571429,"y":92.98561507936508,"w":6.4,"h":10.9,"r":-21}],"sockets":[{"x":34.350807368064736,"y":24.179966659156257,"w":10,"h":10,"r":0},{"x":50.14137796592411,"y":24.22574996781254,"w":8.177097806989265,"h":9.907128516479979,"r":0},{"x":65.87841020825945,"y":24.012960683017894,"w":7.637106188948709,"h":9.430402061606797,"r":0},{"x":33.9,"y":42.2,"w":9.4,"h":9.4,"r":0},{"x":48.8,"y":42.2,"w":9.4,"h":9.4,"r":0},{"x":64,"y":42.2,"w":9.4,"h":9.4,"r":0},{"x":33.9,"y":60.5,"w":9.4,"h":9.4,"r":0},{"x":48.8,"y":60.5,"w":9.4,"h":9.4,"r":0},{"x":64,"y":60.5,"w":9.4,"h":9.4,"r":0},{"x":33.9,"y":78.5,"w":9.4,"h":9.4,"r":0},{"x":48.8,"y":78.5,"w":9.4,"h":9.4,"r":0},{"x":64,"y":78.5,"w":9.4,"h":9.4,"r":0}],"gold":{"x":35.90293148601842,"y":26.654459106266337,"w":22.158570583762778,"h":8.782526933129342,"r":0},"shield":{"x":68.81237644673482,"y":24.71176770574361,"w":14.92278448931317,"h":6.1681009753298905,"r":0}},"mobile":{"stones":[{"x":26.965204183782667,"y":75.39666420721525,"w":11.5,"h":7.4,"r":0},{"x":44.821533363250374,"y":74.56267717758534,"w":11.5,"h":7.4,"r":-17},{"x":62.062342504056055,"y":74.89668362393694,"w":11.5,"h":7.4,"r":8},{"x":76.10252338706894,"y":76.65539202361073,"w":11.5,"h":7.4,"r":27},{"x":24.816286375090613,"y":83.9738262591744,"w":11.5,"h":7.4,"r":-10},{"x":44.497877040974835,"y":81.76659158867618,"w":11.5,"h":7.4,"r":18},{"x":60,"y":85,"w":11.5,"h":7.4,"r":-15},{"x":78.0045911146398,"y":84.47959302551357,"w":11.5,"h":7.4,"r":11},{"x":21,"y":93,"w":11.5,"h":7.4,"r":23},{"x":40.28223273154061,"y":92.18542969205079,"w":11.5,"h":7.4,"r":-12},{"x":67,"y":93,"w":11.5,"h":7.4,"r":6},{"x":85,"y":92,"w":11.5,"h":7.4,"r":-21}],"sockets":[{"x":33.9,"y":24.2,"w":9.4,"h":9.4,"r":0},{"x":48.8,"y":24.2,"w":9.4,"h":9.4,"r":0},{"x":64,"y":24.2,"w":9.4,"h":9.4,"r":0},{"x":33.9,"y":42.2,"w":9.4,"h":9.4,"r":0},{"x":48.8,"y":42.2,"w":9.4,"h":9.4,"r":0},{"x":64,"y":42.2,"w":9.4,"h":9.4,"r":0},{"x":33.9,"y":60.5,"w":9.4,"h":9.4,"r":0},{"x":48.8,"y":60.5,"w":9.4,"h":9.4,"r":0},{"x":64,"y":60.5,"w":9.4,"h":9.4,"r":0},{"x":33.9,"y":78.5,"w":9.4,"h":9.4,"r":0},{"x":48.8,"y":78.5,"w":9.4,"h":9.4,"r":0},{"x":64,"y":78.5,"w":9.4,"h":9.4,"r":0}],"gold":{"x":35.49271002082851,"y":27.14844529431327,"w":19.420388798889146,"h":8.155636847356169,"r":0},"shield":{"x":68.62862763249247,"y":23.299093781177252,"w":15.274936357324695,"h":6.012720319255072,"r":0}}},"zoom":{"desktop":{"stones":[{"x":20,"y":25.4,"w":9.7,"h":24,"r":0},{"x":40,"y":22.7,"w":9.7,"h":24,"r":-17},{"x":61,"y":25.4,"w":9.7,"h":24,"r":8},{"x":81,"y":28.1,"w":9.7,"h":24,"r":27},{"x":12,"y":47,"w":9.7,"h":24,"r":-10},{"x":36,"y":44.3,"w":9.7,"h":24,"r":18},{"x":60,"y":47,"w":9.7,"h":24,"r":-15},{"x":85,"y":44.3,"w":9.7,"h":24,"r":11},{"x":21,"y":68.6,"w":9.7,"h":24,"r":23},{"x":44,"y":65.9,"w":9.7,"h":24,"r":-12},{"x":67,"y":68.6,"w":9.7,"h":24,"r":6},{"x":85,"y":65.9,"w":9.7,"h":24,"r":-21}],"sockets":[{"x":34.25430938067944,"y":22.571895242089564,"w":10.55,"h":10.55,"r":0},{"x":50.009719698028796,"y":22.580632834708044,"w":10.55,"h":10.55,"r":0},{"x":65.76149867188592,"y":22.99537723099865,"w":10,"h":10.55,"r":0},{"x":34.21935901020551,"y":40.59752551377045,"w":10.55,"h":10.55,"r":0},{"x":49.971711170138406,"y":40.56548767416935,"w":10.55,"h":10.55,"r":0},{"x":65.74839228295819,"y":40.81188778601053,"w":10.55,"h":10.55,"r":0},{"x":34.23246539913323,"y":58.84684747658325,"w":10.55,"h":10.55,"r":0},{"x":49.98394379980427,"y":58.71345356260776,"w":10.55,"h":10.55,"r":0},{"x":65.78509017195583,"y":58.92898084719698,"w":10.55,"h":10.55,"r":0},{"x":34.194456871242835,"y":77.1596532923249,"w":10.55,"h":10.55,"r":0},{"x":50.04073815182441,"y":77.13518803299316,"w":10.55,"h":10.55,"r":0},{"x":65.62956102334685,"y":77.19110862575144,"w":10.55,"h":10.55,"r":0}],"gold":{"x":31.70514024465587,"y":26.525004546781457,"w":21.50327443469665,"h":16.851254795840823,"r":0},"shield":{"x":62.531807966761406,"y":26.354224423340682,"w":15.8,"h":11.75,"r":0}},"mobile":{"stones":[{"x":23.267761791753188,"y":13.732821614983111,"w":11.5,"h":20,"r":0},{"x":41.867027588252746,"y":2.1270033773411114,"w":11.5,"h":20,"r":-17},{"x":59.99510530999704,"y":4.272428615290142,"w":11.5,"h":20,"r":8},{"x":76.71992732126965,"y":15.321753147067856,"w":11.5,"h":20,"r":27},{"x":18.322307920498368,"y":37.87926005526558,"w":11.5,"h":20,"r":-10},{"x":38.498331355680804,"y":28.64333742708013,"w":11.5,"h":20,"r":18},{"x":60.08806733906852,"y":29.165336198956094,"w":11.5,"h":20,"r":-15},{"x":84.67554138237912,"y":37.65085968682837,"w":11.5,"h":20,"r":11},{"x":24.446677543755563,"y":60.33510899600859,"w":11.5,"h":20,"r":23},{"x":39.97764016612281,"y":57.230211851396994,"w":11.5,"h":20,"r":-12},{"x":58.007861168792644,"y":55.794887933681295,"w":11.5,"h":20,"r":6},{"x":71.54516463957283,"y":52.75331593490943,"w":11.5,"h":20,"r":-21}],"sockets":[{"x":34.308557782903925,"y":22.35131692947496,"w":10.55,"h":10.55,"r":0},{"x":49.95419604275642,"y":22.473696066539596,"w":10.55,"h":10.55,"r":0},{"x":65.7625653854901,"y":22.562502166002425,"w":10.55,"h":10.55,"r":0},{"x":34.37597387829364,"y":40.432542020447066,"w":10.55,"h":10.55,"r":0},{"x":49.97450209558465,"y":40.46828106047479,"w":10.55,"h":10.55,"r":0},{"x":65.74875726956691,"y":40.65239126667822,"w":10.55,"h":10.55,"r":0},{"x":34.28906397218883,"y":58.81376711141917,"w":10.55,"h":10.55,"r":0},{"x":50.041918190974364,"y":58.57117483971582,"w":10.55,"h":10.55,"r":0},{"x":65.97780954546931,"y":58.836510136891356,"w":10.55,"h":10.55,"r":0},{"x":34.034832190779426,"y":76.94264425576156,"w":10.55,"h":10.55,"r":0},{"x":50.02729783293804,"y":77.27620862935366,"w":10.55,"h":10.55,"r":0},{"x":65.72845121673869,"y":77.11700745104835,"w":10.55,"h":10.55,"r":0}],"gold":{"x":31.82150243417078,"y":25.018458205071823,"w":17,"h":12.75,"r":0},"shield":{"x":63.074169361429945,"y":25.679589304989204,"w":12.234917024981344,"h":9.038851576450522,"r":0}}}};
// Add water boxes without changing any previously approved stone/prize coordinates.
const defaults=()=>{
 const result=JSON.parse(JSON.stringify(APPROVED_LAYOUT));
 for(const scene of ['wide','zoom'])for(const dev of ['desktop','mobile']){
  const p=result[scene][dev];
  if(scene==='wide'){
   p.frameCorners=DEFAULT_FRAME_CORNERS.map(c=>({...c}));
   p.safeMark=box(50,50,94,76);
   p.waterLeft=box(35.4,46,24,54);
   p.waterRight=box(66.2,45,26,56);
  }else{
   p.waterLeft=box(30.65,44.25,20.7,49.5);
   p.waterRight=box(60.65,44.25,20.7,49.5);
  }
 }
 return result;
};
function validateBox(v,key){
 if(!v||typeof v!=='object')throw Error(key+' is missing');
 const out={};
 for(const a of ['x','y','w','h','r']){
  const n=v[a],min=a==='r'?-720:a==='w'||a==='h'?0.5:-25,max=a==='r'?720:a==='w'||a==='h'?100:125;
  if(typeof n!=='number'||!Number.isFinite(n)||n<min||n>max)throw Error(key+'.'+a+' is invalid');
  out[a]=n; // Keep the full precision from approved visual alignment and later JSON imports.
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
   // V8.2 JSON without water remains fully importable.
   if(src.waterLeft!==undefined)dst.waterLeft=validateBox(src.waterLeft,p+'.waterLeft');
   if(src.waterRight!==undefined)dst.waterRight=validateBox(src.waterRight,p+'.waterRight');
   if(scene==='wide'){
    if(src.safeMark!==undefined)dst.safeMark=validateBox(src.safeMark,p+'.safeMark');
    if(src.frameCorners!==undefined){
     if(!Array.isArray(src.frameCorners)||src.frameCorners.length!==4)throw Error(p+'.frameCorners needs four points');
     dst.frameCorners=src.frameCorners.map((point,i)=>{
      if(!point||!Number.isFinite(point.x)||!Number.isFinite(point.y)||point.x < -15||point.x>115||point.y < -15||point.y>115)
       throw Error(p+'.frameCorners['+i+'] must contain valid X/Y percentages');
      return {x:point.x,y:point.y};
     });
    }
   }
 }
 return result;
}
let layout=defaults();
try{const saved=localStorage.getItem(STORE);if(saved)layout=validate(JSON.parse(saved))}
catch(e){console.warn('Invalid asset positions ignored',e)}
const state={open:false,device:'desktop',scene:'wide',area:'sockets',asset:'socket-0'};
const mobile=()=>window.matchMedia('(max-width:630px)').matches;
const device=()=>state.open?state.device:(mobile()?'mobile':'desktop');
const profile=scene=>layout[scene][device()];
function item(scene,id){
 const p=profile(scene);
 if(id.startsWith('stone-'))return p.stones[Number(id.slice(6))];
 if(id.startsWith('socket-'))return p.sockets[Number(id.slice(7))];
 if(id.startsWith('corner-'))return layout.wide[device()].frameCorners[Number(id.slice(7))];
 return p[id];
}
function stoneStyle(n,id,scene){
 const o=item(scene,id);if(!n||!o)return;
 // A player's moved floor stone is a gameplay position, not an editor default.
 const dropped=scene==='zoom'&&!state.open?self()?.floorPositions?.[Number(id.slice(6))]:null;
 const valid=dropped&&Number.isFinite(dropped.x)&&Number.isFinite(dropped.y)&&
   Number.isInteger(dropped.rotation)&&dropped.rotation>=0&&dropped.rotation<4;
 n.dataset.layoutAsset=id;
 n.style.left=(valid?dropped.x:o.x)+'%';n.style.top=(valid?dropped.y:o.y)+'%';
 n.style.width=o.w+'%';n.style.height=o.h+'%';n.style.aspectRatio='auto';
 n.style.setProperty('--stone-rot',(valid?dropped.rotation*90:o.r)+'deg');
 n.style.setProperty('--stone-size','1');
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
function waterStyle(n,id,scene){
 const o=item(scene,id);if(!n||!o)return;
 n.dataset.layoutAsset=id;
 n.style.left=(o.x-o.w/2)+'%';n.style.top=(o.y-o.h/2)+'%';
 n.style.width=o.w+'%';n.style.height=o.h+'%';
 // Retain the existing drain state even when the editor updates coordinates.
 const drained=scene==='wide'?
  n.closest('.h-pipes')?.classList.contains(id==='waterLeft'?'drained-gold':'drained-shield'):
  n.closest('.pipes-stage')?.classList.contains(id==='waterLeft'?'drained-left':'drained-right');
 if(drained){n.style.height='0%';n.style.top=(scene==='wide'?72:68)+'%'}
}
function safeStyle(n){
 if(!n)return;
 const o=item('wide','safeMark');if(!o)return;
 n.dataset.layoutAsset='safeMark';
 n.style.left=o.x+'%';n.style.top=o.y+'%';
 n.style.width=o.w+'%';n.style.height=o.h+'%';
}
function applyWide(){
 document.querySelectorAll('#floorTalismans .floor-talisman').forEach(n=>{
  if(n.dataset.layoutAsset)stoneStyle(n,n.dataset.layoutAsset,'wide');
 });
 document.querySelectorAll('.room-wide-stone').forEach((n,i)=>socketStyle(n,'socket-'+(Number(n.dataset.socketIndex)||i),'wide'));
 const p=getHotspot('pipes');
 for(const id of ['gold','shield'])prizeStyle(p?.querySelector('.wide-prize.'+id),id,'wide');
 waterStyle(p?.querySelector('.wide-water.ww-left'),'waterLeft','wide');
 waterStyle(p?.querySelector('.wide-water.ww-right'),'waterRight','wide');
 safeStyle(getHotspot('safe')?.querySelector('.room-identity-seals.on-safe-door'));
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
  waterStyle(document.querySelector('.pipes-stage .pipe-water.left'),'waterLeft','zoom');
  waterStyle(document.querySelector('.pipes-stage .pipe-water.right'),'waterRight','zoom');
 }
}
window.DungeonPlacement={coords:(scene,i)=>{const o=profile(scene).sockets[i];return {x:o.x,y:o.y}},
 frameCorners:()=>layout.wide[device()].frameCorners.map(pt=>[pt.x*214/100,pt.y*563/100]),
 applySafe:()=>safeStyle(getHotspot('safe')?.querySelector('.room-identity-seals.on-safe-door')),
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
'<div class="placement-head"><strong>POSITIONING EDITOR · V8.4 APPROVED</strong><button type="button" id="placementDone">Done</button></div>',
'<div class="placement-selects">',
'<label>Screen<select id="pDevice"><option value="desktop">Desktop</option><option value="mobile">Mobile portrait</option></select></label>',
'<label>Perspective<select id="pScene"><option value="wide">Wide room</option><option value="zoom">Close-up</option></select></label>',
'<label>Position<select id="pArea"><option value="sockets">Wall talismans</option><option value="stones">Loose floor stones</option><option value="safe">Safe room symbol</option><option value="frame">Framed image corners</option><option value="water">Water overlays</option><option value="prizes">Gold and shield</option></select></label>',
'<label>Asset<select id="pAsset"></select></label></div>',
'<div class="placement-fields"><label>X %<input type="number" step=".1" id="pX"></label>',
'<label>Y %<input type="number" step=".1" id="pY"></label>',
'<label>Width %<input type="number" step=".1" id="pW"></label>',
'<label>Height %<input type="number" step=".1" id="pH"></label>',
'<label>Angle °<input type="number" step="1" id="pR"></label></div>',
'<div class="placement-sizing" id="pSizing"><button type="button" id="pSmaller">− Smaller</button><button type="button" id="pLarger">+ Larger</button><button type="button" id="pMatchSize">Match all 12 sizes</button></div>',
'<div class="placement-actions"><button type="button" id="pCopy">Copy JSON</button>',
'<button type="button" id="pImport">Apply pasted JSON</button>',
'<button type="button" id="pReset">Reset this view</button>',
'<button type="button" id="pDownload">Download JSON</button></div>',
'<textarea id="pJSON" rows="5" spellcheck="false" aria-label="Copy or paste all four layouts as JSON"></textarea>',
'<p role="status" id="pStatus">Choose a section, drag the artwork itself, adjust its size above and copy the JSON.</p>'
].join('');
document.body.append(ed);
const $e=id=>document.getElementById(id);
const handles=document.createElement('div');handles.id='placementHandles';handles.className='placement-handles';handles.hidden=true;document.body.append(handles);
function note(msg){$e('pStatus').textContent=msg}
function persist(){try{localStorage.setItem(STORE,JSON.stringify(layout))}catch{note('Storage unavailable. Copy your JSON to keep it.')}}
const ids=()=>{
 if(state.area==='water')return ['waterLeft','waterRight'];
 if(state.area==='prizes')return ['gold','shield'];
 if(state.area==='safe')return ['safeMark'];
 if(state.area==='frame')return Array.from({length:4},(_,i)=>'corner-'+i);
 const prefix=state.area==='stones'?'stone-':'socket-';
 return Array.from({length:12},(_,i)=>prefix+i);
};
function nameFor(id){
 if(id==='gold')return 'Gold bag';if(id==='shield')return 'Shield';
 if(id==='waterLeft')return 'Gold tube water';if(id==='waterRight')return 'Shield tube water';
 if(id==='safeMark')return 'Room talisman on safe';
 if(id.startsWith('corner-'))return ['Top left','Top right','Bottom right','Bottom left'][Number(id.slice(7))]+' corner';
 return (id.startsWith('stone')?'Floor talisman ':'Wall talisman ')+(Number(id.split('-')[1])+1);
}
function syncControls(){
 $e('pDevice').value=state.device;$e('pScene').value=state.scene;$e('pArea').value=state.area;
 const all=ids();if(!all.includes(state.asset))state.asset=all[0];
 const select=$e('pAsset');select.replaceChildren();
 for(const id of all){const o=document.createElement('option');o.value=id;o.textContent=nameFor(id);select.append(o)}
 select.value=state.asset;syncFields();
 $e('pSizing').hidden=!(state.area==='stones'||state.area==='sockets');
 for(const id of ['pW','pH','pR'])$e(id).disabled=state.area==='frame';
}
function syncFields(){
 const o=item(state.scene,state.asset);if(!o)return;
 for(const [name,id] of [['x','pX'],['y','pY'],['w','pW'],['h','pH'],['r','pR']]){
  if(document.activeElement!==$e(id))$e(id).value=o[name]??'';
 }
}
function targetParent(id){
 if(id.startsWith('corner-'))return getHotspot('image');
 if(state.scene==='wide'){
  if(id.startsWith('stone-'))return $('roomStage');
  if(id.startsWith('socket-'))return getHotspot('panel');
   if(id==='safeMark')return getHotspot('safe');
  return getHotspot('pipes');
 }
 if(id.startsWith('stone-'))return document.querySelector('.floor-inspection');
 if(id.startsWith('socket-'))return document.querySelector('.panel-stage');
 return document.querySelector('.pipes-stage');
}
function boundsFor(id){
 const parent=targetParent(id),b=parent?.getBoundingClientRect(),o=item(state.scene,id);
 if(!b?.width||!b?.height||!o)return null;
 if(id.startsWith('corner-'))return {left:b.left+o.x*b.width/100-11,top:b.top+o.y*b.height/100-11,
  width:22,height:22,parent:b};
 return {left:b.left+(o.x-o.w/2)*b.width/100,top:b.top+(o.y-o.h/2)*b.height/100,
  width:o.w*b.width/100,height:o.h*b.height/100,parent:b};
}
function ghost(parent,id,src){
 const image=document.createElement('img');image.className='placement-ghost';image.src=src;image.alt='';
 if(id.startsWith('stone-'))stoneStyle(image,id,state.scene);
 else if(id.startsWith('socket-'))socketStyle(image,id,state.scene);
 else prizeStyle(image,id,state.scene);
 parent.append(image);
}
function refreshGhostPositions(id){
 document.querySelectorAll('.placement-ghost[data-layout-asset="'+id+'"]').forEach(node=>{
  if(id.startsWith('stone-'))stoneStyle(node,id,state.scene);
  else if(id.startsWith('socket-'))socketStyle(node,id,state.scene);
  else prizeStyle(node,id,state.scene);
 });
 if(id==='safeMark')safeStyle(getHotspot('safe')?.querySelector('.room-identity-seals.on-safe-door'));
}
function editorGhosts(){
 document.querySelectorAll('.placement-ghost,.placement-safe-ghost').forEach(n=>n.remove());
 if(!state.open||!game)return;
 const p=self();if(!p)return;
 if(state.area==='stones'){
  const root=state.scene==='wide'?$('floorTalismans'):document.querySelector('.floor-inspection');
  if(!root)return;
  const all=codeFor(library,p).map((c,i)=>({symbol:c.symbol,position:i}));
  for(let i=all.length-1;i>0;i--){const j=(i*7+p.index*5+3)%(i+1);[all[i],all[j]]=[all[j],all[i]]}
  all.forEach((c,i)=>{
   if(!root.querySelector('.floor-talisman[data-layout-asset="stone-'+i+'"]'))
    ghost(root,'stone-'+i,AS+'talismans/'+c.symbol+'_angled.webp');
  });
 }else if(state.area==='sockets'){
  const root=state.scene==='wide'?getHotspot('panel'):document.querySelector('.panel-stage');
  if(!root)return;
  const code=codeFor(library,p);
  for(let i=0;i<12;i++){
   const occupied=state.scene==='wide'?
    root.querySelector('.room-wide-stone[data-socket-index="'+i+'"]'):
    root.querySelector('.panel-socket[data-socket="'+i+'"] img');
   if(!occupied){
    ghost(root,'socket-'+i,AS+'talismans/'+(code[i]?.symbol||'raven')+'_front.webp');
   }
  }
 }else if(state.area==='safe'){
  const root=getHotspot('safe');if(!root)return;
  let mark=root.querySelector('.room-identity-seals.on-safe-door:not(.placement-safe-ghost)');
  if(!mark){
   const identity=window.DungeonRoomIdentity?.(p)||{symbol:'raven',count:1};
   mark=document.createElement('span');
   mark.className='room-identity-seals on-safe-door placement-safe-ghost count-'+identity.count;
   mark.setAttribute('aria-hidden','true');
   for(let i=0;i<identity.count;i++){
    const img=document.createElement('img');img.src=AS+'talismans/'+identity.symbol+'_front.webp';img.alt='';
    mark.append(img);
   }
   root.append(mark);
  }
  safeStyle(mark);
 }else if(state.area==='prizes'){
  const root=state.scene==='wide'?getHotspot('pipes'):document.querySelector('.pipes-stage');
  if(!root)return;
  for(const id of ['gold','shield']){
   const selector=state.scene==='wide'?'.wide-prize.'+id:'.pipe-prize.'+(id==='gold'?'left':'right');
   const source=root.querySelector(selector);
   if(!source||source.hidden)ghost(root,id,AS+'rewards/'+(id==='gold'?'gold_sack.webp':'brm-original-shield.svg'));
  }
 }
}
let frameRefreshTimer=0;
function scheduleFrameRefresh(immediate=false){
 clearTimeout(frameRefreshTimer);
 frameRefreshTimer=setTimeout(()=>window.DungeonWideFrameRefresh?.(),immediate?0:65);
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
  label.textContent=id.startsWith('stone-')?'T'+(Number(id.slice(6))+1):id.startsWith('socket-')?'H'+(Number(id.slice(7))+1):id==='gold'?'£':id==='shield'?'S':id==='waterLeft'?'W£':'WS';
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
 const kind=state.scene==='wide'?null:((state.area==='water'||state.area==='prizes')?'pipes':'talismans');
 if(kind&&view!==kind)setView(kind);
 else if(!kind&&view)closeView();
 applyWide();applyZoom();requestAnimationFrame(refreshHandles);
}
function toggle(open){
 if(open&&!game){notify('Start the local dungeon test first.');return}
 state.open=open;ed.hidden=!open;handles.hidden=!open;document.body.classList.toggle('placement-editing',open);
 if(open){
  state.device=mobile()?'mobile':'desktop';state.scene='wide';state.area='sockets';state.asset='socket-0';
  syncControls();$e('pJSON').value=JSON.stringify(layout,null,2);
 }else{
  if(view)closeView();document.querySelectorAll('.placement-ghost').forEach(n=>n.remove());
  document.body.classList.remove('layout-preview-mobile','layout-preview-desktop');showMobileLayout();persist();
 }
 preview();
}
function selectContext(){
 state.device=$e('pDevice').value;state.scene=$e('pScene').value;state.area=$e('pArea').value;
 if(state.scene==='zoom'&&(state.area==='safe'||state.area==='frame')){
  state.scene='wide';$e('pScene').value='wide';
 }
 state.asset=ids()[0];syncControls();preview();
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
 layout[state.scene][state.device]=defaults()[state.scene][state.device];
 persist();preview();note('Only the selected screen was reset.');
});
$e('pDownload').addEventListener('click',()=>{
 const u=URL.createObjectURL(new Blob([JSON.stringify(layout,null,2)],{type:'application/json'}));
 const a=document.createElement('a');a.href=u;a.download='dungeon_escape_asset_positions_v8_4.json';
 document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),600);
});
$('viewContent').addEventListener('click',e=>{if(state.open){e.preventDefault();e.stopImmediatePropagation()}},true);
window.addEventListener('resize',()=>{if(state.open)requestAnimationFrame(refreshHandles);else{applyWide();applyZoom()}});
window.addEventListener('scroll',()=>{if(state.open)requestAnimationFrame(refreshHandles)},{passive:true});
if(game){applyWide();if(view)applyZoom()}
})();
