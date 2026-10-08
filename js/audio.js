// Web Audio: sfx synth + background music from Stopiffy.
WL.Audio = (function () {
  var ctx = null, master, musicGain, sfxGain, bgmSrc = null, bgmGain = null, bgmId = null, token = 0;
  var settings = { music: 0.6, sfx: 0.8 };
  var client = new Stopiffy.Client({ base: WL.CONFIG.stopiffyBase });
  try { var s = JSON.parse(localStorage.getItem('wl.audio')); if (s) settings = Object.assign(settings, s); } catch (e) {}

  function unlock() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      ctx = new AC();
      master = ctx.createGain(); master.connect(ctx.destination);
      musicGain = ctx.createGain(); sfxGain = ctx.createGain();
      musicGain.connect(master); sfxGain.connect(master); apply();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function apply() { if (!ctx) return; musicGain.gain.value = settings.music * 0.7; sfxGain.gain.value = settings.sfx; }
  function set(k, v) { settings[k] = v; apply(); try { localStorage.setItem('wl.audio', JSON.stringify(settings)); } catch (e) {} }

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
    click: function () { blip(500, 700, 0.05, 'square', 0.06); }
  };
  function sfx(n) { if (ctx && SFX[n]) SFX[n](); }

  // opts: { loop: true|false, onEnd: fn (only when loop is false and the track finishes by itself), force: true }
  function playBgm(id, opts) {
    opts = opts || {};
    if (!ctx || (bgmId === id && bgmSrc && !opts.force)) return Promise.resolve();
    bgmId = id; var my = ++token;
    return client.load(id).then(function (buf) {
      if (my !== token) return;
      stopBgm(true);
      var s = ctx.createBufferSource(), g = ctx.createGain(), t = ctx.currentTime;
      s.buffer = buf; s.loop = opts.loop !== false;
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(1, t + 0.35);     // gentle fade-in
      s.connect(g); g.connect(musicGain); s.start();
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
    unlock: unlock, sfx: sfx, playBgm: playBgm, stopBgm: stopBgm, fadeOutBgm: fadeOutBgm, vinylStop: vinylStop, set: set, settings: settings, client: client,
    get ctx() { return ctx; }, get master() { return master; }, get musicGain() { return musicGain; }, get bgmId() { return bgmId; }
  };
})();
