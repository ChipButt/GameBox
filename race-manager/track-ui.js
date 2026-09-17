(() => {
  'use strict';

  const palette = ['#f7bd18','#2f80ed','#e05263','#36a269','#8d6bd1','#ef8d32','#20a7a0','#d05ca8','#66788a','#9c7a36','#55a9e8','#a05b42'];
  const lanes = document.getElementById('raceLanes');
  const raceScreen = document.getElementById('raceScreen');
  if (!lanes || !raceScreen) return;

  const VIEW_W = 600;
  const VIEW_H = 340;
  const CIRCUIT_D = 'M 104 278 C 55 267 42 224 67 190 C 91 158 139 152 164 181 C 185 205 168 236 197 249 C 224 261 253 244 253 216 C 252 185 227 173 241 139 C 255 105 291 90 322 105 C 355 121 351 163 382 174 C 418 187 438 154 449 126 C 464 88 514 82 540 111 C 570 145 555 195 522 213 C 492 230 476 256 503 278 C 526 297 554 291 565 275 C 575 301 548 320 508 320 L 174 320 C 134 320 113 304 104 278 Z';

  const motion = new Map();
  const clamp = (n,min,max) => Math.max(min,Math.min(max,n));
  const hash = value => {
    let h = 0;
    const s = String(value || '');
    for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    return Math.abs(h);
  };

  const totalLaps = () => {
    const text = document.getElementById('lapText')?.textContent || '';
    const match = text.match(/\/\s*(\d+)/);
    return Math.max(1, Number(match?.[1]) || 1);
  };

  const progressFromDot = dot => {
    const raw = dot?.style?.left || '';
    const match = raw.match(/calc\(([\d.]+)%/);
    if (match) return clamp(Number(match[1]) / 0.96, 0, 100);
    const pct = raw.match(/([\d.]+)%/);
    return pct ? clamp(Number(pct[1]), 0, 100) : 0;
  };

  function ensureCircuit() {
    let svg = lanes.querySelector('.trackSvg');
    if (svg) return svg;
    const ns = 'http://www.w3.org/2000/svg';
    svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('class','trackSvg');
    svg.setAttribute('viewBox',`0 0 ${VIEW_W} ${VIEW_H}`);
    svg.setAttribute('preserveAspectRatio','xMidYMid meet');
    svg.setAttribute('aria-hidden','true');
    svg.innerHTML = `
      <defs>
        <filter id="trackShadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#1d3826" flood-opacity=".28"/></filter>
      </defs>
      <rect width="600" height="340" rx="16" fill="#69b450"/>
      <g opacity=".35" fill="#2f7838">
        <circle cx="55" cy="65" r="9"/><circle cx="84" cy="88" r="6"/><circle cx="122" cy="62" r="8"/>
        <circle cx="392" cy="51" r="7"/><circle cx="425" cy="64" r="9"/><circle cx="558" cy="72" r="8"/>
        <circle cx="70" cy="290" r="7"/><circle cx="542" cy="250" r="9"/><circle cx="365" cy="292" r="6"/>
      </g>
      <path d="${CIRCUIT_D}" fill="none" stroke="#dfc79c" stroke-width="56" stroke-linecap="round" stroke-linejoin="round" filter="url(#trackShadow)"/>
      <path d="${CIRCUIT_D}" fill="none" stroke="#f4f4f4" stroke-width="45" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="8 8"/>
      <path d="${CIRCUIT_D}" fill="none" stroke="#d94b45" stroke-width="43" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="9 9"/>
      <path d="${CIRCUIT_D}" fill="none" stroke="#666c72" stroke-width="37" stroke-linecap="round" stroke-linejoin="round"/>
      <path id="gridlineCircuitPath" d="${CIRCUIT_D}" fill="none" stroke="#d9dde1" stroke-width="2" stroke-linecap="round" stroke-dasharray="8 9" opacity=".9"/>
      <g transform="translate(390 292)" opacity=".95">
        <rect x="0" y="0" width="118" height="8" rx="2" fill="#606970"/>
        <rect x="5" y="-14" width="14" height="12" fill="#d7dde0" stroke="#65717b"/><rect x="22" y="-14" width="14" height="12" fill="#d7dde0" stroke="#65717b"/><rect x="39" y="-14" width="14" height="12" fill="#d7dde0" stroke="#65717b"/><rect x="56" y="-14" width="14" height="12" fill="#d7dde0" stroke="#65717b"/><rect x="73" y="-14" width="14" height="12" fill="#d7dde0" stroke="#65717b"/>
      </g>
      <g transform="translate(508 298)"><rect width="4" height="24" fill="#fff"/><rect x="4" width="4" height="24" fill="#222"/><rect x="8" width="4" height="24" fill="#fff"/><rect x="12" width="4" height="24" fill="#222"/></g>
      <ellipse cx="410" cy="230" rx="31" ry="18" fill="#4fa3dc" stroke="#2f6d9c" stroke-width="2" opacity=".95"/>
    `;
    lanes.prepend(svg);
    return svg;
  }

  function updateMode() {
    document.body.classList.toggle('gridline-racing-live', !raceScreen.classList.contains('hidden'));
  }

  function launchSpeed(elapsedMs) {
    if (elapsedMs < 1200) return 0.055 + (elapsedMs / 1200) * 0.095;
    if (elapsedMs < 3000) return 0.15 + ((elapsedMs - 1200) / 1800) * 0.12;
    return 0.38;
  }

  function syncMotion(rows, laps, now) {
    const seen = new Set();
    rows.forEach((row, index) => {
      const dot = row.querySelector('.carDot');
      const totalProgress = progressFromDot(dot);
      const name = row.querySelector('.name')?.textContent?.trim() || `Racer ${index + 1}`;
      const key = name;
      const target = (totalProgress / 100) * laps;
      seen.add(key);

      let state = motion.get(key);
      if (!state) {
        const joiningMidRace = target > 0.4;
        state = {
          displayed: joiningMidRace ? target : 0,
          target,
          lastTarget: target,
          launchAt: now,
          lastFrame: now,
          lastSeen: now
        };
        motion.set(key,state);
      } else {
        const newRace = target + 0.35 < state.lastTarget;
        if (newRace) {
          state.displayed = 0;
          state.launchAt = now;
          state.lastFrame = now;
        }
        state.target = target;
        state.lastTarget = target;
        state.lastSeen = now;
      }

      state.row = row;
      state.name = name;
      state.rank = row.querySelector('.pos')?.textContent?.trim() || String(index + 1);
      state.isYou = row.classList.contains('you');
      state.laps = laps;
    });

    for (const [key,state] of motion) {
      if (!seen.has(key) && now - state.lastSeen > 1500) motion.delete(key);
    }
  }

  function advanceMotion(state, now) {
    const dt = clamp((now - state.lastFrame) / 1000, 0, 0.05);
    state.lastFrame = now;
    if (state.displayed >= state.target) return;

    const age = Math.max(0, now - state.launchAt);
    const maxSpeed = launchSpeed(age);
    const gap = state.target - state.displayed;
    const catchup = gap > 0.45 ? Math.min(0.18, (gap - 0.45) * 0.16) : 0;
    const step = (maxSpeed + catchup) * dt;
    state.displayed = Math.min(state.target, state.displayed + step);
  }

  function svgPointToLanePixels(svg, x, y) {
    const matrix = svg.getScreenCTM?.();
    if (!matrix || typeof svg.createSVGPoint !== 'function') return null;
    const p = svg.createSVGPoint();
    p.x = x;
    p.y = y;
    const screen = p.matrixTransform(matrix);
    const rect = lanes.getBoundingClientRect();
    return {x:screen.x - rect.left,y:screen.y - rect.top};
  }

  function drawRacer(state, svg, path, length, now) {
    const row = state.row;
    if (!row?.isConnected) return;

    advanceMotion(state, now);
    const travelled = state.displayed;
    let lapProgress = travelled % 1;
    if (state.target >= state.laps && travelled >= state.laps - 0.002) lapProgress = 0.998;

    const pathDistance = clamp(length * lapProgress, 0, Math.max(0,length - 0.1));
    const point = path.getPointAtLength(pathDistance);
    const tangentDistance = Math.min(length - 0.1, pathDistance + 3);
    const tangentPoint = path.getPointAtLength(tangentDistance);
    let dx = tangentPoint.x - point.x;
    let dy = tangentPoint.y - point.y;
    const mag = Math.hypot(dx,dy) || 1;
    dx /= mag;
    dy /= mag;

    const laneBand = (hash(state.name) % 3) - 1;
    const lateral = laneBand * 2.6;
    const svgX = point.x + (-dy * lateral);
    const svgY = point.y + (dx * lateral);
    const rendered = svgPointToLanePixels(svg, svgX, svgY);
    if (!rendered) return;

    const colour = state.isYou ? '#f7bd18' : palette[hash(state.name) % palette.length];
    row.style.transition = 'none';
    row.style.setProperty('--track-x', `${rendered.x}px`);
    row.style.setProperty('--track-y', `${rendered.y}px`);
    row.style.setProperty('--racer-colour', colour);
    row.setAttribute('aria-label', `${state.name}, position ${state.rank}`);
    row.title = `${state.rank}. ${state.name}`;
  }

  function animate(now) {
    updateMode();
    if (!raceScreen.classList.contains('hidden')) {
      const svg = ensureCircuit();
      const path = svg.querySelector('#gridlineCircuitPath');
      if (path && typeof path.getTotalLength === 'function') {
        const rows = Array.from(lanes.querySelectorAll('.raceLane'));
        const laps = totalLaps();
        syncMotion(rows, laps, now);
        const length = path.getTotalLength();
        for (const state of motion.values()) drawRacer(state,svg,path,length,now);
      }
    }
    requestAnimationFrame(animate);
  }

  const screenObserver = new MutationObserver(() => {
    updateMode();
    if (raceScreen.classList.contains('hidden')) motion.clear();
  });
  screenObserver.observe(raceScreen, {attributes:true, attributeFilter:['class']});

  window.addEventListener('resize',()=>{
    for (const state of motion.values()) state.lastFrame = performance.now();
  },{passive:true});

  requestAnimationFrame(animate);
})();
