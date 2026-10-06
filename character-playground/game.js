import * as THREE from 'three';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/FBXLoader.js';
import { CHARACTER_CATALOG, CHARACTER_GROUPS } from './character-catalog.js?v=1';

const $ = (id) => document.getElementById(id);
const stage = $('stage');
const loading = $('loading');
const loadText = $('loadText');
const loadBar = $('loadBar');
const modelLoading = $('modelLoading');
const loadError = $('loadError');
const toast = $('toast');
const modelMeta = $('modelMeta');
const selectedGroup = $('selectedGroup');
const selectedModel = $('selectedModel');
const characterName = $('characterName');
const styleSearch = $('styleSearch');
const styleCount = $('styleCount');
const filterRow = $('filterRow');
const styleGrid = $('styleGrid');
const materialCount = $('materialCount');
const materialList = $('materialList');
const clipCount = $('clipCount');
const poseGrid = $('poseGrid');
const animSpeed = $('animSpeed');
const animSpeedValue = $('animSpeedValue');
const turntableToggle = $('turntableToggle');
const summaryName = $('summaryName');
const summaryStyle = $('summaryStyle');
const summaryPalette = $('summaryPalette');
const summaryPose = $('summaryPose');

if (CHARACTER_CATALOG.length !== 52) {
  throw new Error('Character catalog must expose all 52 GameBox character assets.');
}

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: false,
  powerPreference: 'high-performance'
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
stage.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xdbe8ed);
scene.fog = new THREE.Fog(0xdbe8ed, 9, 20);

const camera = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, 0.1, 50);
const previewRoot = new THREE.Group();
const characterHolder = new THREE.Group();
const decorRoot = new THREE.Group();
previewRoot.add(decorRoot, characterHolder);
scene.add(previewRoot);

scene.add(new THREE.HemisphereLight(0xf4fbff, 0x6f6358, 2.45));
const keyLight = new THREE.DirectionalLight(0xffefd4, 3.4);
keyLight.position.set(-4.5, 7.5, 5.2);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(1024, 1024);
keyLight.shadow.camera.left = -5;
keyLight.shadow.camera.right = 5;
keyLight.shadow.camera.top = 6;
keyLight.shadow.camera.bottom = -2;
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0x9fd6ff, 1.5);
rimLight.position.set(5, 3.5, -4);
scene.add(rimLight);

const platformBase = new THREE.Mesh(
  new THREE.CylinderGeometry(1.55, 1.72, 0.24, 64),
  new THREE.MeshStandardMaterial({ color: 0x173c58, roughness: 0.72, metalness: 0.03 })
);
platformBase.position.y = 0.12;
platformBase.castShadow = true;
platformBase.receiveShadow = true;
previewRoot.add(platformBase);

const platformTop = new THREE.Mesh(
  new THREE.CylinderGeometry(1.43, 1.43, 0.055, 64),
  new THREE.MeshStandardMaterial({ color: 0xefe5ce, roughness: 0.92 })
);
platformTop.position.y = 0.267;
platformTop.receiveShadow = true;
previewRoot.add(platformTop);

const platformRing = new THREE.Mesh(
  new THREE.TorusGeometry(1.46, 0.035, 10, 64),
  new THREE.MeshStandardMaterial({ color: 0xf0c653, roughness: 0.5, metalness: 0.18 })
);
platformRing.rotation.x = Math.PI / 2;
platformRing.position.y = 0.295;
previewRoot.add(platformRing);

const snowMat = new THREE.MeshStandardMaterial({ color: 0xf3f7f7, roughness: 1 });
const snowFloor = new THREE.Mesh(new THREE.CircleGeometry(7.5, 80), snowMat);
snowFloor.rotation.x = -Math.PI / 2;
snowFloor.position.y = -0.015;
snowFloor.receiveShadow = true;
scene.add(snowFloor);

const snowGeo = new THREE.BufferGeometry();
const snowPositions = [];
for (let i = 0; i < 190; i += 1) {
  snowPositions.push(
    (Math.random() - 0.5) * 17,
    Math.random() * 8.5 + 0.2,
    (Math.random() - 0.5) * 11 - 1
  );
}
snowGeo.setAttribute('position', new THREE.Float32BufferAttribute(snowPositions, 3));
const snowPoints = new THREE.Points(
  snowGeo,
  new THREE.PointsMaterial({ color: 0xffffff, size: 0.035, transparent: true, opacity: 0.72, depthWrite: false })
);
scene.add(snowPoints);

const gltfLoader = new GLTFLoader();
const fbxLoader = new FBXLoader();
const clock = new THREE.Clock();

let currentEntry = CHARACTER_CATALOG.find((entry) => entry.id === 'Elf');
let currentModel = null;
let mixer = null;
let clips = [];
let activeAction = null;
let activeClipName = '';
let materialRecords = [];
let loadGeneration = 0;
let initialLoad = true;
let currentFilter = 'All';
let currentPalette = 'christmas';
let viewDistance = 5.15;
let toastTimer = 0;
let pendingSavedColors = null;
let pendingPose = null;

const STORAGE_KEY = 'gamebox.characterBuilder.v1';
const SESSION_KEY = 'gamebox.characterBuilder.current';

const paletteSchemes = {
  christmas: ['#2f744d', '#b83d49', '#f4ecdc', '#d4aa43', '#22313d'],
  frost: ['#4b89b3', '#9bc6dc', '#eef7f8', '#d3e6ed', '#344d67'],
  candy: ['#c84058', '#f17b91', '#fff3e9', '#66a98e', '#e4bd58'],
  midnight: ['#172b49', '#31527c', '#e9d9a0', '#b8873a', '#101720'],
  forest: ['#254d35', '#49775b', '#c9b986', '#794b34', '#d7d0b0']
};

const nameStarts = ['Jingle', 'Holly', 'Pip', 'Tinker', 'Juniper', 'Merry', 'Rowan', 'Ember', 'Noelle', 'Sprig', 'Robin', 'Poppy', 'Finn', 'Milo', 'Ivy', 'Nico'];
const nameEnds = ['Bell', 'Frost', 'Pine', 'Spark', 'Snow', 'Vale', 'Wren', 'Berry', 'Star', 'Moss', 'Fox', 'Glow'];

function randomName() {
  const first = nameStarts[Math.floor(Math.random() * nameStarts.length)];
  const last = nameEnds[Math.floor(Math.random() * nameEnds.length)];
  return first + ' ' + last;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 1900);
}

function humanPalette(name) {
  if (!name) return 'Original';
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function cleanMaterialName(name, index) {
  const raw = String(name || '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!raw || /^material(\.\d+)?$/i.test(raw)) return 'Material ' + (index + 1);
  return raw.replace(/\bmaterial\b/ig, '').trim() || ('Material ' + (index + 1));
}

function colourHex(material) {
  return material && material.color ? '#' + material.color.getHexString() : '#ffffff';
}

function looksLikeSkin(record) {
  const name = record.name.toLowerCase();
  if (/skin|face|flesh/.test(name)) return true;
  const color = record.originalColor;
  if (!color) return false;
  const c = new THREE.Color(color);
  const max = Math.max(c.r, c.g, c.b);
  const min = Math.min(c.r, c.g, c.b);
  return c.r > c.g * 1.05 && c.g >= c.b * 0.72 && c.r > 0.46 && max - min > 0.08;
}

function looksLikeHair(record) {
  return /hair|beard|brow|mustache|moustache/.test(record.name.toLowerCase());
}

function looksLikeEye(record) {
  return /eye|pupil|iris/.test(record.name.toLowerCase());
}

function disposeObject(object) {
  if (!object) return;
  object.traverse((node) => {
    if (node.geometry && node.geometry.dispose) node.geometry.dispose();
    if (!node.material) return;
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.forEach((material) => {
      if (!material) return;
      Object.values(material).forEach((value) => {
        if (value && value.isTexture && value.dispose) value.dispose();
      });
      if (material.dispose) material.dispose();
    });
  });
}

function fitModel(model) {
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  box.getSize(size);
  const fitDimension = Math.max(size.y, size.x * 0.92, size.z * 0.92);
  if (fitDimension > 0) model.scale.setScalar(2.15 / fitDimension);
  model.updateMatrixWorld(true);

  const fitted = new THREE.Box3().setFromObject(model);
  const center = new THREE.Vector3();
  fitted.getCenter(center);
  model.position.x -= center.x;
  model.position.z -= center.z;
  model.position.y += 0.31 - fitted.min.y;
  model.updateMatrixWorld(true);
}

function prepareModel(model) {
  const materialCloneMap = new Map();
  model.traverse((node) => {
    if (!node.isMesh) return;
    node.castShadow = true;
    node.receiveShadow = true;

    const sourceMaterials = Array.isArray(node.material) ? node.material : [node.material];
    const clones = sourceMaterials.map((source) => {
      if (!source) return source;
      if (!materialCloneMap.has(source.uuid)) materialCloneMap.set(source.uuid, source.clone());
      return materialCloneMap.get(source.uuid);
    });
    node.material = Array.isArray(node.material) ? clones : clones[0];
  });

  materialRecords = Array.from(materialCloneMap.values())
    .filter((material) => material && material.color)
    .map((material, index) => ({
      material,
      index,
      name: cleanMaterialName(material.name, index),
      key: (cleanMaterialName(material.name, index) + '::' + index).toLowerCase(),
      originalColor: colourHex(material)
    }));

  fitModel(model);
}

function restoreOriginalMaterials() {
  materialRecords.forEach((record) => {
    record.material.color.set(record.originalColor);
  });
}

function refreshPaletteButtons() {
  document.querySelectorAll('[data-palette]').forEach((button) => {
    button.classList.toggle('active', button.dataset.palette === currentPalette);
  });
}

function applyPalette(name, render = true) {
  currentPalette = name;
  restoreOriginalMaterials();

  if (name !== 'original' && name !== 'custom') {
    const scheme = paletteSchemes[name] || paletteSchemes.christmas;
    let colourIndex = 0;
    materialRecords.forEach((record) => {
      if (looksLikeSkin(record) || looksLikeHair(record) || looksLikeEye(record)) return;
      record.material.color.set(scheme[colourIndex % scheme.length]);
      colourIndex += 1;
    });
  }

  refreshPaletteButtons();
  if (render) renderMaterialControls();
  updateSummary();
}

function applySavedColors(colors) {
  if (!colors || typeof colors !== 'object') return false;
  let applied = 0;
  materialRecords.forEach((record) => {
    const value = colors[record.key];
    if (typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)) {
      record.material.color.set(value);
      applied += 1;
    }
  });
  if (applied) {
    currentPalette = 'custom';
    refreshPaletteButtons();
    renderMaterialControls();
    updateSummary();
    return true;
  }
  return false;
}

function renderMaterialControls() {
  materialList.innerHTML = '';
  materialCount.textContent = materialRecords.length + (materialRecords.length === 1 ? ' material' : ' materials');

  if (!materialRecords.length) {
    materialList.innerHTML = '<p class="helperCopy">This model does not expose tintable materials.</p>';
    return;
  }

  materialRecords.forEach((record) => {
    const row = document.createElement('div');
    row.className = 'materialRow';

    const text = document.createElement('div');
    const title = document.createElement('strong');
    const subtitle = document.createElement('small');
    title.textContent = record.name;
    subtitle.textContent = looksLikeSkin(record) ? 'Skin / face' : looksLikeHair(record) ? 'Hair detail' : looksLikeEye(record) ? 'Eye detail' : 'Model material';
    text.append(title, subtitle);

    const input = document.createElement('input');
    input.type = 'color';
    input.value = colourHex(record.material);
    input.setAttribute('aria-label', 'Colour for ' + record.name);
    input.addEventListener('input', () => {
      record.material.color.set(input.value);
      currentPalette = 'custom';
      refreshPaletteButtons();
      updateSummary();
    });

    const reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'materialReset';
    reset.textContent = '↺';
    reset.setAttribute('aria-label', 'Reset ' + record.name);
    reset.addEventListener('click', () => {
      record.material.color.set(record.originalColor);
      input.value = record.originalColor;
      currentPalette = 'custom';
      refreshPaletteButtons();
      updateSummary();
    });

    row.append(text, input, reset);
    materialList.appendChild(row);
  });
}

function clipScore(name) {
  const n = name.toLowerCase();
  const order = ['idle', 'walk', 'run', 'jump', 'wave', 'victory', 'dance', 'attack', 'kick', 'punch', 'sit'];
  const index = order.findIndex((term) => n === term || n.includes(term));
  return index < 0 ? 100 : index;
}

function findIdleClip() {
  return clips.find((clip) => /^idle$/i.test(clip.name))
    || clips.find((clip) => /idle/i.test(clip.name))
    || clips[0]
    || null;
}

function findClipByName(name) {
  if (!name) return null;
  return clips.find((clip) => clip.name.toLowerCase() === String(name).toLowerCase())
    || clips.find((clip) => clip.name.toLowerCase().includes(String(name).toLowerCase()))
    || null;
}

function playClip(clipOrName, userSelected = true) {
  if (!mixer || !clips.length) return;
  const clip = typeof clipOrName === 'string' ? findClipByName(clipOrName) : clipOrName;
  if (!clip) return;

  const next = mixer.clipAction(clip);
  const looping = /idle|walk|run/i.test(clip.name);
  next.reset();
  next.enabled = true;
  next.setEffectiveWeight(1);
  next.setLoop(looping ? THREE.LoopRepeat : THREE.LoopOnce, looping ? Infinity : 1);
  next.clampWhenFinished = !looping;
  next.fadeIn(0.14).play();

  if (activeAction && activeAction !== next) activeAction.fadeOut(0.14);
  activeAction = next;
  activeClipName = clip.name;
  if (userSelected) pendingPose = null;

  document.querySelectorAll('.poseBtn').forEach((button) => {
    button.classList.toggle('active', button.dataset.clip === clip.name);
  });
  updateSummary();
}

function renderPoseControls() {
  poseGrid.innerHTML = '';
  clipCount.textContent = clips.length + (clips.length === 1 ? ' clip' : ' clips');

  const ordered = clips.slice().sort((a, b) => {
    const scoreDiff = clipScore(a.name) - clipScore(b.name);
    return scoreDiff || a.name.localeCompare(b.name);
  });

  ordered.forEach((clip) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'poseBtn';
    button.dataset.clip = clip.name;
    button.textContent = clip.name || 'Unnamed clip';
    button.title = clip.name;
    button.addEventListener('click', () => playClip(clip));
    poseGrid.appendChild(button);
  });

  if (!ordered.length) poseGrid.innerHTML = '<p class="helperCopy">No embedded animation clips found on this style.</p>';
}

function snapshotMaterialColors() {
  const colors = {};
  materialRecords.forEach((record) => {
    colors[record.key] = colourHex(record.material);
  });
  return colors;
}

function buildPayload() {
  return {
    version: 1,
    name: (characterName.value || 'Unnamed Character').trim().slice(0, 24),
    modelId: currentEntry.id,
    modelLabel: currentEntry.label,
    modelPath: currentEntry.path.replace('../', ''),
    group: currentEntry.group,
    variant: currentEntry.variant,
    palette: currentPalette,
    materialColors: snapshotMaterialColors(),
    pose: activeClipName || '',
    animationSpeed: Number(animSpeed.value),
    turntable: Boolean(turntableToggle.checked),
    source: 'GameBox Character Workshop',
    updatedAt: new Date().toISOString()
  };
}

function updateSummary() {
  if (!currentEntry) return;
  const name = (characterName.value || 'Unnamed Character').trim() || 'Unnamed Character';
  summaryName.textContent = name;
  summaryStyle.textContent = currentEntry.label;
  summaryPalette.textContent = humanPalette(currentPalette);
  summaryPose.textContent = activeClipName || '—';
  selectedGroup.textContent = currentEntry.group + ' · ' + currentEntry.variant;
  selectedModel.textContent = currentEntry.label;
  modelMeta.textContent = (currentEntry.index + 1) + ' of ' + CHARACTER_CATALOG.length + ' styles · ' + clips.length + ' clips';
}

function saveCharacter(showMessage = true) {
  const payload = buildPayload();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload));
  if (showMessage) showToast('Character saved on this device.');
  return payload;
}

async function loadSavedCharacter() {
  let saved = null;
  try {
    saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  } catch (_) {
    saved = null;
  }

  if (!saved || !CHARACTER_CATALOG.some((entry) => entry.id === saved.modelId)) {
    showToast('No saved GameBox character yet.');
    return false;
  }

  characterName.value = saved.name || 'Unnamed Character';
  animSpeed.value = String(Number(saved.animationSpeed) || 1);
  animSpeedValue.textContent = Number(animSpeed.value).toFixed(1) + '×';
  turntableToggle.checked = Boolean(saved.turntable);
  currentPalette = saved.palette || 'original';
  pendingSavedColors = saved.materialColors || null;
  pendingPose = saved.pose || null;

  await selectStyle(saved.modelId, { preservePalette: true });
  showToast('Saved character loaded.');
  return true;
}

function useCharacter() {
  const payload = saveCharacter(false);
  window.dispatchEvent(new CustomEvent('gamebox-character-ready', { detail: payload }));
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ type: 'gamebox-character-ready', character: payload }, window.location.origin);
  }
  showToast('Character ready for GameBox.');
}

async function copyBuildJson() {
  const json = JSON.stringify(buildPayload(), null, 2);
  try {
    await navigator.clipboard.writeText(json);
    showToast('Build JSON copied.');
  } catch (_) {
    const area = document.createElement('textarea');
    area.value = json;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    area.remove();
    showToast('Build JSON copied.');
  }
}

function renderFilters() {
  filterRow.innerHTML = '';
  CHARACTER_GROUPS.forEach((group) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'filterChip' + (group === currentFilter ? ' active' : '');
    button.textContent = group.toUpperCase();
    button.addEventListener('click', () => {
      currentFilter = group;
      renderFilters();
      renderStyleGrid();
    });
    filterRow.appendChild(button);
  });
}

function renderStyleGrid() {
  const query = styleSearch.value.trim().toLowerCase();
  const filtered = CHARACTER_CATALOG.filter((entry) => {
    const groupMatch = currentFilter === 'All' || entry.group === currentFilter;
    const searchMatch = !query || [entry.label, entry.id, entry.group, entry.variant].join(' ').toLowerCase().includes(query);
    return groupMatch && searchMatch;
  });

  styleCount.textContent = filtered.length + ' / ' + CHARACTER_CATALOG.length;
  styleGrid.innerHTML = '';

  filtered.forEach((entry) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'styleCard' + (entry.id === currentEntry.id ? ' selected' : '');
    button.dataset.model = entry.id;

    const title = document.createElement('strong');
    title.textContent = entry.label;
    const meta = document.createElement('span');
    meta.textContent = entry.group;
    const index = document.createElement('i');
    index.textContent = String(entry.index + 1).padStart(2, '0') + '/52';
    button.append(title, meta, index);

    button.addEventListener('click', () => selectStyle(entry.id));
    styleGrid.appendChild(button);
  });
}

function setActiveTab(name) {
  document.querySelectorAll('.tabBtn').forEach((button) => {
    button.classList.toggle('active', button.dataset.tab === name);
  });
  document.querySelectorAll('.tabView').forEach((view) => {
    view.classList.toggle('active', view.dataset.view === name);
  });
}

function updateLoadingProgress(event) {
  if (!event || !event.total) return;
  const value = Math.min(96, Math.max(8, (event.loaded / event.total) * 100));
  loadBar.style.width = value.toFixed(1) + '%';
}

function finishInitialLoad() {
  if (!initialLoad) return;
  initialLoad = false;
  loadBar.style.width = '100%';
  setTimeout(() => loading.classList.add('hide'), 120);
  setTimeout(() => { loading.style.display = 'none'; }, 480);
}

function showLoadError(error) {
  console.error(error);
  modelLoading.hidden = true;
  loadError.hidden = false;
  loadError.textContent = 'This character style could not be loaded. The previous style has been kept. ' + (error && error.message ? error.message : '');
  setTimeout(() => { loadError.hidden = true; }, 5200);
}

function loadDecorAsset(path, x, z, targetHeight, rotation = 0) {
  fbxLoader.load(path, (object) => {
    object.traverse((node) => {
      if (!node.isMesh) return;
      node.castShadow = true;
      node.receiveShadow = true;
    });

    const box = new THREE.Box3().setFromObject(object);
    const size = new THREE.Vector3();
    box.getSize(size);
    if (size.y > 0) object.scale.setScalar(targetHeight / size.y);
    object.updateMatrixWorld(true);

    const fitted = new THREE.Box3().setFromObject(object);
    object.position.set(x, -fitted.min.y, z);
    object.rotation.y = rotation;
    decorRoot.add(object);
  }, undefined, () => {});
}

function buildWorkshopDecor() {
  loadDecorAsset('../shared/asset-pool/quaternius/ultimate-nature/PineTree_Snow_2.fbx', -3.4, -2.8, 3.6, 0.25);
  loadDecorAsset('../shared/asset-pool/quaternius/ultimate-nature/PineTree_Snow_4.fbx', 3.3, -3.2, 3.1, -0.35);
  loadDecorAsset('../shared/asset-pool/quaternius/ultimate-nature/Rock_Snow_2.fbx', -2.7, -0.8, 0.85, 0.4);
  loadDecorAsset('../shared/asset-pool/quaternius/ultimate-nature/WoodLog_Snow.fbx', 2.6, -1.1, 0.55, -0.55);
}

async function selectStyle(id, options = {}) {
  const entry = CHARACTER_CATALOG.find((item) => item.id === id);
  if (!entry) return false;

  const generation = ++loadGeneration;
  const oldEntry = currentEntry;
  currentEntry = entry;
  renderStyleGrid();
  updateSummary();

  if (!initialLoad) modelLoading.hidden = false;
  loadError.hidden = true;
  if (initialLoad) {
    loadText.textContent = 'Loading ' + entry.label + ' from the shared 52-character asset pool.';
    loadBar.style.width = '10%';
  }

  return new Promise((resolve) => {
    gltfLoader.load(
      entry.path + '?v=1',
      (gltf) => {
        if (generation !== loadGeneration) {
          disposeObject(gltf.scene);
          resolve(false);
          return;
        }

        if (currentModel) {
          characterHolder.remove(currentModel);
          disposeObject(currentModel);
        }
        if (mixer) mixer.stopAllAction();

        currentModel = gltf.scene;
        prepareModel(currentModel);
        characterHolder.add(currentModel);

        clips = gltf.animations || [];
        mixer = new THREE.AnimationMixer(currentModel);
        mixer.timeScale = Number(animSpeed.value) || 1;
        activeAction = null;
        activeClipName = '';

        renderMaterialControls();
        renderPoseControls();

        const savedApplied = pendingSavedColors ? applySavedColors(pendingSavedColors) : false;
        pendingSavedColors = null;

        if (!savedApplied) {
          const desiredPalette = options.preservePalette ? currentPalette : currentPalette === 'custom' ? 'original' : currentPalette;
          applyPalette(desiredPalette || 'original');
        }

        const desiredPose = pendingPose ? findClipByName(pendingPose) : null;
        pendingPose = null;
        playClip(desiredPose || findIdleClip(), false);

        characterHolder.rotation.y = 0;
        modelLoading.hidden = true;
        finishInitialLoad();
        updateSummary();
        renderStyleGrid();
        resolve(true);
      },
      updateLoadingProgress,
      (error) => {
        if (generation !== loadGeneration) {
          resolve(false);
          return;
        }
        currentEntry = oldEntry || currentEntry;
        renderStyleGrid();
        updateSummary();
        showLoadError(error);
        if (initialLoad) {
          finishInitialLoad();
        }
        resolve(false);
      }
    );
  });
}

function resize() {
  const width = Math.max(1, window.innerWidth);
  const height = Math.max(1, window.innerHeight);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.fov = width <= 980 ? 39 : 35;
  camera.updateProjectionMatrix();

  const mobile = width <= 980;
  previewRoot.position.x = mobile ? 0 : -0.78;
  previewRoot.position.y = mobile ? 0.52 : 0;

  camera.position.set(previewRoot.position.x, mobile ? 1.72 : 1.64, viewDistance);
  camera.lookAt(previewRoot.position.x, mobile ? 1.02 : 1.16, 0);
}

function resetView() {
  characterHolder.rotation.set(0, 0, 0);
  viewDistance = 5.15;
  resize();
}

const pointerMap = new Map();
let lastSingleX = 0;
let lastPinchDistance = 0;

renderer.domElement.addEventListener('pointerdown', (event) => {
  pointerMap.set(event.pointerId, { x: event.clientX, y: event.clientY });
  renderer.domElement.setPointerCapture(event.pointerId);
  if (pointerMap.size === 1) lastSingleX = event.clientX;
  if (pointerMap.size === 2) {
    const values = Array.from(pointerMap.values());
    lastPinchDistance = Math.hypot(values[0].x - values[1].x, values[0].y - values[1].y);
  }
});

renderer.domElement.addEventListener('pointermove', (event) => {
  if (!pointerMap.has(event.pointerId)) return;
  pointerMap.set(event.pointerId, { x: event.clientX, y: event.clientY });

  if (pointerMap.size === 1) {
    const dx = event.clientX - lastSingleX;
    characterHolder.rotation.y += dx * 0.012;
    lastSingleX = event.clientX;
    return;
  }

  if (pointerMap.size === 2) {
    const values = Array.from(pointerMap.values());
    const distance = Math.hypot(values[0].x - values[1].x, values[0].y - values[1].y);
    if (lastPinchDistance) {
      viewDistance = THREE.MathUtils.clamp(viewDistance - (distance - lastPinchDistance) * 0.012, 3.35, 6.8);
      resize();
    }
    lastPinchDistance = distance;
  }
});

function releasePointer(event) {
  pointerMap.delete(event.pointerId);
  try { renderer.domElement.releasePointerCapture(event.pointerId); } catch (_) {}
  if (pointerMap.size < 2) lastPinchDistance = 0;
  if (pointerMap.size === 1) lastSingleX = Array.from(pointerMap.values())[0].x;
}
renderer.domElement.addEventListener('pointerup', releasePointer);
renderer.domElement.addEventListener('pointercancel', releasePointer);

renderer.domElement.addEventListener('wheel', (event) => {
  event.preventDefault();
  viewDistance = THREE.MathUtils.clamp(viewDistance + event.deltaY * 0.0045, 3.35, 6.8);
  resize();
}, { passive: false });

document.querySelectorAll('.tabBtn').forEach((button) => {
  button.addEventListener('click', () => setActiveTab(button.dataset.tab));
});

document.querySelectorAll('[data-palette]').forEach((button) => {
  button.addEventListener('click', () => applyPalette(button.dataset.palette));
});

styleSearch.addEventListener('input', renderStyleGrid);
characterName.addEventListener('input', updateSummary);

$('nameRollBtn').addEventListener('click', () => {
  characterName.value = randomName();
  updateSummary();
});

$('turnLeftBtn').addEventListener('click', () => { characterHolder.rotation.y -= Math.PI / 6; });
$('turnRightBtn').addEventListener('click', () => { characterHolder.rotation.y += Math.PI / 6; });
$('resetViewBtn').addEventListener('click', resetView);

animSpeed.addEventListener('input', () => {
  const value = Number(animSpeed.value) || 1;
  animSpeedValue.textContent = value.toFixed(1) + '×';
  if (mixer) mixer.timeScale = value;
  updateSummary();
});

$('saveBtn').addEventListener('click', () => saveCharacter(true));
$('loadBtn').addEventListener('click', loadSavedCharacter);
$('copyBtn').addEventListener('click', copyBuildJson);
$('useCharacterBtn').addEventListener('click', useCharacter);

$('randomBtn').addEventListener('click', async () => {
  const entry = CHARACTER_CATALOG[Math.floor(Math.random() * CHARACTER_CATALOG.length)];
  const palettes = Object.keys(paletteSchemes);
  currentPalette = palettes[Math.floor(Math.random() * palettes.length)];
  characterName.value = randomName();
  pendingPose = ['Idle', 'Walk', 'Run', 'Jump', 'Victory'][Math.floor(Math.random() * 5)];
  await selectStyle(entry.id, { preservePalette: true });
  setActiveTab('style');
  showToast('Random character created.');
});

window.addEventListener('resize', resize);
window.visualViewport && window.visualViewport.addEventListener('resize', resize);

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  if (mixer) mixer.update(dt);
  if (turntableToggle.checked) characterHolder.rotation.y += dt * 0.38;

  const positions = snowGeo.attributes.position.array;
  for (let i = 1; i < positions.length; i += 3) {
    positions[i] -= dt * 0.34;
    if (positions[i] < 0.05) positions[i] = 8.7;
  }
  snowGeo.attributes.position.needsUpdate = true;

  renderer.render(scene, camera);
}

async function bootstrap() {
  renderFilters();
  renderStyleGrid();
  resize();
  buildWorkshopDecor();

  let saved = null;
  try {
    saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  } catch (_) {
    saved = null;
  }

  if (saved && CHARACTER_CATALOG.some((entry) => entry.id === saved.modelId)) {
    characterName.value = saved.name || 'Jingle';
    animSpeed.value = String(Number(saved.animationSpeed) || 1);
    animSpeedValue.textContent = Number(animSpeed.value).toFixed(1) + '×';
    turntableToggle.checked = Boolean(saved.turntable);
    currentPalette = saved.palette || 'original';
    pendingSavedColors = saved.materialColors || null;
    pendingPose = saved.pose || null;
    currentEntry = CHARACTER_CATALOG.find((entry) => entry.id === saved.modelId) || currentEntry;
  }

  updateSummary();
  renderStyleGrid();
  await selectStyle(currentEntry.id, { preservePalette: true });
}

animate();
bootstrap();
