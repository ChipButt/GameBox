/* Dungeon Escape V8.20 — choose a valve, turn it, drain the prize, then claim.
   No prize or gold is awarded until the final, central revealed object is tapped.
   Close-up only: existing wide-room composition and saved geometry are preserved. */
(()=>{
'use strict';
const DRAIN_MS=3200;
const TWO={gold:{x:32.8,y:82.6,w:10,h:7.5},
           shield:{x:62.7,y:82.6,w:10,h:7.5}};
let picked=null,owner=null;
function pointFor(choice){
 const approved=window.DungeonPlacement?.pipePoints?.();
 const v=approved?.[choice]||TWO[choice];
 return v||TWO.gold;
}
function choiceKey(p){return String(game?.id||'')+':'+p.id}
function current(p){return self()?.id===p.id&&game?.players.includes(p)}
function make(tag,cls,parent){
 const e=document.createElement(tag);e.className=cls;
 if(parent)parent.append(e);
 return e;
}
function srcFor(prize){return AS+'rewards/'+(prize==='gold'?'gold_sack.webp':'brm-original-shield.svg')}
function setGeometry(stage){
 for(const choice of ['gold','shield']){
  const p=pointFor(choice), id=choice==='gold'?'valveGold':'valveShield';
  const node=stage.querySelector('.pipe-attachment-point.'+choice);
  if(node){
   node.dataset.layoutAsset=id;
   node.style.left=p.x+'%';node.style.top=p.y+'%';
   node.style.width=p.w+'%';node.style.height=p.h+'%';
  }
 }
 const wheel=stage.querySelector('.pipe-wheel');
 if(!wheel)return;
 const selected=wheel.dataset.choice;
 if(selected==='gold'||selected==='shield'){
  const p=pointFor(selected);
  wheel.style.left=p.x+'%';wheel.style.top=p.y+'%';
  wheel.style.width=(p.w*1.8)+'%';wheel.style.height=(p.h*1.8)+'%';
 }else{
  wheel.style.left='8%';wheel.style.top='83%';
  wheel.style.width='18%';wheel.style.height='13.5%';
 }
}
window.DungeonWheelUI={apply:setGeometry};
function reveal(p,scene){
 const reward=p.pendingReward,win=make('div','pipe-prize-reveal',scene);
 win.setAttribute('role','group');
 win.setAttribute('aria-label',reward==='gold'?'Gold for the team pot is ready to claim':'Personal shield is ready to claim');
 const btn=make('button','pipe-prize-claim',win);btn.type='button';
 btn.setAttribute('aria-label',reward==='gold'?'Claim gold for the team pot':'Claim your shield');
 const glow=make('span','pipe-reveal-light',btn);glow.setAttribute('aria-hidden','true');
 const img=make('img','pipe-revealed-art',btn);img.src=srcFor(reward);img.alt='';
 const label=make('span','pipe-claim-caption',btn);
 label.textContent=reward==='gold'?'Tap to claim gold for the pot':'Tap to claim your shield';
 btn.addEventListener('click',event=>{
  event.preventDefault();event.stopPropagation();
  if(!current(p)||p.reward||p.pendingReward!==reward||p.prizeReady!==true)return;
  const result=perform(()=>claimPrize(game,p.id,reward));
  if(!result)return;
  picked=null;owner=null;
  closeView();
  render();
  notify(reward==='gold'?money(game.goldEach)+' added to the team pot.':'Personal shield claimed.');
 });
}
function animateDrain(stage,p){
 if(!stage.isConnected||!current(p)||p.prizeReady||p.reward||!p.pendingReward)return;
 if(stage.dataset.draining==='true')return;
 stage.dataset.draining='true';
 const choice=p.pendingReward,side=choice==='gold'?'left':'right';
 const water=stage.querySelector('.pipe-water.'+side);
 const prize=stage.querySelector('.pipe-prize.'+side);
 const wheel=stage.querySelector('.pipe-wheel');
 if(!water||!wheel)return;
 const box=stage.getBoundingClientRect();
 const surface=water.getBoundingClientRect(),float=prize?.getBoundingClientRect();
 const firstTop=surface.top-box.top,firstHeight=surface.height;
 const waterBottom=firstTop+firstHeight;
 const floatStart=float?float.top-box.top:null;
 const floatFinal=float?waterBottom-float.height/2:null;
 stage.classList.add('drain-preparing');
 water.style.top=firstTop+'px';water.style.height=firstHeight+'px';
 if(prize&&floatStart!==null)prize.style.top=floatStart+'px';
 // Force the browser to capture initial coordinates before transitions begin.
 void water.offsetHeight;
 wheel.classList.add('turning');
 stage.classList.add('drain-motion');
 requestAnimationFrame(()=>{
  if(!stage.isConnected||!current(p))return;
  water.style.top=waterBottom+'px';water.style.height='0px';
  if(prize&&floatFinal!==null){
   prize.style.top=floatFinal+'px';prize.style.opacity='0';
  }
 });
 let finished=false;
 const finish=()=>{
  if(finished)return;
  if(!stage.isConnected||view!=='pipes'||!current(p)||p.reward)return;
  if(p.pendingReward!==choice||p.prizeReady)return;
  finished=true;
  try{finishValveDrain(game,p.id);save();render();drawPipes(p)}
  catch(error){notify(error.message)}
 };
 water.addEventListener('transitionend',event=>{
  if(event.propertyName==='height')finish();
 });
 // Reduced-motion mode and interrupted transition safety; no reward is
 // silently awarded, only the claim screen becomes accessible.
 setTimeout(finish,DRAIN_MS+380);
}
function confirmChoice(p,choice,scene){
 if(!current(p)||p.pendingReward||p.reward)return;
 const layer=make('div','pipe-choice-layer',scene);
 layer.setAttribute('role','dialog');layer.setAttribute('aria-modal','true');
 layer.setAttribute('aria-label','Confirm valve selection');
 layer.addEventListener('click',event=>event.stopPropagation());
 const box=make('div','pipe-choice-box',layer);
 const heading=make('h3','',box);heading.textContent='ARE YOU SURE?';
 const question=make('p','',box);
 question.textContent=choice==='gold'?
  'Release the water and claim the gold for the team pot?':
  'Release the water and claim the shield to save yourself?';
 const actions=make('div','pipe-choice-actions',box);
 const yes=make('button','pipe-choice-yes',actions);yes.type='button';yes.textContent='Yes — turn the valve';
 const no=make('button','pipe-choice-no',actions);no.type='button';no.textContent='Not yet';
 const dismiss=()=>{layer.remove();};
 no.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();dismiss()});
 yes.addEventListener('click',event=>{
  event.preventDefault();event.stopPropagation();
  if(!current(p)||p.reward||p.pendingReward)return;
  try{commitValveChoice(game,p.id,choice);save();dismiss();drawPipes(p)}
  catch(error){notify(error.message)}
 });
 no.focus?.({preventScroll:true});
}
drawPipes=function(p){
 if(!p)return;
 const key=choiceKey(p);
 if(owner!==key){owner=key;picked=null}
 if(p.pendingReward)picked=p.pendingReward;
 const canChoose=!!p.wheelCollected&&!p.reward&&!p.pendingReward;
 const settled=!!p.prizeReady&&!!p.pendingReward&&!p.reward;
 const spent=!!p.reward||!!p.pendingReward;
 const selected=p.pendingReward||picked;
 const side=selected==='gold'?'left':'right';
 const scene=make('div','closeup-pipes-scene');
 const stage=make('div','art-stage pipes-stage',scene);
 stage.setAttribute('aria-label','Twin bronze prize pipes with golden valve attachment points');
 if(settled||p.reward){
  const empty=p.pendingReward||p.reward;
  stage.classList.add(empty==='gold'?'drained-left':'drained-right');
 }
 for(const color of ['left','right'])make('div','pipe-water '+color+(color===side&&spent?' chosen':''),stage);
 for(const choice of ['gold','shield']){
  const sideClass=choice==='gold'?'left':'right';
  if(p.reward===choice||((settled||p.reward)&&p.pendingReward===choice))continue;
  const img=make('img','pipe-prize '+sideClass+(choice===selected&&spent?' chosen':''),stage);
  img.src=srcFor(choice);img.alt=choice==='gold'?'Gold sack in the left tube':'Protective shield in the right tube';
  img.draggable=false;
 }
 const structure=make('img','pipe-structure',stage);
 structure.src=AS+'closeups/pipes.webp';structure.alt='Twin copper and glass water chambers';
 structure.draggable=false;
 for(const choice of ['gold','shield']){
  const point=pointFor(choice);
  const dot=make('button','pipe-attachment-point '+choice,stage);dot.type='button';
  dot.dataset.choice=choice;
  dot.setAttribute('aria-label',choice==='gold'?'Fit wheel to the gold valve socket':'Fit wheel to the shield valve socket');
  dot.disabled=!canChoose;
  dot.classList.toggle('available',canChoose);
  dot.classList.toggle('chosen',selected===choice);
  dot.style.left=point.x+'%';dot.style.top=point.y+'%';
  dot.style.width=point.w+'%';dot.style.height=point.h+'%';
  dot.addEventListener('click',event=>{
   event.preventDefault();event.stopPropagation();
   if(document.body.classList.contains('placement-editing'))return;
   if(!current(p)||!canChoose)return;
   picked=choice;
   // Move the actual wheel without rebuilding or resetting the water.
   stage.querySelectorAll('.pipe-attachment-point').forEach(node=>{
    node.classList.toggle('chosen',node.dataset.choice===choice);
   });
   const wheel=stage.querySelector('.pipe-wheel');
   if(wheel){wheel.dataset.choice=choice;setGeometry(stage);wheel.setAttribute('aria-label','Turn the wheel on the '+choice+' valve');}
  });
 }
 if(p.wheelCollected&&!p.reward){
  const wheel=make('button','pipe-wheel',stage);wheel.type='button';
  wheel.disabled=!!p.pendingReward;
  wheel.dataset.choice=selected||'';
  wheel.setAttribute('aria-label',selected?'Turn the selected valve wheel':'Select a glowing valve socket');
  const img=make('img','pipe-wheel-art',wheel);
  img.src=AS+'rewards/wheel_intact.webp';img.alt='';img.draggable=false;
  wheel.addEventListener('click',event=>{
   event.preventDefault();event.stopPropagation();
   if(document.body.classList.contains('placement-editing'))return;
   if(!current(p)||!canChoose)return;
   if(!picked){notify('Choose one of the glowing gold valve sockets.');return}
   confirmChoice(p,picked,scene);
  });
 }
 if((settled||p.reward)&&spent){
  const broken=make('img','pipe-wheel-spent',stage);
  broken.src=AS+'rewards/wheel_broken.webp';broken.alt='';broken.draggable=false;
  broken.dataset.choice=p.pendingReward||p.reward;
 }
 $('viewContent').replaceChildren(scene);
 setGeometry(stage);
 const broken=stage.querySelector('.pipe-wheel-spent');
 if(broken){
  const point=pointFor(p.pendingReward||p.reward);
  broken.style.left=point.x+'%';broken.style.top=point.y+'%';
  broken.style.width=point.w*1.8+'%';broken.style.height=point.h*1.8+'%';
 }
 if(settled)reveal(p,scene);
 else if(p.pendingReward&&!p.reward)requestAnimationFrame(()=>animateDrain(stage,p));
};
})();