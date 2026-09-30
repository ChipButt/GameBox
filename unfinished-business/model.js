import {WORLD} from './world.js?v=20260930g';
export const MATERIALS=['None','Fabric','Wood','Plaster','Brick','Stone','Metal','Reinforced metal'];
export const RUN_MAX={speed:6,phase:7};
export const initial=()=>({best:0,runs:0,won:false,sound:true,worldSeed:2717,worldVersion:WORLD.version,level:0,unlockedLevel:0,introSeen:false,tutorialSeen:false});
export function sanitize(raw){
 const p=initial();
 p.best=Math.max(0,Math.floor(Number(raw?.best)||0));
 p.runs=Math.max(0,Math.floor(Number(raw?.runs)||0));
 p.worldSeed=Number.isInteger(raw?.worldSeed)?raw.worldSeed>>>0:2717;
 p.level=Math.max(0,Math.min(4,Math.floor(Number(raw?.level)||0)));
 p.unlockedLevel=Math.max(p.level,Math.min(4,Math.floor(Number(raw?.unlockedLevel)||0)));
 p.won=raw?.won===true;p.sound=raw?.sound!==false;
 p.introSeen=raw?.introSeen===true;p.tutorialSeen=raw?.tutorialSeen===true;
 return p;
}
export const newRun=level=>({speed:0,phase:0,level});
export const runSpeed=r=>78+r.level*4+r.speed*10;
export const overlap=(x,y,b,r=10)=>!b.open&&x+r>b.x&&x-r<b.x+b.w&&y+r>b.y&&y-r<b.y+b.h;
export function rayBlocked(ax,ay,bx,by,blocks){const n=Math.ceil(Math.hypot(bx-ax,by-ay)/6);for(let i=1;i<n;i++){const x=ax+(bx-ax)*i/n,y=ay+(by-ay)*i/n;if(blocks.some(b=>overlap(x,y,b,0)))return true;}return false;}
