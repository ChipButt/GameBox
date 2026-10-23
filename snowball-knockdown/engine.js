(function(root,factory){const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;root.SnowballEngine=api;})(typeof globalThis!=="undefined"?globalThis:this,function(){
"use strict";
const W=420,H=640, START={x:210,y:575};
const PATTERNS=[
{rows:[3],balls:4},{rows:[3,2],balls:5},{rows:[4,3,2],balls:5},{rows:[5,4,3],balls:5,blast:[1,1]},
{rows:[3,4,3],balls:5,block:[{x:169,y:466,w:82,h:15}]},
{rows:[5,4,3,2],balls:6,blast:[2,1]},{rows:[6,5,4],balls:6,block:[{x:108,y:475,w:68,h:13},{x:255,y:475,w:68,h:13}]},
{rows:[4,5,4,3],balls:6,blast:[1,2]},{rows:[6,5,4,3],balls:6,block:[{x:189,y:474,w:43,h:14}]},
{rows:[7,6,5],balls:7,blast:[0,3]},{rows:[5,4,5,3],balls:6,block:[{x:107,y:459,w:65,h:13},{x:248,y:459,w:65,h:13}],blast:[3,1]},
{rows:[7,6,5,4],balls:7,blast:[2,2]}
];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function makeLevel(level){
  const idx=Math.max(1,Math.floor(level||1)),p=PATTERNS[(idx-1)%PATTERNS.length];
  const cycle=Math.floor((idx-1)/PATTERNS.length),spacing=43;
  const tins=[];
  p.rows.forEach((count,r)=>{
    for(let c=0;c<count;c++){
      const x=210+(c-(count-1)/2)*spacing;
      const y=389-r*52+(r%2===1?2:0);
      tins.push({id:r*10+c,x,y,baseX:x,baseY:y,vx:0,vy:0,angle:0,spin:0,age:0,
        fallen:false,type:p.blast&&p.blast[0]===r&&p.blast[1]===c?"blast":"regular",
        color:(c+r+idx)%3});
    }
  });
  return {level:idx,tins,barriers:(p.block||[]).map(b=>({...b})),balls:Math.min(9,p.balls+Math.min(2,cycle)),
    initialBalls:Math.min(9,p.balls+Math.min(2,cycle)),ball:null,particles:[],events:[],won:false,failed:false,used:0,clock:0,
    score:0,aim:{x:210,y:335}};
}
function strikeTin(s,t,dx,dy,power=230,chain=false){
  if(t.fallen)return false;
  const length=Math.hypot(dx,dy)||1;dx/=length;dy/=length;
  t.fallen=true;t.age=0;t.vx=dx*power*.54;t.vy=dy*power*.37-17;t.spin=(dx>=0?1:-1)*(3.5+power/200);t.angle=0.02;
  s.score+=chain?80:120;
  s.events.push({kind:t.type==="blast"?"blast":"tin",x:t.x,y:t.y});
  if(t.type==="blast"){
    const other=s.tins.filter(o=>!o.fallen&&Math.hypot(o.x-t.x,o.y-t.y)<126);
    other.forEach(o=>{const vx=o.x-t.x,vy=o.y-t.y;strikeTin(s,o,vx||Math.random()-.5,vy||-1,220,true);});
  }
  return true;
}
function launch(s,x,y,power=1){
  if(s.ball||s.balls<=0||s.won||s.failed)return false;
  let dx=x-START.x,dy=y-START.y;const len=Math.hypot(dx,dy);
  if(len<8)return false;
  dx/=len;dy/=len;
  if(dy>-.13)dy=-.13;
  const vl=Math.hypot(dx,dy);dx/=vl;dy/=vl;
  const speed=clamp(power,.7,1.3)*820;
  s.ball={x:START.x,y:START.y,vx:dx*speed,vy:dy*speed,r:12,age:0,trail:[],struck:[]};
  s.balls--;s.used++;s.events.push({kind:"throw",x:START.x,y:START.y});return true;
}
function step(s,dt){
  dt=clamp(dt,0,.033);s.clock+=dt;s.events.length=0;
  let b=s.ball;
  if(b){
    const steps=3,sub=dt/steps;
    for(let substep=0;substep<steps&&s.ball;substep++){
      b.age+=sub;b.trail.push([b.x,b.y]);if(b.trail.length>7)b.trail.shift();
      b.x+=b.vx*sub;b.y+=b.vy*sub;
      if(b.x<18||b.x>W-18){b.x=clamp(b.x,18,W-18);b.vx*=-.78;s.events.push({kind:"wood",x:b.x,y:b.y});}
      for(const q of s.barriers){
        const nearestX=clamp(b.x,q.x,q.x+q.w),nearestY=clamp(b.y,q.y,q.y+q.h);
        if(Math.hypot(b.x-nearestX,b.y-nearestY)<b.r+0+10 || Math.hypot(b.x-nearestX,b.y-nearestY)<b.r){
          const left=Math.abs(b.x-q.x),right=Math.abs(b.x-(q.x+q.w)),top=Math.abs(b.y-q.y),bottom=Math.abs(b.y-(q.y+q.h));
          if(Math.min(left,right)<Math.min(top,bottom)){b.vx*=-.65;b.x+=b.vx*sub*3;}else{b.vy*=-.58;b.y+=b.vy*sub*3;}
          s.events.push({kind:"wood",x:b.x,y:b.y});
        }
      }
      for(const t of s.tins){
        if(t.fallen||b.struck.includes(t.id))continue;
        const d=Math.hypot(t.x-b.x,(t.y+3)-b.y);
        if(d<29){
          strikeTin(s,t,b.vx,b.vy,Math.hypot(b.vx,b.vy)*.58,false);
          b.struck.push(t.id);
          b.vx*=.68;b.vy*=.78;
          b.x+=(b.vx>0?1:-1)*2;
        }
      }
      if(b.y<125||b.y>H+30||b.age>2.7||Math.hypot(b.vx,b.vy)<55){s.ball=null;break;}
    }
  }
  for(const t of s.tins){
    if(!t.fallen)continue;
    t.age+=dt;
    t.x+=t.vx*dt;t.y+=t.vy*dt;
    const drag=Math.exp(-2.3*dt);t.vx*=drag;t.vy*=drag;
    t.vy+=30*dt;
    t.x=clamp(t.x,24,W-24);t.y=clamp(t.y,210,451);
    t.angle=Math.sign(t.spin||1)*Math.min(1.45,t.age*4.7);
  }
  for(const f of s.tins){
    if(!f.fallen||f.age>1.2)continue;
    for(const t of s.tins){
      if(t.fallen)continue;
      const d=Math.hypot(t.x-f.x,t.y-f.y);
      if(d<51&&Math.hypot(f.vx,f.vy)>35)strikeTin(s,t,f.vx+(t.x-f.x)*3,f.vy+(t.y-f.y)*3,190,true);
    }
  }
  if(!s.won&&!s.failed&&!s.ball){
    if(s.tins.every(t=>t.fallen)){s.won=true;s.score+=s.balls*150;s.events.push({kind:"win",x:210,y:300});}
    else if(s.balls<=0){s.failed=true;s.events.push({kind:"lose",x:210,y:300});}
  }
  return s;
}
function stars(s){return s.won?(s.used<=Math.ceil(s.initialBalls*.55)?3:s.used<s.initialBalls?2:1):0;}
return {W,H,START,PATTERNS,makeLevel,launch,step,strikeTin,stars};
});
