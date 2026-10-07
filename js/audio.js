// Web Audio: sfx synth + background music from Stopiffy.
WL.Audio = (function () {
  var ctx = null, master, musicGain, sfxGain, bgmSrc = null, bgmId = null, token = 0;
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

  function playBgm(id) {
    if (!ctx || bgmId === id) return Promise.resolve();
    bgmId = id; var my = ++token;
    return client.load(id).then(function (buf) {
      if (my !== token) return;
      stopBgm(true);
      bgmSrc = ctx.createBufferSource(); bgmSrc.buffer = buf; bgmSrc.loop = true;
      bgmSrc.connect(musicGain); bgmSrc.start();
    }).catch(function (e) { console.warn('bgm failed', e); });
  }
  function stopBgm(keepId) { if (bgmSrc) { try { bgmSrc.stop(); } catch (e) {} bgmSrc = null; } if (!keepId) { bgmId = null; token++; } }
  return {
    unlock: unlock, sfx: sfx, playBgm: playBgm, stopBgm: stopBgm, set: set, settings: settings, client: client,
    get ctx() { return ctx; }, get master() { return master; }, get musicGain() { return musicGain; }
  };
})();
