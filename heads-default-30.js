(() => {
  const buttons = [...document.querySelectorAll('#headsTimer button')];
  const thirty = buttons.find(button => button.textContent.trim() === '30s');
  if (thirty && !thirty.classList.contains('active')) thirty.click();
})();
