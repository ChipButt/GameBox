(() => {
  'use strict';

  const palette = ['#f7bd18','#2f80ed','#e05263','#36a269','#8d6bd1','#ef8d32','#20a7a0','#d05ca8','#66788a','#9c7a36','#55a9e8','#a05b42'];
  const lanes = document.getElementById('raceLanes');
  const raceScreen = document.getElementById('raceScreen');
  if (!lanes || !raceScreen) return;

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

  function updateMode() {
    document.body.classList.toggle('gridline-racing-live', !raceScreen.classList.contains('hidden'));
  }

  function layoutTrack() {
    updateMode();
    if (raceScreen.classList.contains('hidden')) return;

    const laps = totalLaps();
    const rows = Array.from(lanes.querySelectorAll('.raceLane'));
    rows.forEach((row, index) => {
      const dot = row.querySelector('.carDot');
      const totalProgress = progressFromDot(dot);
      let lapProgress = ((totalProgress / 100) * laps) % 1;
      if (totalProgress >= 99.95) lapProgress = 0.995;

      const angle = Math.PI / 2 + lapProgress * Math.PI * 2;
      const x = 50 + Math.cos(angle) * 40.5;
      const y = 50 + Math.sin(angle) * 34.5;
      const name = row.querySelector('.name')?.textContent?.trim() || `Racer ${index + 1}`;
      const rank = row.querySelector('.pos')?.textContent?.trim() || String(index + 1);
      const isYou = row.classList.contains('you');
      const colour = isYou ? '#f7bd18' : palette[hash(name) % palette.length];

      row.style.setProperty('--track-x', `${x}%`);
      row.style.setProperty('--track-y', `${y}%`);
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
  setInterval(queueLayout, 500);
  queueLayout();
})();
