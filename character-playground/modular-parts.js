export const PART_DEFINITIONS = [
  { id: 'head', label: 'Head & face', optional: false },
  { id: 'hair', label: 'Hair / facial hair', optional: true },
  { id: 'headwear', label: 'Hat / headwear', optional: true },
  { id: 'top', label: 'Top / torso', optional: false },
  { id: 'bottom', label: 'Bottoms', optional: false },
  { id: 'shoes', label: 'Shoes / feet', optional: false },
  { id: 'accessory', label: 'Accessory', optional: true }
];

const HEAD_BONES = new Set(['Head', 'Neck']);
const TOP_BONES = new Set([
  'Torso', 'Abdomen',
  'Shoulder.L', 'UpperArm.L', 'LowerArm.L', 'Fist.L',
  'Shoulder.R', 'UpperArm.R', 'LowerArm.R', 'Fist.R'
]);
const BOTTOM_BONES = new Set(['Hips', 'UpperLeg.L', 'LowerLeg.L', 'UpperLeg.R', 'LowerLeg.R']);
const FOOT_BONES = new Set(['Foot.L', 'Foot.R']);

const HAIR_RE = /(hair|beard|moustache|mustache)/i;
const HEADWEAR_RE = /(hat|helmet|horn|hood|crown|cap)/i;
const SHOE_RE = /(shoe|boot)/i;
const ACCESSORY_RE = /(belt|scarf|buckle|cape|strap|apron|glove|pouch|bag|band)/i;

function cloneAttribute(THREE, attribute, vertexIndices) {
  const ArrayType = attribute.array?.constructor || Float32Array;
  const out = new ArrayType(vertexIndices.length * attribute.itemSize);
  for (let i = 0; i < vertexIndices.length; i += 1) {
    const src = vertexIndices[i] * attribute.itemSize;
    const dst = i * attribute.itemSize;
    for (let j = 0; j < attribute.itemSize; j += 1) out[dst + j] = attribute.array[src + j];
  }
  return new THREE.BufferAttribute(out, attribute.itemSize, attribute.normalized);
}

function geometryFromVertices(THREE, source, vertexIndices) {
  const geometry = new THREE.BufferGeometry();
  for (const [name, attribute] of Object.entries(source.attributes)) {
    if (!attribute?.array || !attribute.itemSize) continue;
    geometry.setAttribute(name, cloneAttribute(THREE, attribute, vertexIndices));
  }

  geometry.morphTargetsRelative = source.morphTargetsRelative;
  if (source.userData) geometry.userData = { ...source.userData };
  if (!geometry.getAttribute('normal') && geometry.getAttribute('position')) geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function materialAt(mesh, materialIndex) {
  if (Array.isArray(mesh.material)) return mesh.material[materialIndex] || mesh.material[0] || null;
  return mesh.material || null;
}

function scoreRegion(skinIndex, skinWeight, boneNames, vertices, names) {
  let score = 0;
  if (!skinIndex || !skinWeight) return score;

  for (const vertexIndex of vertices) {
    for (let slot = 0; slot < 4; slot += 1) {
      const jointIndex = skinIndex.array[vertexIndex * skinIndex.itemSize + slot];
      const weight = skinWeight.array[vertexIndex * skinWeight.itemSize + slot] || 0;
      if (weight <= 0) continue;
      if (names.has(boneNames[jointIndex])) score += weight;
    }
  }
  return score;
}

function classifyTriangle(nonIndexed, mesh, vertices, groupMaterialIndex, yMin, yRange) {
  const material = materialAt(mesh, groupMaterialIndex);
  const materialName = String(material?.name || '');
  if (HEADWEAR_RE.test(materialName)) return 'headwear';
  if (HAIR_RE.test(materialName)) return 'hair';
  if (SHOE_RE.test(materialName)) return 'shoes';
  if (ACCESSORY_RE.test(materialName)) return 'accessory';

  const position = nonIndexed.getAttribute('position');
  const skinIndex = nonIndexed.getAttribute('skinIndex');
  const skinWeight = nonIndexed.getAttribute('skinWeight');
  const boneNames = mesh.skeleton?.bones?.map((bone) => bone.name) || [];

  let meanY = 0;
  for (const vertexIndex of vertices) meanY += position.getY(vertexIndex);
  meanY /= vertices.length;
  const yNorm = yRange > 1e-6 ? (meanY - yMin) / yRange : 0.5;

  const scores = {
    head: scoreRegion(skinIndex, skinWeight, boneNames, vertices, HEAD_BONES),
    top: scoreRegion(skinIndex, skinWeight, boneNames, vertices, TOP_BONES),
    bottom: scoreRegion(skinIndex, skinWeight, boneNames, vertices, BOTTOM_BONES),
    shoes: scoreRegion(skinIndex, skinWeight, boneNames, vertices, FOOT_BONES)
  };

  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [winner, winnerScore] = ranked[0] || ['top', 0];

  if (winner === 'bottom' && yNorm < 0.16) return 'shoes';
  if (winnerScore > 0.01) return winner;

  if (yNorm > 0.72) return 'head';
  if (yNorm < 0.14) return 'shoes';
  if (yNorm < 0.48) return 'bottom';
  return 'top';
}

function splitMeshIntoTemplates(THREE, mesh) {
  const sourceGeometry = mesh.geometry?.index ? mesh.geometry.toNonIndexed() : mesh.geometry?.clone();
  if (!sourceGeometry?.getAttribute('position')) return {};

  sourceGeometry.computeBoundingBox();
  const bbox = sourceGeometry.boundingBox;
  const yMin = bbox?.min?.y ?? 0;
  const yRange = Math.max(1e-6, (bbox?.max?.y ?? 1) - yMin);

  const groups = sourceGeometry.groups?.length
    ? sourceGeometry.groups
    : [{ start: 0, count: sourceGeometry.getAttribute('position').count, materialIndex: 0 }];

  const buckets = new Map();

  for (const group of groups) {
    const end = Math.min(group.start + group.count, sourceGeometry.getAttribute('position').count);
    for (let start = group.start; start + 2 < end; start += 3) {
      const vertices = [start, start + 1, start + 2];
      const category = classifyTriangle(
        sourceGeometry,
        mesh,
        vertices,
        group.materialIndex || 0,
        yMin,
        yRange
      );
      const key = category + '::' + (group.materialIndex || 0);
      if (!buckets.has(key)) {
        buckets.set(key, {
          category,
          materialIndex: group.materialIndex || 0,
          vertices: []
        });
      }
      buckets.get(key).vertices.push(...vertices);
    }
  }

  const templates = {};
  for (const bucket of buckets.values()) {
    if (!bucket.vertices.length) continue;
    const material = materialAt(mesh, bucket.materialIndex);
    if (!material) continue;
    const template = {
      geometry: geometryFromVertices(THREE, sourceGeometry, bucket.vertices),
      material: material.clone(),
      bindMatrix: mesh.bindMatrix.clone(),
      bindMode: mesh.bindMode,
      position: mesh.position.clone(),
      quaternion: mesh.quaternion.clone(),
      scale: mesh.scale.clone(),
      sourceMeshName: mesh.name || 'Body',
      materialName: material.name || ''
    };
    (templates[bucket.category] ||= []).push(template);
  }

  if (sourceGeometry !== mesh.geometry) sourceGeometry.dispose();
  return templates;
}

function disposeSourceScene(scene) {
  scene?.traverse((node) => {
    if (node.geometry?.dispose) node.geometry.dispose();
    const materials = Array.isArray(node.material) ? node.material : node.material ? [node.material] : [];
    for (const material of materials) material?.dispose?.();
  });
}

export function createModularPartSystem(THREE, loader, catalog) {
  const entryById = new Map(catalog.map((entry) => [entry.id, entry]));
  const templateCache = new Map();

  async function buildTemplates(entryId) {
    if (templateCache.has(entryId)) return templateCache.get(entryId);
    const entry = entryById.get(entryId);
    if (!entry) throw new Error('Unknown character source: ' + entryId);

    const promise = new Promise((resolve, reject) => {
      loader.load(
        entry.path + '?parts=2',
        (gltf) => {
          try {
            const combined = {
              entry,
              animations: gltf.animations || [],
              categories: Object.fromEntries(PART_DEFINITIONS.map((part) => [part.id, []]))
            };

            gltf.scene.traverse((node) => {
              if (!node.isSkinnedMesh) return;
              const templates = splitMeshIntoTemplates(THREE, node);
              for (const [category, items] of Object.entries(templates)) {
                combined.categories[category].push(...items);
              }
            });

            disposeSourceScene(gltf.scene);
            resolve(combined);
          } catch (error) {
            reject(error);
          }
        },
        undefined,
        reject
      );
    });

    templateCache.set(entryId, promise);
    return promise;
  }

  async function hasPart(entryId, category) {
    const templates = await buildTemplates(entryId);
    return Boolean(templates.categories[category]?.length);
  }

  async function instantiate(entryId, category, skeleton) {
    const source = await buildTemplates(entryId);
    const templates = source.categories[category] || [];
    if (!templates.length) return null;

    const group = new THREE.Group();
    group.name = 'Part:' + category + ':' + entryId;
    group.userData.partCategory = category;
    group.userData.sourceId = entryId;

    for (const template of templates) {
      const material = template.material.clone();
      const piece = new THREE.SkinnedMesh(template.geometry.clone(), material);
      piece.name = template.sourceMeshName + ':' + category;
      piece.castShadow = true;
      piece.receiveShadow = true;
      piece.bindMode = template.bindMode;
      piece.position.copy(template.position);
      piece.quaternion.copy(template.quaternion);
      piece.scale.copy(template.scale);
      piece.bind(skeleton, template.bindMatrix.clone());
      piece.userData.originalColor = material.color ? '#' + material.color.getHexString() : null;
      piece.userData.sourceMaterialName = template.materialName;
      group.add(piece);
    }

    return group;
  }

  function compatibleEntries(rig) {
    return catalog.filter((entry) => entry.rig === rig);
  }

  return {
    buildTemplates,
    hasPart,
    instantiate,
    compatibleEntries,
    clearCache() {
      for (const promise of templateCache.values()) {
        Promise.resolve(promise).then((source) => {
          for (const items of Object.values(source.categories || {})) {
            for (const template of items) {
              template.geometry?.dispose?.();
              template.material?.dispose?.();
            }
          }
        }).catch(() => {});
      }
      templateCache.clear();
    }
  };
}
