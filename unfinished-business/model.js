export const MATERIALS=['None','Fabric','Wood','Plaster','Brick','Stone','Metal','Reinforced metal'];
export const MAX={speed:12,invisibility:12,phase:7,touch:5};
export const initial=()=>({bank:0,best:0,runs:0,speed:0,invisibility:0,phase:0,touch:0,won:false,sound:true});
export function sanitize(raw){const p=initial();for(const k of ['bank','best','runs',...Object.keys(MAX)])p[k]=Math.max(0,Math.min(MAX[k]??1e7,Math.floor(Number(raw?.[k])||0)));p.won=raw?.won===true;p.sound=raw?.sound!==false;return p;}
export const speed=p=>48+p.speed*11;
export const capacity=p=>p.invisibility?0.65+(p.invisibility-1)*0.65:0;
export const cost=(p,k)=>Math.round(({speed:50,invisibility:55,phase:90,touch:90}[k])*Math.pow(1.38,k==='speed'?p[k]:p[k]-1));
export function buy(p,k){if(!(k in MAX)||p[k]>=MAX[k]||(k!=='speed'&&!p[k])||p.bank<cost(p,k))return false;p.bank-=cost(p,k);p[k]++;return true;}
export const points=y=>Math.max(0,Math.floor((START-y)/8));
export const START=3400, FINISH=160;
export const AREAS=[{y:2780,name:'The house',floor:'#534b4d',kind:0},{y:2130,name:'The garage',floor:'#3c4b50',kind:1},{y:1540,name:'The garden',floor:'#354c46',kind:2},{y:800,name:'The street',floor:'#424758',kind:3},{y:0,name:'The crossing',floor:'#394b52',kind:4}];
export const areaAt=y=>AREAS.find(a=>y>=a.y)||AREAS.at(-1);
export function level(){const blocks=[];const add=(x,y,w,h,kind='wall',phase=99,touch=99)=>blocks.push({x,y,w,h,kind,phase,touch,open:false});
// Boundaries and staggered room openings keep a continuous, legible route.
add(0,0,22,3500);add(458,0,22,3500);add(0,3470,480,30);
for(const [y,gap,kind,p,t] of [[3060,320,'opening',0,0],[2780,110,'curtain',1,1],[2440,320,'door',2,2],[2130,115,'shutter',6,4],[1800,320,'gate',2,2],[1540,115,'gate',6,3],[1160,320,'barrier',4,4],[800,115,'gate',7,5],[460,320,'stone',5,5]]){add(22,y,gap-62,24);add(gap+62,y,458-gap-62,24);if(p)add(gap-62,y,124,24,kind,p,t);}
add(44,3240,100,165,'bed');add(362,3250,70,105,'dresser');add(45,2855,90,100,'sofa');add(370,2840,66,130,'cabinet');add(42,2510,88,160,'car');add(357,2220,76,120,'shelf');add(40,1910,80,140,'hedge');add(360,1630,74,110,'hedge');add(42,1280,85,135,'car');add(365,870,72,145,'car');add(42,550,95,150,'stone');
return blocks;}
export const patrols=()=>[3150,2920,2600,2290,1970,1670,1380,1020,660,310].map((y,i)=>({y,x:240,min:165,max:310,period:7-i*.25,offset:i*.7,range:160+i*3,angle:0}));
export const overlap=(x,y,b,r=10)=>!b.open&&x+r>b.x&&x-r<b.x+b.w&&y+r>b.y&&y-r<b.y+b.h;
export function rayBlocked(ax,ay,bx,by,blocks){const n=Math.ceil(Math.hypot(bx-ax,by-ay)/6);for(let i=1;i<n;i++){const x=ax+(bx-ax)*i/n,y=ay+(by-ay)*i/n;if(blocks.some(b=>overlap(x,y,b,0)))return true;}return false;}
