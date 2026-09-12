(() => {
  const $ = id => document.getElementById(id);

  let liveRound = false;
  let lastWord = '';
  let lastCategory = '';
  let lastCorrect = 0;
  let trackedCorrect = 0;
  let trackedPasses = 0;
  let trackedHistory = [];
  let ending = false;

  const parseCorrect = () => {
    const text = $('headsLiveScore')?.textContent || '0';
    const n = parseInt(text, 10);
    return Number.isFinite(n) ? n : 0;
  };

  const resultsVisible = () => {
    const el = $('headsResults');
    return !!el && !el.classList.contains('hidden');
  };

  const liveVisible = () => {
    const el = $('headsLive');
    return !!el && !el.classList.contains('hidden');
  };

  function releaseLandscape() {
    document.body.classList.remove('headsLandscapePlay');
    document.body.classList.add('headsRoundEnded');
    const overlay = $('headsRotateOverlay');
    if (overlay) overlay.classList.remove('show');
    try { screen.orientation?.unlock?.(); } catch {}
  }

  function resetTracking() {
    liveRound = true;
    ending = false;
    document.body.classList.remove('headsRoundEnded');
    trackedHistory = [];
    trackedCorrect = parseCorrect();
    trackedPasses = 0;
    lastCorrect = trackedCorrect;
    lastWord = $('headsWord')?.textContent || '';
    lastCategory = $('headsCardCategory')?.textContent || '';
  }

  function capturePreviousCard() {
    if (!liveRound || !lastWord || lastWord === 'Ready') return;
    const nowCorrect = parseCorrect();
    const wasCorrect = nowCorrect > lastCorrect;
    trackedHistory.push({
      word: lastWord,
      category: lastCategory,
      result: wasCorrect ? 'correct' : 'pass'
    });
    if (wasCorrect) trackedCorrect = nowCorrect;
    else trackedPasses++;
    lastCorrect = nowCorrect;
  }

  function renderFallbackHistory() {
    const wrap = $('headsHistory');
    if (!wrap) return;
    wrap.innerHTML = '';
    if (!trackedHistory.length) {
      wrap.innerHTML = '<div class="sub">No cards answered.</div>';
      return;
    }
    trackedHistory.forEach(item => {
      const row = document.createElement('div');
      row.className = `headsHistoryItem ${item.result}`;
      const safeWord = String(item.word).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
      const safeCategory = String(item.category).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
      row.innerHTML = `<div><strong>${safeWord}</strong><span>${safeCategory}</span></div><b>${item.result === 'correct' ? '✓ Correct' : 'Pass'}</b>`;
      wrap.appendChild(row);
    });
  }

  function forceResults() {
    if (ending) return;
    ending = true;

    releaseLandscape();

    $('headsCountdownWrap')?.classList.add('hidden');
    $('headsReady')?.classList.add('hidden');
    $('headsLive')?.classList.add('hidden');
    $('headsResults')?.classList.remove('hidden');

    const finalCorrect = Math.max(trackedCorrect, parseCorrect());
    const finalPasses = trackedPasses;

    if ($('headsFinalScore')) $('headsFinalScore').textContent = finalCorrect;
    if ($('headsFinalLabel')) $('headsFinalLabel').textContent = finalCorrect === 1 ? 'correct answer' : 'correct answers';
    if ($('headsCorrectCount')) $('headsCorrectCount').textContent = finalCorrect;
    if ($('headsPassCount')) $('headsPassCount').textContent = finalPasses;
    renderFallbackHistory();

    liveRound = false;
  }

  function handleWordChange() {
    if (!liveVisible()) return;
    const word = $('headsWord')?.textContent || '';
    const category = $('headsCardCategory')?.textContent || '';

    if (!liveRound) {
      resetTracking();
      return;
    }

    if (word !== lastWord) {
      capturePreviousCard();
      lastWord = word;
      lastCategory = category;
      lastCorrect = parseCorrect();
    }
  }

  function handleClockChange() {
    const clock = $('headsClock');
    if (!clock) return;
    const value = parseFloat(clock.textContent);
    if (!Number.isFinite(value)) return;

    if (value > 0 && liveVisible() && !liveRound) resetTracking();

    if (value <= 0 && liveVisible()) {
      setTimeout(() => {
        if (!resultsVisible()) forceResults();
        else releaseLandscape();
      }, 30);
    }
  }

  const word = $('headsWord');
  const clock = $('headsClock');
  const results = $('headsResults');

  if (word) new MutationObserver(handleWordChange).observe(word, {childList:true, characterData:true, subtree:true});
  if (clock) new MutationObserver(handleClockChange).observe(clock, {childList:true, characterData:true, subtree:true});
  if (results) {
    new MutationObserver(() => {
      if (resultsVisible()) {
        releaseLandscape();
        liveRound = false;
      }
    }).observe(results, {attributes:true, attributeFilter:['class']});
  }

  ['orientationchange', 'resize'].forEach(evt => {
    window.addEventListener(evt, () => {
      if (resultsVisible() || document.body.classList.contains('headsRoundEnded')) {
        setTimeout(releaseLandscape, 150);
      }
    });
  });

  $('headsBegin')?.addEventListener('click', () => {
    document.body.classList.remove('headsRoundEnded');
    liveRound = false;
    ending = false;
  }, true);

  $('headsAgain')?.addEventListener('click', () => {
    document.body.classList.remove('headsRoundEnded');
    liveRound = false;
    ending = false;
  }, true);

  $('headsResultsSetup')?.addEventListener('click', releaseLandscape, true);
  $('headsBackSetup')?.addEventListener('click', releaseLandscape, true);

  const style = document.createElement('style');
  style.textContent = 'body.headsRoundEnded .headsRotateOverlay{display:none!important}';
  document.head.appendChild(style);
})();
