(() => {
  'use strict';

  const BOT_PALETTE=[
    '#2f80ed','#e05263','#36a269','#8d6bd1','#ef8d32',
    '#20a7a0','#d05ca8','#66788a','#55a9e8','#a05b42','#d94d9a'
  ];
  const YOU_COLOUR='#f7bd18';
  const lanes=document.getElementById('raceLanes');
  const raceScreen=document.getElementById('raceScreen');
  if(!lanes||!raceScreen)return;

  const VIEW_W=600;
  const VIEW_H=360;
  const CIRCUIT_D='M 108 278 C 62 278 43 242 58 203 C 72 166 109 148 149 160 C 192 173 190 219 231 226 C 271 233 297 208 310 168 C 324 127 361 102 407 109 C 458 117 511 149 528 188 C 546 229 522 270 476 278 L 108 278 Z';

  const motion=new Map();
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));

  const hash=value=>{
    let h=0;
    const s=String(value||'');
    for(let i=0;i<s.length;i++)h=((h<<5)-h+s.charCodeAt(i))|0;
    return Math.abs(h);
  };

  const totalLaps=()=>{
    const text=document.getElementById('lapText')?.textContent||'';
    const match=text.match(/\/\s*(\d+)/);
    return Math.max(1,Number(match?.[1])||1);
  };

  const progressFromDot=dot=>{
    const raw=dot?.style?.left||'';
    const match=raw.match(/calc\(([\d.]+)%/);
    if(match)return clamp(Number(match[1])/0.96,0,100);
    const pct=raw.match(/([\d.]+)%/);
    return pct?clamp(Number(pct[1]),0,100):0;
  };

  function ensureCircuit(){
    let svg=lanes.querySelector('.trackSvg');
    if(svg)return svg;

    const ns='http://www.w3.org/2000/svg';
    svg=document.createElementNS(ns,'svg');
    svg.setAttribute('class','trackSvg');
    svg.setAttribute('viewBox',`0 0 ${VIEW_W} ${VIEW_H}`);
    svg.setAttribute('preserveAspectRatio','none');
    svg.setAttribute('aria-hidden','true');

    let checks='';
    const size=7;
    for(let row=0;row<9;row++){
      for(let col=0;col<2;col++){
        checks+=`<rect x="${414+col*size}" y="${247+row*size}" width="${size}" height="${size}" fill="${(row+col)%2?'#111':'#fff'}"/>`;
      }
    }

    svg.innerHTML=`
      <defs>
        <filter id="trackShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#17351f" flood-opacity=".26"/>
        </filter>
      </defs>
      <rect width="${VIEW_W}" height="${VIEW_H}" rx="14" fill="#69b450"/>
      <path d="${CIRCUIT_D}" fill="none" stroke="#dfc79c" stroke-width="78" stroke-linecap="round" stroke-linejoin="round" filter="url(#trackShadow)"/>
      <path d="${CIRCUIT_D}" fill="none" stroke="#f1f1f1" stroke-width="68" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="10 10"/>
      <path d="${CIRCUIT_D}" fill="none" stroke="#d94b45" stroke-width="65" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="10 10"/>
      <path d="${CIRCUIT_D}" fill="none" stroke="#666c72" stroke-width="56" stroke-linecap="round" stroke-linejoin="round"/>
      <path id="gridlineCircuitPath" d="${CIRCUIT_D}" fill="none" stroke="#d9dde1" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="10 10" opacity=".92"/>
      <g id="startFinish">
        <rect x="410" y="243" width="22" height="69" rx="2" fill="#fff" opacity=".94"/>
        ${checks}
        <rect x="410" y="243" width="22" height="69" rx="2" fill="none" stroke="#111" stroke-width="2"/>
        <rect x="374" y="221" width="94" height="18" rx="9" fill="#0d1a31" opacity=".95"/>
        <text x="421" y="233" text-anchor="middle" fill="#fff" font-size="10" font-family="Arial, sans-serif" font-weight="700">START / FINISH</text>
      </g>
    `;

    lanes.prepend(svg);
    return svg;
  }

  function updateMode(){
    document.body.classList.toggle('gridline-racing-live',!raceScreen.classList.contains('hidden'));
  }

  function launchSpeed(elapsedMs){
    if(elapsedMs<1200)return .055+(elapsedMs/1200)*.095;
    if(elapsedMs<3000)return .15+((elapsedMs-1200)/1800)*.12;
    return .38;
  }

  function syncMotion(rows,laps,now){
    const seen=new Set();

    rows.forEach((row,index)=>{
      const dot=row.querySelector('.carDot');
      const totalProgress=progressFromDot(dot);
      const name=row.querySelector('.name')?.textContent?.trim()||`Racer ${index+1}`;
      const key=name;
      const target=(totalProgress/100)*laps;
      seen.add(key);

      let state=motion.get(key);
      if(!state){
        state={
          displayed:target,
          target,
          lastTarget:target,
          launchAt:now,
          lastFrame:now,
          lastSeen:now,
          lateral:0,
          targetLateral:0,
          visualShift:0,
          targetVisualShift:0
        };
        motion.set(key,state);
      }else{
        const newRace=target+.35<state.lastTarget;
        if(newRace){
          state.displayed=target;
          state.launchAt=now;
          state.lastFrame=now;
          state.visualShift=0;
          state.targetVisualShift=0;
        }
        state.target=target;
        state.lastTarget=target;
        state.lastSeen=now;
      }

      state.row=row;
      state.name=name;
      state.rank=String(index+1);
      state.isYou=row.classList.contains('you');
      state.laps=laps;
    });

    for(const [key,state] of motion){
      if(!seen.has(key)&&now-state.lastSeen>1500)motion.delete(key);
    }
  }

  function assignUniqueColours(states){
    const others=states.filter(s=>!s.isYou).sort((a,b)=>a.name.localeCompare(b.name));
    for(const state of states){
      if(state.isYou)state.colour=YOU_COLOUR;
    }
    others.forEach((state,index)=>{
      state.colour=BOT_PALETTE[index % BOT_PALETTE.length];
    });
  }

  function advanceMotion(state,now){
    const dt=clamp((now-state.lastFrame)/1000,0,.05);
    state.lastFrame=now;
    if(state.displayed>=state.target)return;

    const age=Math.max(0,now-state.launchAt);
    const maxSpeed=launchSpeed(age);
    const gap=state.target-state.displayed;
    const catchup=gap>.45?Math.min(.18,(gap-.45)*.16):0;
    const step=(maxSpeed+catchup)*dt;
    state.displayed=Math.min(state.target,state.displayed+step);
  }

  function prepareVisualPacking(states){
    const phased=states
      .map(state=>({state,phase:((state.displayed%1)+1)%1}))
      .sort((a,b)=>a.phase-b.phase);

    for(const {state} of phased){
      state.targetLateral=((hash(state.name)%3)-1)*2.4;
      state.targetVisualShift=0;
      state.contact=false;
    }

    const groups=[];
    let current=[];
    for(const item of phased){
      if(!current.length){
        current=[item];
        continue;
      }
      const prev=current[current.length-1];
      if(item.phase-prev.phase<.014){
        current.push(item);
      }else{
        groups.push(current);
        current=[item];
      }
    }
    if(current.length)groups.push(current);

    if(groups.length>1){
      const first=groups[0],last=groups[groups.length-1];
      const wrapGap=(first[0].phase+1)-last[last.length-1].phase;
      if(wrapGap<.014){
        groups[0]=last.concat(first);
        groups.pop();
      }
    }

    const laneSlots=[0,-7,7,-13,13];

    for(const group of groups){
      if(group.length<2)continue;
      group.sort((a,b)=>b.state.displayed-a.state.displayed);

      group.forEach((item,index)=>{
        const row=Math.floor(index/laneSlots.length);
        item.state.targetLateral=laneSlots[index%laneSlots.length];
        item.state.targetVisualShift=-row*.010;
        item.state.contact=true;
      });
    }

    for(const state of states){
      state.targetLateral=clamp(state.targetLateral,-13,13);
      state.lateral+=(state.targetLateral-state.lateral)*.2;
      state.visualShift+=(state.targetVisualShift-state.visualShift)*.18;
    }
  }

  function svgPointToLanePixels(svg,x,y){
    const matrix=svg.getScreenCTM?.();
    if(!matrix||typeof svg.createSVGPoint!=='function')return null;
    const p=svg.createSVGPoint();
    p.x=x;
    p.y=y;
    const screen=p.matrixTransform(matrix);
    const rect=lanes.getBoundingClientRect();
    return{x:screen.x-rect.left,y:screen.y-rect.top};
  }

  function drawRacer(state,svg,path,length){
    const row=state.row;
    if(!row?.isConnected)return;

    const travelled=Math.max(0,state.displayed+state.visualShift);
    let lapProgress=travelled%1;
    if(state.target>=state.laps&&travelled>=state.laps-.002)lapProgress=.998;

    const pathDistance=clamp(length*lapProgress,0,Math.max(0,length-.1));
    const point=path.getPointAtLength(pathDistance);
    const tangentDistance=Math.min(length-.1,pathDistance+3);
    const tangentPoint=path.getPointAtLength(tangentDistance);

    let dx=tangentPoint.x-point.x;
    let dy=tangentPoint.y-point.y;
    const mag=Math.hypot(dx,dy)||1;
    dx/=mag;
    dy/=mag;

    const lateral=Number.isFinite(state.lateral)?state.lateral:0;
    const svgX=point.x+(-dy*lateral);
    const svgY=point.y+(dx*lateral);
    const rendered=svgPointToLanePixels(svg,svgX,svgY);
    if(!rendered)return;

    row.style.transition='none';
    row.style.setProperty('--track-x',`${rendered.x}px`);
    row.style.setProperty('--track-y',`${rendered.y}px`);
    row.style.setProperty('--racer-colour',state.colour||'#2f80ed');
    row.classList.toggle('contacting',!!state.contact);
    row.setAttribute('aria-label',`${state.name}, position ${state.rank}`);
    row.title=state.isYou?`YOU · ${state.name}`:`${state.rank}. ${state.name}`;
  }

  function animate(now){
    updateMode();

    if(!raceScreen.classList.contains('hidden')){
      const svg=ensureCircuit();
      const path=svg.querySelector('#gridlineCircuitPath');

      if(path&&typeof path.getTotalLength==='function'){
        const rows=Array.from(lanes.querySelectorAll('.raceLane'));
        const laps=totalLaps();

        syncMotion(rows,laps,now);

        const states=Array.from(motion.values()).filter(state=>state.row?.isConnected);
        assignUniqueColours(states);

        for(const state of states)advanceMotion(state,now);
        prepareVisualPacking(states);

        const length=path.getTotalLength();
        for(const state of states)drawRacer(state,svg,path,length);
      }
    }

    requestAnimationFrame(animate);
  }

  const screenObserver=new MutationObserver(()=>{
    updateMode();
    if(raceScreen.classList.contains('hidden'))motion.clear();
  });
  screenObserver.observe(raceScreen,{attributes:true,attributeFilter:['class']});

  window.addEventListener('resize',()=>{
    for(const state of motion.values())state.lastFrame=performance.now();
  },{passive:true});

  requestAnimationFrame(animate);
})();
