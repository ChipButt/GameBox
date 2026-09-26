const $ = id => document.getElementById(id);

const SAVE_KEY = 'core-empires-v3';
const COLS = 10;
const ROWS = 42;
const CELL = 64;
const WORLD_W = COLS * CELL;
const WORLD_H = ROWS * CELL;
const FIELD_COUNT = 8;
const DIRS = [[1,0],[-1,0],[0,1],[0,-1]];
const warehouse = {c:4,r:0};

const ages = [
  {name:'Stone Age', units:['Raider','Hunter','Shieldbearer']},
  {name:'Bronze Age', units:['Spearman','Archer','Bronze Guard']},
  {name:'Iron Age', units:['Swordsman','Crossbowman','Iron Guard']}
];

const resourceInfo = {
  iron:{label:'Iron', yield:8, color:'#9ba8ad'},
  gold:{label:'Gold', yield:6, color:'#e7bd58'},
  diamond:{label:'Diamonds', yield:2, color:'#70dceb'}
};
const resourceTypes = new Set(Object.keys(resourceInfo));

function noise(c,r,k=0){
  const n = Math.sin((c+1)*12.9898 + (r+1)*78.233 + k*37.719) * 43758.5453;
  return n - Math.floor(n);
}

function createGrid(){
  const grid = Array.from({length:ROWS},(_,r)=>
    Array.from({length:COLS},(_,c)=>{
      if(r===0) return 'surface';
      const coarse = noise(Math.floor(c/2),Math.floor(r/2),2);
      if(r>=18 && coarse<0.075) return 'diamond';
      if(r>=8 && coarse<0.17) return 'gold';
      if(r>=4 && coarse<0.34) return 'iron';
      if(r>12 && noise(c,r,7)<0.66) return 'rock';
      return 'dirt';
    })
  );

  for(let r=1;r<=3;r++){
    grid[r][4]='tunnel';
    grid[r][5]='tunnel';
  }
  for(let c=3;c<=6;c++) grid[3][c]='tunnel';

  grid[4][3]='iron';
  grid[4][6]='iron';
  grid[5][3]='gold';
  grid[7][6]='diamond';
  grid[8][5]='gold';
  return grid;
}

function makeWorkers(count=2){
  return Array.from({length:count},(_,i)=>({
    id:i+1,x:4.35+(i%2)*.65,y:.55,state:'idle',jobKey:null,path:[],think:i*.12
  }));
}
function makeCarts(count=1){
  return Array.from({length:count},(_,i)=>({
    id:i+1,x:4.85+i*.18,y:.62,state:'idle',path:[],cargo:0,cargoType:null,targetKey:null,think:i*.18
  }));
}

function freshState(legacy={}){
  const oldMine=legacy.mine||{};
  const oldOre=Number.isFinite(legacy.ore)?legacy.ore:120;
  return {
    resources:{
      gold:Math.max(60,Math.floor(legacy.resources?.gold ?? oldOre)),
      diamonds:Math.max(2,Math.floor(legacy.resources?.diamonds ?? 2)),
      iron:Math.max(20,Math.floor(legacy.resources?.iron ?? oldOre*.12)),
      food:Math.max(45,Math.floor(legacy.resources?.food ?? 45))
    },
    age:Number.isFinite(legacy.age)?Math.max(0,Math.min(2,legacy.age)):0,
    territory:Number.isFinite(legacy.territory)?Math.max(1,Math.min(6,legacy.territory)):1,
    wins:Number.isFinite(legacy.wins)?Math.max(0,Math.min(6,legacy.wins)):0,
    mine:{
      grid:createGrid(),jobs:[],piles:[],
      workers:makeWorkers(Math.max(2,oldMine.workers?.length||legacy.miners||2)),
      carts:makeCarts(Math.max(1,oldMine.carts?.length||legacy.carts||1)),
      toolLevel:Math.max(0,oldMine.toolLevel||0),
      cartLevel:Math.max(0,oldMine.cartLevel||0)
    },
    farm:{
      farmers:2,
      activeFields:2,
      level:0,
      fieldProgress:Array(FIELD_COUNT).fill(0)
    },
    battle:null
  };
}

let state;
try{state=JSON.parse(localStorage.getItem(SAVE_KEY));}catch{}
if(!state || !state.mine || !state.farm || !state.resources){
  let legacy={};
  try{legacy=JSON.parse(localStorage.getItem('core-empires-v2'))||JSON.parse(localStorage.getItem('core-empires-v1'))||{};}catch{}
  state=freshState(legacy);
}

state.resources.gold ??= 120;
state.resources.diamonds ??= 2;
state.resources.iron ??= 20;
state.resources.food ??= 45;
state.mine.jobs ||= [];
state.mine.piles ||= [];
state.mine.workers ||= makeWorkers(2);
state.mine.carts ||= makeCarts(1);
state.mine.toolLevel ||= 0;
state.mine.cartLevel ||= 0;
state.farm.farmers ||= 2;
state.farm.activeFields ||= 2;
state.farm.level ||= 0;
state.farm.fieldProgress ||= Array(FIELD_COUNT).fill(0);
while(state.farm.fieldProgress.length<FIELD_COUNT) state.farm.fieldProgress.push(0);

state.mine.workers.forEach((w,i)=>{
  w.id ??= i+1;w.x ??=4.5;w.y ??=.55;w.state ??='idle';w.jobKey ??=null;w.path ??=[];w.think ??=i*.1;
});
state.mine.carts.forEach((c,i)=>{
  c.id ??=i+1;c.x ??=4.9;c.y ??=.62;c.state ??='idle';c.path ??=[];c.cargo ??=0;c.cargoType ??=null;c.targetKey ??=null;c.think ??=i*.15;
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
let drawClock=0;
let mineAccumulator=0;
let farmAccumulator=0;
let toastTimer;
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
const friendlyUnits=()=>units.filter(u=>!u.foe);
const populationUsed=()=>state.mine.workers.length+state.farm.farmers+friendlyUnits().length;
const populationCapacity=()=>4+state.farm.activeFields*4+state.farm.level*2;
const hasPopulationSpace=(extra=1)=>populationUsed()+extra<=populationCapacity();

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

function canAfford(cost){
  return Object.entries(cost).every(([name,amount])=>(state.resources[name]||0)>=amount);
}
function pay(cost){
  for(const [name,amount] of Object.entries(cost)) state.resources[name]-=amount;
}
function costText(cost){
  const names={gold:'Gold',diamonds:'Diamond',iron:'Iron',food:'Food'};
  return Object.entries(cost).filter(([,v])=>v>0).map(([k,v])=>v+' '+names[k]+(k==='diamonds'&&v!==1?'s':'')).join(' · ');
}

function neighbours(c,r){
  return DIRS.map(([dc,dr])=>({c:c+dc,r:r+dr})).filter(p=>inBounds(p.c,p.r));
}

function visibleCell(c,r){
  if(r===0||tileAt(c,r)==='tunnel') return true;
  for(let rr=Math.max(0,r-2);rr<=Math.min(ROWS-1,r+2);rr++){
    for(let cc=Math.max(0,c-2);cc<=Math.min(COLS-1,c+2);cc++){
      if(Math.abs(cc-c)+Math.abs(rr-r)<=2&&isWalkable(cc,rr)) return true;
    }
  }
  return false;
}

function connectedToDigPath(c,r){
  return neighbours(c,r).some(n=>isWalkable(n.c,n.r)||!!jobAt(n.c,n.r));
}

function queueCell(c,r){
  if(!inBounds(c,r)||r===0||isWalkable(c,r)||jobAt(c,r)||!connectedToDigPath(c,r)) return false;
  state.mine.jobs.push({c,r,progress:0});
  for(const w of state.mine.workers) w.think=Math.min(w.think,.08);
  return true;
}

function clearQueue(){
  const active=new Set(state.mine.workers.filter(w=>w.jobKey).map(w=>w.jobKey));
  state.mine.jobs=state.mine.jobs.filter(j=>active.has(key(j.c,j.r)));
  toast('Unstarted digging cleared.');
}

function deepestTunnel(){
  let deepest=0;
  for(let r=1;r<ROWS;r++) if(state.mine.grid[r].some(t=>t==='tunnel')) deepest=r;
  return deepest*2;
}
function totalLoose(){return state.mine.piles.reduce((sum,p)=>sum+p.amount,0);}
function mineToolPower(){return 1+state.mine.toolLevel*.38+state.age*.18;}
function cartCapacity(){return 10+state.mine.cartLevel*5;}

function minerCost(){
  const n=Math.max(0,state.mine.workers.length-2);
  return {gold:Math.round(20*1.4**n),food:Math.round(8*1.22**n)};
}
function cartCost(){
  const n=Math.max(0,state.mine.carts.length-1);
  return {gold:Math.round(30*1.5**n),iron:Math.round(10*1.35**n)};
}
function toolCost(){return {gold:Math.round(35*1.75**state.mine.toolLevel),iron:Math.round(15*1.55**state.mine.toolLevel)};}
function capacityCost(){return {gold:Math.round(45*1.7**state.mine.cartLevel),iron:Math.round(20*1.5**state.mine.cartLevel)};}
function farmerCost(){
  const n=Math.max(0,state.farm.farmers-2);
  return {gold:Math.round(15*1.38**n),food:Math.round(6*1.2**n)};
}
function fieldCost(){
  const n=Math.max(0,state.farm.activeFields-2);
  return {gold:Math.round(30*1.42**n),iron:Math.round(10*1.35**n)};
}
function farmUpgradeCost(){return {gold:Math.round(40*1.7**state.farm.level),diamonds:1+state.farm.level};}

function troopCost(i){
  const scale=1+state.age*.45;
  const base=[
    {gold:15,diamonds:1,iron:5,food:5},
    {gold:20,diamonds:1,iron:7,food:6},
    {gold:25,diamonds:2,iron:10,food:8}
  ][i];
  return {
    gold:Math.round(base.gold*scale),
    diamonds:base.diamonds+state.age,
    iron:Math.round(base.iron*scale),
    food:Math.round(base.food*(1+state.age*.25))
  };
}

function evolveCost(){
  return state.age===0
    ? {gold:120,diamonds:4,iron:30,food:20}
    : {gold:260,diamonds:10,iron:70,food:45};
}

function bfs(start,goals){
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
      if(goalSet.has(nk)){found=n;qi=q.length;break;}
      q.push(n);
    }
  }
  if(!found) return null;
  const path=[];
  let cur=found;
  while(cur&&!(cur.c===startC&&cur.r===startR)){
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
    return true;
  }
  return false;
}

function moveAlong(entity,dt,speed){
  if(!entity.path?.length) return true;
  const target=entity.path[0];
  const tx=target.c+.5,ty=target.r+.5;
  const dx=tx-entity.x,dy=ty-entity.y;
  const dist=Math.hypot(dx,dy);
  const step=speed*dt;
  if(dist<=step||dist<.02){
    entity.x=tx;entity.y=ty;entity.path.shift();
  }else{
    entity.x+=dx/dist*step;entity.y+=dy/dist*step;
  }
  return entity.path.length===0;
}

function finishJob(worker,job){
  const tile=tileAt(job.c,job.r);
  if(isResource(tile)){
    const existing=pileAt(job.c,job.r);
    if(existing) existing.amount+=resourceInfo[tile].yield;
    else state.mine.piles.push({c:job.c,r:job.r,type:tile,amount:resourceInfo[tile].yield});
  }
  state.mine.grid[job.r][job.c]='tunnel';
  state.mine.jobs=state.mine.jobs.filter(j=>j!==job);
  worker.jobKey=null;worker.path=[];worker.state='idle';worker.think=.12;
  for(const w of state.mine.workers) w.think=Math.min(w.think,.12);
  for(const c of state.mine.carts) c.think=Math.min(c.think,.12);
}

function tickWorkers(dt){
  for(const worker of state.mine.workers){
    if(!worker.jobKey){
      worker.state='idle';
      worker.think-=dt;
      if(worker.think<=0){
        const found=chooseWorkerJob(worker);
        worker.think=found?.25:.55;
      }
    }
    if(!worker.jobKey) continue;

    const job=state.mine.jobs.find(j=>key(j.c,j.r)===worker.jobKey);
    if(!job){worker.jobKey=null;worker.path=[];worker.state='idle';worker.think=.1;continue;}

    if(worker.path?.length){
      worker.state='walking';
      if(!moveAlong(worker,dt,2.35+state.age*.15)) continue;
    }

    const wc=Math.floor(worker.x),wr=Math.floor(worker.y);
    const adjacent=Math.abs(wc-job.c)+Math.abs(wr-job.r)<=1;
    if(!adjacent){
      worker.think-=dt;
      if(worker.think<=0){
        const newPath=pathToJob(worker,job);
        worker.think=.4;
        if(newPath===null){worker.jobKey=null;worker.state='idle';continue;}
        worker.path=newPath;
      }
      continue;
    }

    worker.state='working';
    const tile=tileAt(job.c,job.r);
    const baseTime=tile==='dirt'?1.05:tile==='rock'?2.1:tile==='iron'?2.7:tile==='gold'?3.25:tile==='diamond'?4.3:1.1;
    job.progress+=dt*mineToolPower()/baseTime;
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
      cart.think-=dt;
      if(cart.think<=0){
        const target=freePileForCart(cart);
        cart.think=target?.25:.65;
        if(target){
          cart.targetKey=key(target.pile.c,target.pile.r);
          cart.path=target.path;
          cart.state='toPile';
        }
      }
    }

    if(cart.state==='toPile'){
      if(cart.path?.length&&!moveAlong(cart,dt,3.0)) continue;
      const pile=state.mine.piles.find(p=>key(p.c,p.r)===cart.targetKey);
      if(!pile||pile.amount<=0){cart.state='idle';cart.targetKey=null;cart.think=.2;continue;}
      const load=Math.min(cartCapacity(),pile.amount);
      cart.cargo=load;cart.cargoType=pile.type;
      pile.amount-=load;
      if(pile.amount<=0) state.mine.piles=state.mine.piles.filter(p=>p!==pile);
      sendCartHome(cart);
    }

    if(cart.state==='toSurface'){
      if(cart.path?.length&&!moveAlong(cart,dt,3.0)) continue;
      if(cart.cargo>0&&cart.cargoType){
        const bucket=cart.cargoType==='diamond'?'diamonds':cart.cargoType;
        state.resources[bucket]+=cart.cargo;
      }
      cart.cargo=0;cart.cargoType=null;cart.x=warehouse.c+.5;cart.y=.55;cart.state='idle';cart.path=[];cart.think=.2;
    }
  }
}

function tickMine(dt){
  tickWorkers(dt);
  tickCarts(dt);
}

function farmWorkFactor(){
  return Math.max(.25,state.farm.farmers/Math.max(1,state.farm.activeFields));
}
function harvestYield(){
  return 10+state.farm.level*4+state.age*2;
}
function fieldProgressRate(){
  return .035*farmWorkFactor()*(1+state.farm.level*.28)*(1+state.age*.08);
}
function estimatedFoodRate(){
  return state.farm.activeFields*fieldProgressRate()*harvestYield();
}

function tickFarm(dt){
  const rate=fieldProgressRate();
  for(let i=0;i<state.farm.activeFields;i++){
    state.farm.fieldProgress[i]+=dt*rate;
    if(state.farm.fieldProgress[i]>=1){
      const harvests=Math.floor(state.farm.fieldProgress[i]);
      state.farm.fieldProgress[i]-=harvests;
      state.resources.food+=harvestYield()*harvests;
    }
  }
}

function makeUnit(i,foe){
  const scale=foe?1+(state.territory-1)*.22:1+state.age*.72;
  return {
    i,foe,x:foe?90:10,hp:[65,42,145][i]*scale,max:[65,42,145][i]*scale,
    dmg:[12,18,14][i]*scale,range:i===1?24:5,speed:[8,7,4.7][i],cd:0,lane:Math.random()*18-9
  };
}

function renderCards(){
  $('troops').innerHTML=ages[state.age].units.map((name,i)=>{
    const c=troopCost(i);
    return `<button class="troop" data-unit="${i}" aria-label="Recruit ${name}">
      <span class="portrait">
        <svg viewBox="0 0 70 54" aria-hidden="true">
          <circle cx="34" cy="14" r="8" fill="#e3bb8a"/>
          <path d="M25 47l4-16h11l5 16M26 23h17v16H25z" fill="#b7d9a9" stroke="#24362f" stroke-width="2"/>
          <path d="${['M51 44V8l10 5-10 10','M51 8q19 18 0 38l5-20z','M48 20l16-4v20l-8 10-8-10z'][i]}" fill="none" stroke="#e7bd58" stroke-width="4"/>
        </svg>
      </span>
      <strong>${name}</strong>
      <small>${['FAST FRONTLINE','RANGED DAMAGE','HEAVY ARMOUR'][i]}</small>
      <span class="troop-costs">
        <span class="cost-gold">● ${c.gold}</span>
        <span class="cost-diamond">◆ ${c.diamonds}</span>
        <span class="cost-iron">⬢ ${c.iron}</span>
        <span class="cost-food">♨ ${c.food}</span>
      </span>
    </button>`;
  }).join('');
  document.querySelectorAll('[data-unit]').forEach(b=>b.onclick=()=>deploy(+b.dataset.unit));
}

function deploy(i){
  if(paused) return toast('Resume your empire first.');
  if(friendlyUnits().length>=12) return toast('Your field army is full.');
  if(!hasPopulationSpace()) return toast('You need more farmland to support another person.');
  const cost=troopCost(i);
  if(!canAfford(cost)) return toast('Your mine and farm have not supplied enough resources yet.');
  pay(cost);
  units.push(makeUnit(i,false));
  updateUI();
}

function startBattle(){
  if(running||paused||state.wins>=6) return;
  if(!friendlyUnits().length) return toast('Recruit at least one troop first.');
  running=true;home=enemy=100;spawned=0;spawnClock=0;
  friendlyUnits().forEach((u,n)=>{u.x=10-Math.min(3,n*.15);u.cd=0;});
  $('banner').textContent='The resources from your mine and farm are now on the battlefield.';
  updateUI();
}

function finishBattle(win){
  running=false;
  units=[];
  if(win){
    const goldReward=25+state.territory*12;
    const foodReward=10+state.territory*4;
    state.resources.gold+=goldReward;
    state.resources.food+=foodReward;
    state.wins++;
    if(state.territory<6) state.territory++;
    $('banner').textContent=state.wins>=6?'The frontier is yours. Your empire has won.':`Territory conquered! +${goldReward} Gold and +${foodReward} Food.`;
    toast(state.wins>=6?'You conquered all six territories!':'Territory conquered!');
  }else{
    $('banner').textContent='The army was lost. Rebuild your food supply and mine the materials for another force.';
    toast('Battle lost. Your economy survives.');
  }
  home=enemy=100;
  save();updateUI();
}

function tickBattle(dt){
  if(!running) return;
  spawnClock-=dt;
  const cap=4+state.territory*2;
  if(spawnClock<=0&&spawned<cap){
    units.push(makeUnit(spawned%3,true));
    spawned++;spawnClock=3.8;
  }

  const alive=units.filter(u=>u.hp>0);
  for(const u of alive){
    u.cd-=dt;
    let target=null,bestDist=Infinity;
    for(const v of alive){
      if(v.foe===u.foe) continue;
      const d=Math.abs(v.x-u.x);
      if(d<bestDist){bestDist=d;target=v;}
    }
    if(target&&bestDist<=u.range){
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
  else if(spawned>=cap&&!units.some(u=>u.foe)&&friendlyUnits().length) finishBattle(true);
  else if(spawned>=cap&&!friendlyUnits().length) finishBattle(false);
}

function ensureFarmDOM(){
  const grid=$('farmGrid');
  if(grid.children.length!==FIELD_COUNT){
    grid.innerHTML='';
    for(let i=0;i<FIELD_COUNT;i++){
      const plot=document.createElement('div');
      plot.className='field-plot';
      plot.dataset.field=i;
      plot.innerHTML=`<span class="field-label">FIELD ${i+1}</span>
        <div class="crop-row r3">${'<i class="crop"></i>'.repeat(5)}</div>
        <div class="crop-row r2">${'<i class="crop"></i>'.repeat(5)}</div>
        <div class="crop-row r1">${'<i class="crop"></i>'.repeat(5)}</div>
        <div class="field-progress"><span></span></div>`;
      grid.appendChild(plot);
    }
  }

  const layer=$('farmerLayer');
  if(layer.children.length!==state.farm.farmers){
    layer.innerHTML='';
    for(let i=0;i<state.farm.farmers;i++){
      const token=document.createElement('div');
      token.className='farmer-token';
      token.innerHTML='<span class="hat"></span><span class="head"></span><span class="body"></span><span class="legs"></span>';
      layer.appendChild(token);
    }
  }
}

function updateFarmVisual(){
  ensureFarmDOM();
  [...$('farmGrid').children].forEach((plot,i)=>{
    const active=i<state.farm.activeFields;
    plot.classList.toggle('locked',!active);
    plot.classList.remove('stage2','stage3');
    if(active){
      const p=state.farm.fieldProgress[i];
      if(p>.66) plot.classList.add('stage3');
      else if(p>.33) plot.classList.add('stage2');
      plot.querySelector('.field-progress span').style.width=(p*100)+'%';
    }else{
      plot.querySelector('.field-progress span').style.width='0%';
    }
  });

  const positions=[
    [16,47],[36,48],[61,47],[83,48],[18,73],[39,74],[63,73],[84,74]
  ];
  [...$('farmerLayer').children].forEach((token,i)=>{
    const field=i%Math.max(1,state.farm.activeFields);
    const [x,y]=positions[field]||[50,60];
    token.style.left=(x+(i%2)*3)+'%';
    token.style.top=(y+((i%3)-1)*3)+'%';
  });
}

function updateUI(){
  $('gold').textContent=Math.floor(state.resources.gold).toLocaleString();
  $('diamonds').textContent=Math.floor(state.resources.diamonds).toLocaleString();
  $('iron').textContent=Math.floor(state.resources.iron).toLocaleString();
  $('food').textContent=Math.floor(state.resources.food).toLocaleString();
  $('population').textContent=`${populationUsed()} / ${populationCapacity()}`;
  $('ageName').textContent=ages[state.age].name;

  $('depth').textContent=deepestTunnel()+'m';
  $('minerCount').textContent=state.mine.workers.length;
  $('cartCount').textContent=state.mine.carts.length;
  $('activeMiners').textContent=state.mine.workers.filter(w=>w.state!=='idle').length;
  $('digQueue').textContent=state.mine.jobs.length;
  $('stockpile').textContent=totalLoose();
  $('capacity').textContent=cartCapacity();
  $('logistics').textContent=totalLoose()>cartCapacity()*state.mine.carts.length*2
    ? 'Material is backing up underground. Add haulage before digging much deeper.'
    : state.mine.jobs.length
      ? 'Your miners are working through the reachable tunnel queue.'
      : 'Extend a tunnel to uncover iron, gold and diamonds.';

  const mc=minerCost(),cc=cartCost(),tc=toolCost(),capc=capacityCost();
  $('minerCost').textContent=costText(mc);
  $('cartCost').textContent=costText(cc);
  $('toolCost').textContent=costText(tc);
  $('capacityCost').textContent=costText(capc);
  $('hireMiner').disabled=paused||!canAfford(mc)||!hasPopulationSpace()||state.mine.workers.length>=10;
  $('buyCart').disabled=paused||!canAfford(cc)||state.mine.carts.length>=6;
  $('toolUpgrade').disabled=paused||!canAfford(tc)||state.mine.toolLevel>=6;
  $('capacityUpgrade').disabled=paused||!canAfford(capc)||state.mine.cartLevel>=6;

  $('farmerCount').textContent=state.farm.farmers;
  $('fieldCount').textContent=`${state.farm.activeFields} / ${FIELD_COUNT}`;
  $('foodRate').textContent='+'+estimatedFoodRate().toFixed(1)+'/s';
  $('foodStored').textContent=Math.floor(state.resources.food);
  $('populationSupported').textContent=populationCapacity();
  $('populationFill').style.width=Math.min(100,populationUsed()/populationCapacity()*100)+'%';

  const fc=farmerCost(),fieldc=fieldCost(),fuc=farmUpgradeCost();
  $('farmerCost').textContent=costText(fc);
  $('fieldCost').textContent=costText(fieldc);
  $('farmCost').textContent=costText(fuc);
  $('hireFarmer').disabled=paused||!canAfford(fc)||!hasPopulationSpace()||state.farm.farmers>=10;
  $('expandField').disabled=paused||!canAfford(fieldc)||state.farm.activeFields>=FIELD_COUNT;
  $('farmUpgrade').disabled=paused||!canAfford(fuc)||state.farm.level>=6;

  $('homeHp').textContent=Math.max(0,Math.ceil(home))+'%';
  $('enemyHp').textContent=Math.max(0,Math.ceil(enemy))+'%';
  $('armyCount').textContent=`${friendlyUnits().length} troops ready`;
  $('territory').textContent=`${state.territory} / 6`;
  $('battleStatePill').textContent=paused?'PAUSED':running?'BATTLE LIVE':state.wins>=6?'CONQUERED':'READY';
  $('attack').disabled=running||paused||state.wins>=6||!friendlyUnits().length;
  $('attack').innerHTML=state.wins>=6?'Campaign complete ✓':running?'Battle in progress':'Start battle <span>↗</span>';
  $('battleTitle').textContent=['The wild lowlands','Copper canyon','The ancient crossing','Ashen foothills','The iron frontier','Heart of the mountain'][state.territory-1];
  $('populationWarning').textContent=!hasPopulationSpace()?'Population full — expand the farm':'';

  document.querySelectorAll('[data-unit]').forEach(b=>{
    const i=+b.dataset.unit;
    b.disabled=paused||running||!canAfford(troopCost(i))||!hasPopulationSpace()||friendlyUnits().length>=12;
  });

  $('nextAge').textContent=state.age<2?`Discover the ${ages[state.age+1].name}`:'The Iron Age has dawned';
  $('evolveDescription').textContent=state.age<2
    ? 'Advance the whole empire: tougher troops, faster mining and stronger harvests.'
    : 'Your civilisation has reached its final age. Conquer all six territories to complete the campaign.';
  const ec=evolveCost();
  $('evolveRequirements').innerHTML=state.age<2
    ? Object.entries(ec).map(([k,v])=>`<span>${costText({[k]:v})}</span>`).join('')
    : '<span>Maximum age reached</span>';
  $('evolve').disabled=state.age>=2||paused||!canAfford(ec);
  document.querySelectorAll('.ages span').forEach((e,i)=>e.classList.toggle('selected',i<=state.age));

  updateFarmVisual();
}

function canvasContext(id,logicalW,logicalH){
  const c=$(id);
  const d=Math.min(devicePixelRatio||1,2);
  if(c.width!==Math.round(logicalW*d)||c.height!==Math.round(logicalH*d)){
    c.width=Math.round(logicalW*d);c.height=Math.round(logicalH*d);
  }
  const g=c.getContext('2d');
  g.setTransform(d,0,0,d,0,0);
  return g;
}

function drawGroundTile(g,x,y,c,r,base){
  g.fillStyle=base;g.fillRect(x,y,CELL+1,CELL+1);
  g.strokeStyle='#ffffff10';g.lineWidth=2;g.strokeRect(x+1,y+1,CELL-2,CELL-2);
  const n=noise(c,r,4);
  g.strokeStyle=n>.5?'#ffffff12':'#00000024';g.lineWidth=2;
  g.beginPath();
  g.moveTo(x+10+n*8,y+13);g.lineTo(x+31,y+22+n*6);g.lineTo(x+49-n*7,y+11+n*14);
  g.stroke();
  g.beginPath();g.moveTo(x+8,y+47);g.lineTo(x+28+n*9,y+39);g.lineTo(x+53,y+50);g.stroke();
}

function drawDeposit(g,x,y,type,c,r){
  const info=resourceInfo[type];
  const pts=[[15,14],[38,15],[23,35],[45,42],[14,47]];
  g.save();
  g.shadowColor=info.color;g.shadowBlur=type==='diamond'?12:6;
  g.fillStyle=info.color;
  pts.forEach(([px,py],i)=>{
    const j=(noise(c+i,r,8)-.5)*7;
    if(type==='diamond'){
      g.beginPath();g.moveTo(x+px,y+py-8);g.lineTo(x+px+7,y+py);g.lineTo(x+px,y+py+8);g.lineTo(x+px-7,y+py);g.closePath();g.fill();
    }else{
      g.beginPath();g.arc(x+px+j,y+py,6+i%2*2,0,Math.PI*2);g.fill();
    }
  });
  g.restore();
}

function drawMiner(g,w){
  const x=w.x*CELL,y=w.y*CELL;
  const working=w.state==='working';
  const bob=working?Math.sin(nowT*11+w.id)*2:0;
  g.save();
  g.translate(x,y+bob);
  g.fillStyle='#0006';g.beginPath();g.ellipse(0,18,18,6,0,0,Math.PI*2);g.fill();
  g.strokeStyle='#1a231f';g.lineWidth=5;
  g.beginPath();g.moveTo(-5,6);g.lineTo(-10,20);g.moveTo(5,6);g.lineTo(10,20);g.stroke();
  g.fillStyle='#4f765d';g.strokeStyle='#d5e5c9';g.lineWidth=2;g.fillRect(-10,-17,20,25);g.strokeRect(-10,-17,20,25);
  g.fillStyle='#e3b88c';g.beginPath();g.arc(0,-25,10,0,Math.PI*2);g.fill();
  g.fillStyle='#f0c95f';g.fillRect(-14,-35,28,8);g.fillRect(-10,-39,20,7);
  g.fillStyle='#f6e7b0';g.beginPath();g.arc(8,-33,3,0,Math.PI*2);g.fill();
  if(working){
    g.strokeStyle='#d6c18a';g.lineWidth=4;g.beginPath();g.moveTo(9,-6);g.lineTo(23,-18-Math.sin(nowT*11+w.id)*9);g.stroke();
    g.strokeStyle='#8d9a9f';g.lineWidth=3;g.beginPath();g.moveTo(17,-25);g.lineTo(29,-14);g.stroke();
  }
  g.fillStyle='#13201c';g.strokeStyle='#e7bd58';g.lineWidth=1.5;
  g.beginPath();g.arc(-16,-25,8,0,Math.PI*2);g.fill();g.stroke();
  g.fillStyle='#f4e7ba';g.font='bold 8px DM Sans';g.textAlign='center';g.fillText(w.id,-16,-22);
  g.restore();
}

function drawCart(g,cart){
  const x=cart.x*CELL,y=cart.y*CELL;
  g.save();g.translate(x,y);
  g.fillStyle='#0006';g.beginPath();g.ellipse(0,14,22,6,0,0,Math.PI*2);g.fill();
  g.fillStyle='#8a6745';g.strokeStyle='#d2ba83';g.lineWidth=2;
  g.beginPath();g.moveTo(-22,-11);g.lineTo(21,-11);g.lineTo(15,8);g.lineTo(-16,8);g.closePath();g.fill();g.stroke();
  if(cart.cargoType){
    g.fillStyle=resourceInfo[cart.cargoType].color;
    for(let i=0;i<5;i++){g.beginPath();g.arc(-12+i*6,-10-(i%2)*4,5,0,Math.PI*2);g.fill();}
  }
  g.fillStyle='#202824';g.beginPath();g.arc(-13,10,7,0,Math.PI*2);g.arc(13,10,7,0,Math.PI*2);g.fill();
  g.fillStyle='#a8b5a8';g.beginPath();g.arc(-13,10,3,0,Math.PI*2);g.arc(13,10,3,0,Math.PI*2);g.fill();
  g.restore();
}

function drawMine(){
  const g=canvasContext('mineCanvas',WORLD_W,WORLD_H);
  g.clearRect(0,0,WORLD_W,WORLD_H);

  g.fillStyle='#8fb2a2';g.fillRect(0,0,WORLD_W,CELL);
  g.fillStyle='#4b6b4d';g.fillRect(0,CELL-12,WORLD_W,12);

  for(let r=1;r<ROWS;r++){
    for(let c=0;c<COLS;c++){
      const x=c*CELL,y=r*CELL,tile=tileAt(c,r),visible=visibleCell(c,r);
      if(tile==='tunnel'){
        g.fillStyle='#171d19';g.fillRect(x,y,CELL+1,CELL+1);
        g.fillStyle='#263129';g.fillRect(x,y+CELL-8,CELL,8);
        g.strokeStyle='#725c3c';g.lineWidth=5;
        if((c+r)%2===0){
          g.beginPath();g.moveTo(x+8,y+7);g.lineTo(x+8,y+CELL-7);g.moveTo(x+CELL-8,y+7);g.lineTo(x+CELL-8,y+CELL-7);g.moveTo(x+8,y+9);g.lineTo(x+CELL-8,y+9);g.stroke();
        }
        continue;
      }

      drawGroundTile(g,x,y,c,r,tile==='dirt'?'#54452f':'#3f4139');
      if(visible&&isResource(tile)) drawDeposit(g,x,y,tile,c,r);
      if(!visible){g.fillStyle='#050807e8';g.fillRect(x,y,CELL+1,CELL+1);}
    }
  }

  for(const job of state.mine.jobs){
    const x=job.c*CELL,y=job.r*CELL;
    g.fillStyle='#f0cf6f24';g.fillRect(x+4,y+4,CELL-8,CELL-8);
    g.strokeStyle=job.progress>0?'#f4d77f':'#cfb96e';g.lineWidth=3;g.setLineDash([8,5]);g.strokeRect(x+5,y+5,CELL-10,CELL-10);g.setLineDash([]);
    if(job.progress>0){
      g.fillStyle='#090d0b';g.fillRect(x+7,y+CELL-11,CELL-14,6);
      g.fillStyle='#e7bd58';g.fillRect(x+7,y+CELL-11,(CELL-14)*Math.min(1,job.progress),6);
    }
  }

  for(const pile of state.mine.piles){
    const x=(pile.c+.5)*CELL,y=(pile.r+.77)*CELL,info=resourceInfo[pile.type];
    g.fillStyle=info.color;
    const count=Math.min(8,Math.max(3,Math.ceil(pile.amount/2)));
    for(let i=0;i<count;i++){g.beginPath();g.arc(x-18+i*5,y-(i%3)*5,5,0,Math.PI*2);g.fill();}
    g.fillStyle='#101814dd';g.fillRect(x-16,y-29,32,16);
    g.fillStyle='#fff0c8';g.font='bold 11px DM Sans';g.textAlign='center';g.fillText(pile.amount,x,y-17);
  }

  const wx=warehouse.c*CELL;
  g.fillStyle='#263b31';g.fillRect(wx-52,5,150,48);
  g.fillStyle='#e7bd58';g.fillRect(wx-15,15,70,25);
  g.fillStyle='#17231e';g.fillRect(wx-6,21,52,19);
  g.fillStyle='#f1edd9';g.font='bold 13px Space Grotesk';g.textAlign='center';g.fillText('STORE',wx+20,13);

  for(const cart of state.mine.carts) drawCart(g,cart);
  for(const worker of state.mine.workers) drawMiner(g,worker);

  g.strokeStyle='#ffffff0b';g.lineWidth=1;
  for(let c=0;c<=COLS;c++){g.beginPath();g.moveTo(c*CELL,0);g.lineTo(c*CELL,WORLD_H);g.stroke();}
  for(let r=0;r<=ROWS;r++){g.beginPath();g.moveTo(0,r*CELL);g.lineTo(WORLD_W,r*CELL);g.stroke();}
}

function poly(g,pts,color){
  g.fillStyle=color;g.beginPath();pts.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fill();
}

function drawBattle(){
  const canvas=$('battleCanvas');
  const rect=canvas.getBoundingClientRect();
  if(rect.width<2||rect.height<2) return;
  const w=rect.width,h=rect.height,d=Math.min(devicePixelRatio||1,2);
  if(canvas.width!==Math.round(w*d)||canvas.height!==Math.round(h*d)){canvas.width=Math.round(w*d);canvas.height=Math.round(h*d);}
  const g=canvas.getContext('2d');g.setTransform(d,0,0,d,0,0);

  const sky=g.createLinearGradient(0,0,0,h);
  sky.addColorStop(0,'#b8d3c0');sky.addColorStop(.52,'#a5b990');sky.addColorStop(1,'#687b57');
  g.fillStyle=sky;g.fillRect(0,0,w,h);
  g.fillStyle='#ead58c';g.beginPath();g.arc(w*.72,h*.2,28,0,Math.PI*2);g.fill();
  poly(g,[[0,h*.58],[w*.18,h*.28],[w*.35,h*.55],[w*.53,h*.24],[w*.72,h*.52],[w*.86,h*.34],[w,h*.49],[w,h],[0,h]],'#839c76');
  poly(g,[[0,h*.67],[w*.2,h*.5],[w*.43,h*.66],[w*.63,h*.45],[w*.82,h*.61],[w,h*.49],[w,h],[0,h]],'#5f765a');
  g.fillStyle='#858267';g.fillRect(0,h*.76,w,h*.24);

  function base(x,foe){
    const y=h*.74;
    g.fillStyle=foe?'#6f5044':'#b8ac84';g.fillRect(x-29,y-42,58,47);
    poly(g,[[x-36,y-42],[x,y-73],[x+36,y-42]],foe?'#845747':'#d5c899');
    g.fillStyle='#314237';g.fillRect(x-8,y-20,16,25);
    g.strokeStyle='#29372f';g.lineWidth=4;g.beginPath();g.moveTo(x+25,y-75);g.lineTo(x+25,y-32);g.stroke();
    poly(g,[[x+25,y-75],[x+50,y-68],[x+25,y-57]],foe?'#dc8d67':'#e1c758');
  }
  base(w*.08,false);base(w*.92,true);

  for(const u of units){
    const x=u.x/100*w,y=h*.78+u.lane,bob=running?Math.sin(nowT*9+u.lane)*2:0;
    g.fillStyle='#0003';g.beginPath();g.ellipse(x,y+11,11,4,0,0,Math.PI*2);g.fill();
    g.strokeStyle='#28362f';g.lineWidth=4;g.beginPath();g.moveTo(x,y-5+bob);g.lineTo(x-5,y+10);g.moveTo(x,y-5+bob);g.lineTo(x+5,y+10);g.stroke();
    g.fillStyle=u.foe?'#b96f55':['#c6c493','#b2c1b8','#aeb7aa'][state.age];g.fillRect(x-7,y-19+bob,14,u.i===2?18:14);
    g.fillStyle='#e2b98b';g.beginPath();g.arc(x,y-27+bob,6,0,Math.PI*2);g.fill();
    g.strokeStyle=u.foe?'#704535':'#e0cf9c';g.lineWidth=u.i===2?7:3;g.beginPath();g.moveTo(x+(u.foe?-10:10),y-7);g.lineTo(x+(u.foe?-10:10),y-29);g.stroke();
    g.fillStyle='#1d2d27';g.fillRect(x-12,y-40,24,4);g.fillStyle=u.foe?'#e79673':'#bce59e';g.fillRect(x-12,y-40,24*Math.max(0,u.hp/u.max),4);
  }
}

function canvasCell(e){
  const rect=$('mineCanvas').getBoundingClientRect();
  const x=(e.clientX-rect.left)/rect.width*WORLD_W;
  const y=(e.clientY-rect.top)/rect.height*WORLD_H;
  return {c:Math.floor(x/CELL),r:Math.floor(y/CELL)};
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
  pointerId=e.pointerId;
  mineCanvas.setPointerCapture(pointerId);
  if(isWalkable(cell.c,cell.r)){
    pointerMode='pan';panStartY=e.clientY;panStartScroll=mineViewport.scrollTop;
  }else{
    pointerMode='dig';lastPaintCell=cell;
    if(!queueCell(cell.c,cell.r)&&!jobAt(cell.c,cell.r)&&!connectedToDigPath(cell.c,cell.r)){
      toast('Start your dig from the edge of an existing tunnel.');
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
  if(!lastPaintCell||cell.c!==lastPaintCell.c||cell.r!==lastPaintCell.r){
    for(const p of lineCells(lastPaintCell||cell,cell)) queueCell(p.c,p.r);
    lastPaintCell=cell;
  }
});
function endPointer(e){
  if(e.pointerId!==pointerId) return;
  pointerMode=null;pointerId=null;lastPaintCell=null;save();
}
mineCanvas.addEventListener('pointerup',endPointer);
mineCanvas.addEventListener('pointercancel',endPointer);

$('clearQueue').onclick=clearQueue;

$('hireMiner').onclick=()=>{
  const cost=minerCost();
  if(paused||!canAfford(cost)) return;
  if(!hasPopulationSpace()) return toast('Expand the farm before adding more people.');
  if(state.mine.workers.length>=10) return;
  pay(cost);
  const i=state.mine.workers.length;
  state.mine.workers.push({id:i+1,x:4.25+(i%3)*.28,y:.55,state:'idle',jobKey:null,path:[],think:.1});
  toast('A new miner joined the population.');
  updateUI();save();
};
$('buyCart').onclick=()=>{
  const cost=cartCost();
  if(paused||!canAfford(cost)||state.mine.carts.length>=6) return;
  pay(cost);
  const i=state.mine.carts.length;
  state.mine.carts.push({id:i+1,x:4.7+(i%3)*.16,y:.62,state:'idle',path:[],cargo:0,cargoType:null,targetKey:null,think:.1});
  toast('A new cart is ready to haul.');
  updateUI();save();
};
$('toolUpgrade').onclick=()=>{
  const cost=toolCost();
  if(paused||!canAfford(cost)||state.mine.toolLevel>=6) return;
  pay(cost);state.mine.toolLevel++;toast('Mining speed improved.');updateUI();save();
};
$('capacityUpgrade').onclick=()=>{
  const cost=capacityCost();
  if(paused||!canAfford(cost)||state.mine.cartLevel>=6) return;
  pay(cost);state.mine.cartLevel++;toast('Cart capacity increased.');updateUI();save();
};

$('hireFarmer').onclick=()=>{
  const cost=farmerCost();
  if(paused||!canAfford(cost)) return;
  if(!hasPopulationSpace()) return toast('Open another field before adding more people.');
  if(state.farm.farmers>=10) return;
  pay(cost);state.farm.farmers++;ensureFarmDOM();toast('A new farmer joined the population.');updateUI();save();
};
$('expandField').onclick=()=>{
  const cost=fieldCost();
  if(paused||!canAfford(cost)||state.farm.activeFields>=FIELD_COUNT) return;
  pay(cost);state.farm.activeFields++;toast('New farmland opened. Population support increased.');updateUI();save();
};
$('farmUpgrade').onclick=()=>{
  const cost=farmUpgradeCost();
  if(paused||!canAfford(cost)||state.farm.level>=6) return;
  pay(cost);state.farm.level++;toast('Harvest yield and population support improved.');updateUI();save();
};

$('attack').onclick=startBattle;
$('evolve').onclick=()=>{
  if(state.age>=2||paused) return;
  const cost=evolveCost();
  if(!canAfford(cost)) return;
  pay(cost);state.age++;
  friendlyUnits().forEach(u=>{u.hp*=1.45;u.max*=1.45;u.dmg*=1.45;});
  renderCards();toast(`Welcome to the ${ages[state.age].name}!`);updateUI();save();
};

$('pause').onclick=()=>{
  paused=!paused;
  $('pause').textContent=paused?'▶':'Ⅱ';
  $('pause').setAttribute('aria-label',paused?'Resume game':'Pause game');
  updateUI();
};
$('reset').onclick=()=>{
  if(!confirm('Start a new empire? This resets all Core Empires progress.')) return;
  state=freshState();
  units=[];running=false;paused=false;home=enemy=100;spawned=0;spawnClock=0;
  $('pause').textContent='Ⅱ';
  $('banner').textContent='Mine materials. Grow food. Build the army that wins the frontier.';
  ensureFarmDOM();renderCards();updateUI();save();mineViewport.scrollTop=0;
};

$('menu').onclick=()=>$('gameMenu').showModal();
$('closeMenu').onclick=()=>$('gameMenu').close();

document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{
  document.body.dataset.tab=b.dataset.tab;
  document.querySelectorAll('[data-tab]').forEach(n=>n.classList.toggle('active',n===b));
  last=performance.now();
  if(b.dataset.tab==='mine') drawMine();
  if(b.dataset.tab==='farm') updateFarmVisual();
  if(b.dataset.tab==='battle') drawBattle();
});

function frame(now){
  const dt=Math.min((now-last)/1000,.08);
  last=now;

  if(!paused){
    nowT+=dt;
    mineAccumulator+=dt;
    farmAccumulator+=dt;

    let steps=0;
    while(mineAccumulator>=.05&&steps<3){tickMine(.05);mineAccumulator-=.05;steps++;}
    steps=0;
    while(farmAccumulator>=.1&&steps<2){tickFarm(.1);farmAccumulator-=.1;steps++;}

    tickBattle(dt);

    saveClock+=dt;
    if(saveClock>=2.5){save();saveClock=0;}
  }

  uiClock+=dt;
  if(uiClock>=.18){updateUI();uiClock=0;}

  drawClock+=dt;
  const tab=document.body.dataset.tab;
  if(tab==='mine'&&drawClock>=1/30){drawMine();drawClock=0;}
  else if(tab==='battle'){drawBattle();drawClock=0;}

  requestAnimationFrame(frame);
}

ensureFarmDOM();
renderCards();
updateUI();
requestAnimationFrame(frame);
document.addEventListener('visibilitychange',()=>{last=performance.now();save();});
window.addEventListener('beforeunload',save);
