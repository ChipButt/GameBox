(() => {
  'use strict';

  const upgradeGrid = document.getElementById('upgradeGrid');
  const raceScreen = document.getElementById('raceScreen');
  if (!upgradeGrid || !raceScreen) return;

  const stats = ['pace','handling','focus','reliability'];

  function sourceFor(stat) {
    return upgradeGrid.querySelector(`[data-upgrade="${stat}"]`);
  }

  function dockFor(stat) {
    return raceScreen.querySelector(`.raceActionDock [data-dock-stat="${stat}"]`);
  }

  function syncUpgradeDock() {
    for (const stat of stats) {
      const source = sourceFor(stat);
      const dock = dockFor(stat);
      if (!dock) continue;

      if (!source) {
        dock.disabled = true;
        const meta = dock.querySelector(`[data-dock-cost="${stat}"]`);
        if (meta) meta.textContent = '—';
        continue;
      }

      dock.disabled = source.disabled;
      const strong = source.querySelector('strong')?.textContent || '';
      const small = source.querySelector('small')?.textContent || '';
      const level = strong.match(/Lv\s*([\d]+)/i)?.[1];
      const cost = small.match(/£[\d,]+/)?.[0];
      const meta = dock.querySelector(`[data-dock-cost="${stat}"]`);
      if (meta) meta.textContent = [level ? `Lv ${level}` : '', cost || ''].filter(Boolean).join(' · ') || '—';
    }
  }

  for (const stat of stats) {
    const dock = dockFor(stat);
    if (!dock) continue;
    dock.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      const source = sourceFor(stat);
      if (!source || source.disabled) return;
      source.click();
      dock.classList.add('justActivated');
      setTimeout(() => dock.classList.remove('justActivated'), 140);
      setTimeout(syncUpgradeDock, 0);
    });
  }

  const observer = new MutationObserver(syncUpgradeDock);
  observer.observe(upgradeGrid, {childList:true, subtree:true, attributes:true, attributeFilter:['disabled']});
  setInterval(syncUpgradeDock, 350);
  syncUpgradeDock();
})();
