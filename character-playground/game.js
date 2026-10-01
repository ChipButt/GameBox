(async () => {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const actionLabel = document.getElementById('actionLabel');
  const directionLabel = document.getElementById('directionLabel');
  const frameLabel = document.getElementById('frameLabel');
  const loadError = document.getElementById('loadError');
  const wrap = document.getElementById('stageWrap');

  const FPS = { walk: 8, run: 12, punch: 12, kick: 12, fall: 10 };
  const ONE_SHOT = new Set(['punch','kick','fall']);
  const CARDINAL = new Set(['south','east','north','west']);

  const state = {
    x: 192,
    y: 146,
    dir: 'south',
    action: 'idle',
    actionDir: 'south',
    actionStart: performance.now(),
    joyX: 0,
    joyY: 0,
    run: false,
    moving: false,
    fallen: false,
    last: performance.now()
  };

  let sprite;

  function resize() {
    const r = wrap.getBoundingClientRect();
    const scale = Math.max(1, Math.floor(Math.min(r.width / canvas.width, r.height / canvas.height)));
    canvas.style.width = `${canvas.width * scale}px`;
    canvas.style.height = `${canvas.height * scale}px`;
  }

  function directionFromVector(x, y) {
    if (Math.hypot(x, y) < 0.12) return state.dir;
    let a = Math.atan2(y, x) * 180 / Math.PI;
    if (a < 0) a += 360;
    const map = ['east','south-east','south','south-west','west','north-west','north','north-east'];
    return map[Math.round(a / 45) % 8];
  }

  function nearestCardinal(dir) {
    if (CARDINAL.has(dir)) return dir;
    if (dir === 'south-east' || dir === 'south-west') return 'south';
    if (dir === 'north-east' || dir === 'north-west') return 'north';
    return 'south';
  }

  function setAction(name, now = performance.now(), direction = state.dir) {
    state.action = name;
    state.actionDir = ONE_SHOT.has(name) ? nearestCardinal(direction) : direction;
    state.actionStart = now;
    actionLabel.textContent = name === 'idle' ? 'IDLE' : name.toUpperCase();
  }

  function duration(action, direction) {
    const count = sprite.count(action, direction);
    return count ? count / (FPS[action] || 1) : 0;
  }

  function oneShotFinished(now) {
    if (!ONE_SHOT.has(state.action)) return false;
    return (now - state.actionStart) / 1000 >= duration(state.action, state.actionDir);
  }

  function perform(action) {
    if (state.fallen && action !== 'fall') return;
    if (ONE_SHOT.has(state.action) && !oneShotFinished(performance.now())) return;
    setAction(action, performance.now(), state.dir);
  }

  function chooseLocomotion(now) {
    if (!state.moving) {
      setAction('idle', now, state.dir);
      return;
    }
    if (state.run) {
      setAction('run', now, state.dir);
      return;
    }
    if (sprite.has('walk', state.dir)) {
      setAction('walk', now, state.dir);
      return;
    }
    setAction('idle', now, state.dir);
  }

  function update(dt, now) {
    const mag = Math.hypot(state.joyX, state.joyY);

    if (state.fallen) {
      if (mag > 0.12) {
        state.fallen = false;
        setAction('idle', now, state.dir);
      } else {
        return;
      }
    }

    if (ONE_SHOT.has(state.action)) {
      if (oneShotFinished(now)) {
        if (state.action === 'fall') {
          state.fallen = true;
          actionLabel.textContent = 'FALLEN · MOVE TO RESET';
          return;
        }
        chooseLocomotion(now);
      } else {
        return;
      }
    }

    state.moving = mag > 0.12;
    if (state.moving) {
      state.dir = directionFromVector(state.joyX, state.joyY);
      const speed = state.run ? 74 : 44;
      state.x = Math.max(32, Math.min(352, state.x + state.joyX / mag * speed * dt));
      state.y = Math.max(92, Math.min(218, state.y + state.joyY / mag * speed * dt));
    }

    const desired = state.moving ? (state.run ? 'run' : (sprite.has('walk', state.dir) ? 'walk' : 'idle')) : 'idle';
    if (state.action !== desired || state.actionDir !== state.dir) setAction(desired, now, state.dir);
  }

  function frameIndex(now) {
    const action = state.action;
    const dir = state.actionDir;
    const count = sprite.count(action, dir);
    if (!count || action === 'idle') return 0;
    const elapsed = Math.max(0, (now - state.actionStart) / 1000);
    const fps = FPS[action] || 1;
    if (ONE_SHOT.has(action)) return Math.min(count - 1, Math.floor(elapsed * fps));
    return Math.floor(elapsed * fps) % count;
  }

  function drawMuseum() {
    ctx.fillStyle = '#253342';
    ctx.fillRect(0, 0, 384, 256);
    ctx.fillStyle = '#394858';
    ctx.fillRect(0, 0, 384, 67);
    ctx.fillStyle = '#17222c';
    ctx.fillRect(0, 63, 384, 4);

    for (const x of [34, 124, 214, 304]) {
      ctx.fillStyle = '#161b22';
      ctx.fillRect(x, 10, 48, 42);
      ctx.fillStyle = '#a5773d';
      ctx.fillRect(x + 3, 13, 42, 36);
      ctx.fillStyle = '#d1c3a6';
      ctx.fillRect(x + 7, 17, 34, 28);
      ctx.fillStyle = '#6c7a78';
      ctx.fillRect(x + 14, 22, 20, 17);
    }

    ctx.fillStyle = '#9b856f';
    ctx.fillRect(0, 67, 384, 189);
    for (let y = 73; y < 256; y += 18) {
      ctx.fillStyle = '#ad9780';
      ctx.fillRect(0, y, 384, 1);
    }
    for (let x = 0; x < 384; x += 36) {
      ctx.fillStyle = '#8c7866';
      ctx.fillRect(x, 67, 1, 189);
    }

    ctx.fillStyle = '#563d34';
    ctx.fillRect(102, 92, 180, 96);
    ctx.fillStyle = '#84584b';
    ctx.fillRect(108, 98, 168, 84);
    ctx.fillStyle = '#c39961';
    ctx.fillRect(116, 106, 152, 68);
    ctx.fillStyle = '#76514a';
    ctx.fillRect(124, 114, 136, 52);

    ctx.fillStyle = '#59473b';
    ctx.fillRect(14, 78, 58, 36);
    ctx.fillRect(312, 78, 58, 36);
    ctx.fillStyle = '#b89c75';
    ctx.fillRect(20, 84, 46, 24);
    ctx.fillRect(318, 84, 46, 24);
  }

  function draw(now) {
    drawMuseum();

    ctx.fillStyle = '#11182066';
    ctx.beginPath();
    ctx.ellipse(Math.round(state.x), Math.round(state.y + 10), 22, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    const index = state.fallen ? Math.max(0, sprite.count('fall', state.actionDir) - 1) : frameIndex(now);
    const frame = sprite.frame(state.action, state.actionDir, index);
    if (frame) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(frame, Math.round(state.x - 54), Math.round(state.y - 108), 108, 108);
      ctx.restore();
    }

    directionLabel.textContent = state.dir.toUpperCase();
    const exactWalk = state.run || !state.moving || sprite.has('walk', state.dir);
    frameLabel.textContent = state.moving && !state.run && !exactWalk
      ? 'No walk row in source · using facing frame'
      : `${state.action.toUpperCase()} · frame ${index + 1}/${Math.max(1, sprite.count(state.action, state.actionDir))}`;
  }

  function loop(now) {
    const dt = Math.min(0.05, (now - state.last) / 1000);
    state.last = now;
    update(dt, now);
    draw(now);
    requestAnimationFrame(loop);
  }

  let joyPointer = null;
  const joy = document.getElementById('joystick');
  const knob = document.getElementById('joyKnob');

  function joyMove(event) {
    const r = joy.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const dx = event.clientX - cx;
    const dy = event.clientY - cy;
    const max = 34;
    const mag = Math.hypot(dx, dy) || 1;
    const scale = Math.min(1, max / mag);
    const px = dx * scale;
    const py = dy * scale;
    knob.style.transform = `translate(${px}px,${py}px)`;
    state.joyX = px / max;
    state.joyY = py / max;
  }

  joy.addEventListener('pointerdown', (event) => {
    joyPointer = event.pointerId;
    joy.setPointerCapture(event.pointerId);
    joyMove(event);
  });
  joy.addEventListener('pointermove', (event) => {
    if (event.pointerId === joyPointer) joyMove(event);
  });
  function endJoy(event) {
    if (event.pointerId !== joyPointer) return;
    joyPointer = null;
    state.joyX = 0;
    state.joyY = 0;
    knob.style.transform = 'translate(0,0)';
  }
  joy.addEventListener('pointerup', endJoy);
  joy.addEventListener('pointercancel', endJoy);

  document.querySelectorAll('[data-action]').forEach((button) => {
    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      perform(button.dataset.action);
    });
  });

  const runBtn = document.getElementById('runBtn');
  function setRun(value) {
    state.run = value;
    runBtn.classList.toggle('active', value);
  }
  runBtn.addEventListener('pointerdown', (event) => { event.preventDefault(); setRun(true); });
  runBtn.addEventListener('pointerup', () => setRun(false));
  runBtn.addEventListener('pointercancel', () => setRun(false));
  runBtn.addEventListener('pointerleave', () => setRun(false));

  const keys = new Set();
  addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    keys.add(key);
    if (['arrowup','arrowdown','arrowleft','arrowright','shift'].includes(key)) event.preventDefault();
    if (key === 'j') perform('punch');
    if (key === 'k') perform('kick');
    if (key === 'l') perform('fall');
    if (key === 'shift') setRun(true);
  });
  addEventListener('keyup', (event) => {
    keys.delete(event.key.toLowerCase());
    if (event.key === 'Shift') setRun(false);
  });

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
    sprite = await window.MuseumGuardSprite.ready;
    if (sprite.data.width !== 36 || sprite.data.height !== 36) throw new Error('Unexpected guard frame size.');
    actionLabel.textContent = 'IDLE';
    resize();
    addEventListener('resize', resize, { passive: true });
    window.visualViewport?.addEventListener('resize', resize, { passive: true });
    requestAnimationFrame(keyboardLoop);
    requestAnimationFrame(loop);
  } catch (error) {
    console.error(error);
    loadError.hidden = false;
    loadError.textContent = `Could not load coded guard sprite data: ${error.message}`;
    actionLabel.textContent = 'LOAD ERROR';
  }
})();
