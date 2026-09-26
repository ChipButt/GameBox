const $ = id => document.getElementById(id);

const COLS = 20;
const ROWS = 52;
const CELL = 32;
const WORLD_W = COLS * CELL;
const WORLD_H = ROWS * CELL;
const SAVE_KEY = 'core-empires-v2';

const ages = [
  {name:'Stone Age', units:['Clubber','Slinger','Stoneguard']},
  {name:'Bronze Age', units:['Spearman','Archer','Centurion']},
  {name:'Iron Age', units:['Knight','Crossbowman','Ironclad']}
];

const resourceInfo = {
  stone:{label:'Stone', value:1, yield:6, color:'#9d9b8f'},
  copper:{label:'Copper', value:3, yield:8, color:'#c57b55'},
  iron:{label:'Iron', value:6, yield:10, color:'#82949a'},
  gold:{label:'Gold', value:12, yield:12, color:'#e6bd55'}
};

const resourceTypes = new Set(Object.keys(resourceInfo));
const DIRS = [[1,0],[-1,0],[0,1],[0,-1]];
const warehouse = {c:9,r:0};

function noise(c,r,k=0){
  const n = Math.sin((c+1)*12.9898 + (r+1)*78.233 + k*37.719) * 43758.5453;
  return n - Math.floor(n);
}

function createGrid(){
  const grid = Array.from({length:ROWS},(_,r)=>
    Array.from({length:COLS},(_,c)=>{
      if(r===0) return 'surface';
      const coarse = noise(Math.floor(c/2),Math.floor(r/2),2);
      if(r>=34 && coarse<0.055) return 'gold';
      if(r>=20 && coarse<0.125) return 'iron';
      if(r>=8 && coarse<0.205) return 'copper';
      if(r>=4 && coarse<0.31) return 'stone';
      if(r>13 && noise(c,r,7)<0.68) return 'rock';
      return 'dirt';
    })
  );

  for(let r=1;r<=4;r++){
    grid[r][9]='tunnel';
    grid[r][10]='tunnel';
  }
  for(let c=7;c<=12;c++) grid[4][c]='tunnel';

  grid[5][7]='stone';
  grid[5][8]='stone';
  grid[6][7]='copper';
  grid[6][8]='copper';

  return grid;
}

function makeWorkers(count=2){
  return Array.from({length:count},(_,i)=>({
    id:i+1,
    x:9.35 + (i%2)*0.65,
    y:0.55,
    state:'idle',
    jobKey:null,
    path:[]
  }));
}

function makeCarts(count=1){
  return Array.from({length:count},(_,i)=>({
    id:i+1,
    x:10.15 + i*0.25,
    y:0.62,
    state:'idle',
    path:[],
    cargo:0,
    cargoType:null,
    targetKey:null
  }));
}

function newState(previous={}){
  return {
    ore:Number.isFinite(previous.ore)?previous.ore:120,
    age:Number.isFinite(previous.age)?Math.max(0,Math.min(2,previous.age)):0,
    territory:Number.isFinite(previous.territory)?Math.max(1,Math.min(6,previous.territory)):1,
    wins:Number.isFinite(previous.wins)?Math.max(0,Math.min(6,previous.wins)):0,
    mine:{
      grid:createGrid(),
      jobs:[],
      piles:[],
      workers:makeWorkers(Math.max(2,previous.miners||2)),
      carts:makeCarts(Math.max(1,previous.carts||1)),
      toolLevel:0,
      cartLevel:0
    },
    battle:null
  };
}

let state;
try{
  state = JSON.parse(localStorage.getItem(SAVE_KEY));
}catch{}

if(!state || !state.mine || !Array.isArray(state.mine.grid) || state.mine.grid.length!==ROWS){
  let legacy={};
  try{ legacy=JSON.parse(localStorage.getItem('core-empires-v1'))||{}; }catch{}
  state=newState(legacy);
}

state.mine.jobs ||= [];
state.mine.piles ||= [];
state.mine.workers ||= makeWorkers(2);
state.mine.carts ||= makeCarts(1);
state.mine.toolLevel ||= 0;
state.mine.cartLevel ||= 0;
state.mine.workers.forEach((w,i)=>{
  w.id ??= i+1; w.x ??= 9.5; w.y ??= .55; w.state ??='idle'; w.jobKey ??= null; w.path ??=[];
});
state.mine.carts.forEach((c,i)=>{
  c.id ??= i+1; c.x ??= 10.2; c.y ??=.62; c.state ??='idle'; c.path ??=[]; c.cargo ??=0; c.cargoType ??=null; c.targetKey ??=null;
});

let units = state.battle?.units || [];
let running = state.battle?.running || false;
let home = state.battle?.home ?? 100;
let enemy = state.battle?.enemy ?? 100;
let spawnClock = state.battle?.spawnClock ?? 0;
let spawned = state.battle?.spawned ?? 0;

let paused=false;
let nowT=0;
let last=performance.now();
let saveClock=0;
let uiClock=0;
let toastTimer;
let selectedTool='dig';
let pointerMode=null;
let pointerId=null;
let lastPaintCell=null;
let panStartY=0;
let panStartScroll=0;

const key=(c,r)=>c+','+r;
const inBounds=(c,r)=>c>=0&&c<COLS&&r>=0&&r<ROWS;
const tileAt=(c,r)=>inBounds(c,r)?state.mine.grid[r][c]:null;
const isResource=t=>resourceTypes.has(t);
const isWalkable=(c,r)=>inBounds(c,r)&&(r===0||tileAt(c,r)==='tunnel');
const jobAt=(c,r)=>state.mine.jobs.find(j=>j.c===c&&j.r===r);
const pileAt=(c,r)=>state.mine.piles.find(p=>p.c===c&&p.r===r);

function toast(text){
  $('toast').textContent=text;
  $('toast').classList.add('show');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>$('toast').classList.remove('show'),1900);
}

function save(){
  state.battle={units,running,home,enemy,spawnClock,spawned};
  try{localStorage.setItem(SAVE_KEY,JSON.stringify(state));}catch{}
}

function neighbours(c,r){
  return DIRS.map(([dc,dr])=>({c:c+dc,r:r+dr})).filter(p=>inBounds(p.c,p.r));
}

function visibleCell(c,r){
  if(r===0 || tileAt(c,r)==='tunnel') return true;
  for(let rr=Math.max(0,r-2);rr<=Math.min(ROWS-1,r+2);rr++){
    for(let cc=Math.max(0,c-2);cc<=Math.min(COLS-1,c+2);cc++){
      if(Math.abs(cc-c)+Math.abs(rr-r)<=2 && isWalkable(cc,rr)) return true;
    }
  }
  return false;
}

function connectedToDigPath(c,r){
  return neighbours(c,r).some(n=>isWalkable(n.c,n.r) || !!jobAt(n.c,n.r));
}

function queueCell(c,r){
  if(!inBounds(c,r)||r===0||isWalkable(c,r)||jobAt(c,r)) return false;
  if(!connectedToDigPath(c,r)) return false;
  state.mine.jobs.push({c,r,progress:0});
  return true;
}

function clearQueue(){
  const activeKeys=new Set(state.mine.workers.filter(w=>w.jobKey).map(w=>w.jobKey));
  state.mine.jobs=state.mine.jobs.filter(j=>activeKeys.has(key(j.c,j.r)));
  toast('Unstarted digging cleared.');
}

function deepestTunnel(){
  let deepest=0;
  for(let r=1;r<ROWS;r++) if(state.mine.grid[r].some(t=>t==='tunnel')) deepest=r;
  return deepest*2;
}

function totalLoose(){
  return state.mine.piles.reduce((sum,p)=>sum+p.amount,0);
}

function mineToolPower(){
  return 1 + state.mine.toolLevel*.38 + state.age*.16;
}

function cartCapacity(){
  return 10 + state.mine.cartLevel*5;
}

function minerCost(){
  return Math.round(60 * 1.48**Math.max(0,state.mine.workers.length-2));
}
function cartCost(){
  return Math.round(90 * 1.58**Math.max(0,state.mine.carts.length-1));
}
function toolCost(){
  return Math.round(120 * 1.9**state.mine.toolLevel);
}
function capacityCost(){
  return Math.round(140 * 1.85**state.mine.cartLevel);
}
function evolveCost(){ return state.age===0?400:1000; }
function troopCost(i){ return [35,50,80][i]*(state.age+1); }

function bfs(start, goals){
  const startC=Math.max(0,Math.min(COLS-1,Math.floor(start.x)));
  const startR=Math.max(0,Math.min(ROWS-1,Math.floor(start.y)));
  const goalSet=new Set(goals.map(g=>key(g.c,g.r)));
  if(goalSet.has(key(startC,startR))) return [];
  const q=[{c:startC,r:startR}];
  const prev=new Map([[key(startC,startR),null]]);
  let found=null;

  for(let qi=0;qi<q.length;qi++){
    const cur=q[qi];
    for(const n of neighbours(cur.c,cur.r)){
      const nk=key(n.c,n.r);
      if(prev.has(nk)||!isWalkable(n.c,n.r)) continue;
      prev.set(nk,cur);
      if(goalSet.has(nk)){ found=n; qi=q.length; break; }
      q.push(n);
    }
  }
  if(!found) return null;
  const path=[];
  let cur=found;
  while(cur && !(cur.c===startC&&cur.r===startR)){
    path.unshift({c:cur.c,r:cur.r});
    cur=prev.get(key(cur.c,cur.r));
  }
  return path;
}

function pathToJob(worker,job){
  const access=neighbours(job.c,job.r).filter(n=>isWalkable(n.c,n.r));
  if(!access.length) return null;
  return bfs(worker,access);
}

function chooseWorkerJob(worker){
  const taken=new Set(state.mine.workers.filter(w=>w!==worker&&w.jobKey).map(w=>w.jobKey));
  let best=null;
  for(const job of state.mine.jobs){
    const jk=key(job.c,job.r);
    if(taken.has(jk)) continue;
    const path=pathToJob(worker,job);
    if(path===null) continue;
    if(!best||path.length<best.path.length) best={job,path};
  }
  if(best){
    worker.jobKey=key(best.job.c,best.job.r);
    worker.path=best.path;
    worker.state=best.path.length?'walking':'working';
  }
}

function moveAlong(entity,dt,speed){
  if(!entity.path?.length) return true;
  const target=entity.path[0];
  const tx=target.c+.5, ty=target.r+.5;
  const dx=tx-entity.x, dy=ty-entity.y;
  const dist=Math.hypot(dx,dy);
  const step=speed*dt;
  if(dist<=step||dist<.02){
    entity.x=tx; entity.y=ty; entity.path.shift();
  }else{
    entity.x += dx/dist*step;
    entity.y += dy/dist*step;
  }
  return entity.path.length===0;
}

function finishJob(worker,job){
  const tile=tileAt(job.c,job.r);
  if(isResource(tile)){
    const info=resourceInfo[tile];
    const existing=pileAt(job.c,job.r);
    if(existing) existing.amount+=info.yield;
    else state.mine.piles.push({c:job.c,r:job.r,type:tile,amount:info.yield});
  }
  state.mine.grid[job.r][job.c]='tunnel';
  state.mine.jobs=state.mine.jobs.filter(j=>j!==job);
  worker.jobKey=null;
  worker.path=[];
  worker.state='idle';
}

function tickWorkers(dt){
  for(const worker of state.mine.workers){
    if(!worker.jobKey){
      worker.state='idle';
      chooseWorkerJob(worker);
    }

    if(!worker.jobKey) continue;
    const job=state.mine.jobs.find(j=>key(j.c,j.r)===worker.jobKey);
    if(!job){ worker.jobKey=null; worker.path=[]; worker.state='idle'; continue; }

    if(worker.path?.length){
      worker.state='walking';
      if(!moveAlong(worker,dt,2.5 + state.age*.15)) continue;
    }

    const adjacent=Math.abs(Math.floor(worker.x)-job.c)+Math.abs(Math.floor(worker.y)-job.r)<=1;
    if(!adjacent){
      const newPath=pathToJob(worker,job);
      if(newPath===null){ worker.jobKey=null; worker.state='idle'; continue; }
      worker.path=newPath;
      continue;
    }

    worker.state='working';
    const tile=tileAt(job.c,job.r);
    const baseTime = tile==='dirt'?1.15 : tile==='rock'?2.15 :
      tile==='stone'?2.5 : tile==='copper'?3.1 : tile==='iron'?3.9 : tile==='gold'?4.8 : 1.2;
    job.progress += dt*mineToolPower()/baseTime;
    if(job.progress>=1) finishJob(worker,job);
  }
}

function freePileForCart(cart){
  const claimed=new Set(state.mine.carts.filter(c=>c!==cart&&c.targetKey&&c.state==='toPile').map(c=>c.targetKey));
  let best=null;
  for(const pile of state.mine.piles){
    if(pile.amount<=0) continue;
    const pk=key(pile.c,pile.r);
    if(claimed.has(pk)) continue;
    const path=bfs(cart,[{c:pile.c,r:pile.r}]);
    if(path===null) continue;
    if(!best||path.length<best.path.length) best={pile,path};
  }
  return best;
}

function sendCartHome(cart){
  const path=bfs(cart,[warehouse]);
  cart.path=path||[];
  cart.state='toSurface';
  cart.targetKey=null;
}

function tickCarts(dt){
  for(const cart of state.mine.carts){
    if(cart.state==='idle'){
      const target=freePileForCart(cart);
      if(target){
        cart.targetKey=key(target.pile.c,target.pile.r);
        cart.path=target.path;
        cart.state='toPile';
      }
    }

    if(cart.state==='toPile'){
      if(cart.path?.length && !moveAlong(cart,dt,3.25)) continue;
      const pile=state.mine.piles.find(p=>key(p.c,p.r)===cart.targetKey);
      if(!pile||pile.amount<=0){ cart.state='idle'; cart.targetKey=null; continue; }
      const load=Math.min(cartCapacity(),pile.amount);
      cart.cargo=load;
      cart.cargoType=pile.type;
      pile.amount-=load;
      if(pile.amount<=0) state.mine.piles=state.mine.piles.filter(p=>p!==pile);
      sendCartHome(cart);
    }

    if(cart.state==='toSurface'){
      if(cart.path?.length && !moveAlong(cart,dt,3.25)) continue;
      if(cart.cargo>0 && cart.cargoType){
        state.ore += cart.cargo * resourceInfo[cart.cargoType].value;
      }
      cart.cargo=0;
      cart.cargoType=null;
      cart.x=warehouse.c+.5;
      cart.y=.55;
      cart.state='idle';
      cart.path=[];
    }
  }
}

function renderCards(){
  $('troops').innerHTML=ages[state.age].units.map((name,i)=>`
    <button class="troop" data-unit="${i}" aria-label="Deploy ${name}, ${troopCost(i)} ore">
      <span class="portrait">
        <svg viewBox="0 0 64 52" aria-hidden="true">
          <path d="M25 46l4-15h7l5 15M28 23h11v14H26z" fill="#b6dcb0"/>
          <circle cx="33" cy="15" r="7" fill="#e8c379"/>
          <path d="${['M47 42V8l10 4-10 9','M47 8q18 18 0 35l5-18z','M44 21l15-4v18l-8 9-7-9z'][i]}" fill="none" stroke="#e8c379" stroke-width="3"/>
        </svg>
      </span>
      <strong>${name}</strong>
      <small>${['FRONTLINE · BALANCED','RANGED · HIGH DAMAGE','HEAVY · HIGH HEALTH'][i]}</small>
      <span class="cost">◆ ${troopCost(i)} <span style="margin-left:16px">+</span></span>
    </button>
  `).join('');
  document.querySelectorAll('[data-unit]').forEach(b=>b.onclick=()=>deploy(+b.dataset.unit));
}

function makeUnit(i,foe){
  const scale=foe?1+(state.territory-1)*.22:1+state.age*.75;
  return {i,foe,x:foe?90:10,hp:[65,38,150][i]*scale,max:[65,38,150][i]*scale,dmg:[12,17,14][i]*scale,range:i===1?24:5,speed:[8,7,4.5][i],cd:0,lane:Math.random()*13};
}

function deploy(i){
  if(paused) return toast('Resume your expedition first.');
  if(units.filter(u=>!u.foe).length>=12) return toast('Your army is full.');
  if(state.ore<troopCost(i)) return toast('Haul more material to the surface first.');
  state.ore-=troopCost(i);
  units.push(makeUnit(i,false));
  updateUI();
}

function startBattle(){
  if(running||paused||state.wins>=6) return;
  if(!units.some(u=>!u.foe)) return toast('Deploy at least one troop first.');
  running=true;
  home=enemy=100;
  spawned=0;
  spawnClock=0;
  units.forEach(u=>u.x=10);
  $('banner').textContent='Hold the line. Reinforcements can turn the tide.';
  updateUI();
}

function finishBattle(win){
  running=false;
  units=[];
  if(win){
    const reward=140+state.territory*55;
    state.ore+=reward;
    state.wins++;
    $('banner').textContent=state.wins>=6?'The core is yours. An empire built from the earth.':`Territory conquered! +${reward} ore. A deeper frontier awaits.`;
    if(state.territory<6) state.territory++;
    toast(state.wins>=6?'You conquered all six territories!':`Victory! +${reward} ore`);
  }else{
    $('banner').textContent='Regroup, deepen your mine, and try again.';
    toast('Outpost lost. Your mine and upgrades are safe.');
  }
  home=enemy=100;
  save();
  updateUI();
}

function tickBattle(dt){
  if(!running) return;
  spawnClock-=dt;
  const cap=4+state.territory*2;
  if(spawnClock<=0&&spawned<cap){
    units.push(makeUnit(spawned%3,true));
    spawned++;
    spawnClock=3.8;
  }
  for(const u of units){
    if(u.hp<=0) continue;
    u.cd-=dt;
    const targets=units.filter(v=>v.foe!==u.foe&&v.hp>0).sort((a,b)=>Math.abs(a.x-u.x)-Math.abs(b.x-u.x));
    const target=targets[0];
    if(target&&Math.abs(target.x-u.x)<=u.range){
      if(u.cd<=0){target.hp-=u.dmg;u.cd=.9;}
    }else if(u.foe?u.x<=7:u.x>=93){
      if(u.cd<=0){if(u.foe)home-=u.dmg*.35;else enemy-=u.dmg*.35;u.cd=.9;}
    }else{
      u.x+=(u.foe?-1:1)*u.speed*dt;
    }
  }
  units=units.filter(u=>u.hp>0);
  if(enemy<=0) finishBattle(true);
  else if(home<=0) finishBattle(false);
}

function updateUI(){
  $('ore').textContent=Math.floor(state.ore).toLocaleString();
  $('depth').innerHTML=`${deepestTunnel()} <small>m</small>`;
  $('crewTop').innerHTML=`${state.mine.workers.length} <small>miners</small>`;
  $('cartTop').innerHTML=`${state.mine.carts.length} <small>cart${state.mine.carts.length===1?'':'s'}</small>`;
  $('ageName').textContent=ages[state.age].name;

  $('activeMiners').textContent=state.mine.workers.filter(w=>w.state!=='idle').length;
  $('waitingLoads').textContent=state.mine.piles.length;
  $('digQueue').textContent=state.mine.jobs.length;
  $('stockpile').textContent=totalLoose();
  $('capacity').textContent=cartCapacity();

  const backlog=totalLoose();
  $('logistics').textContent=backlog>cartCapacity()*state.mine.carts.length*2
    ? 'Material is piling up underground. Add carts or increase their capacity.'
    : state.mine.jobs.length>0
      ? 'Miners work the reachable end of your queued tunnels first.'
      : 'Drag from an open tunnel into the ground to choose where the crew digs next.';

  $('upgrade').innerHTML=`Hire a miner <span>◆ ${minerCost()}</span>`;
  $('upgrade').disabled=paused||state.ore<minerCost()||state.mine.workers.length>=8;
  $('cart').innerHTML=`Buy another cart <span>◆ ${cartCost()}</span>`;
  $('cart').disabled=paused||state.ore<cartCost()||state.mine.carts.length>=5;
  $('toolUpgrade').innerHTML=`Sharper tools <span>◆ ${toolCost()}</span>`;
  $('toolUpgrade').disabled=paused||state.ore<toolCost()||state.mine.toolLevel>=6;
  $('capacityUpgrade').innerHTML=`Bigger carts <span>◆ ${capacityCost()}</span>`;
  $('capacityUpgrade').disabled=paused||state.ore<capacityCost()||state.mine.cartLevel>=6;

  $('homeHp').textContent=Math.max(0,Math.ceil(home))+'%';
  $('enemyHp').textContent=Math.max(0,Math.ceil(enemy))+'%';
  $('armyCount').textContent=`${units.filter(u=>!u.foe).length} troops in the field`;
  $('attack').disabled=running||paused||state.wins>=6;
  $('attack').innerHTML=state.wins>=6?'Campaign complete ✓':running?'Battle in progress':'Start battle <span>↗</span>';
  $('battleTitle').textContent=['The wild lowlands','Copper canyon','The ancient crossing','Ashen foothills','The iron frontier','Heart of the mountain'][state.territory-1];
  $('battleState').textContent=paused?'PAUSED':running?'BATTLE IN PROGRESS':state.wins>=6?'FRONTIER CONQUERED':'READY TO ADVANCE';

  $('nextAge').textContent=state.age<2?`Discover the ${ages[state.age+1].name}`:'The Iron Age has dawned';
  $('evolveDescription').textContent=state.age<2
    ? 'Unlock stronger troops and improve how quickly your miners break tougher ground.'
    : 'Your civilisation has reached its final age. Conquer all six territories to claim the core.';
  $('evolve').innerHTML=state.age<2?`Evolve civilisation <span>◆ ${evolveCost()}</span>`:'Maximum age reached ✓';
  $('evolve').disabled=state.age===2||state.ore<evolveCost()||paused;
  document.querySelectorAll('.ages span').forEach((e,i)=>e.classList.toggle('selected',i<=state.age));
  document.querySelectorAll('[data-unit]').forEach(b=>b.disabled=paused||state.ore<troopCost(+b.dataset.unit)||units.filter(u=>!u.foe).length>=12);
}

function canvasContext(id,logicalW,logicalH){
  const c=$(id);
  const d=Math.min(devicePixelRatio||1,2);
  if(c.width!==Math.round(logicalW*d)||c.height!==Math.round(logicalH*d)){
    c.width=Math.round(logicalW*d);
    c.height=Math.round(logicalH*d);
  }
  const g=c.getContext('2d');
  g.setTransform(d,0,0,d,0,0);
  return g;
}

function drawRockTexture(g,x,y,c,r,base){
  g.fillStyle=base;
  g.fillRect(x,y,CELL+1,CELL+1);
  const n=noise(c,r,4);
  g.strokeStyle=n>.5?'#ffffff0b':'#00000016';
  g.lineWidth=1;
  g.beginPath();
  g.moveTo(x+5+n*7,y+7);
  g.lineTo(x+18,y+13+n*4);
  g.lineTo(x+27-n*5,y+6+n*10);
  g.stroke();
}

function drawDeposit(g,x,y,type,c,r){
  const info=resourceInfo[type];
  const points=[
    [7+noise(c,r,1)*4,7+noise(c,r,2)*5],
    [20+noise(c,r,3)*5,8+noise(c,r,4)*7],
    [12+noise(c,r,5)*8,20+noise(c,r,6)*5],
    [24+noise(c,r,7)*3,23+noise(c,r,8)*3]
  ];
  g.fillStyle=info.color;
  for(const [px,py] of points){
    g.beginPath();
    g.arc(x+px,y+py,3.2,0,Math.PI*2);
    g.fill();
  }
}

function drawMine(){
  const g=canvasContext('mineCanvas',WORLD_W,WORLD_H);
  g.clearRect(0,0,WORLD_W,WORLD_H);

  g.fillStyle='#738d83';
  g.fillRect(0,0,WORLD_W,CELL);
  g.fillStyle='#283b31';
  g.fillRect(0,CELL-8,WORLD_W,8);

  for(let r=1;r<ROWS;r++){
    for(let c=0;c<COLS;c++){
      const x=c*CELL,y=r*CELL;
      const tile=tileAt(c,r);
      const visible=visibleCell(c,r);

      if(tile==='tunnel'){
        g.fillStyle='#101714';
        g.fillRect(x,y,CELL+1,CELL+1);
        g.fillStyle='#1c2924';
        g.fillRect(x,y+CELL-4,CELL,4);
        if((c+r)%3===0){
          g.strokeStyle='#6e5d3e';
          g.lineWidth=2;
          g.beginPath(); g.moveTo(x+4,y+5); g.lineTo(x+4,y+CELL-4); g.moveTo(x+CELL-4,y+5); g.lineTo(x+CELL-4,y+CELL-4); g.stroke();
        }
        continue;
      }

      const base=tile==='dirt'?'#4a4030':'#373b34';
      drawRockTexture(g,x,y,c,r,base);
      if(visible && isResource(tile)) drawDeposit(g,x,y,tile,c,r);

      if(!visible){
        g.fillStyle='#070a09d9';
        g.fillRect(x,y,CELL+1,CELL+1);
      }
    }
  }

  for(const job of state.mine.jobs){
    const x=job.c*CELL,y=job.r*CELL;
    g.fillStyle='#e8c37918';
    g.fillRect(x+2,y+2,CELL-4,CELL-4);
    g.strokeStyle=job.progress>0?'#f1d88b':'#bca66d';
    g.lineWidth=1.5;
    g.setLineDash([4,3]);
    g.strokeRect(x+3,y+3,CELL-6,CELL-6);
    g.setLineDash([]);
    if(job.progress>0){
      g.fillStyle='#0a0d0cbb';
      g.fillRect(x+4,y+CELL-7,CELL-8,3);
      g.fillStyle='#e8c379';
      g.fillRect(x+4,y+CELL-7,(CELL-8)*Math.min(1,job.progress),3);
    }
  }

  for(const pile of state.mine.piles){
    const x=(pile.c+.5)*CELL,y=(pile.r+.74)*CELL;
    g.fillStyle=resourceInfo[pile.type].color;
    const count=Math.min(6,Math.max(2,Math.ceil(pile.amount/2)));
    for(let i=0;i<count;i++){
      g.beginPath();
      g.arc(x-9+i*3.5,y-(i%2)*3,3.3,0,Math.PI*2);
      g.fill();
    }
    g.fillStyle='#f1e8cd';
    g.font='bold 8px DM Sans';
    g.textAlign='center';
    g.fillText(String(pile.amount),x,y-10);
  }

  const wx=warehouse.c*CELL;
  g.fillStyle='#26372f';
  g.fillRect(wx-36,3,104,25);
  g.fillStyle='#e7c373';
  g.fillRect(wx+8,8,30,14);
  g.fillStyle='#18231f';
  g.fillRect(wx+13,12,20,10);
  g.fillStyle='#d9dfcf';
  g.font='bold 8px Space Grotesk';
  g.textAlign='center';
  g.fillText('STORE',wx+16,6);

  for(const cart of state.mine.carts){
    const x=cart.x*CELL,y=cart.y*CELL;
    g.fillStyle='#8c6e48';
    g.fillRect(x-9,y-6,18,10);
    if(cart.cargoType){
      g.fillStyle=resourceInfo[cart.cargoType].color;
      g.fillRect(x-7,y-10,14,5);
    }
    g.fillStyle='#151b19';
    g.beginPath();g.arc(x-6,y+5,3,0,Math.PI*2);g.arc(x+6,y+5,3,0,Math.PI*2);g.fill();
  }

  for(const worker of state.mine.workers){
    const x=worker.x*CELL,y=worker.y*CELL;
    const working=worker.state==='working';
    const bob=working?Math.sin(nowT*12+worker.id)*2:0;
    g.strokeStyle='#1d2824';
    g.lineWidth=2;
    g.beginPath();
    g.moveTo(x,y-2+bob);g.lineTo(x-4,y+8);g.moveTo(x,y-2+bob);g.lineTo(x+4,y+8);g.stroke();
    g.fillStyle='#b7dcae';
    g.fillRect(x-4,y-12+bob,8,11);
    g.fillStyle='#e1b98b';
    g.beginPath();g.arc(x,y-17+bob,4,0,Math.PI*2);g.fill();
    g.fillStyle='#e7c373';
    g.fillRect(x-6,y-22+bob,12,4);
    if(working){
      g.strokeStyle='#c8b477';
      g.lineWidth=1.8;
      g.beginPath();
      g.moveTo(x+3,y-8);g.lineTo(x+10,y-15-Math.sin(nowT*12+worker.id)*5);g.stroke();
    }
  }

  g.strokeStyle='#ffffff08';
  g.lineWidth=1;
  for(let c=0;c<=COLS;c++){g.beginPath();g.moveTo(c*CELL,0);g.lineTo(c*CELL,WORLD_H);g.stroke();}
  for(let r=0;r<=ROWS;r++){g.beginPath();g.moveTo(0,r*CELL);g.lineTo(WORLD_W,r*CELL);g.stroke();}
}

function poly(g,pts,color){
  g.fillStyle=color;g.beginPath();pts.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fill();
}

function drawBattle(){
  const canvas=$('battleCanvas');
  const rect=canvas.getBoundingClientRect();
  const w=Math.max(1,rect.width),h=Math.max(1,rect.height);
  const d=Math.min(devicePixelRatio||1,2);
  if(canvas.width!==Math.round(w*d)||canvas.height!==Math.round(h*d)){canvas.width=Math.round(w*d);canvas.height=Math.round(h*d);}
  const g=canvas.getContext('2d');
  g.setTransform(d,0,0,d,0,0);
  g.fillStyle='#b8c8ab';g.fillRect(0,0,w,h);
  g.fillStyle='#e0d9ab';g.beginPath();g.arc(w*.65,h*.22,27,0,Math.PI*2);g.fill();
  poly(g,[[0,h*.53],[w*.15,h*.25],[w*.28,h*.45],[w*.43,h*.18],[w*.67,h*.49],[w*.82,h*.29],[w,h*.43],[w,h],[0,h]],'#91a58a');
  poly(g,[[0,h*.57],[w*.18,h*.42],[w*.36,h*.63],[w*.58,h*.39],[w*.76,h*.52],[w,h*.4],[w,h],[0,h]],'#6e8c73');
  poly(g,[[0,h*.68],[w*.3,h*.62],[w*.64,h*.67],[w,h*.59],[w,h],[0,h]],'#516b4e');
  poly(g,[[0,h*.8],[w*.4,h*.74],[w,h*.79],[w,h*.94],[w*.4,h*.87],[0,h*.91]],'#9c9771');

  function base(x,foe){
    const y=h*.75;
    g.fillStyle=foe?'#65564a':'#b3ab87';g.fillRect(x-20,y-33,40,38);
    poly(g,[[x-26,y-33],[x,y-59],[x+26,y-33]],foe?'#785b49':'#d1c5a0');
    g.fillStyle='#354237';g.fillRect(x-6,y-16,12,21);
    g.fillStyle='#3f4b39';g.fillRect(x+15,y-70,2,35);
    poly(g,[[x+17,y-70],[x+36,y-65],[x+17,y-58]],foe?'#d38c69':'#d7c780');
  }
  base(w*.075,false);base(w*.925,true);

  for(const u of units){
    const x=u.x/100*w,y=h*.78+u.lane,bob=running?Math.sin(nowT*9+u.lane)*2:0;
    g.fillStyle='#263d3540';g.beginPath();g.ellipse(x,y+9,9,3,0,Math.PI*2);g.fill();
    g.strokeStyle='#293c34';g.lineWidth=3;g.beginPath();g.moveTo(x,y-6+bob);g.lineTo(x-4,y+7);g.moveTo(x,y-6+bob);g.lineTo(x+4,y+7);g.stroke();
    g.fillStyle=u.foe?'#b97653':['#c7c196','#b7bdba','#c0c6b5'][state.age];g.fillRect(x-5,y-16+bob,10,u.i===2?14:11);
    g.fillStyle='#e0bb8f';g.beginPath();g.arc(x,y-21+bob,4.5,0,7);g.fill();
    g.strokeStyle=u.foe?'#744632':'#d8d2b5';g.lineWidth=u.i===2?6:2;g.beginPath();g.moveTo(x+(u.foe?-8:8),y-6);g.lineTo(x+(u.foe?-8:8),y-25);g.stroke();
    g.fillStyle='#23392e';g.fillRect(x-9,y-32,18,3);g.fillStyle=u.foe?'#e5a07a':'#c6e4a9';g.fillRect(x-9,y-32,18*Math.max(0,u.hp/u.max),3);
  }
}

function canvasCell(e){
  const rect=$('mineCanvas').getBoundingClientRect();
  const x=(e.clientX-rect.left)/rect.width*WORLD_W;
  const y=(e.clientY-rect.top)/rect.height*WORLD_H;
  return {c:Math.floor(x/CELL),r:Math.floor(y/CELL)};
}

function inspectCell(c,r){
  if(!inBounds(c,r)) return;
  if(!visibleCell(c,r)) return toast('Unexplored ground. Dig closer to reveal it.');
  const t=tileAt(c,r);
  if(t==='surface') return toast('Surface depot: hauled material becomes usable here.');
  if(t==='tunnel') return toast(pileAt(c,r)?'Open tunnel with loose material waiting for collection.':'Open tunnel.');
  if(isResource(t)) return toast(resourceInfo[t].label+' vein. Dig into it to extract the deposit.');
  toast(t==='rock'?'Dense rock. It takes longer to break.':'Soft earth. Quick to excavate.');
}

function lineCells(a,b){
  const cells=[];
  let x0=a.c,y0=a.r,x1=b.c,y1=b.r;
  const dx=Math.abs(x1-x0),sx=x0<x1?1:-1;
  const dy=-Math.abs(y1-y0),sy=y0<y1?1:-1;
  let err=dx+dy;
  while(true){
    cells.push({c:x0,r:y0});
    if(x0===x1&&y0===y1) break;
    const e2=2*err;
    if(e2>=dy){err+=dy;x0+=sx;}
    if(e2<=dx){err+=dx;y0+=sy;}
  }
  return cells;
}

const mineCanvas=$('mineCanvas');
const mineViewport=$('mineViewport');

mineCanvas.addEventListener('pointerdown',e=>{
  if(paused) return;
  const cell=canvasCell(e);
  if(selectedTool==='inspect'){
    inspectCell(cell.c,cell.r);
    return;
  }

  pointerId=e.pointerId;
  mineCanvas.setPointerCapture(pointerId);

  if(isWalkable(cell.c,cell.r)){
    pointerMode='pan';
    panStartY=e.clientY;
    panStartScroll=mineViewport.scrollTop;
  }else{
    pointerMode='dig';
    lastPaintCell=cell;
    if(!queueCell(cell.c,cell.r) && !jobAt(cell.c,cell.r) && !connectedToDigPath(cell.c,cell.r)){
      toast('Start from the edge of an existing tunnel.');
    }
  }
});

mineCanvas.addEventListener('pointermove',e=>{
  if(e.pointerId!==pointerId||!pointerMode) return;
  if(pointerMode==='pan'){
    mineViewport.scrollTop=panStartScroll-(e.clientY-panStartY);
    return;
  }
  const cell=canvasCell(e);
  if(!lastPaintCell || cell.c!==lastPaintCell.c || cell.r!==lastPaintCell.r){
    const cells=lineCells(lastPaintCell||cell,cell);
    for(const p of cells) queueCell(p.c,p.r);
    lastPaintCell=cell;
  }
});

function endPointer(e){
  if(e.pointerId!==pointerId) return;
  pointerMode=null;
  pointerId=null;
  lastPaintCell=null;
  save();
}
mineCanvas.addEventListener('pointerup',endPointer);
mineCanvas.addEventListener('pointercancel',endPointer);

$('digTool').onclick=()=>{
  selectedTool='dig';
  $('digTool').classList.add('active');
  $('inspectTool').classList.remove('active');
};
$('inspectTool').onclick=()=>{
  selectedTool='inspect';
  $('inspectTool').classList.add('active');
  $('digTool').classList.remove('active');
};
$('clearQueue').onclick=clearQueue;

$('upgrade').onclick=()=>{
  const cost=minerCost();
  if(paused||state.ore<cost||state.mine.workers.length>=8) return;
  state.ore-=cost;
  const i=state.mine.workers.length;
  state.mine.workers.push({id:i+1,x:warehouse.c+.2+(i%3)*.28,y:.55,state:'idle',jobKey:null,path:[]});
  toast('A new miner joins the crew.');
  updateUI();save();
};

$('cart').onclick=()=>{
  const cost=cartCost();
  if(paused||state.ore<cost||state.mine.carts.length>=5) return;
  state.ore-=cost;
  const i=state.mine.carts.length;
  state.mine.carts.push({id:i+1,x:warehouse.c+.7+(i%3)*.18,y:.62,state:'idle',path:[],cargo:0,cargoType:null,targetKey:null});
  toast('Another haul cart enters service.');
  updateUI();save();
};

$('toolUpgrade').onclick=()=>{
  const cost=toolCost();
  if(paused||state.ore<cost||state.mine.toolLevel>=6) return;
  state.ore-=cost;
  state.mine.toolLevel++;
  toast('The crew can break ground faster.');
  updateUI();save();
};

$('capacityUpgrade').onclick=()=>{
  const cost=capacityCost();
  if(paused||state.ore<cost||state.mine.cartLevel>=6) return;
  state.ore-=cost;
  state.mine.cartLevel++;
  toast('Every cart can carry more material.');
  updateUI();save();
};

$('evolve').onclick=()=>{
  if(state.age>=2||state.ore<evolveCost()||paused) return;
  state.ore-=evolveCost();
  state.age++;
  units.filter(u=>!u.foe).forEach(u=>{u.hp*=1.5;u.max*=1.5;u.dmg*=1.5;});
  renderCards();
  toast(`Welcome to the ${ages[state.age].name}!`);
  updateUI();save();
};

$('attack').onclick=startBattle;
$('pause').onclick=()=>{
  paused=!paused;
  $('pause').textContent=paused?'▶':'Ⅱ';
  $('pause').setAttribute('aria-label',paused?'Resume game':'Pause game');
  updateUI();
};

$('reset').onclick=()=>{
  if(!confirm('Start a new expedition? This resets your saved Core Empires progress.')) return;
  state=newState();
  units=[];running=false;paused=false;home=enemy=100;spawned=0;spawnClock=0;
  $('pause').textContent='Ⅱ';
  $('banner').textContent='Your mine funds every soldier you send to the frontier.';
  renderCards();updateUI();save();
  mineViewport.scrollTop=0;
};

$('menu').onclick=()=>$('gameMenu').showModal();
$('closeMenu').onclick=()=>$('gameMenu').close();

document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{
  document.body.dataset.tab=b.dataset.tab;
  document.querySelectorAll('[data-tab]').forEach(n=>n.classList.toggle('active',n===b));
  if(b.dataset.tab==='mine') requestAnimationFrame(drawMine);
  if(b.dataset.tab==='battle') requestAnimationFrame(drawBattle);
});

function tick(dt){
  tickWorkers(dt);
  tickCarts(dt);
  tickBattle(dt);
}

function frame(now){
  const dt=Math.min((now-last)/1000,.1);
  last=now;
  if(!paused){
    nowT+=dt;
    tick(dt);
    saveClock+=dt;
    if(saveClock>=2){save();saveClock=0;}
  }

  uiClock+=dt;
  if(uiClock>=.16){updateUI();uiClock=0;}

  if(document.body.dataset.tab==='mine') drawMine();
  if(document.body.dataset.tab==='battle') drawBattle();
  requestAnimationFrame(frame);
}

renderCards();
updateUI();
requestAnimationFrame(frame);
document.addEventListener('visibilitychange',()=>{last=performance.now();save();});
window.addEventListener('beforeunload',save);
