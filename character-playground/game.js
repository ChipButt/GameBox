import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const stage = document.getElementById('stage');
const actionLabel = document.getElementById('actionLabel');
const loading = document.getElementById('loading');
const loadText = document.getElementById('loadText');
const loadBar = document.getElementById('loadBar');
const loadError = document.getElementById('loadError');
const clipCount = document.getElementById('clipCount');
const playingClip = document.getElementById('playingClip');
const animList = document.getElementById('animList');

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
stage.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xc8dbe8);
scene.fog = new THREE.Fog(0xc8dbe8, 8, 18);

const camera = new THREE.PerspectiveCamera(34, innerWidth / innerHeight, 0.1, 40);
camera.position.set(4.3, 3.0, 5.5);
camera.lookAt(0, 0.85, 0);

scene.add(new THREE.HemisphereLight(0xf1f8ff, 0x655e55, 2.25));
const sun = new THREE.DirectionalLight(0xffefd8, 3.25);
sun.position.set(-4.5, 7, 4.5);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -5;
sun.shadow.camera.right = 5;
sun.shadow.camera.top = 5;
sun.shadow.camera.bottom = -5;
scene.add(sun);

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(4.6, 64),
  new THREE.MeshStandardMaterial({ color: 0xc7ad8d, roughness: 0.94 })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const rug = new THREE.Mesh(
  new THREE.CircleGeometry(1.5, 48),
  new THREE.MeshStandardMaterial({ color: 0x8f2f3b, roughness: 0.92 })
);
rug.rotation.x = -Math.PI / 2;
rug.position.y = 0.006;
rug.receiveShadow = true;
scene.add(rug);

const rugInner = new THREE.Mesh(
  new THREE.RingGeometry(0.92, 1.18, 48),
  new THREE.MeshStandardMaterial({ color: 0xe2ba65, roughness: 0.9 })
);
rugInner.rotation.x = -Math.PI / 2;
rugInner.position.y = 0.012;
scene.add(rugInner);

function addCrate(x, z, s = 0.55) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(s, s, s),
    new THREE.MeshStandardMaterial({ color: 0x8e6547, roughness: 0.94 })
  );
  mesh.position.set(x, s / 2, z);
  mesh.rotation.y = (x + z) * 0.37;
  mesh.castShadow = mesh.receiveShadow = true;
  scene.add(mesh);
}
addCrate(-2.55, -1.5, .62);
addCrate(2.55, -1.35, .52);
addCrate(2.85, -1.65, .38);

const loader = new GLTFLoader();
const MODEL_URL = '../shared/asset-pool/quaternius/ultimate-animated-character/Elf.gltf?v=2';

let root = null;
let mixer = null;
let clips = [];
let activeAction = null;
let activeClip = '';
let manualUntil = 0;
let originalColours = new Map();
let currentPreset = 'christmas';

const movement = { x: 0, y: 0, pointer: null };
const keys = new Set();
const clock = new THREE.Clock();

function materials() {
  const out = [];
  root?.traverse(o => {
    if (!o.isMesh) return;
    const list = Array.isArray(o.material) ? o.material : [o.material];
    list.forEach(m => m && out.push(m));
  });
  return out;
}

function rememberMaterials() {
  originalColours.clear();
  materials().forEach(m => {
    if (m.color && !originalColours.has(m.uuid)) originalColours.set(m.uuid, m.color.clone());
  });
}

function restoreOriginal() {
  materials().forEach(m => {
    const c = originalColours.get(m.uuid);
    if (c && m.color) m.color.copy(c);
  });
}

function semanticMatches(material, category) {
  const n = String(material?.name || '').toLowerCase();
  if (category === 'hat') return /hat/.test(n);
  if (category === 'clothes') return /(cloth|clothes|shirt|jacket|top|body)/.test(n) && !/(skin|face)/.test(n);
  if (category === 'trim') return /(fur|trim|white)/.test(n);
  if (category === 'gold') return /(gold|button|buckle)/.test(n);
  if (category === 'skin') return /(skin|face|head)/.test(n);
  return false;
}

function setCategory(category, value) {
  const colour = new THREE.Color(value);
  materials().forEach(m => {
    if (m.color && semanticMatches(m, category)) m.color.copy(colour);
  });
}

function applyChristmasColours() {
  restoreOriginal();
  setCategory('hat', document.getElementById('colourHat').value);
  setCategory('clothes', document.getElementById('colourClothes').value);
  setCategory('trim', document.getElementById('colourTrim').value);
  setCategory('gold', document.getElementById('colourGold').value);
  setCategory('skin', document.getElementById('colourSkin').value);
}

function setPreset(kind) {
  currentPreset = kind;
  document.querySelectorAll('[data-preset]').forEach(b => b.classList.toggle('active', b.dataset.preset === kind));
  if (!root) return;
  if (kind === 'original') restoreOriginal();
  else applyChristmasColours();
}

function prepModel(model) {
  model.traverse(o => {
    if (!o.isMesh) return;
    o.castShadow = true;
    o.receiveShadow = true;
    const source = Array.isArray(o.material) ? o.material : [o.material];
    const cloned = source.map(m => m.clone());
    o.material = Array.isArray(o.material) ? cloned : cloned[0];
  });

  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  box.getSize(size);
  if (size.y > 0) model.scale.setScalar(1.72 / size.y);

  const box2 = new THREE.Box3().setFromObject(model);
  model.position.y -= box2.min.y;
}

function findClip(name) {
  const lower = name.toLowerCase();
  return clips.find(c => c.name.toLowerCase() === lower)
    || clips.find(c => c.name.toLowerCase().includes(lower));
}

function chooseClip(patterns) {
  for (const p of patterns) {
    const found = clips.find(c => p.test(c.name));
    if (found) return found;
  }
  return clips[0] || null;
}

function playClip(clipOrName, { manual = false } = {}) {
  if (!mixer) return;
  const clip = typeof clipOrName === 'string' ? findClip(clipOrName) : clipOrName;
  if (!clip) return;

  if (activeClip === clip.name && activeAction) {
    if (manual) manualUntil = performance.now() + Math.min(5000, Math.max(1500, clip.duration * 1000));
    return;
  }

  const next = mixer.clipAction(clip);
  next.reset().enabled = true;
  const loops = /idle|walk|run/i.test(clip.name);
  next.setLoop(loops ? THREE.LoopRepeat : THREE.LoopOnce, loops ? Infinity : 1);
  next.clampWhenFinished = !loops;
  next.fadeIn(0.14).play();

  if (activeAction && activeAction !== next) activeAction.fadeOut(0.14);
  activeAction = next;
  activeClip = clip.name;
  if (manual) manualUntil = performance.now() + Math.min(5000, Math.max(1500, clip.duration * 1000));

  playingClip.textContent = clip.name;
  actionLabel.textContent = clip.name.toUpperCase();
  document.querySelectorAll('.animList button,[data-quick]').forEach(b => {
    const requested = b.dataset.clip || b.dataset.quick || '';
    b.classList.toggle('active', clip.name.toLowerCase() === requested.toLowerCase());
  });
}

function buildAnimationList() {
  animList.innerHTML = '';
  clipCount.textContent = clips.length;
  clips
    .slice()
    .sort((a,b) => a.name.localeCompare(b.name))
    .forEach(clip => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = clip.name;
      b.dataset.clip = clip.name;
      b.addEventListener('click', () => playClip(clip, { manual: true }));
      animList.appendChild(b);
    });
}

function autoAnimation(movingNow) {
  if (performance.now() < manualUntil) return;
  const clip = movingNow
    ? chooseClip([/^walk$/i, /walk/i, /^run$/i, /run/i])
    : chooseClip([/^idle$/i, /idle/i]);
  if (clip) playClip(clip);
}

function resize() {
  const vv = window.visualViewport;
  const w = Math.max(1, Math.round(vv?.width || innerWidth));
  const h = Math.max(1, Math.round(vv?.height || innerHeight));
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.fov = w < 720 ? 42 : 34;
  camera.updateProjectionMatrix();
}

function updateCharacter(dt) {
  if (!root) return;
  let x = movement.x;
  let y = movement.y;
  const mag = Math.hypot(x, y);
  const movingNow = mag > 0.12;

  if (movingNow) {
    x /= mag;
    y /= mag;
    const speed = 1.55;
    root.position.x = THREE.MathUtils.clamp(root.position.x + x * speed * dt, -2.25, 2.25);
    root.position.z = THREE.MathUtils.clamp(root.position.z + y * speed * dt, -1.55, 1.7);

    const targetYaw = Math.atan2(x, y);
    let diff = targetYaw - root.rotation.y;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    root.rotation.y += diff * Math.min(1, dt * 10);
    manualUntil = 0;
  }

  autoAnimation(movingNow);
}

function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), .04);
  updateCharacter(dt);
  if (mixer) mixer.update(dt);
  renderer.render(scene, camera);
}

loader.load(
  MODEL_URL,
  gltf => {
    root = gltf.scene;
    prepModel(root);
    scene.add(root);
    rememberMaterials();

    clips = gltf.animations || [];
    mixer = new THREE.AnimationMixer(root);
    buildAnimationList();
    setPreset('christmas');

    const idle = chooseClip([/^idle$/i, /idle/i]);
    if (idle) playClip(idle);

    document.getElementById('modelBadge').textContent = 'Quaternius Elf · 3D · ' + clips.length + ' embedded animations · GameBox Asset Pool';
    loadBar.style.width = '100%';
    loading.classList.add('hide');
  },
  xhr => {
    if (xhr.total) {
      const pct = Math.max(15, Math.round(xhr.loaded / xhr.total * 100));
      loadBar.style.width = pct + '%';
      loadText.textContent = 'Loading 3D Elf… ' + pct + '%';
    }
  },
  error => {
    console.error(error);
    loading.classList.add('hide');
    loadError.hidden = false;
    loadError.textContent = 'The 3D Quaternius Elf could not be loaded from the GameBox asset pool. ' + (error?.message || '');
    actionLabel.textContent = 'LOAD ERROR';
  }
);

const joystick = document.getElementById('joystick');
const joyKnob = document.getElementById('joyKnob');

function moveJoystick(event) {
  const r = joystick.getBoundingClientRect();
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2 - 8;
  const dx = event.clientX - cx;
  const dy = event.clientY - cy;
  const max = 34;
  const mag = Math.hypot(dx, dy) || 1;
  const k = Math.min(1, max / mag);
  const px = dx * k;
  const py = dy * k;
  joyKnob.style.transform = 'translate(' + px + 'px,' + py + 'px)';
  movement.x = px / max;
  movement.y = py / max;
}

joystick.addEventListener('pointerdown', e => {
  movement.pointer = e.pointerId;
  joystick.setPointerCapture(e.pointerId);
  moveJoystick(e);
});
joystick.addEventListener('pointermove', e => {
  if (e.pointerId === movement.pointer) moveJoystick(e);
});
function releaseJoystick(e) {
  if (e.pointerId !== movement.pointer) return;
  movement.pointer = null;
  movement.x = 0;
  movement.y = 0;
  joyKnob.style.transform = 'translate(0,0)';
}
joystick.addEventListener('pointerup', releaseJoystick);
joystick.addEventListener('pointercancel', releaseJoystick);

addEventListener('keydown', e => {
  const key = e.key.toLowerCase();
  if (['arrowup','arrowdown','arrowleft','arrowright','w','a','s','d'].includes(key)) {
    keys.add(key);
    e.preventDefault();
  }
});
addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));

function keyboardFrame() {
  if (movement.pointer === null) {
    let x = 0, y = 0;
    if (keys.has('arrowleft') || keys.has('a')) x -= 1;
    if (keys.has('arrowright') || keys.has('d')) x += 1;
    if (keys.has('arrowup') || keys.has('w')) y -= 1;
    if (keys.has('arrowdown') || keys.has('s')) y += 1;
    movement.x = x;
    movement.y = y;
  }
  requestAnimationFrame(keyboardFrame);
}

document.querySelectorAll('[data-preset]').forEach(b => b.addEventListener('click', () => setPreset(b.dataset.preset)));
for (const id of ['colourHat','colourClothes','colourTrim','colourGold','colourSkin']) {
  document.getElementById(id).addEventListener('input', () => {
    currentPreset = 'christmas';
    document.querySelectorAll('[data-preset]').forEach(b => b.classList.toggle('active', b.dataset.preset === 'christmas'));
    applyChristmasColours();
  });
}
document.querySelectorAll('[data-quick]').forEach(b => b.addEventListener('click', () => playClip(b.dataset.quick, { manual: true })));

const colourPanel = document.getElementById('colourPanel');
const animPanel = document.getElementById('animPanel');
function togglePanel(panel) {
  const next = panel.hidden;
  colourPanel.hidden = true;
  animPanel.hidden = true;
  panel.hidden = !next;
}
document.getElementById('colourBtn').addEventListener('click', () => togglePanel(colourPanel));
document.getElementById('animBtn').addEventListener('click', () => togglePanel(animPanel));
document.getElementById('closeColours').addEventListener('click', () => colourPanel.hidden = true);
document.getElementById('closeAnims').addEventListener('click', () => animPanel.hidden = true);

addEventListener('resize', resize, { passive: true });
window.visualViewport?.addEventListener('resize', resize, { passive: true });
document.addEventListener('gesturestart', e => e.preventDefault(), { passive: false });
document.addEventListener('gesturechange', e => e.preventDefault(), { passive: false });
document.addEventListener('gestureend', e => e.preventDefault(), { passive: false });

resize();
requestAnimationFrame(keyboardFrame);
frame();
