(function(){
  'use strict';

  const canvas=document.getElementById('puzzleCanvas');
  const placedEl=document.getElementById('placedCount');
  const totalEl=document.getElementById('totalCount');
  const menu=document.getElementById('menuSheet');
  const win=document.getElementById('winOverlay');
  const guideBtn=document.getElementById('guideButton');
  const guideState=document.getElementById('guideState');
  const soundBtn=document.getElementById('soundButton');
  const soundState=document.getElementById('soundState');
  const soundIcon=document.getElementById('soundIcon');
  const pieceButtons=[...document.querySelectorAll('[data-piece-grid]')];
  const winPieceCount=document.getElementById('winPieceCount');
  const fileInput=document.getElementById('imageFile');
  const titleEl=document.getElementById('puzzleTitle');
  let guideIndex=0;
  const guideValues=[0,.10,.28];
  const guideLabels=['Off','Faint','Strong'];
  let sound=true;
  let objectUrl='';

  const ICON_BASE='../assets/gamebox/kenney/icons/Game Icons/White/2x/';

  const puzzle=GameBoxJigsaw.create({
    canvas,
    image:'assets/test-christmas-scene.svg',
    rows:6,
    columns:6,
    guideOpacity:guideValues[guideIndex],
    snapTolerance:.24,
    snapDuration:125,
    seed:'gamebox-jigsaw-christmas-test-v1',
    sound:true,
    vibration:true,
    onProgress({placed,total}){
      placedEl.textContent=placed;
      totalEl.textContent=total;
      if(winPieceCount) winPieceCount.textContent=total;
    },
    onComplete(){
      win.classList.add('show');
    }
  });

  function closeMenu(){ menu.classList.remove('show'); }
  function openMenu(){ menu.classList.add('show'); }

  document.getElementById('menuButton').addEventListener('click',openMenu);
  document.getElementById('closeMenu').addEventListener('click',closeMenu);
  menu.addEventListener('click',e=>{ if(e.target===menu) closeMenu(); });

  document.getElementById('restartButton').addEventListener('click',()=>{
    closeMenu();
    win.classList.remove('show');
    puzzle.restart();
  });

  document.getElementById('winRestart').addEventListener('click',()=>{
    win.classList.remove('show');
    puzzle.restart();
  });

  document.getElementById('winHome').addEventListener('click',()=>{ location.href='../'; });

  guideBtn.addEventListener('click',()=>{
    guideIndex=(guideIndex+1)%guideValues.length;
    puzzle.setGuideOpacity(guideValues[guideIndex]);
    guideState.textContent=guideLabels[guideIndex];
    guideBtn.dataset.guide=guideLabels[guideIndex].toLowerCase();
    guideBtn.setAttribute('aria-label','Guide: '+guideLabels[guideIndex]);
  });

  pieceButtons.forEach(button=>{
    button.addEventListener('click',()=>{
      const grid=Number(button.dataset.pieceGrid);
      if(!Number.isFinite(grid)) return;
      win.classList.remove('show');
      puzzle.setGrid(grid,grid);
      pieceButtons.forEach(item=>{
        const selected=item===button;
        item.classList.toggle('selected',selected);
        item.setAttribute('aria-pressed',selected?'true':'false');
      });
      closeMenu();
    });
  });

  soundBtn.addEventListener('click',()=>{
    sound=!sound;
    puzzle.setSound(sound);
    soundState.textContent=sound?'On':'Off';
    soundIcon.src=ICON_BASE+(sound?'audioOn.png':'audioOff.png');
    soundBtn.dataset.enabled=sound?'true':'false';
    soundBtn.setAttribute('aria-label','Sound: '+(sound?'On':'Off'));
  });

  document.getElementById('chooseImage').addEventListener('click',()=>fileInput.click());
  fileInput.addEventListener('change',async()=>{
    const file=fileInput.files&&fileInput.files[0];
    if(!file||!file.type.startsWith('image/')) return;
    if(objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl=URL.createObjectURL(file);
    win.classList.remove('show');
    titleEl.textContent=file.name.replace(/\.[^.]+$/,'').slice(0,28)||'Custom Puzzle';
    closeMenu();
    try{ await puzzle.setImage(objectUrl); }
    catch(err){ console.error(err); }
  });

  guideState.textContent=guideLabels[guideIndex];
  guideBtn.dataset.guide='off';
  guideBtn.setAttribute('aria-label','Guide: Off');
  soundState.textContent='On';
  soundBtn.dataset.enabled='true';
  soundBtn.setAttribute('aria-label','Sound: On');
})();