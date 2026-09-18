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
  const UPDATE_MS=300;
  const motion=new Map();

  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
  const smoothstep=t=>t*t*(3-2*t);

  const totalLaps=()=>{
    const text=document.getElementById('lapText')?.textContent||'';
    const match=text.match(/\/\s*(\d+)/);
    return Math.max(1,Number(match?.[1])||1);
  };

  const progressFromRow=row=>{
    const value=Number(row?.dataset?.progress);
    return Number.isFinite(value)?clamp(value,0,100):0;
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
        <rect x="374" y="221" width="94" height="18" rx="9" fill="#0d1a31" opacity=".96"/>
        <text x="421" y="233" text-anchor="middle" fill="#fff" font-size="10" font-family="Arial, sans-serif" font-weight="700">START / FINISH</text>
      </g>
    `;

    lanes.prepend(svg);
    return svg;
  }

  function updateMode(){
    document.body.classList.toggle('gridline-racing-live',!raceScreen.classList.contains('hidden'));
  }

  function sampledPosition(state,now){
    if(!Number.isFinite(state.segmentStart)||state.segmentDuration<=0)return state.to;
    const t=clamp((now-state.segmentStart)/state.segmentDuration,0,1);
    return state.from+(state.to-state.from)*smoothstep(t);
  }

  function syncMotion(rows,laps,now){
    const seen=new Set();

    rows.forEach((row,index)=>{
      const name=row.querySelector('.name')?.textContent?.trim()||`Racer ${index+1}`;
      const key=row.dataset.racerId||name;
      const target=(progressFromRow(row)/100)*laps;
      seen.add(key);

      let state=motion.get(key);
      if(!state){
        state={
          displayed:target,
          from:target,
          to:target,
          segmentStart:now,
          segmentDuration:UPDATE_MS+55,
          lastSeen:now,
          lateral:0,
          targetLateral:0,
          visualShift:0,
          targetVisualShift:0
        };
        motion.set(key,state);
      }else{
        const current=sampledPosition(state,now);
        const newRace=target+.35<state.to;
        if(newRace){
          state.displayed=target;
          state.from=target;
          state.to=target;
          state.segmentStart=now;
          state.visualShift=0;
          state.targetVisualShift=0;
        }else if(Math.abs(target-state.to)>.00001){
          state.displayed=current;
          state.from=current;
          state.to=target;
          state.segmentStart=now;
          state.segmentDuration=UPDATE_MS+55;
        }else{
          state.displayed=current;
        }
        state.lastSeen=now;
      }

      state.row=row;
      state.name=name;
      state.rank=String(index+1);
      state.isYou=row.classList.contains('you');
      state.laps=laps;
    });

    for(const [key,state] of motion){
      if(!seen.has(key)&&now-state.lastSeen>1200)motion.delete(key);
    }
  }

  function assignUniqueColours(states){
    const others=states.filter(state=>!state.isYou).sort((a,b)=>a.name.localeCompare(b.name));
    for(const state of states)if(state.isYou)state.colour=YOU_COLOUR;
    others.forEach((state,index)=>{state.colour=BOT_PALETTE[index]||BOT_PALETTE[index%BOT_PALETTE.length]});
  }

  function advanceMotion(state,now){
    state.displayed=sampledPosition(state,now);
  }

  function prepareVisualPacking(states){
    const phased=states
      .map(state=>({state,phase:((state.displayed%1)+1)%1}))
      .sort((a,b)=>a.phase-b.phase);

    for(const {state} of phased){
      state.targetLateral=0;
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
      if(item.phase-prev.phase<.011){
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
      if(wrapGap<.011){
        groups[0]=last.concat(first);
        groups.pop();
      }
    }

    const laneSlots=[0,-7,7,-14,14,-21,21];

    for(const group of groups){
      if(group.length<2)continue;
      group.sort((a,b)=>b.state.displayed-a.state.displayed);

      group.forEach((item,index)=>{
        const laneIndex=index%laneSlots.length;
        const extraRow=Math.floor(index/laneSlots.length);
        item.state.targetLateral=laneSlots[laneIndex];
        item.state.targetVisualShift=extraRow?-(extraRow*.009):0;
        item.state.contact=true;
      });
    }

    for(const state of states){
      state.targetLateral=clamp(state.targetLateral,-21,21);
      state.lateral+=(state.targetLateral-state.lateral)*.12;
      state.visualShift+=(state.targetVisualShift-state.visualShift)*.08;
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
    if(state.to>=state.laps&&travelled>=state.laps-.002)lapProgress=.998;

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
    const now=performance.now();
    for(const state of motion.values()){
      const current=sampledPosition(state,now);
      state.displayed=current;
      state.from=current;
      state.to=current;
      state.segmentStart=now;
    }
  },{passive:true});

  requestAnimationFrame(animate);
})();
