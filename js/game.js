'use strict';

const VIEW_W = 960, VIEW_H = 540;
const T = 48;
const MAP_W = 48, MAP_H = 30;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

// ---------- save ----------
const SAVE_KEY = 'uniduck-save-v1';
const defaultSave = () => ({
  v: 1, maxHp: 6, dmg: 1, spdMult: 1, quack: false, scrap: 0,
  bossDead: false, ended: false,
  buys: { hp: 0, dmg: 0, spd: 0 },
  stats: { scrapTotal: 0, deaths: 0, timePlayed: 0 },
  seenIntro: false, metGerald: false,
});
let save = defaultSave();
function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) save = Object.assign(defaultSave(), JSON.parse(raw));
  } catch (e) { save = defaultSave(); }
}
function writeSave() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {}
}

// ---------- world ----------
let grid, objectSolid;
const dumpsters = [], piles = [], puddles = [];
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

  // boss arena: interior x 32..46, y 1..11
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
    for (let i = 0; i < 5; i++) {
      b.fillStyle = Math.random() < 0.5 ? '#3d4144' : '#4c5054';
      b.fillRect(x * T + (Math.random() * T | 0), y * T + (Math.random() * T | 0), 3, 3);
    }
    if (Math.random() < 0.06) {
      b.fillStyle = 'rgba(30,34,30,0.5)';
      b.beginPath();
      b.ellipse(x * T + T / 2, y * T + T / 2, 8 + Math.random() * 14, 5 + Math.random() * 8, 0, 0, 7);
      b.fill();
    }
  }

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

  piles.forEach(p => {
    const px = p.x * T, py = p.y * T;
    b.fillStyle = '#33383c';
    b.beginPath(); b.ellipse(px + T / 2, py + T - 8, 22, 10, 0, 0, 7); b.fill();
    b.fillStyle = '#4b5157'; b.fillRect(px + 8, py + 10, 14, 16);
    b.fillStyle = '#3e444a'; b.fillRect(px + 20, py + 16, 16, 18);
    b.fillStyle = '#5a4632'; b.fillRect(px + 14, py + 24, 20, 10);
    b.fillStyle = '#6b7278'; b.fillRect(px + 24, py + 8, 8, 12);
  });

  dumpsters.forEach(d => {
    const px = d.x * T, py = d.y * T, w = T * 2, h = T * 2;
    b.fillStyle = 'rgba(0,0,0,0.35)'; b.fillRect(px + 4, py + h - 10, w - 4, 12);
    b.fillStyle = '#2f5d3a'; b.fillRect(px, py + 18, w, h - 24);
    b.fillStyle = '#3d7a4c'; b.fillRect(px, py + 18, w, 14);
    b.fillStyle = '#264a2f'; b.fillRect(px, py + h - 18, w, 12);
    b.fillStyle = '#48905a'; b.fillRect(px + 4, py + 6, w - 8, 16);
    b.fillStyle = '#1e3a25';
    b.fillRect(px + 10, py + 40, 10, 22); b.fillRect(px + w - 20, py + 40, 10, 22);
    b.fillStyle = '#233';
    b.fillRect(px + w / 2 - 12, py + 28, 24, 6);
  });

  b.fillStyle = 'rgba(230,57,70,0.9)';
  b.font = 'bold 22px monospace';
  b.save();
  b.translate(6.9 * T, 3.6 * T); b.rotate(-0.08);
  b.fillText('KEEP OUT', 0, 0);
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
  if (e.code === 'Escape') { if (state === 'shop') closeShop(); }
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

// touch
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
  else if (state === 'dialog') input.attack = true;
  else if (state === 'title' || state === 'dead' || state === 'end') input.attack = true;
});

// ---------- entities ----------
const player = {
  x: 0, y: 0, hp: 6, fx: 0, fy: 1, moving: false, bob: 0,
  attackT: 0, attackCd: 0, dashT: 0, dashCd: 0, dashVx: 0, dashVy: 0,
  quackCd: 0, hurtT: 0, dead: false,
};
const gerald = { x: 0, y: 0, talks: 0 };
const vendy = { x: 0, y: 0, used: false };

let enemies = [], projectiles = [], pickups = [], bags = [], particles = [], floaters = [];
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
  bags = BAG_SPAWNS.map(([x, y]) => ({ x: x * T + T / 2, y: y * T + T / 2, hp: 1, dead: false }));
}

function makeBoss() {
  boss = {
    x: 40 * T, y: 6 * T, hp: 40, maxHp: 40, active: false, dead: save.bossDead,
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
  duck: () => SPRITES.duckDown, gerald: () => SPRITES.pigeon,
  raccoon: () => SPRITES.raccoon, vendy: () => SPRITES.vendy, sys: () => null,
};

function startDialog(lines, onDone) {
  dialog = { lines, i: 0, chars: 0, onDone };
  state = 'dialog';
}

const D = {
  intro: [
    ['duck', "Ugh... my lid. Where am I?"],
    ['duck', "GARBAGE?! A refined porcelain toilet like myself does not belong in a DUMPSTER."],
    ['duck', "I must get back to my apartment. Bathrooms have standards."],
    ['sys', "Move: WASD / left stick. Plunger: J or SPACE. Flush Dash: K or SHIFT (invincible!)."],
  ],
  gerald1: [
    ['gerald', "Whoa. A talking duck."],
    ['duck', "Duck? DUCK? I am a TOILET, sir. Note the elegant bowl. The flush. The duck parts are purely decorative."],
    ['gerald', "...Right. Well, 'toilet', the only way outta this dump is the sewer grate up north-east."],
    ['gerald', "Problem: the DUMPSTER KING guards it. Big raccoon. Real trash attitude."],
    ['gerald', "Whack rats, pop trash bags, collect scrap. Vendy the vending machine trades scrap for upgrades. You'll need 'em."],
  ],
  geraldMore: [
    [['gerald', "Rats telegraph their lunge. Dash THROUGH it — the flush makes you untouchable."]],
    [['gerald', "The King charges like an idiot. Let him hit a wall, then go to town on him."]],
    [['gerald', "Broke? Trash bags respawn... wait, no, rats respawn. Ecology of the dump, baby."]],
  ],
  bossIntro: [
    ['raccoon', "WHO DARES WADDLE INTO MY KINGDOM OF FILTH?"],
    ['duck', "A toilet, on his way home. Step aside, garbage rodent."],
    ['raccoon', "A TOILET? HA! You're the weirdest duck I've ever seen. And I ate a weather balloon once."],
    ['raccoon', "The grate stays SHUT. Your porcelain is MINE!"],
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
    ['duck', "Hold on, apartment 4B. Your favorite fixture is coming home."],
  ],
  vendyFirst: [
    ['vendy', "CLANK. BZZT. The ancient vending machine flickers to life. It hungers for scrap."],
  ],
};

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
function openShop() {
  state = 'shop'; shopSel = 0; Sfx.blip();
}
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
function playerAttack() {
  player.attackT = 0.22; player.attackCd = 0.38;
  Sfx.swing();
  const range = 62, arcCos = -0.15;
  const targets = enemies.filter(e => !e.dead && e.respawnT <= 0);
  if (boss && boss.active && !boss.dead) targets.push(boss);
  targets.forEach(e => {
    const dx = e.x - player.x, dy = e.y - player.y;
    const d = Math.hypot(dx, dy) || 1;
    const big = e === boss ? 40 : 0;
    if (d > range + big) return;
    if ((dx / d) * player.fx + (dy / d) * player.fy < arcCos) return;
    hitEnemy(e, save.dmg, dx / d, dy / d);
  });
  bags.forEach(bg => {
    if (bg.dead) return;
    if (Math.hypot(bg.x - player.x, bg.y - player.y) > range + 10) return;
    bg.dead = true;
    Sfx.hit(); burst(bg.x, bg.y, '#3a3f44', 10);
    dropLoot(bg.x, bg.y, 2, 4, 0.25);
  });
}

function hitEnemy(e, dmg, nx, ny) {
  if (e === boss) {
    let mult = boss.state === 'stunned' ? 2 : 1;
    boss.hp -= dmg * mult; boss.hurtT = 0.15; boss.shake = 0.2;
    Sfx.hit();
    floatText(boss.x, boss.y - 60, '-' + dmg * mult, mult > 1 ? '#ffd23f' : '#fff');
    burst(boss.x, boss.y, '#8a8a92', 6);
    if (boss.hp <= 0) killBoss();
    return;
  }
  e.hp -= dmg; e.hurtT = 0.15;
  e.x += nx * 20; e.y += ny * 20;
  Sfx.hit();
  floatText(e.x, e.y - 30, '-' + dmg);
  if (e.hp <= 0) {
    e.dead = true; e.respawnT = 26 + Math.random() * 14;
    burst(e.x, e.y, e.type === 'slime' ? '#7ac74f' : '#8a8a92', 12);
    if (e.type === 'rat') dropLoot(e.x, e.y, 4, 6, 0.12);
    if (e.type === 'fly') dropLoot(e.x, e.y, 1, 2, 0.05);
    if (e.type === 'slime') dropLoot(e.x, e.y, 8, 12, 0.2);
  }
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
    setTimeout(() => { state = 'dead'; }, 600);
  }
}

function killBoss() {
  boss.dead = true; boss.active = false;
  save.bossDead = true; writeSave();
  Sfx.boom(); Sfx.win();
  shake = 0.6;
  burst(boss.x, boss.y, '#8a8a92', 40, 220);
  burst(boss.x, boss.y, '#e63946', 20, 180);
  dropLoot(boss.x, boss.y, 28, 32, 1);
  gateClosed = false;
  setTimeout(() => startDialog(D.bossDead, () => {}), 800);
}

function respawnPlayer() {
  player.dead = false;
  player.hp = save.maxHp;
  player.x = 4 * T + T / 2; player.y = 26 * T + T / 2;
  player.hurtT = 1.2; player.dashT = 0; player.dashCd = 0; player.attackCd = 0; player.quackCd = 0;
  projectiles = [];
  spawnEnemies();
  if (boss && !save.bossDead) { makeBoss(); gateClosed = false; bossIntroDone = false; }
  state = 'play';
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

  if (boss.state === 'idle') {
    if (dist > 90) moveEntity(boss, dx / dist * 60 * dt, dy / dist * 60 * dt, bhalf);
    if (boss.stT <= 0) {
      const canSummon = boss.hp < boss.maxHp / 2 && boss.summonCd <= 0 && enemies.filter(e => e.arena && !e.dead).length < 3;
      const roll = Math.random();
      if (canSummon && roll < 0.3) {
        boss.state = 'summon'; boss.stT = 0.8; Sfx.roar();
      } else if (roll < 0.62) {
        boss.state = 'toss'; boss.volleys = 3; boss.stT = 0.4;
      } else {
        boss.state = 'telegraph'; boss.stT = 0.7; Sfx.roar();
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
      boss.stT = 0.5;
      if (boss.volleys <= 0) { boss.state = 'idle'; boss.stT = 1.1; }
    }
  } else if (boss.state === 'telegraph') {
    if (boss.stT <= 0) {
      boss.state = 'charge'; boss.stT = 1.0;
      boss.chTx = dx / dist; boss.chTy = dy / dist;
    }
  } else if (boss.state === 'charge') {
    const step = 520 * dt;
    const nx = boss.x + boss.chTx * step, ny = boss.y + boss.chTy * step;
    if (boxFree(nx, ny, bhalf)) { boss.x = nx; boss.y = ny; }
    else {
      boss.state = 'stunned'; boss.stT = 1.4;
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
      boss.summonCd = 14;
      boss.state = 'idle'; boss.stT = 1.0;
    }
  }

  if (boss.state !== 'charge' && dist < bhalf + 14) hurtPlayer(1, boss.x, boss.y);
}

// ---------- update ----------
let shake = 0;
let camX = 0, camY = 0;
let playT = 0;

function update(dt) {
  playT += dt;
  save.stats.timePlayed += dt;
  pollAxes();

  // player
  if (!player.dead) {
    player.attackCd = Math.max(0, player.attackCd - dt);
    player.dashCd = Math.max(0, player.dashCd - dt);
    player.quackCd = Math.max(0, player.quackCd - dt);
    player.hurtT = Math.max(0, player.hurtT - dt);

    if (player.dashT > 0) {
      player.dashT -= dt;
      moveEntity(player, player.dashVx * dt, player.dashVy * dt, 14);
      if (Math.random() < 0.7) particles.push({ x: player.x + (Math.random() * 24 - 12), y: player.y + 6, vx: 0, vy: -30, life: 0.4, col: '#9fd8ef', size: 4 });
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
      }
      if (input.dash && player.dashCd <= 0) {
        const m = mv ? 1 : 0;
        const vx = m ? input.ax : player.fx, vy = m ? input.ay : player.fy;
        const mm = Math.hypot(vx, vy) || 1;
        player.dashT = 0.18; player.dashCd = 1.1;
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

    // interactions
    if (input.interact) {
      if (near(gerald, 70)) {
        if (!save.metGerald) {
          save.metGerald = true; writeSave();
          startDialog(D.gerald1, () => {});
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
        if (dist < 200 && !player.dead) { e.state = 'chase'; }
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
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.life <= 0) return false;
    if (!boxFree(p.x, p.y, 5)) { burst(p.x, p.y, p.kind === 'quack' ? '#ffd23f' : '#4e8a33', 5, 60); return false; }
    if (p.kind === 'quack') {
      let hit = false;
      const targets = enemies.filter(e => !e.dead);
      if (boss && boss.active && !boss.dead) targets.push(boss);
      for (const e of targets) {
        const r = e === boss ? 44 : 18;
        if (Math.hypot(e.x - p.x, e.y - p.y) < r) { hitEnemy(e, save.dmg, p.vx / 380, p.vy / 380); hit = true; break; }
      }
      if (!hit) for (const bg of bags) {
        if (!bg.dead && Math.hypot(bg.x - p.x, bg.y - p.y) < 20) {
          bg.dead = true; dropLoot(bg.x, bg.y, 2, 4, 0.25); burst(bg.x, bg.y, '#3a3f44', 10); hit = true; break;
        }
      }
      return !hit;
    } else {
      if (!player.dead && Math.hypot(player.x - p.x, (player.y - 20) - p.y) < 22) {
        hurtPlayer(1, p.x, p.y);
        return false;
      }
      return true;
    }
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
      } else {
        player.hp = Math.min(save.maxHp, player.hp + 1);
        Sfx.crumb();
        floatText(player.x, player.y - 60, '+1 hp', '#7ac74f');
      }
      writeSave();
      return false;
    }
    return true;
  });

  particles = particles.filter(p => { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.94; p.vy *= 0.94; return p.life > 0; });
  floaters = floaters.filter(f => { f.life -= dt; f.y -= 40 * dt; return f.life > 0; });

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
  state = 'end';
}

// ---------- render ----------
let titleImg = null;

function draw() {
  ctx.fillStyle = '#0d1117';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  if (state === 'title') { drawTitle(); return; }

  ctx.save();
  const sh = shake > 0 ? shake * 14 : 0;
  ctx.translate(-Math.round(camX) + (Math.random() - 0.5) * sh, -Math.round(camY) + (Math.random() - 0.5) * sh);

  ctx.drawImage(bgCanvas, 0, 0);

  // gate
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

  // grate glow when unlocked
  if (save.bossDead) {
    const g = Math.sin(playT * 3) * 0.15 + 0.35;
    grateTiles.forEach(([tx, ty]) => {
      ctx.fillStyle = `rgba(122,199,79,${g})`;
      ctx.fillRect(tx * T, ty * T, T, T);
    });
  }

  // pickups below entities
  pickups.forEach(pk => {
    const s = pk.kind === 'scrap' ? SPRITES.scrap : SPRITES.crumb;
    const bob = Math.sin(playT * 5 + pk.x) * 3;
    ctx.drawImage(s, pk.x - s.width / 2, pk.y - s.height / 2 + bob);
  });

  // entities sorted by y
  const ents = [];
  bags.forEach(bg => { if (!bg.dead) ents.push({ y: bg.y, draw: () => drawBag(bg) }); });
  enemies.forEach(e => { if (!e.dead) ents.push({ y: e.y, draw: () => drawEnemy(e) }); });
  ents.push({ y: gerald.y, draw: drawGerald });
  ents.push({ y: vendy.y, draw: drawVendy });
  if (boss && !boss.dead && (boss.active || !save.bossDead)) ents.push({ y: boss.y, draw: drawBoss });
  if (!player.dead || player.hp > 0) ents.push({ y: player.y, draw: drawPlayer });
  ents.sort((a, b) => a.y - b.y).forEach(e => e.draw());

  // projectiles
  projectiles.forEach(p => {
    if (p.kind === 'quack') {
      const s = SPRITES.quack;
      ctx.drawImage(s, p.x - s.width / 2, p.y - s.height / 2);
    } else if (p.kind === 'sludge') {
      const s = SPRITES.sludge;
      ctx.drawImage(s, p.x - s.width / 2, p.y - s.height / 2);
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

  // night tint + player light
  ctx.fillStyle = 'rgba(8,16,38,0.28)';
  ctx.fillRect(camX, camY, VIEW_W, VIEW_H);
  const grad = ctx.createRadialGradient(player.x, player.y - 20, 40, player.x, player.y - 20, 260);
  grad.addColorStop(0, 'rgba(255,220,140,0.10)');
  grad.addColorStop(1, 'rgba(255,220,140,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(camX, camY, VIEW_W, VIEW_H);

  // interact prompts
  if (state === 'play' && !player.dead) {
    if (near(gerald, 70)) prompt(gerald.x, gerald.y - 60, 'talk');
    else if (near(vendy, 80)) prompt(vendy.x, vendy.y - 70, 'shop');
    else if (nearGrate()) prompt(grateTiles[0][0] * T + T, grateTiles[0][1] * T + 60, save.bossDead ? 'descend' : 'inspect');
  }

  ctx.restore();

  drawHud();
  if (state === 'dialog') drawDialog();
  if (state === 'shop') drawShop();
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

function drawPlayer() {
  const blink = player.hurtT > 0 && Math.floor(player.hurtT * 12) % 2 === 0;
  if (blink) return;
  let s = SPRITES.duckDown;
  if (Math.abs(player.fx) > Math.abs(player.fy)) s = player.fx < 0 ? SPRITES.duckLeft : SPRITES.duckRight;
  else if (player.fy < 0) s = SPRITES.duckUp;
  const bob = player.moving ? Math.abs(Math.sin(player.bob)) * 4 : 0;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.ellipse(player.x, player.y + 12, 20, 8, 0, 0, 7); ctx.fill();
  if (player.dashT > 0) {
    ctx.globalAlpha = 0.5;
    ctx.drawImage(s, player.x - 24 - player.dashVx * 0.04, player.y - 46 - player.dashVy * 0.04);
    ctx.globalAlpha = 1;
  }
  ctx.drawImage(s, player.x - 24, player.y - 46 - bob);
  if (player.attackT > 0) {
    const p = SPRITES.plunger;
    const prog = 1 - player.attackT / 0.22;
    const ang = Math.atan2(player.fy, player.fx) + (prog - 0.5) * 2.4;
    ctx.save();
    ctx.translate(player.x + Math.cos(ang) * 42, player.y - 20 + Math.sin(ang) * 42);
    ctx.rotate(ang + Math.PI / 2);
    ctx.drawImage(p, -p.width / 2, -p.height / 2);
    ctx.restore();
  }
}

function drawEnemy(e) {
  const flash = e.hurtT > 0;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(e.x, e.y + 8, 16, 6, 0, 0, 7); ctx.fill();
  ctx.save();
  if (flash) { ctx.filter = 'brightness(2.2)'; }
  if (e.type === 'rat') {
    const s = player.x < e.x ? SPRITES.ratLeft : SPRITES.ratRight;
    if (e.state === 'windup') {
      ctx.translate((Math.random() - 0.5) * 4, 0);
      ctx.filter = 'brightness(1.8)';
    }
    ctx.drawImage(s, e.x - s.width / 2, e.y - s.height + 8);
  } else if (e.type === 'fly') {
    const s = SPRITES.fly;
    ctx.drawImage(s, e.x - s.width / 2, e.y - s.height / 2 + Math.sin(e.t * 14) * 3);
  } else if (e.type === 'slime') {
    const s = SPRITES.slime;
    const sq = 1 + Math.sin(e.t * 5) * 0.08;
    ctx.translate(e.x, e.y + 8);
    ctx.scale(1 / sq, sq);
    ctx.drawImage(s, -s.width / 2, -s.height);
  }
  ctx.restore();
  if (e.hp < e.maxHp) {
    ctx.fillStyle = '#141414';
    ctx.fillRect(e.x - 16, e.y - 34, 32, 5);
    ctx.fillStyle = '#e63946';
    ctx.fillRect(e.x - 15, e.y - 33, 30 * (e.hp / e.maxHp), 3);
  }
}

function drawBag(bg) {
  const s = SPRITES.trashbag;
  ctx.drawImage(s, bg.x - s.width / 2, bg.y - s.height + 6);
}

function drawGerald() {
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(gerald.x, gerald.y + 8, 14, 6, 0, 0, 7); ctx.fill();
  const s = SPRITES.pigeon;
  ctx.drawImage(s, gerald.x - s.width / 2, gerald.y - s.height + 8 + Math.sin(playT * 2) * 1.5);
}

function drawVendy() {
  const s = SPRITES.vendy;
  ctx.drawImage(s, vendy.x - s.width / 2, vendy.y - s.height + 4);
  if (Math.sin(playT * 7) > 0.6) {
    ctx.fillStyle = 'rgba(255,210,63,0.5)';
    ctx.fillRect(vendy.x - s.width / 2 + 6, vendy.y - s.height + 10, 8, 6);
  }
}

function drawBoss() {
  const s = boss.faceL ? SPRITES.raccoon : SPRITES.raccoonFlip;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.ellipse(boss.x, boss.y + 30, 40, 12, 0, 0, 7); ctx.fill();
  ctx.save();
  let ox = 0, oy = 0;
  if (boss.shake > 0 || boss.state === 'telegraph') { ox = (Math.random() - 0.5) * 6; oy = (Math.random() - 0.5) * 4; }
  if (boss.hurtT > 0) ctx.filter = 'brightness(2)';
  if (boss.state === 'stunned') { ctx.filter = 'saturate(0.4) brightness(1.3)'; oy = Math.sin(playT * 20) * 2; }
  ctx.drawImage(s, boss.x - s.width / 2 + ox, boss.y - s.height + 34 + oy);
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
  for (let i = 0; i < save.maxHp; i++) {
    const s = i < player.hp ? SPRITES.heart : SPRITES.heartEmpty;
    ctx.drawImage(s, 14 + i * 26, 12);
  }
  ctx.drawImage(SPRITES.scrap, 16, 44);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 18px monospace';
  ctx.fillText('' + save.scrap, 42, 58);

  // cooldowns
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

  if (boss && boss.active && !boss.dead) {
    const w = 420;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(VIEW_W / 2 - w / 2 - 3, 14, w + 6, 24);
    ctx.fillStyle = '#3a3f44';
    ctx.fillRect(VIEW_W / 2 - w / 2, 17, w, 18);
    ctx.fillStyle = '#e63946';
    ctx.fillRect(VIEW_W / 2 - w / 2, 17, w * Math.max(0, boss.hp / boss.maxHp), 18);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('THE DUMPSTER KING', VIEW_W / 2, 31);
    ctx.textAlign = 'left';
  }

  if (state === 'play' && playT < 12 && !save.metGerald) {
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('find someone to talk to... [E]', VIEW_W / 2, VIEW_H - 18);
    ctx.textAlign = 'left';
  }
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
    if (dialog.chars < text.length) { dialog.chars = text.length; }
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
  ctx.fillText('WASD move · SPACE/J plunger · SHIFT/K flush-dash · E interact · works on touch', VIEW_W / 2, VIEW_H - 24);
  ctx.textAlign = 'left';

  if (anyKeyFlag && playT > 0.5) {
    anyKeyFlag = false;
    startGame();
  }
}

function drawDead() {
  ctx.fillStyle = 'rgba(10,4,6,0.8)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e63946';
  ctx.font = 'bold 44px monospace';
  ctx.fillText('CLOGGED.', VIEW_W / 2, VIEW_H / 2 - 40);
  ctx.fillStyle = '#f4f6f7';
  ctx.font = '16px monospace';
  ctx.fillText('The dump reclaims another fixture. (You keep your scrap.)', VIEW_W / 2, VIEW_H / 2);
  ctx.fillStyle = '#ffd23f';
  ctx.font = 'bold 18px monospace';
  if (Math.sin(playT * 4) > -0.3) ctx.fillText('TAP / ANY KEY TO PLUNGE ONWARD', VIEW_W / 2, VIEW_H / 2 + 60);
  ctx.textAlign = 'left';
  if (input.attack || input.interact || input.dash) {
    input.attack = input.interact = input.dash = false;
    respawnPlayer();
  }
}

function drawEnd() {
  ctx.fillStyle = 'rgba(6,12,10,0.88)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#7ac74f';
  ctx.font = 'bold 36px monospace';
  ctx.fillText('AREA 1 CLEAR — THE DUMPSTER', VIEW_W / 2, 150);
  ctx.fillStyle = '#f4f6f7';
  ctx.font = '17px monospace';
  const mins = Math.floor(save.stats.timePlayed / 60);
  ctx.fillText('The grate creaks open. Somewhere below, the sewers gurgle in welcome.', VIEW_W / 2, 200);
  ctx.fillStyle = '#8a8a92';
  ctx.font = '15px monospace';
  ctx.fillText('scrap collected: ' + save.stats.scrapTotal + '   ·   deaths: ' + save.stats.deaths + '   ·   time: ' + mins + 'm', VIEW_W / 2, 250);
  ctx.fillStyle = '#ffd23f';
  ctx.font = 'bold 20px monospace';
  ctx.fillText('NEXT: AREA 2 — THE SEWERS (coming soon)', VIEW_W / 2, 320);
  ctx.fillStyle = '#f4f6f7';
  ctx.font = '15px monospace';
  if (Math.sin(playT * 4) > -0.3) ctx.fillText('[tap / any key] keep exploring the dump', VIEW_W / 2, 400);
  ctx.textAlign = 'left';
  if (input.attack || input.interact) {
    input.attack = input.interact = false;
    state = 'play';
  }
}

function startGame() {
  state = 'play';
  if (!save.seenIntro) {
    save.seenIntro = true; writeSave();
    startDialog(D.intro, () => {});
  }
}

// ---------- boot ----------
function init() {
  loadSave();
  buildSprites();
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
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (state === 'play') update(dt);
    else { playT += dt; pollAxes(); }
    draw();
    if (state !== 'play') input.attack = input.dash = input.quack = input.interact = false;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

window.UD = { player, get state() { return state; }, set state(v) { state = v; }, save, enemies: () => enemies, boss: () => boss, startGame };
init();
