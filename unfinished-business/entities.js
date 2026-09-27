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
export function createEntities(nav){
 const routines=[
 ['human','Tidying the lounge',34,[[310,1770,2,0],[700,1770,1,-1.57],[700,1700,3,3.14],[350,1700,1,1.57]]],
 ['human','Checking the windows',29,[[640,1900,3,0],[700,2100,2,1.57],[580,2100,1,3.14],[580,1900,2,-1.57]]],
 ['human','Working on the car',38,[[1280,1780,4,3.14],[1310,1920,2,1.57],[1470,1860,3,-1.57],[1280,1860,1,3.14]]],
 ['human','Delivering letters',48,[[300,1420,1,1.57],[850,1420,2,1.57],[970,1570,1,0],[970,1420,2,3.14]]],
 ['human','Walking the block',43,[[970,900,1,0],[970,1380,1,1.57],[1100,1380,2,0],[1100,900,1,3.14]]],
 ['human','Sweeping the pavement',27,[[1250,1440,3,1.57],[1450,1470,2,0],[1750,1440,3,-1.57],[1450,1400,2,3.14]]],
 ['human','Counting the bank tills',31,[[1640,950,4,-1.57],[1850,960,3,0],[1840,1120,2,1.57],[1620,1090,2,3.14]]],
 ['human','Checking the shop shelves',35,[[1450,920,4,3.14],[1450,1170,2,1.57],[1230,1180,2,3.14],[1210,970,3,-1.57]]],
 ['human','Evening jog',64,[[1060,680,0,0],[1900,680,1,1.57],[1900,720,0,3.14],[1060,720,1,-1.57]]],
 ['human','Inspecting the riverbank',41,[[2020,850,3,0],[2130,1000,2,1.57],[2110,1440,3,0],[2020,1400,1,-1.57]]],
 ['human','Looking for keys',33,[[460,740,2,0],[740,790,4,3.14],[920,740,2,1.57],[740,700,1,0]]],
 ['human','Park keeper',30,[[1200,180,4,1.57],[1800,250,3,0],[1800,550,4,3.14],[1180,550,2,-1.57]]],
 ['human','Churchyard rounds',32,[[240,230,3,0],[750,250,4,1.57],[740,570,3,3.14],[220,580,3,-1.57]]],
 ['human','Collecting apples',28,[[1700,1730,4,0],[2070,1740,3,1.57],[2070,2070,4,3.14],[1700,2100,2,-1.57]]],
 ['human','Taking the bins out',39,[[700,2260,3,0],[1000,2260,3,-1.57],[1360,2220,4,3.14],[1040,2300,2,0]]],
 ['human','Checking the garden',26,[[430,1020,3,0],[780,980,4,1.57],[790,1270,3,3.14],[400,1250,2,-1.57]]],
 ['human','Stationary lookout',25,[[1000,260,5,0],[1000,550,4,3.14],[1060,550,3,1.57],[1060,260,4,-1.57]]],
 ['human','Dock attendant',36,[[2050,550,3,0],[2160,550,3,-1.57],[2160,390,4,3.14],[2050,400,2,1.57]]],
 ['cat','Prowling the garden',52,[[430,1230,3,0],[820,1130,4,1.57],[930,1390,2,3.14],[450,1410,3,-1.57]]],
 ['cat','Hunting behind the garage',58,[[1100,2220,3,0],[1500,2260,2,1.57],[1640,2150,4,3.14],[1530,2210,2,-1.57]]]
 ];
 const entities=routines.map(([kind,task,speed,points],id)=>{const route=points.map(([x,y,wait,face])=>({...nav.nearest({x,y}),wait,face}));return {id,kind,task,speed,route,...route[0],index:0,state:'wait',wait:route[0].wait+id*.17,range:kind==='cat'?125:145+(id%4)*15,angle:route[0].face,half:kind==='cat'?.85:.61,frozen:0,path:null,search:0,cooldown:0,walk:0,tint:['#b18f78','#7b96a0','#8f9671','#9d8299'][id%4]};});
 for(const [x,y,angle,task] of [[904,1530,0,'House exterior'],[1040,1640,2.3,'Garage corner'],[1170,738,-1.1,'Shop entrance'],[1900,800,2.2,'Bank security'],[1580,1250,-.9,'Bank security'],[1948,1290,1.1,'Bank exterior']])entities.push({id:entities.length,kind:'camera',task,x,y,angle,baseAngle:angle,clock:0,range:210,half:.48,frozen:0});
 return entities;
}
function follow(e,dt,blocks){if(!e.path?.length)return true;let budget=e.speed*dt;while(budget>0&&e.path.length){const target=e.path[0],d=distance(e,target);if(d<.2){e.path.shift();continue}const amount=Math.min(d,budget),next={x:e.x+(target.x-e.x)/d*amount,y:e.y+(target.y-e.y)/d*amount};if(!clearSegment(e,next,blocks)){e.path=null;return false}e.angle=Math.atan2(target.y-e.y,target.x-e.x);e.x=next.x;e.y=next.y;e.walk+=amount;budget-=amount;if(amount===d)e.path.shift();}return !e.path.length;}
export function investigate(entities,nav,source,max=2){let count=0;for(const e of entities.filter(e=>e.kind==='human'&&e.frozen<=0&&e.state!=='investigate'&&e.state!=='search'&&distance(e,source)<560).sort((a,b)=>distance(a,source)-distance(b,source))){const path=nav.path(e,source);if(!path)continue;e.path=path;e.state='investigate';e.search=0;e.wait=0;e.timeout=70;count++;if(count>=max)break;}return count;}
export function updateEntities(entities,nav,blocks,dt){for(const e of entities){if(e.frozen>0){e.frozen=Math.max(0,e.frozen-dt);continue}if(e.kind==='camera'){e.clock+=dt;e.angle=e.baseAngle+Math.sin(e.clock*.42)*.62;continue}e.cooldown=Math.max(0,e.cooldown-dt);e.meow=Math.max(0,(e.meow||0)-dt);if(e.state==='wait'||e.state==='search'){e.wait-=dt;e.angle+=dt*(e.kind==='cat'?1.1:.7);if(e.wait<=0){if(e.state==='search'){e.state='return';e.path=nav.path(e,e.route[e.index]);}else{e.index=(e.index+1)%e.route.length;e.state='routine';e.path=nav.path(e,e.route[e.index]);}}continue}
 if(!e.path){e.path=nav.path(e,e.route[e.index]);if(e.state==='investigate')e.state='return';if(!e.path){e.state='wait';e.wait=1;continue}}
 if(e.state==='investigate'){e.timeout-=dt;if(e.timeout<=0){e.state='return';e.path=nav.path(e,e.route[e.index]);continue}}
 if(follow(e,dt,blocks)){if(e.state==='investigate'){e.state='search';e.wait=3.5}else{e.state='wait';e.wait=e.route[e.index].wait;e.angle=e.route[e.index].face}}
}}
export function sees(e,target,blocks,invisible=false){if(invisible||e.frozen>0)return false;const dx=target.x-e.x,dy=target.y-e.y,angle=Math.atan2(dy,dx),delta=Math.atan2(Math.sin(angle-e.angle),Math.cos(angle-e.angle));return Math.hypot(dx,dy)<e.range&&Math.abs(delta)<e.half&&!rayBlocked(e.x,e.y,target.x,target.y,blocks);}
export function resolveSightings(entities,target,blocks,effects,invisible,alert){let danger=false,blocked=false;for(const e of entities){if(!sees(e,target,blocks,invisible))continue;if(effects.stiff>0){effects.stiff--;e.frozen=8;blocked=true;continue}if(e.kind==='cat'){if(e.cooldown<=0){e.cooldown=9;e.meow=1.5;alert({x:e.x,y:e.y},1)}continue}danger=true;}return {danger,blocked};}
export function createTokens(nav){return [[430,2100,'speed'],[800,1770,'stiff'],[1380,2070,'refill'],[830,970,'speed'],[370,1240,'stiff'],[1220,1210,'refill'],[1840,1190,'stiff'],[1850,470,'speed'],[730,560,'refill'],[2100,2100,'stiff'],[1670,1880,'refill'],[1940,690,'speed']].map(([x,y,kind],id)=>({id,kind,...nav.nearest({x,y}),collected:false}));}
export function collectTokens(tokens,ghost,effects,unlocked,maxEnergy){const messages=[];for(const token of tokens){if(token.collected||distance(token,ghost)>21||(token.kind==='refill'&&!unlocked))continue;token.collected=true;if(token.kind==='speed'){effects.boost=10;messages.push('Fleet Spirit · speed boosted for 10 seconds.')}if(token.kind==='refill'){effects.energy=maxEnergy;messages.push('Invisibility refilled.')}if(token.kind==='stiff'){effects.stiff++;messages.push('Scared Stiff · your next witness freezes.')} }return messages;}
