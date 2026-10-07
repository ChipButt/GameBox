export const PART_DEFINITIONS = [
  { id: 'head', label: 'Head & face', optional: false },
  { id: 'hair', label: 'Hair / facial hair', optional: true },
  { id: 'headwear', label: 'Hat / headwear', optional: true },
  { id: 'top', label: 'Top / body', optional: false },
  { id: 'bottom', label: 'Bottoms / legs', optional: false },
  { id: 'shoes', label: 'Shoes', optional: false },
  { id: 'accessory', label: 'Accessory', optional: true }
];

export const PART_SOURCE_HINTS = {
  hair: ["BlueSoldier_Female","Casual2_Female","Casual2_Male","Casual3_Female","Casual3_Male","Casual_Female","Casual_Male","Chef_Female","Chef_Hat","Chef_Male","Cowboy_Female","Cowboy_Hair","Cowboy_Male","Doctor_Female_Old","Doctor_Female_Young","Doctor_Male_Old","Doctor_Male_Young","Goblin_Female","Kimono_Female","Knight_Golden_Female","Ninja_Female","Ninja_Male_Hair","Ninja_Sand_Female","OldClassy_Female","OldClassy_Male","Pirate_Female","Soldier_Female","Suit_Female","Suit_Male","VikingHelmet","Viking_Female","Viking_Male","Witch","Wizard","Worker_Female","Zombie_Female"],
  headwear: ["BlueSoldier_Male","Chef_Hat","Cowboy_Female","Cowboy_Hair","Cowboy_Male","Elf","OldClassy_Female","OldClassy_Male","Soldier_Male","VikingHelmet","Witch","Wizard","Worker_Female","Worker_Male"],
  accessory: ["Casual2_Female","Casual2_Male","Casual3_Female","Casual3_Male","Casual_Bald","Casual_Female","Casual_Male","Chef_Female","Chef_Hat","Chef_Male","Cow","Cowboy_Female","Cowboy_Hair","Cowboy_Male","Elf","Kimono_Female","Kimono_Male","OldClassy_Female","OldClassy_Male","Pug","Suit_Female","Suit_Male","Witch","Wizard"]
};

export function sourceEntriesForPart(category, catalog) {
  const ids = PART_SOURCE_HINTS[category];
  if (!ids) return catalog.slice();
  const wanted = new Set(ids);
  return catalog.filter((entry) => wanted.has(entry.id));
}

function runtimeBoneSet(names) {
  const set = new Set();
  for (const name of names) {
    set.add(name);
    set.add(name.replace(/\./g, ''));
  }
  return set;
}

const HEAD_BONES = runtimeBoneSet(['Head', 'Neck']);
const ARM_BONES = runtimeBoneSet([
  'Shoulder.L', 'UpperArm.L', 'LowerArm.L', 'Fist.L',
  'Shoulder.R', 'UpperArm.R', 'LowerArm.R', 'Fist.R'
]);
const TOP_BONES = runtimeBoneSet([
  'Torso', 'Abdomen',
  'Shoulder.L', 'UpperArm.L', 'LowerArm.L', 'Fist.L',
  'Shoulder.R', 'UpperArm.R', 'LowerArm.R', 'Fist.R'
]);
const BOTTOM_BONES = runtimeBoneSet(['Hips', 'UpperLeg.L', 'LowerLeg.L', 'UpperLeg.R', 'LowerLeg.R']);
const FOOT_BONES = runtimeBoneSet(['Foot.L', 'Foot.R']);

const HAIR_RE = /(hair|beard|moustache|mustache)/i;
const HEADWEAR_RE = /(hat|helmet|horn|hood|crown|cap)/i;
const SHOE_RE = /(shoe|boot)/i;
const ACCESSORY_RE = /(belt|scarf|buckle|cape|strap|apron|glove|pouch|bag|band)/i;
const HEAD_BASE_RE = /^(skin|face|teeth|brain|black_head|white|pink|beige|brown)$/i;

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

function maxRegionWeight(skinIndex, skinWeight, boneNames, vertices, names) {
  let maxWeight = 0;
  if (!skinIndex || !skinWeight) return maxWeight;
  for (const vertexIndex of vertices) {
    for (let slot = 0; slot < 4; slot += 1) {
      const jointIndex = skinIndex.array[vertexIndex * skinIndex.itemSize + slot];
      const weight = skinWeight.array[vertexIndex * skinWeight.itemSize + slot] || 0;
      if (names.has(boneNames[jointIndex])) maxWeight = Math.max(maxWeight, weight);
    }
  }
  return maxWeight;
}

function classifyTriangle(nonIndexed, mesh, vertices, groupMaterialIndex, yMin, yRange) {
  const material = materialAt(mesh, groupMaterialIndex);
  const materialName = String(material?.name || '');
  if (HEADWEAR_RE.test(materialName)) return 'headwear';
  if (HAIR_RE.test(materialName)) return 'hair';
  if (SHOE_RE.test(materialName)) return null;
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

  if (winner === 'shoes') return null;
  if (winner === 'head') {
    if (!HEAD_BASE_RE.test(materialName)) return 'top';
    const armWeight = maxRegionWeight(skinIndex, skinWeight, boneNames, vertices, ARM_BONES);
    const otherBodyScore = Math.max(scores.top, scores.bottom, scores.shoes);
    const clearlyHeadDriven = scores.head >= 1.20 && scores.head > otherBodyScore * 1.15;
    const noMeaningfulArmInfluence = armWeight < 0.08;
    return clearlyHeadDriven && noMeaningfulArmInfluence ? 'head' : 'top';
  }
  if (winnerScore > 0.01) return winner;

  // Never create a Head from position alone. If skinning did not identify Head/Neck,
  // the triangle belongs with the body rather than being guessed into the head.
  if (yNorm > 0.72) return 'top';
  if (yNorm < 0.14) return null;
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
      if (!category) continue;
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
        entry.path + '?parts=4',
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
