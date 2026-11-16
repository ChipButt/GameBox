/* FourFold V4: board generation and mini-puzzle construction.
   Pure functions: testable without a browser and independent of progression.
*/
(function(root){
'use strict';
const THIRD_LETTER_CLUES={
 A:['Large furry mammal','BEAR'],B:['Red gemstone','RUBY'],
 C:['Agreement or harmony','ACCORD'],D:['Award worn on a ribbon','MEDAL'],
 E:['Colour of grass','GREEN'],F:['Upholstered living-room seat','SOFA'],
 G:['Large bird of prey','EAGLE'],H:['Powder left after a fire','ASHES'],
 I:['Give off light','SHINE'],J:['An item or thing','OBJECT'],
 K:['Tree that produces acorns','OAK'],L:['Fine fabric produced by silkworms','SILK'],
 M:['Red fruit often used in salads','TOMATO'],N:['Person eating at a restaurant','DINER'],
 O:['Royal headwear','CROWN'],P:['Common crisp fruit, often red or green','APPLE'],
 Q:['Substance that flows and takes its container\'s shape','LIQUID'],
 R:['Orange root vegetable','CARROT'],S:['A work table','DESK'],
 T:['Clear liquid essential for life','WATER'],U:['Turn pink in the face','BLUSH'],
 V:['Put a lid or layer over something','COVER'],W:['A small cylindrical wooden peg','DOWEL'],
 X:['A car hired with a driver','TAXI'],Y:['A slow-moving marshy waterway','BAYOU'],
 Z:['Italian dish with cheese and toppings','PIZZA']
};
function shuffle(list,rng=Math.random){
 const a=list.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a
}
function bankCheck(groups){
 if(!Array.isArray(groups)||groups.length<100)throw Error('FourFold needs a substantial connection bank');
 const ids=new Set(),titles=new Set(),types=new Set();
 for(const g of groups){
  if(!g||typeof g.id!=='string'||ids.has(g.id)||typeof g.name!=='string'||titles.has(g.name)||typeof g.type!=='string')throw Error('Invalid or duplicated group '+(g?.id||''));
  if(!Array.isArray(g.words)||g.words.length!==4||new Set(g.words).size!==4||g.words.some(w=>typeof w!=='string'||!/^[A-Z]+$/.test(w)))throw Error('Invalid words in '+g.name);
  ids.add(g.id);titles.add(g.name);types.add(g.type)
 }
 if(types.size<6)throw Error('Insufficient FourFold connection styles');
 for(const [letter,pair] of Object.entries(THIRD_LETTER_CLUES))if(pair[1][2]!==letter)throw Error('Crossword extraction invalid for '+letter);
 return {groups:groups.length,types:[...types]}
}
function validBoard(board){
 if(!board||!Array.isArray(board.groups)||board.groups.length!==4||!board.seals||typeof board.seals!=='object')return false;
 const words=board.groups.flatMap(g=>Array.isArray(g.words)?g.words:[]);
 if(words.length!==16||new Set(words).size!==16||words.some(w=>typeof w!=='string'||!/^[A-Z]+$/.test(w)))return false;
 for(const [word,p] of Object.entries(board.seals)){
  if(!words.includes(word)||!['wordle','cipher','cross'].includes(p?.kind))return false;
  if(p.kind==='wordle'&&word.length!==5)return false;
  if(p.kind==='cipher'&&(!p.code||p.answer!==word))return false;
  if(p.kind==='cross'&&(!Array.isArray(p.items)||p.items.map(x=>x?.[1]?.[2]).join('')!==word))return false
 }
 return true
}
function buildSeals(words,dict,rng=Math.random){
 const seals={},kinds=shuffle(['wordle','cipher','cross'],rng),count=rng()<.38?2:1;
 for(const kind of kinds){
  if(Object.keys(seals).length===count)break;
  const pool=shuffle(words,rng).filter(word=>!seals[word] && (
   kind==='wordle'?word.length===5&&(!dict||dict.has(word)):
   kind==='cipher'?word.length>=3&&word.length<=9:
   word.length>=3&&word.length<=7
  ));
  if(!pool.length)continue;
  const word=pool[0];
  if(kind==='wordle')seals[word]={kind, intro:'Guess the hidden five-letter word in six tries. Green is a correct letter in the correct position; gold means the letter belongs elsewhere.'};
  else if(kind==='cipher')seals[word]={kind, intro:'A cipher wheel shifts A → D. Decode these letters by shifting them three places backwards.',code:[...word].map(ch=>String.fromCharCode(65+(ch.charCodeAt(0)-65+3)%26)).join(''),answer:word};
  else seals[word]={kind, intro:'Solve each clue, then read the third letter of each answer from top to bottom to reveal the tile.',items:[...word].map(letter=>THIRD_LETTER_CLUES[letter].slice())}
 }
 if(!Object.keys(seals).length)throw Error('Could not construct a sealed puzzle');
 return seals
}
function generate(groups,history=[],dict=null,rng=Math.random){
 bankCheck(groups);
 const types=[...new Set(groups.map(g=>g.type))];
 const recent=Array.isArray(history)?history.slice(-100).filter(h=>Array.isArray(h.ids)):[];
 const counts={};
 for(const h of recent)for(const id of h.ids)counts[id]=(counts[id]||0)+1;
 for(let attempt=0;attempt<300;attempt++){
  const selected=[],usedWords=new Set(),familyOrder=shuffle(types,rng).slice(0,4);
  for(const type of familyOrder){
   const candidates=groups.filter(g=>g.type===type&&g.words.every(w=>!usedWords.has(w)));
   if(!candidates.length)break;
   const ordered=shuffle(candidates,rng).map(g=>{
    const inLastTwo=recent.slice(-2).some(h=>h.ids.includes(g.id));
    const inLastEight=recent.slice(-8).some(h=>h.ids.includes(g.id));
    const penalty=(counts[g.id]||0)*30+(inLastTwo?200:inLastEight?60:0)+rng()*14;
    return {g,penalty}
   }).sort((a,b)=>a.penalty-b.penalty);
   const g=ordered[0].g;selected.push({...g,words:g.words.slice(),colour:selected.length});g.words.forEach(w=>usedWords.add(w))
  }
  if(selected.length!==4||usedWords.size!==16)continue;
  const key=selected.map(g=>g.id).sort().join(',');
  if(recent.some(x=>x.key===key))continue;
  const output={name:'MIXED CONNECTIONS',groups:shuffle(selected,rng).map((g,i)=>({...g,colour:i})),seals:buildSeals([...usedWords],dict,rng),key};
  if(!validBoard(output))throw Error('Generated an invalid board');
  return output
 }
 throw Error('No valid new FourFold board available: check the connection bank');
}
function record(history,board){
 const recent=Array.isArray(history)?history.filter(h=>h&&Array.isArray(h.ids)&&typeof h.key==='string').slice(-99):[];
 if(!recent.some(h=>h.key===board.key))recent.push({key:board.key,ids:board.groups.map(g=>g.id)});
 return recent.slice(-100)
}
const engine={shuffle,bankCheck,validBoard,buildSeals,generate,record};
root.FOURFOLD_ENGINE=engine;
if(typeof module==='object'&&module.exports)module.exports=engine;
})(typeof window==='object'?window:globalThis);
