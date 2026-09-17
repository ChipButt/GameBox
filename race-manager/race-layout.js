(() => {
  'use strict';

  const upgradeGrid = document.getElementById('upgradeGrid');
  const raceScreen = document.getElementById('raceScreen');
  if (!upgradeGrid || !raceScreen) return;

  function syncUpgradeDock() {
    for (const stat of ['pace','handling','focus','reliability']) {
      const source = upgradeGrid.querySelector(`[data-upgrade="${stat}"]`);
      const dock = raceScreen.querySelector(`.raceActionDock [data-dock-stat="${stat}"]`);
      if (!dock) continue;
      if (!source) {
        dock.disabled = true;
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

  const observer = new MutationObserver(syncUpgradeDock);
  observer.observe(upgradeGrid, {childList:true, subtree:true, attributes:true, attributeFilter:['disabled']});
  setInterval(syncUpgradeDock, 350);
  syncUpgradeDock();
})();
