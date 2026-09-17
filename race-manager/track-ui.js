(() => {
  'use strict';

  const palette = ['#f7bd18','#2f80ed','#e05263','#36a269','#8d6bd1','#ef8d32','#20a7a0','#d05ca8','#66788a','#9c7a36','#55a9e8','#a05b42'];
  const lanes = document.getElementById('raceLanes');
  const raceScreen = document.getElementById('raceScreen');
  if (!lanes || !raceScreen) return;

  const VIEW_W = 600;
  const VIEW_H = 340;
  const CIRCUIT_D = 'M 104 278 C 55 267 42 224 67 190 C 91 158 139 152 164 181 C 185 205 168 236 197 249 C 224 261 253 244 253 216 C 252 185 227 173 241 139 C 255 105 291 90 322 105 C 355 121 351 163 382 174 C 418 187 438 154 449 126 C 464 88 514 82 540 111 C 570 145 555 195 522 213 C 492 230 476 256 503 278 C 526 297 554 291 565 275 C 575 301 548 320 508 320 L 174 320 C 134 320 113 304 104 278 Z';

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
    if (match) return Math.max(0, Math.min(100, Number(match[1]) / 0.96));
    const pct = raw.match(/([\d.]+)%/);
    return pct ? Math.max(0, Math.min(100, Number(pct[1]))) : 0;
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

  function layoutTrack() {
    updateMode();
    if (raceScreen.classList.contains('hidden')) return;
    const svg = ensureCircuit();
    const path = svg.querySelector('#gridlineCircuitPath');
    if (!path || typeof path.getTotalLength !== 'function') return;

    const laps = totalLaps();
    const length = path.getTotalLength();
    const rows = Array.from(lanes.querySelectorAll('.raceLane'));
    rows.forEach((row, index) => {
      const dot = row.querySelector('.carDot');
      const totalProgress = progressFromDot(dot);
      let lapProgress = ((totalProgress / 100) * laps) % 1;
      if (totalProgress >= 99.95) lapProgress = 0.995;
      const point = path.getPointAtLength(length * lapProgress);
      const name = row.querySelector('.name')?.textContent?.trim() || `Racer ${index + 1}`;
      const rank = row.querySelector('.pos')?.textContent?.trim() || String(index + 1);
      const isYou = row.classList.contains('you');
      const colour = isYou ? '#f7bd18' : palette[hash(name) % palette.length];

      row.style.setProperty('--track-x', `${(point.x / VIEW_W) * 100}%`);
      row.style.setProperty('--track-y', `${(point.y / VIEW_H) * 100}%`);
      row.style.setProperty('--racer-colour', colour);
      row.setAttribute('aria-label', `${name}, position ${rank}`);
      row.title = `${rank}. ${name}`;
    });
  }

  let queued = false;
  const queueLayout = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      layoutTrack();
    });
  };

  const laneObserver = new MutationObserver(queueLayout);
  laneObserver.observe(lanes, {childList:true, subtree:true, attributes:true, attributeFilter:['style','class']});
  const screenObserver = new MutationObserver(queueLayout);
  screenObserver.observe(raceScreen, {attributes:true, attributeFilter:['class']});

  window.addEventListener('resize', queueLayout, {passive:true});
  setInterval(queueLayout, 400);
  queueLayout();
})();
