(async () => {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const wrap = document.getElementById('stageWrap');
  const actionLabel = document.getElementById('actionLabel');
  const loadError = document.getElementById('loadError');
  const creator = document.getElementById('creator');
  const creatorPreview = document.getElementById('creatorPreview');
  const previewCtx = creatorPreview.getContext('2d');
  previewCtx.imageSmoothingEnabled = false;

  const STORAGE_KEY = 'gamebox-cute-elf-character-v1';
  const WALK_FPS = 10;
  const IDLE_FPS = 6;
  const SCALE = 2;

  const inputs = {
    hat: document.getElementById('colourHat'),
    skin: document.getElementById('colourSkin'),
    hair: document.getElementById('colourHair'),
    jacket: document.getElementById('colourJacket'),
    trousers: document.getElementById('colourTrousers'),
    shoes: document.getElementById('colourShoes')
  };

  const state = {
    x: 192,
    y: 220,
    dir: 'south',
    sourceDir: 'south',
    mode: 'idle',
    animStart: performance.now(),
    joyX: 0,
    joyY: 0,
    moving: false,
    last: performance.now()
  };

  let sprite;

  function validHex(v) {
    return /^#[0-9a-f]{6}$/i.test(String(v || ''));
  }

  function themeFromInputs() {
    return Object.fromEntries(Object.entries(inputs).map(([key,input]) => [key, input.value]));
  }

  function applyInputs(theme) {
    const base = sprite?.defaults || {
      hat:'#548343', skin:'#f2bba0', hair:'#b56531',
      jacket:'#548343', trousers:'#2d2a37', shoes:'#4f4238'
    };
    for (const [key,input] of Object.entries(inputs)) {
      input.value = validHex(theme?.[key]) ? theme[key] : base[key];
    }
  }

  function savedTheme() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!value || typeof value !== 'object') return null;
      return Object.fromEntries(Object.entries(value).filter(([key,v]) => inputs[key] && validHex(v)));
    } catch (_) {
      return null;
    }
  }

  function resize() {
    const r = wrap.getBoundingClientRect();
    const scale = Math.max(1, Math.floor(Math.min(r.width / canvas.width, r.height / canvas.height)));
    canvas.style.width = (canvas.width * scale) + 'px';
    canvas.style.height = (canvas.height * scale) + 'px';
  }

  function directionFromVector(x, y) {
    if (Math.hypot(x, y) < 0.12) return state.dir;
    let angle = Math.atan2(y, x) * 180 / Math.PI;
    if (angle < 0) angle += 360;
    const order = ['east','south-east','south','south-west','west','north-west','north','north-east'];
    return order[Math.round(angle / 45) % 8];
  }

  function walkingDirection(x, y, facing) {
    if (Math.abs(x) > Math.abs(y)) return x < 0 ? 'west' : 'east';
    if (Math.abs(y) > 0.12) return y < 0 ? 'north' : 'south';
    if (facing.includes('west')) return 'west';
    if (facing.includes('east')) return 'east';
    if (facing.includes('north')) return 'north';
    return 'south';
  }

  function setMode(mode, sourceDir, now) {
    if (state.mode === mode && state.sourceDir === sourceDir) return;
    state.mode = mode;
    state.sourceDir = sourceDir;
    state.animStart = now;
    actionLabel.textContent = mode === 'walk' ? 'WALKING' : 'IDLE';
  }

  function update(dt, now) {
    const mag = Math.hypot(state.joyX, state.joyY);
    state.moving = mag > 0.12;

    if (state.moving) {
      state.dir = directionFromVector(state.joyX, state.joyY);
      const nx = state.joyX / mag;
      const ny = state.joyY / mag;
      state.x = Math.max(42, Math.min(342, state.x + nx * 48 * dt));
      state.y = Math.max(108, Math.min(238, state.y + ny * 48 * dt));
      setMode('walk', walkingDirection(state.joyX, state.joyY, state.dir), now);
    } else {
      const idleDir = state.dir === 'north' ? 'north' : state.dir === 'south' ? 'south' : state.dir;
      setMode('idle', idleDir, now);
    }
  }

  function animationFrame(now, fps = null) {
    const rate = fps || (state.mode === 'walk' ? WALK_FPS : IDLE_FPS);
    return Math.floor(Math.max(0, now - state.animStart) / 1000 * rate) % 8;
  }

  function idleCycle(now, start = state.animStart) {
    return Math.floor(Math.max(0, now - start) / 1000 * IDLE_FPS / 8);
  }

  function blinkThisIdleCycle(now, start = state.animStart) {
    // First idle loop stays open; every second complete loop uses the source blink.
    return idleCycle(now, start) % 2 === 1;
  }

  function currentFrame(now) {
    const index = animationFrame(now);
    if (state.mode === 'walk') return sprite.walk(state.sourceDir, index);
    if (state.sourceDir === 'south' || state.sourceDir === 'north') {
      return sprite.idle(state.sourceDir, index, blinkThisIdleCycle(now));
    }
    return sprite.rotation(state.dir);
  }

  function drawWorkshop(target, width, height) {
    target.fillStyle = '#123021';
    target.fillRect(0, 0, width, height);

    target.fillStyle = '#204b34';
    target.fillRect(0, 0, width, Math.round(height * .24));
    target.fillStyle = '#8e2932';
    target.fillRect(0, Math.round(height * .225), width, Math.max(3, Math.round(height * .016)));

    const floorY = Math.round(height * .24);
    target.fillStyle = '#b38862';
    target.fillRect(0, floorY, width, height - floorY);

    for (let y = floorY + 8; y < height; y += 18) {
      target.fillStyle = '#c59a70';
      target.fillRect(0, y, width, 1);
    }
    for (let x = 0; x < width; x += 36) {
      target.fillStyle = '#9e7658';
      target.fillRect(x, floorY, 1, height - floorY);
    }

    const rugW = Math.round(width * .48), rugH = Math.round(height * .36);
    const rugX = Math.round((width - rugW) / 2), rugY = Math.round(height * .40);
    target.fillStyle = '#7c2630'; target.fillRect(rugX, rugY, rugW, rugH);
    target.fillStyle = '#a4373e'; target.fillRect(rugX+6, rugY+6, rugW-12, rugH-12);
    target.fillStyle = '#e3bd69'; target.fillRect(rugX+14, rugY+14, rugW-28, rugH-28);
    target.fillStyle = '#24533a'; target.fillRect(rugX+22, rugY+22, rugW-44, rugH-44);
  }

  function drawElf(target, frame, centerX, groundY, scale = SCALE) {
    const bounds = sprite.bounds(frame);
    const drawX = Math.round(centerX - 42 * scale);
    const drawY = Math.round(groundY - (bounds.maxY + 1) * scale);

    target.fillStyle = '#07120c66';
    target.beginPath();
    const shadowW = Math.max(18, Math.min(31, bounds.width * scale * .37));
    target.ellipse(Math.round(centerX), Math.round(groundY + 2), shadowW, 6, 0, 0, Math.PI * 2);
    target.fill();

    target.save();
    target.imageSmoothingEnabled = false;
    target.drawImage(frame, drawX, drawY, 84 * scale, 84 * scale);
    target.restore();
  }

  function draw(now) {
    drawWorkshop(ctx, canvas.width, canvas.height);
    const frame = currentFrame(now);
    if (frame) drawElf(ctx, frame, state.x, state.y, SCALE);
  }

  function drawPreview(now) {
    drawWorkshop(previewCtx, creatorPreview.width, creatorPreview.height);
    if (!sprite) return;
    const previewStart = 0;
    const index = Math.floor(now / 1000 * IDLE_FPS) % 8;
    const frame = sprite.idle('south', index, blinkThisIdleCycle(now, previewStart));
    if (frame) drawElf(previewCtx, frame, creatorPreview.width / 2, creatorPreview.height - 10, SCALE);
  }

  function loop(now) {
    const dt = Math.min(0.05, (now - state.last) / 1000);
    state.last = now;
    update(dt, now);
    draw(now);
    drawPreview(now);
    requestAnimationFrame(loop);
  }

  function setThemeFromCreator() {
    if (!sprite) return;
    sprite.setTheme(themeFromInputs());
  }

  for (const input of Object.values(inputs)) {
    input.addEventListener('input', setThemeFromCreator);
    input.addEventListener('change', setThemeFromCreator);
  }

  document.getElementById('resetCharacter').addEventListener('click', () => {
    applyInputs(sprite.defaults);
    sprite.setTheme(sprite.defaults);
  });

  document.getElementById('saveCharacter').addEventListener('click', () => {
    const theme = themeFromInputs();
    sprite.setTheme(theme);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(theme));
    creator.classList.add('hidden');
    actionLabel.textContent = state.mode === 'walk' ? 'WALKING' : 'IDLE';
  });

  document.getElementById('customiseBtn').addEventListener('click', () => {
    applyInputs(sprite.getTheme());
    creator.classList.remove('hidden');
  });

  document.getElementById('creatorClose').addEventListener('click', () => {
    creator.classList.add('hidden');
  });

  const joy = document.getElementById('joystick');
  const knob = document.getElementById('joyKnob');
  let joyPointer = null;

  function moveJoystick(event) {
    const r = joy.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const dx = event.clientX - cx;
    const dy = event.clientY - cy;
    const max = 35;
    const mag = Math.hypot(dx, dy) || 1;
    const scale = Math.min(1, max / mag);
    const px = dx * scale;
    const py = dy * scale;
    knob.style.transform = 'translate(' + px + 'px,' + py + 'px)';
    state.joyX = px / max;
    state.joyY = py / max;
  }

  joy.addEventListener('pointerdown', event => {
    joyPointer = event.pointerId;
    joy.setPointerCapture(event.pointerId);
    moveJoystick(event);
  });
  joy.addEventListener('pointermove', event => {
    if (event.pointerId === joyPointer) moveJoystick(event);
  });
  function stopJoystick(event) {
    if (event.pointerId !== joyPointer) return;
    joyPointer = null;
    state.joyX = 0;
    state.joyY = 0;
    knob.style.transform = 'translate(0,0)';
  }
  joy.addEventListener('pointerup', stopJoystick);
  joy.addEventListener('pointercancel', stopJoystick);

  const keys = new Set();
  addEventListener('keydown', event => {
    const key = event.key.toLowerCase();
    if (event.target?.matches('input,button')) return;
    keys.add(key);
    if (['arrowup','arrowdown','arrowleft','arrowright'].includes(key)) event.preventDefault();
  });
  addEventListener('keyup', event => keys.delete(event.key.toLowerCase()));

  function keyboardLoop() {
    if (joyPointer === null) {
      let x = 0, y = 0;
      if (keys.has('arrowleft') || keys.has('a')) x -= 1;
      if (keys.has('arrowright') || keys.has('d')) x += 1;
      if (keys.has('arrowup') || keys.has('w')) y -= 1;
      if (keys.has('arrowdown') || keys.has('s')) y += 1;
      state.joyX = x;
      state.joyY = y;
    }
    requestAnimationFrame(keyboardLoop);
  }

  try {
    sprite = await window.CuteElfSprite.ready;
    if (sprite.data.width !== 84 || sprite.data.height !== 84 || sprite.data.frameCount !== 56) {
      throw new Error('Unexpected elf sprite dimensions.');
    }

    const saved = savedTheme();
    applyInputs(saved || sprite.defaults);
    sprite.setTheme(saved || sprite.defaults);

    actionLabel.textContent = 'IDLE';
    resize();
    addEventListener('resize', resize, { passive: true });
    window.visualViewport?.addEventListener('resize', resize, { passive: true });
    requestAnimationFrame(keyboardLoop);
    requestAnimationFrame(loop);
  } catch (error) {
    console.error(error);
    loadError.hidden = false;
    loadError.textContent = 'Could not load coded Christmas elf sprite data: ' + error.message;
    actionLabel.textContent = 'LOAD ERROR';
    creator.classList.add('hidden');
  }
})();