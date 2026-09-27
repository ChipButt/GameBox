(() => {
  const start = document.getElementById('headsBegin');
  const results = document.getElementById('headsResults');
  if (!results) return;

  let ctx = null;
  let played = false;

  function audioContext() {
    try {
      if (!ctx) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (Ctx) ctx = new Ctx();
      }
      if (ctx?.state === 'suspended') ctx.resume().catch(() => {});
      return ctx;
    } catch {
      return null;
    }
  }

  function playEndSting() {
    if (played) return;
    played = true;
    const a = audioContext();
    if (!a) return;

    const now = a.currentTime;
    const master = a.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.28, now + 0.02);
    master.gain.setValueAtTime(0.28, now + 0.42);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.95);
    master.connect(a.destination);

    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((frequency, index) => {
      const osc = a.createOscillator();
      const gain = a.createGain();
      const startAt = now + index * 0.085;
      osc.type = index === notes.length - 1 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(frequency, startAt);
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(index === notes.length - 1 ? 0.55 : 0.35, startAt + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + (index === notes.length - 1 ? 0.58 : 0.24));
      osc.connect(gain);
      gain.connect(master);
      osc.start(startAt);
      osc.stop(startAt + (index === notes.length - 1 ? 0.62 : 0.28));
    });

    const bass = a.createOscillator();
    const bassGain = a.createGain();
    bass.type = 'sine';
    bass.frequency.setValueAtTime(130.81, now + 0.25);
    bassGain.gain.setValueAtTime(0.0001, now + 0.25);
    bassGain.gain.exponentialRampToValueAtTime(0.22, now + 0.27);
    bassGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.82);
    bass.connect(bassGain);
    bassGain.connect(master);
    bass.start(now + 0.25);
    bass.stop(now + 0.86);
  }

  if (start) {
    start.addEventListener('click', () => {
      played = false;
      audioContext();
    }, { capture: true });
  }

  new MutationObserver(() => {
    if (!results.classList.contains('hidden')) playEndSting();
  }).observe(results, { attributes: true, attributeFilter: ['class'] });
})();
