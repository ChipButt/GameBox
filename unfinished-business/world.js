// Stable, seeded neighbourhoods. Each level keeps the same canvas size but uses a distinct layout.
export const WORLD={width:2640,height:2400,cell:24,version:2};
export const LEVELS=[
 {name:'The Graveyard',difficulty:1,spawn:{x:1320,y:2130},ferry:{x:1320,y:72}},
 {name:'The Workplace',difficulty:2,spawn:{x:250,y:2140},ferry:{x:2140,y:220}},
 {name:'The Supermarket',difficulty:3,spawn:{x:260,y:2160},ferry:{x:2050,y:220}},
 {name:'The High Street',difficulty:4,spawn:{x:280,y:2140},ferry:{x:2130,y:250}},
 {name:'Homeward',difficulty:5,spawn:{x:320,y:2110},ferry:{x:2080,y:210}}
];
export const SPAWN=LEVELS[0].spawn,FERRY=LEVELS[0].ferry;
export const REGIONS=[
 {x:150,y:1620,w:760,h:610,name:'Old graves',floor:'#40564b',kind:4},
 {x:980,y:1660,w:680,h:560,name:'Memorial lawn',floor:'#3c594c',kind:2},
 {x:1710,y:1620,w:470,h:600,name:'Maintenance yard',floor:'#465359',kind:1},
 {x:150,y:860,w:760,h:620,name:'Family plots',floor:'#49524e',kind:4},
 {x:980,y:900,w:570,h:560,name:'Funeral lawn',floor:'#3d5547',kind:2},
 {x:1620,y:860,w:560,h:620,name:'The chapel',floor:'#554c4d',kind:0},
 {x:260,y:170,w:840,h:540,name:'North cemetery',floor:'#49524e',kind:4},
 {x:1190,y:150,w:320,h:520,name:'Gatehouse path',floor:'#657273',kind:4},
 {x:1600,y:170,w:580,h:520,name:'Memorial garden',floor:'#3d5b4d',kind:2}
];
const VARIANT_REGIONS=[
 REGIONS,
 [
  {x:90,y:1600,w:720,h:650,name:'Staff entrance',floor:'#554c4d',kind:0},{x:90,y:820,w:650,h:590,name:'Employee car park',floor:'#3c594c',kind:2},
  {x:900,y:1550,w:570,h:650,name:'Warehouse floor',floor:'#465359',kind:1},{x:1570,y:1590,w:650,h:610,name:'Loading bay',floor:'#615451',kind:0},
  {x:1320,y:760,w:860,h:570,name:'Main workplace',floor:'#615451',kind:0},{x:1030,y:100,w:750,h:520,name:'Break area',floor:'#3d5b4d',kind:2},
  {x:90,y:100,w:720,h:560,name:'Offices',floor:'#49524e',kind:4},{x:1900,y:80,w:330,h:560,name:'Clocking-out gate',floor:'#657273',kind:4}
 ],
 [
  {x:100,y:1650,w:650,h:570,name:'Customer entrance',floor:'#554c4d',kind:0},{x:100,y:900,w:650,h:560,name:'Car park',floor:'#3c594c',kind:2},
  {x:900,y:1640,w:580,h:580,name:'Loading bay',floor:'#465359',kind:1},{x:1600,y:1580,w:630,h:650,name:'Checkout lanes',floor:'#615451',kind:0},
  {x:850,y:760,w:1380,h:650,name:'Supermarket floor',floor:'#615451',kind:0},{x:1070,y:100,w:720,h:500,name:'Staff room',floor:'#49524e',kind:4},
  {x:90,y:100,w:740,h:580,name:'Stockroom',floor:'#3d5b4d',kind:2},{x:1900,y:90,w:330,h:540,name:'Service exit',floor:'#657273',kind:4}
 ],
 [
  {x:100,y:1640,w:740,h:590,name:'Shops west',floor:'#554c4d',kind:0},{x:100,y:850,w:740,h:600,name:'Market square',floor:'#3c594c',kind:2},
  {x:960,y:1690,w:540,h:520,name:'Delivery alley',floor:'#465359',kind:1},{x:1600,y:1640,w:620,h:590,name:'Service road',floor:'#465359',kind:1},
  {x:900,y:760,w:1320,h:650,name:'High street',floor:'#615451',kind:0},{x:1100,y:100,w:700,h:500,name:'Pocket park',floor:'#3d5b4d',kind:2},
  {x:100,y:100,w:750,h:560,name:'Pub & cafe',floor:'#49524e',kind:4},{x:1900,y:80,w:330,h:540,name:'Bus stop',floor:'#657273',kind:4}
 ],
 [
  {x:120,y:1660,w:650,h:560,name:'Old neighbourhood',floor:'#554c4d',kind:0},{x:120,y:940,w:650,h:520,name:'Community park',floor:'#3c594c',kind:2},
  {x:900,y:1670,w:550,h:540,name:'Corner shop',floor:'#465359',kind:1},{x:1580,y:1640,w:650,h:590,name:'Home street',floor:'#615451',kind:0},
  {x:850,y:780,w:1380,h:650,name:'Residential roads',floor:'#615451',kind:0},{x:1080,y:120,w:690,h:480,name:'Playing field',floor:'#3d5b4d',kind:2},
  {x:120,y:120,w:690,h:560,name:'School route',floor:'#49524e',kind:4},{x:1880,y:100,w:350,h:540,name:'Home',floor:'#657273',kind:4}
 ]
];
export const contains=(r,x,y)=>x>=r.x&&x<r.x+r.w&&y>=r.y&&y<r.y+r.h;
export const regionsForLevel=(level=0)=>VARIANT_REGIONS[Math.max(0,Math.min(4,level|0))];
export const levelInfo=(level=0)=>LEVELS[Math.max(0,Math.min(4,level|0))];
export const areaAt=(x,y,level=0)=>regionsForLevel(level).find(r=>contains(r,x,y))||{name:level===0?'Cemetery paths':'Lantern streets',floor:'#424958',kind:3};

function baseLayout(add,decor,random){
 const wall=(x,y,w,h,phase=99,unused=99,kind='wall')=>{if(typeof phase==='string'){kind=phase;phase=99;unused=99}return add(x,y,w,h,kind,phase)};
 // Cemetery perimeter. The north gate is a physical obstacle rather than a magic level trigger.
 wall(120,120,1100,28);wall(1420,120,800,28);wall(120,120,28,2140);wall(2192,120,28,2140);wall(120,2232,2100,28);
 const exitGate=wall(1220,120,200,28,2,99,'gate');exitGate.exit=true;
 // Chapel and vestry.
 wall(1620,860,560,24);wall(1620,1456,560,24);wall(1620,884,24,572);wall(2156,884,24,572);
 wall(1840,1456,120,24,2,99,'door');wall(1880,960,120,85,'table');wall(1690,1020,110,170,'bench');wall(2020,1020,90,170,'bench');
 // Maintenance yard with a wooden store and tempting side-cache spaces.
 wall(1710,1620,470,24);wall(1710,2196,470,24);wall(1710,1644,24,552);wall(2156,1644,24,552);
 wall(1870,1620,120,24,2,99,'gate');wall(1800,1810,145,85,'shelf');wall(1990,1840,105,120,'cabinet');
 // Funeral lawn: hearse, flower table and rows of mourners have room to circulate.
 wall(1120,1100,155,260,'car');wall(1330,1080,150,60,'table');
 // Hedges create sight-line breaks without turning the cemetery into a maze.
 for(const [x,y,w,h] of [[930,1600,40,610],[930,860,40,620],[1540,900,40,560],[1110,170,40,540],[1510,170,40,540]])wall(x,y,w,h,99,99,'hedge');
 // Grave rows are substantial cover but leave clean walking lanes between them.
 for(const zone of [[190,900,650,520],[190,1650,650,500],[300,220,720,430]]){
  const [zx,zy,zw,zh]=zone;
  for(let yy=zy+45;yy<zy+zh-40;yy+=105)for(let xx=zx+40;xx<zx+zw-35;xx+=115){
   if(((xx+yy)/5|0)%4===0)continue;wall(xx,yy,52,72,99,99,'stone');
  }
 }
 // Memorial garden trees and benches.
 for(const [x,y] of [[1660,250],[1880,250],[2080,300],[1730,520],[1990,520]])wall(x,y,55,55,99,99,'tree');
 wall(1760,420,105,38,'bench');wall(1970,610,105,38,'bench');
 // Gatehouse / entrance details.
 wall(1160,260,160,210);wall(1430,260,150,210);wall(1250,500,80,55,'cabinet');
 for(const [x,y] of [[280,780],[860,760],[1180,760],[1560,760],[2110,760],[1040,1550],[1600,1550],[2240,1550]])decor.push({x,y,kind:'lamp'});
}
function variantLayout(level,add,decor){
 const wall=(x,y,w,h,phase=99,unused=99,kind='wall')=>{if(typeof phase==='string'){kind=phase;phase=99;unused=99}return add(x,y,w,h,kind,phase)};
 if(level===1){
  wall(830,24,250,750,99,99,'water');wall(830,910,250,610,99,99,'water');wall(830,1660,250,716,99,99,'water');
  for(const y of [760,1508]){wall(820,y,270,20);wall(935,y,45,20,2,2,'gate');}
  [[90,1600,720,650],[1320,760,860,570],[1570,1590,650,610]].forEach(([x,y,w,h])=>{wall(x,y,w,22);wall(x,y+h-22,w,22);wall(x,y,22,h);wall(x+w-22,y,22,h)});
  wall(1210,1490,18,670);wall(1490,1450,18,760,3,3,'door');wall(1810,1335,18,860);wall(2020,1335,18,860,4,4,'gate');
 }
 if(level===2){
  for(const [x,y,w,h] of [[820,700,300,250],[1210,700,330,250],[1630,700,330,250],[820,1040,300,280],[1210,1040,330,280],[1630,1040,330,280]]){wall(x,y,w,22);wall(x,y+h-22,w,22);wall(x,y,22,h);wall(x+w-22,y,22,h);}
  for(const [x,y] of [[1120,820],[1540,1140],[1960,820],[780,970],[1160,1360],[1580,970],[2000,1360]])wall(x,y,90,22,(x+y)%3+2,2,'gate');
  wall(760,1480,1460,20);wall(760,1480,20,680);wall(2200,1480,20,680);wall(1120,1480,24,430,4,3,'door');wall(1600,1730,24,430,5,4,'gate');
  for(const [x,y] of [[300,520],[560,1180],[930,1540],[1840,1510],[2020,520]])wall(x,y,120,70,99,99,'hedge');
 }
 if(level===3){
  wall(24,690,760,120,99,99,'water');wall(930,690,660,120,99,99,'water');wall(1740,690,876,120,99,99,'water');
  wall(24,1450,1040,100);wall(1210,1450,600,100);wall(1960,1450,656,100);
  for(const [x,y] of [[760,690],[1570,690],[1040,1450],[1790,1450]])wall(x,y,190,100,4,3,'gate');
  wall(890,820,22,610);wall(1510,820,22,610,5,4,'door');wall(2150,820,22,610);
  wall(860,1560,22,620);wall(1480,1560,22,620,5,4,'gate');wall(2100,1560,22,620);
  for(const [x,y] of [[1040,900],[1320,1060],[1760,900],[1950,1190]])wall(x,y,160,60,99,99,'shelf');
 }
 if(level===4){
  // Concentric old-town walls with offset gates force route planning.
  for(const [x,y,w,h] of [[720,560,1450,1450],[920,760,1050,1050],[1120,960,650,650]]){wall(x,y,w,24);wall(x,y+h-24,w,24);wall(x,y,24,h);wall(x+w-24,y,24,h);}
  for(const [x,y,w,h,p,t] of [[1380,560,120,24,4,3],[720,1230,24,120,5,4],[1510,1786,120,24,6,4],[1946,1110,24,120,6,5],[1250,760,120,24,5,4],[920,1400,24,120,6,4],[1670,1786,120,24,7,5],[1746,1120,24,120,7,5]])wall(x,y,w,h,p,t,'gate');
  for(const [x,y] of [[820,420],[480,980],[420,1650],[1860,380],[2150,920],[1980,1600]])wall(x,y,150,80,99,99,'stone');
 }
 for(const [x,y] of [[940,440],[940,1150],[940,1800],[1820,1410],[700,720],[2050,1100],[1450,500],[1750,2200]])decor.push({x,y,kind:'lamp'});
}
// Public entrances remain walkable with no powers. Closed gates are optional
// shortcuts (apart from the cemetery story gate), never a wall painted as a door.
function addEntrances(level,add){
 const entrances=[
  [[1840,1456,120,24],[1870,1620,120,24]],
  [[360,2228,120,22],[360,1600,120,22],[1640,1308,120,22],
   [1320,980,22,120],[1660,2178,120,22],[1570,1850,22,120],[1810,1940,18,120],[2020,1940,18,120],[1810,1410,18,120]],
  [[910,928,120,22],[1315,928,120,22],[1720,928,120,22],
   [910,1298,120,22],[1315,1298,120,22],[1720,1298,120,22]],
  // Public crossings alongside the optional gated shortcuts.
  [[1080,1450,120,100],[800,690,120,120],[890,1080,22,120],[1510,1080,22,120],[2150,1080,22,120]],
  // Each courtyard has a pedestrian entrance as well as phase shortcuts.
  [[800,1986,120,24],[1000,1786,120,24],[1200,1586,120,24]]
 ];
 for(const [x,y,w,h] of entrances[level]){
  const doorway=add(x,y,w,h,'door',2);doorway.open=true;doorway.entrance=true;
 }
}
function cutDoorways(blocks){
 const doors=blocks.filter(b=>b.kind==='door'||b.kind==='gate');
 let result=blocks;
 for(const d of doors){
  result=result.flatMap(b=>{
   if(b===d||!(b.kind==='wall'||b.kind==='water'||(d.entrance&&!b.entrance&&(b.kind==='door'||b.kind==='gate'))))return [b];
   const x=Math.max(b.x,d.x),y=Math.max(b.y,d.y),right=Math.min(b.x+b.w,d.x+d.w),bottom=Math.min(b.y+b.h,d.y+d.h);
   if(x>=right||y>=bottom)return [b];
   // Non-overlapping pieces preserve the original wall's material tier.
   return [[b.x,b.y,b.w,y-b.y],[b.x,bottom,b.w,b.y+b.h-bottom],
    [b.x,y,x-b.x,bottom-y],[right,y,b.x+b.w-right,bottom-y]]
    .filter(([, ,w,h])=>w>0&&h>0).map(([x,y,w,h])=>({...b,x,y,w,h}));
  });
 }
 // An explicitly open public entrance wins over a pre-existing closed gate.
 return result.filter(b=>!doors.some(d=>d.entrance&&b!==d&&
  (b.kind==='door'||b.kind==='gate')&&b.x>=d.x&&b.y>=d.y&&b.x+b.w<=d.x+d.w&&b.y+b.h<=d.y+d.h));
}
export function generateWorld(seed=2717,level=0){
 level=Math.max(0,Math.min(4,level|0));let state=(seed+level*982451653)>>>0;const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296};
 const blocks=[],decor=[],regions=regionsForLevel(level),info=levelInfo(level);
 const add=(x,y,w,h,kind='wall',phase=99)=>{const b={x,y,w,h,kind,phase,open:false};blocks.push(b);return b};
 add(0,0,WORLD.width,24);add(0,0,24,WORLD.height);add(0,WORLD.height-24,WORLD.width,24);add(WORLD.width-24,0,24,WORLD.height);
 if(level===0)baseLayout(add,decor,random);else variantLayout(level,add,decor);
 addEntrances(level,add);
 for(const r of regions.filter(r=>r.kind===2||r.kind===4)){
  for(let i=0;i<8+level*2;i++){const x=r.x+45+Math.floor(random()*Math.max(60,r.w-140)),y=r.y+45+Math.floor(random()*Math.max(60,r.h-140));
   if(Math.hypot(x+25-info.spawn.x,y+25-info.spawn.y)<100||Math.hypot(x+25-info.ferry.x,y+25-info.ferry.y)<100)continue;
   if(blocks.some(b=>x<b.x+b.w+36&&x+50>b.x-36&&y<b.y+b.h+36&&y+50>b.y-36))continue;
   add(x,y,40+Math.floor(random()*20),40+Math.floor(random()*20),r.kind===2?'tree':'stone');
  }
 }
 if(level===0)for(const [x,y] of [[940,440],[940,1150],[940,1800],[1820,1410],[700,720],[2050,1100]])decor.push({x,y,kind:'lamp'});
 // Phase progression: doors are always low-tier; ordinary walls carry the stronger materials.
 for(const b of blocks){
  if(b.kind==='door'||b.kind==='gate'){
   const seeded=Number.isFinite(b.phase)&&b.phase<99?b.phase:1+((Math.floor(b.x/120)+Math.floor(b.y/120)+level)%3);
   b.phase=Math.max(1,Math.min(3,seeded));
  }else if(b.kind==='wall'){
   // Keep the four absolute canvas-edge boundaries unphaseable.
   const outer=b.x===0||b.y===0||b.x+b.w>=WORLD.width||b.y+b.h>=WORLD.height;
   if(!outer){
    const tier=2+((Math.floor(b.x/180)+Math.floor(b.y/180)+level*2)%Math.min(6,3+level));
    b.phase=Math.max(2,Math.min(7,Number.isFinite(b.phase)&&b.phase<99?b.phase:tier));
   }
  }
 }
 return {level,name:info.name,difficulty:info.difficulty,spawn:{...info.spawn},ferry:{...info.ferry},blocks:cutDoorways(blocks),decor,regions};
}
export const cellId=(x,y)=>x<0||y<0||x>=WORLD.width||y>=WORLD.height?-1:Math.floor(y/WORLD.cell)*Math.ceil(WORLD.width/WORLD.cell)+Math.floor(x/WORLD.cell);
export function discover(visited,x,y){const id=cellId(x,y);if(id<0||visited.has(id))return false;visited.add(id);return true;}

