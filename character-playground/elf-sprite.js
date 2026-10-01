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