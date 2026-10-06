import * as THREE from 'three';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/FBXLoader.js';
import { CHARACTER_CATALOG } from './character-catalog.js?v=4';
import { PART_DEFINITIONS, createModularPartSystem } from './modular-parts.js?v=4';
import { optionsForPart, canonicalOptionForSource, optionById, PART_CATEGORY_LABELS } from './part-options.js?v=4';

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
const compatibleCount = $('compatibleCount');
const presetSelect = $('presetSelect');
const rigLabel = $('rigLabel');
const partRows = $('partRows');
const partCategoryRail = $('partCategoryRail');
const partBrowser = $('partBrowser');
const proportionPanel = $('proportionPanel');
const activePartEyebrow = $('activePartEyebrow');
const activePartTitle = $('activePartTitle');
const activePartCount = $('activePartCount');
const partSourceGrid = $('partSourceGrid');
const removePartBtn = $('removePartBtn');
const partPrevBtn = $('partPrevBtn');
const partNextBtn = $('partNextBtn');
const heightSlider = $('heightSlider');
const buildSlider = $('buildSlider');
const headSizeSlider = $('headSizeSlider');
const heightValue = $('heightValue');
const buildValue = $('buildValue');
const headSizeValue = $('headSizeValue');
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

if (CHARACTER_CATALOG.length !== 52) throw new Error('Character Workshop requires all 52 source characters.');

const entryById = new Map(CHARACTER_CATALOG.map((entry) => [entry.id, entry]));
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
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

const studioFloor = new THREE.Mesh(
  new THREE.CircleGeometry(7.5, 80),
  new THREE.MeshStandardMaterial({ color: 0xe8eef1, roughness: 1 })
);
studioFloor.rotation.x = -Math.PI / 2;
studioFloor.position.y = -0.015;
studioFloor.receiveShadow = true;
scene.add(studioFloor);

const gltfLoader = new GLTFLoader();
const fbxLoader = new FBXLoader();
const partSystem = createModularPartSystem(THREE, gltfLoader, CHARACTER_CATALOG);
const wearableAssetCache = new Map();
const clock = new THREE.Clock();

const STORAGE_KEY = 'gamebox.characterBuilder.v2';
const LEGACY_STORAGE_KEY = 'gamebox.characterBuilder.v1';
const SESSION_KEY = 'gamebox.characterBuilder.current';

const paletteSchemes = {
  christmas: ['#2f744d', '#b83d49', '#f4ecdc', '#d4aa43', '#22313d'],
  frost: ['#4b89b3', '#9bc6dc', '#eef7f8', '#d3e6ed', '#344d67'],
  candy: ['#c84058', '#f17b91', '#fff3e9', '#66a98e', '#e4bd58'],
  midnight: ['#172b49', '#31527c', '#e9d9a0', '#b8873a', '#101720'],
  forest: ['#254d35', '#49775b', '#c9b986', '#794b34', '#d7d0b0']
};

const nameStarts = ['Alex', 'Ari', 'Ash', 'Bailey', 'Blake', 'Casey', 'Charlie', 'Drew', 'Ellis', 'Emery', 'Finley', 'Harper', 'Jamie', 'Jordan', 'Kai', 'Morgan', 'Parker', 'Quinn', 'Reese', 'Riley', 'Robin', 'Rowan', 'Sam', 'Taylor'];
const nameEnds = ['Stone', 'Vale', 'Wren', 'Fox', 'Hart', 'Reed', 'Lane', 'Brooks', 'Rivers', 'Gray', 'Bell', 'Moss'];

let currentPreset = entryById.get('BaseCharacter') || CHARACTER_CATALOG[0];
let activeRig = currentPreset.rig;
let driverScene = null;
let driverMesh = null;
let driverSkeleton = null;
let driverParent = null;
let mixer = null;
let clips = [];
let activeAction = null;
let activeClipName = '';
let currentPalette = 'original';
let materialRecords = [];
let activeParts = Object.fromEntries(PART_DEFINITIONS.map((part) => [part.id, { optionId: null, kind: null, sourceId: null, wearableId: null, group: null }]));
let partTokens = Object.fromEntries(PART_DEFINITIONS.map((part) => [part.id, 0]));
let loadGeneration = 0;
let initialLoad = true;
let viewDistance = 5.15;
let toastTimer = 0;
let pendingSavedColors = null;
let pendingPose = null;
let pendingParts = null;
let activePartCategory = 'head';
let proportions = { height: 100, build: 100, headSize: 100 };
let pointerStartedAt = null;
let pointerDragged = false;

const PART_ICONS = {
  head: '◉',
  hair: '≋',
  headwear: '⌃',
  top: '▣',
  arms: '↔',
  bottom: '▤',
  shoes: '⌂',
  accessory: '✦'
};

function randomName() {
  return nameStarts[Math.floor(Math.random() * nameStarts.length)] + ' ' + nameEnds[Math.floor(Math.random() * nameEnds.length)];
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 1900);
}

function showLoadError(error) {
  console.error(error);
  modelLoading.hidden = true;
  loadError.hidden = false;
  loadError.textContent = 'That character part could not be loaded. ' + (error?.message || '');
  setTimeout(() => { loadError.hidden = true; }, 5200);
}

function humanPalette(name) {
  if (!name) return 'Original';
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function fitDriver(model) {
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

function disposeGroup(group) {
  group?.traverse((node) => {
    node.geometry?.dispose?.();
    const materials = Array.isArray(node.material) ? node.material : node.material ? [node.material] : [];
    materials.forEach((material) => material?.dispose?.());
  });
}

function clearActiveParts() {
  for (const part of PART_DEFINITIONS) {
    const state = activeParts[part.id];
    if (state?.group?.parent) state.group.parent.remove(state.group);
    disposeGroup(state?.group);
    activeParts[part.id] = { optionId: null, kind: null, sourceId: null, wearableId: null, group: null };
  }
  materialRecords = [];
}

function disposeDriver() {
  clearActiveParts();
  if (driverScene?.parent) driverScene.parent.remove(driverScene);
  disposeGroup(driverScene);
  driverScene = null;
  driverMesh = null;
  driverSkeleton = null;
  driverParent = null;
  mixer?.stopAllAction?.();
  mixer = null;
  clips = [];
  activeAction = null;
  activeClipName = '';
}

function compatibleEntries() {
  return CHARACTER_CATALOG.slice();
}

function partCandidates(category) {
  return optionsForPart(category);
}

function currentPartOption(category) {
  const state = activeParts[category];
  return state?.optionId ? optionById(category, state.optionId) : null;
}

function partDefinition(category = activePartCategory) {
  return PART_DEFINITIONS.find((part) => part.id === category) || PART_DEFINITIONS[0];
}

function renderPartCategoryRail() {
  partCategoryRail.innerHTML = '';
  const categories = [
    { id: 'body', label: 'Body', icon: '◇' },
    ...PART_DEFINITIONS.map((part) => ({ id: part.id, label: PART_CATEGORY_LABELS[part.id] || part.label, icon: PART_ICONS[part.id] || '•' }))
  ];

  for (const category of categories) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'partCategoryBtn' + (category.id === activePartCategory ? ' active' : '');
    button.dataset.part = category.id;
    button.innerHTML = '<i>' + category.icon + '</i><span>' + category.label + '</span>';
    button.setAttribute('aria-label', 'Customise ' + category.label);
    button.title = category.label;
    button.addEventListener('click', () => selectPartCategory(category.id));
    partCategoryRail.appendChild(button);
  }
}

function renderPartBrowser() {
  if (activePartCategory === 'body') return;
  const part = partDefinition();
  const candidates = partCandidates(part.id);
  const selectedOptionId = activeParts[part.id]?.optionId || null;

  activePartEyebrow.textContent = part.optional ? 'OPTIONAL CHARACTER PART' : 'CHARACTER PART';
  activePartTitle.textContent = PART_CATEGORY_LABELS[part.id] || part.label;
  activePartCount.textContent = candidates.length + (candidates.length === 1 ? ' style' : ' styles');
  removePartBtn.hidden = !part.optional;
  removePartBtn.disabled = !selectedOptionId;
  partSourceGrid.innerHTML = '';

  if (part.optional) {
    const none = document.createElement('button');
    none.type = 'button';
    none.className = 'partSourceCard noneCard' + (!selectedOptionId ? ' selected' : '');
    none.innerHTML = '<span class="partPreview nonePreview">×</span><strong>None</strong>';
    none.addEventListener('click', async () => {
      await applyPartOption(part.id, null, { allowNone: true });
      renderPartBrowser();
    });
    partSourceGrid.appendChild(none);
  }

  for (const option of candidates) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'partSourceCard' + (option.featured ? ' featured' : '') + (selectedOptionId === option.id ? ' selected' : '');
    card.dataset.option = option.id;

    const image = document.createElement('img');
    image.className = 'partPreview';
    image.src = option.preview;
    image.alt = '';
    image.loading = 'lazy';

    const label = document.createElement('strong');
    label.textContent = option.label;

    card.append(image);
    if (option.badge) {
      const badge = document.createElement('span');
      badge.className = 'partSourceBadge';
      badge.textContent = option.badge;
      card.append(badge);
    }
    card.append(label);
    card.addEventListener('click', async () => {
      partSourceGrid.classList.add('loading');
      const ok = await applyPartOption(part.id, option);
      partSourceGrid.classList.remove('loading');
      if (!ok) showToast('That style could not be applied.');
      renderPartBrowser();
    });
    partSourceGrid.appendChild(card);
  }

  const selectedCard = partSourceGrid.querySelector('.partSourceCard.selected');
  selectedCard?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
}

function selectPartCategory(category) {
  const isBody = category === 'body';
  if (!isBody && !PART_DEFINITIONS.some((part) => part.id === category)) return;
  activePartCategory = category;
  setActiveTab('style');
  partBrowser.hidden = isBody;
  proportionPanel.hidden = !isBody;
  renderPartCategoryRail();
  if (!isBody) renderPartBrowser();
}

function applyProportions() {
  const height = THREE.MathUtils.clamp(Number(proportions.height) || 100, 90, 110) / 100;
  const build = THREE.MathUtils.clamp(Number(proportions.build) || 100, 90, 112) / 100;
  const headSize = THREE.MathUtils.clamp(Number(proportions.headSize) || 100, 88, 116) / 100;

  characterHolder.scale.set(build, height, build);
  characterHolder.position.y = 0.31 - (0.31 * height);

  const headBone = driverSkeleton?.getBoneByName?.('Head');
  if (headBone) headBone.scale.setScalar(headSize);

  heightSlider.value = String(Math.round(height * 100));
  buildSlider.value = String(Math.round(build * 100));
  headSizeSlider.value = String(Math.round(headSize * 100));
  heightValue.textContent = Math.round(height * 100) + '%';
  buildValue.textContent = Math.round(build * 100) + '%';
  headSizeValue.textContent = Math.round(headSize * 100) + '%';
}

function readProportionControls() {
  proportions = {
    height: Number(heightSlider.value),
    build: Number(buildSlider.value),
    headSize: Number(headSizeSlider.value)
  };
  applyProportions();
}

function resetProportions() {
  proportions = { height: 100, build: 100, headSize: 100 };
  applyProportions();
  updateSummary();
}

function renderPresetSelect() {
  presetSelect.innerHTML = '';
  CHARACTER_CATALOG.forEach((entry, index) => {
    const option = document.createElement('option');
    option.value = entry.id;
    option.textContent = 'Complete Look ' + String(index + 1).padStart(2, '0');
    presetSelect.appendChild(option);
  });
  presetSelect.value = currentPreset.id;
}

function renderPartRows() {
  // Legacy form controls are intentionally retired. The visual gallery is the builder.
  partRows.innerHTML = '';
}

function setPartRowLoading(category, loadingNow) {
  const row = partRows.querySelector('[data-part="' + category + '"]');
  row?.classList.toggle('loading', Boolean(loadingNow));
  if (category === activePartCategory) partSourceGrid.classList.toggle('loading', Boolean(loadingNow));
}

function updatePartRows() {
  const totalDistinct = PART_DEFINITIONS.reduce((sum, part) => sum + partCandidates(part.id).length, 0);
  compatibleCount.textContent = totalDistinct + ' distinct styles';
  rigLabel.textContent = 'Click the character or choose a category';
  renderPartCategoryRail();
  if (activePartCategory === 'body') {
    partBrowser.hidden = true;
    proportionPanel.hidden = false;
  } else {
    partBrowser.hidden = false;
    proportionPanel.hidden = true;
    renderPartBrowser();
  }
}

const CATEGORY_COLOUR_LABELS = {
  head: 'Head',
  hair: 'Hair',
  headwear: 'Headwear',
  top: 'Top',
  arms: 'Sleeves',
  bottom: 'Bottoms',
  shoes: 'Shoes',
  accessory: 'Accessory'
};

function friendlyMaterialName(partId, rawName, index) {
  const raw = String(rawName || '').trim();
  const lower = raw.toLowerCase();
  if (/skin|face|flesh/.test(lower)) return 'Skin';
  if (/hair|beard|moustache|mustache|brow/.test(lower)) return 'Hair';
  if (/eye|pupil|iris/.test(lower)) return 'Eyes';
  if (/shoe|boot|foot/.test(lower)) return 'Shoes';
  if (/hat|helmet|hood|crown|cap/.test(lower)) return 'Headwear';
  if (/armou?r|metal|plate|mail/.test(lower)) return 'Armour';
  if (/shirt|top|torso|coat|jacket|tunic/.test(lower)) return 'Top';
  if (/trouser|pants|bottom|skirt|short/.test(lower)) return 'Bottoms';
  if (/belt|buckle|pouch|bag|cape|strap|apron|accessory/.test(lower)) return 'Accessory';

  const generic = !raw || /^material(?:[ ._-]*\d+)?$/i.test(raw) || /^mat(?:[ ._-]*\d+)?$/i.test(raw);
  if (generic) {
    const base = CATEGORY_COLOUR_LABELS[partId] || 'Part';
    return index ? base + ' colour ' + (index + 1) : base + ' colour';
  }
  return raw.replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function currentMaterials() {
  const records = [];
  for (const part of PART_DEFINITIONS) {
    const state = activeParts[part.id];
    if (!state?.group) continue;
    let localIndex = 0;
    state.group.traverse((node) => {
      if (!node.isMesh || !node.material) return;
      const mats = Array.isArray(node.material) ? node.material : [node.material];
      for (const material of mats) {
        if (!material?.color) continue;
        const rawName = node.userData.sourceMaterialName || material.name || ('Material ' + (localIndex + 1));
        const name = friendlyMaterialName(part.id, rawName, localIndex);
        const key = part.id + '::' + (state.optionId || 'none') + '::' + rawName + '::' + localIndex;
        records.push({
          part: part.id,
          optionId: state.optionId,
          sourceId: state.sourceId,
          material,
          name,
          rawName,
          key: key.toLowerCase(),
          originalColor: material.userData?.originalColor || node.userData.originalColor || ('#' + material.color.getHexString())
        });
        localIndex += 1;
      }
    });
  }
  return records;
}

function looksLikeSkin(record) {
  const name = record.name.toLowerCase();
  if (/skin|face|flesh|teeth/.test(name)) return true;
  const c = new THREE.Color(record.originalColor);
  const max = Math.max(c.r, c.g, c.b);
  const min = Math.min(c.r, c.g, c.b);
  return c.r > c.g * 1.05 && c.g >= c.b * 0.72 && c.r > 0.46 && max - min > 0.08;
}

function looksLikeHair(record) {
  return /hair|beard|moustache|mustache|brow/.test(record.name.toLowerCase());
}

function looksLikeEye(record) {
  return /eye|pupil|iris/.test(record.name.toLowerCase());
}

function refreshMaterialRecords() {
  materialRecords = currentMaterials();
  if (currentPalette !== 'custom') applyPalette(currentPalette, false);
  renderMaterialControls();
  updateSummary();
}

function refreshPaletteButtons() {
  document.querySelectorAll('[data-palette]').forEach((button) => {
    button.classList.toggle('active', button.dataset.palette === currentPalette);
  });
}

function applyPalette(name, render = true) {
  currentPalette = name;
  for (const record of materialRecords) record.material.color.set(record.originalColor);

  if (name !== 'original' && name !== 'custom') {
    const scheme = paletteSchemes[name] || paletteSchemes.christmas;
    let index = 0;
    for (const record of materialRecords) {
      if (looksLikeSkin(record) || looksLikeHair(record) || looksLikeEye(record)) continue;
      record.material.color.set(scheme[index % scheme.length]);
      index += 1;
    }
  }
  refreshPaletteButtons();
  if (render) renderMaterialControls();
  updateSummary();
}

function applySavedColors(colors) {
  if (!colors || typeof colors !== 'object') return false;
  let applied = 0;
  for (const record of materialRecords) {
    const value = colors[record.key];
    if (typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)) {
      record.material.color.set(value);
      applied += 1;
    }
  }
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

  const grouped = [];
  const groupedByKey = new Map();
  for (const record of materialRecords) {
    const key = [record.part, record.name.toLowerCase(), record.originalColor.toLowerCase()].join('::');
    let group = groupedByKey.get(key);
    if (!group) {
      group = { part: record.part, name: record.name, records: [] };
      groupedByKey.set(key, group);
      grouped.push(group);
    }
    group.records.push(record);
  }

  materialCount.textContent = grouped.length + (grouped.length === 1 ? ' colour control' : ' colour controls');

  if (!grouped.length) {
    materialList.innerHTML = '<p class="helperCopy">Choose character parts to expose their real model materials.</p>';
    return;
  }

  for (const group of grouped) {
    const row = document.createElement('div');
    row.className = 'materialRow';

    const text = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = group.name;
    const subtitle = document.createElement('small');
    subtitle.textContent = PART_CATEGORY_LABELS[group.part] || PART_DEFINITIONS.find((part) => part.id === group.part)?.label || 'Character part';
    text.append(title, subtitle);

    const input = document.createElement('input');
    input.type = 'color';
    input.value = '#' + group.records[0].material.color.getHexString();
    input.setAttribute('aria-label', 'Colour for ' + group.name);
    input.addEventListener('input', () => {
      for (const record of group.records) record.material.color.set(input.value);
      currentPalette = 'custom';
      refreshPaletteButtons();
      updateSummary();
    });

    const reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'materialReset';
    reset.textContent = '↺';
    reset.setAttribute('aria-label', 'Reset ' + group.name);
    reset.addEventListener('click', () => {
      for (const record of group.records) record.material.color.set(record.originalColor);
      input.value = group.records[0].originalColor;
      currentPalette = 'custom';
      refreshPaletteButtons();
      updateSummary();
    });

    row.append(text, input, reset);
    materialList.appendChild(row);
  }
}

function cloneWearableMaterials(node) {
  if (!node.material) return;
  const materials = (Array.isArray(node.material) ? node.material : [node.material]).map((material) => {
    const clone = material.clone();
    if (clone.color) clone.userData.originalColor = '#' + clone.color.getHexString();
    return clone;
  });
  node.material = Array.isArray(node.material) ? materials : materials[0];
}

function loadWearableTemplate(option) {
  if (wearableAssetCache.has(option.path)) return wearableAssetCache.get(option.path);
  const promise = new Promise((resolve, reject) => {
    gltfLoader.load(option.path + '?wearable=3', (gltf) => resolve(gltf.scene), undefined, reject);
  });
  wearableAssetCache.set(option.path, promise);
  return promise;
}

function bindWearableToDriverSkeleton(group) {
  let boundMeshes = 0;

  group.traverse((node) => {
    if (!node.isSkinnedMesh) return;
    const sourceSkeleton = node.skeleton;
    if (!sourceSkeleton?.bones?.length) throw new Error('Custom footwear has no usable source skeleton.');

    const mappedBones = sourceSkeleton.bones.map((sourceBone) => driverSkeleton?.getBoneByName?.(sourceBone.name) || null);
    const missing = sourceSkeleton.bones
      .filter((_, index) => !mappedBones[index])
      .map((bone) => bone.name || '(unnamed)');

    if (missing.length) {
      throw new Error('Custom footwear is missing compatible GameBox bones: ' + missing.join(', '));
    }

    const boneInverses = sourceSkeleton.boneInverses.map((inverse) => inverse.clone());
    const mappedSkeleton = new THREE.Skeleton(mappedBones, boneInverses);
    node.bind(mappedSkeleton, node.bindMatrix.clone());
    node.normalizeSkinWeights();
    node.userData.directSkeletonBinding = true;
    boundMeshes += 1;
  });

  if (!boundMeshes) throw new Error('Custom footwear contains no skinned shoe meshes.');
  group.userData.directSkeletonBinding = true;
  return boundMeshes;
}

async function instantiateWearable(option, category) {
  const template = await loadWearableTemplate(option);
  const group = template.clone(true);
  group.name = 'Wearable:' + option.id;
  group.userData.partCategory = category;
  group.userData.optionId = option.id;
  group.userData.attachToDriverRoot = true;

  group.traverse((node) => {
    if (!node.isMesh) return;
    if (node.geometry) node.geometry = node.geometry.clone();
    node.castShadow = true;
    node.receiveShadow = true;
    cloneWearableMaterials(node);
    node.userData.partCategory = category;
    node.userData.optionId = option.id;
  });

  bindWearableToDriverSkeleton(group);
  return group;
}

async function applyPartOption(category, option, options = {}) {
  return setPart(category, option, options);
}

async function setPart(category, selection, options = {}) {
  if (!driverSkeleton || !driverParent) return false;
  const partDef = PART_DEFINITIONS.find((part) => part.id === category);
  if (!partDef) return false;

  let option = null;
  if (selection && typeof selection === 'object') {
    option = selection;
  } else if (typeof selection === 'string') {
    option = optionById(category, selection) || canonicalOptionForSource(category, selection);
    if (!option && entryById.has(selection)) option = canonicalOptionForSource(category, selection);
  }

  if (!option && selection && typeof selection === 'string' && entryById.has(selection)) {
    option = { id: null, kind: 'source', sourceId: selection, label: 'Legacy part' };
  }

  if (!option && selection && typeof selection !== 'object') selection = null;
  if (!option && !partDef.optional && selection == null) return false;

  const token = ++partTokens[category];
  setPartRowLoading(category, true);

  try {
    let newGroup = null;
    let sourceId = null;
    let wearableId = null;
    let kind = option?.kind || null;

    if (option?.kind === 'wearable') {
      wearableId = option.wearableId;
      newGroup = await instantiateWearable(option, category);
    } else if (option?.kind === 'source') {
      sourceId = option.sourceId;
      const source = entryById.get(sourceId);
      if (!source || source.rig !== activeRig) return false;
      newGroup = await partSystem.instantiate(sourceId, category, driverSkeleton);
    } else if (option == null && partDef.optional) {
      newGroup = null;
    }

    if (token !== partTokens[category]) {
      disposeGroup(newGroup);
      return false;
    }

    if (option && !newGroup) {
      if (options.allowNone && partDef.optional) option = null;
      else return false;
    }

    const previous = activeParts[category];
    if (previous?.group?.parent) previous.group.parent.remove(previous.group);
    disposeGroup(previous?.group);

    if (newGroup) {
      if (newGroup.userData.attachToDriverRoot) driverScene.add(newGroup);
      else driverParent.add(newGroup);
    }

    activeParts[category] = {
      optionId: option?.id || null,
      kind: option?.kind || null,
      sourceId: sourceId || null,
      wearableId: wearableId || null,
      group: newGroup
    };

    refreshMaterialRecords();
    updatePartRows();
    return true;
  } catch (error) {
    showLoadError(error);
    return false;
  } finally {
    if (token === partTokens[category]) setPartRowLoading(category, false);
  }
}

async function cyclePart(category, direction) {
  const partDef = PART_DEFINITIONS.find((part) => part.id === category);
  if (!partDef) return;

  const options = partCandidates(category);
  const candidates = partDef.optional ? [null, ...options] : options;
  if (!candidates.length) return;

  const currentId = activeParts[category]?.optionId || null;
  let index = candidates.findIndex((candidate) => (candidate?.id || null) === currentId);
  if (index < 0) index = 0;

  const nextIndex = (index + direction + candidates.length) % candidates.length;
  const candidate = candidates[nextIndex];
  await applyPartOption(category, candidate, { allowNone: true });
}


async function findRandomPart(category) {
  const partDef = PART_DEFINITIONS.find((part) => part.id === category);
  const options = partCandidates(category);
  if (partDef.optional && Math.random() < 0.22) return null;
  return options[Math.floor(Math.random() * options.length)] || null;
}

async function randomiseParts() {
  modelLoading.hidden = false;
  modelLoading.textContent = 'MIXING PARTS…';
  try {
    for (const part of PART_DEFINITIONS) {
      const option = await findRandomPart(part.id);
      await applyPartOption(part.id, option, { allowNone: true });
    }
    characterName.value = randomName();
    updateSummary();
    showToast('Compatible parts randomised.');
  } finally {
    modelLoading.hidden = true;
    modelLoading.textContent = 'LOADING STYLE…';
  }
}

async function resetPartsToPreset() {
  modelLoading.hidden = false;
  modelLoading.textContent = 'RESETTING PARTS…';
  try {
    for (const part of PART_DEFINITIONS) {
      const option = canonicalOptionForSource(part.id, currentPreset.id);
      if (option) await applyPartOption(part.id, option);
      else if (part.optional) await applyPartOption(part.id, null, { allowNone: true });
      else await applyPartOption(part.id, partCandidates(part.id)[0] || null);
    }
    showToast('Character reset to the starting look.');
  } finally {
    modelLoading.hidden = true;
    modelLoading.textContent = 'LOADING STYLE…';
  }
}

function clipScore(name) {
  const n = String(name || '').toLowerCase();
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
  next.reset().enabled = true;
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
  const ordered = clips.slice().sort((a, b) => clipScore(a.name) - clipScore(b.name) || a.name.localeCompare(b.name));
  for (const clip of ordered) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'poseBtn';
    button.dataset.clip = clip.name;
    button.textContent = clip.name || 'Unnamed clip';
    button.title = clip.name;
    button.addEventListener('click', () => playClip(clip));
    poseGrid.appendChild(button);
  }
  if (!ordered.length) poseGrid.innerHTML = '<p class="helperCopy">No animation clips found on this frame.</p>';
}

function updateLoadingProgress(event) {
  if (!event?.total) return;
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

function snapshotMaterialColors() {
  const colors = {};
  for (const record of materialRecords) colors[record.key] = '#' + record.material.color.getHexString();
  return colors;
}

function partSelectionMap() {
  const result = {};
  for (const part of PART_DEFINITIONS) {
    const state = activeParts[part.id];
    if (!state?.optionId) {
      result[part.id] = null;
      continue;
    }
    const option = optionById(part.id, state.optionId);
    result[part.id] = {
      optionId: state.optionId,
      kind: state.kind,
      sourceId: state.sourceId || null,
      wearableId: state.wearableId || null,
      assetPath: option?.kind === 'wearable'
        ? option.path
        : (state.sourceId ? entryById.get(state.sourceId)?.path?.replace('../', '') || null : null)
    };
  }
  return result;
}

function buildPayload() {
  return {
    version: 4,
    name: (characterName.value || 'Unnamed Character').trim().slice(0, 24),
    presetId: currentPreset.id,
    modelId: currentPreset.id,
    framePath: currentPreset.path.replace('../', ''),
    rig: activeRig,
    parts: partSelectionMap(),
    palette: currentPalette,
    materialColors: snapshotMaterialColors(),
    pose: activeClipName || '',
    animationSpeed: Number(animSpeed.value),
    turntable: Boolean(turntableToggle.checked),
    proportions: { ...proportions },
    source: 'GameBox Character Workshop',
    updatedAt: new Date().toISOString()
  };
}

function selectedPartCount() {
  return PART_DEFINITIONS.filter((part) => activeParts[part.id]?.optionId).length;
}

function updateSummary() {
  const name = (characterName.value || 'Unnamed Character').trim() || 'Unnamed Character';
  const count = selectedPartCount();
  const totalStyles = PART_DEFINITIONS.reduce((sum, part) => sum + partCandidates(part.id).length, 0);

  summaryName.textContent = name;
  summaryStyle.textContent = 'Custom character · ' + count + ' parts';
  summaryPalette.textContent = humanPalette(currentPalette);
  summaryPose.textContent = activeClipName || '—';

  selectedGroup.textContent = 'CREATE A CHARACTER';
  selectedModel.textContent = name;
  modelMeta.textContent = totalStyles + ' distinct part styles · ' + clips.length + ' animation clips';
  presetSelect.value = currentPreset.id;
}

function saveCharacter(showMessage = true) {
  const payload = buildPayload();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload));
  if (showMessage) showToast('Exact modular character saved.');
  return payload;
}

async function copyBuildJson() {
  const json = JSON.stringify(buildPayload(), null, 2);
  try {
    await navigator.clipboard.writeText(json);
    showToast('Modular build JSON copied.');
  } catch (_) {
    const area = document.createElement('textarea');
    area.value = json;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    area.remove();
    showToast('Modular build JSON copied.');
  }
}

function useCharacter() {
  const payload = saveCharacter(false);
  window.dispatchEvent(new CustomEvent('gamebox-character-ready', { detail: payload }));
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ type: 'gamebox-character-ready', character: payload }, window.location.origin);
  }
  showToast('Exact character build ready for GameBox.');
}

function workshopDiagnosticSnapshot() {
  driverScene?.updateMatrixWorld?.(true);
  const shoeState = activeParts.shoes || {};
  let skinnedMeshCount = 0;
  let usesDriverSkeleton = Boolean(shoeState.group);
  shoeState.group?.traverse?.((node) => {
    if (!node.isSkinnedMesh) return;
    skinnedMeshCount += 1;
    const bones = node.skeleton?.bones || [];
    if (!bones.length || bones.some((bone) => driverSkeleton?.getBoneByName?.(bone.name) !== bone)) {
      usesDriverSkeleton = false;
    }
  });

  const matrixFor = (boneName) => {
    const bone = driverSkeleton?.getBoneByName?.(boneName);
    return bone ? Array.from(bone.matrixWorld.elements) : null;
  };

  return {
    presetId: currentPreset?.id || null,
    pose: activeClipName || '',
    shoes: {
      optionId: shoeState.optionId || null,
      wearableId: shoeState.wearableId || null,
      directSkeletonBinding: Boolean(shoeState.group?.userData?.directSkeletonBinding),
      usesDriverSkeleton,
      skinnedMeshCount
    },
    feet: {
      left: matrixFor('Foot.L'),
      right: matrixFor('Foot.R')
    }
  };
}

window.__GAMEBOX_CHARACTER_WORKSHOP__ = Object.freeze({
  snapshot: workshopDiagnosticSnapshot
});

async function loadDriver(entryId, options = {}) {
  const entry = entryById.get(entryId);
  if (!entry) return false;
  const generation = ++loadGeneration;
  loadError.hidden = true;
  if (!initialLoad) {
    modelLoading.hidden = false;
    modelLoading.textContent = 'LOADING FRAME…';
  } else {
    loadText.textContent = 'Preparing ' + entry.label + ' and its compatible modular pieces.';
    loadBar.style.width = '10%';
  }

  return new Promise((resolve) => {
    gltfLoader.load(
      entry.path + '?frame=2',
      async (gltf) => {
        if (generation !== loadGeneration) {
          disposeGroup(gltf.scene);
          resolve(false);
          return;
        }

        const skinnedMeshes = [];
        gltf.scene.traverse((node) => {
          if (node.isSkinnedMesh) skinnedMeshes.push(node);
          if (node.isMesh) {
            node.castShadow = true;
            node.receiveShadow = true;
          }
        });
        const frameMesh = skinnedMeshes[0];
        if (!frameMesh?.skeleton) {
          disposeGroup(gltf.scene);
          showLoadError(new Error('Selected frame has no usable skinned skeleton.'));
          resolve(false);
          return;
        }

        fitDriver(gltf.scene);
        disposeDriver();

        currentPreset = entry;
        activeRig = entry.rig;
        driverScene = gltf.scene;
        driverMesh = frameMesh;
        driverSkeleton = frameMesh.skeleton;
        driverParent = frameMesh.parent || driverScene;
        clips = gltf.animations || [];
        mixer = new THREE.AnimationMixer(driverScene);
        mixer.timeScale = Number(animSpeed.value) || 1;
        activeAction = null;
        activeClipName = '';

        for (const mesh of skinnedMeshes) mesh.visible = false;
        characterHolder.add(driverScene);

        renderPoseControls();
        renderPresetSelect();
        updatePartRows();

        const requestedParts = options.parts || null;
        for (const part of PART_DEFINITIONS) {
          let selection;
          const hasSavedValue = requestedParts && Object.prototype.hasOwnProperty.call(requestedParts, part.id);

          if (hasSavedValue) {
            const saved = requestedParts[part.id];
            if (saved == null) {
              selection = null;
            } else if (typeof saved === 'string') {
              selection = optionById(part.id, saved) || canonicalOptionForSource(part.id, saved);
            } else if (typeof saved === 'object') {
              selection = optionById(part.id, saved.optionId)
                || (saved.sourceId ? canonicalOptionForSource(part.id, saved.sourceId) : null)
                || (saved.wearableId ? partCandidates(part.id).find((candidate) => candidate.wearableId === saved.wearableId) : null);
            }
          } else {
            selection = canonicalOptionForSource(part.id, entry.id);
          }

          if (selection) {
            await applyPartOption(part.id, selection);
          } else if (part.optional) {
            await applyPartOption(part.id, null, { allowNone: true });
          } else {
            await applyPartOption(part.id, partCandidates(part.id)[0] || null);
          }
        }

        if (pendingSavedColors) {
          applySavedColors(pendingSavedColors);
          pendingSavedColors = null;
        } else if (currentPalette !== 'custom') {
          applyPalette(currentPalette);
        }

        applyProportions();

        const desiredPose = pendingPose ? findClipByName(pendingPose) : null;
        pendingPose = null;
        playClip(desiredPose || findIdleClip(), false);

        characterHolder.rotation.y = 0;
        modelLoading.hidden = true;
        modelLoading.textContent = 'LOADING STYLE…';
        finishInitialLoad();
        updatePartRows();
        updateSummary();
        resolve(true);
      },
      updateLoadingProgress,
      (error) => {
        if (generation !== loadGeneration) {
          resolve(false);
          return;
        }
        showLoadError(error);
        if (initialLoad) finishInitialLoad();
        resolve(false);
      }
    );
  });
}

async function loadSavedCharacter() {
  let saved = null;
  try {
    saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY) || 'null');
  } catch (_) {
    saved = null;
  }

  const presetId = saved?.presetId || saved?.modelId;
  if (!saved || !entryById.has(presetId)) {
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
  pendingParts = saved.parts || null;
  proportions = {
    height: Number(saved.proportions?.height) || 100,
    build: Number(saved.proportions?.build) || 100,
    headSize: Number(saved.proportions?.headSize) || 100
  };
  applyProportions();

  await loadDriver(presetId, { parts: pendingParts });
  pendingParts = null;
  showToast('Saved modular character loaded.');
  return true;
}

function setActiveTab(name) {
  document.querySelectorAll('.tabBtn').forEach((button) => button.classList.toggle('active', button.dataset.tab === name));
  document.querySelectorAll('.tabView').forEach((view) => view.classList.toggle('active', view.dataset.view === name));
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
  loadDecorAsset('../shared/asset-pool/quaternius/ultimate-nature/CommonTree_2.fbx', -3.4, -2.8, 3.4, 0.25);
  loadDecorAsset('../shared/asset-pool/quaternius/ultimate-nature/BirchTree_3.fbx', 3.3, -3.2, 3.0, -0.35);
  loadDecorAsset('../shared/asset-pool/quaternius/ultimate-nature/Rock_Moss_2.fbx', -2.7, -0.8, 0.85, 0.4);
  loadDecorAsset('../shared/asset-pool/quaternius/ultimate-nature/WoodLog_Moss.fbx', 2.6, -1.1, 0.55, -0.55);
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
const raycaster = new THREE.Raycaster();
const pointerNdc = new THREE.Vector2();
let lastSingleX = 0;
let lastPinchDistance = 0;

function categoryFromHit(object) {
  let node = object;
  while (node && node !== characterHolder) {
    if (node.userData?.partCategory) return node.userData.partCategory;
    node = node.parent;
  }
  return null;
}

function pickCharacterPart(clientX, clientY) {
  if (!driverScene) return;
  const rect = renderer.domElement.getBoundingClientRect();
  pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointerNdc, camera);
  const hits = raycaster.intersectObject(characterHolder, true);
  for (const hit of hits) {
    const category = categoryFromHit(hit.object);
    if (!category) continue;
    selectPartCategory(category);
    showToast('Editing ' + partDefinition(category).label + '.');
    return;
  }
}

renderer.domElement.addEventListener('pointerdown', (event) => {
  pointerMap.set(event.pointerId, { x: event.clientX, y: event.clientY });
  renderer.domElement.setPointerCapture(event.pointerId);
  if (pointerMap.size === 1) {
    lastSingleX = event.clientX;
    pointerStartedAt = { x: event.clientX, y: event.clientY };
    pointerDragged = false;
  }
  if (pointerMap.size === 2) {
    const values = Array.from(pointerMap.values());
    lastPinchDistance = Math.hypot(values[0].x - values[1].x, values[0].y - values[1].y);
  }
});

renderer.domElement.addEventListener('pointermove', (event) => {
  if (!pointerMap.has(event.pointerId)) return;
  pointerMap.set(event.pointerId, { x: event.clientX, y: event.clientY });

  if (pointerMap.size === 1) {
    if (pointerStartedAt && Math.hypot(event.clientX - pointerStartedAt.x, event.clientY - pointerStartedAt.y) > 6) {
      pointerDragged = true;
    }
    characterHolder.rotation.y += (event.clientX - lastSingleX) * 0.012;
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

function releasePointer(event, cancelled = false) {
  const wasSingle = pointerMap.size === 1;
  if (!cancelled && wasSingle && !pointerDragged) pickCharacterPart(event.clientX, event.clientY);
  pointerMap.delete(event.pointerId);
  try { renderer.domElement.releasePointerCapture(event.pointerId); } catch (_) {}
  if (pointerMap.size < 2) lastPinchDistance = 0;
  if (pointerMap.size === 1) lastSingleX = Array.from(pointerMap.values())[0].x;
  if (!pointerMap.size) {
    pointerStartedAt = null;
    pointerDragged = false;
  }
}
renderer.domElement.addEventListener('pointerup', (event) => releasePointer(event, false));
renderer.domElement.addEventListener('pointercancel', (event) => releasePointer(event, true));
renderer.domElement.addEventListener('wheel', (event) => {
  event.preventDefault();
  viewDistance = THREE.MathUtils.clamp(viewDistance + event.deltaY * 0.0045, 3.35, 6.8);
  resize();
}, { passive: false });

document.querySelectorAll('.tabBtn').forEach((button) => button.addEventListener('click', () => setActiveTab(button.dataset.tab)));
document.querySelectorAll('[data-palette]').forEach((button) => button.addEventListener('click', () => applyPalette(button.dataset.palette)));
characterName.addEventListener('input', updateSummary);

$('nameRollBtn').addEventListener('click', () => {
  characterName.value = randomName();
  updateSummary();
});

$('turnLeftBtn').addEventListener('click', () => { characterHolder.rotation.y -= Math.PI / 6; });
$('turnRightBtn').addEventListener('click', () => { characterHolder.rotation.y += Math.PI / 6; });
$('resetViewBtn').addEventListener('click', resetView);

$('applyPresetBtn').addEventListener('click', () => loadDriver(presetSelect.value));
$('randomPartsBtn').addEventListener('click', randomiseParts);
$('resetPartsBtn').addEventListener('click', resetPartsToPreset);
partPrevBtn.addEventListener('click', () => cyclePart(activePartCategory, -1));
partNextBtn.addEventListener('click', () => cyclePart(activePartCategory, 1));
removePartBtn.addEventListener('click', async () => {
  const part = partDefinition();
  if (!part.optional) return;
  await setPart(part.id, null, { allowNone: true });
});
heightSlider.addEventListener('input', () => { readProportionControls(); updateSummary(); });
buildSlider.addEventListener('input', () => { readProportionControls(); updateSummary(); });
headSizeSlider.addEventListener('input', () => { readProportionControls(); updateSummary(); });
$('resetProportionsBtn').addEventListener('click', resetProportions);

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
  const preset = CHARACTER_CATALOG[Math.floor(Math.random() * CHARACTER_CATALOG.length)];
  const palettes = Object.keys(paletteSchemes);
  currentPalette = palettes[Math.floor(Math.random() * palettes.length)];
  characterName.value = randomName();
  pendingPose = ['Idle', 'Walk', 'Run', 'Jump', 'Victory'][Math.floor(Math.random() * 5)];
  await loadDriver(preset.id);
  await randomiseParts();
  setActiveTab('style');
  showToast('New modular character created.');
});

window.addEventListener('resize', resize);
window.visualViewport?.addEventListener('resize', resize);

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  if (mixer) mixer.update(dt);
  if (turntableToggle.checked) characterHolder.rotation.y += dt * 0.38;

  renderer.render(scene, camera);
}

async function bootstrap() {
  renderPresetSelect();
  renderPartRows();
  renderPartCategoryRail();
  renderPartBrowser();
  applyProportions();
  resize();
  buildWorkshopDecor();

  let saved = null;
  try {
    saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY) || 'null');
  } catch (_) {
    saved = null;
  }

  const savedPresetId = saved?.presetId || saved?.modelId;
  if (saved && entryById.has(savedPresetId)) {
    currentPreset = entryById.get(savedPresetId);
    activeRig = currentPreset.rig;
    characterName.value = saved.name || 'New Character';
    animSpeed.value = String(Number(saved.animationSpeed) || 1);
    animSpeedValue.textContent = Number(animSpeed.value).toFixed(1) + '×';
    turntableToggle.checked = Boolean(saved.turntable);
    currentPalette = saved.palette || 'original';
    pendingSavedColors = saved.materialColors || null;
    pendingPose = saved.pose || null;
    pendingParts = saved.parts || null;
    proportions = {
      height: Number(saved.proportions?.height) || 100,
      build: Number(saved.proportions?.build) || 100,
      headSize: Number(saved.proportions?.headSize) || 100
    };
  }

  applyProportions();
  renderPresetSelect();
  updatePartRows();
  updateSummary();
  await loadDriver(currentPreset.id, { parts: pendingParts });
  pendingParts = null;
}

animate();
bootstrap();
