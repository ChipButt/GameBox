// Stable, seeded neighbourhoods. Each level keeps the same canvas size but uses a distinct layout.
export const WORLD={width:2640,height:2400,cell:24,version:2};
export const LEVELS=[
 {name:'Lantern Streets',difficulty:1,spawn:{x:300,y:2030},ferry:{x:2140,y:260}},
 {name:'Canal Quarter',difficulty:2,spawn:{x:250,y:2140},ferry:{x:2140,y:220}},
 {name:'Market Maze',difficulty:3,spawn:{x:260,y:2160},ferry:{x:2050,y:220}},
 {name:'Railway Estate',difficulty:4,spawn:{x:280,y:2140},ferry:{x:2130,y:250}},
 {name:'Old Town',difficulty:5,spawn:{x:320,y:2110},ferry:{x:2080,y:210}}
];
export const SPAWN=LEVELS[0].spawn,FERRY=LEVELS[0].ferry;
export const REGIONS=[
 {x:120,y:1480,w:780,h:720,name:'Your old house',floor:'#554c4d',kind:0},
 {x:120,y:850,w:780,h:510,name:'Back gardens',floor:'#3c594c',kind:2},
 {x:1060,y:1630,w:500,h:520,name:'The garage',floor:'#465359',kind:1},
 {x:1640,y:1630,w:540,h:570,name:'Orchard lane',floor:'#3d5547',kind:2},
 {x:1160,y:760,w:800,h:560,name:'Bank & shops',floor:'#615451',kind:0},
 {x:1120,y:100,w:800,h:520,name:'Willow park',floor:'#3d5b4d',kind:2},
 {x:120,y:100,w:740,h:580,name:'The churchyard',floor:'#49524e',kind:4},
 {x:1970,y:80,w:250,h:550,name:'The crossing',floor:'#657273',kind:4}
];
const VARIANT_REGIONS=[
 REGIONS,
 [
  {x:90,y:1600,w:720,h:650,name:'Terrace row',floor:'#554c4d',kind:0},{x:90,y:820,w:650,h:590,name:'Canal gardens',floor:'#3c594c',kind:2},
  {x:900,y:1550,w:570,h:650,name:'Workshop yard',floor:'#465359',kind:1},{x:1570,y:1590,w:650,h:610,name:'Warehouse lane',floor:'#615451',kind:0},
  {x:1320,y:760,w:860,h:570,name:'Canal market',floor:'#615451',kind:0},{x:1030,y:100,w:750,h:520,name:'Bandstand park',floor:'#3d5b4d',kind:2},
  {x:90,y:100,w:720,h:560,name:'Old cemetery',floor:'#49524e',kind:4},{x:1900,y:80,w:330,h:560,name:'Lock gates',floor:'#657273',kind:4}
 ],
 [
  {x:100,y:1650,w:650,h:570,name:'Boarding house',floor:'#554c4d',kind:0},{x:100,y:900,w:650,h:560,name:'Courtyard',floor:'#3c594c',kind:2},
  {x:900,y:1640,w:580,h:580,name:'Loading bay',floor:'#465359',kind:1},{x:1600,y:1580,w:630,h:650,name:'Arcade',floor:'#615451',kind:0},
  {x:850,y:760,w:1380,h:650,name:'Market halls',floor:'#615451',kind:0},{x:1070,y:100,w:720,h:500,name:'Memorial square',floor:'#49524e',kind:4},
  {x:90,y:100,w:740,h:580,name:'Kitchen gardens',floor:'#3d5b4d',kind:2},{x:1900,y:90,w:330,h:540,name:'Clock tower',floor:'#657273',kind:4}
 ],
 [
  {x:100,y:1640,w:740,h:590,name:'Rail cottages',floor:'#554c4d',kind:0},{x:100,y:850,w:740,h:600,name:'Allotments',floor:'#3c594c',kind:2},
  {x:960,y:1690,w:540,h:520,name:'Engine shed',floor:'#465359',kind:1},{x:1600,y:1640,w:620,h:590,name:'Freight yard',floor:'#465359',kind:1},
  {x:900,y:760,w:1320,h:650,name:'Station district',floor:'#615451',kind:0},{x:1100,y:100,w:700,h:500,name:'Station park',floor:'#3d5b4d',kind:2},
  {x:100,y:100,w:750,h:560,name:'Chapel grounds',floor:'#49524e',kind:4},{x:1900,y:80,w:330,h:540,name:'Signal box',floor:'#657273',kind:4}
 ],
 [
  {x:120,y:1660,w:650,h:560,name:'Lower ward',floor:'#554c4d',kind:0},{x:120,y:940,w:650,h:520,name:'Cloister garden',floor:'#3c594c',kind:2},
  {x:900,y:1670,w:550,h:540,name:'Smithy court',floor:'#465359',kind:1},{x:1580,y:1640,w:650,h:590,name:'Upper ward',floor:'#615451',kind:0},
  {x:850,y:780,w:1380,h:650,name:'Old town centre',floor:'#615451',kind:0},{x:1080,y:120,w:690,h:480,name:'Castle green',floor:'#3d5b4d',kind:2},
  {x:120,y:120,w:690,h:560,name:'Abbey ruins',floor:'#49524e',kind:4},{x:1880,y:100,w:350,h:540,name:'North gate',floor:'#657273',kind:4}
 ]
];
export const contains=(r,x,y)=>x>=r.x&&x<r.x+r.w&&y>=r.y&&y<r.y+r.h;
export const regionsForLevel=(level=0)=>VARIANT_REGIONS[Math.max(0,Math.min(4,level|0))];
export const levelInfo=(level=0)=>LEVELS[Math.max(0,Math.min(4,level|0))];
export const areaAt=(x,y,level=0)=>regionsForLevel(level).find(r=>contains(r,x,y))||{name:'Lantern streets',floor:'#424958',kind:3};

function baseLayout(add,decor,random){
 const horizontal=(x,y,w,gap,material=0,touch=99)=>{add(x,y,gap-x,22);add(gap+120,y,x+w-gap-120,22);if(material)add(gap,y,120,22,material===1?'curtain':'gate',material,touch)};
 const vertical=(x,y,h,gap,material=0,touch=99)=>{add(x,y,22,gap-y);add(x,gap+120,22,y+h-gap-120);if(material)add(x,gap,22,120,material===1?'curtain':'door',material,touch)};
 add(2230,24,386,2352,'water');
 horizontal(120,1480,780,400);horizontal(120,2178,780,690,2,2);vertical(120,1502,676,1680);vertical(878,1502,676,1670);horizontal(142,1840,736,300);vertical(510,1862,316,1980,1,1);
 add(168,1900,94,155,'bed');add(165,2090,90,45,'dresser');add(760,1910,75,125,'cabinet');add(170,1560,115,75,'sofa');add(570,1555,100,80,'table');add(740,1530,80,140,'cabinet');
 decor.push({x:320,y:1610,w:190,h:150,kind:'rug'},{x:300,y:1930,w:130,h:160,kind:'rug'});
 horizontal(1060,1630,500,1250,6,4);horizontal(1060,2128,500,1250);vertical(1060,1652,476,1820);vertical(1538,1652,476,1830,2,2);add(1140,1720,95,180,'car');add(1400,1940,90,100,'shelf');add(1390,1680,105,55,'shelf');
 horizontal(1160,760,800,1320);horizontal(1160,1298,800,1740);vertical(1160,782,516,1000);vertical(1938,782,516,1030,3,3);vertical(1530,782,516,990);add(1220,830,185,65,'shelf');add(1620,830,220,60,'cabinet');add(1650,1160,120,65,'table');
 horizontal(120,850,780,470,2,2);vertical(120,872,465,1020);vertical(878,872,465,1060);add(250,1050,110,80,'hedge');add(650,1170,150,60,'hedge');
 horizontal(1970,80,260,2030,7,5);horizontal(1970,608,260,2040,5,3);vertical(1970,102,506,330,3,5);
}
function variantLayout(level,add,decor){
 const wall=(x,y,w,h,phase=99,touch=99,kind='wall')=>add(x,y,w,h,kind,phase,touch);
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
export function generateWorld(seed=2717,level=0){
 level=Math.max(0,Math.min(4,level|0));let state=(seed+level*982451653)>>>0;const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296};
 const blocks=[],decor=[],regions=regionsForLevel(level),info=levelInfo(level);
 const add=(x,y,w,h,kind='wall',phase=99,touch=99)=>{const b={x,y,w,h,kind,phase,touch,open:false};blocks.push(b);return b};
 add(0,0,WORLD.width,24);add(0,0,24,WORLD.height);add(0,WORLD.height-24,WORLD.width,24);add(WORLD.width-24,0,24,WORLD.height);
 if(level===0)baseLayout(add,decor,random);else variantLayout(level,add,decor);
 for(const r of regions.filter(r=>r.kind===2||r.kind===4)){
  for(let i=0;i<8+level*2;i++){const x=r.x+45+Math.floor(random()*Math.max(60,r.w-140)),y=r.y+45+Math.floor(random()*Math.max(60,r.h-140));
   if(blocks.some(b=>x<b.x+b.w+36&&x+50>b.x-36&&y<b.y+b.h+36&&y+50>b.y-36))continue;
   add(x,y,40+Math.floor(random()*20),40+Math.floor(random()*20),r.kind===2?'tree':'stone');
  }
 }
 if(level===0)for(const [x,y] of [[940,440],[940,1150],[940,1800],[1820,1410],[700,720],[2050,1100]])decor.push({x,y,kind:'lamp'});
 return {level,name:info.name,difficulty:info.difficulty,spawn:{...info.spawn},ferry:{...info.ferry},blocks,decor,regions};
}
export const cellId=(x,y)=>x<0||y<0||x>=WORLD.width||y>=WORLD.height?-1:Math.floor(y/WORLD.cell)*Math.ceil(WORLD.width/WORLD.cell)+Math.floor(x/WORLD.cell);
export function discover(visited,x,y){const id=cellId(x,y);if(id<0||visited.has(id))return false;visited.add(id);return true;}
