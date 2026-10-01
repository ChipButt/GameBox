(() => {
  'use strict';

  const encoded = (window.__CUTE_ELF_PACKED || []).join('');
  const api = { data: null, cache: new Map(), ready: null };

  async function inflate() {
    if (!encoded) throw new Error('Christmas elf sprite data is missing.');
    if (typeof DecompressionStream === 'undefined') {
      throw new Error('This browser does not support the built-in gzip decoder.');
    }
    const raw = atob(encoded);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  function u16(bytes, offset) {
    return bytes[offset] | (bytes[offset + 1] << 8);
  }

  function isBackgroundCandidate(r, g, b, a) {
    if (!a) return false;
    const spread = Math.max(r, g, b) - Math.min(r, g, b);
    // Flat mid-greys used by the unwanted baked background.
    if (spread <= 6 && r >= 90 && r <= 160 && g >= 90 && g <= 160 && b >= 90 && b <= 160) return true;
    // Pale blue-grey blocks that occur in the same bad walking-set backgrounds.
    if (r >= 140 && r <= 190 && g >= 160 && g <= 210 && b >= 190 && b <= 235) return true;
    return false;
  }

  function removeBakedBackground(image, width, height) {
    const data = image.data;
    const seen = new Uint8Array(width * height);
    const stack = new Int32Array(width * height);
    const component = new Int32Array(width * height);

    const candidateAt = (index) => {
      const q = index * 4;
      return isBackgroundCandidate(data[q], data[q + 1], data[q + 2], data[q + 3]);
    };

    for (let start = 0; start < width * height; start += 1) {
      if (seen[start] || !candidateAt(start)) continue;

      let stackSize = 0;
      let componentSize = 0;
      stack[stackSize++] = start;
      seen[start] = 1;

      while (stackSize) {
        const index = stack[--stackSize];
        component[componentSize++] = index;
        const x = index % width;
        const y = (index / width) | 0;

        if (x > 0) {
          const n = index - 1;
          if (!seen[n] && candidateAt(n)) { seen[n] = 1; stack[stackSize++] = n; }
        }
        if (x + 1 < width) {
          const n = index + 1;
          if (!seen[n] && candidateAt(n)) { seen[n] = 1; stack[stackSize++] = n; }
        }
        if (y > 0) {
          const n = index - width;
          if (!seen[n] && candidateAt(n)) { seen[n] = 1; stack[stackSize++] = n; }
        }
        if (y + 1 < height) {
          const n = index + width;
          if (!seen[n] && candidateAt(n)) { seen[n] = 1; stack[stackSize++] = n; }
        }
      }

      // Only remove large connected regions. Small greys/blues in the elf itself stay untouched.
      if (componentSize >= 180) {
        for (let i = 0; i < componentSize; i += 1) {
          data[component[i] * 4 + 3] = 0;
        }
      }
    }
  }

  function buildFrame(frameIndex) {
    if (api.cache.has(frameIndex)) return api.cache.get(frameIndex);
    const { width, height, palette, indicesOffset, bytes } = api.data;
    const frameCount = 56;
    const safeIndex = ((frameIndex % frameCount) + frameCount) % frameCount;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    const image = ctx.createImageData(width, height);
    const out = image.data;
    const pixels = width * height;
    let p = indicesOffset + safeIndex * pixels * 2;

    for (let i = 0; i < pixels; i += 1, p += 2) {
      const paletteIndex = u16(bytes, p);
      if (paletteIndex === 65535) continue;
      const [r, g, b] = palette[paletteIndex];
      const q = i * 4;
      out[q] = r;
      out[q + 1] = g;
      out[q + 2] = b;
      out[q + 3] = 255;
    }

    removeBakedBackground(image, width, height);
    ctx.putImageData(image, 0, 0);
    api.cache.set(safeIndex, canvas);
    return canvas;
  }

  const directions = ['south','south-east','east','north-east','north','north-west','west','south-west'];

  api.rotation = (direction) => {
    const index = directions.indexOf(direction);
    return buildFrame(index < 0 ? 0 : index);
  };

  api.walk = (direction, frame = 0) => {
    const row = { south: 1, east: 2, north: 3, west: 4 }[direction];
    return row == null ? api.rotation(direction) : buildFrame(row * 8 + (((frame % 8) + 8) % 8));
  };

  api.idle = (direction, frame = 0) => {
    const row = { south: 5, north: 6 }[direction];
    return row == null ? api.rotation(direction) : buildFrame(row * 8 + (((frame % 8) + 8) % 8));
  };

  api.ready = inflate().then((bytes) => {
    const width = u16(bytes, 0);
    const height = u16(bytes, 2);
    const paletteCount = u16(bytes, 4);
    const palette = [];
    let offset = 6;
    for (let i = 0; i < paletteCount; i += 1, offset += 3) {
      palette.push([bytes[offset], bytes[offset + 1], bytes[offset + 2]]);
    }
    const expected = offset + 56 * width * height * 2;
    if (bytes.length !== expected) throw new Error('Coded elf sprite data failed its integrity check.');
    api.data = { width, height, palette, indicesOffset: offset, bytes, frameCount: 56 };
    window.__CUTE_ELF_PACKED = null;
    return api;
  });

  window.CuteElfSprite = api;
})();