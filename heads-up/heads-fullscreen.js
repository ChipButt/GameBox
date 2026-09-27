(() => {
  const start = document.getElementById('headsBegin');
  const results = document.getElementById('headsResults');
  const back = document.getElementById('headsBackSetup');
  const change = document.getElementById('headsResultsSetup');

  const requestGameFullscreen = () => {
    const root = document.documentElement;
    if (document.fullscreenElement || document.webkitFullscreenElement) return;
    const request = root.requestFullscreen || root.webkitRequestFullscreen;
    if (!request) return;
    try {
      const result = request.call(root, { navigationUI: 'hide' });
      if (result && typeof result.catch === 'function') result.catch(() => {});
    } catch {}
  };

  const exitGameFullscreen = () => {
    try {
      const exit = document.exitFullscreen || document.webkitExitFullscreen;
      if ((document.fullscreenElement || document.webkitFullscreenElement) && exit) {
        const result = exit.call(document);
        if (result && typeof result.catch === 'function') result.catch(() => {});
      }
    } catch {}
  };

  if (start) start.addEventListener('click', requestGameFullscreen, { capture: true });
  if (back) back.addEventListener('click', exitGameFullscreen);
  if (change) change.addEventListener('click', exitGameFullscreen);

  if (results) {
    new MutationObserver(() => {
      if (!results.classList.contains('hidden')) exitGameFullscreen();
    }).observe(results, { attributes: true, attributeFilter: ['class'] });
  }
})();
