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
  // Every circuit begins at the same chequered start/finish line.
  const TRACK_PATHS={
    'Harbour Sprint':'M 421 278 L 108 278 C 62 278 43 242 58 203 C 72 166 109 148 149 160 C 192 173 190 219 231 226 C 271 233 297 208 310 168 C 324 127 361 102 407 109 C 458 117 511 149 528 188 C 546 229 522 270 476 278 L 421 278 Z',
    'Alpine Ring':'M 421 278 L 337 278 C 287 278 274 245 292 219 C 311 192 271 176 237 187 C 196 201 177 170 195 140 C 216 105 273 109 303 130 C 337 154 347 113 386 103 C 433 91 493 116 520 154 C 548 194 535 247 487 270 C 466 280 444 280 421 278 Z',
    'Desert Oval':'M 421 278 L 176 278 C 91 278 54 239 54 184 C 54 119 104 82 196 82 L 404 82 C 497 82 548 121 548 185 C 548 244 504 278 421 278 Z',
    'Forest Stage':'M 421 278 L 344 278 C 306 278 292 252 310 230 C 332 203 288 189 253 204 C 209 223 177 203 181 169 C 185 133 222 116 255 126 C 285 135 293 93 336 88 C 378 83 395 120 425 126 C 459 133 500 114 523 151 C 547 190 524 228 486 238 C 448 248 462 278 421 278 Z',
    'Coastal Run':'M 421 278 L 132 278 C 73 278 48 246 64 211 C 78 180 121 180 145 195 C 178 216 208 190 224 160 C 244 122 278 96 326 91 C 384 85 449 102 493 134 C 540 168 553 218 524 251 C 504 274 470 281 421 278 Z',
    'Metro Circuit':'M 421 278 L 305 278 L 305 238 L 128 238 C 101 238 86 219 86 197 L 86 162 L 206 162 L 206 102 L 444 102 L 444 148 L 520 148 L 520 231 L 468 231 L 468 278 L 421 278 Z'
  };
  const currentTrackName=()=>document.getElementById('trackName')?.textContent?.trim()||'Harbour Sprint';

  const motion=new Map();
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));

  const totalLaps=()=>{
    const text=document.getElementById('lapText')?.textContent||'';
    const match=text.match(/\/\s*(\d+)/);
    return Math.max(1,Number(match?.[1])||1);
  };

  const progressFromRow=row=>{
    const value=Number(row?.dataset?.progress);
    return Number.isFinite(value)?clamp(value,0,100):0;
  };

  function gridTarget(index){
    const row=Math.floor(index/2);
    return -(0.0065*(row+1));
  }

  function gridLateral(index){
    return index%2===0?-10:10;
  }

  function ensureCircuit(){
    const trackName=currentTrackName();
    let svg=lanes.querySelector('.trackSvg');
    if(svg&&svg.dataset.trackName===trackName)return svg;
    if(svg){
      svg.remove();
      motion.clear();
    }
    const circuitD=TRACK_PATHS[trackName]||TRACK_PATHS['Harbour Sprint'];

    const ns='http://www.w3.org/2000/svg';
    svg=document.createElementNS(ns,'svg');
    svg.setAttribute('class','trackSvg');
    svg.setAttribute('viewBox',`0 0 ${VIEW_W} ${VIEW_H}`);
    svg.setAttribute('preserveAspectRatio','none');
    svg.setAttribute('aria-hidden','true');
    svg.dataset.trackName=trackName;

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
      <path d="${circuitD}" fill="none" stroke="#dfc79c" stroke-width="78" stroke-linecap="round" stroke-linejoin="round" filter="url(#trackShadow)"/>
      <path d="${circuitD}" fill="none" stroke="#f1f1f1" stroke-width="68" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="10 10"/>
      <path d="${circuitD}" fill="none" stroke="#d94b45" stroke-width="65" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="10 10"/>
      <path d="${circuitD}" fill="none" stroke="#666c72" stroke-width="56" stroke-linecap="round" stroke-linejoin="round"/>
      <path id="gridlineCircuitPath" d="${circuitD}" fill="none" stroke="#d9dde1" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="10 10" opacity=".92"/>
      <g id="startFinish">
        <rect x="410" y="242" width="22" height="72" rx="2" fill="#fff" opacity=".97"/>
        ${checks}
        <rect x="410" y="242" width="22" height="72" rx="2" fill="none" stroke="#111" stroke-width="2"/>
        <rect x="361" y="218" width="120" height="20" rx="10" fill="#0d1a31" opacity=".98"/>
        <text x="421" y="232" text-anchor="middle" fill="#fff" font-size="10" font-family="Arial, sans-serif" font-weight="800">START / FINISH</text>
      </g>
    `;

    lanes.prepend(svg);
    return svg;
  }

  function updateMode(){
    document.body.classList.toggle('gridline-racing-live',!raceScreen.classList.contains('hidden'));
  }

  function syncMotion(rows,laps,now){
    const phase=raceScreen.dataset.phase||'race';
    const seen=new Set();

    rows.forEach((row,index)=>{
      const name=row.querySelector('.name')?.textContent?.trim()||`Racer ${index+1}`;
      const key=row.dataset.racerId||name;
      const rawTarget=(progressFromRow(row)/100)*laps;
      const target=phase==='countdown'?gridTarget(index):rawTarget;
      seen.add(key);

      let state=motion.get(key);
      if(!state){
        state={
          rendered:target,
          target,
          previousTarget:target,
          targetAt:now,
          velocity:0,
          lastFrame:now,
          lastSeen:now,
          lateral:phase==='countdown'?gridLateral(index):0,
          targetLateral:phase==='countdown'?gridLateral(index):0,
          visualShift:0,
          targetVisualShift:0,
          lastPhase:phase
        };
        motion.set(key,state);
      }else{
        const phaseChanged=state.lastPhase!==phase;

        if(phaseChanged&&phase==='countdown'){
          state.rendered=target;
          state.target=target;
          state.previousTarget=target;
          state.velocity=0;
          state.visualShift=0;
          state.targetVisualShift=0;
          state.lateral=gridLateral(index);
          state.targetLateral=gridLateral(index);
          state.targetAt=now;
        }else if(phaseChanged&&phase==='race'){
          state.previousTarget=state.target;
          state.target=rawTarget;
          state.targetAt=now;
          state.velocity=Math.max(state.velocity,.018);
        }else if(Math.abs(target-state.target)>.000001){
          const elapsed=Math.max(.05,(now-state.targetAt)/1000);
          const measured=(target-state.target)/elapsed;
          state.velocity=clamp(state.velocity*.38+measured*.62,0,1.4);
          state.previousTarget=state.target;
          state.target=target;
          state.targetAt=now;
        }

        state.lastPhase=phase;
        state.lastSeen=now;
      }

      state.row=row;
      state.name=name;
      state.rank=String(index+1);
      state.isYou=row.classList.contains('you');
      state.laps=laps;
      state.gridIndex=index;
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
    const dt=clamp((now-state.lastFrame)/1000,0,.05);
    state.lastFrame=now;
    const phase=raceScreen.dataset.phase||'race';

    if(phase==='countdown'){
      state.rendered=state.target;
      state.velocity=0;
      return;
    }

    const age=Math.max(0,(now-state.targetAt)/1000);
    const prediction=Math.min(.34,age)*state.velocity;
    const desired=Math.max(state.target,state.target+prediction);
    const error=desired-state.rendered;

    // Critically damped-looking chase: smooth every frame, never stops between 300ms samples.
    const response=1-Math.exp(-dt*10.5);
    state.rendered+=error*response;

    // Keep extrapolation close to the authoritative race state.
    const leadLimit=.18;
    state.rendered=clamp(state.rendered,state.target-.04,state.target+leadLimit);
  }

  function prepareVisualPacking(states){
    const phase=raceScreen.dataset.phase||'race';

    if(phase==='countdown'){
      for(const state of states){
        state.targetLateral=gridLateral(state.gridIndex||0);
        state.targetVisualShift=0;
        state.contact=false;
        state.lateral+=(state.targetLateral-state.lateral)*.18;
        state.visualShift+=(0-state.visualShift)*.15;
      }
      return;
    }

    const phased=states
      .map(state=>({state,phase:((state.rendered%1)+1)%1}))
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
      if(item.phase-prev.phase<.0105){
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
      if(wrapGap<.0105){
        groups[0]=last.concat(first);
        groups.pop();
      }
    }

    const laneSlots=[-17,-9,0,9,17];

    for(const group of groups){
      if(group.length<2)continue;
      group.sort((a,b)=>b.state.rendered-a.state.rendered);

      group.forEach((item,index)=>{
        const laneIndex=index%laneSlots.length;
        const extraRow=Math.floor(index/laneSlots.length);
        item.state.targetLateral=laneSlots[laneIndex];
        item.state.targetVisualShift=extraRow?-(extraRow*.0085):0;
        item.state.contact=true;
      });
    }

    for(const state of states){
      state.targetLateral=clamp(state.targetLateral,-18,18);
      state.lateral+=(state.targetLateral-state.lateral)*.11;
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

    const travelled=state.rendered+state.visualShift;
    let lapProgress=((travelled%1)+1)%1;
    if(state.target>=state.laps&&travelled>=state.laps-.002)lapProgress=.998;

    const pathDistance=clamp(length*lapProgress,0,Math.max(0,length-.1));
    const point=path.getPointAtLength(pathDistance);
    const tangentPoint=path.getPointAtLength(Math.min(length-.1,pathDistance+3));

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
    for(const state of motion.values())state.lastFrame=now;
  },{passive:true});

  requestAnimationFrame(animate);
})();
