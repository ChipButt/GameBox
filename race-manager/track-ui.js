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
    'Autumn River Valley':[[182,288],[192,288],[202,288.1],[212,288.9],[222,289],[232,289],[242,288.9],[251.9,287.6],[261.4,284.6],[270.3,280],[276.9,272.7],[281,263.6],[283.3,253.9],[284,243.9],[285.9,234.1],[289.1,224.7],[294.9,216.5],[302.7,210.4],[312,206.7],[321.6,204.1],[331.3,201.7],[340.8,198.6],[349.7,194],[357.3,187.6],[362.3,179],[364.2,169.2],[363.5,159.3],[361.5,149.6],[355.2,141.8],[349.4,133.7],[342.4,126.6],[334.8,120],[327.4,113.4],[318.6,108.6],[311.3,101.9],[306.7,93.1],[305.6,83.2],[308.2,73.6],[310.8,63.9],[310.8,54],[308.3,44.3],[301.8,36.8],[292.9,32.5],[283,31.1],[273,31.5],[263.3,33.8],[253.5,35.9],[244.3,39.6],[235.1,43.6],[225.5,46.4],[215.8,48.7],[206,50.4],[196,51],[186,51.4],[176,52.4],[166.1,52.4],[156.1,52],[146.1,51.5],[136.1,51],[126.1,50.3],[116.2,49.1],[106.5,46.7],[96.8,44.5],[87.2,41.7],[77.3,40.2],[67.3,39.9],[57.3,40.7],[48,44.1],[40.2,50.2],[35,58.7],[32.5,68.4],[33.2,78.3],[37,87.5],[42.7,95.7],[49.8,102.7],[57.1,109.5],[63.2,117.4],[67.1,126.6],[69,136.4],[69.6,146.4],[67.8,156.2],[63.6,165.2],[57.4,173],[51,180.7],[43.8,187.7],[37.7,195.6],[32.7,204.2],[30.1,213.9],[29.7,223.8],[32.3,233.4],[37.1,242.2],[44.2,249.2],[52.6,254.5],[61.7,258.8],[70.9,262.6],[78.8,268.7],[85,276.5],[92.7,282.7],[102,286.4],[111.9,287.9],[121.9,288],[131.9,288],[141.8,287.7],[151.8,287],[161.8,287.4],[171.8,288],[181.8,288]],
    'Forest Lake':[[195,288],[205,288],[215,287.3],[225,287],[234.9,287.4],[244.7,289.7],[254.7,290.1],[264.7,290],[274.6,290.4],[284.3,292.9],[293.9,295.8],[303.7,297.7],[313.7,297.4],[323.2,294.5],[331.8,289.5],[341.1,286],[347.5,279],[354.6,272.4],[361.6,265.4],[365.6,256.3],[367.7,246.5],[367.7,236.5],[366,226.7],[362.4,217.4],[358,208.4],[353.5,199.5],[347.5,191.5],[342.6,182.8],[337.7,174.1],[333.6,165],[333.1,155],[334.9,145.2],[338.8,136.1],[346.8,130.2],[353.5,122.8],[357.3,113.6],[358.5,103.7],[357.8,93.8],[352.7,85.3],[344.4,79.9],[334.6,77.7],[324.7,77],[314.7,77],[304.7,77],[294.7,76.4],[284.7,75.8],[275.4,72.7],[268.9,65.1],[263,57.1],[257.8,48.5],[254,39.3],[246.6,32.8],[237.3,29.1],[227.5,27.3],[217.5,27.1],[207.5,28.2],[198.1,31.3],[189.7,36.8],[183.4,44.5],[178.5,53.2],[172.1,60.8],[163.3,65.5],[153.6,67.8],[143.6,68.8],[133.7,68.8],[123.7,67.9],[114.1,65.5],[105.5,60.3],[95.8,58.1],[86.5,54.5],[77.5,50.2],[67.7,48.2],[58,50],[49.7,55.5],[45.8,64.4],[46.3,74.4],[51.4,82.8],[59.2,89.1],[68.1,93.6],[77.7,96.4],[87.3,99],[96.7,102.5],[104.9,108.2],[110.8,116.1],[112.7,125.8],[110.6,135.5],[104.8,143.7],[97,149.9],[88.3,154.8],[78.8,157.7],[69,159.6],[60.3,164.4],[52.3,170.4],[46,178.1],[42.8,187.5],[43,197.4],[46,206.9],[54.9,211.1],[64.4,214.2],[73.9,217.4],[83.1,221.1],[91.9,225.7],[99.3,232.5],[103.7,241.3],[104.9,251.2],[105.1,261.2],[107.4,270.9],[113.3,278.9],[121.3,284.8],[130.8,287.7],[140.8,288.9],[150.7,287.8],[160.6,287],[170.6,287.7],[180.6,288],[190.6,288]],
    'Desert Canyon':[[200,295.3],[210,295.7],[219.9,295],[229.9,295],[239.9,295],[249.9,295],[259.9,295],[269.9,294.7],[279.9,294],[289.9,294.7],[299.9,294.7],[309.8,293.8],[319.8,292.7],[329.4,290.1],[338.5,286.1],[347.1,280.9],[353.6,273.4],[359,265],[362.8,255.8],[365.1,246],[366,236.1],[365.3,226.1],[362.7,216.5],[357.8,207.8],[350.8,200.7],[342.3,195.4],[334.1,189.7],[328,181.9],[324,172.7],[322.6,162.9],[324.4,153.1],[330.6,145.4],[339.5,140.9],[348.6,136.6],[356,130.1],[360.4,121.1],[362.7,111.4],[362.4,101.4],[361,91.6],[359.1,81.7],[355.7,72.5],[349.1,64.9],[341.7,58.2],[332.3,55.2],[322.4,56.3],[313.3,60.5],[303.5,62],[293.5,62.3],[284.3,59],[279.2,50.5],[275.6,41.2],[269.9,33],[261.6,27.6],[252.2,24.1],[242.4,22.3],[232.4,22],[222.4,22],[212.5,23.2],[203,26.1],[194.8,31.7],[188.9,39.8],[185.5,49.2],[181.8,58.5],[176.5,66.9],[168.9,73.2],[159.4,76.2],[149.6,78.4],[139.9,80.9],[130.5,84.2],[120.7,86.1],[111,88.6],[102,92.9],[92.6,96.3],[83.1,99.5],[73.4,101.8],[63.8,104.4],[55.8,110.4],[50.2,118.6],[47.7,128.2],[47.8,138.2],[53.2,146.4],[61.7,151.6],[71.5,153],[81.5,153.4],[91.2,155.7],[101.1,157.5],[110,161.9],[117.4,168.6],[123,176.9],[126.4,186.2],[126.8,196.2],[124.9,206],[121.7,215.5],[115.8,223.4],[107.4,228.7],[97.9,231.8],[88,233.4],[78.1,234],[68.1,234.9],[58.2,236.4],[48.8,239.7],[40.3,244.9],[34.6,252.9],[32.3,262.7],[32.7,272.5],[37.6,281.2],[45.2,287.6],[54.6,290.9],[64.4,292.6],[74.4,293.5],[84.4,294],[94.4,294.8],[104.3,294.9],[114.3,294.1],[124.3,294],[134.3,294.4],[144.3,295],[154.3,294.7],[164.2,293.9],[174.2,293.6],[184.1,294.8],[194.1,295]],
    'Tropical Island':[[125,256],[135,255.9],[144.7,258.3],[154.4,260],[164.3,261.5],[174.2,262.8],[184.2,263.8],[194.2,263.9],[204.1,264.8],[214,266.3],[223.9,267.5],[233.3,270.9],[243,273.1],[251.6,278.1],[260.9,281.2],[270.9,282],[280.6,283.8],[290.4,285.8],[300.3,285.1],[310.1,283.4],[319.5,279.8],[328.6,275.8],[336.9,270.1],[343.7,262.9],[349.1,254.5],[354.1,245.9],[355,236],[354.3,226],[353.6,216],[353.9,206.1],[355.1,196.1],[356.6,186.3],[358.1,176.4],[360.9,166.8],[362.1,156.9],[358.6,147.9],[351.1,141.4],[343.4,135],[336,128.2],[331.1,119.6],[329.1,109.8],[329.4,99.8],[330.2,89.9],[331,79.9],[331.5,69.9],[330.8,60],[327.9,50.4],[321.3,43],[312.7,38.1],[302.8,37],[292.9,37.8],[285.4,44.3],[277.4,50.1],[271.1,57.6],[266.3,66.2],[258.4,72.3],[248.9,75.2],[238.9,76.1],[228.9,76.9],[218.9,77],[209,76.3],[199.1,75],[189.3,72.9],[180,69.3],[170.4,66.6],[160.8,63.8],[152.3,58.5],[143.7,53.5],[134.8,49],[125.7,44.8],[116.5,41],[106.7,39.3],[96.7,39.2],[86.8,40.9],[77.7,44.9],[68.8,49.4],[63,57.4],[62,67.3],[62.7,77.2],[64.8,87],[67.2,96.7],[70,106.3],[72,116.1],[72.7,126.1],[70.8,135.9],[67.3,145.2],[62.1,153.7],[56.1,161.6],[47.4,164.3],[37.8,162.5],[30.8,169.1],[29,178.8],[34.8,186.7],[36.7,196.1],[33.3,205.5],[32.8,215.4],[34.5,225.3],[38.2,234.5],[44.6,242.1],[53.2,247.2],[62.6,250.4],[72.3,253],[82.2,253.9],[92.2,254],[102.2,254.2],[112.1,255.4],[122.1,256]]
  };

  const lanes=document.getElementById('raceLanes');
  const raceScreen=document.getElementById('raceScreen');
  if(!lanes||!raceScreen)return;

  const motion=new Map();
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
  const currentTrackName=()=>document.getElementById('trackName')?.textContent?.trim()||'Forest Lake';

  function updateRaceScale(){
    const scale=Math.min(
      1,
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

  function roadPath(points){
    if(!points.length)return '';
    return 'M '+points.map((p,index)=>`${index?'L ':''}${p[0]} ${p[1]}`).join(' ')+' Z';
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
      path.setAttribute('d',roadPath(points));
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
    row.style.setProperty('--counter-angle',`${-spriteAngle}deg`);
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
