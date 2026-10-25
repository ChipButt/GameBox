// Christmas Dash's deterministic gameplay rules. No DOM or renderer dependencies.
export const LANES = [-3, 0, 3];
export const PLAYER_Z = 5;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const choose = (random, values) => values[Math.floor(random() * values.length)];
export function createRun(random = Math.random) {
  let id = 0;
  return {
    status: 'ready', lane: 1, distance: 0, gifts: 0, score: 0,
    speed: 21, jumpY: 0, jumpV: 0, slide: 0, seconds: 0,
    objects: [], spawnIn: 2, rows: 0, combo: 0, lastEvent: '',
    random, nextId: () => ++id
  };
}
export function startRun(run) {
  if (run.status !== 'ready') return false;
  run.status = 'running';
  return true;
}
export function togglePause(run) {
  if (run.status === 'running') run.status = 'paused';
  else if (run.status === 'paused') run.status = 'running';
  return run.status;
}
export function steer(run, direction) {
  if (run.status !== 'running') return;
  run.lane = clamp(run.lane + Math.sign(direction), 0, 2);
}
export function jump(run) {
  if (run.status !== 'running' || run.jumpY > 0 || run.slide > 0) return false;
  run.jumpV = 10.5;
  run.jumpY = 0.01;
  return true;
}
export function duck(run) {
  if (run.status !== 'running' || run.jumpY > 0) return false;
  run.slide = 1.05;
  return true;
}
export function spawnRow(run) {
  // All rows have at least one safe lane, including the dual-hazard rows.
  const lanes = [0, 1, 2];
  const safeLane = choose(run.random, lanes);
  const hazards = lanes.filter(l => l !== safeLane);
  // The first row contains a real obstacle. Two-lane pressure begins
  // in the first 100m and becomes normal as the player's skill grows.
  const stage = Math.min(5, Math.floor(run.distance / 110));
  const twoHazardChance = [0.46, 0.78, 0.94, 1, 1, 1][stage];
  const count = run.random() < twoHazardChance ? 2 : 1;
  const kinds = run.distance < 50
    ? ['crate', 'snowman']
    : ['crate', 'snowman', 'arch', 'arch'];
  const hazardZ = -45;
  for (let n = 0; n < count; n++) {
    const lane = hazards.splice(Math.floor(run.random() * hazards.length), 1)[0];
    run.objects.push({ id: run.nextId(), kind: choose(run.random, kinds), lane, z: hazardZ, hit: false });
  }
  // Reward the safe path without making the next route obvious too early.
  const giftLane = safeLane;
  // Advanced runs occasionally close all three lanes, but the third
  // obstacle is always jumpable or duckable — never an unavoidable wall.
  if (stage >= 3 && run.random() < 0.27 + (stage - 3) * 0.12) {
    run.objects.push({
      id: run.nextId(),
      kind: choose(run.random, ['crate','arch']),
      lane: safeLane, z: hazardZ, hit: false
    });
  }
  for (let n = 0; n < 3; n++) {
    run.objects.push({ id: run.nextId(), kind: 'gift', lane: giftLane, z: hazardZ + 4.8 - n * 2.4, hit: false });
  }
  run.rows++;
}
export function advance(run, dt) {
  if (run.status !== 'running') return [];
  dt = clamp(dt, 0, 0.05);
  run.seconds += dt;
  run.speed = Math.min(43, 21 + run.distance / 57);
  const travel = run.speed * dt;
  run.distance += travel;
  run.spawnIn -= travel;
  if (run.spawnIn <= 0) {
    spawnRow(run);
    // Sufficient reaction room even in the final tier, without long empty roads.
    run.spawnIn += 20 + run.random() * 5;
  }
  if (run.jumpY > 0 || run.jumpV > 0) {
    run.jumpY += run.jumpV * dt;
    run.jumpV -= 27 * dt;
    if (run.jumpY <= 0) { run.jumpY = 0; run.jumpV = 0; }
  }
  run.slide = Math.max(0, run.slide - dt);
  const events = [];
  for (const o of run.objects) {
    const previousZ = o.z;
    o.z += travel;
    if (o.hit || o.lane !== run.lane) continue;
    if (previousZ <= PLAYER_Z + 0.65 && o.z >= PLAYER_Z - 0.65) {
      if (o.kind === 'gift') {
        o.hit = true;
        run.gifts++;
        run.combo++;
        events.push({type:'gift', id:o.id});
      } else {
        const avoided = (o.kind === 'crate' && run.jumpY > 1.12)
          || (o.kind === 'arch' && run.slide > 0.12);
        o.hit = true;
        if (avoided) {
          events.push({type:'dodge', kind:o.kind, id:o.id});
        } else {
          run.status = 'over';
          events.push({type:'crash', kind:o.kind, id:o.id});
          break;
        }
      }
    }
  }
  run.objects = run.objects.filter(o => o.z < 13 && !o.hit);
  run.score = Math.floor(run.distance * 3) + run.gifts * 25;
  return events;
}