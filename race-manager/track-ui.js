(() => {
  'use strict';

  const ASSET_ROOT='assets';
  const YOU_SPRITE=`${ASSET_ROOT}/cars/player_gold.png`;
  const BOT_SPRITES=[
    'blue.png','red.png','green.png','cyan.png','orange.png',
    'pink.png','white.png','black_red.png','purple.png','teal.png','silver.png'
  ].map(name=>`${ASSET_ROOT}/cars/${name}`);

  const TRACK_ASSETS={
    'Forest Lake':`${ASSET_ROOT}/tracks/forest_lake.png`,
    'Mediterranean Marina':`${ASSET_ROOT}/tracks/mediterranean_marina.png`,
    'Desert Canyon':`${ASSET_ROOT}/tracks/desert_canyon.png`,
    'Snowy Alpine':`${ASSET_ROOT}/tracks/snowy_alpine.png`
  };

  const VIEW_W=600;
  const VIEW_H=338;

  // Invisible centre-lines used only to position the approved car sprites over
  // the approved track artwork.  The SVG itself is never drawn.
  const TRACK_PATHS={
    'Forest Lake':'M 318 254 C 410 255 516 257 548 220 C 575 188 565 120 525 91 C 485 62 424 64 382 95 C 345 123 328 150 296 137 C 262 123 250 83 207 72 C 152 58 95 76 73 116 C 53 153 68 193 103 211 C 139 230 180 215 208 233 C 235 250 269 254 318 254 Z',
    'Mediterranean Marina':'M 300 253 C 405 255 510 257 544 220 C 568 193 560 132 531 99 C 502 66 447 63 394 78 C 335 95 291 111 246 101 C 205 92 178 67 132 73 C 86 80 61 112 68 151 C 76 193 112 215 150 218 C 180 221 192 246 230 252 C 250 255 274 254 300 253 Z',
    'Desert Canyon':'M 320 255 C 426 255 517 258 544 219 C 562 193 550 162 517 151 C 485 140 470 118 493 94 C 521 65 493 48 448 56 C 399 65 361 99 326 112 C 292 125 267 107 243 86 C 214 61 169 58 124 76 C 81 93 61 125 72 159 C 83 192 118 198 145 211 C 173 224 158 245 198 252 C 235 258 279 255 320 255 Z',
    'Snowy Alpine':'M 311 254 C 407 255 510 256 543 216 C 569 184 557 126 521 96 C 485 67 437 70 397 93 C 357 117 330 148 296 136 C 262 124 247 87 208 75 C 160 60 105 73 78 108 C 51 144 63 187 98 209 C 130 229 168 220 198 232 C 228 245 259 252 311 254 Z'
  };

  const lanes=document.getElementById('raceLanes');
  const raceScreen=document.getElementById('raceScreen');
  if(!lanes||!raceScreen)return;

  const motion=new Map();
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
  const currentTrackName=()=>document.getElementById('trackName')?.textContent?.trim()||'Forest Lake';

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
    return -(0.008*(row+1));
  }

  function gridLateral(index){
    return index%2===0?-11:11;
  }

  function ensureCircuit(){
    const trackName=currentTrackName();
    const imageSrc=TRACK_ASSETS[trackName]||TRACK_ASSETS['Forest Lake'];
    const pathData=TRACK_PATHS[trackName]||TRACK_PATHS['Forest Lake'];

    let image=lanes.querySelector('.trackMap');
    if(!image){
      image=document.createElement('img');
      image.className='trackMap';
      image.alt='';
      image.draggable=false;
      lanes.prepend(image);
    }
    if(image.dataset.trackName!==trackName){
      image.src=imageSrc;
      image.dataset.trackName=trackName;
      motion.clear();
    }

    let svg=lanes.querySelector('.trackMotionSvg');
    if(!svg){
      const ns='http://www.w3.org/2000/svg';
      svg=document.createElementNS(ns,'svg');
      svg.classList.add('trackMotionSvg');
      svg.setAttribute('viewBox',`0 0 ${VIEW_W} ${VIEW_H}`);
      svg.setAttribute('preserveAspectRatio','none');
      svg.setAttribute('aria-hidden','true');
      const path=document.createElementNS(ns,'path');
      path.id='gridlineCircuitPath';
      path.setAttribute('fill','none');
      path.setAttribute('stroke','none');
      svg.appendChild(path);
      lanes.appendChild(svg);
    }
    const path=svg.querySelector('#gridlineCircuitPath');
    if(svg.dataset.trackName!==trackName){
      path.setAttribute('d',pathData);
      svg.dataset.trackName=trackName;
    }
    return {svg,path};
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
          rendered:target,target,previousTarget:target,targetAt:now,velocity:0,lastFrame:now,lastSeen:now,
          lateral:phase==='countdown'?gridLateral(index):0,
          targetLateral:phase==='countdown'?gridLateral(index):0,
          visualShift:0,targetVisualShift:0,lastPhase:phase
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

  function assignUniqueSprites(states){
    const others=states.filter(state=>!state.isYou).sort((a,b)=>a.name.localeCompare(b.name));
    for(const state of states)if(state.isYou)state.sprite=YOU_SPRITE;
    others.forEach((state,index)=>{state.sprite=BOT_SPRITES[index%BOT_SPRITES.length]});
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
    const response=1-Math.exp(-dt*10.5);
    state.rendered+=error*response;
    state.rendered=clamp(state.rendered,state.target-.04,state.target+.18);
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
      if(!current.length){current=[item];continue}
      const prev=current[current.length-1];
      if(item.phase-prev.phase<.012)current.push(item);
      else{groups.push(current);current=[item]}
    }
    if(current.length)groups.push(current);

    if(groups.length>1){
      const first=groups[0],last=groups[groups.length-1];
      const wrapGap=(first[0].phase+1)-last[last.length-1].phase;
      if(wrapGap<.012){
        groups[0]=last.concat(first);
        groups.pop();
      }
    }

    const laneSlots=[-15,-8,0,8,15];
    for(const group of groups){
      if(group.length<2)continue;
      group.sort((a,b)=>b.state.rendered-a.state.rendered);
      group.forEach((item,index)=>{
        const laneIndex=index%laneSlots.length;
        const extraRow=Math.floor(index/laneSlots.length);
        item.state.targetLateral=laneSlots[laneIndex];
        item.state.targetVisualShift=extraRow?-(extraRow*.009):0;
        item.state.contact=true;
      });
    }

    for(const state of states){
      state.targetLateral=clamp(state.targetLateral,-16,16);
      state.lateral+=(state.targetLateral-state.lateral)*.11;
      state.visualShift+=(state.targetVisualShift-state.visualShift)*.08;
    }
  }

  function svgPointToLanePixels(svg,x,y){
    const matrix=svg.getScreenCTM?.();
    if(!matrix||typeof svg.createSVGPoint!=='function')return null;
    const p=svg.createSVGPoint();
    p.x=x;p.y=y;
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
    dx/=mag;dy/=mag;

    const lateral=Number.isFinite(state.lateral)?state.lateral:0;
    const svgX=point.x+(-dy*lateral);
    const svgY=point.y+(dx*lateral);
    const rendered=svgPointToLanePixels(svg,svgX,svgY);
    if(!rendered)return;

    const tangentAngle=Math.atan2(dy,dx)*180/Math.PI;
    const spriteAngle=tangentAngle-90;

    row.style.setProperty('--track-x',`${rendered.x}px`);
    row.style.setProperty('--track-y',`${rendered.y}px`);
    row.style.setProperty('--car-angle',`${spriteAngle}deg`);
    row.style.setProperty('--car-image',`url("${state.sprite}")`);
    row.classList.toggle('contacting',!!state.contact);
    row.setAttribute('aria-label',`${state.name}, position ${state.rank}`);
    row.title=state.isYou?`YOU · ${state.name}`:`${state.rank}. ${state.name}`;
  }

  function animate(now){
    updateMode();

    if(!raceScreen.classList.contains('hidden')){
      const {svg,path}=ensureCircuit();
      if(path&&typeof path.getTotalLength==='function'){
        const rows=Array.from(lanes.querySelectorAll('.raceLane'));
        const laps=totalLaps();
        syncMotion(rows,laps,now);

        const states=Array.from(motion.values()).filter(state=>state.row?.isConnected);
        assignUniqueSprites(states);
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
