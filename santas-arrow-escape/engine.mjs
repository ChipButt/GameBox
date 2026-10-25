// Santa's Arrow Escape — deterministic, dependency-free puzzle engine.
// Cells in a path are ordered tail -> arrowhead; the head points outwards.
export const DIRECTIONS=[[1,0],[0,1],[-1,0],[0,-1]];
const key=(x,y)=>x+","+y;
function random(seed){let s=seed>>>0||1;return ()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return(s>>>0)/4294967296;};}
const integer=(rng,max)=>Math.floor(rng()*max);
export function dimensions(level){
  const tier=Math.min(6,Math.floor((Math.max(1,level)-1)/6));
  return {cols:9+tier,rows:12+tier,target:12+tier*4+Math.min(3,(level-1)%6)};
}
export function generateLevel(level){
  const n=Math.max(1,Math.floor(level));
  const {cols,rows,target}=dimensions(n);
  const rng=random((n*2654435761+982451653)>>>0);
  const occupied=new Set(),paths=[];
  // Reverse-construct: every added arrow is guaranteed a route off the board,
  // irrespective of arrows already present. Removing in reverse always wins.
  for(let attempt=0;attempt<Math.max(2200,target*150)&&paths.length<target;attempt++){
    const d=integer(rng,4),[dx,dy]=DIRECTIONS[d];
    const hx=integer(rng,cols),hy=integer(rng,rows);
    if(occupied.has(key(hx,hy)))continue;
    const exit=new Set();let clear=true;
    for(let x=hx+dx,y=hy+dy;x>=0&&x<cols&&y>=0&&y<rows;x+=dx,y+=dy){
      const k=key(x,y);exit.add(k);
      if(occupied.has(k)){clear=false;break;}
    }
    if(!clear)continue;
    let x=hx,y=hy,dir=(d+2)%4,forward=0;
    const nodes=[[x,y]],seen=new Set([key(x,y)]);
    const maxLength=4+integer(rng,5)+Math.min(5,Math.floor(n/10));
    const minLength=3+integer(rng,2);
    for(let z=1;z<maxLength;z++){
      const choices=[dir];
      if(forward>0){choices.push((dir+1)%4,(dir+3)%4);}
      const dirs=choices.sort(()=>rng()-.5);
      let found=false;
      for(const choice of dirs){
        const [sx,sy]=DIRECTIONS[choice],nx=x+sx,ny=y+sy,k=key(nx,ny);
        if(nx<0||nx>=cols||ny<0||ny>=rows||seen.has(k)||occupied.has(k)||exit.has(k))continue;
        x=nx;y=ny;dir=choice;forward++;nodes.push([x,y]);seen.add(k);found=true;break;
      }
      if(!found)break;
      if(nodes.length>=minLength&&rng()<(n<7?.24:.16))break;
    }
    if(nodes.length<minLength)continue;
    nodes.reverse();
    const id=paths.length;
    paths.push({id,points:nodes,color:id%5});
    for(const [px,py] of nodes)occupied.add(key(px,py));
  }
  return {level:n,cols,rows,paths};
}
export function direction(path){
  const a=path.points.at(-2),b=path.points.at(-1);
  if(!a||!b)return [0,0];
  return [Math.sign(b[0]-a[0]),Math.sign(b[1]-a[1])];
}
export function blockerIds(board,path){
  const [dx,dy]=direction(path),[hx,hy]=path.points.at(-1);
  if(!dx&&!dy)return [];
  const cells=new Map();
  for(const other of board.paths){
    if(other.id===path.id)continue;
    for(const [x,y] of other.points)cells.set(key(x,y),other.id);
  }
  const blocking=new Set();
  for(let x=hx+dx,y=hy+dy;x>=0&&x<board.cols&&y>=0&&y<board.rows;x+=dx,y+=dy){
    if(cells.has(key(x,y)))blocking.add(cells.get(key(x,y)));
  }
  return [...blocking];
}
export const isFree=(board,path)=>blockerIds(board,path).length===0;
export const freePaths=board=>board.paths.filter(path=>isFree(board,path));
export function removeArrow(board,id){
  const path=board.paths.find(p=>p.id===id);
  if(!path)return {ok:false,reason:"missing",board};
  if(!isFree(board,path))return {ok:false,reason:"blocked",board};
  return {ok:true,removed:path,board:{...board,paths:board.paths.filter(p=>p.id!==id)}};
}
export function verifyBoard(board){
  const cells=new Set();
  for(const path of board.paths){
    for(let i=0;i<path.points.length;i++){
      const [x,y]=path.points[i],k=key(x,y);
      if(x<0||y<0||x>=board.cols||y>=board.rows||cells.has(k))return false;
      cells.add(k);
      if(i){const [px,py]=path.points[i-1];if(Math.abs(x-px)+Math.abs(y-py)!==1)return false;}
    }
  }
  const copy={...board,paths:board.paths.slice()};
  while(copy.paths.length){
    const free=freePaths(copy);
    if(!free.length)return false;
    copy.paths=copy.paths.filter(p=>p.id!==free[0].id);
  }
  return true;
}
