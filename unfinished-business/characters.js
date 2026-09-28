// Eight-direction pixel characters. Animation is driven by distance travelled,
// so feet stop when the actor stops and faster actors take quicker steps.
export const direction8=angle=>((Math.round(angle/(Math.PI/4))%8)+8)%8;
const rect=(c,x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),w,h)};
const pixelEllipse=(c,x,y,rx,ry,color)=>{for(let row=-ry;row<=ry;row++){const half=Math.floor(rx*Math.sqrt(Math.max(0,1-row*row/(ry*ry))));rect(c,x-half,y+row,2*half+1,1,color)}};
export function pose(e,reduced=false){const direction=direction8(e.angle),a=direction*Math.PI/4,moving=e.frozen<=0&&!['wait','search'].includes(e.state)&&!!e.path?.length;const frame=moving?Math.floor(e.walk/5)%8:0;const cycle=[0,1,2,1,0,-1,-2,-1][frame];return {direction,a,moving,frame,stride:cycle,bob:moving&&!reduced&&frame%4===2?-1:0,idle:e.frozen>0||reduced?0:Math.sin((e.animationTime||0)*2.1+e.id)*.6};}
function pixelLimb(c,x1,y1,x2,y2,width,color){
 const dx=x2-x1,dy=y2-y1,steps=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dy))));
 for(let i=0;i<=steps;i++){const q=i/steps;rect(c,x1+dx*q-width/2,y1+dy*q-width/2,width,width,color)}
}
export function drawHuman(c,e,reduced=false){
 const p=pose(e,reduced),d=p.direction,a=p.a;
 const front=[1,2,3].includes(d),back=[5,6,7].includes(d),side=d===0||d===4,diagonal=d%2===1;
 const fx=Math.cos(a),fy=Math.sin(a),px=-fy,py=Math.cos(a);
 const skin=['#d8b38d','#b88969','#edc8a2','#a97861'][e.id%4],
       hair=['#56443e','#393d40','#826c4d','#b19a72'][e.id%4],
       shirt=e.tint||'#819792',light='#cbd1b333',dark='#233b4255';
 const bob=p.bob+Math.round(p.idle),stride=p.moving?p.stride:0;
 // A smaller gait amplitude prevents the old rubber-limb look.
 const step=stride*1.55,armSwing=-step*.82;
 const depthY=.62; // screen-space depth compression for the elevated top-down camera.
 const project=(forward,sideways)=>({x:fx*forward+px*sideways,y:fy*forward*depthY+py*sideways*.34});
 c.save();c.translate(Math.round(e.x),Math.round(e.y));c.scale(1.35,1.35);
 pixelEllipse(c,1,13,13,4,'#08182055');

 // Hips/feet: the two feet move in opposite phases along the actual travel heading.
 const hipY=0;
 const legSide=3.2;
 const legA=project(-step, -legSide),legB=project(step, legSide);
 const hipA=project(0,-legSide*.55),hipB=project(0,legSide*.55);
 const kneeA={x:(hipA.x+legA.x)*.48,y:hipY+5+(hipA.y+legA.y)*.35};
 const kneeB={x:(hipB.x+legB.x)*.48,y:hipY+5+(hipB.y+legB.y)*.35};
 const footA={x:legA.x,y:11+legA.y},footB={x:legB.x,y:11+legB.y};

 // Draw the limb farther "up-screen" first so crossings look natural.
 const legs=[
  {hip:hipA,knee:kneeA,foot:footA,trouser:'#283d4b',shoe:'#122635',sole:'#81908a'},
  {hip:hipB,knee:kneeB,foot:footB,trouser:'#354b58',shoe:'#142b39',sole:'#98a39a'}
 ].sort((u,v)=>u.foot.y-v.foot.y);
 for(const l of legs){
  pixelLimb(c,l.hip.x,hipY+l.hip.y,l.knee.x,l.knee.y,5,l.trouser);
  pixelLimb(c,l.knee.x,l.knee.y,l.foot.x,l.foot.y-2,5,l.trouser);
  const toe=project(3.2,0);
  pixelLimb(c,l.foot.x-2,l.foot.y,l.foot.x+toe.x+3,l.foot.y+toe.y,4,l.shoe);
  rect(c,l.foot.x-1,l.foot.y+2,5,1,l.sole);
 }

 const torsoW=side?15:diagonal?20:23,tx=-Math.floor(torsoW/2),ty=-17+bob;
 const work=!p.moving&&e.state==='wait'&&e.frozen<=0&&!reduced,phase=(e.animationTime||0)*3;
 const armLift=work?Math.round((Math.sin(phase)+1)*(e.id%3===0?3:2)):0;

 // Shoulder positions follow the apparent body width. Hands swing along travel,
 // opposite to their same-side foot, instead of only moving vertically.
 const shoulderSide=Math.max(6,torsoW/2-1),shoulderY=ty+6;
 const leftShoulder=project(0,-shoulderSide),rightShoulder=project(0,shoulderSide);
 const leftHandMove=project(armSwing,-shoulderSide*.18);
 const rightHandMove=project(-armSwing,shoulderSide*.18);
 const arms=[
  {s:leftShoulder,m:leftHandMove,shirt,skin,side:-1},
  {s:rightShoulder,m:rightHandMove,shirt,skin,side:1}
 ].sort((u,v)=>(shoulderY+u.s.y)-(shoulderY+v.s.y));

 // Far arm behind torso.
 const farArm=arms[0];
 const farElbow={x:farArm.s.x+farArm.m.x*.48,y:shoulderY+farArm.s.y+6+farArm.m.y*.45-armLift};
 const farHand={x:farArm.s.x+farArm.m.x,y:shoulderY+farArm.s.y+13+farArm.m.y-armLift};
 pixelLimb(c,farArm.s.x,shoulderY+farArm.s.y,farElbow.x,farElbow.y,5,shirt);
 pixelLimb(c,farElbow.x,farElbow.y,farHand.x,farHand.y,4,skin);

 // Torso.
 rect(c,tx,ty,torsoW,22,shirt);rect(c,tx+2,ty+2,torsoW-4,2,light);rect(c,tx+torsoW-4,ty+4,4,18,dark);rect(c,tx,ty+20,torsoW,3,'#253c4866');
 if(front){rect(c,-1,ty+3,2,16,'#d0c4a34d');for(let yy=ty+6;yy<ty+18;yy+=5)rect(c,1,yy,1,1,'#e4d9b9');rect(c,tx+4,ty+8,5,4,'#253d4333')}
 if(back){rect(c,tx+4,ty+4,torsoW-8,1,'#d4d2b633');rect(c,tx+4,ty+11,torsoW-8,1,'#203b4233')}

 // Near arm in front of torso.
 const nearArm=arms[1];
 const nearElbow={x:nearArm.s.x+nearArm.m.x*.48,y:shoulderY+nearArm.s.y+6+nearArm.m.y*.45-armLift};
 const nearHand={x:nearArm.s.x+nearArm.m.x,y:shoulderY+nearArm.s.y+13+nearArm.m.y-armLift};
 pixelLimb(c,nearArm.s.x,shoulderY+nearArm.s.y,nearElbow.x,nearElbow.y,5,shirt);
 pixelLimb(c,nearElbow.x,nearElbow.y,nearHand.x,nearHand.y,4,skin);

 // Neck/head with the existing eight-way facial read.
 const right=Math.cos(a)>=0?1:-1,hx=(side?right*2:diagonal?right:0),hy=ty-17,hw=side?13:16;
 rect(c,hx-3,ty-3,6,5,skin);rect(c,hx-Math.floor(hw/2),hy+3,hw,14,skin);rect(c,hx-Math.floor(hw/2)+2,hy,hw-4,19,skin);
 if(back){rect(c,hx-Math.floor(hw/2)-1,hy,hw+2,14,hair);rect(c,hx-5,hy+13,10,3,hair);rect(c,hx-3,hy+2,7,2,'#d5bd8f22');if(diagonal)rect(c,hx+right*7,hy+11,2,3,skin)}
 else{rect(c,hx-Math.floor(hw/2)-1,hy,hw+2,5,hair);rect(c,hx-Math.floor(hw/2),hy+4,side?4:3,6,hair);rect(c,hx-4,hy+1,7,1,'#d8bd9229');if(side){rect(c,hx+right*6,hy+10,3,4,skin);rect(c,hx+right*4,hy+8,2,2,'#1c3039');rect(c,hx-right*5,hy+11,2,3,'#efc79a66')}else{const shift=diagonal?right*2:0;rect(c,hx-4+shift,hy+9,2,2,'#21333c');rect(c,hx+3+shift,hy+9,2,2,'#21333c');rect(c,hx+shift,hy+12,2,2,'#ad806b');rect(c,hx-1+shift,hy+15,3,1,'#a27365')}}

 // Idle task gestures only happen while stopped; walking never mixes in work poses.
 if(work){const handY=ty+13-armLift;if(e.id%3===0){rect(c,tx+torsoW-2,handY,8,9,'#cabf93');rect(c,tx+torsoW,handY+2,4,1,'#7c8770');rect(c,tx+torsoW,handY+5,4,1,'#7c8770')}else if(e.id%3===1){rect(c,tx+torsoW-3,handY+3,8,3,skin);rect(c,tx+torsoW-1,handY+3,2,3,'#a3b9ac')}else{rect(c,tx+torsoW-2,handY,3,9,'#677e83');rect(c,tx+torsoW-4,handY,7,3,'#bec7ae')}}
 c.restore();
}
export function drawCat(c,e,reduced=false){const p=pose(e,reduced),dx=Math.cos(p.a),dy=Math.sin(p.a),back=[5,6,7].includes(p.direction),side=p.direction===0||p.direction===4;const clock=e.frozen>0||reduced?0:e.animationTime||0;
 c.save();c.translate(Math.round(e.x),Math.round(e.y));pixelEllipse(c,0,8,14,4,'#07172155');
 // Four paws use opposite diagonal pairs; body orientation follows all eight headings.
 const perpendicular={x:-dy*5,y:dx*3};for(let i=0;i<4;i++){const fore=i<2?1:-1,sign=i%2?1:-1,stride=p.moving?p.stride*(i===0||i===3?1:-1):0;const x=dx*fore*7+perpendicular.x*sign+dx*stride,y=dy*fore*5+perpendicular.y*sign+6+dy*stride;rect(c,x-1,y-1,3,5,'#111d28');rect(c,x,y+3,3,1,'#53636a')}
 // Tail curls in world-facing direction; a seated cat flicks just the tip.
 const tx=-dx*11,ty=-dy*8-5,swish=Math.round(Math.sin(clock*3)*2);for(let i=0;i<5;i++)rect(c,tx-dx*i*2+(-dy)*Math.sin(i*.7)*3,ty-dy*i*1.5-i+swish*(i/4),3,3,i<3?'#17232e':'#283844');
 if(side){pixelEllipse(c,0,-3,12,6,'#15212c');rect(c,-7,-8,13,2,'#31404a')}else if(p.direction%2===0){pixelEllipse(c,0,-3,7,11,'#15212c');rect(c,-3,-11,2,14,'#31404a')}else{for(let i=-6;i<=6;i+=2)pixelEllipse(c,dx*i,-3+dy*i*.7,7,5,'#17242f');rect(c,-2,-9,5,2,'#36434b')}
 const hx=Math.round(dx*11),hy=Math.round(dy*8-10)+p.bob;
 rect(c,hx-6,hy-4,13,11,'#17242f');rect(c,hx-4,hy-6,9,14,'#17242f');rect(c,hx-6,hy-9,3,7,'#17242f');rect(c,hx+4,hy-9,3,7,'#17242f');rect(c,hx-5,hy-7,1,3,'#6f656b');rect(c,hx+5,hy-7,1,3,'#6f656b');
 if(!back){const shift=side?Math.sign(dx)*2:0;rect(c,hx-3+shift,hy,2,2,'#d0e98e');if(!side)rect(c,hx+3+shift,hy,2,2,'#d0e98e');rect(c,hx+shift,hy+4,2,1,'#ba8d94');rect(c,hx-8,hy+4,4,1,'#6e7b8066');rect(c,hx+6,hy+4,4,1,'#6e7b8066')}else{rect(c,hx-3,hy-3,6,1,'#43505a');rect(c,hx-1,hy,2,4,'#273540')}
 if(!p.moving&&e.state==='wait'&&e.frozen<=0&&!reduced&&Math.sin(clock*1.4)>.6){rect(c,hx-4,hy+7,4,4,'#263642');rect(c,hx-2,hy+6,3,2,'#66747b')}
 c.restore();}

export function drawCyclist(c,e,reduced=false){
 const p=pose(e,reduced),spin=reduced?0:(e.walk||0)*.22;
 c.save();c.translate(Math.round(e.x),Math.round(e.y));c.rotate(e.angle);
 // Top-down bike: front/rear tyres align with travel direction, rider sits over the frame.
 c.fillStyle='#07151d55';c.beginPath();c.ellipse(0,8,27,8,0,0,Math.PI*2);c.fill();
 const tyre=(x)=>{c.fillStyle='#111d25';c.beginPath();c.ellipse(x,4,8,4,0,0,Math.PI*2);c.fill();c.strokeStyle='#8c999477';c.lineWidth=1;c.beginPath();c.moveTo(x-5,4);c.lineTo(x+5,4);c.moveTo(x,1);c.lineTo(x,7);c.stroke();};
 tyre(-18);tyre(18);
 c.strokeStyle='#b08b58';c.lineWidth=3;c.beginPath();c.moveTo(-16,4);c.lineTo(-3,0);c.lineTo(8,4);c.lineTo(-16,4);c.moveTo(-3,0);c.lineTo(16,4);c.moveTo(8,4);c.lineTo(5,-5);c.stroke();
 // Handlebar and saddle read clearly from above.
 c.strokeStyle='#d1bd87';c.lineWidth=2;c.beginPath();c.moveTo(14,-4);c.lineTo(20,-7);c.moveTo(14,-4);c.lineTo(20,0);c.stroke();
 rect(c,-8,-4,5,8,'#2b3d48');
 // Rider: shoulders across the bike, torso/head pointing along travel direction.
 const bob=p.moving&&!reduced?Math.round(Math.sin(spin)*1):0;c.translate(0,bob);
 pixelEllipse(c,5,-2,7,7,'#d5ad88');
 rect(c,-8,-7,14,14,e.tint||'#6f8798');rect(c,-11,-5,5,10,'#6f8798');rect(c,6,-5,5,10,'#6f8798');
 rect(c,-8,5,6,9,'#283d4b');rect(c,2,5,6,9,'#354b58');
 rect(c,-2,-8,5,3,'#e2c19b');rect(c,1,-11,7,6,'#3b4850');
 // Hands on bars and pedalling feet.
 rect(c,11,-7,4,4,'#d5ad88');rect(c,11,1,4,4,'#d5ad88');
 const pedal=Math.sin(spin)*4;rect(c,-6+pedal,12,5,3,'#172733');rect(c,2-pedal,12,5,3,'#172733');
 c.restore();
}
