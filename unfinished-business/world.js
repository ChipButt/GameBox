// Stable, seeded neighbourhood. Save the seed so explored ground never moves.
export const WORLD={width:2640,height:2400,cell:24,version:1};
export const SPAWN={x:300,y:2030},FERRY={x:2140,y:260};
export const REGIONS=[
 {x:120,y:1480,w:780,h:720,name:'Your old house',floor:'#554c4d',kind:0},
 {x:120,y:850,w:780,h:510,name:'Back gardens',floor:'#3c594c',kind:2},
 {x:1060,y:1630,w:500,h:520,name:'The garage',floor:'#465359',kind:1},
 {x:1640,y:1630,w:540,h:570,name:'Orchard lane',floor:'#3d5547',kind:2},
 {x:1160,y:760,w:800,h:560,name:'Corner shops',floor:'#615451',kind:0},
 {x:1120,y:100,w:800,h:520,name:'Willow park',floor:'#3d5b4d',kind:2},
 {x:120,y:100,w:740,h:580,name:'The churchyard',floor:'#49524e',kind:4},
 {x:1970,y:80,w:250,h:550,name:'The crossing',floor:'#657273',kind:4}
];
export const contains=(r,x,y)=>x>=r.x&&x<r.x+r.w&&y>=r.y&&y<r.y+r.h;
export const areaAt=(x,y)=>REGIONS.find(r=>contains(r,x,y))||{name:'Lantern streets',floor:'#424958',kind:3};
export function generateWorld(seed=2717){
 let state=seed>>>0;const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296};
 const blocks=[],people=[],decor=[];
 const add=(x,y,w,h,kind='wall',phase=99,touch=99)=>{const b={x,y,w,h,kind,phase,touch,open:false};blocks.push(b);return b};
 const horizontal=(x,y,w,gap,material=0,touch=99)=>{add(x,y,gap-x,22);add(gap+120,y,x+w-gap-120,22);if(material)add(gap,y,120,22,material===1?'curtain':'gate',material,touch)};
 const vertical=(x,y,h,gap,material=0,touch=99)=>{add(x,y,22,gap-y);add(x,gap+120,22,y+h-gap-120);if(material)add(x,gap,22,120,material===1?'curtain':'door',material,touch)};
 add(0,0,WORLD.width,24);add(0,0,24,WORLD.height);add(0,WORLD.height-24,WORLD.width,24);add(WORLD.width-24,0,24,WORLD.height);
 // River is a real boundary, not a surface the player can accidentally walk over.
 add(2230,24,386,2352,'water');
 // House: four linked rooms, two exits, and an optional curtained shortcut.
 horizontal(120,1480,780,400);horizontal(120,2178,780,690,2,2);
 vertical(120,1502,676,1680);vertical(878,1502,676,1670);
 horizontal(142,1840,736,300);vertical(510,1862,316,1980,1,1);
 add(168,1900,94,155,'bed');add(165,2090,90,45,'dresser');add(760,1910,75,125,'cabinet');
 add(170,1560,115,75,'sofa');add(570,1555,100,80,'table');add(740,1530,80,140,'cabinet');
 decor.push({x:320,y:1610,w:190,h:150,kind:'rug'},{x:300,y:1930,w:130,h:160,kind:'rug'});
 // Garage: ordinary open entrance and a gated northern shortcut.
 horizontal(1060,1630,500,1250,6,4);horizontal(1060,2128,500,1250);
 vertical(1060,1652,476,1820);vertical(1538,1652,476,1830,2,2);
 add(1140,1720,95,180,'car');add(1400,1940,90,100,'shelf');add(1390,1680,105,55,'shelf');
 // Shops: a loop through two rooms with different-material side routes.
 horizontal(1160,760,800,1320);horizontal(1160,1298,800,1740);
 vertical(1160,782,516,1000);vertical(1938,782,516,1030,3,3);
 vertical(1530,782,516,990);add(1220,830,185,65,'shelf');add(1620,830,220,60,'cabinet');add(1650,1160,120,65,'table');
 // Garden walls have both an open way round and upgrade shortcuts.
 horizontal(120,850,780,470,2,2);vertical(120,872,465,1020);vertical(878,872,465,1060);add(250,1050,110,80,'hedge');add(650,1170,150,60,'hedge');
 // Destination gate: one deliberate upgrade milestone, reachable from both streets.
 horizontal(1970,80,260,2030,7,5);horizontal(1970,608,260,2040,5,3);vertical(1970,102,506,330,3,5);
 // Deterministic scenery creates pockets of cover without filling roads or entrances.
 for(const r of REGIONS.filter(r=>r.kind===2||r.name==='The churchyard')){
  for(let i=0;i<12;i++){const x=r.x+45+Math.floor(random()*(r.w-140)),y=r.y+45+Math.floor(random()*(r.h-140));
   if(blocks.some(b=>x<b.x+b.w+40&&x+55>b.x-40&&y<b.y+b.h+40&&y+55>b.y-40))continue;
   add(x,y,45+Math.floor(random()*22),45+Math.floor(random()*22),r.kind===2?'tree':'stone');
  }
 }
 for(const [x,y] of [[940,440],[940,1150],[940,1800],[1820,1410],[700,720],[2050,1100]])decor.push({x,y,kind:'lamp'});
 // Patrol routes are explicit clear street segments, including vertical movement.
 const routes=[[[210,1770],[750,1770]],[[640,1900],[640,2110]],[[1080,1920],[1430,1920]],[[300,1420],[860,1420]],[[970,900],[970,1540]],[[1100,1440],[1900,1440]],[[1610,1020],[1830,1020]],[[1060,670],[1920,670]],[[2020,850],[2020,1450]],[[460,740],[940,740]],[[1000,180],[1000,620]],[[2050,550],[2160,550]]];
 routes.forEach((path,i)=>{people.push({path,x:path[0][0],y:path[0][1],speed:30+i*2,offset:i*43,range:150+i*4,angle:0})});
 return {blocks,people,decor,regions:REGIONS};
}
export function patrolPosition(h,time){const a=h.path[0],b=h.path[1],length=Math.hypot(b[0]-a[0],b[1]-a[1]),travel=(time*h.speed+h.offset)%(length*2),forward=travel<length,u=(forward?travel:2*length-travel)/length;h.x=a[0]+(b[0]-a[0])*u;h.y=a[1]+(b[1]-a[1])*u;h.angle=Math.atan2(b[1]-a[1],b[0]-a[0])+(forward?0:Math.PI);}
export const cellId=(x,y)=>x<0||y<0||x>=WORLD.width||y>=WORLD.height?-1:Math.floor(y/WORLD.cell)*Math.ceil(WORLD.width/WORLD.cell)+Math.floor(x/WORLD.cell);
export function discover(visited,x,y){const id=cellId(x,y);if(id<0||visited.has(id))return false;visited.add(id);return true;}
