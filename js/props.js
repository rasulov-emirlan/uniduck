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

// hand-composed cutscene panels, used when no generated art exists
const CUT_FB = {};
function buildCutsceneFallbacks(titleImg) {
  // panel 1: apartment 4B bathroom at golden hour
  {
    const c = document.createElement('canvas');
    c.width = 640; c.height = 360;
    const x = c.getContext('2d');
    x.fillStyle = '#f0e2c4'; x.fillRect(0, 0, 640, 230);
    x.fillStyle = '#e3d2ac'; x.fillRect(0, 0, 640, 8);
    x.fillStyle = '#d9c9a8'; x.fillRect(0, 230, 640, 130);
    x.strokeStyle = '#c4b28c'; x.lineWidth = 2;
    for (let i = 0; i < 8; i++) { x.beginPath(); x.moveTo(i * 90 - 40, 230); x.lineTo(i * 90 + 10, 360); x.stroke(); }
    x.beginPath(); x.moveTo(0, 280); x.lineTo(640, 280); x.stroke();
    // window + sun
    x.fillStyle = '#8a6f4a'; x.fillRect(432, 36, 156, 130);
    x.fillStyle = '#ffe9b0'; x.fillRect(440, 44, 140, 114);
    x.fillStyle = '#ffd23f'; x.beginPath(); x.arc(552, 76, 22, 0, 7); x.fill();
    x.fillStyle = '#a8c98a'; x.fillRect(440, 128, 140, 30);
    x.fillStyle = '#8a6f4a'; x.fillRect(504, 44, 8, 114); x.fillRect(440, 96, 140, 8);
    x.globalAlpha = 0.28; x.fillStyle = '#ffe9b0';
    x.beginPath(); x.moveTo(440, 50); x.lineTo(250, 360); x.lineTo(420, 360); x.lineTo(560, 60); x.fill();
    x.globalAlpha = 1;
    // toilet (side view, the hero of this story)
    x.fillStyle = '#e8ecee';
    x.fillRect(150, 108, 56, 96);                    // tank
    x.fillStyle = '#f7fafb'; x.fillRect(150, 108, 56, 14);
    x.fillStyle = '#cfd8dc'; x.fillRect(150, 190, 56, 14);
    x.fillStyle = '#b8c4c9'; x.fillRect(162, 96, 32, 12);  // flush button
    x.fillStyle = '#f4f6f7';
    x.beginPath(); x.ellipse(230, 208, 78, 34, 0, 0, 7); x.fill();  // bowl rim
    x.fillStyle = '#e8ecee';
    x.beginPath(); x.ellipse(230, 214, 66, 26, 0, 0, 7); x.fill();
    x.fillStyle = '#d5dde0'; x.fillRect(196, 226, 62, 66);          // pedestal
    x.fillStyle = '#f4f6f7'; x.fillRect(196, 226, 14, 66);
    x.fillStyle = '#c3cdd2';
    x.beginPath(); x.ellipse(228, 296, 52, 14, 0, 0, 7); x.fill();  // base
    // heart above the toilet
    x.fillStyle = '#e6a2a8';
    x.font = 'bold 28px monospace'; x.fillText('♥', 214, 84);
    // towel + frame + plant
    x.fillStyle = '#8a6f4a'; x.fillRect(48, 96, 64, 6);
    x.fillStyle = '#ffd23f'; x.fillRect(56, 100, 48, 62);
    x.fillStyle = '#e0b62e'; x.fillRect(56, 100, 48, 10);
    x.fillStyle = '#8a6f4a'; x.fillRect(330, 60, 74, 58);
    x.fillStyle = '#9fd8ef'; x.fillRect(336, 66, 62, 46);
    x.fillStyle = '#7ac74f'; x.beginPath(); x.ellipse(367, 104, 26, 9, 0, 0, 7); x.fill();
    x.fillStyle = '#c96a08'; x.fillRect(586, 250, 40, 36);
    x.fillStyle = '#7ac74f';
    x.beginPath(); x.ellipse(606, 236, 26, 22, 0, 0, 7); x.fill();
    x.fillStyle = '#4e8a33';
    x.beginPath(); x.ellipse(594, 226, 12, 14, 0.4, 0, 7); x.fill();
    CUT_FB.cut1 = c;
  }
  // panel 2: the flush — falling through the pipe vortex
  {
    const c = document.createElement('canvas');
    c.width = 640; c.height = 360;
    const x = c.getContext('2d');
    x.fillStyle = '#070c22'; x.fillRect(0, 0, 640, 360);
    for (let i = 0; i < 26; i++) {
      const r = 300 - i * 11;
      x.strokeStyle = i % 2 ? 'rgba(74,157,187,0.5)' : 'rgba(30,60,110,0.6)';
      x.lineWidth = 10 - i * 0.3;
      x.beginPath();
      x.arc(320, 180, Math.max(6, r), i * 0.9, i * 0.9 + 4.2);
      x.stroke();
    }
    // pipes at the edges
    x.save();
    [[40, 40, 0.5], [590, 70, -0.6], [70, 320, -0.4], [580, 310, 0.5]].forEach(([px, py, a]) => {
      x.save(); x.translate(px, py); x.rotate(a);
      x.fillStyle = '#3a4148'; x.fillRect(-70, -16, 140, 32);
      x.fillStyle = '#4d565e'; x.fillRect(-70, -16, 140, 8);
      x.fillStyle = '#2b3238'; x.fillRect(-76, -20, 14, 40); x.fillRect(62, -20, 14, 40);
      x.restore();
    });
    x.restore();
    // droplets
    for (let i = 0; i < 40; i++) {
      x.fillStyle = 'rgba(159,216,239,' + (0.25 + Math.random() * 0.5) + ')';
      const a = Math.random() * Math.PI * 2, r = 60 + Math.random() * 240;
      x.fillRect(320 + Math.cos(a) * r, 180 + Math.sin(a) * r * 0.6, 3, 6 + Math.random() * 6);
    }
    // the duck-toilet, tumbling
    if (typeof SPRITES !== 'undefined' && SPRITES.duckDown) {
      const s = SPRITES.duckDown.idle;
      x.save();
      x.translate(320, 172); x.rotate(0.55);
      x.imageSmoothingEnabled = false;
      x.drawImage(s, -s.width * 0.9, -s.height * 0.9, s.width * 1.8, s.height * 1.8);
      x.restore();
      x.strokeStyle = 'rgba(159,216,239,0.5)'; x.lineWidth = 3;
      for (let i = 0; i < 5; i++) {
        x.beginPath();
        x.moveTo(240 + i * 40, 60); x.lineTo(220 + i * 40, 110);
        x.stroke();
      }
    }
    CUT_FB.cut2 = c;
  }
  // panel 3: alone in the dump — the title art is exactly this scene
  if (titleImg) CUT_FB.cut3 = titleImg;
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
