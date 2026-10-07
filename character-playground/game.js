import * as THREE from 'three';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/FBXLoader.js';
import { CHARACTER_CATALOG } from './character-catalog.js?v=4';
import { PART_DEFINITIONS, createModularPartSystem } from './modular-parts.js?v=13';
import { optionsForPart, canonicalOptionForSource, optionById, PART_CATEGORY_LABELS } from './part-options.js?v=10';

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
const backToCategoriesBtn = $('backToCategoriesBtn');
const heightSlider = $('heightSlider');
const buildSlider = $('buildSlider');
const headSizeSlider = $('headSizeSlider');
const heightValue = $('heightValue');
const buildValue = $('buildValue');
const headSizeValue = $('headSizeValue');
const materialCount = $('materialCount');
const materialList = $('materialList');
const componentColourPanel = $('componentColourPanel');
const componentColourTitle = $('componentColourTitle');
const componentColourList = $('componentColourList');
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
let viewDistance = 6.55;
let toastTimer = 0;
let pendingSavedColors = null;
let pendingSavedVisibility = null;
let pendingPose = null;
let pendingParts = null;
let activePartCategory = 'head';
let componentEditorOpen = false;
let activeBuilderTab = 'style';
document.body.dataset.builderTab = 'style';
document.body.dataset.componentEditor = 'closed';
let proportions = { height: 100, build: 100, headSize: 100 };
let pointerStartedAt = null;
let pointerDragged = false;

const PART_ICONS = {
  head: '◉',
  hair: '≋',
  facialHair: '〰',
  headwear: '⌃',
  top: '▣',
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
  if (fitDimension > 0) model.scale.setScalar(1.34 / fitDimension);
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

  for (const part of PART_DEFINITIONS) {
    const category = {
      id: part.id,
      label: PART_CATEGORY_LABELS[part.id] || part.label,
      icon: PART_ICONS[part.id] || '•'
    };
    const selected = currentPartOption(part.id);
    const wrap = document.createElement('div');
    wrap.className = 'categoryTileWrap';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'partCategoryBtn categoryTile' + (category.id === activePartCategory && componentEditorOpen ? ' active' : '');
    button.dataset.part = category.id;
    button.setAttribute('aria-label', 'Customise ' + category.label);
    button.title = category.label;

    const preview = document.createElement('span');
    preview.className = 'categoryTilePreview';
    if (selected?.preview) {
      const img = document.createElement('img');
      img.src = selected.preview;
      img.alt = '';
      preview.appendChild(img);
    } else {
      const icon = document.createElement('i');
      icon.textContent = category.icon;
      preview.appendChild(icon);
      const swatches = document.createElement('span');
      swatches.className = 'categoryTileSwatches';
      for (const colour of Object.values(selected?.baseColors || {}).slice(0, 4)) {
        const dot = document.createElement('b');
        dot.style.backgroundColor = colour;
        swatches.appendChild(dot);
      }
      preview.appendChild(swatches);
    }

    const label = document.createElement('span');
    label.className = 'categoryTileLabel';
    label.textContent = category.label.toUpperCase();
    const choice = document.createElement('small');
    choice.textContent = selected?.label || (part.optional ? 'None' : 'Choose style');

    button.append(preview, label, choice);
    button.addEventListener('click', () => selectPartCategory(category.id));

    const prev = document.createElement('button');
    prev.type = 'button';
    prev.className = 'categoryCycle categoryCyclePrev';
    prev.textContent = '‹';
    prev.setAttribute('aria-label', 'Previous ' + category.label);
    prev.addEventListener('click', async (event) => {
      event.stopPropagation();
      await cyclePart(category.id, -1);
      renderPartCategoryRail();
    });

    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'categoryCycle categoryCycleNext';
    next.textContent = '›';
    next.setAttribute('aria-label', 'Next ' + category.label);
    next.addEventListener('click', async (event) => {
      event.stopPropagation();
      await cyclePart(category.id, 1);
      renderPartCategoryRail();
    });

    wrap.append(button, prev, next);
    partCategoryRail.appendChild(wrap);
  }
}

function renderPartBrowser() {
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

    let preview;
    if (option.preview) {
      const image = document.createElement('img');
      image.className = 'partPreview';
      image.src = option.preview;
      image.alt = '';
      image.loading = 'lazy';
      preview = image;
    } else {
      const colourPreview = document.createElement('span');
      colourPreview.className = 'partPreview partColourPreview';
      const icon = document.createElement('i');
      icon.className = 'partColourIcon';
      icon.textContent = PART_ICONS[part.id] || '◆';
      colourPreview.appendChild(icon);

      const swatches = document.createElement('span');
      swatches.className = 'partColourSwatches';
      const colours = Object.entries(option.baseColors || {});
      for (const [name, value] of colours.slice(0, 5)) {
        const swatch = document.createElement('b');
        swatch.style.backgroundColor = value;
        swatch.title = name;
        swatch.setAttribute('aria-label', name + ' base colour');
        swatches.appendChild(swatch);
      }
      colourPreview.appendChild(swatches);
      preview = colourPreview;
    }

    const label = document.createElement('strong');
    label.textContent = option.label;

    card.append(preview);
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
  renderActivePartColours();
}

function showAllComponents() {
  componentEditorOpen = false;
  document.body.dataset.componentEditor = 'closed';
  partCategoryRail.hidden = false;
  partBrowser.hidden = true;
  proportionPanel.hidden = true;
  renderPartCategoryRail();
}

function selectPartCategory(category) {
  if (!PART_DEFINITIONS.some((part) => part.id === category)) return;
  activePartCategory = category;
  componentEditorOpen = true;
  document.body.dataset.componentEditor = 'open';
  setActiveTab('style');
  partCategoryRail.hidden = true;
  partBrowser.hidden = false;
  proportionPanel.hidden = category !== 'head';
  renderPartCategoryRail();
  renderPartBrowser();
  renderActivePartColours();
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
  compatibleCount.textContent = totalDistinct + ' swappable styles';
  rigLabel.textContent = 'Choose one of the eight components';
  renderPartCategoryRail();
  if (componentEditorOpen) {
    partCategoryRail.hidden = true;
    partBrowser.hidden = false;
    proportionPanel.hidden = activePartCategory !== 'head';
    renderPartBrowser();
    renderActivePartColours();
  } else {
    partCategoryRail.hidden = false;
    partBrowser.hidden = true;
    proportionPanel.hidden = true;
  }
}

const CATEGORY_COLOUR_LABELS = {
  head: 'Face',
  hair: 'Hair',
  facialHair: 'Facial Hair',
  headwear: 'Headwear',
  top: 'Top',
  bottom: 'Bottom',
  shoes: 'Shoes',
  accessory: 'Accessories'
};

function friendlyMaterialName(partId, rawName, index) {
  const raw = String(rawName || '').trim();
  const lower = raw.toLowerCase();
  if (partId === 'head' && /^face$/i.test(raw)) return 'Eyes & face details';
  if (partId === 'headwear' && /^(belt|band)$/i.test(raw)) return 'Hat band';
  if (/skin|flesh/.test(lower)) return 'Skin';
  if (partId === 'facialHair' || /beard|moustache|mustache/.test(lower)) return 'Facial Hair';
  if (/hair|brow/.test(lower)) return 'Hair';
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
  renderActivePartColours();
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
  if (render) {
    renderMaterialControls();
    renderActivePartColours();
  }
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
    renderActivePartColours();
    updateSummary();
    return true;
  }
  return false;
}

function materialGroupsForPart(partId = null) {
  const grouped = [];
  const groupedByKey = new Map();
  for (const record of materialRecords) {
    if (partId && record.part !== partId) continue;
    const key = [record.part, record.name.toLowerCase(), record.originalColor.toLowerCase()].join('::');
    let group = groupedByKey.get(key);
    if (!group) {
      group = { part: record.part, name: record.name, rawNames: new Set(), records: [] };
      groupedByKey.set(key, group);
      grouped.push(group);
    }
    group.records.push(record);
    group.rawNames.add(record.rawName);
  }
  return grouped;
}

const OPTIONAL_COMPONENTS = new Set(['hair', 'facialHair', 'headwear', 'accessory']);
const REMOVABLE_FEATURE_RE = /(teeth|brain|eye|pupil|iris|brow|scar|patch|band|trim|horn|button|buckle|belt|pouch|bag|strap|cape|collar|sleeve|lace|sole|metal|detail|ornament|badge|gem|feather|glove|apron)/i;

function canToggleMaterialGroup(group) {
  if (!group) return false;
  if (OPTIONAL_COMPONENTS.has(group.part)) return true;
  const names = [group.name, ...Array.from(group.rawNames || [])].join(' ');
  return REMOVABLE_FEATURE_RE.test(names);
}

function buildMaterialRow(group, compact = false) {
  const row = document.createElement('div');
  row.className = 'materialRow' + (compact ? ' componentMaterialRow' : '');
  row.dataset.materialNames = Array.from(group.rawNames || []).join('|').toLowerCase();

  const text = document.createElement('div');
  const title = document.createElement('strong');
  title.textContent = group.name;
  const subtitle = document.createElement('small');
  subtitle.textContent = compact
    ? 'Tap the colour to edit this region'
    : (PART_CATEGORY_LABELS[group.part] || PART_DEFINITIONS.find((part) => part.id === group.part)?.label || 'Character part');
  text.append(title, subtitle);

  const visibility = document.createElement('button');
  visibility.type = 'button';
  visibility.className = 'materialVisibility';
  const visibilityAllowed = canToggleMaterialGroup(group);
  const updateVisibilityButton = () => {
    const shown = group.records.some((record) => record.material.visible !== false);
    visibility.textContent = shown ? '◉' : '○';
    visibility.classList.toggle('off', !shown);
    visibility.setAttribute('aria-label', (shown ? 'Hide ' : 'Show ') + group.name);
    row.classList.toggle('materialHidden', !shown);
    if (subtitle) subtitle.textContent = shown
      ? (compact ? 'Colour or hide this feature' : (PART_CATEGORY_LABELS[group.part] || 'Character part'))
      : 'Hidden from character';
  };
  if (visibilityAllowed) {
    visibility.addEventListener('click', () => {
      const nextVisible = !group.records.some((record) => record.material.visible !== false);
      for (const record of group.records) record.material.visible = nextVisible;
      updateVisibilityButton();
      updateSummary();
    });
  } else {
    visibility.disabled = true;
    visibility.tabIndex = -1;
    visibility.style.visibility = 'hidden';
    visibility.setAttribute('aria-hidden', 'true');
  }

  const input = document.createElement('input');
  input.type = 'color';
  input.value = '#' + group.records[0].material.color.getHexString();
  input.setAttribute('aria-label', 'Colour for ' + group.name);
  input.addEventListener('input', () => {
    for (const record of group.records) record.material.color.set(input.value);
    currentPalette = 'custom';
    refreshPaletteButtons();
    updateSummary();
    renderPartCategoryRail();
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

  row.append(text, visibility, input, reset);
  if (visibilityAllowed) updateVisibilityButton();
  return row;
}

function renderActivePartColours() {
  if (!componentColourList || !componentColourTitle) return;
  const part = partDefinition();
  componentColourTitle.textContent = (PART_CATEGORY_LABELS[part.id] || part.label) + ' colours';
  componentColourList.innerHTML = '';
  const groups = materialGroupsForPart(part.id);
  if (!groups.length) {
    componentColourList.innerHTML = '<p class="helperCopy">Choose a style for this component to edit its available colour regions.</p>';
    return;
  }
  for (const group of groups) componentColourList.appendChild(buildMaterialRow(group, true));
}

function renderMaterialControls() {
  materialList.innerHTML = '';
  const grouped = materialGroupsForPart();

  materialCount.textContent = grouped.length + (grouped.length === 1 ? ' colour control' : ' colour controls');

  if (!grouped.length) {
    materialList.innerHTML = '<p class="helperCopy">Choose character parts to expose their real model materials.</p>';
    return;
  }

  for (const group of grouped) materialList.appendChild(buildMaterialRow(group, false));
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

function skinBoneWeightMaxima(mesh) {
  const indices = mesh.geometry?.getAttribute?.('skinIndex');
  const weights = mesh.geometry?.getAttribute?.('skinWeight');
  const maxima = {};
  if (!indices || !weights || !mesh.skeleton) return maxima;

  for (let i = 0; i < indices.count; i += 1) {
    const ids = [indices.getX(i), indices.getY(i), indices.getZ(i), indices.getW(i)];
    const ws = [weights.getX(i), weights.getY(i), weights.getZ(i), weights.getW(i)];
    for (let channel = 0; channel < 4; channel += 1) {
      const weight = ws[channel] || 0;
      if (weight <= 0.0001) continue;
      const bone = mesh.skeleton.bones[Math.round(ids[channel])];
      if (!bone?.name) continue;
      maxima[bone.name] = Math.max(maxima[bone.name] || 0, weight);
    }
  }
  return maxima;
}

function usedSkinBoneIndices(mesh) {
  const indices = mesh.geometry?.getAttribute?.('skinIndex');
  const weights = mesh.geometry?.getAttribute?.('skinWeight');
  const used = new Set();
  if (!indices || !weights) return used;

  for (let i = 0; i < indices.count; i += 1) {
    const ids = [indices.getX(i), indices.getY(i), indices.getZ(i), indices.getW(i)];
    const ws = [weights.getX(i), weights.getY(i), weights.getZ(i), weights.getW(i)];
    for (let channel = 0; channel < 4; channel += 1) {
      if (ws[channel] > 0.0001) used.add(Math.round(ids[channel]));
    }
  }
  return used;
}

function bindWearableToDriverSkeleton(group) {
  let boundMeshes = 0;

  group.traverse((node) => {
    if (!node.isSkinnedMesh) return;
    const sourceSkeleton = node.skeleton;
    if (!sourceSkeleton?.bones?.length) throw new Error('Custom footwear has no usable source skeleton.');

    const weightedIndices = usedSkinBoneIndices(node);
    if (!weightedIndices.size) throw new Error('Custom footwear has no weighted shoe bones.');

    const missingWeightedBones = [];
    const mappedBones = sourceSkeleton.bones.map((sourceBone, index) => {
      const driverBone = driverSkeleton?.getBoneByName?.(sourceBone.name) || null;
      if (driverBone) return driverBone;
      if (weightedIndices.has(index)) missingWeightedBones.push(sourceBone.name || '(unnamed)');
      return sourceBone;
    });

    if (missingWeightedBones.length) {
      throw new Error('Custom footwear is missing weighted GameBox bones: ' + missingWeightedBones.join(', '));
    }

    const boneInverses = sourceSkeleton.boneInverses.map((inverse) => inverse.clone());
    const mappedSkeleton = new THREE.Skeleton(mappedBones, boneInverses);
    node.bind(mappedSkeleton, node.bindMatrix.clone());
    node.normalizeSkinWeights();
    node.userData.directSkeletonBinding = true;
    node.userData.weightedBoneIndices = Array.from(weightedIndices);
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

function updateHairHeadwearCompatibility() {
  const hairGroup = activeParts.hair?.group;
  if (!hairGroup) return;
  const headwear = currentPartOption('headwear');
  hairGroup.visible = headwear?.hairMode !== 'hide';
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

    if (category === 'hair' || category === 'headwear') updateHairHeadwearCompatibility();
    refreshMaterialRecords();
    updatePartRows();
    scheduleCharacterFrame(false);
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

function inPlacePreviewClip(clip) {
  const clone = clip.clone();
  clone.tracks = clone.tracks.filter((track) => {
    const name = String(track.name || '');
    // The Quaternius clips animate the skeleton root "Bone" position. That is
    // useful for world movement, but a character customiser must preview Walk/
    // Run/etc. in place or the model can literally leave the camera.
    return !/(^|[\\/.])Bone\.position$/i.test(name)
      && !/(^|[\\/.])CharacterArmature\.position$/i.test(name);
  });
  return clone;
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

function snapshotMaterialVisibility() {
  const visibility = {};
  for (const record of materialRecords) visibility[record.key] = record.material.visible !== false;
  return visibility;
}

function applySavedVisibility(visibility) {
  if (!visibility || typeof visibility !== 'object') return false;
  let applied = 0;
  for (const record of materialRecords) {
    if (typeof visibility[record.key] !== 'boolean') continue;
    record.material.visible = visibility[record.key];
    applied += 1;
  }
  if (applied) {
    renderMaterialControls();
    renderActivePartColours();
  }
  return Boolean(applied);
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
    version: 5,
    name: (characterName.value || 'Unnamed Character').trim().slice(0, 24),
    presetId: currentPreset.id,
    modelId: currentPreset.id,
    framePath: currentPreset.path.replace('../', ''),
    rig: activeRig,
    parts: partSelectionMap(),
    palette: currentPalette,
    materialColors: snapshotMaterialColors(),
    materialVisibility: snapshotMaterialVisibility(),
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

function geometryFingerprint(group) {
  if (!group) return null;
  const points = [];
  group.traverse?.((node) => {
    const position = node.geometry?.getAttribute?.('position');
    if (!position) return;
    for (let i = 0; i < position.count; i += 1) {
      points.push(
        Math.round(position.getX(i) * 1000) + ',' +
        Math.round(position.getY(i) * 1000) + ',' +
        Math.round(position.getZ(i) * 1000)
      );
    }
  });
  if (!points.length) return null;
  points.sort();
  let hash = 2166136261;
  for (const point of points) {
    for (let i = 0; i < point.length; i += 1) {
      hash ^= point.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
  }
  return points.length + ':' + (hash >>> 0).toString(16).padStart(8, '0');
}

function workshopDiagnosticSnapshot() {
  driverScene?.updateMatrixWorld?.(true);
  const shoeState = activeParts.shoes || {};
  let skinnedMeshCount = 0;
  let usesDriverSkeleton = Boolean(shoeState.group);
  const weightedBoneMatrices = {};

  shoeState.group?.traverse?.((node) => {
    if (!node.isSkinnedMesh) return;
    skinnedMeshCount += 1;
    const bones = node.skeleton?.bones || [];
    const weightedIndices = usedSkinBoneIndices(node);
    if (!weightedIndices.size) usesDriverSkeleton = false;

    for (const index of weightedIndices) {
      const bone = bones[index];
      if (!bone || driverSkeleton?.getBoneByName?.(bone.name) !== bone) {
        usesDriverSkeleton = false;
        continue;
      }
      weightedBoneMatrices[bone.name] = Array.from(bone.matrixWorld.elements);
    }
  });

  const parts = {};
  for (const part of PART_DEFINITIONS) {
    const state = activeParts[part.id] || {};
    const materialNames = new Set();
    state.group?.traverse?.((node) => {
      const raw = node.userData?.sourceMaterialName || node.material?.name || '';
      if (raw) materialNames.add(raw);
    });
    const weightedBoneNames = new Set();
    const boneWeightMaxima = {};
    state.group?.traverse?.((node) => {
      if (!node.isSkinnedMesh || !node.skeleton) return;
      for (const index of usedSkinBoneIndices(node)) {
        const bone = node.skeleton.bones[index];
        if (bone?.name) weightedBoneNames.add(bone.name);
      }
      for (const [name, weight] of Object.entries(skinBoneWeightMaxima(node))) {
        boneWeightMaxima[name] = Math.max(boneWeightMaxima[name] || 0, weight);
      }
    });
    const materialVisibility = {};
    const materialColors = {};
    state.group?.traverse?.((node) => {
      const raw = node.userData?.sourceMaterialName || node.material?.name || '';
      if (!raw || !node.material) return;
      const mats = Array.isArray(node.material) ? node.material : [node.material];
      materialVisibility[raw] = mats.some((material) => material?.visible !== false);
      const colourMaterial = mats.find((material) => material?.color);
      if (colourMaterial?.color) materialColors[raw] = '#' + colourMaterial.color.getHexString();
    });
    parts[part.id] = {
      optionId: state.optionId || null,
      sourceId: state.sourceId || null,
      wearableId: state.wearableId || null,
      materialNames: Array.from(materialNames).sort(),
      weightedBoneNames: Array.from(weightedBoneNames).sort(),
      boneWeightMaxima,
      geometryFingerprint: geometryFingerprint(state.group),
      visible: Boolean(state.group?.visible),
      materialVisibility,
      materialColors
    };
  }

  const rootBone = driverSkeleton?.getBoneByName?.('Bone') || null;
  return {
    presetId: currentPreset?.id || null,
    pose: activeClipName || '',
    rootBonePosition: rootBone ? rootBone.position.toArray() : null,
    parts,
    shoes: {
      optionId: shoeState.optionId || null,
      wearableId: shoeState.wearableId || null,
      directSkeletonBinding: Boolean(shoeState.group?.userData?.directSkeletonBinding),
      usesDriverSkeleton,
      skinnedMeshCount,
      weightedBoneMatrices
    }
  };
}

function characterScreenBounds() {
  if (!driverScene) return null;
  characterHolder.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(characterHolder);
  if (box.isEmpty()) return null;

  const corners = [];
  for (const x of [box.min.x, box.max.x]) {
    for (const y of [box.min.y, box.max.y]) {
      for (const z of [box.min.z, box.max.z]) corners.push(new THREE.Vector3(x, y, z));
    }
  }

  const rect = renderer.domElement.getBoundingClientRect();
  const projected = corners.map((point) => {
    point.project(camera);
    return {
      x: rect.left + (point.x * 0.5 + 0.5) * rect.width,
      y: rect.top + (-point.y * 0.5 + 0.5) * rect.height
    };
  });

  return {
    left: Math.min(...projected.map((point) => point.x)),
    right: Math.max(...projected.map((point) => point.x)),
    top: Math.min(...projected.map((point) => point.y)),
    bottom: Math.max(...projected.map((point) => point.y))
  };
}

function partScreenBounds(category) {
  const group = activeParts[category]?.group;
  if (!group) return null;
  group.updateWorldMatrix(true, true);
  const box = new THREE.Box3().setFromObject(group);
  if (box.isEmpty()) return null;
  const rect = renderer.domElement.getBoundingClientRect();
  const points = [];
  for (const x of [box.min.x, box.max.x]) {
    for (const y of [box.min.y, box.max.y]) {
      for (const z of [box.min.z, box.max.z]) {
        const point = new THREE.Vector3(x, y, z).project(camera);
        points.push({
          x: rect.left + (point.x * 0.5 + 0.5) * rect.width,
          y: rect.top + (-point.y * 0.5 + 0.5) * rect.height
        });
      }
    }
  }
  return {
    left: Math.min(...points.map((p) => p.x)),
    right: Math.max(...points.map((p) => p.x)),
    top: Math.min(...points.map((p) => p.y)),
    bottom: Math.max(...points.map((p) => p.y))
  };
}

function prepareVisualAudit(category = 'head') {
  mixer?.stopAllAction?.();
  mixer?.setTime?.(0);
  characterHolder.rotation.set(0, 0, 0);
  for (const part of PART_DEFINITIONS) {
    const group = activeParts[part.id]?.group;
    if (group) group.visible = part.id === category;
  }
  const group = activeParts[category]?.group;
  group?.traverse?.((node) => {
    if (!node.isMesh || !node.material) return;
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    for (const material of materials) {
      if (material.color) material.color.setHex(0xb8b8b8);
      if ('roughness' in material) material.roughness = 0.92;
      if ('metalness' in material) material.metalness = 0;
      material.needsUpdate = true;
    }
  });
  renderer.render(scene, camera);
  return partScreenBounds(category);
}

window.__GAMEBOX_CHARACTER_WORKSHOP__ = Object.freeze({
  snapshot: () => ({
    ...workshopDiagnosticSnapshot(),
    characterScreenBounds: characterScreenBounds(),
    visibleCharacterArea: visibleCharacterArea()
  }),
  buildPayload: () => buildPayload(),
  partScreenBounds,
  prepareVisualAudit
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
        clips = (gltf.animations || []).map(inPlacePreviewClip);
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
        if (pendingSavedVisibility) {
          applySavedVisibility(pendingSavedVisibility);
          pendingSavedVisibility = null;
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
        scheduleCharacterFrame(true);
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
  pendingSavedVisibility = saved.materialVisibility || null;
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
  activeBuilderTab = name;
  document.body.dataset.builderTab = name;
  document.querySelectorAll('.tabBtn').forEach((button) => button.classList.toggle('active', button.dataset.tab === name));
  document.querySelectorAll('.tabView').forEach((view) => view.classList.toggle('active', view.dataset.view === name));

  const buildMode = name === 'style';
  scene.background.set(buildMode ? 0x10a9d6 : 0xdbe8ed);
  if (scene.fog) scene.fog.color.set(buildMode ? 0x10a9d6 : 0xdbe8ed);
  decorRoot.visible = !buildMode;
  platformBase.visible = !buildMode;
  platformTop.visible = !buildMode;
  platformRing.visible = !buildMode;
  studioFloor.visible = !buildMode;
  if (buildMode && !componentEditorOpen) showAllComponents();
  resize();
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

function applyCameraPose() {
  const mobile = window.innerWidth <= 980;
  if (mobile) {
    camera.position.set(0, 1.40, viewDistance);
    camera.lookAt(0, 0.72, 0);
    return;
  }
  if (activeBuilderTab === 'style') {
    // One predictable reference-style composition: controls on the left,
    // full-body character framed prominently on the right.
    camera.position.set(0, 1.43, 3.95);
    camera.lookAt(0.62, 0.98, 0);
    return;
  }
  camera.position.set(previewRoot.position.x, 1.64, viewDistance);
  camera.lookAt(previewRoot.position.x, 1.16, 0);
}

function visibleCharacterArea() {
  const canvas = renderer.domElement.getBoundingClientRect();
  const mobile = window.innerWidth <= 980;
  if (!mobile) {
    if (activeBuilderTab === 'style') {
      return {
        top: canvas.top + 72,
        bottom: canvas.bottom - 34,
        left: canvas.left + canvas.width * 0.58,
        right: canvas.right - 24
      };
    }
    return {
      top: canvas.top + 56,
      bottom: canvas.bottom - 32,
      left: canvas.left + 36,
      right: canvas.right - 36
    };
  }

  const builderBox = $('builder')?.getBoundingClientRect?.();
  const selectorTop = builderBox?.top ?? canvas.bottom;
  return {
    top: canvas.top + 52,
    bottom: Math.min(canvas.bottom - 24, selectorTop - 28),
    left: canvas.left + 20,
    right: canvas.right - 20
  };
}

// Mobile deliberately uses a fixed Create-a-Sim style full-body composition.
// No iterative fit, centring or post-fit clamps: those were fighting each other
// and making the character jump/crop unpredictably between part changes.
function frameCharacterToVisibleArea(force = false) {
  if (!driverScene || window.innerWidth > 980) return;
  if (force) viewDistance = 7.35;
  previewRoot.position.set(0, 0.76, 0);
  applyCameraPose();
}

let characterFrameRaf = 0;
function scheduleCharacterFrame(force = false) {
  cancelAnimationFrame(characterFrameRaf);
  characterFrameRaf = requestAnimationFrame(() => frameCharacterToVisibleArea(force));
}

function resize() {
  const width = Math.max(1, window.innerWidth);
  const height = Math.max(1, window.innerHeight);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.fov = width <= 980 ? 38 : 35;
  camera.updateProjectionMatrix();

  const mobile = width <= 980;
  previewRoot.position.x = mobile ? 0 : (activeBuilderTab === 'style' ? 1.70 : -0.78);
  if (mobile) {
    previewRoot.position.y = 0.76;
  } else {
    previewRoot.position.y = 0;
  }
  applyCameraPose();
}

function resetView() {
  characterHolder.rotation.set(0, 0, 0);
  viewDistance = window.innerWidth <= 980 ? 7.35 : 6.55;
  previewRoot.position.y = window.innerWidth <= 980 ? 0.76 : 0;
  resize();
  scheduleCharacterFrame(true);
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
    const rawMaterial = String(hit.object.userData?.sourceMaterialName || hit.object.material?.name || '').toLowerCase();
    selectPartCategory(category);
    requestAnimationFrame(() => {
      if (!rawMaterial) return;
      const rows = Array.from(componentColourList?.querySelectorAll?.('.componentMaterialRow') || []);
      const row = rows.find((candidate) => String(candidate.dataset.materialNames || '').split('|').includes(rawMaterial));
      if (!row) return;
      row.classList.add('focused');
      row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      setTimeout(() => row.classList.remove('focused'), 1200);
    });
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
      viewDistance = THREE.MathUtils.clamp(viewDistance - (distance - lastPinchDistance) * 0.012, 3.35, 8.4);
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
  viewDistance = THREE.MathUtils.clamp(viewDistance + event.deltaY * 0.0045, 3.35, 8.4);
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
backToCategoriesBtn.addEventListener('click', showAllComponents);
partPrevBtn.addEventListener('click', () => cyclePart(activePartCategory, -1));
partNextBtn.addEventListener('click', () => cyclePart(activePartCategory, 1));
removePartBtn.addEventListener('click', async () => {
  const part = partDefinition();
  if (!part.optional) return;
  await setPart(part.id, null, { allowNone: true });
});
heightSlider.addEventListener('input', () => { readProportionControls(); updateSummary(); scheduleCharacterFrame(false); });
buildSlider.addEventListener('input', () => { readProportionControls(); updateSummary(); scheduleCharacterFrame(false); });
headSizeSlider.addEventListener('input', () => { readProportionControls(); updateSummary(); scheduleCharacterFrame(false); });
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

window.addEventListener('resize', () => {
  resize();
  scheduleCharacterFrame(false);
});
window.visualViewport?.addEventListener('resize', () => {
  resize();
  scheduleCharacterFrame(false);
});

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  if (mixer) mixer.update(dt);
  if (turntableToggle.checked) characterHolder.rotation.y += dt * 0.38;

  renderer.render(scene, camera);
}

async function bootstrap() {
  setActiveTab('style');
  componentEditorOpen = false;
  document.body.dataset.componentEditor = 'closed';
  renderPresetSelect();
  renderPartRows();
  renderPartCategoryRail();
  partBrowser.hidden = true;
  proportionPanel.hidden = true;
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
    pendingSavedVisibility = saved.materialVisibility || null;
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
