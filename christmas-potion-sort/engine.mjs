// Santa's Potion Sort — deterministic, reversible Christmas water-sort puzzles.
// Each generated level starts from a solved state and uses *inverse-legal* moves,
// so the recorded inverse path is a constructive proof that the puzzle is solvable.
export const CAPACITY = 4;
export const COLORS = [
  {id:"ruby", name:"Ruby red", light:"#ff9c85", color:"#dc434c", dark:"#8f1e38"},
  {id:"pine", name:"Fir green", light:"#a9e88e", color:"#44b46b", dark:"#1e734e"},
  {id:"gold", name:"Starlight gold", light:"#fff2a3", color:"#f7be48", dark:"#b76828"},
  {id:"frost", name:"Frost blue", light:"#a6efff", color:"#4bbadf", dark:"#2875bb"},
  {id:"berry", name:"Berry pink", light:"#ffb7ed", color:"#e77ac0", dark:"#a4469e"},
  {id:"plum", name:"Twilight violet", light:"#d6b9ff", color:"#9477e1", dark:"#6547a7"},
  {id:"orange", name:"Tangerine", light:"#ffcd8a", color:"#f18d4a", dark:"#af4a32"},
  {id:"mint", name:"Winter mint", light:"#c4fff1", color:"#5dcfbb", dark:"#268b8a"}
];
export const copy = bottles => bottles.map(b => [...b]);
export function topRun(bottle) {
  if (!bottle?.length) return 0;
  const top = bottle[bottle.length - 1];
  let n = 1;
  for (let k = bottle.length - 2; k >= 0 && bottle[k] === top; k--) n++;
  return n;
}
export function canPour(bottles, from, to) {
  if (!Number.isInteger(from) || !Number.isInteger(to) || from === to ||
      from < 0 || to < 0 || from >= bottles.length || to >= bottles.length) return false;
  const a = bottles[from], b = bottles[to];
  return a.length > 0 && b.length < CAPACITY &&
    (!b.length || a[a.length-1] === b[b.length-1]);
}
export function pour(bottles, from, to) {
  if (!canPour(bottles, from, to)) return null;
  const next = copy(bottles), src = next[from], dest = next[to];
  const moved = Math.min(topRun(src), CAPACITY - dest.length);
  for (let i = 0; i < moved; i++) dest.push(src.pop());
  return {bottles: next, from, to, moved, color: dest[dest.length-1]};
}
export function isSorted(bottle) {
  return bottle.length === CAPACITY && bottle.every(x => x === bottle[0]);
}
export function isSolved(bottles) {
  return bottles.every(b => b.length === 0 || isSorted(b));
}
export function colourCounts(bottles) {
  const counts = Object.create(null);
  for (const b of bottles) for (const c of b) counts[c] = (counts[c] || 0) + 1;
  return counts;
}
export function difficulty(level) {
  const n = Math.max(1, Math.floor(level) || 1);
  return {colors: Math.min(8, 3 + Math.floor((n - 1)/3)), 
    twists: Math.min(100, 13 + n*3)};
}
export function rng(seed) {
  let x = seed >>> 0;
  return () => ((x = Math.imul(x ^ x >>> 15, 1 | x),
    x ^= x + Math.imul(x ^ x >>> 7, 61 | x),
    ((x ^ x >>> 14) >>> 0) / 4294967296));
}
function inverseSteps(level, salt=0) {
  const config = difficulty(level), r = rng((Math.imul(level, 2654435761) ^ salt ^ 0x5f3759df)>>>0);
  const initial = Array.from({length:config.colors}, (_,i)=>Array(CAPACITY).fill(i));
  initial.push([],[]);
  let bottles = copy(initial);
  const history = [], recently = [];
  for (let step=0; step<config.twists*6; step++) {
    const options=[];
    for(let from=0;from<bottles.length;from++) {
      const a=bottles[from];
      if(!a.length) continue;
      const color=a[a.length-1], run=topRun(a);
      for(let moved=1;moved<=run;moved++){
        const rem=a.length-moved;
        // The inverse of a reverse step must be an ordinary legal pour.
        if(rem && a[rem-1]!==color) continue;
        for(let to=0;to<bottles.length;to++){
          if(from===to)continue;
          const b=bottles[to];
          if(b.length + moved>CAPACITY || (b.length && b[b.length-1]===color))continue;
          if(recently.length && recently[recently.length-1].from===to && recently[recently.length-1].to===from)continue;
          options.push({from,to,moved,score:(b.length?4:2)+(isSorted(a)?1:0) + r()*5});
        }
      }
    }
    if(!options.length)break;
    options.sort((a,b)=>b.score-a.score);
    const p=options[Math.floor(r()*Math.min(4,options.length))];
    const src=bottles[p.from],dst=bottles[p.to];
    for(let i=0;i<p.moved;i++)dst.push(src.pop());
    history.push({from:p.to,to:p.from,moved:p.moved});
    recently.push(p);
    if(recently.length>4)recently.shift();
    if(history.length>=config.twists)break;
  }
  return {bottles, proof:history.reverse(), initial};
}
export function makeLevel(level) {
  level = Math.max(1, Math.floor(Number(level)||1));
  let best = null, bestScore = -1;
  for(let attempt=0;attempt<16;attempt++){
    const result=inverseSteps(level, attempt*7919);
    const mixed=result.bottles.filter(b=>b.length>1&&!b.every(x=>x===b[0])).length;
    const seen=result.bottles.filter(b=>b.length).length;
    const score=mixed*100+seen*7+result.proof.length;
    if(score>bestScore){best=result;bestScore=score}
    if(mixed>=Math.min(difficulty(level).colors, 3+Math.floor(level/4)))break;
  }
  return {level, bottles:copy(best.bottles), proof:best.proof, colors:difficulty(level).colors};
}
export function replayProof(puzzle) {
  let bottles=copy(puzzle.bottles);
  for(const step of puzzle.proof) {
    // A multi-layer reversal can be part of a larger top run: the same move
    // legally pours as many layers as fit; an intermediate may differ.
    const from=bottles[step.from], to=bottles[step.to];
    if(!from.length || (to.length && to[to.length-1]!==from[from.length-1]) || to.length+step.moved>CAPACITY) return false;
    for(let i=0;i<step.moved;i++)to.push(from.pop());
  }
  return isSolved(bottles);
}
