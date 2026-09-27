import {WORLD} from './world.js';
export const MATERIALS=['None','Fabric','Wood','Plaster','Brick','Stone','Metal','Reinforced metal'];
export const MAX={speed:12,invisibility:12,phase:7,touch:5};
export const initial=()=>({bank:0,best:0,runs:0,speed:0,invisibility:0,phase:0,touch:0,won:false,sound:true,worldSeed:2717,worldVersion:WORLD.version,visited:[]});
export function sanitize(raw){const p=initial();for(const k of ['bank','best','runs',...Object.keys(MAX)])p[k]=Math.max(0,Math.min(MAX[k]??1e7,Math.floor(Number(raw?.[k])||0)));p.worldSeed=Number.isInteger(raw?.worldSeed)?raw.worldSeed>>>0:2717;p.visited=raw?.worldVersion===WORLD.version&&Array.isArray(raw?.visited)?[...new Set(raw.visited.filter(n=>Number.isInteger(n)&&n>=0&&n<Math.ceil(WORLD.width/WORLD.cell)*Math.ceil(WORLD.height/WORLD.cell)))]:[];p.won=raw?.won===true;p.sound=raw?.sound!==false;return p;}
export const speed=p=>48+p.speed*11;
export const capacity=p=>p.invisibility?0.65+(p.invisibility-1)*0.65:0;
export const cost=(p,k)=>Math.round(({speed:50,invisibility:55,phase:90,touch:90}[k])*Math.pow(1.38,k==='speed'?p[k]:p[k]-1));
export function buy(p,k){if(!(k in MAX)||p[k]>=MAX[k]||(k!=='speed'&&!p[k])||p.bank<cost(p,k))return false;p.bank-=cost(p,k);p[k]++;return true;}
export const overlap=(x,y,b,r=10)=>!b.open&&x+r>b.x&&x-r<b.x+b.w&&y+r>b.y&&y-r<b.y+b.h;
export function rayBlocked(ax,ay,bx,by,blocks){const n=Math.ceil(Math.hypot(bx-ax,by-ay)/6);for(let i=1;i<n;i++){const x=ax+(bx-ax)*i/n,y=ay+(by-ay)*i/n;if(blocks.some(b=>overlap(x,y,b,0)))return true;}return false;}
