const test=require("node:test"),assert=require("node:assert/strict"),E=require("./engine.js");
test("levels create reachable targets, limited throws and predictable patterns",()=>{
 for(let level=1;level<=36;level++){
  const s=E.makeLevel(level);
  assert.ok(s.tins.length>=3);assert.ok(s.balls>=4);
  assert.ok(s.tins.every(t=>t.x>24&&t.x<396&&t.y>175&&t.y<420));
  assert.equal(new Set(s.tins.map(t=>t.id)).size,s.tins.length);
 }
});
test("launching consumes one snowball, blocks duplicate launches and advances",()=>{
 const s=E.makeLevel(1);assert.equal(E.launch(s,210,380),true);
 assert.equal(s.balls,3);assert.equal(E.launch(s,210,350),false);
 for(let i=0;i<160;i++)E.step(s,1/60);
 assert.ok(s.tins.some(t=>t.fallen),"A centre shot should knock over a tin");
});
test("special red target causes a chain reaction",()=>{
 const s=E.makeLevel(4),red=s.tins.find(t=>t.type==="blast");
 assert.ok(red);E.strikeTin(s,red,0,-1);
 assert.ok(s.tins.filter(t=>t.fallen).length>1);
});
test("clearing all tins wins, awards remaining shots and stars",()=>{
 const s=E.makeLevel(1);
 s.tins.forEach(t=>E.strikeTin(s,t,0,-1));
 E.step(s,.016);assert.equal(s.won,true);assert.equal(E.stars(s),3);
});
test("a missed final throw ends the level without a win",()=>{
 const s=E.makeLevel(1);
 s.balls=1;
 assert.equal(E.launch(s,10,350),true);
 assert.equal(s.failed,false);
 s.ball=null; // Simulate the final ball leaving the scene without a hit.
 E.step(s,1/60);
 assert.equal(s.failed,true);assert.equal(s.won,false);
 assert.equal(E.launch(s,210,400),false);
});
