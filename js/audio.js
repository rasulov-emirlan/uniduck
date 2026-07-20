'use strict';

const Sfx = (() => {
  let ac = null;
  function ctx() {
    if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }

  function tone(freq, dur, type, vol, slide) {
    try {
      const a = ctx();
      const o = a.createOscillator();
      const g = a.createGain();
      o.type = type || 'square';
      o.frequency.setValueAtTime(freq, a.currentTime);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), a.currentTime + dur);
      g.gain.setValueAtTime(vol || 0.08, a.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + dur);
      o.connect(g).connect(a.destination);
      o.start();
      o.stop(a.currentTime + dur);
    } catch (e) { /* audio unavailable */ }
  }

  function noise(dur, vol, lowpass) {
    try {
      const a = ctx();
      const n = Math.floor(a.sampleRate * dur);
      const buf = a.createBuffer(1, n, a.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
      const src = a.createBufferSource();
      src.buffer = buf;
      const g = a.createGain();
      g.gain.setValueAtTime(vol || 0.1, a.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + dur);
      const f = a.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = lowpass || 1200;
      src.connect(f).connect(g).connect(a.destination);
      src.start();
    } catch (e) { /* audio unavailable */ }
  }

  return {
    unlock() { try { ctx(); } catch (e) {} },
    swing() { noise(0.09, 0.06, 3500); tone(220, 0.08, 'triangle', 0.04, -120); },
    hit() { tone(160, 0.1, 'square', 0.09, -60); noise(0.06, 0.08, 900); },
    hurt() { tone(110, 0.25, 'sawtooth', 0.1, -70); },
    quack() { tone(340, 0.07, 'square', 0.1, -40); setTimeout(() => tone(260, 0.12, 'square', 0.09, -80), 70); },
    dash() { noise(0.3, 0.12, 700); tone(500, 0.3, 'sine', 0.05, -420); },
    pickup() { tone(660, 0.06, 'square', 0.05); setTimeout(() => tone(990, 0.08, 'square', 0.05), 55); },
    crumb() { tone(520, 0.08, 'triangle', 0.07, 200); },
    buy() { tone(440, 0.07, 'square', 0.06); setTimeout(() => tone(550, 0.07, 'square', 0.06), 70); setTimeout(() => tone(660, 0.12, 'square', 0.06), 140); },
    deny() { tone(150, 0.15, 'square', 0.07, -30); },
    boom() { noise(0.5, 0.18, 500); tone(70, 0.5, 'sine', 0.14, -30); },
    roar() { tone(90, 0.5, 'sawtooth', 0.12, 60); noise(0.4, 0.1, 400); },
    blip() { tone(700, 0.04, 'square', 0.04); },
    door() { tone(200, 0.3, 'square', 0.05, -120); noise(0.25, 0.08, 600); },
    win() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.18, 'square', 0.06), i * 130)); },
  };
})();
