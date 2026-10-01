(async () => {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const wrap = document.getElementById('stageWrap');
  const actionLabel = document.getElementById('actionLabel');
  const directionLabel = document.getElementById('directionLabel');
  const frameLabel = document.getElementById('frameLabel');
  const loadError = document.getElementById('loadError');

  const WALK_FPS = 10;
  const IDLE_FPS = 6;
  const state = {
    x: 192,
    y: 204,
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
      state.y = Math.max(112, Math.min(226, state.y + ny * 48 * dt));
      setMode('walk', walkingDirection(state.joyX, state.joyY, state.dir), now);
    } else {
      const idleDir = state.dir === 'north' ? 'north' : state.dir === 'south' ? 'south' : state.dir;
      setMode('idle', idleDir, now);
    }
  }

  function animationFrame(now) {
    const fps = state.mode === 'walk' ? WALK_FPS : IDLE_FPS;
    return Math.floor(Math.max(0, now - state.animStart) / 1000 * fps) % 8;
  }

  function drawWorkshop() {
    ctx.fillStyle = '#123021';
    ctx.fillRect(0, 0, 384, 256);

    ctx.fillStyle = '#204b34';
    ctx.fillRect(0, 0, 384, 62);
    ctx.fillStyle = '#8e2932';
    ctx.fillRect(0, 58, 384, 4);

    for (let x = 18; x < 384; x += 74) {
      ctx.fillStyle = '#f5e8c7';
      ctx.fillRect(x, 12, 48, 34);
      ctx.fillStyle = '#9f343a';
      ctx.fillRect(x + 4, 16, 40, 26);
      ctx.fillStyle = '#ead8ae';
      ctx.fillRect(x + 8, 20, 32, 18);
      ctx.fillStyle = '#285a3c';
      ctx.fillRect(x + 14, 24, 20, 10);
    }

    ctx.fillStyle = '#b38862';
    ctx.fillRect(0, 62, 384, 194);
    for (let y = 70; y < 256; y += 18) {
      ctx.fillStyle = '#c59a70';
      ctx.fillRect(0, y, 384, 1);
    }
    for (let x = 0; x < 384; x += 36) {
      ctx.fillStyle = '#9e7658';
      ctx.fillRect(x, 62, 1, 194);
    }

    ctx.fillStyle = '#7c2630';
    ctx.fillRect(100, 100, 184, 92);
    ctx.fillStyle = '#a4373e';
    ctx.fillRect(106, 106, 172, 80);
    ctx.fillStyle = '#e3bd69';
    ctx.fillRect(114, 114, 156, 64);
    ctx.fillStyle = '#24533a';
    ctx.fillRect(122, 122, 140, 48);

    ctx.fillStyle = '#6a4b34';
    ctx.fillRect(14, 76, 62, 42);
    ctx.fillRect(308, 76, 62, 42);
    ctx.fillStyle = '#d1a95c';
    ctx.fillRect(20, 82, 50, 30);
    ctx.fillRect(314, 82, 50, 30);
    ctx.fillStyle = '#b8343b';
    ctx.fillRect(28, 90, 14, 14);
    ctx.fillStyle = '#315f40';
    ctx.fillRect(47, 90, 14, 14);
    ctx.fillStyle = '#b8343b';
    ctx.fillRect(322, 90, 14, 14);
    ctx.fillStyle = '#315f40';
    ctx.fillRect(341, 90, 14, 14);

    ctx.fillStyle = '#fff7dd';
    for (const p of [[30,54],[82,36],[152,50],[224,30],[290,47],[350,28]]) {
      ctx.fillRect(p[0],p[1],2,2);
      ctx.fillRect(p[0]-2,p[1]+2,6,1);
      ctx.fillRect(p[0],p[1]-2,1,6);
    }
  }

  function draw(now) {
    drawWorkshop();

    ctx.fillStyle = '#07120c66';
    ctx.beginPath();
    ctx.ellipse(Math.round(state.x), Math.round(state.y + 4), 28, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    const index = animationFrame(now);
    let frame;
    let sourceText;

    if (state.mode === 'walk') {
      frame = sprite.walk(state.sourceDir, index);
      sourceText = 'WALK ' + state.sourceDir.toUpperCase() + ' · frame ' + (index + 1) + '/8';
    } else if (state.sourceDir === 'south' || state.sourceDir === 'north') {
      frame = sprite.idle(state.sourceDir, index);
      sourceText = 'IDLE ' + state.sourceDir.toUpperCase() + ' · frame ' + (index + 1) + '/8';
    } else {
      frame = sprite.rotation(state.dir);
      sourceText = 'FACING ' + state.dir.toUpperCase() + ' · rotation frame';
    }

    if (frame) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(frame, Math.round(state.x - 84), Math.round(state.y - 160), 168, 168);
      ctx.restore();
    }

    directionLabel.textContent = state.dir.toUpperCase();
    frameLabel.textContent = sourceText;
  }

  function loop(now) {
    const dt = Math.min(0.05, (now - state.last) / 1000);
    state.last = now;
    update(dt, now);
    draw(now);
    requestAnimationFrame(loop);
  }

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
  }
})();