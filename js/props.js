'use strict';

// agy-generated art: props are rendered on solid magenta and chroma-keyed here,
// then downsampled to chunky pixel scale so they sit next to the procedural sprites.
const PROPS = {};

const PROP_DEFS = [
  { name: 'dumpster', src: 'assets/src/dumpster.png', w: 116, key: true },
  { name: 'vendy', src: 'assets/src/vendy.png', w: 82, key: true },
  { name: 'trashpile', src: 'assets/src/trashpile.png', w: 76, key: true },
  { name: 'trashbag', src: 'assets/src/trashbag.png', w: 46, key: true },
  { name: 'lamppost', src: 'assets/src/lamppost.png', w: 52, key: true },
  { name: 'throne', src: 'assets/src/throne.png', w: 190, key: true },
  { name: 'grate', src: 'assets/src/grate.png', w: 118, key: true },
  { name: 'cut1', src: 'assets/src/cut1.png', w: 0, key: false },
  { name: 'cut2', src: 'assets/src/cut2.png', w: 0, key: false },
  { name: 'cut3', src: 'assets/src/cut3.png', w: 0, key: false },
];

function chromaKey(img) {
  const c = document.createElement('canvas');
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  const x = c.getContext('2d');
  x.drawImage(img, 0, 0);
  const id = x.getImageData(0, 0, c.width, c.height);
  const d = id.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    if (r > 120 && b > 120 && g < Math.min(r, b) * 0.55 && Math.abs(r - b) < 110) d[i + 3] = 0;
  }
  // bounding box crop
  let minX = c.width, minY = c.height, maxX = 0, maxY = 0;
  for (let y = 0; y < c.height; y++) for (let xx = 0; xx < c.width; xx++) {
    if (d[(y * c.width + xx) * 4 + 3] > 40) {
      if (xx < minX) minX = xx; if (xx > maxX) maxX = xx;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
  }
  if (maxX <= minX || maxY <= minY) { minX = 0; minY = 0; maxX = c.width - 1; maxY = c.height - 1; }
  x.putImageData(id, 0, 0);
  const cw = maxX - minX + 1, ch = maxY - minY + 1;
  const out = document.createElement('canvas');
  out.width = cw; out.height = ch;
  out.getContext('2d').drawImage(c, minX, minY, cw, ch, 0, 0, cw, ch);
  return out;
}

function pixelize(srcCanvas, targetW) {
  const ratio = srcCanvas.height / srcCanvas.width;
  const smallW = Math.max(8, Math.round(targetW / 2));
  const smallH = Math.max(8, Math.round(smallW * ratio));
  const small = document.createElement('canvas');
  small.width = smallW; small.height = smallH;
  const sx = small.getContext('2d');
  sx.imageSmoothingEnabled = true;
  sx.drawImage(srcCanvas, 0, 0, smallW, smallH);
  const id = sx.getImageData(0, 0, smallW, smallH);
  const d = id.data;
  for (let i = 3; i < d.length; i += 4) d[i] = d[i] > 110 ? 255 : 0;
  sx.putImageData(id, 0, 0);
  const out = document.createElement('canvas');
  out.width = targetW; out.height = Math.round(targetW * ratio);
  const ox = out.getContext('2d');
  ox.imageSmoothingEnabled = false;
  ox.drawImage(small, 0, 0, out.width, out.height);
  return out;
}

function loadProps() {
  PROP_DEFS.forEach(def => {
    const img = new Image();
    img.onload = () => {
      try {
        if (!def.key) { PROPS[def.name] = img; return; }
        PROPS[def.name] = pixelize(chromaKey(img), def.w);
      } catch (e) { /* fall back to procedural */ }
    };
    img.onerror = () => { /* fall back to procedural */ };
    img.src = def.src;
  });
}
