import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {generateWorld,LEVELS} from './world.js';
import {overlap} from './model.js';
import {navigation,createEntities,clearSegment} from './entities.js';

// Read the actual task destinations without booting the game's DOM/UI.
const game=readFileSync(new URL('./game.js',import.meta.url),'utf8');
const taskLiteral=game.match(/const LEVEL_TASKS=(\[[\s\S]*?\n\]);/)[1];
const tasks=vm.runInNewContext(taskLiteral);
const intersects=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
function assertRoute(nav,blocks,from,to,label){
 const path=nav.path(from,to);
 assert.ok(path,label+' has no route');
 assert.deepEqual({x:path.at(-1).x,y:path.at(-1).y},{x:to.x,y:to.y},label+' does not reach its destination');
 for(let i=1;i<path.length;i++)assert.ok(clearSegment(path[i-1],path[i],blocks,10),label+' crosses a solid');
}
for(let level=0;level<LEVELS.length;level++){
 test(`${LEVELS[level].name}: spawn, public rooms, tasks and patrols have walking routes`,()=>{
  for(const seed of [0,1,2717,4294967295]){
   const world=generateWorld(seed,level),{blocks,spawn,ferry}=world,nav=navigation(blocks);
   assert.ok(!blocks.some(b=>overlap(spawn.x,spawn.y,b)),'spawn is obstructed');
   assert.ok(!blocks.some(b=>overlap(ferry.x,ferry.y,b)),'exit destination is obstructed');
   for(const room of world.regions){
    const center=nav.nearest({x:room.x+room.w/2,y:room.y+room.h/2});
    assert.ok(center,room.name+' has no accessible interior');
    assertRoute(nav,blocks,spawn,center,room.name);
   }
   for(const task of tasks[level]){
    const point=nav.nearest(task);assert.ok(point,task.title);
    assertRoute(nav,blocks,spawn,point,task.title);
   }
   for(const e of createEntities(nav,level).filter(e=>e.route)){
    for(let i=0;i<e.route.length;i++)assertRoute(nav,blocks,e.route[i],e.route[(i+1)%e.route.length],e.task);
   }
   // All door/gate openings must really remove the solid behind them.
   for(const d of blocks.filter(b=>b.kind==='door'||b.kind==='gate')){
    assert.ok(!blocks.some(b=>(b.kind==='wall'||b.kind==='water')&&intersects(b,d)),'solid under door/gate');
    if(!d.entrance)continue;
    const horizontal=d.w>=d.h,center={x:d.x+d.w/2,y:d.y+d.h/2};
    const a=horizontal?{x:center.x,y:d.y-24}:{x:d.x-24,y:center.y};
    const b=horizontal?{x:center.x,y:d.y+d.h+24}:{x:d.x+d.w+24,y:center.y};
    assert.ok(clearSegment(a,b,blocks,10),'public doorway is obstructed '+JSON.stringify(d));
   }
   if(level===0){
    assert.equal(nav.path(spawn,ferry),null,'cemetery exit should stay story-locked');
    blocks.find(b=>b.exit).open=true;
   }
   assertRoute(navigation(blocks),blocks,spawn,ferry,'level exit');
  }
 });
}
test('workplace spawn has a nearby public door, usable with zero Phase',()=>{
 const {blocks,spawn}=generateWorld(2717,1),nav=navigation(blocks);
 const door=blocks.find(b=>b.entrance&&b.x===360&&b.y===2228);
 assert.ok(door?.open);
 const outside={x:420,y:2290},path=nav.path(spawn,outside);
 assertRoute(nav,blocks,spawn,outside,'staff entrance');
 const distance=path.reduce((n,p,i)=>i?n+Math.hypot(p.x-path[i-1].x,p.y-path[i-1].y):n,0);
 assert.ok(distance<450,'spawn exit requires an unreasonable detour');
});
