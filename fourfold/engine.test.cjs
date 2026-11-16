'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const groups=require('./puzzle-bank.js');
const engine=require('./puzzle-engine.js');
function seeded(seed){
 return ()=>{seed=(seed+0x6D2B79F5)>>>0;let n=Math.imul(seed^(seed>>>15),1|seed);n^=n+Math.imul(n^(n>>>7),61|n);return ((n^(n>>>14))>>>0)/4294967296};
}
test('all connection groups are four distinct real entries across many styles',()=>{
 const result=engine.bankCheck(groups);
 assert.ok(result.groups>=250);
 assert.ok(result.types.length>=8);
});
test('1,000 boards draw from every group type and can continue indefinitely',()=>{
 let history=[],seenKeys=new Set(),seenGroups=new Set(),types=new Set(),prev=[];
 const rand=seeded(2026);
 const dictionary=new Set(groups.flatMap(g=>g.words).filter(w=>w.length===5));
 for(let n=0;n<1000;n++){
  const board=engine.generate(groups,history,dictionary,rand);
  assert.ok(engine.validBoard(board));
  assert.equal(board.groups.length,4);
  assert.equal(new Set(board.groups.map(g=>g.type)).size,4);
  assert.equal(new Set(board.groups.flatMap(g=>g.words)).size,16);
  assert.ok(!seenKeys.has(board.key),'duplicate combination before 1000 boards');
  assert.ok(!board.groups.some(g=>prev.includes(g.id)),'repeated a group on consecutive boards');
  seenKeys.add(board.key);
  for(const g of board.groups){seenGroups.add(g.id);types.add(g.type)}
  for(const [word,p] of Object.entries(board.seals)){
   assert.ok(board.groups.some(g=>g.words.includes(word)));
   if(p.kind==='wordle')assert.equal(word.length,5);
   if(p.kind==='cipher'){
    assert.equal(p.answer,word);
    assert.equal(p.code.length,word.length);
    assert.equal([...p.code].map(c=>String.fromCharCode(65+(c.charCodeAt(0)-65+23)%26)).join(''),word)
   }
   if(p.kind==='cross')assert.equal(p.items.map(pair=>pair[1][2]).join(''),word)
  }
  prev=board.groups.map(g=>g.id);
  history=engine.record(history,board);
 }
 assert.equal(seenKeys.size,1000);
 assert.equal(seenGroups.size,groups.length);
 assert.equal(types.size,engine.bankCheck(groups).types.length);
 assert.equal(history.length,100);
});
test('invalid boards with duplicate tiles are rejected',()=>{
 const board=engine.generate(groups);
 board.groups[1].words[0]=board.groups[0].words[0];
 assert.equal(engine.validBoard(board),false);
});
test('all sealed puzzle types remain available on every generated level',()=>{
 const candidates={wordle:0,cipher:0,cross:0},rand=seeded(50);
 const dict=new Set(groups.flatMap(g=>g.words).filter(w=>w.length===5));
 let history=[];
 for(let i=0;i<250;i++){
  const board=engine.generate(groups,history,dict,rand);
  Object.values(board.seals).forEach(s=>candidates[s.kind]++);
  history=engine.record(history,board)
 }
 for(const [kind,count] of Object.entries(candidates))assert.ok(count>30,kind+' sealed option underrepresented')
});
