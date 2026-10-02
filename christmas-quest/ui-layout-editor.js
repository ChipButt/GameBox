(() => {
'use strict';
const DESIGN_W=390,DESIGN_H=844;
const defaults=JSON.parse(JSON.stringify(window.ADVENT_UI_LAYOUT));
let layout=JSON.parse(JSON.stringify(defaults));
let selected='frame',gesture=null;

const $=id=>document.getElementById(id);
const stage=$('stage'),holder=$('stageHolder'),codeOut=$('codeOut');
const fields={x:$('xField'),y:$('yField'),w:$('wField'),h:$('hField')};
const elements=Object.fromEntries([...document.querySelectorAll('.editable')].map(el=>[el.dataset.key,el]));
const names={frame:'CHRISTMAS FRAME',screen:'PLAY AREA',up:'UP BUTTON',left:'LEFT BUTTON',right:'RIGHT BUTTON',down:'DOWN BUTTON',action:'A BUTTON'};

function round4(n){return Math.round(Number(n)*10000)/10000}
function snap(n){return $('snapPixels').checked?Math.round(n):round4(n)}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function fitStage(){
  const mobile=innerWidth<=760;
  const maxW=Math.max(240,Math.min(640,(document.querySelector('.previewPane')?.clientWidth||innerWidth)-8));
  const maxH=mobile?Infinity:Math.max(360,(visualViewport?.height||innerHeight)-110);
  const scale=Math.min(1,maxW/DESIGN_W,maxH/DESIGN_H);
  stage.style.transform='scale('+scale+')';
  holder.style.width=(DESIGN_W*scale)+'px';
  holder.style.height=(DESIGN_H*scale)+'px';
}
function applyBox(key){
  const box=layout[key],el=elements[key];if(!box||!el)return;
  el.style.left=box.x+'px';el.style.top=box.y+'px';el.style.width=box.w+'px';el.style.height=box.h+'px';
  const canvas=el.querySelector('canvas');
  if(canvas)canvas.style.transform='rotate('+(box.rotation||0)+'deg)';
}
function applyAll(){Object.keys(elements).forEach(applyBox);refreshInspector();updateCode()}
function select(key){
  selected=key;
  Object.entries(elements).forEach(([k,el])=>el.classList.toggle('selected',k===key));
  refreshInspector();
}
function refreshInspector(){
  const b=layout[selected];if(!b)return;
  $('selectedName').textContent=names[selected]||selected.toUpperCase();
  fields.x.value=round4(b.x);fields.y.value=round4(b.y);fields.w.value=round4(b.w);fields.h.value=round4(b.h);
  $('lockRatio').checked=b.lockRatio!==false;
}
function setSelectedFromFields(changed){
  const b=layout[selected],old={...b};
  const val=Number(fields[changed].value);if(!Number.isFinite(val))return;
  if(changed==='x')b.x=snap(val);
  if(changed==='y')b.y=snap(val);
  if(changed==='w'){
    b.w=Math.max(1,snap(val));
    if($('lockRatio').checked){const ratio=old.w/old.h;b.h=snap(b.w/ratio)}
  }
  if(changed==='h'){
    b.h=Math.max(1,snap(val));
    if($('lockRatio').checked){const ratio=old.w/old.h;b.w=snap(b.h*ratio)}
  }
  b.x=clamp(b.x,-b.w+4,DESIGN_W-4);b.y=clamp(b.y,-b.h+4,DESIGN_H-4);
  applyBox(selected);refreshInspector();updateCode();
}
function codeObject(){
  const o={version:1,canvas:{w:DESIGN_W,h:DESIGN_H}};
  for(const key of ['frame','screen','up','left','right','down','action']){
    const b=layout[key],v={x:round4(b.x),y:round4(b.y),w:round4(b.w),h:round4(b.h)};
    if('rotation' in b)v.rotation=b.rotation;
    v.lockRatio=b.lockRatio!==false;
    o[key]=v;
  }
  return o;
}
function updateCode(){
  const o=codeObject();
  codeOut.value='window.ADVENT_UI_LAYOUT='+JSON.stringify(o,null,2)+';';
}
function localPoint(e){
  const r=stage.getBoundingClientRect();
  return{x:(e.clientX-r.left)*DESIGN_W/r.width,y:(e.clientY-r.top)*DESIGN_H/r.height};
}
function beginGesture(e,key,resize){
  if(e.button!==undefined&&e.button!==0)return;
  select(key);
  const p=localPoint(e),b=layout[key];
  gesture={id:e.pointerId,key,resize,startP:p,start:{...b},ratio:b.w/b.h};
  elements[key].setPointerCapture?.(e.pointerId);
  e.preventDefault();
}
function moveGesture(e){
  if(!gesture||e.pointerId!==gesture.id)return;
  const p=localPoint(e),dx=p.x-gesture.startP.x,dy=p.y-gesture.startP.y,b=layout[gesture.key],s=gesture.start;
  if(gesture.resize){
    let w=Math.max(8,s.w+dx),h=Math.max(8,s.h+dy);
    if($('lockRatio').checked){
      const rx=Math.abs(dx)/(Math.max(1,s.w)),ry=Math.abs(dy)/(Math.max(1,s.h));
      if(rx>=ry)h=w/gesture.ratio;else w=h*gesture.ratio;
    }
    w=Math.min(w,DESIGN_W-s.x);h=Math.min(h,DESIGN_H-s.y);
    if($('lockRatio').checked){
      if(w/h>gesture.ratio)w=h*gesture.ratio;else h=w/gesture.ratio;
    }
    b.w=Math.max(8,snap(w));b.h=Math.max(8,snap(h));
  }else{
    b.x=snap(clamp(s.x+dx,-b.w+4,DESIGN_W-4));
    b.y=snap(clamp(s.y+dy,-b.h+4,DESIGN_H-4));
  }
  applyBox(gesture.key);refreshInspector();updateCode();e.preventDefault();
}
function endGesture(e){if(!gesture||e.pointerId!==gesture.id)return;gesture=null;e.preventDefault()}

Object.entries(elements).forEach(([key,el])=>{
  el.addEventListener('pointerdown',e=>beginGesture(e,key,e.target.classList.contains('resizeHandle')));
  el.addEventListener('pointermove',moveGesture);
  el.addEventListener('pointerup',endGesture);
  el.addEventListener('pointercancel',endGesture);
});
Object.keys(fields).forEach(k=>fields[k].addEventListener('change',()=>setSelectedFromFields(k)));
$('lockRatio').addEventListener('change',()=>{layout[selected].lockRatio=$('lockRatio').checked;updateCode()});
$('snapPixels').addEventListener('change',()=>{});
document.querySelectorAll('[data-nudge]').forEach(btn=>btn.addEventListener('click',()=>{
  const [dx,dy]=btn.dataset.nudge.split(',').map(Number),b=layout[selected],step=$('snapPixels').checked?1:.25;
  b.x=snap(clamp(b.x+dx*step,-b.w+4,DESIGN_W-4));b.y=snap(clamp(b.y+dy*step,-b.h+4,DESIGN_H-4));
  applyBox(selected);refreshInspector();updateCode();
}));
$('resetSelected').addEventListener('click',()=>{layout[selected]=JSON.parse(JSON.stringify(defaults[selected]));applyBox(selected);refreshInspector();updateCode()});
$('resetAll').addEventListener('click',()=>{layout=JSON.parse(JSON.stringify(defaults));applyAll();select('frame')});
$('copyCode').addEventListener('click',async()=>{
  updateCode();
  try{await navigator.clipboard.writeText(codeOut.value);$('copyCode').textContent='COPIED';setTimeout(()=>$('copyCode').textContent='COPY LAYOUT CODE',1200)}
  catch(_){codeOut.focus();codeOut.select();document.execCommand('copy')}
});

addEventListener('resize',fitStage,{passive:true});
visualViewport?.addEventListener('resize',fitStage,{passive:true});

Promise.resolve(window.AdventPixelUI?.ready).then(()=>{
  if(!window.AdventPixelUI)return;
  AdventPixelUI.drawFrame($('frameCanvas'));
  document.querySelectorAll('.controlItem canvas').forEach(cv=>AdventPixelUI.drawArrow(cv));
  AdventPixelUI.drawAction(document.querySelector('.actionItem canvas'));
}).catch(console.error);

fitStage();applyAll();select('frame');
})();