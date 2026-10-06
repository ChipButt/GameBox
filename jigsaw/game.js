(function(){
  'use strict';

  const canvas=document.getElementById('puzzleCanvas');
  const stage=document.getElementById('puzzleStage');
  const menu=document.getElementById('menuSheet');
  const win=document.getElementById('winOverlay');
  const guideBtn=document.getElementById('guideButton');
  const guideState=document.getElementById('guideState');
  const guideCheck=document.getElementById('guideCheck');
  const soundBtn=document.getElementById('soundButton');
  const soundState=document.getElementById('soundState');
  const soundIcon=document.getElementById('soundIcon');
  const soundCheck=document.getElementById('soundCheck');
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
  const CHECK_EMPTY='../assets/gamebox/kenney/ui/UI Pack/Grey/Double/check_square_grey.png';
  const CHECK_ON='../assets/gamebox/kenney/ui/UI Pack/Blue/Double/check_square_color_checkmark.png';

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
    onProgress({total}){
      if(winPieceCount) winPieceCount.textContent=total;
    },
    onComplete(){
      win.classList.add('show');
    }
  });

  function syncStageArt(){
    const layout=puzzle.layout;
    if(!layout||!stage) return;
    stage.style.setProperty('--board-x',layout.boardX+'px');
    stage.style.setProperty('--board-y',layout.boardY+'px');
    stage.style.setProperty('--board-size',layout.boardSize+'px');
    stage.style.setProperty('--tray-top',layout.trayTop+'px');
  }

  function closeMenu(){ menu.classList.remove('show'); }
  function openMenu(){ menu.classList.add('show'); }

  function updateGuideVisual(){
    const label=guideLabels[guideIndex];
    guideState.textContent=label;
    guideCheck.src=guideIndex===0?CHECK_EMPTY:CHECK_ON;
    guideBtn.dataset.guide=label.toLowerCase();
    guideBtn.setAttribute('aria-label','Picture guide: '+label);
  }

  function updateSoundVisual(){
    soundState.textContent=sound?'On':'Off';
    soundIcon.src=ICON_BASE+(sound?'audioOn.png':'audioOff.png');
    soundCheck.src=sound?CHECK_ON:CHECK_EMPTY;
    soundBtn.dataset.enabled=sound?'true':'false';
    soundBtn.setAttribute('aria-label','Sound: '+(sound?'On':'Off'));
  }

  document.getElementById('menuButton').addEventListener('click',openMenu);
  document.getElementById('closeMenu').addEventListener('click',closeMenu);
  menu.addEventListener('click',e=>{ if(e.target===menu) closeMenu(); });

  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'){
      if(menu.classList.contains('show')) closeMenu();
      else if(win.classList.contains('show')) win.classList.remove('show');
    }
  });

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
    updateGuideVisual();
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
      requestAnimationFrame(syncStageArt);
    });
  });

  soundBtn.addEventListener('click',()=>{
    sound=!sound;
    puzzle.setSound(sound);
    updateSoundVisual();
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

    try{
      await puzzle.setImage(objectUrl);
      syncStageArt();
    }catch(err){
      console.error(err);
    }
  });

  updateGuideVisual();
  updateSoundVisual();

  Promise.resolve(puzzle.ready).then(()=>{
    syncStageArt();
  }).catch(err=>console.error(err));

  window.addEventListener('resize',()=>{
    requestAnimationFrame(syncStageArt);
  },{passive:true});
})();