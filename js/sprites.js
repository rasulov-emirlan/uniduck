'use strict';

const PAL = {
  Y: '#ffd23f', y: '#d9a412', h: '#ffe58a',
  O: '#ff8c1a', o: '#c96a08',
  W: '#f4f6f7', w: '#b8c4c9', v: '#8fa0a7', E: '#ffffff',
  B: '#6fc3df', b: '#4a9dbb',
  K: '#141414', X: '#f4f6f7',
  G: '#8a8a92', g: '#5e5e66', F: '#43434b',
  P: '#e8a0a8', p: '#b56d76',
  R: '#e63946', r: '#a32633',
  N: '#7a5230', n: '#503418',
  L: '#7ac74f', l: '#4e8a33', d: '#2e5220',
  S: '#3a3f44', s: '#23272b',
  T: '#c9b458', t: '#8f7d33',
  C: '#9fd8ef', M: '#c77dff',
  A: '#e8e4d8', a: '#b5ae9c',
};

function makeSprite(rows, scale, flip, remap) {
  scale = scale || 3;
  const h = rows.length, w = rows[0].length;
  const c = document.createElement('canvas');
  c.width = w * scale; c.height = h * scale;
  const x = c.getContext('2d');
  for (let j = 0; j < h; j++) {
    const row = rows[j];
    for (let i = 0; i < w; i++) {
      let ch = row[i];
      if (remap && remap[ch]) ch = remap[ch];
      const col = PAL[ch];
      if (!col) continue;
      const px = flip ? (w - 1 - i) : i;
      x.fillStyle = col;
      x.fillRect(px * scale, j * scale, scale, scale);
    }
  }
  return c;
}

// duck body (shared head+bowl), feet appended per frame
const DUCK_DOWN_BODY = [
  '......NNNNNN........',
  '.....NNNNNNNN.......',
  '....NNnnNNnnNN......',
  '....NYYYYYYYYN......',
  '....nYKYYYYKYn......',
  '.....YYYYYYYY.......',
  '.....hYOOOOYh.......',
  '......YOOOoY........',
  '......yYYYYy........',
  '.......YYYY.........',
  '.YYy.WWWWWWWWWW.yYY.',
  'YYYyWEWWWWWWWWEWyYYY',
  'YyyyWBBYYYYYYBBWyyyY',
  '.yyWWBbYYYYYYbBWWyy.',
  '..yWWBBbYYYYbBBWWy..',
  '...WWWBBbYYbBBBWWW..',
  '...wWWWWBBBBWWWWw...',
  '....wWWWWWWWWWWw....',
  '....wWEWWWWWWWEw....',
  '.....wWWWWWWWWw.....',
  '.....wwWWWWWWww.....',
  '......wwwwwwww......',
];
const DUCK_UP_BODY = [
  '......NNNNNN........',
  '.....NNNNNNNN.......',
  '....NNNNNNNNNN......',
  '....NNnNNNNnNN......',
  '....nNNNNNNNNn......',
  '.....YYYYYYYY.......',
  '.....yYYYYYYy.......',
  '......YYYYYY........',
  '......yYYYYy........',
  '.......YYYY.........',
  '.YYy.WWWWWWWWWW.yYY.',
  'YYYyWEWWWWWWWWEWyYYY',
  'YyyyWBBYYYYYYBBWyyyY',
  '.yyWWBbYYYYYYbBWWyy.',
  '..yWWBBbYYYYbBBWWy..',
  '...WWWBBbYYbBBBWWW..',
  '...wWWWWBBBBWWWWw...',
  '....wWWWWWWWWWWw....',
  '....wWEWWWWWWWEw....',
  '.....wWWWWWWWWw.....',
  '.....wwWWWWWWww.....',
  '......wwwwwwww......',
];
const DUCK_SIDE_BODY = [
  '.......NNNNNN.......',
  '......NNNNNNNN......',
  '.....NNnnNNNNNN.....',
  '.....NYYYYYYYNN.....',
  '..OOOYKYYYYYYYn.....',
  '..OooYYYYYYYYY......',
  '......YYYYYYYy......',
  '......yYYYYYy.......',
  '.......YYYY.........',
  '.......YYYY.........',
  '..WW.WWWWWWWWWW.YYY.',
  '.WWWWWEWWWWWWWEWYYYy',
  '.WwwWBBYYYYYYBBWyyy.',
  '..wWWBbYYYYYYbBWWy..',
  '..wWWBBbYYYYbBBWWw..',
  '...WWWBBbYYbBBWWW...',
  '...wWWWWBBBBWWWWw...',
  '....wWWWWWWWWWWw....',
  '....wWEWWWWWWWEw....',
  '.....wWWWWWWWWw.....',
  '.....wwWWWWWWww.....',
  '......wwwwwwww......',
];
const FEET_A = [
  '.......wOOOw........',
  '......OOOo..........',
];
const FEET_B = [
  '.......wOOOw........',
  '..........oOOO......',
];
const FEET_IDLE = [
  '.......wOOOw........',
  '........OOo.........',
];

const RAT_A = [
  '................',
  '..PP........PP..',
  '..GpG......GpG..',
  '...GGGGGGGGGG...',
  '..KGGGGGGGGGGG..',
  '..GGGgGGGGgGGGp.',
  '.oGGGGGGGGGGGGpP',
  '..GGgGGGGGGgGGP.',
  '...gg....gg.....',
  '..gg....gg......',
];
const RAT_B = [
  '................',
  '..PP........PP..',
  '..GpG......GpG..',
  '...GGGGGGGGGG...',
  '..KGGGGGGGGGGG..',
  '..GGGgGGGGgGGGp.',
  '.oGGGGGGGGGGGGpP',
  '..GGgGGGGGGgGGP.',
  '..gg....gg......',
  '...gg....gg.....',
];
const RAT_WINDUP = [
  '................',
  '................',
  '..PP........PP..',
  '..GpG......GpG..',
  '..KGGGGGGGGGGG..',
  '..KGGgGGGGgGGGp.',
  '.oGGGGGGGGGGGGpP',
  '..GGgGGGGGGgGGP.',
  '..gggg..gggg....',
  '................',
];

const FLY_A = [
  '.CC....CC.',
  'CCC....CCC',
  '.CKKKKKKC.',
  '..KKKKKK..',
  '..KgKKgK..',
  '...KKKK...',
  '....KK....',
];
const FLY_B = [
  '..........',
  'CC......CC',
  '.CKKKKKKC.',
  'CCKKKKKKCC',
  '..KgKKgK..',
  '...KKKK...',
  '....KK....',
];

const SLIME_A = [
  '.....LLLLLL.....',
  '...LLLLLLLLLL...',
  '..LLhLLLLLLLLL..',
  '..LKKLLLLLKKLL..',
  '.LLLLLLLLLLLLLL.',
  '.LLLLLdddLLLLLL.',
  'LLlLLLdddLLLlLLL',
  'LllLLLLLLLLLllLL',
  'lllllllllllllll.',
  '.ddddddddddddd..',
];
const SLIME_B = [
  '................',
  '....LLLLLLLL....',
  '..LLLLhLLLLLLL..',
  '.LLKKLLLLLKKLLL.',
  '.LLLLLLLLLLLLLL.',
  'LLLLLLdddLLLLLLL',
  'LLlLLLdddLLLlLLL',
  'LllLLLLLLLLLllLl',
  'lllllllllllllll.',
  '.ddddddddddddd..',
];

const RACCOON = [
  '...gg................gg...',
  '..gGGg..............gGGg..',
  '..gGGGg............gGGGg..',
  '...gGGGGGGGGGGGGGGGGGGg...',
  '....GGGGGGGGGGGGGGGGGG....',
  '...GGKKKKGGGGGGGKKKKGG....',
  '...GKKKKKKGGGGGKKKKKKG....',
  '...GKKXKKKGGGGGKKKXKKG....',
  '...GGKKKKGGGGGGGKKKKGG....',
  '...GGGGGGGsssGGGGGGGGG....',
  '....GGGGGGsKsGGGGGGGG.....',
  '....GGGGGGGsGGGGGGGGG.....',
  '...GGGGGKKKKKKKGGGGGG.....',
  '..GGGGGGGGGGGGGGGGGGGG....',
  '.GGGGGGGGGGGGGGGGGGGGGG...',
  '.GGGgGGGGGGGGGGGGGgGGGG...',
  '.GGGGGGGGGGGGGGGGGGGGGGss.',
  '.GGGGGGGGGGGGGGGGGGGGGsKKs',
  '.GGGGGGGGGGGGGGGGGGGGGsKs.',
  '..GGGGGGGGGGGGGGGGGGGGss..',
  '..gGGGGGGGGGGGGGGGGGGg....',
  '...GGGG..GGGGGG..GGGG.....',
  '...gggg..gggggg..gggg.....',
  '..........................',
];

const LID = [
  '...vvvvvv...',
  '..vWWWWWWv..',
  '.vWEWWWWWWv.',
  'vWEWvvvvWWWv',
  'vWWvGGGGvWWv',
  'vWWvGGGGvWWv',
  'vWWWvvvvWWWv',
  '.vWWWWWWWWv.',
  '..vWWWWWWv..',
  '...vvvvvv...',
];

const PIGEON_A = [
  '.....gGGG.....',
  '....GGGGGO....',
  '....KGGGG.....',
  '....GGGGG.....',
  '...GGGGGGGGG..',
  '..GGvGGGGGGGG.',
  '.GGGGGGGGGGGg.',
  '.GGgggGGGGGg..',
  '.GGGGGGGGGg...',
  '..GGGGGGGg....',
  '....GGGG......',
  '....O..O......',
  '...OO..OO.....',
];
const PIGEON_B = [
  '..............',
  '.....gGGG.....',
  '....GGGGGO....',
  '....KGGGG.....',
  '...GGGGGGGGG..',
  '..GGvGGGGGGGG.',
  '.GGGGGGGGGGGg.',
  '.GGgggGGGGGg..',
  '.GGGGGGGGGg...',
  '..GGGGGGGg....',
  '....GGGG......',
  '....O..O......',
  '...OO..OO.....',
];

const PLUNGER = [
  '......NN......',
  '......NN......',
  '......NN......',
  '......NN......',
  '......NN......',
  '......nn......',
  '....RRRRRR....',
  '..RRRRRRRRRR..',
  '.RRRRRRRRRRRR.',
  '.RRrRRRRRRrRR.',
  '.rrr......rrr.',
];

const SCRAP = [
  '...GG...',
  '.GGggGG.',
  '.GgEEgG.',
  'GGEssEGG',
  '.GgEEgG.',
  '.GGggGG.',
  '...GG...',
];

const CRUMB = [
  '.TTT..',
  'TTTTT.',
  'TThTT.',
  '.TTT..',
];

const SANDWICH = [
  '...AAAAAAA....',
  '..AhhhhhhhA...',
  '.LLLLLLLLLLL..',
  '.RRRRRRRRRR...',
  '.TTTTTTTTTTT..',
  '..AaaaaaaaA...',
  '...AAAAAAA....',
];

const NOTE = [
  '.AAAAAAA.',
  '.AaAAAAA.',
  '.AAsssAA.',
  '.AAAAAAA.',
  '.AssssAA.',
  '.AAAAAAA.',
  '.AssssAA.',
  '.AAAAAAa.',
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
  '.Yh..hY.',
  'Y..YY..Y',
  'Y..YY..Y',
  '.Yh..hY.',
  '..YYYY..',
];

const HEART = [
  '.RR.RR.',
  'RRhRRRR',
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
  '.....sSs......',
  '....sSSSss....',
  '...SSSsSSSs...',
  '..SSSSSSsSSs..',
  '..SsSSSSSSSS..',
  '.SSSSSsSSSSSs.',
  '.SSsSSSSSSsSs.',
  '.SSSSSSsSSSSs.',
  '.sSSsSSSSSSss.',
  '..ssssssssss..',
  '....L.....L...',
];

const TRASHPILE = [
  '..........sss.............',
  '....sss..sSSSs......nnn...',
  '...sSSSssSSSSSs....nNNNn..',
  '..sSKKKSsSsSSSs...nNNNNNn.',
  '..sSKCKSsSSSsSs...nNnNnNn.',
  '..sSKKKSssSSSss...nNNNNNn.',
  '..ssSSSss.sss.....nNnNnNn.',
  '...sssss..........nnnnnnn.',
  '.....ssssss....GG.........',
  '....ssKKKKss..GgG..YY.....',
  '...ssKKssKKss.GgG.YyY.....',
  '...sKKs..sKKs.GG..Yy......',
  '...sKKssssKKs.....y.......',
  '....sKKKKKKs..vv..........',
  '.....ssssss..vEv..........',
  '..............vv..........',
];

const LAMPPOST = [
  '...ssssssss...',
  '...ss....ss...',
  '...ss...sOOOs.',
  '...ss...sOhOs.',
  '...ss...sOOOs.',
  '...ss....sss..',
  '...ss.........',
  '...ss.........',
  '...ss.........',
  '...ss.........',
  '...ss.........',
  '...ss.........',
  '...ss.........',
  '...ss.........',
  '...ss.........',
  '...ss.........',
  '...ss.........',
  '...ss.........',
  '...ss.........',
  '...ss.........',
  '...ss.........',
  '...ss.........',
  '...ss.........',
  '...ss.........',
  '..ssss........',
  '.ssssss.......',
];

const THRONE = [
  '....................T.T.T...............',
  '....................TTTTT...............',
  '.................RRRRRRRRRRR............',
  '................RRrRRRRRRRrRR...........',
  '................RRRRRRRRRRRRR...........',
  '................RRrRRRRRRRrRR...........',
  '................RRRRRRRRRRRRR...........',
  '................RRrRRRRRRRrRR...........',
  '...............rRRRRRRRRRRRRRr..........',
  '..............rrRRRRRRRRRRRRRrr.........',
  '..............rrRRRrrrrrrrRRRrr.........',
  '.....vvvv.....rrRRrrrrrrrrrRRrr.........',
  '....vWWWWv....rrRRrrrrrrrrrRRrr.........',
  '...vWEWWWWv...rrrrrrrrrrrrrrrrr..gg.....',
  '..vWEWvvWWWv..srrrrrrrrrrrrrrrsssGGs....',
  '..vWWvGGvWWv.ssSSSSssSSSSsSSSSssGgGs....',
  '..vWWvGGvWWvsSSSsSSSSsSSSSSsSSSssGss....',
  '..vWWWvvWWWvsSsSSSSsSSSSSsSSSSSSsss.....',
  '...vWWWWWWvsSSSSsSSSSSSSSSSsSSSSSSs.....',
  '....vvvvvvsSSsSSSSSsGGgSSSSSSsSSSSss....',
  '....sSSssSSSSSSSsSSSGgGSSsSSSSSSSSSSs...',
  '...sSSSSSSsSSSSSSSSSSGSSSSSSsSSSSSSSs...',
  '..sSSsSSSSSSSsSSSSSSSSSSSsSSSSSSsSSSSs..',
  '..sSSSSSsSSSSSSSSsSSSSSSSSSSsSSSSSSSSs..',
  '.ssssssssssssssssssssssssssssssssssssss.',
];

const GRATE = [
  '......vvvvvvvvvvvv......',
  '....vvGGGGGGGGGGGGvv....',
  '..vvGGssssssssssssGGvv..',
  '.vGGssLssLssLssLssssGv..',
  '.vGssSSLSSLSSLSSLSssGv..',
  'vGGsSSSLSSLSSLSSLSSsGGv.',
  'vGsSSSSLSSLSSLSSLSSSsGv.',
  'vGsSSSSLSSLSSLSSLSSSsGv.',
  'vGGsSSSLSSLSSLSSLSSsGGv.',
  '.vGssSSLSSLSSLSSLSssGv..',
  '.vGGssLssLssLssLssssGv..',
  '..vvGGssssssssssssGGvv..',
  '....vvGGGGGGGGGGGGvv....',
  '......vvvvvvvvvvvv......',
];

const SPRITES = {};
function buildSprites() {
  const duckFrames = (body) => ({
    a: makeSprite(body.concat(FEET_A), 3),
    b: makeSprite(body.concat(FEET_B), 3),
    idle: makeSprite(body.concat(FEET_IDLE), 3),
    blink: makeSprite(body.concat(FEET_IDLE), 3, false, { K: 'y' }),
  });
  SPRITES.duckDown = duckFrames(DUCK_DOWN_BODY);
  SPRITES.duckUp = duckFrames(DUCK_UP_BODY);
  SPRITES.duckLeft = duckFrames(DUCK_SIDE_BODY);
  SPRITES.duckRight = {
    a: makeSprite(DUCK_SIDE_BODY.concat(FEET_A), 3, true),
    b: makeSprite(DUCK_SIDE_BODY.concat(FEET_B), 3, true),
    idle: makeSprite(DUCK_SIDE_BODY.concat(FEET_IDLE), 3, true),
    blink: makeSprite(DUCK_SIDE_BODY.concat(FEET_IDLE), 3, true, { K: 'y' }),
  };

  SPRITES.ratL = [makeSprite(RAT_A, 3), makeSprite(RAT_B, 3)];
  SPRITES.ratR = [makeSprite(RAT_A, 3, true), makeSprite(RAT_B, 3, true)];
  SPRITES.ratWindL = makeSprite(RAT_WINDUP, 3);
  SPRITES.ratWindR = makeSprite(RAT_WINDUP, 3, true);
  SPRITES.fly = [makeSprite(FLY_A, 2), makeSprite(FLY_B, 2)];
  SPRITES.slime = [makeSprite(SLIME_A, 3), makeSprite(SLIME_B, 3)];
  SPRITES.raccoon = makeSprite(RACCOON, 4);
  SPRITES.raccoonFlip = makeSprite(RACCOON, 4, true);
  SPRITES.raccoonMad = makeSprite(RACCOON, 4, false, { X: 'R' });
  SPRITES.raccoonMadFlip = makeSprite(RACCOON, 4, true, { X: 'R' });
  SPRITES.lid = makeSprite(LID, 3);
  SPRITES.pigeon = [makeSprite(PIGEON_A, 3), makeSprite(PIGEON_B, 3)];
  SPRITES.plunger = makeSprite(PLUNGER, 2);
  SPRITES.scrap = makeSprite(SCRAP, 2);
  SPRITES.crumb = makeSprite(CRUMB, 2);
  SPRITES.sandwich = makeSprite(SANDWICH, 3);
  SPRITES.note = makeSprite(NOTE, 3);
  SPRITES.sludge = makeSprite(SLUDGE, 2);
  SPRITES.quack = makeSprite(QUACK, 2);
  SPRITES.heart = makeSprite(HEART, 3);
  SPRITES.heartEmpty = makeSprite(HEART_EMPTY, 3);
  SPRITES.trashbag = makeSprite(TRASHBAG, 3);
  SPRITES.trashpile = makeSprite(TRASHPILE, 3);
  SPRITES.lamppost = makeSprite(LAMPPOST, 3);
  SPRITES.throne = makeSprite(THRONE, 4);
  SPRITES.grate = makeSprite(GRATE, 4);
}
