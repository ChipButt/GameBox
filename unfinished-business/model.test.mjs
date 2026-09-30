import test from 'node:test';
import assert from 'node:assert/strict';
import {initial,sanitize,newRun,runSpeed,phaseCost,buyPhase,overlap,rayBlocked} from './model.js';
import {WORLD,SPAWN,FERRY,generateWorld,cellId,discover} from './world.js';

test('exploration awards one cell once inside a run and fresh attempts can explore again',()=>{const seen=new Set();assert.equal(discover(seen,300,2030),true);assert.equal(discover(seen,301,2031),false);assert.equal(discover(new Set(),300,2030),true);assert.equal(discover(seen,-1,0),false)});
test('visiting adjacent directions stays distinct',()=>{const seen=new Set();for(const [x,y] of [[300,2030],[324,2030],[276,2030],[300,2006],[300,2054]])assert.ok(discover(seen,x,y));assert.equal(seen.size,5);assert.notEqual(cellId(WORLD.width-1,0),cellId(0,24))});
test('persistent save keeps campaign, intro/tutorial progress and preferences only',()=>{const p=sanitize({best:87,runs:4,level:2,unlockedLevel:3,sound:false,introSeen:true,tutorialSeen:true,bank:999,speed:8});assert.equal(p.best,87);assert.equal(p.runs,4);assert.equal(p.level,2);assert.equal(p.unlockedLevel,3);assert.equal(p.sound,false);assert.equal(p.introSeen,true);assert.equal(p.tutorialSeen,true);assert.equal('bank' in p,false)});
test('run upgrades and Echoes reset with a fresh run',()=>{const r=newRun(0);r.speed=3;r.phase=4;r.echoes=99;const next=newRun(0);assert.equal(next.speed,0);assert.equal(next.phase,0);assert.equal(next.echoes,0);assert.equal('invisibility' in next,false)});
test('Phase levels are bought with Echoes',()=>{const r=newRun(0),price=phaseCost(r);assert.equal(price,28);assert.equal(buyPhase(r),false);r.echoes=price;assert.equal(buyPhase(r),true);assert.equal(r.phase,1);assert.equal(r.echoes,0);assert.ok(phaseCost(r)>price)});
test('later levels begin slightly faster',()=>{assert.ok(runSpeed(newRun(4))>runSpeed(newRun(0)));const r=newRun(0);r.speed=2;assert.ok(runSpeed(r)>runSpeed(newRun(0)))});
test('graveyard generation is stable and spawn is clear',()=>{const a=generateWorld(2717,0),b=generateWorld(2717,0);assert.deepEqual(a,b);assert.notDeepEqual(a.blocks,generateWorld(2718,0).blocks);assert.ok(!a.blocks.some(b=>overlap(a.spawn.x,a.spawn.y,b)));});
test('solid objects occlude vision, opened objects do not',()=>{const b={x:40,y:0,w:10,h:40};assert.equal(rayBlocked(0,20,100,20,[b]),true);b.open=true;assert.equal(rayBlocked(0,20,100,20,[b]),false)});
