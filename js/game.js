'use strict';

const VIEW_W = 960, VIEW_H = 540;
const T = 48;
const MAP_W = 48, MAP_H = 30;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

// ---------- save ----------
const SAVE_KEY = 'uniduck-save-v2';
const defaultSave = () => ({
  v: 2, maxHp: 6, dmg: 1, spdMult: 1, quack: false, scrap: 0,
  bossDead: false, ended: false,
  buys: { hp: 0, dmg: 0, spd: 0 },
  quest: 0, hasSandwich: false, questHp: false,
  lore: [false, false, false],
  stats: { scrapTotal: 0, deaths: 0, timePlayed: 0 },
  seenIntro: false, metGerald: false,
});
let save = defaultSave();
function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      save = Object.assign(defaultSave(), parsed);
      save.buys = Object.assign({ hp: 0, dmg: 0, spd: 0 }, parsed.buys);
      save.stats = Object.assign({ scrapTotal: 0, deaths: 0, timePlayed: 0 }, parsed.stats);
    }
  } catch (e) { save = defaultSave(); }
}
function writeSave() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {}
}

// ---------- world ----------
let grid, objectSolid;
const dumpsters = [], piles = [], puddles = [];
const LAMPS = [{ x: 7.5 * T, y: 22.5 * T }, { x: 25.5 * T, y: 17.5 * T }, { x: 36.5 * T, y: 24.5 * T }];
let grateTiles = [], gateTiles = [];
let gateClosed = false;

function setSolid(tx, ty) { if (ty >= 0 && ty < MAP_H && tx >= 0 && tx < MAP_W) objectSolid[ty][tx] = true; }

function buildWorld() {
  grid = []; objectSolid = [];
  for (let y = 0; y < MAP_H; y++) {
    grid.push(new Array(MAP_W).fill(0));
    objectSolid.push(new Array(MAP_W).fill(false));
  }
  for (let x = 0; x < MAP_W; x++) { grid[0][x] = 1; grid[MAP_H - 1][x] = 1; }
  for (let y = 0; y < MAP_H; y++) { grid[y][0] = 1; grid[y][MAP_W - 1] = 1; }

  for (let y = 1; y <= 12; y++) grid[y][31] = 1;
  for (let x = 31; x <= 46; x++) grid[12][x] = 1;
  gateTiles = [[31, 6], [31, 7], [31, 8]];
  gateTiles.forEach(([x, y]) => grid[y][x] = 6);
  grateTiles = [[44, 2], [45, 2]];
  grateTiles.forEach(([x, y]) => grid[y][x] = 5);

  const dspots = [[5, 4], [13, 7], [25, 4], [8, 15], [20, 20], [36, 20], [28, 14], [42, 24], [3, 21]];
  dspots.forEach(([x, y]) => {
    dumpsters.push({ x, y });
    setSolid(x, y); setSolid(x + 1, y); setSolid(x, y + 1); setSolid(x + 1, y + 1);
  });
  const pspots = [[10, 10], [17, 14], [23, 25], [31, 22], [38, 15], [15, 25], [27, 9], [44, 17], [6, 9], [33, 26]];
  pspots.forEach(([x, y]) => { piles.push({ x, y }); setSolid(x, y); });
  [[12, 18, 3, 2], [30, 25, 4, 2], [22, 11, 2, 2], [40, 14, 3, 2]].forEach(([x, y, w, h]) => puddles.push({ x, y, w, h }));

  vendy.x = 22.5 * T; vendy.y = 16 * T;
  setSolid(22, 15); setSolid(23, 15);
  gerald.x = 9.5 * T; gerald.y = 24.5 * T;
}

function tileSolid(tx, ty) {
  if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return true;
  const g = grid[ty][tx];
  if (g === 1 || g === 5) return true;
  if (g === 6 && gateClosed) return true;
  return objectSolid[ty][tx];
}

function boxFree(x, y, half) {
  const x0 = Math.floor((x - half) / T), x1 = Math.floor((x + half) / T);
  const y0 = Math.floor((y - half) / T), y1 = Math.floor((y + half) / T);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (tileSolid(tx, ty)) return false;
  return true;
}

function moveEntity(e, dx, dy, half) {
  if (dx !== 0 && boxFree(e.x + dx, e.y, half)) e.x += dx;
  if (dy !== 0 && boxFree(e.x, e.y + dy, half)) e.y += dy;
}

function inPuddle(x, y) {
  const tx = Math.floor(x / T), ty = Math.floor(y / T);
  return puddles.some(p => tx >= p.x && tx < p.x + p.w && ty >= p.y && ty < p.y + p.h);
}

// ---------- background pre-render ----------
let bgCanvas;
function renderBackground() {
  bgCanvas = document.createElement('canvas');
  bgCanvas.width = MAP_W * T; bgCanvas.height = MAP_H * T;
  const b = bgCanvas.getContext('2d');
  b.imageSmoothingEnabled = false;

  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
    b.fillStyle = (x + y) % 2 ? '#43474a' : '#464a4d';
    b.fillRect(x * T, y * T, T, T);
    for (let i = 0; i < 6; i++) {
      b.fillStyle = ['#3d4144', '#4c5054', '#494d43', '#404a4e'][Math.floor(Math.random() * 4)];
      b.fillRect(x * T + (Math.random() * T | 0), y * T + (Math.random() * T | 0), 2 + (Math.random() * 3 | 0), 2 + (Math.random() * 3 | 0));
    }
    if (Math.random() < 0.07) {
      b.fillStyle = 'rgba(30,34,30,0.5)';
      b.beginPath();
      b.ellipse(x * T + T / 2, y * T + T / 2, 8 + Math.random() * 14, 5 + Math.random() * 8, 0, 0, 7);
      b.fill();
    }
    if (Math.random() < 0.04) {
      b.strokeStyle = 'rgba(25,28,30,0.7)'; b.lineWidth = 2;
      b.beginPath();
      let cx = x * T + Math.random() * T, cy = y * T + Math.random() * T;
      b.moveTo(cx, cy);
      for (let s = 0; s < 3; s++) { cx += Math.random() * 24 - 12; cy += Math.random() * 24 - 12; b.lineTo(cx, cy); }
      b.stroke();
    }
    if (Math.random() < 0.03) {
      b.fillStyle = 'rgba(210,205,190,0.5)';
      b.save();
      b.translate(x * T + T / 2, y * T + T / 2);
      b.rotate(Math.random() * 3);
      b.fillRect(-6, -4, 12, 8);
      b.restore();
    }
  }

  // worn path spawn -> vendy -> gate
  const path = [[4.5, 26], [9, 24], [16, 20], [22.5, 17.5], [28, 12], [31.5, 7.5]];
  b.fillStyle = 'rgba(120,118,105,0.10)';
  for (let i = 0; i < path.length - 1; i++) {
    const [ax, ay] = path[i], [bx, by] = path[i + 1];
    for (let s = 0; s < 14; s++) {
      const f = s / 14;
      b.beginPath();
      b.ellipse((ax + (bx - ax) * f) * T, (ay + (by - ay) * f) * T, 26 + Math.random() * 8, 16, 0, 0, 7);
      b.fill();
    }
  }

  // tire tracks
  b.strokeStyle = 'rgba(20,22,24,0.45)'; b.lineWidth = 5;
  for (const off of [0, 26]) {
    b.beginPath();
    b.moveTo(2 * T, (12.2) * T + off);
    b.bezierCurveTo(12 * T, 11.4 * T + off, 20 * T, 13.6 * T + off, 30 * T, 12.6 * T + off);
    b.stroke();
  }

  // manhole cover
  b.fillStyle = '#3a3e41';
  b.beginPath(); b.arc(18.5 * T, 8.5 * T, 20, 0, 7); b.fill();
  b.strokeStyle = '#2c3033'; b.lineWidth = 3;
  b.beginPath(); b.arc(18.5 * T, 8.5 * T, 20, 0, 7); b.stroke();
  b.beginPath(); b.arc(18.5 * T, 8.5 * T, 12, 0, 7); b.stroke();

  puddles.forEach(p => {
    b.fillStyle = '#2c4a42';
    b.beginPath();
    b.ellipse((p.x + p.w / 2) * T, (p.y + p.h / 2) * T, p.w * T * 0.52, p.h * T * 0.5, 0, 0, 7);
    b.fill();
    b.fillStyle = '#3a615a';
    b.beginPath();
    b.ellipse((p.x + p.w / 2) * T - 8, (p.y + p.h / 2) * T - 6, p.w * T * 0.3, p.h * T * 0.25, 0, 0, 7);
    b.fill();
  });

  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
    const g = grid[y][x];
    if (g === 1) {
      b.fillStyle = '#23272b';
      b.fillRect(x * T, y * T, T, T);
      b.strokeStyle = '#3d434a'; b.lineWidth = 2;
      for (let i = 0; i < T; i += 12) {
        b.beginPath(); b.moveTo(x * T + i, y * T); b.lineTo(x * T + i - T, y * T + T); b.stroke();
        b.beginPath(); b.moveTo(x * T + i, y * T); b.lineTo(x * T + i + T, y * T + T); b.stroke();
      }
      b.fillStyle = '#565d66';
      if (x % 3 === 0) b.fillRect(x * T + T / 2 - 3, y * T, 6, T);
      b.fillStyle = '#454b52';
      b.fillRect(x * T, y * T, T, 5);
    } else if (g === 5) {
      b.fillStyle = '#181c1f'; b.fillRect(x * T, y * T, T, T);
      b.fillStyle = '#31383d';
      for (let i = 6; i < T; i += 12) b.fillRect(x * T + i, y * T + 4, 6, T - 8);
      b.strokeStyle = '#4a5258'; b.lineWidth = 3;
      b.strokeRect(x * T + 2, y * T + 2, T - 4, T - 4);
    }
  }

  b.fillStyle = 'rgba(230,57,70,0.9)';
  b.font = 'bold 22px monospace';
  b.save();
  b.translate(6.9 * T, 3.6 * T); b.rotate(-0.08);
  b.fillText('KEEP OUT', 0, 0);
  b.restore();
  b.fillStyle = 'rgba(199,180,88,0.75)';
  b.font = 'bold 18px monospace';
  b.save();
  b.translate(27.2 * T, 10.5 * T); b.rotate(0.06);
  b.fillText('KING RULZ >>', 0, 0);
  b.restore();
}

// ---------- input ----------
const keys = {};
const input = { ax: 0, ay: 0, attack: false, dash: false, quack: false, interact: false };
let anyKeyFlag = false;

const KEYMAP = {
  KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
  KeyJ: 'attack', KeyZ: 'attack', Space: 'attack',
  KeyK: 'dash', KeyX: 'dash', ShiftLeft: 'dash', ShiftRight: 'dash',
  KeyQ: 'quack', KeyL: 'quack',
  KeyE: 'interact', Enter: 'interact',
};

window.addEventListener('keydown', e => {
  if (e.repeat) return;
  Sfx.unlock();
  anyKeyFlag = true;
  const k = KEYMAP[e.code];
  if (k) { keys[k] = true; input[k] = true; e.preventDefault(); }
  if (state === 'shop') shopKey(e.code);
  if (e.code === 'Escape') {
    if (state === 'shop') closeShop();
    else if (state === 'cutscene') finishCutscene();
  }
  if (e.code === 'KeyM') {
    const m = Music.toggleMute();
    floatText(player.x, player.y - 70, m ? 'music off' : 'music on', '#9fd8ef');
  }
});
window.addEventListener('keyup', e => {
  const k = KEYMAP[e.code];
  if (k) keys[k] = false;
});

function pollAxes() {
  let ax = 0, ay = 0;
  if (keys.left) ax -= 1;
  if (keys.right) ax += 1;
  if (keys.up) ay -= 1;
  if (keys.down) ay += 1;
  if (touch.active && (touch.jx || touch.jy)) { ax = touch.jx; ay = touch.jy; }
  const m = Math.hypot(ax, ay);
  if (m > 1) { ax /= m; ay /= m; }
  input.ax = ax; input.ay = ay;
}

const touch = { active: false, jx: 0, jy: 0, joyId: null, joyOx: 0, joyOy: 0 };
function setupTouch() {
  const zone = document.getElementById('joyzone');
  const knob = document.getElementById('joyknob');
  const base = document.getElementById('joybase');
  zone.addEventListener('touchstart', e => {
    e.preventDefault(); Sfx.unlock(); touch.active = true; anyKeyFlag = true;
    const t = e.changedTouches[0];
    touch.joyId = t.identifier; touch.joyOx = t.clientX; touch.joyOy = t.clientY;
    base.style.display = knob.style.display = 'block';
    base.style.left = (t.clientX - 55) + 'px'; base.style.top = (t.clientY - 55) + 'px';
    knob.style.left = (t.clientX - 25) + 'px'; knob.style.top = (t.clientY - 25) + 'px';
  }, { passive: false });
  zone.addEventListener('touchmove', e => {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (t.identifier !== touch.joyId) continue;
      let dx = t.clientX - touch.joyOx, dy = t.clientY - touch.joyOy;
      const m = Math.hypot(dx, dy), max = 50;
      if (m > max) { dx = dx / m * max; dy = dy / m * max; }
      touch.jx = Math.abs(dx) > 8 ? dx / max : 0;
      touch.jy = Math.abs(dy) > 8 ? dy / max : 0;
      knob.style.left = (touch.joyOx + dx - 25) + 'px';
      knob.style.top = (touch.joyOy + dy - 25) + 'px';
    }
  }, { passive: false });
  const end = e => {
    for (const t of e.changedTouches) {
      if (t.identifier !== touch.joyId) continue;
      touch.jx = touch.jy = 0; touch.joyId = null;
      base.style.display = knob.style.display = 'none';
    }
  };
  zone.addEventListener('touchend', end);
  zone.addEventListener('touchcancel', end);

  const bind = (id, name) => {
    const el = document.getElementById(id);
    el.addEventListener('touchstart', e => {
      e.preventDefault(); Sfx.unlock(); touch.active = true; anyKeyFlag = true;
      keys[name] = true; input[name] = true;
      el.classList.add('pressed');
    }, { passive: false });
    el.addEventListener('touchend', e => { e.preventDefault(); keys[name] = false; el.classList.remove('pressed'); });
  };
  bind('btn-atk', 'attack'); bind('btn-dash', 'dash'); bind('btn-quack', 'quack'); bind('btn-e', 'interact');

  window.addEventListener('touchstart', () => {
    document.getElementById('touchui').classList.add('on');
  }, { once: true });
}

canvas.addEventListener('pointerdown', e => {
  Sfx.unlock(); anyKeyFlag = true;
  const r = canvas.getBoundingClientRect();
  const mx = (e.clientX - r.left) / r.width * VIEW_W;
  const my = (e.clientY - r.top) / r.height * VIEW_H;
  if (state === 'shop') shopClick(mx, my);
  else if (state === 'dialog' || state === 'title' || state === 'dead' || state === 'end' || state === 'cutscene' || state === 'note') input.attack = true;
});

// ---------- entities ----------
const player = {
  x: 0, y: 0, hp: 6, fx: 0, fy: 1, moving: false, bob: 0, blinkT: 3,
  attackT: 0, attackCd: 0, comboIdx: 0, comboT: 0, heavy: false,
  dashT: 0, dashCd: 0, dashVx: 0, dashVy: 0, pdUsed: false,
  quackCd: 0, hurtT: 0, dead: false,
};
const gerald = { x: 0, y: 0, talks: 0 };
const vendy = { x: 0, y: 0, used: false };

let enemies = [], projectiles = [], pickups = [], bags = [], particles = [], floaters = [], fireflies = [];
let boss = null;

const ENEMY_SPAWNS = [
  ['rat', 14, 22], ['rat', 18, 17], ['rat', 24, 22], ['rat', 30, 20], ['rat', 16, 10], ['rat', 27, 12], ['rat', 36, 26],
  ['fly', 10, 12], ['fly', 21, 9], ['fly', 29, 24], ['fly', 38, 17], ['fly', 13, 19], ['fly', 33, 24],
  ['slime', 25, 17], ['slime', 33, 16], ['slime', 19, 13], ['slime', 41, 20],
];
const BAG_SPAWNS = [
  [6, 6], [15, 5], [22, 7], [7, 12], [12, 15], [18, 21], [26, 24], [34, 22], [40, 26],
  [30, 10], [37, 13], [44, 15], [10, 26], [26, 19],
];
const SANDWICH_BAG = 11; // [44,15] — far east fence, per Gerald's hint

const LORE = [
  {
    x: 2.5 * T, y: 2.5 * T, title: 'SOGGY POLAROID',
    text: 'A photo of a sunlit bathroom. Someone has drawn a little heart around the toilet. On the back, in smudged ink: "first day in 4B!"',
  },
  {
    x: 12.5 * T, y: 26.5 * T, title: 'SHIPPING LABEL',
    text: 'DELUXE PORCELAIN COMMODE — DELIVER TO: APT 4B, LILYPAD TOWERS. Handle with care. Contents: one (1) toilet. It says nothing about a duck.',
  },
  {
    x: 39.5 * T, y: 18.5 * T, title: 'MANUAL PAGE, p.34',
    text: 'TROUBLESHOOTING: A toilet does not quack. A toilet does not migrate south. If your toilet exhibits these behaviors, it may contain a duck. Contact support.',
  },
];

function makeEnemy(type, tx, ty) {
  const base = { type, sx: tx * T + T / 2, sy: ty * T + T / 2, hurtT: 0, dead: false, respawnT: 0, t: Math.random() * 10 };
  base.x = base.sx; base.y = base.sy;
  if (type === 'rat') Object.assign(base, { hp: 3, maxHp: 3, spd: 95, state: 'wander', stT: 0, lx: 0, ly: 0, wx: 0, wy: 0 });
  if (type === 'fly') Object.assign(base, { hp: 1, maxHp: 1, spd: 70 });
  if (type === 'slime') Object.assign(base, { hp: 6, maxHp: 6, spd: 34, shootT: 1 + Math.random() * 2 });
  return base;
}

function spawnEnemies() {
  enemies = ENEMY_SPAWNS.map(([t, x, y]) => makeEnemy(t, x, y));
}
function spawnBags() {
  bags = BAG_SPAWNS.map(([x, y], i) => ({ x: x * T + T / 2, y: y * T + T / 2, hp: 1, dead: false, idx: i }));
}
function makeBoss() {
  boss = {
    x: 40 * T, y: 6 * T, hp: 46, maxHp: 46, active: false, dead: save.bossDead, phase: 1,
    state: 'idle', stT: 1.2, faceL: true, hurtT: 0, summonCd: 0,
    chTx: 0, chTy: 0, volleys: 0, shake: 0,
  };
}

function dropLoot(x, y, scrapMin, scrapMax, crumbChance) {
  const n = scrapMin + Math.floor(Math.random() * (scrapMax - scrapMin + 1));
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    pickups.push({ kind: 'scrap', x, y, vx: Math.cos(a) * 90, vy: Math.sin(a) * 90, t: 0 });
  }
  if (Math.random() < crumbChance) pickups.push({ kind: 'crumb', x, y, vx: 0, vy: -40, t: 0 });
}

function burst(x, y, col, n, spd) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = (0.3 + Math.random()) * (spd || 120);
    particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.4 + Math.random() * 0.4, col, size: 2 + Math.random() * 4 });
  }
}

function floatText(x, y, txt, col) {
  floaters.push({ x, y, txt, col: col || '#fff', life: 0.9 });
}

// ---------- dialog ----------
let state = 'title';
let dialog = null;

const PORTRAITS = {
  duck: () => SPRITES.duckDown.idle, gerald: () => SPRITES.pigeon[0],
  raccoon: () => (boss && boss.phase === 2 ? SPRITES.raccoonMad : SPRITES.raccoon),
  vendy: () => PROPS.vendy || null, sys: () => null,
};

function startDialog(lines, onDone) {
  dialog = { lines, i: 0, chars: 0, onDone };
  state = 'dialog';
}

const D = {
  intro: [
    ['duck', "...and that's the last thing I remember. Now: garbage. Rats. An odour I can only describe as 'ambitious'."],
    ['duck', "No matter. I am a toilet of apartment 4B, Lilypad Towers. And a toilet ALWAYS finds its bathroom."],
    ['sys', "Move: WASD / left stick · Plunger: SPACE (3-hit combo!) · Flush Dash: SHIFT — you're INVINCIBLE mid-flush. Swing the plunger at incoming projectiles to DEFLECT them."],
  ],
  gerald1: [
    ['gerald', "Whoa. A talking duck."],
    ['duck', "Duck? DUCK? I am a TOILET, sir. Note the elegant bowl. The flush. The duck parts are purely decorative."],
    ['gerald', "...Right. Well, 'toilet', the only way outta this dump is the sewer grate, up north-east."],
    ['gerald', "Problem: the DUMPSTER KING guards it. Big raccoon. Real trash attitude. You'll want upgrades — Vendy, the red machine mid-yard, trades them for scrap."],
    ['gerald', "Scrap's everywhere: rats carry it, trash bags are full of it. Oh — and if you find a sandwich in one of those bags, THE sandwich, the Blessed Sandwich I lost by the east fence... bring it. I'll make it worth your while."],
  ],
  geraldMore: [
    [['gerald', "Rats crouch before they lunge. Dash THROUGH the lunge — dodge it at the last moment and time itself gets impressed."]],
    [['gerald', "See slime spit flying at you? Swing your plunger at it. Trust me. Very satisfying."]],
    [['gerald', "The King charges like an idiot. Let him eat wall, then go to town while he sees stars."]],
    [['gerald', "My sandwich is out there. East fence. A pigeon never forgets a sandwich."]],
  ],
  sandwichDone: [
    ['gerald', "THE BLESSED SANDWICH! You found it! Still... mostly bread-shaped!"],
    ['duck', "It was inside a garbage bag. Like everything else in my life right now."],
    ['gerald', "Toilet, you're alright. Here — scrap I've been hoarding, and a pigeon's blessing. It's like a regular blessing but with more cooing."],
    ['sys', "Quest complete! +30 scrap, +1 max HP (Pigeon's Blessing)."],
  ],
  bossIntro: [
    ['raccoon', "WHO DARES WADDLE INTO MY KINGDOM OF FILTH?"],
    ['duck', "A toilet, on his way home. Step aside, garbage rodent."],
    ['raccoon', "A TOILET? HA! You're the weirdest duck I've ever seen. And I once ate a weather balloon."],
    ['raccoon', "The grate stays SHUT. Your porcelain is MINE — it'll make a FINE cereal bowl!"],
  ],
  bossPhase2: [
    ['raccoon', "Enough! You've seen my trash... now witness my TREASURE!"],
  ],
  bossDead: [
    ['raccoon', "Okay okay OKAY! You win, weird duck!"],
    ['duck', "TOILET."],
    ['raccoon', "Whatever helps you sleep at night, buddy. Grate's open. Sewers are that way."],
    ['raccoon', "Word of advice: down there, even the water has opinions."],
  ],
  grateLocked: [
    ['duck', "Welded shut. Something tells me the raccoon on the trash throne has opinions about this grate."],
  ],
  grateOpen: [
    ['duck', "Sewers. Pipes. PLUMBING. Practically home turf for a toilet."],
    ['duck', "Hold on, apartment 4B. Your favourite fixture is coming home."],
  ],
  vendyFirst: [
    ['vendy', "CLANK. BZZT. The ancient vending machine flickers to life. Its display reads: 'SCRAP ACCEPTED. NO REFUNDS. NO MERCY.'"],
  ],
  loreDone: [
    ['duck', "...A delivery label. A photograph. A manual. All lies, obviously."],
    ['duck', "A toilet can't even read. I'm reading these with my decorative duck eyes."],
    ['duck', "...Let's just go home."],
  ],
};

const CUTSCENE = [
  { img: 'cut1', cap: "Apartment 4B, Lilypad Towers. Home. Every morning the sun hit the porcelain just right." },
  { img: 'cut2', cap: "Then — the incident. A flush. A fall. The pipes took everything." },
  { img: 'cut3', cap: "It woke somewhere that smelled like expired regret. Far from home. But a toilet always finds its bathroom." },
];
let cut = null;

function startCutscene() {
  cut = { i: 0, chars: 0 };
  state = 'cutscene';
}
function finishCutscene() {
  cut = null;
  beginPlay(true);
}
function beginPlay(fresh) {
  state = 'play';
  Music.play('dump');
  areaCardT = 4;
  if (fresh) startDialog(D.intro, () => {});
}

// ---------- shop ----------
let shopSel = 0;
const SHOP_ITEMS = [
  {
    id: 'hp', name: 'Breadcrumb Feast', desc: '+1 max HP', prices: [15, 25, 40],
    can: () => save.buys.hp < 3,
    buy: () => { save.buys.hp++; save.maxHp++; player.hp = save.maxHp; },
  },
  {
    id: 'dmg', name: 'Duct-Taped Plunger', desc: '+1 damage', prices: [20, 45],
    can: () => save.buys.dmg < 2,
    buy: () => { save.buys.dmg++; save.dmg++; },
  },
  {
    id: 'spd', name: 'Swamp Wax', desc: '+12% hop speed', prices: [15, 30],
    can: () => save.buys.spd < 2,
    buy: () => { save.buys.spd++; save.spdMult += 0.12; },
  },
  {
    id: 'quack', name: 'QUACK MODULE 9000', desc: 'Ranged quack blast (Q)', prices: [35],
    can: () => !save.quack,
    buy: () => { save.quack = true; },
  },
];
function itemPrice(it) {
  const lvl = it.id === 'quack' ? (save.quack ? 1 : 0) : save.buys[it.id];
  return lvl < it.prices.length ? it.prices[lvl] : null;
}
function openShop() { state = 'shop'; shopSel = 0; Sfx.blip(); }
function closeShop() { state = 'play'; Sfx.blip(); }
function tryBuy(i) {
  const it = SHOP_ITEMS[i];
  const price = itemPrice(it);
  if (price === null || !it.can()) { Sfx.deny(); return; }
  if (save.scrap < price) { Sfx.deny(); floatText(player.x, player.y - 60, 'need more scrap!', '#e63946'); return; }
  save.scrap -= price;
  it.buy(); writeSave(); Sfx.buy();
  floatText(player.x, player.y - 60, it.name + '!', '#7ac74f');
}
function shopKey(code) {
  if (code === 'KeyW' || code === 'ArrowUp') { shopSel = (shopSel + SHOP_ITEMS.length - 1) % SHOP_ITEMS.length; Sfx.blip(); }
  if (code === 'KeyS' || code === 'ArrowDown') { shopSel = (shopSel + 1) % SHOP_ITEMS.length; Sfx.blip(); }
  if (code === 'KeyE' || code === 'Enter' || code === 'Space' || code === 'KeyJ') tryBuy(shopSel);
}
function shopClick(mx, my) {
  const x0 = VIEW_W / 2 - 260, y0 = 120;
  if (my > y0 + 330) { closeShop(); return; }
  for (let i = 0; i < SHOP_ITEMS.length; i++) {
    const ry = y0 + 70 + i * 62;
    if (mx > x0 && mx < x0 + 520 && my > ry - 8 && my < ry + 46) {
      if (shopSel === i) tryBuy(i); else { shopSel = i; Sfx.blip(); }
      return;
    }
  }
  closeShop();
}

// ---------- combat ----------
let hitStop = 0, slowmoT = 0;

function breakBag(bg) {
  bg.dead = true;
  Sfx.hit();
  burst(bg.x, bg.y, '#3a3f44', 10);
  burst(bg.x, bg.y - 10, '#c9c4b0', 5, 90);
  dropLoot(bg.x, bg.y, 2, 4, 0.25);
  if (bg.idx === SANDWICH_BAG && !save.hasSandwich && save.quest !== 2) {
    pickups.push({ kind: 'sandwich', x: bg.x, y: bg.y, vx: 0, vy: -60, t: 0 });
  }
}

function playerAttack() {
  const heavy = player.comboIdx === 2;
  player.heavy = heavy;
  player.attackT = heavy ? 0.28 : 0.22;
  player.attackCd = heavy ? 0.55 : 0.36;
  player.comboT = 0.75;
  const dmg = heavy ? save.dmg + 1 : save.dmg;
  if (heavy) Sfx.heavySwing(); else Sfx.swing();

  const range = heavy ? 74 : 62, arcCos = heavy ? -0.45 : -0.15;
  let connected = false;

  // deflect projectiles
  projectiles.forEach(p => {
    if (p.kind !== 'sludge' && p.kind !== 'trash' && p.kind !== 'lid') return;
    const dx = p.x - player.x, dy = p.y - (player.y - 20);
    const d = Math.hypot(dx, dy) || 1;
    if (d > 78) return;
    if ((dx / d) * player.fx + (dy / d) * player.fy < arcCos - 0.2) return;
    let target = null, best = 1e9;
    const cands = enemies.filter(e => !e.dead);
    if (boss && boss.active && !boss.dead) cands.push(boss);
    cands.forEach(e => { const dd = Math.hypot(e.x - p.x, e.y - p.y); if (dd < best) { best = dd; target = e; } });
    const spd = 430;
    if (target) { const dd = Math.hypot(target.x - p.x, target.y - p.y) || 1; p.vx = (target.x - p.x) / dd * spd; p.vy = (target.y - p.y) / dd * spd; }
    else { p.vx = player.fx * spd; p.vy = player.fy * spd; }
    p.dmg = p.kind === 'lid' ? 3 : 2;
    p.kind = 'reflected';
    p.life = 1.6;
    Sfx.deflect();
    floatText(p.x, p.y - 10, 'DEFLECT!', '#9fd8ef');
    burst(p.x, p.y, '#9fd8ef', 6, 100);
  });

  const targets = enemies.filter(e => !e.dead);
  if (boss && boss.active && !boss.dead) targets.push(boss);
  targets.forEach(e => {
    const dx = e.x - player.x, dy = e.y - player.y;
    const d = Math.hypot(dx, dy) || 1;
    const big = e === boss ? 40 : 0;
    if (d > range + big) return;
    if ((dx / d) * player.fx + (dy / d) * player.fy < arcCos) return;
    if (hitEnemy(e, dmg, dx / d, dy / d, 'melee', heavy)) connected = true;
  });
  bags.forEach(bg => {
    if (bg.dead) return;
    if (Math.hypot(bg.x - player.x, bg.y - player.y) > range + 10) return;
    breakBag(bg);
    connected = true;
  });

  if (connected) hitStop = heavy ? 0.09 : 0.055;
  player.comboIdx = heavy ? 0 : player.comboIdx + 1;
  if (heavy) player.comboT = 0;
}

function hitEnemy(e, dmg, nx, ny, src, heavy) {
  if (e === boss) {
    if (boss.state === 'transition') { floatText(boss.x, boss.y - 70, '...', '#8a8a92'); return false; }
    if (boss.phase === 2 && boss.state !== 'stunned' && src === 'melee') {
      Sfx.clank();
      floatText(boss.x, boss.y - 70, 'BLOCKED', '#b8c4c9');
      burst(boss.x - nx * 30, boss.y - 30, '#ffe58a', 8, 160);
      moveEntity(player, -nx * 34, -ny * 34, 14);
      return false;
    }
    let amount = dmg;
    if (boss.phase === 2 && boss.state !== 'stunned' && src === 'quack') amount = Math.ceil(dmg / 2);
    const mult = boss.state === 'stunned' ? 2 : 1;
    amount *= mult;
    boss.hp -= amount; boss.hurtT = 0.15; boss.shake = 0.2;
    Sfx.hit();
    floatText(boss.x, boss.y - 70, '-' + amount, mult > 1 ? '#ffd23f' : '#fff');
    burst(boss.x, boss.y, '#8a8a92', 6);
    if (boss.hp <= 0) killBoss();
    else if (boss.phase === 1 && boss.hp <= boss.maxHp / 2) startPhase2();
    return true;
  }
  e.hp -= dmg; e.hurtT = 0.15;
  const kb = heavy ? 44 : 20;
  e.x += nx * kb; e.y += ny * kb;
  Sfx.hit();
  floatText(e.x, e.y - 30, '-' + dmg, heavy ? '#ffd23f' : '#fff');
  if (e.hp <= 0) {
    e.dead = true; e.respawnT = 26 + Math.random() * 14;
    burst(e.x, e.y, e.type === 'slime' ? '#7ac74f' : '#8a8a92', 12);
    if (e.type === 'rat') dropLoot(e.x, e.y, 4, 6, 0.12);
    if (e.type === 'fly') dropLoot(e.x, e.y, 1, 2, 0.15);
    if (e.type === 'slime') dropLoot(e.x, e.y, 8, 12, 0.2);
  }
  return true;
}

function hurtPlayer(dmg, sx, sy) {
  if (player.hurtT > 0 || player.dashT > 0 || player.dead) return;
  player.hp -= dmg; player.hurtT = 0.9;
  Sfx.hurt(); shake = 0.3;
  burst(player.x, player.y - 20, '#e63946', 10);
  const d = Math.hypot(player.x - sx, player.y - sy) || 1;
  moveEntity(player, (player.x - sx) / d * 26, (player.y - sy) / d * 26, 14);
  if (player.hp <= 0) {
    player.dead = true;
    save.stats.deaths++; writeSave();
    Sfx.boom();
    Music.stop();
    setTimeout(() => { state = 'dead'; }, 600);
  }
}

function startPhase2() {
  boss.phase = 2;
  boss.state = 'transition'; boss.stT = 1.5;
  Sfx.roar(); shake = 0.5;
  burst(boss.x, boss.y - 30, '#e63946', 24, 200);
  startDialog(D.bossPhase2, () => {});
}

function killBoss() {
  boss.dead = true; boss.active = false;
  save.bossDead = true; writeSave();
  Sfx.boom(); Sfx.win();
  Music.stop();
  shake = 0.6;
  burst(boss.x, boss.y, '#8a8a92', 40, 220);
  burst(boss.x, boss.y, '#e63946', 20, 180);
  dropLoot(boss.x, boss.y, 38, 42, 0);
  pickups.push({ kind: 'crumb', x: boss.x - 20, y: boss.y, vx: -60, vy: -40, t: 0 });
  pickups.push({ kind: 'crumb', x: boss.x + 20, y: boss.y, vx: 60, vy: -40, t: 0 });
  gateClosed = false;
  setTimeout(() => { startDialog(D.bossDead, () => { Music.play('dump'); }); }, 900);
}

function respawnPlayer() {
  player.dead = false;
  player.hp = save.maxHp;
  player.x = 4 * T + T / 2; player.y = 26 * T + T / 2;
  player.hurtT = 1.2; player.dashT = 0; player.dashCd = 0; player.attackCd = 0; player.quackCd = 0;
  player.comboIdx = 0; player.comboT = 0;
  projectiles = [];
  spawnEnemies();
  if (boss && !save.bossDead) { makeBoss(); gateClosed = false; bossIntroDone = false; }
  state = 'play';
  Music.play('dump');
}

// ---------- boss AI ----------
let bossIntroDone = false;

function updateBoss(dt) {
  if (!boss || boss.dead) return;
  const bhalf = 34;

  if (!boss.active) {
    if (!bossIntroDone && !save.bossDead && player.x > 32.5 * T && player.y < 12 * T) {
      bossIntroDone = true;
      startDialog(D.bossIntro, () => {
        boss.active = true; gateClosed = true;
        Music.play('boss');
        Sfx.roar(); Sfx.door(); shake = 0.4;
      });
    }
    return;
  }

  boss.hurtT = Math.max(0, boss.hurtT - dt);
  boss.shake = Math.max(0, boss.shake - dt);
  boss.summonCd = Math.max(0, boss.summonCd - dt);
  boss.stT -= dt;
  boss.faceL = player.x < boss.x;
  const dx = player.x - boss.x, dy = player.y - boss.y;
  const dist = Math.hypot(dx, dy) || 1;
  const spd2 = boss.phase === 2 ? 1.25 : 1;

  if (boss.state === 'transition') {
    if (boss.stT <= 0) { boss.state = 'idle'; boss.stT = 0.6; }
    return;
  }

  if (boss.state === 'idle') {
    if (dist > 90) moveEntity(boss, dx / dist * 60 * spd2 * dt, dy / dist * 60 * spd2 * dt, bhalf);
    if (boss.stT <= 0) {
      const canSummon = boss.hp < boss.maxHp * 0.65 && boss.summonCd <= 0 && enemies.filter(e => e.arena && !e.dead).length < 3;
      const roll = Math.random();
      if (canSummon && roll < 0.25) {
        boss.state = 'summon'; boss.stT = 0.8; Sfx.roar();
      } else if (boss.phase === 2 && roll < 0.5) {
        boss.state = 'lidThrow'; boss.stT = 0.4;
      } else if (roll < 0.68) {
        boss.state = 'toss'; boss.volleys = boss.phase === 2 ? 4 : 3; boss.stT = 0.4;
      } else {
        boss.state = 'telegraph'; boss.stT = boss.phase === 2 ? 0.55 : 0.7; Sfx.roar();
      }
    }
  } else if (boss.state === 'toss') {
    if (boss.stT <= 0) {
      const base = Math.atan2(dy, dx);
      for (let i = -1; i <= 1; i++) {
        const a = base + i * 0.28;
        projectiles.push({ kind: 'trash', x: boss.x, y: boss.y - 20, vx: Math.cos(a) * 230, vy: Math.sin(a) * 230, life: 3 });
      }
      Sfx.swing();
      boss.volleys--;
      boss.stT = boss.phase === 2 ? 0.42 : 0.5;
      if (boss.volleys <= 0) { boss.state = 'idle'; boss.stT = 1.1; }
    }
  } else if (boss.state === 'lidThrow') {
    if (boss.stT <= 0) {
      projectiles.push({ kind: 'lid', x: boss.x, y: boss.y - 30, vx: dx / dist * 300, vy: dy / dist * 300, life: 2.6, t: 0, spin: 0 });
      Sfx.swing();
      boss.state = 'idle'; boss.stT = 1.0;
    }
  } else if (boss.state === 'telegraph') {
    if (boss.stT <= 0) {
      boss.state = 'charge'; boss.stT = 1.0;
      boss.chTx = dx / dist; boss.chTy = dy / dist;
    }
  } else if (boss.state === 'charge') {
    const step = 520 * spd2 * dt;
    const nx = boss.x + boss.chTx * step, ny = boss.y + boss.chTy * step;
    if (boxFree(nx, ny, bhalf)) { boss.x = nx; boss.y = ny; }
    else {
      boss.state = 'stunned'; boss.stT = boss.phase === 2 ? 1.7 : 1.4;
      Sfx.boom(); shake = 0.4;
      burst(boss.x + boss.chTx * 30, boss.y + boss.chTy * 30, '#c9b458', 14);
    }
    if (dist < bhalf + 16) hurtPlayer(2, boss.x, boss.y);
    if (boss.stT <= 0) { boss.state = 'idle'; boss.stT = 0.9; }
  } else if (boss.state === 'stunned') {
    if (boss.stT <= 0) { boss.state = 'idle'; boss.stT = 0.8; }
  } else if (boss.state === 'summon') {
    if (boss.stT <= 0) {
      [[34, 3], [44, 9]].forEach(([tx, ty]) => {
        const r = makeEnemy('rat', tx, ty);
        r.arena = true;
        enemies.push(r);
        burst(r.x, r.y, '#8a8a92', 8);
      });
      boss.summonCd = boss.phase === 2 ? 10 : 14;
      boss.state = 'idle'; boss.stT = 1.0;
    }
  }

  if (boss.state !== 'charge' && dist < bhalf + 14) hurtPlayer(1, boss.x, boss.y);
}

// ---------- update ----------
let shake = 0;
let camX = 0, camY = 0;
let playT = 0;
let areaCardT = 0;

function update(dt) {
  playT += dt;
  save.stats.timePlayed += dt;
  areaCardT = Math.max(0, areaCardT - dt);
  pollAxes();

  if (!player.dead) {
    player.attackCd = Math.max(0, player.attackCd - dt);
    player.dashCd = Math.max(0, player.dashCd - dt);
    player.quackCd = Math.max(0, player.quackCd - dt);
    player.hurtT = Math.max(0, player.hurtT - dt);
    player.comboT = Math.max(0, player.comboT - dt);
    if (player.comboT <= 0 && player.attackT <= 0) player.comboIdx = 0;
    player.blinkT -= dt;
    if (player.blinkT < -0.15) player.blinkT = 2.5 + Math.random() * 3;

    if (player.dashT > 0) {
      player.dashT -= dt;
      moveEntity(player, player.dashVx * dt, player.dashVy * dt, 14);
      if (Math.random() < 0.7) particles.push({ x: player.x + (Math.random() * 24 - 12), y: player.y + 6, vx: 0, vy: -30, life: 0.4, col: '#9fd8ef', size: 4 });
      // perfect dodge: threat inside the early i-frame window
      if (!player.pdUsed && player.dashT > 0.06) {
        const threat =
          projectiles.some(p => (p.kind === 'sludge' || p.kind === 'trash' || p.kind === 'lid') && Math.hypot(p.x - player.x, p.y - (player.y - 20)) < 34) ||
          enemies.some(e => !e.dead && e.type === 'rat' && e.state === 'lunge' && Math.hypot(e.x - player.x, e.y - player.y) < 42) ||
          (boss && boss.active && boss.state === 'charge' && Math.hypot(boss.x - player.x, boss.y - player.y) < 60);
        if (threat) {
          player.pdUsed = true;
          slowmoT = 0.7;
          player.dashCd = 0;
          Sfx.perfect();
          floatText(player.x, player.y - 70, 'PERFECT!', '#ffd23f');
          burst(player.x, player.y - 20, '#ffd23f', 12, 140);
        }
      }
    } else {
      let spd = 165 * save.spdMult;
      if (inPuddle(player.x, player.y)) spd *= 0.8;
      const mv = Math.hypot(input.ax, input.ay) > 0.01;
      player.moving = mv;
      if (mv) {
        moveEntity(player, input.ax * spd * dt, input.ay * spd * dt, 14);
        player.fx = input.ax; player.fy = input.ay;
        const m = Math.hypot(player.fx, player.fy) || 1;
        player.fx /= m; player.fy /= m;
        player.bob += dt * 10;
        if (Math.random() < dt * 3 && inPuddle(player.x, player.y)) burst(player.x, player.y + 8, '#4a9dbb', 3, 40);
      }
      if (input.dash && player.dashCd <= 0) {
        const vx = mv ? input.ax : player.fx, vy = mv ? input.ay : player.fy;
        const mm = Math.hypot(vx, vy) || 1;
        player.dashT = 0.18; player.dashCd = 1.1; player.pdUsed = false;
        player.dashVx = vx / mm * 500; player.dashVy = vy / mm * 500;
        Sfx.dash();
        burst(player.x, player.y, '#9fd8ef', 8, 80);
      }
      if (input.attack && player.attackCd <= 0) playerAttack();
      if (input.quack && save.quack && player.quackCd <= 0) {
        player.quackCd = 0.75;
        Sfx.quack();
        projectiles.push({ kind: 'quack', x: player.x + player.fx * 20, y: player.y - 24, vx: player.fx * 380, vy: player.fy * 380, life: 1.1 });
      }
    }
    player.attackT = Math.max(0, player.attackT - dt);

    // lore pickup by touch
    LORE.forEach((n, i) => {
      if (save.lore[i]) return;
      if (Math.hypot(n.x - player.x, n.y - player.y) < 30) {
        save.lore[i] = true; writeSave();
        Sfx.lore();
        openNote(i);
      }
    });

    if (input.interact) {
      if (near(gerald, 70)) {
        if (!save.metGerald) {
          save.metGerald = true;
          startDialog(D.gerald1, () => { save.quest = 1; writeSave(); });
        } else if (save.quest === 1 && save.hasSandwich) {
          startDialog(D.sandwichDone, () => {
            save.quest = 2; save.hasSandwich = false;
            save.scrap += 30; save.stats.scrapTotal += 30;
            if (!save.questHp) { save.questHp = true; save.maxHp++; player.hp = save.maxHp; }
            writeSave();
            Sfx.buy();
          });
        } else {
          startDialog(D.geraldMore[gerald.talks++ % D.geraldMore.length], () => {});
        }
      } else if (near(vendy, 80)) {
        if (!vendy.used) { vendy.used = true; startDialog(D.vendyFirst, () => openShop()); }
        else openShop();
      } else if (nearGrate()) {
        if (save.bossDead) startDialog(D.grateOpen, () => endArea());
        else startDialog(D.grateLocked, () => {});
      }
    }
  }

  // enemies
  enemies.forEach(e => {
    if (e.dead) {
      if (e.arena) return;
      e.respawnT -= dt;
      if (e.respawnT <= 0 && Math.hypot(e.sx - player.x, e.sy - player.y) > 400) {
        e.dead = false; e.hp = e.maxHp; e.x = e.sx; e.y = e.sy;
        if (e.type === 'rat') e.state = 'wander';
      }
      return;
    }
    e.t += dt;
    e.hurtT = Math.max(0, e.hurtT - dt);
    const dx = player.x - e.x, dy = player.y - e.y;
    const dist = Math.hypot(dx, dy) || 1;

    if (e.type === 'rat') {
      e.stT -= dt;
      if (e.state === 'wander') {
        if (e.stT <= 0) { const a = Math.random() * 7; e.wx = Math.cos(a); e.wy = Math.sin(a); e.stT = 1 + Math.random() * 1.5; }
        moveEntity(e, e.wx * 40 * dt, e.wy * 40 * dt, 12);
        if (dist < 200 && !player.dead) e.state = 'chase';
      } else if (e.state === 'chase') {
        moveEntity(e, dx / dist * e.spd * dt, dy / dist * e.spd * dt, 12);
        if (dist > 300) e.state = 'wander';
        if (dist < 110) { e.state = 'windup'; e.stT = 0.45; }
      } else if (e.state === 'windup') {
        if (e.stT <= 0) {
          e.state = 'lunge'; e.stT = 0.32;
          e.lx = dx / dist; e.ly = dy / dist;
        }
      } else if (e.state === 'lunge') {
        moveEntity(e, e.lx * 330 * dt, e.ly * 330 * dt, 12);
        if (e.stT <= 0) { e.state = 'rest'; e.stT = 0.9; }
      } else if (e.state === 'rest') {
        if (e.stT <= 0) e.state = 'chase';
      }
      if (dist < 26 && !player.dead) hurtPlayer(1, e.x, e.y);
    } else if (e.type === 'fly') {
      const wob = Math.sin(e.t * 6) * 60;
      const px = -dy / dist, py = dx / dist;
      if (dist < 260 && !player.dead) moveEntity(e, (dx / dist * e.spd + px * wob) * dt, (dy / dist * e.spd + py * wob) * dt, 8);
      else moveEntity(e, Math.cos(e.t) * 30 * dt, Math.sin(e.t * 1.3) * 30 * dt, 8);
      if (dist < 20 && !player.dead) hurtPlayer(1, e.x, e.y);
    } else if (e.type === 'slime') {
      if (dist < 300 && !player.dead) {
        moveEntity(e, dx / dist * e.spd * dt, dy / dist * e.spd * dt, 13);
        e.shootT -= dt;
        if (e.shootT <= 0 && dist > 60) {
          e.shootT = 2.4;
          projectiles.push({ kind: 'sludge', x: e.x, y: e.y - 8, vx: dx / dist * 160, vy: dy / dist * 160, life: 2.6 });
          Sfx.blip();
        }
      }
      if (dist < 26 && !player.dead) hurtPlayer(1, e.x, e.y);
    }
  });

  updateBoss(dt);

  // projectiles
  projectiles = projectiles.filter(p => {
    p.life -= dt;
    if (p.kind === 'lid') {
      p.t += dt; p.spin += dt * 14;
      if (p.t > 0.55 && boss && !boss.dead) {
        const dd = Math.hypot(boss.x - p.x, (boss.y - 30) - p.y) || 1;
        p.vx = (boss.x - p.x) / dd * 340; p.vy = ((boss.y - 30) - p.y) / dd * 340;
        if (dd < 40) return false;
      }
    }
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.life <= 0) return false;
    if (p.kind !== 'lid' && !boxFree(p.x, p.y, 5)) { burst(p.x, p.y, p.kind === 'quack' ? '#ffd23f' : '#4e8a33', 5, 60); return false; }
    if (p.kind === 'quack' || p.kind === 'reflected') {
      const dmg = p.kind === 'quack' ? save.dmg : (p.dmg || 2);
      const src = p.kind === 'quack' ? 'quack' : 'reflected';
      let hit = false;
      const targets = enemies.filter(e => !e.dead);
      if (boss && boss.active && !boss.dead) targets.push(boss);
      for (const e of targets) {
        const r = e === boss ? 44 : 18;
        if (Math.hypot(e.x - p.x, e.y - p.y) < r) {
          const d = Math.hypot(p.vx, p.vy) || 1;
          hitEnemy(e, dmg, p.vx / d, p.vy / d, src, false);
          hit = true; break;
        }
      }
      if (!hit) for (const bg of bags) {
        if (!bg.dead && Math.hypot(bg.x - p.x, bg.y - p.y) < 20) { breakBag(bg); hit = true; break; }
      }
      return !hit;
    }
    if (!player.dead && Math.hypot(player.x - p.x, (player.y - 20) - p.y) < 22) {
      hurtPlayer(1, p.x, p.y);
      return false;
    }
    return true;
  });

  // pickups
  pickups = pickups.filter(pk => {
    pk.t += dt;
    const dx = player.x - pk.x, dy = player.y - pk.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d < 70 && pk.t > 0.4) { pk.vx = dx / d * 260; pk.vy = dy / d * 260; }
    else { pk.vx *= 0.9; pk.vy *= 0.9; }
    pk.x += pk.vx * dt; pk.y += pk.vy * dt;
    if (d < 20 && pk.t > 0.3 && !player.dead) {
      if (pk.kind === 'scrap') {
        save.scrap++; save.stats.scrapTotal++;
        Sfx.pickup();
      } else if (pk.kind === 'crumb') {
        player.hp = Math.min(save.maxHp, player.hp + 1);
        Sfx.crumb();
        floatText(player.x, player.y - 60, '+1 hp', '#7ac74f');
      } else if (pk.kind === 'sandwich') {
        save.hasSandwich = true;
        Sfx.lore();
        floatText(player.x, player.y - 60, 'The Blessed Sandwich!', '#ffd23f');
      }
      writeSave();
      return false;
    }
    return true;
  });

  particles = particles.filter(p => { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.94; p.vy *= 0.94; return p.life > 0; });
  floaters = floaters.filter(f => { f.life -= dt; f.y -= 40 * dt; return f.life > 0; });

  // fireflies
  if (fireflies.length < 14 && Math.random() < dt * 2) {
    fireflies.push({ x: Math.random() * MAP_W * T, y: Math.random() * MAP_H * T, ph: Math.random() * 7, life: 6 + Math.random() * 8 });
  }
  fireflies = fireflies.filter(f => {
    f.life -= dt; f.ph += dt;
    f.x += Math.cos(f.ph * 0.9) * 18 * dt;
    f.y += Math.sin(f.ph * 1.3) * 14 * dt;
    return f.life > 0;
  });

  shake = Math.max(0, shake - dt);
  const tx = player.x - VIEW_W / 2, ty = player.y - VIEW_H / 2;
  camX += (tx - camX) * Math.min(1, dt * 6);
  camY += (ty - camY) * Math.min(1, dt * 6);
  camX = Math.max(0, Math.min(MAP_W * T - VIEW_W, camX));
  camY = Math.max(0, Math.min(MAP_H * T - VIEW_H, camY));

  input.attack = input.dash = input.quack = input.interact = false;
}

function near(o, r) { return Math.hypot(o.x - player.x, o.y - player.y) < r; }
function nearGrate() {
  return grateTiles.some(([tx, ty]) => Math.hypot(tx * T + T / 2 - player.x, ty * T + T / 2 - player.y) < 80);
}

function endArea() {
  save.ended = true; writeSave();
  Sfx.win();
  Music.stop();
  state = 'end';
}

// ---------- note overlay ----------
let noteView = null;
function openNote(i) {
  noteView = { i, chars: 0 };
  state = 'note';
}

// ---------- render ----------
let titleImg = null;

function drawProp(name, cx, bottomY, fallback) {
  const p = PROPS[name];
  if (p) { ctx.drawImage(p, cx - p.width / 2, bottomY - p.height); return true; }
  if (fallback) fallback();
  return false;
}

function draw() {
  ctx.fillStyle = '#0d1117';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  if (state === 'title') { drawTitle(); return; }
  if (state === 'cutscene') { drawCutscene(); return; }

  ctx.save();
  const sh = shake > 0 ? shake * 14 : 0;
  ctx.translate(-Math.round(camX) + (Math.random() - 0.5) * sh, -Math.round(camY) + (Math.random() - 0.5) * sh);

  ctx.drawImage(bgCanvas, 0, 0);

  // puddle shimmer
  puddles.forEach(p => {
    const cx = (p.x + p.w / 2) * T, cy = (p.y + p.h / 2) * T;
    ctx.globalAlpha = 0.12 + 0.07 * Math.sin(playT * 2 + cx);
    ctx.fillStyle = '#9fd8ef';
    ctx.beginPath();
    ctx.ellipse(cx + Math.sin(playT * 1.3) * 10, cy - 4, p.w * T * 0.28, p.h * T * 0.16, 0, 0, 7);
    ctx.fill();
    ctx.globalAlpha = 1;
  });

  gateTiles.forEach(([tx, ty]) => {
    if (gateClosed) {
      ctx.fillStyle = '#6d4c2f';
      ctx.fillRect(tx * T + 6, ty * T, T - 12, T);
      ctx.fillStyle = '#503418';
      for (let i = 0; i < T; i += 10) ctx.fillRect(tx * T + 6, ty * T + i, T - 12, 4);
    } else if (!save.bossDead) {
      ctx.fillStyle = 'rgba(230,57,70,0.18)';
      ctx.fillRect(tx * T, ty * T, T, T);
    }
  });

  // grate prop + glow
  const grateCx = 45 * T, grateCy = 2 * T + T / 2;
  drawProp('grate', grateCx, grateCy + T / 2 + 6, null);
  if (save.bossDead) {
    const g = Math.sin(playT * 3) * 0.12 + 0.3;
    ctx.fillStyle = `rgba(122,199,79,${g})`;
    ctx.beginPath(); ctx.ellipse(grateCx, grateCy, 62, 40, 0, 0, 7); ctx.fill();
  }

  pickups.forEach(pk => {
    const s = pk.kind === 'scrap' ? SPRITES.scrap : pk.kind === 'crumb' ? SPRITES.crumb : SPRITES.sandwich;
    const bob = Math.sin(playT * 5 + pk.x) * 3;
    ctx.drawImage(s, pk.x - s.width / 2, pk.y - s.height / 2 + bob);
    if (pk.kind === 'sandwich') {
      ctx.globalAlpha = 0.4 + 0.3 * Math.sin(playT * 6);
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath(); ctx.arc(pk.x, pk.y + bob, 20, 0, 7); ctx.fill();
      ctx.globalAlpha = 1;
    }
  });

  // lore notes in world
  LORE.forEach((n, i) => {
    if (save.lore[i]) return;
    const s = SPRITES.note;
    const bob = Math.sin(playT * 3 + i * 2) * 3;
    ctx.drawImage(s, n.x - s.width / 2, n.y - s.height / 2 + bob);
    ctx.globalAlpha = 0.25 + 0.2 * Math.sin(playT * 4 + i);
    ctx.fillStyle = '#ffe58a';
    ctx.beginPath(); ctx.arc(n.x, n.y + bob, 18, 0, 7); ctx.fill();
    ctx.globalAlpha = 1;
  });

  const ents = [];
  dumpsters.forEach(d => ents.push({
    y: (d.y + 2) * T, draw: () => drawProp('dumpster', (d.x + 1) * T, (d.y + 2) * T + 6, () => drawDumpsterFallback(d)),
  }));
  piles.forEach(p => ents.push({
    y: (p.y + 1) * T, draw: () => drawProp('trashpile', (p.x + 0.5) * T, (p.y + 1) * T + 2, () => drawPileFallback(p)),
  }));
  LAMPS.forEach(l => ents.push({ y: l.y, draw: () => drawLamp(l) }));
  if (boss) ents.push({ y: 4.6 * T, draw: () => drawProp('throne', 41 * T, 5.4 * T, drawThroneFallback) });
  bags.forEach(bg => { if (!bg.dead) ents.push({ y: bg.y, draw: () => drawBag(bg) }); });
  enemies.forEach(e => { if (!e.dead) ents.push({ y: e.y, draw: () => drawEnemy(e) }); });
  ents.push({ y: gerald.y, draw: drawGerald });
  ents.push({ y: vendy.y, draw: drawVendy });
  if (boss && !boss.dead && (boss.active || !save.bossDead)) ents.push({ y: boss.y, draw: drawBoss });
  if (!player.dead) ents.push({ y: player.y, draw: drawPlayer });
  ents.sort((a, b) => a.y - b.y).forEach(e => e.draw());

  projectiles.forEach(p => {
    if (p.kind === 'quack') {
      ctx.drawImage(SPRITES.quack, p.x - 8, p.y - 6);
    } else if (p.kind === 'reflected') {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(playT * 12);
      ctx.drawImage(SPRITES.sludge, -6, -5);
      ctx.restore();
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = '#9fd8ef';
      ctx.beginPath(); ctx.arc(p.x, p.y, 10, 0, 7); ctx.fill();
      ctx.globalAlpha = 1;
    } else if (p.kind === 'sludge') {
      ctx.drawImage(SPRITES.sludge, p.x - 6, p.y - 5);
    } else if (p.kind === 'lid') {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.spin);
      ctx.drawImage(SPRITES.lid, -18, -15);
      ctx.restore();
    } else {
      ctx.fillStyle = '#5c6166';
      ctx.beginPath(); ctx.arc(p.x, p.y, 9, 0, 7); ctx.fill();
      ctx.fillStyle = '#3a3f44';
      ctx.beginPath(); ctx.arc(p.x + 2, p.y + 2, 5, 0, 7); ctx.fill();
    }
  });

  particles.forEach(p => {
    ctx.globalAlpha = Math.min(1, p.life * 2.5);
    ctx.fillStyle = p.col;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    ctx.globalAlpha = 1;
  });

  floaters.forEach(f => {
    ctx.globalAlpha = Math.min(1, f.life * 2);
    ctx.fillStyle = f.col;
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(f.txt, f.x, f.y - 40);
    ctx.globalAlpha = 1;
  });
  ctx.textAlign = 'left';

  // night pass
  ctx.fillStyle = 'rgba(8,16,38,0.32)';
  ctx.fillRect(camX, camY, VIEW_W, VIEW_H);
  const grad = ctx.createRadialGradient(player.x, player.y - 20, 40, player.x, player.y - 20, 260);
  grad.addColorStop(0, 'rgba(255,220,140,0.10)');
  grad.addColorStop(1, 'rgba(255,220,140,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(camX, camY, VIEW_W, VIEW_H);
  LAMPS.forEach((l, i) => {
    const flick = 0.75 + 0.18 * Math.sin(playT * 11 + i * 3) + (Math.random() < 0.02 ? -0.3 : 0);
    const lg = ctx.createRadialGradient(l.x, l.y - 96, 10, l.x, l.y - 96, 190);
    lg.addColorStop(0, `rgba(255,180,80,${0.22 * flick})`);
    lg.addColorStop(1, 'rgba(255,180,80,0)');
    ctx.fillStyle = lg;
    ctx.fillRect(l.x - 190, l.y - 286, 380, 380);
  });
  if (save.bossDead) {
    const gg = ctx.createRadialGradient(grateCx, grateCy, 5, grateCx, grateCy, 130);
    gg.addColorStop(0, 'rgba(122,199,79,0.18)');
    gg.addColorStop(1, 'rgba(122,199,79,0)');
    ctx.fillStyle = gg;
    ctx.fillRect(grateCx - 130, grateCy - 130, 260, 260);
  }

  fireflies.forEach(f => {
    const a = Math.max(0, Math.min(1, f.life)) * (0.4 + 0.4 * Math.sin(f.ph * 3));
    ctx.globalAlpha = a;
    ctx.fillStyle = '#d8f26e';
    ctx.fillRect(f.x - 1.5, f.y - 1.5, 3, 3);
    ctx.globalAlpha = 1;
  });

  // charge telegraph line
  if (boss && boss.active && boss.state === 'telegraph') {
    const dx = player.x - boss.x, dy = player.y - boss.y;
    const d = Math.hypot(dx, dy) || 1;
    ctx.globalAlpha = 0.25 + 0.2 * Math.sin(playT * 20);
    ctx.strokeStyle = '#e63946';
    ctx.lineWidth = 26;
    ctx.beginPath();
    ctx.moveTo(boss.x, boss.y);
    ctx.lineTo(boss.x + dx / d * 500, boss.y + dy / d * 500);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  if (state === 'play' && !player.dead) {
    if (near(gerald, 70)) prompt(gerald.x, gerald.y - 60, save.quest === 1 && save.hasSandwich ? 'deliver sandwich' : 'talk');
    else if (near(vendy, 80)) prompt(vendy.x, vendy.y - 130, 'shop');
    else if (nearGrate()) prompt(grateTiles[0][0] * T + T, grateTiles[0][1] * T + 70, save.bossDead ? 'descend' : 'inspect');
  }

  ctx.restore();

  // vignette
  const vg = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.45, VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.85);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.38)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  if (slowmoT > 0) {
    ctx.fillStyle = 'rgba(159,216,239,0.07)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
  if (player.hp <= 2 && !player.dead) {
    ctx.globalAlpha = 0.12 + 0.08 * Math.sin(playT * 5);
    ctx.fillStyle = '#e63946';
    ctx.fillRect(0, 0, VIEW_W, 6); ctx.fillRect(0, VIEW_H - 6, VIEW_W, 6);
    ctx.fillRect(0, 0, 6, VIEW_H); ctx.fillRect(VIEW_W - 6, 0, 6, VIEW_H);
    ctx.globalAlpha = 1;
  }

  drawHud();
  drawAreaCard();
  if (state === 'dialog') drawDialog();
  if (state === 'shop') drawShop();
  if (state === 'note') drawNote();
  if (state === 'dead') drawDead();
  if (state === 'end') drawEnd();
}

function prompt(x, y, label) {
  ctx.font = 'bold 14px monospace';
  const txt = '[E] ' + label;
  const w = ctx.measureText(txt).width + 14;
  ctx.fillStyle = 'rgba(10,10,10,0.75)';
  ctx.fillRect(x - w / 2, y - 16, w, 22);
  ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 1;
  ctx.strokeRect(x - w / 2, y - 16, w, 22);
  ctx.fillStyle = '#ffd23f';
  ctx.textAlign = 'center';
  ctx.fillText(txt, x, y);
  ctx.textAlign = 'left';
}

function drawDumpsterFallback(d) {
  const px = d.x * T, py = d.y * T, w = T * 2, h = T * 2;
  ctx.fillStyle = '#2f5d3a'; ctx.fillRect(px, py + 18, w, h - 24);
  ctx.fillStyle = '#3d7a4c'; ctx.fillRect(px, py + 18, w, 14);
  ctx.fillStyle = '#264a2f'; ctx.fillRect(px, py + h - 18, w, 12);
  ctx.fillStyle = '#48905a'; ctx.fillRect(px + 4, py + 6, w - 8, 16);
}
function drawPileFallback(p) {
  const px = p.x * T, py = p.y * T;
  ctx.fillStyle = '#4b5157'; ctx.fillRect(px + 8, py + 10, 14, 16);
  ctx.fillStyle = '#3e444a'; ctx.fillRect(px + 20, py + 16, 16, 18);
  ctx.fillStyle = '#5a4632'; ctx.fillRect(px + 14, py + 24, 20, 10);
}
function drawThroneFallback() {
  const cx = 41 * T, by = 5.4 * T;
  ctx.fillStyle = '#2c3033';
  ctx.beginPath(); ctx.ellipse(cx, by - 8, 88, 30, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#3a3f44';
  ctx.beginPath(); ctx.ellipse(cx - 30, by - 34, 44, 28, 0, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx + 36, by - 28, 40, 26, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#4b5157';
  ctx.beginPath(); ctx.ellipse(cx, by - 52, 46, 24, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#6d3a2a';
  ctx.fillRect(cx - 26, by - 96, 52, 46);
  ctx.fillStyle = '#84483a';
  ctx.fillRect(cx - 26, by - 96, 52, 12);
  ctx.fillRect(cx - 32, by - 70, 8, 26); ctx.fillRect(cx + 24, by - 70, 8, 26);
  ctx.fillStyle = '#c9b458';
  ctx.fillRect(cx - 12, by - 108, 24, 8);
  ctx.fillRect(cx - 12, by - 116, 5, 8); ctx.fillRect(cx - 2, by - 118, 5, 10); ctx.fillRect(cx + 8, by - 116, 5, 8);
}
function drawLamp(l) {
  if (PROPS.lamppost) {
    ctx.drawImage(PROPS.lamppost, l.x - PROPS.lamppost.width / 2, l.y - PROPS.lamppost.height);
  } else {
    ctx.fillStyle = '#2c3033';
    ctx.fillRect(l.x - 4, l.y - 110, 8, 110);
    ctx.fillRect(l.x - 14, l.y - 116, 28, 10);
    ctx.fillStyle = '#ffb450';
    ctx.fillRect(l.x - 8, l.y - 114, 16, 7);
  }
}

function drawPlayer() {
  const blinkOut = player.hurtT > 0 && Math.floor(player.hurtT * 12) % 2 === 0;
  if (blinkOut) return;
  let set = SPRITES.duckDown;
  if (Math.abs(player.fx) > Math.abs(player.fy)) set = player.fx < 0 ? SPRITES.duckLeft : SPRITES.duckRight;
  else if (player.fy < 0) set = SPRITES.duckUp;
  let s;
  if (player.moving) s = Math.floor(player.bob * 1.4) % 2 ? set.a : set.b;
  else s = player.blinkT < 0 ? set.blink : set.idle;
  const bob = player.moving ? Math.abs(Math.sin(player.bob)) * 4 : Math.sin(playT * 2) * 1.2;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.ellipse(player.x, player.y + 12, 20, 8, 0, 0, 7); ctx.fill();
  if (player.dashT > 0) {
    ctx.globalAlpha = 0.5;
    ctx.drawImage(s, player.x - 30 - player.dashVx * 0.04, player.y - 56 - player.dashVy * 0.04);
    ctx.globalAlpha = 1;
  }
  ctx.drawImage(s, player.x - 30, player.y - 56 - bob);
  if (player.attackT > 0) {
    const p = SPRITES.plunger;
    const dur = player.heavy ? 0.28 : 0.22;
    const prog = 1 - player.attackT / dur;
    const sweep = player.heavy ? 3.6 : 2.4;
    const ang = Math.atan2(player.fy, player.fx) + (prog - 0.5) * sweep;
    const reach = player.heavy ? 50 : 42;
    ctx.save();
    ctx.translate(player.x + Math.cos(ang) * reach, player.y - 20 + Math.sin(ang) * reach);
    ctx.rotate(ang + Math.PI / 2);
    ctx.drawImage(p, -p.width / 2, -p.height / 2);
    ctx.restore();
    if (player.heavy) {
      ctx.globalAlpha = 0.3 * (1 - prog);
      ctx.strokeStyle = '#ffd23f';
      ctx.lineWidth = 4;
      ctx.beginPath();
      const a0 = Math.atan2(player.fy, player.fx);
      ctx.arc(player.x, player.y - 20, reach + 8, a0 - 1.5, a0 + 1.5);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
}

function drawEnemy(e) {
  const flash = e.hurtT > 0;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(e.x, e.y + 8, 16, 6, 0, 0, 7); ctx.fill();
  ctx.save();
  if (flash) ctx.filter = 'brightness(2.2)';
  if (e.type === 'rat') {
    const facingL = player.x < e.x;
    if (e.state === 'windup') {
      ctx.translate((Math.random() - 0.5) * 4, 0);
      const s = facingL ? SPRITES.ratWindL : SPRITES.ratWindR;
      ctx.drawImage(s, e.x - s.width / 2, e.y - s.height + 8);
      ctx.restore();
      ctx.fillStyle = '#e63946';
      ctx.font = 'bold 18px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('!', e.x, e.y - 36);
      ctx.textAlign = 'left';
      drawHpPip(e);
      return;
    }
    const frames = facingL ? SPRITES.ratL : SPRITES.ratR;
    const s = frames[Math.floor(e.t * 8) % 2];
    ctx.drawImage(s, e.x - s.width / 2, e.y - s.height + 8);
  } else if (e.type === 'fly') {
    const s = SPRITES.fly[Math.floor(e.t * 18) % 2];
    ctx.drawImage(s, e.x - s.width / 2, e.y - s.height / 2 + Math.sin(e.t * 14) * 3);
  } else if (e.type === 'slime') {
    const s = SPRITES.slime[Math.floor(e.t * 3) % 2];
    ctx.drawImage(s, e.x - s.width / 2, e.y - s.height + 10);
  }
  ctx.restore();
  drawHpPip(e);
}
function drawHpPip(e) {
  if (e.hp < e.maxHp) {
    ctx.fillStyle = '#141414';
    ctx.fillRect(e.x - 16, e.y - 34, 32, 5);
    ctx.fillStyle = '#e63946';
    ctx.fillRect(e.x - 15, e.y - 33, 30 * (e.hp / e.maxHp), 3);
  }
}

function drawBag(bg) {
  if (PROPS.trashbag) {
    ctx.drawImage(PROPS.trashbag, bg.x - PROPS.trashbag.width / 2, bg.y - PROPS.trashbag.height + 8);
  } else {
    ctx.fillStyle = '#2c3033';
    ctx.beginPath(); ctx.ellipse(bg.x, bg.y, 16, 12, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#3a3f44';
    ctx.beginPath(); ctx.ellipse(bg.x - 3, bg.y - 4, 10, 8, 0, 0, 7); ctx.fill();
  }
  if (bg.idx === SANDWICH_BAG && save.quest === 1 && !save.hasSandwich) {
    ctx.globalAlpha = 0.5 + 0.4 * Math.sin(playT * 5);
    ctx.fillStyle = '#ffd23f';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('✦', bg.x + 12, bg.y - 28);
    ctx.fillText('✦', bg.x - 10, bg.y - 18);
    ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
  }
}

function drawGerald() {
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(gerald.x, gerald.y + 8, 14, 6, 0, 0, 7); ctx.fill();
  const s = SPRITES.pigeon[Math.floor(playT * 1.6) % 2];
  ctx.drawImage(s, gerald.x - s.width / 2, gerald.y - s.height + 8);
  if (save.quest === 1 && save.hasSandwich) {
    ctx.fillStyle = '#ffd23f';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('!', gerald.x, gerald.y - 48 + Math.sin(playT * 4) * 3);
    ctx.textAlign = 'left';
  }
}

function drawVendy() {
  if (PROPS.vendy) {
    ctx.drawImage(PROPS.vendy, vendy.x - PROPS.vendy.width / 2, vendy.y - PROPS.vendy.height + 6);
  } else {
    ctx.fillStyle = '#a32633';
    ctx.fillRect(vendy.x - 30, vendy.y - 84, 60, 88);
    ctx.fillStyle = '#e63946';
    ctx.fillRect(vendy.x - 30, vendy.y - 84, 60, 10);
    ctx.fillStyle = '#181c1f';
    ctx.fillRect(vendy.x - 22, vendy.y - 68, 32, 40);
  }
  if (Math.sin(playT * 7) > 0.6) {
    ctx.fillStyle = 'rgba(255,210,63,0.4)';
    ctx.fillRect(vendy.x - 20, vendy.y - 80, 10, 6);
  }
}

function drawBoss() {
  const mad = boss.phase === 2;
  const s = boss.faceL ? (mad ? SPRITES.raccoonMad : SPRITES.raccoon) : (mad ? SPRITES.raccoonMadFlip : SPRITES.raccoonFlip);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.ellipse(boss.x, boss.y + 30, 44, 13, 0, 0, 7); ctx.fill();
  ctx.save();
  let ox = 0, oy = 0;
  if (boss.shake > 0 || boss.state === 'telegraph' || boss.state === 'transition') { ox = (Math.random() - 0.5) * 6; oy = (Math.random() - 0.5) * 4; }
  if (boss.hurtT > 0) ctx.filter = 'brightness(2)';
  if (boss.state === 'stunned') { ctx.filter = 'saturate(0.4) brightness(1.3)'; oy = Math.sin(playT * 20) * 2; }
  ctx.drawImage(s, boss.x - s.width / 2 + ox, boss.y - s.height + 34 + oy);
  if (mad && boss.state !== 'stunned' && boss.state !== 'lidThrow') {
    const lx = boss.x + (boss.faceL ? -40 : 40);
    ctx.drawImage(SPRITES.lid, lx - 18, boss.y - 46);
  }
  ctx.restore();
  if (boss.state === 'telegraph') {
    ctx.fillStyle = '#e63946';
    ctx.font = 'bold 30px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('!', boss.x, boss.y - s.height + 20);
    ctx.textAlign = 'left';
  }
  if (boss.state === 'stunned') {
    ctx.fillStyle = '#ffd23f';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('@ @', boss.x, boss.y - s.height + 26);
    ctx.textAlign = 'left';
  }
}

// ---------- overlays ----------
function drawHud() {
  const pulse = player.hp <= 2 ? 1 + 0.12 * Math.sin(playT * 8) : 1;
  for (let i = 0; i < save.maxHp; i++) {
    const s = i < player.hp ? SPRITES.heart : SPRITES.heartEmpty;
    const w = s.width * (i < player.hp ? pulse : 1);
    ctx.drawImage(s, 14 + i * 26 + (s.width - w) / 2, 12 + (s.width - w) / 2, w, w * s.height / s.width);
  }
  ctx.drawImage(SPRITES.scrap, 16, 44);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 18px monospace';
  ctx.fillText('' + save.scrap, 42, 58);

  const cds = [['DASH', player.dashCd / 1.1, '#9fd8ef']];
  if (save.quack) cds.push(['QUACK', player.quackCd / 0.75, '#ffd23f']);
  cds.forEach(([label, frac, col], i) => {
    const x = 16, y = 74 + i * 20;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(x, y, 70, 12);
    ctx.fillStyle = col;
    ctx.fillRect(x + 1, y + 1, 68 * (1 - Math.max(0, Math.min(1, frac))), 10);
    ctx.fillStyle = '#0a0a0a';
    ctx.font = 'bold 9px monospace';
    ctx.fillText(label, x + 4, y + 10);
  });

  // objective tracker
  ctx.font = '13px monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  let oy = 130;
  const obj = [];
  if (!save.metGerald) obj.push('· someone is cooing nearby...');
  else if (!save.bossDead) obj.push('· beat the Dumpster King (NE)');
  else if (!save.ended) obj.push('· descend into the sewer grate');
  if (save.quest === 1) obj.push(save.hasSandwich ? '· return the sandwich to Gerald' : '· find the Blessed Sandwich (E fence)');
  const loreN = save.lore.filter(Boolean).length;
  if (loreN > 0 && loreN < 3) obj.push('· soggy notes found: ' + loreN + '/3');
  obj.forEach(t => { ctx.fillText(t, 14, oy); oy += 18; });

  if (boss && boss.active && !boss.dead) {
    const w = 420;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(VIEW_W / 2 - w / 2 - 3, 14, w + 6, 24);
    ctx.fillStyle = '#3a3f44';
    ctx.fillRect(VIEW_W / 2 - w / 2, 17, w, 18);
    ctx.fillStyle = boss.phase === 2 ? '#ff6b3d' : '#e63946';
    ctx.fillRect(VIEW_W / 2 - w / 2, 17, w * Math.max(0, boss.hp / boss.maxHp), 18);
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(VIEW_W / 2, 17, 2, 18);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('THE DUMPSTER KING' + (boss.phase === 2 ? ' — ROYALLY UPSET' : ''), VIEW_W / 2, 31);
    ctx.textAlign = 'left';
  }
}

function drawAreaCard() {
  if (areaCardT <= 0) return;
  const a = Math.min(1, areaCardT > 3 ? (4 - areaCardT) * 2 : areaCardT / 1.2);
  ctx.globalAlpha = Math.max(0, Math.min(1, a));
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, VIEW_H / 2 - 70, VIEW_W, 120);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e63946';
  ctx.font = 'bold 16px monospace';
  ctx.fillText('— AREA 1 —', VIEW_W / 2, VIEW_H / 2 - 30);
  ctx.fillStyle = '#f4f6f7';
  ctx.font = 'bold 44px monospace';
  ctx.fillText('THE DUMPSTER', VIEW_W / 2, VIEW_H / 2 + 16);
  ctx.textAlign = 'left';
  ctx.globalAlpha = 1;
}

function drawDialog() {
  if (!dialog) return;
  const [who, text] = dialog.lines[dialog.i];
  dialog.chars = Math.min(text.length, dialog.chars + 1.6);
  const shown = text.slice(0, Math.floor(dialog.chars));

  const h = 130, y = VIEW_H - h - 14;
  ctx.fillStyle = 'rgba(8,10,14,0.92)';
  ctx.fillRect(20, y, VIEW_W - 40, h);
  ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 2;
  ctx.strokeRect(20, y, VIEW_W - 40, h);

  const port = PORTRAITS[who] && PORTRAITS[who]();
  let tx = 44;
  if (port) {
    const scale = 90 / port.height;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(port, 36, y + 20, port.width * scale, 90);
    ctx.restore();
    tx = 36 + port.width * scale + 24;
  }
  const names = { duck: 'UNIDUCK ("a toilet")', gerald: 'GERALD the pigeon', raccoon: 'THE DUMPSTER KING', vendy: 'VENDY-9000', sys: 'HOW TO' };
  ctx.fillStyle = '#e63946';
  ctx.font = 'bold 13px monospace';
  ctx.fillText(names[who] || '', tx, y + 26);
  ctx.fillStyle = '#f4f6f7';
  ctx.font = '16px monospace';
  wrapText(shown, tx, y + 52, VIEW_W - 60 - tx, 22);
  ctx.fillStyle = '#ffd23f';
  ctx.font = '12px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(dialog.chars >= text.length ? '[SPACE / tap] ▸' : '...', VIEW_W - 36, y + h - 12);
  ctx.textAlign = 'left';

  if (input.attack || input.interact) {
    input.attack = input.interact = false;
    if (dialog.chars < text.length) dialog.chars = text.length;
    else {
      dialog.i++;
      dialog.chars = 0;
      Sfx.blip();
      if (dialog.i >= dialog.lines.length) {
        const cb = dialog.onDone;
        dialog = null;
        state = 'play';
        if (cb) cb();
      }
    }
  }
}

function wrapText(text, x, y, maxW, lh) {
  const words = text.split(' ');
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, y); y += lh; line = w;
    } else line = test;
  }
  ctx.fillText(line, x, y);
  return y;
}

function drawNote() {
  if (!noteView) return;
  const n = LORE[noteView.i];
  noteView.chars += 1.8;
  const shown = n.text.slice(0, Math.floor(noteView.chars));
  const w = 560, h = 260, x0 = VIEW_W / 2 - w / 2, y0 = VIEW_H / 2 - h / 2;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = '#e8e4d8';
  ctx.fillRect(x0, y0, w, h);
  ctx.strokeStyle = '#b5ae9c'; ctx.lineWidth = 3;
  ctx.strokeRect(x0 + 6, y0 + 6, w - 12, h - 12);
  ctx.fillStyle = '#a32633';
  ctx.font = 'bold 18px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('~ ' + n.title + ' ~', VIEW_W / 2, y0 + 40);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#23272b';
  ctx.font = '16px monospace';
  wrapText(shown, x0 + 34, y0 + 78, w - 68, 24);
  ctx.fillStyle = '#5e5e66';
  ctx.font = '12px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('[SPACE / tap]', VIEW_W / 2, y0 + h - 20);
  ctx.textAlign = 'left';
  if (input.attack || input.interact) {
    input.attack = input.interact = false;
    if (noteView.chars < n.text.length) { noteView.chars = n.text.length; return; }
    const wasLast = save.lore.every(Boolean);
    noteView = null;
    state = 'play';
    Sfx.blip();
    if (wasLast) startDialog(D.loreDone, () => {});
  }
}

function drawShop() {
  const x0 = VIEW_W / 2 - 260, y0 = 110, w = 520, h = 350;
  ctx.fillStyle = 'rgba(8,10,14,0.94)';
  ctx.fillRect(x0, y0, w, h);
  ctx.strokeStyle = '#e63946'; ctx.lineWidth = 3;
  ctx.strokeRect(x0, y0, w, h);
  ctx.fillStyle = '#e63946';
  ctx.font = 'bold 22px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('VENDY-9000', VIEW_W / 2, y0 + 34);
  ctx.font = '13px monospace';
  ctx.fillStyle = '#8a8a92';
  ctx.fillText('scrap: ' + save.scrap + '  —  [W/S] select  [E] buy  [ESC/tap outside] leave', VIEW_W / 2, y0 + 56);

  SHOP_ITEMS.forEach((it, i) => {
    const ry = y0 + 70 + i * 62;
    const price = itemPrice(it);
    const maxed = price === null || !it.can();
    if (i === shopSel) {
      ctx.fillStyle = 'rgba(230,57,70,0.15)';
      ctx.fillRect(x0 + 12, ry - 8, w - 24, 54);
      ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 1;
      ctx.strokeRect(x0 + 12, ry - 8, w - 24, 54);
    }
    ctx.textAlign = 'left';
    ctx.fillStyle = maxed ? '#5e5e66' : '#f4f6f7';
    ctx.font = 'bold 17px monospace';
    ctx.fillText(it.name, x0 + 28, ry + 14);
    ctx.fillStyle = maxed ? '#44444c' : '#8a8a92';
    ctx.font = '13px monospace';
    const lvl = it.id === 'quack' ? (save.quack ? 1 : 0) : save.buys[it.id];
    ctx.fillText(it.desc + '  (' + lvl + '/' + it.prices.length + ')', x0 + 28, ry + 34);
    ctx.textAlign = 'right';
    ctx.font = 'bold 17px monospace';
    if (maxed) { ctx.fillStyle = '#5e5e66'; ctx.fillText('MAX', x0 + w - 28, ry + 22); }
    else {
      ctx.fillStyle = save.scrap >= price ? '#7ac74f' : '#e63946';
      ctx.fillText(price + ' scrap', x0 + w - 28, ry + 22);
    }
  });
  ctx.textAlign = 'left';
}

function drawCutscene() {
  const panel = CUTSCENE[cut.i];
  const img = PROPS[panel.img];
  ctx.fillStyle = '#05070c';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  if (img && img.width) {
    const sc = Math.min(VIEW_W / img.width, (VIEW_H - 110) / img.height);
    const iw = img.width * sc, ih = img.height * sc;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(img, (VIEW_W - iw) / 2, 20, iw, ih);
    ctx.imageSmoothingEnabled = false;
  }
  cut.chars = Math.min(panel.cap.length, cut.chars + 1.1);
  const shown = panel.cap.slice(0, Math.floor(cut.chars));
  ctx.fillStyle = '#f4f6f7';
  ctx.font = '17px monospace';
  ctx.textAlign = 'center';
  const words = shown.split(' ');
  let line = '', ly = VIEW_H - 74;
  const lines = [];
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (ctx.measureText(t).width > VIEW_W - 200 && line) { lines.push(line); line = w; }
    else line = t;
  }
  lines.push(line);
  lines.forEach(l => { ctx.fillText(l, VIEW_W / 2, ly); ly += 24; });
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.font = '12px monospace';
  ctx.fillText((cut.i + 1) + ' / ' + CUTSCENE.length + '  ·  [SPACE / tap] next  ·  [ESC] skip', VIEW_W / 2, VIEW_H - 18);
  ctx.textAlign = 'left';

  if (input.attack || input.interact) {
    input.attack = input.interact = false;
    if (cut.chars < panel.cap.length) { cut.chars = panel.cap.length; return; }
    cut.i++;
    cut.chars = 0;
    Sfx.blip();
    if (cut.i >= CUTSCENE.length) finishCutscene();
  }
}

function drawTitle() {
  if (titleImg && titleImg.complete && titleImg.naturalWidth) {
    const sc = Math.max(VIEW_W / titleImg.width, VIEW_H / titleImg.height);
    const iw = titleImg.width * sc, ih = titleImg.height * sc;
    ctx.drawImage(titleImg, (VIEW_W - iw) / 2, (VIEW_H - ih) / 2, iw, ih);
    ctx.fillStyle = 'rgba(5,10,18,0.35)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  } else {
    ctx.fillStyle = '#132028';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 48, VIEW_W, 110);
  ctx.fillStyle = '#ffd23f';
  ctx.font = 'bold 64px monospace';
  ctx.fillText('UNIDUCK', VIEW_W / 2, 116);
  ctx.fillStyle = '#f4f6f7';
  ctx.font = '16px monospace';
  ctx.fillText('a toilet’s journey home — area 1: the dumpster', VIEW_W / 2, 144);
  if (Math.sin(playT * 4) > -0.3) {
    ctx.fillStyle = '#fff';
    ctx.fillRect(VIEW_W / 2 - 150, VIEW_H - 92, 300, 40);
    ctx.fillStyle = '#0a0a0a';
    ctx.font = 'bold 18px monospace';
    ctx.fillText(save.seenIntro ? 'TAP / KEY TO CONTINUE' : 'TAP / ANY KEY TO START', VIEW_W / 2, VIEW_H - 66);
  }
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '12px monospace';
  ctx.fillText('WASD move · SPACE plunger (deflects!) · SHIFT flush-dash · E interact · M music · touch OK', VIEW_W / 2, VIEW_H - 24);
  ctx.textAlign = 'left';

  if (anyKeyFlag && playT > 0.5) {
    anyKeyFlag = false;
    startGame();
  }
}

const DEATH_TIPS = [
  'Tip: dash THROUGH attacks — the flush grants invincibility.',
  'Tip: swing your plunger at slime spit to deflect it back.',
  'Tip: a last-instant dash through danger slows time and refunds your flush.',
  'Tip: rats crouch and flash before lunging. That is your cue.',
  'Tip: the third plunger swing in a combo hits harder and wider.',
  'Tip: Vendy trades scrap for power. Trash bags are full of scrap.',
];
let deathTip = 0;

function drawDead() {
  ctx.fillStyle = 'rgba(10,4,6,0.8)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e63946';
  ctx.font = 'bold 44px monospace';
  ctx.fillText('CLOGGED.', VIEW_W / 2, VIEW_H / 2 - 50);
  ctx.fillStyle = '#f4f6f7';
  ctx.font = '16px monospace';
  ctx.fillText('The dump reclaims another fixture. (You keep your scrap.)', VIEW_W / 2, VIEW_H / 2 - 10);
  ctx.fillStyle = '#9fd8ef';
  ctx.font = '14px monospace';
  ctx.fillText(DEATH_TIPS[deathTip % DEATH_TIPS.length], VIEW_W / 2, VIEW_H / 2 + 24);
  ctx.fillStyle = '#ffd23f';
  ctx.font = 'bold 18px monospace';
  if (Math.sin(playT * 4) > -0.3) ctx.fillText('TAP / ANY KEY TO PLUNGE ONWARD', VIEW_W / 2, VIEW_H / 2 + 72);
  ctx.textAlign = 'left';
  if (input.attack || input.interact || input.dash) {
    input.attack = input.interact = input.dash = false;
    deathTip++;
    respawnPlayer();
  }
}

function drawEnd() {
  ctx.fillStyle = 'rgba(6,12,10,0.9)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#7ac74f';
  ctx.font = 'bold 36px monospace';
  ctx.fillText('AREA 1 CLEAR — THE DUMPSTER', VIEW_W / 2, 120);
  ctx.fillStyle = '#f4f6f7';
  ctx.font = '17px monospace';
  ctx.fillText('The grate creaks open. Somewhere below, the sewers gurgle in welcome.', VIEW_W / 2, 168);

  const mins = Math.floor(save.stats.timePlayed / 60);
  const loreN = save.lore.filter(Boolean).length;
  const rows = [
    ['scrap collected', '' + save.stats.scrapTotal],
    ['deaths', '' + save.stats.deaths],
    ['time', mins + 'm'],
    ['soggy notes', loreN + ' / 3'],
    ["Gerald's sandwich", save.quest === 2 ? 'delivered ✓' : 'still out there'],
  ];
  ctx.font = '15px monospace';
  let ry = 220;
  rows.forEach(([k, v]) => {
    ctx.fillStyle = '#8a8a92'; ctx.textAlign = 'right';
    ctx.fillText(k + '  ', VIEW_W / 2, ry);
    ctx.fillStyle = '#f4f6f7'; ctx.textAlign = 'left';
    ctx.fillText('  ' + v, VIEW_W / 2, ry);
    ry += 26;
  });
  ctx.textAlign = 'center';
  if (loreN === 3 && save.quest === 2) {
    ctx.fillStyle = '#ffd23f';
    ctx.font = 'bold 16px monospace';
    ctx.fillText('★ DUMPSTER COMPLETIONIST ★', VIEW_W / 2, ry + 10);
    ry += 30;
  }
  ctx.fillStyle = '#ffd23f';
  ctx.font = 'bold 20px monospace';
  ctx.fillText('NEXT: AREA 2 — THE SEWERS (coming soon)', VIEW_W / 2, ry + 40);
  ctx.fillStyle = '#f4f6f7';
  ctx.font = '15px monospace';
  if (Math.sin(playT * 4) > -0.3) ctx.fillText('[tap / any key] keep exploring the dump', VIEW_W / 2, ry + 90);
  ctx.textAlign = 'left';
  if (input.attack || input.interact) {
    input.attack = input.interact = false;
    state = 'play';
    Music.play('dump');
  }
}

function startGame() {
  if (!save.seenIntro) {
    save.seenIntro = true; writeSave();
    startCutscene();
  } else {
    beginPlay(false);
  }
}

// ---------- boot ----------
function init() {
  loadSave();
  buildSprites();
  loadProps();
  buildWorld();
  renderBackground();
  spawnEnemies();
  spawnBags();
  makeBoss();
  setupTouch();
  player.hp = save.maxHp;
  player.x = 4 * T + T / 2;
  player.y = 26 * T + T / 2;
  camX = Math.max(0, Math.min(MAP_W * T - VIEW_W, player.x - VIEW_W / 2));
  camY = Math.max(0, Math.min(MAP_H * T - VIEW_H, player.y - VIEW_H / 2));
  titleImg = new Image();
  titleImg.src = 'assets/title.png';

  let last = performance.now();
  function frame(now) {
    const rawDt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (hitStop > 0) {
      hitStop -= rawDt;
    } else if (state === 'play') {
      let dt = rawDt;
      if (slowmoT > 0) { slowmoT -= rawDt; dt *= 0.35; }
      update(dt);
    } else {
      playT += rawDt;
      pollAxes();
    }
    draw();
    if (state !== 'play') input.attack = input.dash = input.quack = input.interact = false;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

window.UD = {
  player, get state() { return state; }, set state(v) { state = v; }, save,
  enemies: () => enemies, boss: () => boss, bags: () => bags, startGame,
  lore: LORE, finishCutscene, Music,
};
init();
