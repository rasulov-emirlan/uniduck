'use strict';

const PAL = {
  Y: '#ffd23f', y: '#d9a412', O: '#ff8c1a', o: '#c96a08',
  W: '#f4f6f7', w: '#b8c4c9', v: '#8fa0a7',
  B: '#6fc3df', b: '#4a9dbb',
  K: '#141414', G: '#8a8a92', g: '#5e5e66', P: '#e8a0a8',
  R: '#e63946', r: '#a32633',
  N: '#7a5230', n: '#503418',
  L: '#7ac74f', l: '#4e8a33', d: '#2e5220',
  S: '#3a3f44', s: '#23272b',
  T: '#c9b458', E: '#dfe8ec', M: '#6d4c8f',
};

function makeSprite(rows, scale, flip) {
  scale = scale || 3;
  const h = rows.length, w = rows[0].length;
  const c = document.createElement('canvas');
  c.width = w * scale; c.height = h * scale;
  const x = c.getContext('2d');
  for (let j = 0; j < h; j++) {
    const row = rows[j];
    for (let i = 0; i < w; i++) {
      const col = PAL[row[i]];
      if (!col) continue;
      const px = flip ? (w - 1 - i) : i;
      x.fillStyle = col;
      x.fillRect(px * scale, j * scale, scale, scale);
    }
  }
  return c;
}

const DUCK_DOWN = [
  '......YYYY......',
  '.....YYYYYY.....',
  '.....YYYYYY.....',
  '.....KYYYYK.....',
  '.....YYYYYY.....',
  '......OOOO......',
  '.......Oo.......',
  '......YYYY......',
  '.YY.WWWWWWWW.YY.',
  'YYYWWBYYYYBWWYYY',
  'YyyWBBYYYYBBWyyY',
  '.yyWWBBBBBBWWyy.',
  '..wWWWBBBBWWWw..',
  '...wWWWWWWWWw...',
  '...wWWWWWWWWw...',
  '....wWWWWWWw....',
  '....wwWWWWww....',
  '.....wwwwww.....',
  '......wOOw......',
  '.....OOO........',
];

const DUCK_UP = [
  '......YYYY......',
  '.....YYYYYY.....',
  '.....YYYYYY.....',
  '.....YYYYYY.....',
  '.....yYYYYy.....',
  '......YYYY......',
  '......YYYY......',
  '......YYYY......',
  '.YY.WWWWWWWW.YY.',
  'YYYWWBYYYYBWWYYY',
  'YyyWBBYYYYBBWyyY',
  '.yyWWBBBBBBWWyy.',
  '..wWWWBBBBWWWw..',
  '...wWWWWWWWWw...',
  '...wWWWWWWWWw...',
  '....wWWWWWWw....',
  '....wwWWWWww....',
  '.....wwwwww.....',
  '......wOOw......',
  '.....OOO........',
];

const DUCK_SIDE = [
  '.....YYYY.......',
  '....YYYYYY......',
  '..OOKYYYYY......',
  '..OoYYYYYY......',
  '.....YYYYY......',
  '.....YYYY.......',
  '.....YYYY.......',
  '.....YYYY.......',
  '..W.WWWWWWWW.Y..',
  '.WWWWBYYYYBWWYY.',
  '.WwWBBYYYYBBWyY.',
  '..wWWBBBBBBWWy..',
  '..wWWWBBBBWWWw..',
  '...wWWWWWWWWw...',
  '...wWWWWWWWWw...',
  '....wWWWWWWw....',
  '....wwWWWWww....',
  '.....wwwwww.....',
  '......wOOw......',
  '.....OOO........',
];

const RAT = [
  '..............',
  '.PP.......PP..',
  '.GgG.....GgG..',
  '..GGGGGGGGG...',
  '.KGGGGGGGGGG..',
  '.GGGGGGGGGGGP.',
  '..GgGGGGGgGGPP',
  '..gg.....gg...',
];

const FLY = [
  '.EE..EE.',
  'EEE..EEE',
  '..KKKK..',
  '.KKKKKK.',
  '..KKKK..',
  '...KK...',
];

const SLIME = [
  '....LLLLLL....',
  '..LLLLLLLLLL..',
  '.LLKLLLLLLKL..',
  '.LLLLLLLLLLLL.',
  'LLLLLLdLLLLLLL',
  'LLlLLLLLLLlLLL',
  'lllllllllllll.',
  '.dddddddddd...',
];

const RACCOON = [
  '..gg..............gg..',
  '.gGGg............gGGg.',
  '.gGGGGGGGGGGGGGGGGGg..',
  '..GGGGGGGGGGGGGGGGG...',
  '..GKKKGGGGGGGGKKKG....',
  '..KKKKKGGGGGGKKKKK....',
  '..GKWKGGGGGGGGKWKG....',
  '..GGGGGGssGGGGGGGG....',
  '...GGGGGsKsGGGGGG.....',
  '...GGGGGGGGGGGGGG.....',
  '..GGGGGGGGGGGGGGGG....',
  '.GGGGGGGGGGGGGGGGGG...',
  '.GGGgGGGGGGGGGGgGGG...',
  '.GGGGGGGGGGGGGGGGGGss.',
  '.GGGGGGGGGGGGGGGGGsKs.',
  '..GGGGGGGGGGGGGGGGss..',
  '..gGGGGGGGGGGGGGGg....',
  '...GGG..GGGG..GGG.....',
  '...ggg..gggg..ggg.....',
  '......................',
  '..sGGssGGssGGssGGs....',
  '...ssGGssGGssGGss.....',
];

const PIGEON = [
  '....gGG.....',
  '...GGGGO....',
  '...KGGG.....',
  '...GGGG.....',
  '..GGGGGGGG..',
  '.GGGGGGGGGG.',
  '.GGgggGGGGg.',
  '.GGGGGGGGg..',
  '..GGGGGGg...',
  '...GGGG.....',
  '...O..O.....',
  '..OO..OO....',
];

const VENDY = [
  '.RRRRRRRRRRRRRRRRRR.',
  'RRRRRRRRRRRRRRRRRRRR',
  'RRssssssssssssssRRRR',
  'RRsEEsEEsEEsssssRRRR',
  'RRsTTsLLsPPsssssRRRR',
  'RRssssssssssssssRRRR',
  'RRsEEsEEsEEsssssRRRR',
  'RRsPPsTTsLLsssssRRRR',
  'RRssssssssssssssRRRR',
  'RRRRRRRRRRRRRsERRRRR',
  'RRRRRRRRRRRRRssRRRRR',
  'RrrrrrrrrrrrrrrrrrrR',
  'RrsssssssssrrrrrrrrR',
  'RrrrrrrrrrrrrrrrrrrR',
  '.rr..............rr.',
];

const PLUNGER = [
  '.....NN.....',
  '.....NN.....',
  '.....NN.....',
  '.....NN.....',
  '.....NN.....',
  '....RRRR....',
  '..RRRRRRRR..',
  '.RRRRRRRRRR.',
  '.RRrrrrrrRR.',
  '..rr....rr..',
];

const SCRAP = [
  '..GGG...',
  '.GgGgG..',
  'GGGEGGG.',
  '.GgGgG..',
  '..GGG...',
];

const CRUMB = [
  '.TTT..',
  'TTTTT.',
  'TTnTT.',
  '.TTT..',
];

const SLUDGE = [
  '..LL..',
  '.LLLL.',
  'LLdLLL',
  '.LLLL.',
  '..ll..',
];

const QUACK = [
  '..YYYY..',
  '.Y....Y.',
  'Y..YY..Y',
  'Y..YY..Y',
  '.Y....Y.',
  '..YYYY..',
];

const HEART = [
  '.RR.RR.',
  'RRRRRRR',
  'RRRRRRR',
  '.RRRRR.',
  '..RRR..',
  '...R...',
];

const HEART_EMPTY = [
  '.ss.ss.',
  's..s..s',
  's.....s',
  '.s...s.',
  '..s.s..',
  '...s...',
];

const TRASHBAG = [
  '......ss......',
  '.....sSSs.....',
  '....SSSSSS....',
  '...SSSSSSSS...',
  '..SSSsSSSSSS..',
  '..SSSSSSSsSS..',
  '.SSSSsSSSSSS..',
  '.SSSSSSSSSSSS.',
  '.sSSSSSSsSSSs.',
  '..ssssssssss..',
];

const SPRITES = {};
function buildSprites() {
  SPRITES.duckDown = makeSprite(DUCK_DOWN, 3);
  SPRITES.duckUp = makeSprite(DUCK_UP, 3);
  SPRITES.duckLeft = makeSprite(DUCK_SIDE, 3);
  SPRITES.duckRight = makeSprite(DUCK_SIDE, 3, true);
  SPRITES.ratLeft = makeSprite(RAT, 3);
  SPRITES.ratRight = makeSprite(RAT, 3, true);
  SPRITES.fly = makeSprite(FLY, 2);
  SPRITES.slime = makeSprite(SLIME, 3);
  SPRITES.raccoon = makeSprite(RACCOON, 4);
  SPRITES.raccoonFlip = makeSprite(RACCOON, 4, true);
  SPRITES.pigeon = makeSprite(PIGEON, 3);
  SPRITES.vendy = makeSprite(VENDY, 3);
  SPRITES.plunger = makeSprite(PLUNGER, 2);
  SPRITES.scrap = makeSprite(SCRAP, 2);
  SPRITES.crumb = makeSprite(CRUMB, 2);
  SPRITES.sludge = makeSprite(SLUDGE, 2);
  SPRITES.quack = makeSprite(QUACK, 2);
  SPRITES.heart = makeSprite(HEART, 3);
  SPRITES.heartEmpty = makeSprite(HEART_EMPTY, 3);
  SPRITES.trashbag = makeSprite(TRASHBAG, 3);
}
