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
    synthwave: { kick: 'x...x...x...x...', clap: '....x.......x...', chat: 'x.x.x.x.x.x.x.x.', ohat: '..x...x...x...x.', bass: 'xxxxxxxxxxxxxxxx', wave: 'sawtooth', lead: 0.5 }
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
    { id: 'kerry-birthday-anthem',title: 'Queenslayer Birthday Anthem',    artist: 'Kerry Queenslayer',   style: 'house',     bpm: 126, root: 43, scale: 'major',    seed: 7707, bars: 16, tags: ['dj', 'birthday'] }
  ].map(function (t) { t.license = 'CC0-1.0'; t.duration = Math.round(t.bars * 4 * 60 / t.bpm * 10) / 10; return t; });

  // ---- Synthesis: direct sample-level DSP (no audio graph => fast on phones) ----
  function renderTrack(track, opts) {
    opts = opts || {};
    var sr = opts.sampleRate || 22050;   // mono, 22kHz: plenty for chip-style tracks
    var st = STYLES[track.style] || STYLES.house;
    var scale = SCALES[track.scale] || SCALES.minor;
    var r = mulberry(track.seed);
    var spb = 60 / track.bpm, step = spb / 4, bars = track.bars || 16;
    var N = Math.ceil(bars * 16 * step * sr);
    var buf = new Float32Array(N);
    var TAU = 6.283185307179586;

    function wave(type, ph) {
      if (type === 'sawtooth') return 2 * ph - 1;
      if (type === 'square') return ph < 0.5 ? 1 : -1;
      if (type === 'triangle') return ph < 0.5 ? 4 * ph - 1 : 3 - 4 * ph;
      return Math.sin(TAU * ph);
    }
    function add(i, v) { if (i >= 0 && i < N) buf[i] += v; }
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
    var peak = 0, i;
    for (i = 0; i < N; i++) { var a = Math.abs(buf[i]); if (a > peak) peak = a; }
    var gain = peak > 0 ? 0.85 / peak : 1;
    for (i = 0; i < N; i++) buf[i] = Math.tanh(buf[i] * gain * 1.1);
    var AB = opts.AudioBuffer || (typeof AudioBuffer !== 'undefined' ? AudioBuffer : null);
    if (!AB) return Promise.resolve({ sampleRate: sr, length: N, duration: N / sr, data: buf });
    var ab = new AB({ length: N, sampleRate: sr, numberOfChannels: 1 });
    ab.copyToChannel(buf, 0);
    return Promise.resolve(ab);
  }

  // ---- Client ------------------------------------------------------------
  function Client(opts) {
    opts = opts || {};
    this.base = (opts.base || '').replace(/\/$/, '');
    this._cache = {};
    this._tracks = null;
  }
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
      if (!self._cache[t.id]) self._cache[t.id] = renderTrack(t);
      return self._cache[t.id];
    });
  };

  return { VERSION: VERSION, Client: Client, BUILTIN: BUILTIN, renderTrack: renderTrack, STYLES: STYLES };
});
