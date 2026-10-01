(() => {
  'use strict';

  const chunks = window.__GUARD_CHUNKS || [];
  const encoded = chunks.join('');
  const api = { data: null, cache: new Map(), ready: null };

  function rgb(hex) {
    const h = String(hex).replace('#', '');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }

  async function inflate() {
    if (!encoded) throw new Error('Museum guard sprite data is missing.');
    if (typeof DecompressionStream === 'undefined') {
      throw new Error('This browser does not support the built-in gzip decoder required by this sprite.');
    }
    const raw = atob(encoded);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    const json = await new Response(stream).text();
    return JSON.parse(json);
  }

  function buildCanvas(key) {
    if (api.cache.has(key)) return api.cache.get(key);
    const encodedFrame = api.data.frames[key];
    if (!encodedFrame) return null;

    const canvas = document.createElement('canvas');
    canvas.width = api.data.width;
    canvas.height = api.data.height;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    const image = ctx.createImageData(canvas.width, canvas.height);
    const out = image.data;
    const inv = api.inv;

    for (let i = 0; i < encodedFrame.length; i += 5) {
      const y = inv[encodedFrame[i]];
      const x0 = inv[encodedFrame[i + 1]];
      const len = inv[encodedFrame[i + 2]] + 1;
      const paletteIndex = inv[encodedFrame[i + 3]] * 64 + inv[encodedFrame[i + 4]];
      const [r, g, b] = api.rgb[paletteIndex];
      for (let x = x0; x < x0 + len; x += 1) {
        const q = (y * canvas.width + x) * 4;
        out[q] = r;
        out[q + 1] = g;
        out[q + 2] = b;
        out[q + 3] = 255;
      }
    }

    ctx.putImageData(image, 0, 0);
    api.cache.set(key, canvas);
    return canvas;
  }

  api.getKeys = (action, direction) => api.data?.animations?.[action]?.[direction] || [];
  api.has = (action, direction) => api.getKeys(action, direction).length > 0;
  api.count = (action, direction) => api.getKeys(action, direction).length;
  api.frame = (action, direction, index = 0) => {
    const keys = api.getKeys(action, direction);
    if (!keys.length) return null;
    const frameIndex = ((index % keys.length) + keys.length) % keys.length;
    return buildCanvas(keys[frameIndex]);
  };

  api.ready = inflate().then((data) => {
    api.data = data;
    api.inv = Object.fromEntries([...data.alphabet].map((char, index) => [char, index]));
    api.rgb = data.palette.map(rgb);
    window.__GUARD_CHUNKS = null;
    return api;
  });

  window.MuseumGuardSprite = api;
})();
