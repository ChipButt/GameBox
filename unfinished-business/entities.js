import {WORLD} from './world.js';
import {overlap,rayBlocked} from './model.js';
const STEP=24,COLS=Math.ceil(WORLD.width/STEP),ROWS=Math.ceil(WORLD.height/STEP);
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export const clearSegment=(a,b,blocks,r=9)=>{const n=Math.max(1,Math.ceil(distance(a,b)/6));for(let i=0;i<=n;i++)if(blocks.some(o=>overlap(a.x+(b.x-a.x)*i/n,a.y+(b.y-a.y)*i/n,o,r)))return false;return true;};
export function navigation(blocks){
 const free=new Uint8Array(COLS*ROWS);for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++)free[y*COLS+x]=!blocks.some(b=>overlap(x*STEP+12,y*STEP+12,b,10));
 const point=id=>({x:(id%COLS)*STEP+12,y:Math.floor(id/COLS)*STEP+12});
 function nearest(p,visible=false){let best=-1,d=Infinity;const cx=Math.floor(p.x/STEP),cy=Math.floor(p.y/STEP);for(let y=Math.max(0,cy-4);y<=Math.min(ROWS-1,cy+4);y++)for(let x=Math.max(0,cx-4);x<=Math.min(COLS-1,cx+4);x++){const id=y*COLS+x,q=point(id),v=distance(p,q);if(free[id]&&v<d&&(!visible||clearSegment(p,q,blocks))){best=id;d=v}}return best;}
 function path(from,to){const a=nearest(from,true),b=nearest(to);if(a<0||b<0)return null;const prev=new Int32Array(free.length).fill(-1),queue=new Int32Array(free.length);let end=0;queue[end++]=a;prev[a]=a;for(let i=0;i<end&&prev[b]<0;i++){const id=queue[i],x=id%COLS;for(const n of [x? id-1:-1,x<COLS-1?id+1:-1,id-COLS,id+COLS]){if(n<0||n>=free.length||!free[n]||prev[n]>=0)continue;prev[n]=id;queue[end++]=n;}}
 if(prev[b]<0)return null;const result=[];for(let id=b;id!==a;id=prev[id])result.push(point(id));result.push(point(a));result.reverse();if(clearSegment(result.at(-1),to,blocks))result.push({...to});return result;}
 return {path,nearest:p=>{const id=nearest(p);return id<0?null:point(id)}};
}
export function createEntities(nav,level=0){
 const neighbourhood=[
 ['human','Tidying the lounge',52,[[310,1770,1.1,0],[700,1770,.7,-1.57],[700,1700,1.2,3.14],[350,1700,.8,1.57]]],
 ['human','Checking the windows',49,[[640,1900,.8,0],[700,2100,1.1,1.57],[580,2100,.7,3.14],[580,1900,1,-1.57]]],
 ['human','Working on the car',55,[[1280,1780,1.5,3.14],[1310,1920,.8,1.57],[1470,1860,1.2,-1.57],[1280,1860,.7,3.14]]],
 ['human','Delivering letters',68,[[300,1420,.5,1.57],[850,1420,.5,1.57],[970,1570,.5,0],[970,1420,.5,3.14],[560,1420,.5,3.14]]],
 ['human','Walking to the shops',61,[[360,1520,.6,-1.57],[970,1380,.4,0],[1230,1320,1.1,-1.57],[1520,1290,1.4,3.14],[970,1380,.5,3.14]]],
 ['human','Sweeping storefronts',48,[[1250,1440,1.2,1.57],[1450,1470,.7,0],[1750,1440,1.1,-1.57],[1450,1400,.7,3.14]]],
 ['human','Bank clerk',51,[[1640,950,1.1,-1.57],[1850,960,.8,0],[1840,1120,.9,1.57],[1620,1090,.7,3.14]]],
 ['human','Restocking shelves',56,[[1450,920,1.3,3.14],[1450,1170,.7,1.57],[1230,1180,1.1,3.14],[1210,970,.7,-1.57]]],
 ['human','Evening jog',82,[[1060,680,.2,0],[1900,680,.2,1.57],[1900,720,.2,3.14],[1060,720,.2,-1.57]]],
 ['human','River inspection',59,[[2020,850,.7,0],[2130,1000,.8,1.57],[2110,1440,.8,0],[2020,1400,.6,-1.57]]],
 ['human','Looking for keys',50,[[460,740,.8,0],[740,790,1.4,3.14],[920,740,.8,1.57],[740,700,1,0]]],
 ['human','Park keeper',49,[[1200,180,1.2,1.57],[1800,250,.7,0],[1800,550,1.2,3.14],[1180,550,.7,-1.57]]],
 ['human','Churchyard rounds',48,[[240,230,.9,0],[750,250,1.1,1.57],[740,570,.8,3.14],[220,580,.8,-1.57]]],
 ['human','Collecting apples',47,[[1700,1730,1.1,0],[2070,1740,.8,1.57],[2070,2070,1.1,3.14],[1700,2100,.7,-1.57]]],
 ['human','Taking bins to collection',60,[[700,2260,.5,0],[1000,2260,.5,-1.57],[1360,2220,.9,3.14],[1040,2300,.5,0],[520,2220,.5,3.14]]],
 ['human','Gardener',45,[[430,1020,1.3,0],[780,980,.8,1.57],[790,1270,1.2,3.14],[400,1250,.8,-1.57]]],
 ['human','Crossing guard',54,[[1000,260,.8,0],[1000,550,.8,3.14],[1060,550,.6,1.57],[1060,260,.8,-1.57]]],
 ['human','Dock attendant',56,[[2050,550,.8,0],[2160,550,.7,-1.57],[2160,390,.9,3.14],[2050,400,.7,1.57]]],
 ['human','Commuting home',67,[[1860,820,.4,3.14],[1500,1420,.4,1.57],[970,1550,.4,3.14],[520,1480,1.6,1.57],[970,1550,.4,0],[1500,1420,.4,-1.57]]],
 ['human','Shop delivery',64,[[2140,1510,.5,3.14],[1820,1450,.5,3.14],[1520,1320,1.2,-1.57],[1210,1410,.6,0],[1520,1320,.6,0],[1820,1450,.4,0]]],
 ['human','Walking the dog route',63,[[240,820,.5,0],[920,800,.4,0],[1090,650,.4,-1.57],[1510,650,.5,0],[1090,650,.4,3.14],[920,800,.4,1.57]]],
 ['human','Closing up shop',58,[[1220,870,1.2,0],[1460,870,.8,0],[1740,880,1.2,0],[1910,1030,.8,1.57],[1740,1220,1.1,3.14],[1420,1220,.8,3.14]]],
 ['human','Going to the park',62,[[560,1480,.5,-1.57],[920,1400,.4,-1.57],[1090,650,.4,-1.57],[1320,560,1.4,0],[1600,420,1.3,0],[1320,560,.5,3.14],[1090,650,.4,1.57]]],
 ['human','Returning from work',69,[[1920,1350,.4,1.57],[1760,1510,.4,1.57],[1550,1560,.4,3.14],[970,1580,.5,3.14],[700,1580,1.3,3.14],[970,1580,.4,0],[1550,1560,.4,0]]],
 ['human','Street cleaner',53,[[220,2280,.7,0],[650,2280,.6,0],[1050,2280,.6,0],[1500,2280,.6,0],[1960,2280,.8,3.14],[1500,2280,.6,3.14],[1050,2280,.6,3.14],[650,2280,.6,3.14]]],
 ['human','Market runner',76,[[1080,720,.25,0],[1320,730,.25,0],[1560,720,.25,0],[1810,730,.25,0],[2050,720,.35,3.14],[1810,730,.25,3.14],[1560,720,.25,3.14],[1320,730,.25,3.14]]],
 ['human','Neighbour visiting',57,[[280,2080,1.2,0],[520,1840,.7,-1.57],[910,1580,.5,0],[1160,1510,.8,0],[910,1580,.5,3.14],[520,1840,.7,1.57]]],
 ['human','Late shift worker',71,[[2100,1280,.4,3.14],[1880,1320,.4,3.14],[1540,1460,.4,1.57],[1320,1640,.5,1.57],[1320,2050,1.1,3.14],[1320,1640,.4,-1.57],[1540,1460,.4,-1.57],[1880,1320,.4,0]]]
 ];
 const graveyard=[
 ['human','Gravedigger',58,[[1810,1740,.8,0],[2050,1740,.6,1.57],[2050,2070,1.2,3.14],[1810,2050,.8,-1.57]]],
 ['human','Groundskeeper',55,[[1030,1760,.7,0],[1450,1760,.6,-1.57],[1460,1460,.9,3.14],[1030,1460,.6,1.57]]],
 ['human','Gardener',52,[[1640,320,.8,0],[2050,320,.7,1.57],[2050,620,1,3.14],[1640,600,.7,-1.57]]],
 ['human','Funeral director',57,[[1160,1180,.6,0],[1460,1180,.8,1.57],[1500,1360,.8,3.14],[1180,1360,.7,-1.57]]],
 ['human','Mourner',49,[[1060,980,1.4,0],[1260,980,1.1,0],[1450,1010,1.3,3.14],[1220,1040,1.1,3.14]]],
 ['human','Mourner',47,[[1040,1240,1.2,0],[1300,1240,1,0],[1490,1280,1.1,3.14],[1210,1300,1,3.14]]],
 ['human','Cemetery visitor',54,[[350,1500,.7,0],[800,1500,.9,-1.57],[820,900,.7,3.14],[390,900,.9,1.57]]],
 ['human','Flower delivery',66,[[1320,700,.4,1.57],[1320,900,.5,1.57],[1420,1100,1.1,3.14],[1280,900,.5,-1.57]]],
 ['human','Caretaker',56,[[1180,540,.8,0],[1530,540,.7,0],[1570,740,.8,3.14],[1180,740,.7,-1.57]]],
 ['human','Funeral guest',50,[[1760,900,1,0],[2080,900,.8,1.57],[2080,1420,1.1,3.14],[1760,1420,.8,-1.57]]],
 ['human','Path sweeper',60,[[250,760,.5,0],[900,760,.5,0],[1320,760,.5,0],[1900,760,.5,3.14],[1320,760,.5,3.14],[900,760,.5,3.14]]],
 ['human','Grounds assistant',59,[[240,2200,.5,0],[860,2200,.5,0],[1320,2200,.6,3.14],[760,2200,.5,3.14]]]
 ];
 const base=level===0?graveyard:neighbourhood;
 const extra=[
 ['human','Canal courier',72,[[240,1500,.4,0],[720,1500,.4,0],[1120,1510,.4,0],[1540,1460,.4,-1.57],[1980,1380,.5,1.57],[1540,1460,.4,3.14],[1120,1510,.4,3.14],[720,1500,.4,3.14]]],
 ['human','Cafe runner',68,[[560,620,.4,0],[920,640,.4,0],[1320,650,.5,0],[1760,660,.5,3.14],[1320,650,.4,3.14],[920,640,.4,3.14]]],
 ['human','Security patrol',62,[[820,930,.5,0],[1150,920,.5,0],[1510,930,.5,0],[1900,920,.5,1.57],[1900,1280,.6,3.14],[1510,1280,.5,3.14],[1150,1280,.5,3.14],[820,1280,.5,-1.57]]],
 ['human','Night porter',66,[[380,350,.5,0],[820,360,.5,0],[1180,420,.5,0],[1640,420,.5,0],[2060,380,.7,3.14],[1640,420,.5,3.14],[1180,420,.5,3.14],[820,360,.5,3.14]]]
 ];
 const wanted=20+level*3;
 const source=level===0?[...graveyard,...graveyard.slice(0,8).map(r=>[r[0],r[1]+' · second round',r[2]+6,r[3].map(([x,y,w,f])=>[Math.min(2140,x+55),Math.max(180,y-45),Math.max(.2,w*.8),f])])]:[...base,...extra,...base.slice(0,8).map(r=>[r[0],r[1]+' II',r[2]+8,r[3].map(([x,y,w,f])=>[Math.min(2180,x+70),Math.max(150,y-55),Math.max(.2,w*.75),f])])];
 const routines=source.slice(0,Math.min(source.length,wanted));
 const entities=[];
 for(const [kind,task,speed,points] of routines){
  const id=entities.length,route=points.map(([x,y,wait,face])=>{const n=nav.nearest({x,y});return n?{...n,wait,face}:null}).filter(Boolean);
  if(route.length<2)continue;
  entities.push({id,kind,task,speed:speed+level*4,route,...route[0],index:0,state:'wait',wait:route[0].wait+id*.07,range:148+level*7+(id%4)*12,angle:route[0].face,half:.61,frozen:0,path:null,search:0,cooldown:0,walk:0,tint:['#b18f78','#7b96a0','#8f9671','#9d8299'][id%4]});
 }
 const cats=level===0?[
  ['Prowling between graves',70,[[360,1810,.4,0],[760,1780,.4,-1.57],[760,1420,.4,3.14],[360,1450,.4,1.57]]],
  ['Stalking the funeral lawn',74,[[1030,1390,.4,0],[1490,1380,.4,-1.57],[1490,1000,.4,3.14],[1080,1010,.4,1.57]]],
  ['Hunting by the chapel',80,[[1660,1500,.4,0],[2110,1500,.4,-1.57],[2110,860,.4,3.14],[1680,860,.4,1.57]]]
 ]:[
  ['Prowling the garden',68,[[430,1230,.5,0],[820,1130,.5,1.57],[930,1390,.5,3.14],[450,1410,.5,-1.57]]],
  ['Hunting behind the garage',72,[[1100,2220,.5,0],[1500,2260,.5,1.57],[1640,2150,.5,3.14],[1530,2210,.5,-1.57]]],
  ['Crossing rooftops',78,[[1030,700,.4,0],[1370,700,.4,0],[1690,720,.4,1.57],[1780,980,.5,3.14],[1320,980,.4,3.14]]],
  ['Market prowler',82,[[820,1380,.4,0],[1190,1370,.4,0],[1580,1380,.4,0],[1940,1370,.4,3.14],[1580,1370,.4,3.14],[1190,1370,.4,3.14]]]
 ];
 for(const [task,speed,points] of cats.slice(0,2+Math.ceil(level/2))){
  const id=entities.length,route=points.map(([x,y,wait,face])=>{const n=nav.nearest({x,y});return n?{...n,wait,face}:null}).filter(Boolean);if(route.length<2)continue;
  entities.push({id,kind:'cat',task,speed:speed+level*4,route,...route[0],index:0,state:'wait',wait:route[0].wait,range:125+level*6,angle:route[0].face,half:.85,frozen:0,path:null,search:0,cooldown:0,walk:0,tint:'#222'});
 }
 const cyclePoints=level===0?[[180,2310,.05,0],[2280,2310,.05,-1.57],[2280,760,.05,3.14],[180,760,.05,1.57]]:[[250,1460,.05,0],[920,1460,.05,0],[1040,1380,.05,-1.57],[1040,720,.05,-1.57],[1120,650,.05,0],[2020,650,.05,0],[2140,760,.05,1.57],[2140,1450,.05,1.57],[2050,1540,.05,3.14],[1580,1540,.05,3.14],[1500,1600,.05,1.57],[1500,2240,.05,1.57],[1380,2300,.05,3.14],[480,2300,.05,3.14],[260,2200,.05,-1.57]];
 const cycleRoute=cyclePoints.map(([x,y,wait,face])=>{const n=nav.nearest({x,y});return n?{...n,wait,face}:null}).filter(Boolean);
 if(cycleRoute.length>4){const id=entities.length;entities.push({id,kind:'cyclist',task:'Cycling the neighbourhood',speed:145+level*10,route:cycleRoute,...cycleRoute[0],index:0,state:'wait',wait:.05,range:165+level*7,angle:cycleRoute[0].face,half:.56,frozen:0,path:null,search:0,cooldown:0,walk:0,tint:'#6f8798'});}
 const cameras=[[904,1530,0,'House exterior'],[1040,1640,2.3,'Garage corner'],[1170,738,-1.1,'Shop entrance'],[1900,800,2.2,'Bank security'],[1580,1250,-.9,'Bank security'],[1948,1290,1.1,'Bank exterior'],[840,720,.2,'Main crossing'],[1500,720,2.9,'Upper street'],[2160,1450,2.3,'East lane'],[900,1450,-.2,'Lower crossing'],[1750,1550,-1.8,'Freight yard'],[2050,620,1.5,'North approach']];
 if(level>0)for(const [x,y,angle,task] of cameras.slice(0,6+level*2)){const n=nav.nearest({x,y});if(!n)continue;entities.push({id:entities.length,kind:'camera',task,...n,angle,baseAngle:angle,clock:0,range:210+level*12,half:.48,frozen:0});}
 return entities;
}
function follow(e,dt,blocks){if(!e.path?.length)return true;let budget=e.speed*dt;while(budget>0&&e.path.length){const target=e.path[0],d=distance(e,target);if(d<.2){e.path.shift();continue}const amount=Math.min(d,budget),next={x:e.x+(target.x-e.x)/d*amount,y:e.y+(target.y-e.y)/d*amount};if(!clearSegment(e,next,blocks)){e.path=null;return false}e.angle=Math.atan2(target.y-e.y,target.x-e.x);e.x=next.x;e.y=next.y;e.walk+=amount;budget-=amount;if(amount===d)e.path.shift();}return !e.path.length;}
export function investigate(entities,nav,source,max=2){let count=0;for(const e of entities.filter(e=>e.kind==='human'&&e.frozen<=0&&e.state!=='investigate'&&e.state!=='search'&&distance(e,source)<560).sort((a,b)=>distance(a,source)-distance(b,source))){const path=nav.path(e,source);if(!path)continue;e.path=path;e.state='investigate';e.search=0;e.wait=0;e.timeout=70;count++;if(count>=max)break;}return count;}
export function updateEntities(entities,nav,blocks,dt){for(const e of entities){if(e.frozen>0){e.frozen=Math.max(0,e.frozen-dt);continue}e.animationTime=(e.animationTime||0)+dt;if(e.kind==='camera'){e.clock+=dt;e.angle=e.baseAngle+Math.sin(e.clock*.42)*.62;continue}e.cooldown=Math.max(0,e.cooldown-dt);e.meow=Math.max(0,(e.meow||0)-dt);if(e.state==='wait'||e.state==='search'){e.wait-=dt;e.angle+=dt*(e.kind==='cat'?1.1:.7);if(e.wait<=0){if(e.state==='search'){e.state='return';e.path=nav.path(e,e.route[e.index]);}else{e.index=(e.index+1)%e.route.length;e.state='routine';e.path=nav.path(e,e.route[e.index]);}}continue}
 if(!e.path){e.path=nav.path(e,e.route[e.index]);if(e.state==='investigate')e.state='return';if(!e.path){e.state='wait';e.wait=1;continue}}
 if(e.state==='investigate'){e.timeout-=dt;if(e.timeout<=0){e.state='return';e.path=nav.path(e,e.route[e.index]);continue}}
 if(follow(e,dt,blocks)){if(e.state==='investigate'){e.state='search';e.wait=3.5}else{e.state='wait';e.wait=e.route[e.index].wait;e.angle=e.route[e.index].face}}
}}
export function sees(e,target,blocks,invisible=false){if(invisible||e.frozen>0)return false;const dx=target.x-e.x,dy=target.y-e.y,angle=Math.atan2(dy,dx),delta=Math.atan2(Math.sin(angle-e.angle),Math.cos(angle-e.angle));return Math.hypot(dx,dy)<e.range&&Math.abs(delta)<e.half&&!rayBlocked(e.x,e.y,target.x,target.y,blocks);}
export function resolveSightings(entities,target,blocks,effects,invisible,alert){let danger=false,blocked=false;for(const e of entities){if(!sees(e,target,blocks,invisible))continue;if(effects.stiff>0){effects.stiff--;e.frozen=8;blocked=true;continue}if(e.kind==='cat'){if(e.cooldown<=0){e.cooldown=9;e.meow=1.5;alert({x:e.x,y:e.y},1)}continue}danger=true;}return {danger,blocked};}
export function createTokens(nav,level=0){
 const points=[[430,2100],[800,1770],[1380,2070],[830,970],[370,1240],[1220,1210],[1840,1190],[1850,470],[730,560],[2100,2100],[1670,1880],[1940,690],[610,1870],[1460,910],[520,430],[2050,980]];
 const rewards=['echo25','speed','stiff','echo50','refill','echo25','speed','stiff','echo25','refill','echo50','speed','stiff','echo25','refill','echo50'];
 return points.map(([x,y],id)=>({id,...nav.nearest({x,y}),reward:rewards[(id+level*3)%rewards.length],secret:id>=12,collected:false})).filter(t=>Number.isFinite(t.x)&&Number.isFinite(t.y));
}
export function collectTokens(tokens,ghost,effects,run,maxEnergy){
 const messages=[];
 for(const token of tokens){
  if(token.collected||distance(token,ghost)>21)continue;
  token.collected=true;
  if(token.reward==='speed'){effects.boost=10;messages.push('A cold rush surges through you · speed boosted.')}
  else if(token.reward==='refill'){
   if(run.invisibility>0){effects.energy=maxEnergy;messages.push('Your outline sharpens · invisibility restored.')}
   else{run.echoes+=20;messages.push('The token dissolves into 20 Echoes.')}
  }
  else if(token.reward==='stiff'){effects.stiff++;messages.push('Scared Stiff · your next witness freezes.')}
  else{const amount=token.reward==='echo50'?50:25;run.echoes+=amount;messages.push(`A hidden cache releases ${amount} Echoes.`)}
 }
 return messages;
}
