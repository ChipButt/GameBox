(function(){
  'use strict';

  const canvas=document.getElementById('puzzleCanvas');
  const placedEl=document.getElementById('placedCount');
  const totalEl=document.getElementById('totalCount');
  const menu=document.getElementById('menuSheet');
  const win=document.getElementById('winOverlay');
  const guideBtn=document.getElementById('guideButton');
  const soundBtn=document.getElementById('soundButton');
  const fileInput=document.getElementById('imageFile');
  const titleEl=document.getElementById('puzzleTitle');
  let guideIndex=1;
  const guideValues=[0,.10,.28];
  const guideLabels=['Guide: Off','Guide: Faint','Guide: Strong'];
  let sound=true;
  let objectUrl='';

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
    closeMenu(); win.classList.remove('show'); puzzle.restart();
  });

  document.getElementById('winRestart').addEventListener('click',()=>{
    win.classList.remove('show'); puzzle.restart();
  });

  document.getElementById('winHome').addEventListener('click',()=>{ location.href='../'; });

  guideBtn.addEventListener('click',()=>{
    guideIndex=(guideIndex+1)%guideValues.length;
    puzzle.setGuideOpacity(guideValues[guideIndex]);
    guideBtn.textContent=guideLabels[guideIndex];
  });

  soundBtn.addEventListener('click',()=>{
    sound=!sound;puzzle.setSound(sound);
    soundBtn.textContent='Sound: '+(sound?'On':'Off');
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

  guideBtn.textContent=guideLabels[guideIndex];
  soundBtn.textContent='Sound: On';
})();
