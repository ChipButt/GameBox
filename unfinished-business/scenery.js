import {WORLD} from './world.js?v=20260927l';
// All art is decorative. World geometry and gameplay stay in world.js.
const rect=(c,x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h))};
const hash=(x,y)=>{let v=Math.imul(x|0,374761393)^Math.imul(y|0,668265263);v=Math.imul(v^(v>>>13),1274126177);return(v^(v>>>16))>>>0};
function frame(c,x,y,w,h,base,light='#b1baa0',dark='#233139'){rect(c,x,y,w,h,dark);rect(c,x+2,y+2,w-4,h-5,base);rect(c,x+2,y+2,w-4,2,light);rect(c,x+2,y+2,2,h-5,light);rect(c,x+3,y+h-5,w-6,3,'#0c172c40')}
function ellipse(c,x,y,rx,ry,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill()}
function glow(c,x,y,r,color){const g=c.createRadialGradient(x,y,2,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'#ffe8a000');c.fillStyle=g;c.fillRect(x-r,y-r,2*r,2*r)}
function texture(makeCanvas,kind){const tile=makeCanvas();tile.width=128;tile.height=128;const c=tile.getContext('2d');c.imageSmoothingEnabled=false;const palettes={road:['#303d4a','#89939718','#101c2a44'],grass:['#345848','#80a26b35','#172f3233'],wood:['#765e50','#b6967240','#322f343b'],stone:['#596361','#a4afa239','#263b3f40'],concrete:['#536367','#c0c5ae24','#23363f44']};const p=palettes[kind];rect(c,0,0,128,128,p[0]);for(let i=0;i<500;i++){const n=hash(i,kind.length*63);rect(c,n%128,(n>>>8)%128,kind==='grass'?2:1,kind==='grass'?3:1,i%2?p[1]:p[2])}
 if(kind==='wood'){for(let y=0;y<128;y+=16){rect(c,0,y,128,1,'#272a3066');rect(c,0,y+1,128,1,'#c9a27c35');const seam=(y*7)%128;rect(c,seam,y,1,16,'#34303888');for(let i=0;i<5;i++){const n=hash(y,i);rect(c,n%110,y+4+(n%9),8+n%26,1,'#c6a27818')}}}
 if(kind==='stone'){for(let y=0;y<128;y+=32){rect(c,0,y,128,2,'#25383d77');rect(c,0,y+2,128,1,'#b2b5a244');for(let x=(y%64?-16:0);x<128;x+=32)rect(c,x,y,2,32,'#25383d66')}}
 if(kind==='concrete'){rect(c,0,0,128,2,'#24333b55');rect(c,0,0,2,128,'#24333b55');rect(c,2,2,126,1,'#d3d4bf22')}
 return tile;}
function rug(c,x,y,w,h){frame(c,x,y,w,h,'#874d4f','#b39470','#303a43');rect(c,x+6,y+6,w-12,h-12,'#bc997160');rect(c,x+10,y+10,w-20,h-20,'#594b55');c.strokeStyle='#c2a57a99';c.lineWidth=2;for(let k=0;k<3;k++)c.strokeRect(x+15+k*5,y+15+k*5,w-30-k*10,h-30-k*10);for(let yy=y+30;yy<y+h-22;yy+=22)for(let xx=x+30;xx<x+w-22;xx+=22){rect(c,xx,yy,5,5,'#b89065');rect(c,xx+1,yy-2,3,9,'#b89065')}for(let xx=x+4;xx<x+w-4;xx+=5){rect(c,xx,y-3,2,4,'#c7b28c');rect(c,xx,y+h,2,4,'#c7b28c')}}
export function createScenery(world,makeCanvas=()=>document.createElement('canvas')){
 const floor=makeCanvas();floor.width=WORLD.width;floor.height=WORLD.height;const c=floor.getContext('2d');c.imageSmoothingEnabled=false;
 const patterns=Object.fromEntries(['road','grass','wood','stone','concrete'].map(k=>[k,c.createPattern(texture(makeCanvas,k),'repeat')]));
 c.fillStyle=patterns.road;c.fillRect(0,0,WORLD.width,WORLD.height);
 // Wide kerbs and paving define each block without adding a collision.
 for(const r of world.regions){rect(c,r.x-25,r.y-25,r.w+50,r.h+50,'#172b3599');c.fillStyle=patterns.stone;c.fillRect(r.x-20,r.y-20,r.w+40,r.h+40);rect(c,r.x-22,r.y-22,r.w+44,3,'#b0b7a977');rect(c,r.x+r.w+18,r.y-18,4,r.h+38,'#1a2e35aa');rect(c,r.x-18,r.y+r.h+18,r.w+40,4,'#1a2e35aa');c.fillStyle=r.kind===2?patterns.grass:r.kind===0?patterns.wood:r.kind===1?patterns.concrete:patterns.stone;c.fillRect(r.x,r.y,r.w,r.h);
  if(r.kind===2){c.save();c.beginPath();c.rect(r.x+8,r.y+8,r.w-16,r.h-16);c.clip();for(let i=0;i<85;i++){const n=hash(i,r.x+r.y),x=r.x+n%r.w,y=r.y+((n>>>10)%r.h);rect(c,x,y,3,2,['#9ba66b66','#91ab7533','#203e4233'][i%3]);if(i%7===0){rect(c,x,y-2,2,4,'#739457');rect(c,x-1,y-3,4,2,i%2?'#cfb98999':'#a695b199')}}c.restore();}
 }
 // Room-specific materials: timber bedroom, tiled kitchen, worn hallway.
 c.save();c.beginPath();c.rect(534,1863,342,313);c.clip();for(let y=1863;y<2178;y+=24)for(let x=534;x<878;x+=24){rect(c,x,y,24,24,((x-534)/24+(y-1863)/24)%2?'#9f9e88':'#6b817b');rect(c,x,y,24,1,'#d4c9a533');rect(c,x,y,1,24,'#343f4144')}c.restore();
 // Bank tiles, counter runners and a recessed entrance mat.
 for(let y=790;y<1295;y+=32)for(let x=1554;x<1936;x+=32){rect(c,x,y,31,31,((x-1554)/32+(y-790)/32)%2?'#667d79':'#85958a');rect(c,x+5,y+5,21,21,'#d0caaa08')}
 frame(c,1744,1250,106,43,'#3c5558','#7c9c89');for(let x=1750;x<1845;x+=7)rect(c,x,1256,2,30,'#172e3855');
 for(const d of world.decor)if(d.kind==='rug')rug(c,d.x,d.y,d.w,d.h);
 if(world.level===0){
  // Cemetery-specific ground dressing: gravel walks, fresh earth, flowers and funeral setup.
  const path=(x,y,w,h)=>{rect(c,x,y,w,h,'#777b6e');for(let yy=y+4;yy<y+h;yy+=12)for(let xx=x+5;xx<x+w;xx+=17)rect(c,xx+(yy%7),yy,3,2,'#a4a58e55')};
  path(1260,140,120,2050);path(150,740,2030,74);path(970,1480,610,65);
  rect(c,1110,1020,470,8,'#c6c0a766');rect(c,1110,1390,470,8,'#5f675c66');
  // Funeral canopy and chairs are visual detail, not additional collision.
  rect(c,1210,940,300,8,'#d4cfb188');for(const xx of [1210,1502])rect(c,xx,940,8,170,'#8b8b78');
  for(let row=0;row<3;row++)for(let col=0;col<5;col++){const x=1160+col*58,y=1180+row*52;rect(c,x,y,30,25,'#34454b');rect(c,x+4,y+3,22,4,'#718078');rect(c,x+3,y+25,4,10,'#1d3037');rect(c,x+23,y+25,4,10,'#1d3037')}
  // Fresh grave and flower clusters.
  rect(c,1870,1960,120,56,'#292821');for(let i=0;i<28;i++){const n=hash(i,3837);rect(c,1872+n%114,1962+(n>>>8)%50,4,3,i%2?'#514637':'#6c5940')}
  for(const [x,y] of [[1090,1120],[1500,1140],[420,840],[770,1510],[2050,710]])for(let i=0;i<9;i++){const n=hash(i,x+y);rect(c,x+n%35,y+(n>>>6)%26,3,5,'#54734e');rect(c,x+1+n%35,y-2+(n>>>6)%26,3,3,['#c49bb0','#d9c57d','#a5b7d0'][i%3])}
 }

 // Street paint, repaired asphalt and drainage details.
 for(const y of [736,1436,2276])for(let x=45;x<2200;x+=70){rect(c,x,y,34,3,'#bbb69a88');rect(c,x+4,y,5,1,'#303d4a99')}
 for(let y=40;y<2340;y+=68){rect(c,995,y,3,30,'#c6bd9588');rect(c,997,y+8,1,4,'#303d4a')}
 for(const [x,y] of [[955,1360],[1015,710],[1540,1415],[2035,715]]){ellipse(c,x,y,16,11,'#182d36');ellipse(c,x,y-2,14,10,'#647472');for(let j=-6;j<8;j+=4)rect(c,x-10,y+j,20,1,'#233942');rect(c,x-2,y-7,3,13,'#87938a55')}
 for(const [x,y] of [[914,1390],[1052,658],[1600,2205]])for(let i=0;i<5;i++)rect(c,x+i*16,y,10,34,'#d2ccad88');
 // Garage stains, parking guides and tools painted onto the concrete.
 ellipse(c,1185,1880,55,30,'#172d3833');ellipse(c,1194,1890,34,14,'#152d3822');for(const x of [1125,1248]){rect(c,x,1700,3,212,'#d3ba7777');rect(c,x,1700,x===1125?28:3,3,'#d3ba7777')}
 for(let i=0;i<7;i++)rect(c,1260+i*11,1648,5,12,'#c5ab7166');
 // Pathway paving lies flush with the lawn: it never claims extra physical cover.
 for(const r of world.regions.filter(r=>r.kind===2)){for(let y=r.y+50;y<r.y+r.h-30;y+=48){const x=r.x+r.w*.5+Math.sin(y*.017)*25;frame(c,x,y,26,22,'#8d957d','#b1b49a','#526b58')}}
 // Ambient pools: warm rooms, cool streets, soft lamp glow.
 glow(c,420,1670,360,'#ffd08c1f');glow(c,330,1990,250,'#ffdc9f1c');glow(c,1760,1030,310,'#c5ffe019');
 for(const d of world.decor)if(d.kind==='lamp')glow(c,d.x,d.y,190,'#ffd38a37');
 return floor;
}
export function drawSceneryProp(c,b){const{x,y,w,h,kind}=b;
 if(b.open&&b.entrance){
  // Recessed threshold and jambs frame a genuinely clear walking opening.
  rect(c,x,y,w,h,'#b8bea52b');
  if(w>=h){
   rect(c,x,y,5,h,'#c8b38b');rect(c,x+w-5,y,5,h,'#c8b38b');
   rect(c,x+7,y+h-4,w-14,3,'#d5c6a366');
   rect(c,x+6,y+3,4,h-8,'#805f43');
  }else{
   rect(c,x,y,w,5,'#c8b38b');rect(c,x,y+h-5,w,5,'#c8b38b');
   rect(c,x+w-4,y+7,3,h-14,'#d5c6a366');
   rect(c,x+3,y+6,w-8,4,'#805f43');
  }
  return;
 }
 if(b.open){rect(c,x,y,w,h,'#b8bea512');rect(c,x,y,w,2,'#b1bca355');return}
 // Short contact shadows: every solid still visibly matches its collision footprint.
 rect(c,x+5,y+6,w,h,'#0716224d');rect(c,x+2,y+3,w,h,'#07162233');
 if(kind==='wall'){
  const material=Math.max(2,Math.min(7,Number.isFinite(b.phase)?b.phase:4));
  const palettes={
   2:['#785e49','#b39069','#3f3b35'],
   3:['#77766e','#bbb59f','#4e5452'],
   4:['#704d43','#ad7561','#3d3132'],
   5:['#59645f','#9fa898','#344649'],
   6:['#526a72','#8ea6a6','#293d45'],
   7:['#394e57','#718a90','#1d3239']
  };
  const [base,light,dark]=palettes[material];
  rect(c,x,y,w,h,base);
  if(material===2){
   for(let yy=y+3;yy<y+h;yy+=8)rect(c,x,yy,w,2,'#4c392d88');
   for(let xx=x+12;xx<x+w;xx+=24)rect(c,xx,y,2,h,'#d2ad7a22');
  }else if(material===3){
   for(let yy=y+5;yy<y+h;yy+=13)rect(c,x+4,yy,w-8,2,'#d7d0bc22');
   for(let xx=x+20;xx<x+w;xx+=42)rect(c,xx,y+3,1,h-6,'#464a4744');
  }else if(material===4){
   for(let yy=y+2;yy<y+h;yy+=8){rect(c,x,yy,w,1,dark);for(let xx=x+((yy-y)%16?12:0);xx<x+w;xx+=26)rect(c,xx,yy,1,8,dark)}
  }else if(material===5){
   for(let yy=y+4;yy<y+h;yy+=11){rect(c,x+3,yy,w-6,2,dark+'aa');for(let xx=x+((yy-y)%22?10:0);xx<x+w;xx+=22)rect(c,xx,yy,2,10,dark+'99')}
  }else{
   for(let xx=x+6;xx<x+w;xx+=14){rect(c,xx,y+2,2,h-4,dark);rect(c,xx+2,y+2,1,h-4,light+'33')}
   if(material===7)for(let xx=x+10;xx<x+w;xx+=28)rect(c,xx,y+Math.max(3,h/2-2),5,5,'#d6c58b');
  }
  rect(c,x,y-8,w,9,light);rect(c,x,y-8,w,2,'#e0dcc1');rect(c,x,y,w,2,'#ffffff22');rect(c,x,y+h-3,w,3,dark);
  if(w>170&&material<6){for(let xx=x+60;xx<x+w-40;xx+=160){frame(c,xx,y+3,30,12,'#29414f','#a4aa91');rect(c,xx+4,y+6,10,6,'#77998c');rect(c,xx+17,y+6,9,6,'#d0bf8755')}}
  return;
 }
 if(kind==='tree'||kind==='hedge'){
  if(kind==='tree'){ellipse(c,x+w/2+6,y+h-1,w*.52,h*.22,'#142c3455');frame(c,x+w*.4,y+h*.38,w*.19,h*.57,'#806446','#a98759','#3e493d');}
  const cy=kind==='tree'?y-8:y;rect(c,x+4,cy+8,w-8,h-12,'#254c42');rect(c,x+9,cy+2,w-18,h-6,'#3d694b');rect(c,x+3,cy+14,w-6,h-27,'#456e50');
  for(let i=0;i<32;i++){const n=hash(i,x+y),xx=x+7+n%Math.max(1,w-18),yy=cy+8+((n>>>9)%Math.max(1,h-20));rect(c,xx,yy,5+n%5,3+n%3,['#70915a','#537f53','#274d45','#88a061'][i%4])}rect(c,x+13,cy+3,w-28,3,'#a2ae7044');return;
 }
 if(kind==='bed'){frame(c,x,y,w,h,'#66533f','#b7986d');rect(c,x+5,y+7,w-10,h-16,'#c9c5ae');frame(c,x+10,y+13,w-20,32,'#e4ddbc','#f0e9cf','#9eab9b');rect(c,x+14,y+18,w-28,2,'#f8f1d6');rect(c,x+7,y+55,w-14,h-66,'#517b80');rect(c,x+7,y+55,w-14,13,'#9bb5a8');rect(c,x+12,y+72,w-24,2,'#83a5a0');for(let yy=y+76;yy<y+h-14;yy+=13)rect(c,x+10,yy,w-20,1,'#31566755');rect(c,x+7,y+h-10,w-14,4,'#2a4856');return}
 if(kind==='sofa'){frame(c,x,y,w,h,'#456266','#b1ab87');frame(c,x+8,y+7,w-16,20,'#79918a','#9ca88c','#314e55');for(let i=0;i<2;i++)frame(c,x+13+i*(w-26)/2,y+31,(w-30)/2,h-42,'#6e8c80','#9bad94','#3f6063');frame(c,x+3,y+20,10,h-25,'#8b9f8b','#b6b898');frame(c,x+w-13,y+20,10,h-25,'#8b9f8b','#b6b898');rect(c,x+22,y+33,18,15,'#b3a274');return}
 if(kind==='car'){
  rect(c,x-2,y+27,7,28,'#14252e');rect(c,x+w-5,y+27,7,28,'#14252e');rect(c,x-2,y+h-49,7,28,'#14252e');rect(c,x+w-5,y+h-49,7,28,'#14252e');
  frame(c,x+2,y,w-4,h,'#557d8c','#b1c5b7','#263f50');rect(c,x+7,y+12,w-14,h-24,'#6995a0');frame(c,x+10,y+34,w-20,35,'#223e54','#89b0b5');rect(c,x+14,y+38,w-28,8,'#5c869c');rect(c,x+17,y+38,4,24,'#b6d5ca33');frame(c,x+10,y+h-53,w-20,28,'#25445a','#89b0b5');rect(c,x+10,y+76,w-20,2,'#aad0c388');rect(c,x+7,y+10,15,6,'#ede1ac');rect(c,x+w-22,y+10,15,6,'#ede1ac');rect(c,x+7,y+h-10,12,5,'#ce8174');rect(c,x+w-19,y+h-10,12,5,'#ce8174');rect(c,x+w-10,y+77,3,14,'#c7d8c6');return;
 }
 if(kind==='table'){frame(c,x,y,w,h,'#a08258','#d1b984','#5d5746');rect(c,x+7,y+7,w-14,h-14,'#b09568');for(let yy=y+15;yy<y+h-8;yy+=12)rect(c,x+10,yy,w-20,1,'#765e4938');frame(c,x+15,y+14,25,31,'#c2c5a7','#e0d9b3');ellipse(c,x+w-25,y+24,10,7,'#d8d5b2');ellipse(c,x+w-25,y+24,6,4,'#6a5546');rect(c,x+w-28,y+42,16,12,'#8f7860');return}
 if(kind==='shelf'||kind==='dresser'||kind==='cabinet'){
  frame(c,x,y,w,h,'#74694f','#b8a77d','#3b4241');const shelves=kind==='shelf'?3:kind==='dresser'?2:3;for(let j=0;j<shelves;j++){const yy=y+8+j*(h-12)/shelves,hh=(h-18)/shelves-4;frame(c,x+7,yy,w-14,hh,kind==='shelf'?'#34474b':'#8f8161','#b7a77f','#49534a');if(kind==='shelf'){for(let i=0;i<Math.floor((w-18)/11);i++){const n=hash(i,j+x);rect(c,x+11+i*11,yy+6,7,Math.max(5,hh-10),['#bca477','#839789','#927d81','#627f8e'][n%4]);rect(c,x+12+i*11,yy+8,5,2,'#e3cd9833')}}else{rect(c,x+w*.45,yy+hh*.5,12,3,'#d4c6a0');rect(c,x+w*.45,yy+hh*.5+3,12,2,'#3d4647')}}return;
 }
 if(kind==='door'||kind==='gate'){
  const material=Math.max(1,Math.min(7,b.phase||1)),horizontal=w>=h;
  const palettes={
   1:['#8a596c','#d0a4a9','#4c3d50'],
   2:['#8b6947','#c8a979','#4d4438'],
   3:['#8d8778','#d4c9ae','#5c5b55'],
   4:['#785649','#bb8068','#4a3936'],
   5:['#737d77','#b5b9a6','#3b4b4e'],
   6:['#596f77','#9db3b2','#2c4148'],
   7:['#3e525b','#79949a','#20343b']
  };
  const [base,light,dark]=palettes[material];
  frame(c,x,y,w,h,base,light,dark);
  if(material===1){
   for(let n=4;n<(horizontal?w:h)-4;n+=8){if(horizontal)rect(c,x+n,y+3,3,h-6,'#c5899855');else rect(c,x+3,y+n,w-6,3,'#c5899855')}
  }else if(material===2){
   for(let n=6;n<(horizontal?w:h)-6;n+=14){if(horizontal)rect(c,x+n,y+3,3,h-6,'#4e392b66');else rect(c,x+3,y+n,w-6,3,'#4e392b66')}
   rect(c,horizontal?x+w-18:x+w/2-2,horizontal?y+h/2-2:y+h-18,horizontal?7:4,horizontal?4:7,'#e2c27b');
  }else if(material===3){
   for(let n=8;n<(horizontal?w:h)-8;n+=18){if(horizontal)rect(c,x+n,y+4,8,h-8,'#d7cfbd22');else rect(c,x+4,y+n,w-8,8,'#d7cfbd22')}
  }else if(material===4){
   for(let yy=y+3;yy<y+h-2;yy+=8){rect(c,x+2,yy,w-4,2,'#4c343355');for(let xx=x+((yy-y)%16?8:0);xx<x+w;xx+=18)rect(c,xx,yy,2,8,'#4c343355')}
  }else if(material===5){
   for(let yy=y+5;yy<y+h-4;yy+=11){rect(c,x+4,yy,w-8,2,'#3b494a44')}rect(c,x+5,y+5,w-10,3,'#d6d5bd33');
  }else{
   for(let n=6;n<(horizontal?w:h)-4;n+=12){if(horizontal){rect(c,x+n,y+2,2,h-4,'#22353d');rect(c,x+n+2,y+2,1,h-4,'#bdd0cc33')}else{rect(c,x+2,y+n,w-4,2,'#22353d');rect(c,x+2,y+n+2,w-4,1,'#bdd0cc33')}}
   if(material===7){for(let n=10;n<(horizontal?w:h)-6;n+=28){if(horizontal)rect(c,x+n,y+5,5,5,'#d8ca8f');else rect(c,x+5,y+n,5,5,'#d8ca8f')}}
  }
  if(kind==='gate'){const bars=material>=6||material===2; if(bars){rect(c,x,y,w,h,'#17293155');for(let n=8;n<(horizontal?w:h)-5;n+=12){if(horizontal)rect(c,x+n,y+2,3,h-4,'#263940');else rect(c,x+2,y+n,w-4,3,'#263940')}}}
  return;
 }
 if(kind==='stone'){frame(c,x+5,y,w-10,h,'#88938a','#bcc1a4','#3b5156');rect(c,x+12,y+8,w-24,5,'#aeb49d');rect(c,x+w/2-2,y+18,4,Math.max(8,h-29),'#536c6c');rect(c,x+w/2-11,y+25,22,3,'#536c6c');rect(c,x+8,y+h-7,w-16,5,'#536953');return}
 if(kind==='curtain'){frame(c,x,y,w,h,'#794f64','#c49c91','#473e52');if(w>h){for(let xx=x+4;xx<x+w;xx+=10){rect(c,xx,y+3,4,h-6,'#ba8790');rect(c,xx+4,y+4,3,h-8,'#5f465b')}}else{for(let yy=y+5;yy<y+h;yy+=10){rect(c,x+3,yy,w-6,4,'#ba8790');rect(c,x+4,yy+4,w-8,3,'#5f465b')}}rect(c,x,y,w,3,'#c4b087');return}
 const metal=b.phase>=6;frame(c,x,y,w,h,metal?'#68818a':'#947550',metal?'#b8c8c0':'#c9af7d','#344a51');if(w>h){for(let xx=x+7;xx<x+w;xx+=14)rect(c,xx,y+4,2,h-8,'#283b4e66');rect(c,x+w-20,y+h/2-2,8,4,'#edcb8a')}else{for(let yy=y+7;yy<y+h;yy+=14)rect(c,x+4,yy,w-8,2,'#283b4e66');rect(c,x+w/2-2,y+h-20,4,8,'#edcb8a')}
}
export function drawStreetLamp(c,d){const{x,y}=d;ellipse(c,x+7,y+29,15,5,'#0c1c2855');frame(c,x-2,y,7,30,'#485b59','#819080','#1e333c');rect(c,x-8,y-9,20,3,'#8b997d');frame(c,x-6,y-6,16,16,'#d2ba7e','#f1ddb1','#3d5052');rect(c,x-2,y-3,7,9,'#fff0b8');rect(c,x-10,y-11,24,4,'#516b66')}
export function drawFerry(c,ferry={x:2140,y:260}){const x=ferry.x,y=ferry.y;frame(c,x-61,y-97,128,191,'#8e876a','#cbc5a0','#425957');for(let yy=y-88;yy<y+85;yy+=12)rect(c,x-56,yy,118,2,'#555e5355');for(const xx of [x-63,x+62])for(const yy of [y-86,y+72]){frame(c,xx,yy,8,15,'#a5a184','#d4d0ab');rect(c,xx+2,yy+2,4,4,'#e5dcbc')}
 frame(c,x-39,y-64,86,109,'#d3d5b3','#eef0ce','#607d78');frame(c,x-30,y-51,68,45,'#477578','#adc7b0');rect(c,x-25,y-46,22,33,'#9dc8b699');rect(c,x+7,y-46,24,33,'#9dc8b699');rect(c,x-26,y+8,60,6,'#6d9483');rect(c,x-27,y+28,16,5,'#b89e64');rect(c,x+19,y+28,16,5,'#b89e64');glow(c,x,y,130,'#d4ffcf1a');}

export function drawCemeteryExit(c,goal={x:1320,y:72},open=false){
 const x=goal.x,y=goal.y+48;
 rect(c,x-128,y-5,24,70,'#69736d');rect(c,x+104,y-5,24,70,'#69736d');rect(c,x-124,y-12,16,9,'#a8aa95');rect(c,x+108,y-12,16,9,'#a8aa95');
 rect(c,x-112,y-24,14,92,'#27363b');rect(c,x+98,y-24,14,92,'#27363b');
 if(open){
  for(const side of [-1,1]){const gx=x+side*80;rect(c,gx-6,y-10,12,66,'#36474b');for(let yy=y-8;yy<y+54;yy+=12)rect(c,gx-18*side,yy,18*side,3,'#27363b')}
  rect(c,x-28,y+54,56,6,'#6e786e55');
 }else{
  rect(c,x-100,y-10,200,8,'#36474b');
  for(let xx=x-94;xx<=x+94;xx+=16){rect(c,xx,y-13,4,72,'#26373d');rect(c,xx-2,y-19,8,7,'#78847d')}
  rect(c,x-100,y+55,200,6,'#182a31');
 }
}

