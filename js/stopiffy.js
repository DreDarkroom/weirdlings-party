/*!
 * Stopiffy SDK v0.1.0 — CC0-1.0 (public domain)
 * A parody-free-music service: every track is generated from a seed, so the
 * whole catalogue is CC0 and weighs a few kilobytes.
 *
 *   const sp = new Stopiffy.Client({ base: 'https://example.com' });
 *   const tracks = await sp.tracks();
 *   const buffer = await sp.load(tracks[0]);      // AudioBuffer (loopable)
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Stopiffy = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var VERSION = '0.1.0';

  function mulberry(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  var mtof = function (m) { return 440 * Math.pow(2, (m - 69) / 12); };

  var SCALES = {
    minor: [0, 2, 3, 5, 7, 8, 10], major: [0, 2, 4, 5, 7, 9, 11],
    dorian: [0, 2, 3, 5, 7, 9, 10], phrygian: [0, 1, 3, 5, 7, 8, 10]
  };
  var PROGS = [[0, 5, 3, 4], [0, 3, 4, 3], [0, 4, 5, 3], [0, 2, 5, 4]];

  // 16-step patterns, 'x' = hit
  var STYLES = {
    house:     { kick: 'x...x...x...x...', clap: '....x.......x...', chat: 'x.x.x.x.x.x.x.x.', ohat: '..x...x...x...x.', bass: '.x.xx.x..x.xx.x.', wave: 'sawtooth', lead: 0.35 },
    techno:    { kick: 'x...x...x...x...', clap: '....x.......x...', chat: 'xxxxxxxxxxxxxxxx', ohat: '..x...x...x...x.', bass: 'x.xxx.xxx.xxx.xx', wave: 'sawtooth', lead: 0.25 },
    breaks:    { kick: 'x.....x...x.....', clap: '....x..x.x..x...', chat: 'x.x.x.x.x.x.x.xx', ohat: '......x.......x.', bass: 'x..x..x.x..x..x.', wave: 'square',   lead: 0.4 },
    chill:     { kick: 'x.......x.x.....', clap: '........x.......', chat: 'x.x.x.x.x.x.x.x.', ohat: '.......x.......x', bass: 'x.....x.....x...', wave: 'triangle', lead: 0.3 },
    synthwave: { kick: 'x...x...x...x...', clap: '....x.......x...', chat: 'x.x.x.x.x.x.x.x.', ohat: '..x...x...x...x.', bass: 'xxxxxxxxxxxxxxxx', wave: 'sawtooth', lead: 0.5 },
    dnb:       { kick: 'x.......x.......', clap: '....x.......x...', chat: 'x.x.x.x.x.x.x.x.', ohat: '..x...x...x...x.', bass: 'x..x..x..x..x..x', wave: 'square',   lead: 0.4 },
    trance:    { kick: 'x...x...x...x...', clap: '....x.......x...', chat: 'x.x.x.x.x.x.x.x.', ohat: '..x...x...x...x.', bass: 'x.x.x.x.x.x.x.x.', wave: 'sawtooth', lead: 0.6 },
    lofi:      { kick: 'x.......x.......', clap: '....x.......x...', chat: 'x...x...x...x...', ohat: '........x.......', bass: 'x.......x.......', wave: 'triangle', lead: 0.2 },
    electro:   { kick: 'x...x...x...x...', clap: '....x.......x...', chat: 'x.x.x.x.x.x.x.x.', ohat: '..x...x...x...x.', bass: 'x.xx.x.xx.xx.x.x', wave: 'square',   lead: 0.5 }
  };

  var BUILTIN = [
    { id: 'weirdling-walk',       title: 'Weirdling Walk',                 artist: 'The Tribe Orchestra', style: 'synthwave', bpm: 112, root: 45, scale: 'minor',    seed: 8008, bars: 16, tags: ['game', 'level1'] },
    { id: 'glitch-highway',       title: 'Glitch Highway',                 artist: 'The Simulation',      style: 'breaks',    bpm: 140, root: 40, scale: 'phrygian', seed: 9009, bars: 16, tags: ['game', 'level2'] },
    { id: 'overfit-boss',         title: 'Overfit (Boss Theme)',           artist: 'Clanker Choir',       style: 'techno',    bpm: 146, root: 38, scale: 'phrygian', seed: 1010, bars: 16, tags: ['game', 'boss'] },
    { id: 'simulation-lullaby',   title: 'Simulation Lullaby',             artist: 'The Tribe Orchestra', style: 'chill',     bpm: 84,  root: 41, scale: 'major',    seed: 1111, bars: 16, tags: ['game', 'menu'] },
    { id: 'dee-forgot-the-date',  title: 'Wait, Is It Friday?',            artist: 'DeeDarkgloom',        style: 'techno',    bpm: 130, root: 38, scale: 'phrygian', seed: 1101, bars: 16, tags: ['dj'] },
    { id: 'candle-countdown',     title: 'Ten Seconds To Candles',         artist: 'DeeDarkgloom',        style: 'house',     bpm: 128, root: 43, scale: 'minor',    seed: 1212, bars: 16, tags: ['dj'] },
    { id: 'dizzle-cake-walk',     title: 'Cake Walk (Frosting Mix)',       artist: 'Dizzle',              style: 'house',     bpm: 124, root: 41, scale: 'major',    seed: 2202, bars: 16, tags: ['dj', 'cake'] },
    { id: 'boom-lucky-salvage',   title: 'Lucky Salvage',                  artist: 'Bo0m',                style: 'breaks',    bpm: 134, root: 40, scale: 'minor',    seed: 3303, bars: 16, tags: ['dj'] },
    { id: 'hypnotized-spiral',    title: 'Spiral Down',                    artist: 'Hypnotized',          style: 'techno',    bpm: 126, root: 36, scale: 'dorian',   seed: 4404, bars: 16, tags: ['dj'] },
    { id: 'myster-deep-end',      title: 'The Deep End',                   artist: 'Myster Y. Deep',      style: 'chill',     bpm: 118, root: 38, scale: 'minor',    seed: 5505, bars: 16, tags: ['dj'] },
    { id: 'helix-double-strand',  title: 'Double Strand',                  artist: 'Helix',               style: 'synthwave', bpm: 122, root: 45, scale: 'dorian',   seed: 6606, bars: 16, tags: ['dj'] },
    { id: 'shoreline-shuffle',     title: 'Shoreline Shuffle',              artist: 'The Tribe Orchestra', style: 'synthwave', bpm: 108, root: 43, scale: 'major',    seed: 1313, bars: 16, tags: ['game', 'part2'] },
    { id: 'pier-pressure',         title: 'Pier Pressure',                  artist: 'The Simulation',      style: 'breaks',    bpm: 136, root: 41, scale: 'minor',    seed: 1414, bars: 16, tags: ['game', 'part2'] },
    { id: 'mick-birthday-anthem',  title: 'Beach Birthday Anthem',          artist: 'The Tribe Orchestra', style: 'house',     bpm: 124, root: 40, scale: 'major',    seed: 1515, bars: 16, tags: ['dj', 'birthday', 'part2'] },
    { id: 'kerry-birthday-anthem',title: 'Queenslayer Birthday Anthem',    artist: 'Kerry Queenslayer',   style: 'house',     bpm: 126, root: 43, scale: 'major',    seed: 7707, bars: 16, tags: ['dj', 'birthday'] },
    { id: 'jungle-rumble',        title: 'Jungle Rumble',                  artist: 'Subsonic',            style: 'dnb',       bpm: 174, root: 38, scale: 'phrygian', seed: 8808, bars: 16, tags: ['mood', 'energetic'] },
    { id: 'neon-drifter',         title: 'Neon Drifter',                   artist: 'The Simulation',      style: 'dnb',       bpm: 170, root: 40, scale: 'minor',    seed: 8809, bars: 16, tags: ['mood', 'dark'] },
    { id: 'aurora-breeze',        title: 'Aurora Breeze',                  artist: 'Tranceiver',          style: 'trance',    bpm: 138, root: 45, scale: 'minor',    seed: 9901, bars: 16, tags: ['mood', 'euphoric'] },
    { id: 'starlight-pulse',      title: 'Starlight Pulse',                artist: 'Tranceiver',          style: 'trance',    bpm: 140, root: 41, scale: 'dorian',   seed: 9902, bars: 16, tags: ['mood', 'uplifting'] },
    { id: 'rainy-cafe',           title: 'Rainy Cafe',                     artist: 'Coffee Beans',        style: 'lofi',      bpm: 80,  root: 43, scale: 'major',    seed: 1121, bars: 16, tags: ['mood', 'chill'] },
    { id: 'midnight-study',       title: 'Midnight Study',                 artist: 'Coffee Beans',        style: 'lofi',      bpm: 78,  root: 36, scale: 'minor',    seed: 1122, bars: 16, tags: ['mood', 'focus'] },
    { id: 'voltage-spike',        title: 'Voltage Spike',                  artist: 'Circuit Breaker',     style: 'electro',   bpm: 128, root: 40, scale: 'phrygian', seed: 3341, bars: 16, tags: ['mood', 'energetic'] },
    { id: 'robotic-groove',       title: 'Robotic Groove',                 artist: 'Circuit Breaker',     style: 'electro',   bpm: 130, root: 38, scale: 'dorian',   seed: 3342, bars: 16, tags: ['mood', 'funky'] },
    { id: 'deep-space-echo',      title: 'Deep Space Echo',                artist: 'Hypnotized',          style: 'techno',    bpm: 125, root: 38, scale: 'minor',    seed: 5561, bars: 16, tags: ['mood', 'dark'] },
    { id: 'sunset-drive',         title: 'Sunset Drive',                   artist: 'Helix',               style: 'synthwave', bpm: 115, root: 41, scale: 'major',    seed: 6671, bars: 16, tags: ['mood', 'chill'] },
    { id: 'broken-glass',         title: 'Broken Glass',                   artist: 'Bo0m',                style: 'breaks',    bpm: 135, root: 45, scale: 'phrygian', seed: 7781, bars: 16, tags: ['mood', 'aggressive'] },
    { id: 'summer-vibes',         title: 'Summer Vibes',                   artist: 'Dizzle',              style: 'house',     bpm: 122, root: 43, scale: 'major',    seed: 8891, bars: 16, tags: ['mood', 'happy'] }
  ].map(function (t) { t.license = 'CC0-1.0'; t.duration = Math.round(t.bars * 4 * 60 / t.bpm * 10) / 10; t.beatOffset = 0; return t; });

  // ---- Synthesis: direct sample-level DSP (no audio graph => fast on phones) ----
  function renderTrack(track, opts) {
    opts = opts || {};
    var sr = opts.sampleRate || 22050;   // mono, 22kHz: plenty for chip-style tracks
    var st = STYLES[track.style] || STYLES.house;
    var scale = SCALES[track.scale] || SCALES.minor;
    var r = mulberry(track.seed);
    var spb = 60 / track.bpm, step = spb / 4, bars = track.bars || 16;
    var N = Math.ceil(bars * 16 * step * sr);
    var N_full = Math.ceil((bars + 1) * 16 * step * sr);
    var buf = new Float32Array(N_full);
    var TAU = 6.283185307179586;

    function wave(type, ph) {
      if (type === 'sawtooth') return 2 * ph - 1;
      if (type === 'square') return ph < 0.5 ? 1 : -1;
      if (type === 'triangle') return ph < 0.5 ? 4 * ph - 1 : 3 - 4 * ph;
      return Math.sin(TAU * ph);
    }
    function add(i, v) { if (i >= 0 && i < N_full) buf[i] += v; }
    function noiseHit(t, len, peak, hp, lpCut) {
      var i0 = Math.floor(t * sr), n = Math.floor(len * sr), prev = 0, lp = 0, a = 1 - Math.exp(-TAU * lpCut / sr);
      for (var i = 0; i < n; i++) {
        var x = r() * 2 - 1; lp += a * (x - lp);
        var y = hp ? (x - prev) * 0.5 : lp; prev = x;
        add(i0 + i, y * peak * Math.exp(-i / sr * 9.2 / len));
      }
    }
    function kick(t, v) {
      var i0 = Math.floor(t * sr), n = Math.floor(0.35 * sr), ph = 0;
      for (var i = 0; i < n; i++) {
        var tt = i / sr; ph += (42 + 118 * Math.exp(-tt * 28)) / sr;
        add(i0 + i, Math.sin(TAU * ph) * v * Math.exp(-tt * 14) * Math.min(1, tt * 800));
      }
    }
    function clap(t, v) { for (var k = 0; k < 3; k++) noiseHit(t + k * 0.012, 0.09, v * 0.6, false, 3500); noiseHit(t + 0.036, 0.16, v * 0.5, false, 3000); }
    function hat(t, v, open) { noiseHit(t, open ? 0.2 : 0.04, v * 1.6, true, 9000); }
    function tone(t, midi, len, type, peak, cutoff, detune) {
      var f = mtof(midi) * Math.pow(2, (detune || 0) / 1200), i0 = Math.floor(t * sr), n = Math.floor((len + 0.08) * sr);
      var ph = 0, dph = f / sr, lp = 0, d = Math.max(0.05, len), atk = 0.01;
      for (var i = 0; i < n; i++) {
        var tt = i / sr, e = tt < atk ? tt / atk : Math.exp(-(tt - atk) * 5 / d);
        var fc = cutoff * (1 + Math.exp(-tt * 10)), a = 1 - Math.exp(-TAU * Math.min(fc, sr / 2.5) / sr);
        lp += a * (wave(type, ph) - lp); ph += dph; if (ph >= 1) ph -= 1;
        add(i0 + i, lp * e * peak);
      }
    }
    var prog = PROGS[Math.floor(r() * PROGS.length)];
    var deg = function (d) { return scale[((d % 7) + 7) % 7] + 12 * Math.floor(d / 7); };
    var leadPos = 2 + Math.floor(r() * 3);

    for (var bar = 0; bar < bars; bar++) {
      var b16 = bar % 16;
      var sec = b16 < 2 ? 'intro' : b16 < 8 ? 'main' : b16 < 10 ? 'break' : 'main2';
      var d0 = prog[bar % 4], t0 = bar * 16 * step;
      // pad
      if (sec !== 'intro' || bar === 1) {
        [0, 2, 4].forEach(function (o) {
          tone(t0, track.root + 24 + deg(d0 + o), step * 15, 'triangle', 0.045, 1800, (o - 2) * 6);
        });
      }
      for (var s = 0; s < 16; s++) {
        var t = t0 + s * step, sw = (s % 2 ? step * 0.12 : 0);
        t += sw;
        if (sec !== 'break' && st.kick[s] === 'x') kick(t, 0.9);
        if (sec !== 'intro' && sec !== 'break' && st.clap[s] === 'x') clap(t, 0.5);
        if (st.chat[s] === 'x') hat(t, sec === 'intro' ? 0.05 : 0.09 + (s % 4 === 2 ? 0.04 : 0), false);
        if (sec !== 'intro' && st.ohat[s] === 'x') hat(t, 0.08, true);
        if (sec !== 'intro' && st.bass[s] === 'x') tone(t, track.root + deg(d0) - (sec === 'break' ? 0 : 0), step * 0.9, st.wave, 0.2, 500, 0);
        if ((sec === 'main2' || (sec === 'main' && bar % 16 >= 4)) && r() < st.lead * (s % 2 ? 0.5 : 1) * (s % 4 === 0 ? 1.4 : 0.7)) {
          leadPos = Math.max(0, Math.min(11, leadPos + Math.floor(r() * 5) - 2));
          tone(t, track.root + 36 + deg(leadPos), step * (1 + Math.floor(r() * 2)), 'square', 0.055, 2600, 4);
          tone(t, track.root + 36 + deg(leadPos), step * 1.5, 'sawtooth', 0.03, 2000, -7);
        }
      }
    }
    for (var j = 0; j < N_full - N; j++) {
      buf[j] += buf[N + j];
    }
    var peak = 0, i;
    for (i = 0; i < N; i++) { var a = Math.abs(buf[i]); if (a > peak) peak = a; }
    var gain = peak > 0 ? 0.85 / peak : 1;
    for (i = 0; i < N; i++) buf[i] = Math.tanh(buf[i] * gain * 1.1);
    var outBuf = buf.subarray(0, N);
    var AB = opts.AudioBuffer || (typeof AudioBuffer !== 'undefined' ? AudioBuffer : null);
    if (!AB) return Promise.resolve({ sampleRate: sr, length: N, duration: N / sr, data: outBuf });
    var ab = new AB({ length: N, sampleRate: sr, numberOfChannels: 1 });
    ab.copyToChannel(outBuf, 0);
    return Promise.resolve(ab);
  }

  // ---- Deluxe mix: stereo, sidechain pump, supersaw lead/pad, sub bass, echo, room reverb, fills + risers ----
  // Same key / BPM / chords / drum pattern as the standard mix (so DJ decks still sync), richer sound.
  function renderDeluxe(track, opts) {
    opts = opts || {};
    var sr = opts.sampleRate || 32000;
    var st = STYLES[track.style] || STYLES.house, scale = SCALES[track.scale] || SCALES.minor;
    var rm = mulberry(track.seed);                      // musical stream: first draw = chord progression, as in the standard mix
    var rn = mulberry((track.seed ^ 0x51ed27) >>> 0);   // texture noise
    var rl = mulberry((track.seed ^ 0x9e3779) >>> 0);   // lead melody + humanising
    var spb = 60 / track.bpm, step = spb / 4, bars = track.bars || 16, TAU = 6.283185307179586;
    var N = Math.ceil(bars * 16 * step * sr), NF = Math.ceil((bars + 1) * 16 * step * sr);
    function Z() { return new Float32Array(NF); }
    var dL = Z(), dR = Z(), sL = Z(), sR = Z(), bs = Z(), pL = Z(), pR = Z(), lL = Z(), lR = Z(), fL = Z(), fR = Z(), kicks = [];
    function put(L, R, i, v, pan) { if (i < 0 || i >= NF) return; var a = (pan + 1) * 0.7853981634; L[i] += v * Math.cos(a); R[i] += v * Math.sin(a); }
    function wave(type, ph) { if (type === 'sawtooth') return 2 * ph - 1; if (type === 'square') return ph < 0.5 ? 1 : -1; if (type === 'triangle') return ph < 0.5 ? 4 * ph - 1 : 3 - 4 * ph; return Math.sin(TAU * ph); }

    // filtered-noise hit into a stereo pair
    function noiseS(t, len, peak, hp, cut, pan, L, R, L2, R2) {
      var i0 = Math.floor(t * sr), n = Math.floor(len * sr), prev = 0, lp = 0, a = 1 - Math.exp(-TAU * cut / sr);
      for (var i = 0; i < n; i++) {
        var x = rn() * 2 - 1; lp += a * (x - lp); var y = hp ? (x - prev) * 0.5 : lp; prev = x;
        var v = y * peak * Math.exp(-i / sr * 9.2 / len);
        put(L, R, i0 + i, v, pan); if (L2) put(L2, R2, i0 + i, v, pan);
      }
    }
    function kick(t, v) {
      var i0 = Math.floor(t * sr), n = Math.floor(0.44 * sr), ph = 0; kicks.push(i0);
      for (var i = 0; i < n; i++) {
        var tt = i / sr; ph += (46 + 130 * Math.exp(-tt * 34)) / sr;
        var body = Math.sin(TAU * ph) * Math.exp(-tt * 9), click = tt < 0.004 ? (rn() * 2 - 1) * (1 - tt / 0.004) * 0.45 : 0;
        put(dL, dR, i0 + i, (body + click) * v, 0);
      }
    }
    function snare(t, v, pan) {
      var i0 = Math.floor(t * sr), n = Math.floor(0.26 * sr), prev = 0;
      for (var i = 0; i < n; i++) {
        var tt = i / sr, x = rn() * 2 - 1, noise = (x - prev) * 0.5 * Math.exp(-tt * 15); prev = x;
        var s = (noise + Math.sin(TAU * 190 * tt) * 0.55 * Math.exp(-tt * 26)) * v;
        put(dL, dR, i0 + i, s, pan); put(sL, sR, i0 + i, s * 0.7, pan);
      }
    }
    function clap(t, v, pan) { for (var k = 0; k < 3; k++) noiseS(t + k * 0.011, 0.09, v * 0.55, false, 3600, pan, dL, dR, sL, sR); noiseS(t + 0.034, 0.2, v * 0.5, false, 3000, pan, dL, dR, sL, sR); }
    function hat(t, v, open, pan) { noiseS(t, open ? 0.24 : 0.045, v * 1.5, true, 9500, pan, dL, dR, null, null); }
    // generic oscillator voice with lowpass + envelope (atk, dec: exp decay rate, 0 = sustain; gate len, release)
    function voice(t, midi, len, type, peak, cut, cents, pan, L, R, atk, dec, rel) {
      var f = mtof(midi) * Math.pow(2, (cents || 0) / 1200), i0 = Math.floor(t * sr), n = Math.floor((len + (rel || 0.12)) * sr), ph = 0, dph = f / sr, lp = 0;
      ph = (cents ? ((cents * 0.37) % 1 + 1) % 1 : 0);
      for (var i = 0; i < n; i++) {
        var tt = i / sr, e = (tt < atk ? tt / atk : 1) * (dec ? Math.exp(-(tt - atk) * dec) : 1) * (tt > len ? Math.exp(-(tt - len) * 14) : 1);
        var fc = cut * (1 + 1.4 * Math.exp(-tt * 9)), a = 1 - Math.exp(-TAU * Math.min(fc, sr / 2.6) / sr);
        lp += a * (wave(type, ph) - lp); ph += dph; if (ph >= 1) ph -= 1;
        put(L, R, i0 + i, lp * e * peak, pan);
      }
    }
    function riser(t, len, peak) {
      var i0 = Math.floor(t * sr), n = Math.floor(len * sr), lpA = 0, lpB = 0;
      for (var i = 0; i < n; i++) {
        var u = i / n, a = 1 - Math.exp(-TAU * (400 + 7000 * u * u) / sr), x = rn() * 2 - 1, y = rn() * 2 - 1;
        lpA += a * (x - lpA); lpB += a * (y - lpB);
        var v = (x - lpA) * peak * u * u; var w = (y - lpB) * peak * u * u;
        if (i0 + i < NF) { fL[i0 + i] += v; fR[i0 + i] += w; }
      }
    }
    function impact(t) {
      var i0 = Math.floor(t * sr), n = Math.floor(1.6 * sr), ph = 0;
      for (var i = 0; i < n; i++) { var tt = i / sr; ph += (58 - 18 * Math.min(1, tt)) / sr; var s = Math.sin(TAU * ph) * Math.exp(-tt * 2.6) * 0.5 + (rn() * 2 - 1) * Math.exp(-tt * 7) * 0.12; if (i0 + i < NF) { fL[i0 + i] += s; fR[i0 + i] += s; } }
    }

    var prog = PROGS[Math.floor(rm() * PROGS.length)];
    var deg = function (d) { return scale[((d % 7) + 7) % 7] + 12 * Math.floor(d / 7); };
    var leadPos = 2 + Math.floor(rl() * 3), arpStyle = (track.style === 'trance' || track.style === 'synthwave' || track.style === 'electro');
    var cents5 = [-12, -6, 0, 6, 12], pan5 = [-0.7, -0.35, 0, 0.35, 0.7];

    for (var bar = 0; bar < bars; bar++) {
      var b16 = bar % 16, sec = b16 < 2 ? 'intro' : b16 < 8 ? 'main' : b16 < 10 ? 'break' : 'main2';
      var d0 = prog[bar % 4], t0 = bar * 16 * step, chordNotes = [0, 2, 4].map(function (o) { return track.root + 24 + deg(d0 + o); });
      if (sec !== 'intro' || bar === 1) {
        chordNotes.forEach(function (m, ci) { [-8, 0, 8].forEach(function (c, vi) { voice(t0, m, step * 15, 'sawtooth', 0.012, 1250, c, [-0.6, 0, 0.6][vi] * (ci % 2 ? -1 : 1), pL, pR, 0.28, 0, 0.5); }); });
        voice(t0, chordNotes[0] + 12, step * 15, 'triangle', 0.03, 1800, 0, 0, pL, pR, 0.3, 0, 0.5);
      }
      if (b16 === 8 || b16 === 10 || b16 === 0 && bar > 0) impact(t0);
      if (b16 === 6 || b16 === 14) riser(t0, step * 32 / 1, 0.10);        // two-bar riser into the break / the drop
      for (var s = 0; s < 16; s++) {
        var t = t0 + s * step + (s % 2 ? step * 0.1 : 0), hv = 0.9 + rn() * 0.2;
        if (sec !== 'break' && st.kick[s] === 'x') kick(t, 0.92);
        if (sec !== 'intro' && sec !== 'break' && st.clap[s] === 'x') { clap(t, 0.55 * hv, 0.1); snare(t, 0.32 * hv, -0.1); }
        if (st.chat[s] === 'x') hat(t, (sec === 'intro' ? 0.05 : 0.085 + (s % 4 === 2 ? 0.04 : 0)) * hv, false, s % 2 ? 0.3 : -0.3);
        if (sec !== 'intro' && st.ohat[s] === 'x') hat(t, 0.075 * hv, true, s % 4 ? 0.35 : -0.35);
        if ((b16 === 7 || b16 === 15) && s >= 8) snare(t, 0.12 + (s - 8) * 0.07, 0);                    // snare-roll fill
        if (sec !== 'intro' && st.bass[s] === 'x') {
          var bm = track.root + deg(d0);
          voice(t, bm, step * 0.9, 'sine', 0.3, 900, 0, 0, bs, bs, 0.004, 3, 0.06);                      // sub
          voice(t, bm, step * 0.9, st.wave === 'triangle' ? 'sawtooth' : st.wave, 0.1, 520, 0, 0, bs, bs, 0.004, 4, 0.06);   // body
        }
        if (arpStyle && s % 2 === 0 && (sec === 'main2' || (sec === 'main' && b16 >= 4)))
          voice(t, chordNotes[(s / 2) % 3] + 12, step * 1.4, 'triangle', 0.02, 4200, 0, (s % 4 ? 0.5 : -0.5), lL, lR, 0.003, 12, 0.05);
        if ((sec === 'main2' || (sec === 'main' && b16 >= 4)) && rl() < st.lead * (s % 2 ? 0.5 : 1) * (s % 4 === 0 ? 1.4 : 0.7)) {
          leadPos = Math.max(0, Math.min(11, leadPos + Math.floor(rl() * 5) - 2));
          var lm = track.root + 36 + deg(leadPos), ln = step * (1 + Math.floor(rl() * 2));
          for (var v5 = 0; v5 < 5; v5++) voice(t, lm, ln, 'sawtooth', 0.011, 3200, cents5[v5], pan5[v5], lL, lR, 0.006, 5, 0.12);
          voice(t, lm + 12, ln, 'sine', 0.012, 6000, 0, 0, lL, lR, 0.004, 9, 0.08);
        }
      }
    }
    // fold the tail bar back onto the head so the loop is seamless
    [dL, dR, sL, sR, bs, pL, pR, lL, lR, fL, fR].forEach(function (a) { for (var j = 0; j < NF - N; j++) a[j] += a[N + j]; });

    // sidechain pump from the kicks (wraps around the loop)
    var duck = new Float32Array(N).fill(1), dn = Math.floor(0.24 * sr);
    kicks.forEach(function (k0) { var k = k0 % N; for (var j = 0; j < dn; j++) { var v = 1 - 0.72 * Math.exp(-j / (0.085 * sr)), q = (k + j) % N; if (v < duck[q]) duck[q] = v; } });

    // ping-pong echo on the lead (dotted 8th), run twice around the loop so it wraps cleanly
    var ed = Math.round(step * 3 * sr), tapL = new Float32Array(N), tapR = new Float32Array(N);
    for (var pass = 0; pass < 2; pass++) for (var ei = 0; ei < N; ei++) { var ej = (ei - ed + N) % N; tapL[ei] = 0.42 * (lR[ej] + tapR[ej]); tapR[ei] = 0.42 * (lL[ej] + tapL[ej]); }

    // mix dry + reverb send
    var mL = new Float32Array(N), mR = new Float32Array(N), xL = new Float32Array(N), xR = new Float32Array(N), i;
    for (i = 0; i < N; i++) {
      var d = duck[i], dd = 0.4 + 0.6 * d;
      var leadL = lL[i] + 0.6 * tapL[i], leadR = lR[i] + 0.6 * tapR[i];
      mL[i] = dL[i] + 0.9 * bs[i] * d + pL[i] * dd + leadL * (0.55 + 0.45 * d) + fL[i];
      mR[i] = dR[i] + 0.9 * bs[i] * d + pR[i] * dd + leadR * (0.55 + 0.45 * d) + fR[i];
      xL[i] = sL[i] * 0.8 + pL[i] * 0.5 * dd + leadL * 0.5 + fL[i] * 0.5; xR[i] = sR[i] * 0.8 + pR[i] * 0.5 * dd + leadR * 0.5 + fR[i] * 0.5;
    }
    var wet = [reverbChan(xL, N, sr, [0.0297, 0.0371, 0.0411, 0.0437]), reverbChan(xR, N, sr, [0.0309, 0.0383, 0.0421, 0.0453])];
    var px = 0, py = 0, qx = 0, qy = 0, peak = 0, ss = 0;
    for (i = 0; i < N; i++) {   // add reverb, gentle 30Hz DC/rumble high-pass, track peak
      var a1 = mL[i] + wet[0][i] * 0.34, a2 = mR[i] + wet[1][i] * 0.34;
      var y1 = a1 - px + 0.996 * py; px = a1; py = y1; var y2 = a2 - qx + 0.996 * qy; qx = a2; qy = y2;
      mL[i] = y1; mR[i] = y2; peak = Math.max(peak, Math.abs(y1), Math.abs(y2)); ss += y1 * y1 + y2 * y2;
    }
    // level-match to the standard mix (RMS ~0.11) so switching quality changes the sound, not the volume
    var rms = Math.sqrt(ss / (2 * N)) || 1, gain = Math.min(0.11 / rms, 1.6 / (peak || 1));
    for (i = 0; i < N; i++) { mL[i] = Math.tanh(mL[i] * gain * 1.15); mR[i] = Math.tanh(mR[i] * gain * 1.15); }
    var AB = opts.AudioBuffer || (typeof AudioBuffer !== 'undefined' ? AudioBuffer : null);
    if (!AB) return Promise.resolve({ sampleRate: sr, length: N, duration: N / sr, data: mL, channels: [mL, mR] });
    var ab = new AB({ length: N, sampleRate: sr, numberOfChannels: 2 }); ab.copyToChannel(mL, 0); ab.copyToChannel(mR, 1);
    return Promise.resolve(ab);
  }
  // Schroeder room reverb, run twice around the loop so the tail wraps seamlessly
  function reverbChan(inp, N, sr, delays) {
    var out = new Float32Array(N), C = delays.map(function (d) { return { b: new Float32Array(Math.round(d * sr)), p: 0, lp: 0 }; });
    var AP = [0.005, 0.0017].map(function (d) { return { b: new Float32Array(Math.round(d * sr)), p: 0 }; });
    for (var t = 0; t < 2 * N; t++) {
      var x = inp[t % N] * 0.25, s = 0, c, a;
      for (c = 0; c < 4; c++) { var cc = C[c], y = cc.b[cc.p]; cc.lp += 0.35 * (y - cc.lp); cc.b[cc.p] = x + cc.lp * 0.84; cc.p = (cc.p + 1) % cc.b.length; s += y; }
      for (a = 0; a < 2; a++) { var aa = AP[a], z = aa.b[aa.p], v = s + 0.5 * z; s = z - 0.5 * v; aa.b[aa.p] = v; aa.p = (aa.p + 1) % aa.b.length; }
      if (t >= N) out[t - N] = s;
    }
    return out;
  }

  // ---- Client ------------------------------------------------------------
  function Client(opts) {
    opts = opts || {};
    this.base = (opts.base || '').replace(/\/$/, '');
    this._cache = {};
    this._tracks = null;
    this.quality = opts.quality === 'deluxe' ? 'deluxe' : 'standard';   // 'deluxe' = stereo party mix (slower to render)
  }
  Client.prototype.setQuality = function (q) { q = q === 'deluxe' ? 'deluxe' : 'standard'; if (q !== this.quality) { this.quality = q; } return this; };
  Client.prototype.tracks = function () {
    var self = this;
    if (self._tracks) return Promise.resolve(self._tracks);
    if (!self.base || typeof fetch === 'undefined') return Promise.resolve((self._tracks = BUILTIN.slice()));
    return fetch(self.base + '/api/tracks.json', { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (j) { return (self._tracks = j.tracks || BUILTIN.slice()); })
      .catch(function () { return (self._tracks = BUILTIN.slice()); });
  };
  Client.prototype.find = function (id) {
    return this.tracks().then(function (l) { return l.filter(function (t) { return t.id === id; })[0]; });
  };
  Client.prototype.load = function (trackOrId) {
    var self = this;
    var p = typeof trackOrId === 'string' ? self.find(trackOrId) : Promise.resolve(trackOrId);
    return p.then(function (t) {
      if (!t) throw new Error('Unknown track');
      var key = t.url ? t.id : t.id + ':' + self.quality;
      if (!self._cache[key]) {
        if (t.url) {
          self._cache[key] = fetch(t.url)
            .then(function (r) {
              if (!r.ok) throw new Error(r.status);
              return r.arrayBuffer();
            })
            .then(function (buf) {
              var AC = typeof AudioContext !== 'undefined' ? AudioContext : (typeof webkitAudioContext !== 'undefined' ? webkitAudioContext : null);
              if (!AC) throw new Error('AudioContext not supported');
              var ac = new AC();
              return new Promise(function (resolve, reject) {
                ac.decodeAudioData(buf, resolve, reject);
              });
            });
        } else {
          self._cache[key] = self.quality === 'deluxe' ? renderDeluxe(t) : renderTrack(t);
        }
      }
      return self._cache[key];
    });
  };

  return { VERSION: VERSION, Client: Client, BUILTIN: BUILTIN, renderTrack: renderTrack, renderDeluxe: renderDeluxe, STYLES: STYLES };
});
