// Web Audio: sfx synth + background music from Stopiffy.
WL.Audio = (function () {
  var ctx = null, master, musicGain, sfxGain, bgmSrc = null, bgmGain = null, bgmId = null, bgmT0 = 0, token = 0, quality = 'standard', dxCache = {}, dxWorker = null, dxWait = {}, dxSeq = 0, slowCb = null;
  var storeData = WL.Storage.load();
  var settings = storeData.audio;
  var client = new Stopiffy.Client({ base: WL.CONFIG.stopiffyBase });

  function unlock() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      var comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.knee.value = 20; comp.ratio.value = 3; comp.attack.value = 0.006; comp.release.value = 0.22;   // bus glue + safety limiter
      master.connect(comp); comp.connect(ctx.destination);
      musicGain = ctx.createGain(); sfxGain = ctx.createGain();
      musicGain.connect(master); sfxGain.connect(master);
      // short generated room reverb on the sound effects (a little space instead of dry beeps)
      var len = Math.floor(ctx.sampleRate * 0.9), imp = ctx.createBuffer(2, len, ctx.sampleRate);
      for (var ch = 0; ch < 2; ch++) { var d = imp.getChannelData(ch); for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
      var conv = ctx.createConvolver(); conv.buffer = imp; var wet = ctx.createGain(); wet.gain.value = 0.16; sfxGain.connect(conv); conv.connect(wet); wet.connect(master);
      apply();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function apply() { if (!ctx) return; musicGain.gain.value = settings.music * 0.7; sfxGain.gain.value = settings.sfx; }
  function set(k, v) {
    settings[k] = v;
    apply();
    var data = WL.Storage.load();
    data.audio[k] = v;
    WL.Storage.save(data);
  }

  function blip(f0, f1, dur, type, vol) {
    if (!ctx) return;
    var o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime;
    o.type = type || 'square'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol || 0.15, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(sfxGain); o.start(t); o.stop(t + dur + 0.02);
  }
  var SFX = {
    jump: function () { blip(300, 700, 0.14, 'square', 0.1); },
    shoot: function () { blip(900, 200, 0.09, 'sawtooth', 0.08); },
    hit: function () { blip(220, 60, 0.18, 'square', 0.15); },
    hurt: function () { blip(400, 80, 0.35, 'sawtooth', 0.2); },
    pickup: function () { blip(600, 1200, 0.1, 'triangle', 0.15); setTimeout(function () { blip(900, 1600, 0.12, 'triangle', 0.15); }, 70); },
    boom: function () { blip(160, 30, 0.5, 'sawtooth', 0.25); },
    win: function () { [523, 659, 784, 1047].forEach(function (f, i) { setTimeout(function () { blip(f, f, 0.2, 'triangle', 0.18); }, i * 120); }); },
    click: function () { blip(500, 700, 0.05, 'square', 0.06); },
    // ---- party sounds ----
    airhorn: function () { [466, 587, 698].forEach(function (f, i) { setTimeout(function () { blip(f * 1.0, f * 0.97, 0.55, 'sawtooth', 0.09); blip(f * 1.006, f * 0.975, 0.55, 'square', 0.05); }, i * 5); }); setTimeout(function () { blip(466, 440, 0.7, 'sawtooth', 0.09); blip(587, 560, 0.7, 'sawtooth', 0.07); }, 620); },
    cheer: function () { noise(1.4, 700, 2600, 0.11, true); for (var i = 0; i < 9; i++) setTimeout(function () { noise(0.12, 1200 + Math.random() * 1500, 3000, 0.07, false); }, 80 + i * 140 + Math.random() * 90); },
    pop: function () { noise(0.07, 2600, 5000, 0.12, false); blip(900 + Math.random() * 300, 260, 0.09, 'triangle', 0.1); },
    sparkle: function () { [1319, 1568, 1976, 2349].forEach(function (f, i) { setTimeout(function () { blip(f, f * 1.01, 0.18, 'sine', 0.07); }, i * 55); }); },
    boing: function () { blip(180, 520, 0.28, 'sine', 0.14); setTimeout(function () { blip(520, 240, 0.22, 'sine', 0.1); }, 110); }
  };
  // filtered noise burst for cheers/pops: swell = fade in then out
  function noise(dur, f0, f1, vol, swell) {
    if (!ctx) return;
    var n = Math.floor(ctx.sampleRate * dur), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0), t = ctx.currentTime;
    for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    var src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); src.buffer = b; f.type = 'bandpass'; f.Q.value = 0.9;
    f.frequency.setValueAtTime(f0, t); f.frequency.linearRampToValueAtTime(f1, t + dur);
    if (swell) { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + dur * 0.35); g.gain.linearRampToValueAtTime(0.0001, t + dur); } else { g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); }
    src.connect(f); f.connect(g); g.connect(sfxGain); src.start(t);
  }
  function sfx(n) { if (ctx && SFX[n]) SFX[n](); }

  // ---- track loading. 'deluxe' renders the stereo party mix in a Web Worker (no jank); falls back to standard if unsupported/slow ----
  function worker() {
    if (dxWorker !== null) return dxWorker;
    try {
      var url = new URL('js/stopiffy.js', document.baseURI).href;
      var src = "importScripts('" + url + "');onmessage=function(e){Stopiffy.renderDeluxe(e.data.track).then(function(r){var L=r.channels[0],R=r.channels[1];postMessage({id:e.data.id,sr:r.sampleRate,L:L,R:R},[L.buffer,R.buffer]);}).catch(function(x){postMessage({id:e.data.id,err:String(x)});});};";
      dxWorker = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
      dxWorker.onmessage = function (e) { var w = dxWait[e.data.id]; if (!w) return; delete dxWait[e.data.id]; if (e.data.err) w.rej(new Error(e.data.err)); else { var ab = ctx.createBuffer(2, e.data.L.length, e.data.sr); ab.copyToChannel(e.data.L, 0); ab.copyToChannel(e.data.R, 1); w.res(ab); } };
      dxWorker.onerror = function () { dxWorker = false; };
    } catch (e) { dxWorker = false; }
    return dxWorker;
  }
  function load(trackOrId) {
    var p = typeof trackOrId === 'string' ? client.find(trackOrId) : Promise.resolve(trackOrId);
    return p.then(function (t) {
      if (!t) throw new Error('Unknown track');
      if (quality !== 'deluxe' || t.url || !ctx) return client.setQuality('standard').load(t);
      if (dxCache[t.id]) return dxCache[t.id];
      var w = worker(), t0 = performance.now();
      var pr = w ? new Promise(function (res, rej) { var id = ++dxSeq; dxWait[id] = { res: res, rej: rej }; w.postMessage({ id: id, track: t }); })
                 : client.setQuality('deluxe').load(t);
      pr = pr.then(function (b) { if (performance.now() - t0 > 12000 && slowCb) slowCb(); return b; }, function () { delete dxCache[t.id]; return client.setQuality('standard').load(t); });
      dxCache[t.id] = pr; return pr;
    });
  }
  function setQuality(q) { quality = q === 'deluxe' ? 'deluxe' : 'standard'; return quality; }

  // opts: { loop: true|false, onEnd: fn (only when loop is false and the track finishes by itself), force: true }
  function playBgm(id, opts) {
    opts = opts || {};
    if (!ctx || (bgmId === id && bgmSrc && !opts.force)) return Promise.resolve();
    bgmId = id; var my = ++token;
    return load(id).then(function (buf) {
      if (my !== token) return;
      stopBgm(true);
      var s = ctx.createBufferSource(), g = ctx.createGain(), t = ctx.currentTime;
      s.buffer = buf; s.loop = opts.loop !== false;
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(1, t + 0.35);     // gentle fade-in
      s.connect(g); g.connect(musicGain); s.start(); bgmT0 = ctx.currentTime;
      if (!s.loop && opts.onEnd) s.onended = function () { if (my === token) opts.onEnd(); };
      bgmSrc = s; bgmGain = g;
    }).catch(function (e) { console.warn('bgm failed', e); });
  }
  function stopBgm(keepId) { if (bgmSrc) { bgmSrc.onended = null; try { bgmSrc.stop(); } catch (e) {} bgmSrc = null; bgmGain = null; } if (!keepId) { bgmId = null; token++; } }
  function fadeOutBgm(sec) {
    if (!ctx || !bgmSrc) return stopBgm();
    var s = bgmSrc, g = bgmGain, t = ctx.currentTime; sec = sec || 0.5; s.onended = null;
    g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(0.0001, t + sec);
    bgmSrc = null; bgmGain = null; bgmId = null; token++;
    setTimeout(function () { try { s.stop(); } catch (e) {} }, sec * 1000 + 60);
  }
  // DJ "vinyl stop": the record slows to a halt while the music pitches down, then a scratch flick + crackle.
  function vinylStop() {
    if (!ctx) return;
    var t = ctx.currentTime, dur = 0.95;
    if (bgmSrc) {
      var s = bgmSrc, g = bgmGain; s.onended = null;
      s.playbackRate.cancelScheduledValues(t); s.playbackRate.setValueAtTime(s.playbackRate.value || 1, t); s.playbackRate.exponentialRampToValueAtTime(0.04, t + dur);
      g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(0.0001, t + dur);
      bgmSrc = null; bgmGain = null; bgmId = null; token++;
      setTimeout(function () { try { s.stop(); } catch (e) {} }, dur * 1000 + 80);
    }
    // synthesized record brake whine
    var o = ctx.createOscillator(), og = ctx.createGain(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(520, t); o.frequency.exponentialRampToValueAtTime(34, t + dur);
    og.gain.setValueAtTime(0.0001, t); og.gain.linearRampToValueAtTime(0.08, t + 0.04); og.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(og); og.connect(sfxGain); o.start(t); o.stop(t + dur + 0.05);
    // scratch flick + vinyl crackle (filtered noise)
    function noise(at, len, f0, f1, vol) {
      var n = Math.floor(ctx.sampleRate * len), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
      for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (Math.random() < 0.06 ? 1 : 0.35);
      var src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), ng = ctx.createGain();
      src.buffer = b; f.type = 'bandpass'; f.Q.value = 3; f.frequency.setValueAtTime(f0, at); f.frequency.exponentialRampToValueAtTime(f1, at + len);
      ng.gain.setValueAtTime(vol, at); ng.gain.exponentialRampToValueAtTime(0.0001, at + len);
      src.connect(f); f.connect(ng); ng.connect(sfxGain); src.start(at);
    }
    noise(t, 0.22, 3500, 500, 0.5);            // the scratch
    noise(t + 0.25, 0.7, 1800, 4000, 0.18);    // crackle as it stops
    setTimeout(function () { blip(70, 45, 0.18, 'sine', 0.2); }, dur * 1000 - 120);   // final thunk
  }
  return {
    unlock: unlock, sfx: sfx, load: load, setQuality: setQuality, get quality() { return quality; }, onSlow: function (f) { slowCb = f; }, playBgm: playBgm, stopBgm: stopBgm, fadeOutBgm: fadeOutBgm, vinylStop: vinylStop, set: set, settings: settings, client: client,
    get ctx() { return ctx; }, get master() { return master; }, get musicGain() { return musicGain; }, get bgmId() { return bgmId; }, get bgmStart() { return bgmT0; }
  };
})();
