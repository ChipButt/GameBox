import test from 'node:test';
import assert from 'node:assert/strict';
import {initial,sanitize,newRun,runSpeed,runCapacity,runCost,buyRun,overlap,rayBlocked} from './model.js';
import {WORLD,SPAWN,FERRY,generateWorld,cellId,discover} from './world.js';

test('exploration awards a cell once inside a run and fresh attempts can explore again',()=>{const seen=new Set();assert.equal(discover(seen,300,2030),true);assert.equal(discover(seen,301,2031),false);assert.equal(discover(new Set(),300,2030),true);assert.equal(discover(seen,-1,0),false)});
test('visiting east, west, north and south stays distinct',()=>{const seen=new Set();for(const [x,y] of [[300,2030],[324,2030],[276,2030],[300,2006],[300,2054]])assert.ok(discover(seen,x,y));assert.equal(seen.size,5);assert.notEqual(cellId(WORLD.width-1,0),cellId(0,24))});
test('persistent save keeps only campaign progress and preferences',()=>{const p=sanitize({best:87,runs:4,level:2,unlockedLevel:3,sound:false,bank:999,speed:8,phase:7});assert.equal(p.best,87);assert.equal(p.runs,4);assert.equal(p.level,2);assert.equal(p.unlockedLevel,3);assert.equal(p.sound,false);assert.equal('bank' in p,false);assert.equal('speed' in p,false)});
test('run upgrades spend Echoes quickly and reset with a fresh run',()=>{const r=newRun(0);r.echoes=50;const price=runCost(r,'speed');assert.equal(price,20);assert.ok(buyRun(r,'speed'));assert.equal(r.speed,1);assert.equal(r.echoes,30);const next=newRun(0);assert.equal(next.echoes,0);assert.equal(next.speed,0);assert.equal(next.phase,0)});
test('later levels start slightly faster but upgrades remain run-local',()=>{const a=newRun(0),b=newRun(4);assert.ok(runSpeed(b)>runSpeed(a));a.invisibility=1;assert.equal(runCapacity(a),1.15);a.invisibility=2;assert.equal(runCapacity(a),1.95)});
test('generation stays identical between attempts and respects spawn and destination',()=>{const a=generateWorld(2717),b=generateWorld(2717);assert.deepEqual(a,b);assert.notDeepEqual(a.blocks,generateWorld(2718).blocks);for(const pt of [SPAWN,FERRY])assert.ok(!a.blocks.some(b=>overlap(pt.x,pt.y,b)));});
test('solid objects occlude vision, opened objects do not',()=>{const b={x:40,y:0,w:10,h:40};assert.equal(rayBlocked(0,20,100,20,[b]),true);b.open=true;assert.equal(rayBlocked(0,20,100,20,[b]),false)});
