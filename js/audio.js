'use strict';

const AudioCore = (() => {
  let ac = null;
  function ctx() {
    if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }
  return { ctx };
})();

const Sfx = (() => {
  const ctx = AudioCore.ctx;

  function tone(freq, dur, type, vol, slide, when) {
    try {
      const a = ctx();
      const t0 = when || a.currentTime;
      const o = a.createOscillator();
      const g = a.createGain();
      o.type = type || 'square';
      o.frequency.setValueAtTime(freq, t0);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
      g.gain.setValueAtTime(vol || 0.08, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      o.connect(g).connect(a.destination);
      o.start(t0);
      o.stop(t0 + dur);
    } catch (e) { /* audio unavailable */ }
  }

  function noise(dur, vol, lowpass, when) {
    try {
      const a = ctx();
      const t0 = when || a.currentTime;
      const n = Math.floor(a.sampleRate * dur);
      const buf = a.createBuffer(1, n, a.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
      const src = a.createBufferSource();
      src.buffer = buf;
      const g = a.createGain();
      g.gain.setValueAtTime(vol || 0.1, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      const f = a.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = lowpass || 1200;
      src.connect(f).connect(g).connect(a.destination);
      src.start(t0);
    } catch (e) { /* audio unavailable */ }
  }

  return {
    tone, noise,
    unlock() { try { ctx(); } catch (e) {} },
    swing() { noise(0.09, 0.06, 3500); tone(220, 0.08, 'triangle', 0.04, -120); },
    heavySwing() { noise(0.14, 0.1, 2200); tone(140, 0.16, 'triangle', 0.08, -90); },
    hit() { tone(160, 0.1, 'square', 0.09, -60); noise(0.06, 0.08, 900); },
    clank() { tone(880, 0.06, 'square', 0.07, -200); tone(1320, 0.12, 'triangle', 0.05, -600); noise(0.05, 0.06, 5000); },
    deflect() { tone(660, 0.05, 'square', 0.08); setTimeout(() => tone(1100, 0.12, 'square', 0.07, 500), 40); },
    perfect() { tone(880, 0.3, 'sine', 0.07, 300); setTimeout(() => tone(1320, 0.25, 'sine', 0.05), 120); },
    hurt() { tone(110, 0.25, 'sawtooth', 0.1, -70); },
    quack() { tone(340, 0.07, 'square', 0.1, -40); setTimeout(() => tone(260, 0.12, 'square', 0.09, -80), 70); },
    dash() { noise(0.3, 0.12, 700); tone(500, 0.3, 'sine', 0.05, -420); },
    pickup() { tone(660, 0.06, 'square', 0.05); setTimeout(() => tone(990, 0.08, 'square', 0.05), 55); },
    crumb() { tone(520, 0.08, 'triangle', 0.07, 200); },
    lore() { [523, 659, 880].forEach((f, i) => setTimeout(() => tone(f, 0.22, 'triangle', 0.05), i * 110)); },
    buy() { tone(440, 0.07, 'square', 0.06); setTimeout(() => tone(550, 0.07, 'square', 0.06), 70); setTimeout(() => tone(660, 0.12, 'square', 0.06), 140); },
    deny() { tone(150, 0.15, 'square', 0.07, -30); },
    boom() { noise(0.5, 0.18, 500); tone(70, 0.5, 'sine', 0.14, -30); },
    roar() { tone(90, 0.5, 'sawtooth', 0.12, 60); noise(0.4, 0.1, 400); },
    blip() { tone(700, 0.04, 'square', 0.04); },
    door() { tone(200, 0.3, 'square', 0.05, -120); noise(0.25, 0.08, 600); },
    win() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.18, 'square', 0.06), i * 130)); },
  };
})();

const Music = (() => {
  const ctx = AudioCore.ctx;
  const _ = 0;
  const SONGS = {
    dump: {
      bpm: 100,
      bass: [33, _, 33, _, 40, _, 33, _, 31, _, 31, _, 38, _, 36, _,
             33, _, 33, _, 40, _, 33, _, 29, _, 29, _, 31, _, 35, _],
      lead: [_, _, 69, _, _, 72, _, 71, _, 69, _, _, 64, _, _, _,
             _, _, 69, _, _, 72, _, 74, _, 76, _, 74, 72, _, 71, _,
             _, _, 69, _, _, 67, _, 64, _, 67, _, 69, _, _, _, _,
             _, _, 62, _, 64, _, 67, _, 69, _, _, _, _, _, _, _],
      hatEvery: 4,
      vol: { bass: 0.045, lead: 0.03, hat: 0.012 },
    },
    boss: {
      bpm: 148,
      bass: [33, 33, _, 33, 33, _, 36, 33, 31, 31, _, 31, 31, _, 38, 39,
             33, 33, _, 33, 33, _, 36, 33, 40, 40, _, 39, 38, _, 36, 35],
      lead: [69, _, 69, 72, _, 69, _, 68, _, _, 67, _, 64, 67, 69, _,
             69, _, 69, 72, _, 74, _, 75, _, 74, _, 72, _, 71, _, 67,
             69, _, 69, 72, _, 69, _, 68, _, _, 67, _, 64, 67, 69, 71,
             72, _, 71, _, 69, _, 68, _, 69, _, _, _, _, _, _, _],
      hatEvery: 2,
      vol: { bass: 0.055, lead: 0.035, hat: 0.018 },
    },
  };

  let cur = null, timer = null, step = 0, nextT = 0, muted = false;
  const freq = n => 440 * Math.pow(2, (n - 69) / 12);

  function scheduleStep(song, s, t) {
    const sd = 60 / song.bpm / 4;
    const b = song.bass[s % song.bass.length];
    if (b) Sfx.tone(freq(b), sd * 1.8, 'square', song.vol.bass, 0, t);
    const l = song.lead[s % song.lead.length];
    if (l) Sfx.tone(freq(l), sd * 1.6, 'triangle', song.vol.lead, 0, t);
    if (s % song.hatEvery === 0) Sfx.noise(0.03, song.vol.hat, 8000, t);
    if (s % 16 === 8) Sfx.noise(0.08, song.vol.hat * 2.2, 1800, t);
  }

  function tick() {
    if (!cur || muted) return;
    try {
      const a = ctx();
      const song = SONGS[cur];
      const sd = 60 / song.bpm / 4;
      if (nextT < a.currentTime) nextT = a.currentTime + 0.05;
      while (nextT < a.currentTime + 0.3) {
        scheduleStep(song, step, nextT);
        nextT += sd;
        step++;
      }
    } catch (e) { /* audio unavailable */ }
  }

  return {
    play(name) {
      if (cur === name) return;
      cur = name; step = 0; nextT = 0;
      if (!timer) timer = setInterval(tick, 120);
    },
    stop() { cur = null; },
    get muted() { return muted; },
    toggleMute() { muted = !muted; return muted; },
    current() { return cur; },
  };
})();
