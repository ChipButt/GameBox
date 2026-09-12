(() => {
  const reverse = document.getElementById('headsReverseTilt');
  const forceDownCorrect = () => {
    if (reverse) reverse.checked = true;
  };

  forceDownCorrect();

  ['headsStart','headsSaveRound','headsBegin'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', forceDownCorrect, true);
  });

  if (reverse) {
    reverse.checked = true;
    reverse.disabled = true;
    const row = reverse.closest('.headsToggle');
    if (row) row.style.display = 'none';
  }
})();
