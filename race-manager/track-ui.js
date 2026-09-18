(() => {
  'use strict';

  const ASSET_ROOT='assets';
  const DESIGN_W=390;
  const DESIGN_H=844;
  const TRACK_W=390;
  const TRACK_H=340;

  const YOU_SPRITE=`${ASSET_ROOT}/cars/player_gold.png`;
  const BOT_SPRITES=[
    'blue.png','red.png','green.png','cyan.png','orange.png',
    'pink.png','white.png','black_red.png','purple.png','teal.png','silver.png'
  ].map(name=>`${ASSET_ROOT}/cars/${name}`);

  const TRACK_ASSETS={
    'Autumn River Valley':`${ASSET_ROOT}/tracks/autumn_river_valley_circuit.png`,
    'Forest Lake':`${ASSET_ROOT}/tracks/forest_lake_circuit.png`,
    'Desert Canyon':`${ASSET_ROOT}/tracks/desert_canyon_circuit.png`,
    'Tropical Island':`${ASSET_ROOT}/tracks/tropical_island_circuit.png`
  };

  // Centre-line points were mapped directly against the approved 390 x 340
  // track images.  Cars are kept on these centre-lines, with only a small
  // lateral offset when cars overlap, so sprites remain visually on asphalt.
  const TRACK_POINTS={
    'Autumn River Valley':[
      [211,291],[275,291],[306,276],[316,250],[312,215],[330,195],[352,181],
      [358,151],[350,128],[332,114],[320,82],[299,55],[270,44],[220,45],
      [165,47],[115,44],[75,42],[44,51],[31,67],[37,88],[58,110],[76,126],
      [77,154],[64,177],[48,199],[45,223],[54,244],[81,264],[119,282],
      [162,290]
    ],
    'Forest Lake':[
      [196,291],[255,292],[303,295],[331,287],[347,268],[349,235],[347,197],
      [347,160],[354,126],[359,96],[349,80],[329,75],[298,76],[274,65],
      [255,47],[239,34],[217,32],[200,38],[187,56],[177,73],[159,83],
      [133,83],[103,76],[78,61],[58,56],[43,68],[45,84],[61,96],[84,106],
      [105,119],[108,137],[98,151],[79,163],[69,179],[69,196],[82,211],
      [95,227],[98,246],[106,263],[126,278],[155,287]
    ],
    'Desert Canyon':[
      [193,293],[255,293],[314,294],[340,285],[350,266],[351,244],[342,229],
      [325,220],[317,204],[324,188],[343,178],[355,158],[358,136],[352,113],
      [344,92],[329,80],[312,75],[293,78],[279,72],[270,60],[260,41],
      [243,29],[222,24],[205,29],[197,42],[194,59],[185,76],[171,88],
      [148,95],[119,100],[93,107],[67,115],[51,126],[45,140],[51,154],
      [66,164],[84,171],[101,182],[106,196],[104,212],[93,222],[78,228],
      [58,232],[39,240],[26,251],[22,266],[27,280],[43,291],[80,294],
      [130,294]
    ],
    'Tropical Island':[
      [124,263],[180,265],[235,268],[286,269],[317,263],[338,248],[348,226],
      [348,202],[355,181],[364,160],[363,139],[359,117],[348,98],[337,84],
      [323,74],[312,61],[299,57],[288,60],[281,73],[278,87],[267,96],
      [252,101],[228,102],[205,98],[181,90],[157,81],[132,72],[108,63],
      [87,60],[70,65],[60,77],[57,94],[58,113],[64,132],[65,150],[58,166],
      [48,182],[39,201],[34,220],[38,238],[50,250],[71,257],[96,261]
    ]
  };

  const lanes=document.getElementById('raceLanes');
  const raceScreen=document.getElementById('raceScreen');
  if(!lanes||!raceScreen)return;

  const motion=new Map();
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
  const currentTrackName=()=>document.getElementById('trackName')?.textContent?.trim()||'Forest Lake';

  function updateRaceScale(){
    const scale=Math.min(
      window.innerWidth/DESIGN_W,
      window.innerHeight/DESIGN_H
    );
    raceScreen.style.setProperty('--race-scale',String(scale));
  }

  const totalLaps=()=>{
    const text=document.getElementById('lapText')?.textContent||'';
    const match=text.match(/\/\s*(\d+)/);
    return Math.max(1,Number(match?.[1])||1);
  };

  const progressFromRow=row=>{
    const value=Number(row?.dataset?.progress);
    return Number.isFinite(value)?clamp(value,0,100):0;
  };

  function catmullRomClosed(points){
    const n=points.length;
    if(n<3)return '';
    const parts=[`M ${points[0][0]} ${points[0][1]}`];
    for(let i=0;i<n;i++){
      const p0=points[(i-1+n)%n];
      const p1=points[i];
      const p2=points[(i+1)%n];
      const p3=points[(i+2)%n];
      const c1x=p1[0]+(p2[0]-p0[0])/6;
      const c1y=p1[1]+(p2[1]-p0[1])/6;
      const c2x=p2[0]-(p3[0]-p1[0])/6;
      const c2y=p2[1]-(p3[1]-p1[1])/6;
      parts.push(`C ${c1x.toFixed(2)} ${c1y.toFixed(2)} ${c2x.toFixed(2)} ${c2y.toFixed(2)} ${p2[0]} ${p2[1]}`);
    }
    parts.push('Z');
    return parts.join(' ');
  }

  function gridTarget(index){
    const row=Math.floor(index/2);
    return -(0.0075*(row+1));
  }

  function gridLateral(index){
    return index%2===0?-4.5:4.5;
  }

  function ensureCircuit(){
    const trackName=currentTrackName();
    const imageSrc=TRACK_ASSETS[trackName]||TRACK_ASSETS['Forest Lake'];
    const points=TRACK_POINTS[trackName]||TRACK_POINTS['Forest Lake'];

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
      svg.setAttribute('viewBox',`0 0 ${TRACK_W} ${TRACK_H}`);
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
      path.setAttribute('d',catmullRomClosed(points));
      svg.dataset.trackName=trackName;
    }
    return {svg,path};
  }

  function updateMode(){
    document.body.classList.toggle('gridline-racing-live',!raceScreen.classList.contains('hidden'));
    if(!raceScreen.classList.contains('hidden'))updateRaceScale();
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

    // The approved roads are about 22–30 design pixels wide.  These small
    // offsets keep every 8 px-wide car inside the asphalt while still making
    // overlapping racers visible.
    const laneSlots=[-6,-3,0,3,6];
    for(const group of groups){
      if(group.length<2)continue;
      group.sort((a,b)=>b.state.rendered-a.state.rendered);
      group.forEach((entry,index)=>{
        const laneIndex=index%laneSlots.length;
        const extraRow=Math.floor(index/laneSlots.length);
        entry.state.targetLateral=laneSlots[laneIndex];
        entry.state.targetVisualShift=extraRow?-(extraRow*.006):0;
        entry.state.contact=true;
      });
    }

    for(const state of states){
      state.targetLateral=clamp(state.targetLateral,-6,6);
      state.lateral+=(state.targetLateral-state.lateral)*.11;
      state.visualShift+=(state.targetVisualShift-state.visualShift)*.08;
    }
  }

  function svgPointToLanePixels(svg,x,y){
    const matrix=svg.getScreenCTM?.();
    if(!matrix||typeof svg.createSVGPoint!=='function')return null;
    const p=svg.createSVGPoint();
    p.x=x;p.y=y;
    const screenPoint=p.matrixTransform(matrix);
    const rect=lanes.getBoundingClientRect();
    return{x:screenPoint.x-rect.left,y:screenPoint.y-rect.top};
  }

  function drawRacer(state,svg,path,length){
    const row=state.row;
    if(!row?.isConnected)return;

    const travelled=state.rendered+state.visualShift;
    let lapProgress=((travelled%1)+1)%1;
    if(state.target>=state.laps&&travelled>=state.laps-.002)lapProgress=.998;

    const pathDistance=clamp(length*lapProgress,0,Math.max(0,length-.1));
    const point=path.getPointAtLength(pathDistance);
    const tangentPoint=path.getPointAtLength(Math.min(length-.1,pathDistance+2));

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
    updateRaceScale();
    const now=performance.now();
    for(const state of motion.values())state.lastFrame=now;
  },{passive:true});

  updateRaceScale();
  requestAnimationFrame(animate);
})();
