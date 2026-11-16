'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const groups=require('./puzzle-bank.js');
const engine=require('./puzzle-engine.js');
const dictionary=new Set(groups.flatMap(g=>g.words).filter(w=>w.length===5));
function seeded(seed){return ()=>{seed=(seed+0x6D2B79F5)>>>0;let n=Math.imul(seed^(seed>>>15),1|seed);n^=n+Math.imul(n^(n>>>7),61|n);return ((n^(n>>>14))>>>0)/4294967296}}

test('curated bank is large, valid and available across every board',()=>{
 const result=engine.bankCheck(groups);
 assert.ok(result.groups>=250);assert.ok(result.types.length>=8);
});
test('1,000 varied boards can be generated without an end level',()=>{
 const rng=seeded(2026);let history=[],previous=[],uniqueKeys=new Set(),types=new Set(),seenGroups=new Set();
 for(let i=0;i<1000;i++){
  const board=engine.generate(groups,history,dictionary,rng);
  assert.ok(engine.validBoard(board));
  assert.equal(board.groups.length,4);
  assert.equal(new Set(board.groups.map(g=>g.type)).size,4);
  assert.equal(new Set(board.groups.flatMap(g=>g.words)).size,16);
  assert.ok(!uniqueKeys.has(board.key),'duplicate board at '+i);
  assert.ok(!board.groups.some(g=>previous.includes(g.id)),'recent group repeated at '+i);
  uniqueKeys.add(board.key);
  for(const g of board.groups){types.add(g.type);seenGroups.add(g.id)}
  previous=board.groups.map(g=>g.id);history=engine.record(history,board)
 }
 assert.equal(uniqueKeys.size,1000);assert.equal(types.size,8);assert.equal(seenGroups.size,groups.length);assert.equal(history.length,100)
});
test('mini-game types rotate and their full clues do not repeat in recent grids',()=>{
 const rng=seeded(8192);let history=[],previousKind=null;
 let counts={wordle:0,cipher:0,cross:0},methods=new Set(),shifts=new Set(),crossClues=[];
 for(let i=0;i<300;i++){
  const board=engine.generate(groups,history,dictionary,rng);
  const seals=Object.entries(board.seals);
  assert.ok(seals.length>=1&&seals.length<=2);
  assert.notEqual(seals[0][1].kind,previousKind,'same primary mini-game type as previous board');
  previousKind=seals[0][1].kind;
  for(const [word,p] of seals){
   counts[p.kind]++;
   assert.ok(board.groups.some(g=>g.words.includes(word)));
   assert.ok(!(history.slice(-100).flatMap(h=>h.sealSignatures||[])).includes(p.signature),'same exact mini puzzle within 100 recent grids');
   if(p.kind==='wordle'){assert.equal(word.length,5);assert.ok(dictionary.has(word))}
   else if(p.kind==='cipher'){
    assert.equal(p.answer,word);
    assert.equal(p.code,engine.cipherEncode(word,p.method,p.shift));
    methods.add(p.method);if(p.method!=='atbash')shifts.add(p.shift);
   }else{
    assert.ok(engine.crosswordCheck(p.layout));
    const answerWords=p.layout.entries.map(e=>e.answer);
    for(const previous of crossClues.slice(-10))assert.ok(!answerWords.some(w=>previous.includes(w)),'previous crossword clue reused');
    crossClues.push(answerWords)
   }
  }
  history=engine.record(history,board)
 }
 assert.ok(counts.wordle>30&&counts.cipher>30&&counts.cross>30);
 assert.deepEqual([...methods].sort(),['atbash','caesar','reversed-caesar']);
 assert.ok(shifts.size>=18,'Caesar shift has not varied sufficiently');
 assert.ok(crossClues.length>30)
});
test('genuine crossword contains numbered across/down entries with shared cell letters',()=>{
 const layout=engine.constructCrossword(seeded(111));
 assert.ok(engine.crosswordCheck(layout));
 assert.ok(layout.entries.some(e=>e.dir==='across'));
 assert.ok(layout.entries.some(e=>e.dir==='down'));
 assert.ok(layout.rows.some(row=>row.includes('#')));
 let overlapCount=0;
 const cover={};
 for(const e of layout.entries)for(let i=0;i<e.answer.length;i++){
  const key=(e.r+(e.dir==='down'?i:0))+','+(e.c+(e.dir==='across'?i:0));
  cover[key]=(cover[key]||0)+1
 }
 overlapCount=Object.values(cover).filter(count=>count===2).length;
 assert.ok(overlapCount>=3);
 const broken=JSON.parse(JSON.stringify(layout));broken.rows[0]='Z'+broken.rows[0].slice(1);
 assert.equal(engine.crosswordCheck(broken),false)
});
test('cipher mapping changes and can be reversed without losing accuracy',()=>{
 for(let shift=1;shift<=25;shift++){
  const code=engine.cipherEncode('NIGHT','caesar',shift);
  assert.equal(engine.cipherEncode(code,'caesar',26-shift),'NIGHT')
 }
 assert.equal(engine.cipherEncode('NIGHT','atbash'),'MRTSG');
 assert.equal(engine.cipherEncode('ABC','reversed-caesar',5),'HGF');
 assert.equal(engine.cipherEncode('ABC','caesar',5),'FGH')
});
test('invalid boards with repeated words and broken crossword layout are rejected',()=>{
 const board=engine.generate(groups,[],dictionary,seeded(13));
 board.groups[0].words[0]=board.groups[1].words[0];assert.equal(engine.validBoard(board),false);
 const board2=engine.generate(groups,[],dictionary,seeded(15));
 const word=board2.groups[0].words[0];
 board2.seals[word]={kind:'cross',layout:{width:1,height:1,rows:['X'],entries:[]}};
 assert.equal(engine.validBoard(board2),false)
});
