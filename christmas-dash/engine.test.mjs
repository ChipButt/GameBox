import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun, startRun, steer, jump, duck, advance, spawnRow} from './engine.mjs';
test('all generated rows offer a safe route or a clearly actionable jump/duck route',()=>{
  const run=createRun(()=>0.49);
  run.rows=4; run.distance=500;
  for(let i=0;i<80;i++){
    run.objects=[];spawnRow(run);
    const hazardLanes = new Set(run.objects.filter(o=>o.kind!=='gift').map(o=>o.lane));
    const giftLanes = new Set(run.objects.filter(o=>o.kind==='gift').map(o=>o.lane));
    assert.equal(run.objects.filter(o=>o.kind==='gift').length,3);
    assert.ok([0,1,2].some(l=>{
      const hazards=run.objects.filter(o=>o.kind!=='gift'&&o.lane===l);
      return giftLanes.has(l) && (hazards.length===0 || (hazards.length===1 && ['crate','arch'].includes(hazards[0].kind)));
    }));
  }
});
test('lane changes stay inside the three lanes',()=>{
  const r=createRun(); startRun(r);
  for(let i=0;i<9;i++)steer(r,-1);assert.equal(r.lane,0);
  for(let i=0;i<9;i++)steer(r,1);assert.equal(r.lane,2);
});
test('running earns distance, score and pauses safely',()=>{
  const r=createRun(()=>0);startRun(r);
  advance(r,.04);assert.ok(r.distance>0);
  r.status='paused';let before=r.distance;advance(r,.04);assert.equal(r.distance,before);
});
test('a standing runner collides with an unavoidable snowman in their lane',()=>{
  const r=createRun(()=>0.3);startRun(r);r.spawnIn=999;
  r.objects=[{id:1,kind:'snowman',lane:1,z:4.8,hit:false}];
  assert.equal(advance(r,.03)[0].type,'crash');
  assert.equal(r.status,'over');
});
test('jump clears crate; slide clears arch; incorrect move crashes',()=>{
  for(const [kind,action] of [['crate',jump],['arch',duck]]){
    const r=createRun(()=>0);startRun(r);r.spawnIn=999;
    action(r);if(kind==='crate')for(let t=0;t<3;t++)advance(r,.05);
    r.objects=[{id:1,kind,lane:1,z:4.9,hit:false}];
    assert.equal(advance(r,.03)[0].type,'dodge',kind);
  }
  const r=createRun();startRun(r);r.spawnIn=999;
  r.objects=[{id:1,kind:'arch',lane:1,z:4.9,hit:false}];
  assert.equal(advance(r,.03)[0].type,'crash');
});
test('gifts score only on lane-specific contact',()=>{
  const r=createRun(()=>0.7);startRun(r);r.spawnIn=999;
  r.objects=[{id:1,kind:'gift',lane:1,z:4.8,hit:false},{id:2,kind:'gift',lane:0,z:4.8,hit:false}];
  assert.equal(advance(r,.03)[0].type,'gift');
  assert.equal(r.gifts,1);assert.ok(r.score>=25);
});
test('the opening encounter is not empty and challenge escalates by 110 metres',()=>{
  const r=createRun(()=>0.2);
  spawnRow(r);
  assert.ok(r.objects.some(o=>o.kind!=='gift'),'first row must contain an obstacle');
  assert.ok(r.objects.every(o=>o.z<=-40),'hazards must remain visible with reaction time');
  r.distance=240;
  r.objects=[];
  spawnRow(r);
  assert.equal(r.objects.filter(o=>o.kind!=='gift').length,2,'midgame must have two hazard lanes');
  r.distance=480;
  r.objects=[];
  spawnRow(r);
  assert.equal(r.objects.filter(o=>o.kind!=='gift').length,3,'advanced stages occasionally require jumping or ducking');
});
test('pace rises quickly and the distance accumulator updates accurately',()=>{
  const r=createRun(()=>0.99);
  startRun(r);
  r.spawnIn=99999;
  for(let i=0;i<100;i++)advance(r,.02);
  assert.ok(r.distance>=41 && r.distance<45,'first two seconds should cover about 42m');
  r.distance=700;
  advance(r,.02);
  assert.ok(r.speed>31,'late game should be substantially faster');
});
