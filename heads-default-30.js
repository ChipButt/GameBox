(() => {
  const buttons = [...document.querySelectorAll('#headsTimer button')];
  const thirty = buttons.find(button => button.textContent.trim() === '30s');
  if (thirty && !thirty.classList.contains('active')) thirty.click();

  const loader=document.createElement('script');
  loader.src='players-loader.js?v=1';
  document.body.appendChild(loader);
})();
