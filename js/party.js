// PARTY MODE. Dormant until the party clock goes live (7pm UK, Fri 9 Oct 2026), then switches itself on for everyone:
// the "Deluxe" stereo audio mix, beat-synced light show, party hats on every Clanker, comic pops, balloons, confetti
// and joke bubbles. Already-open tabs flip at the exact second. Dev mode can preview it any time.
// Safety: nothing flashes faster than the beat at low contrast, "Chill" halves it, "Off" (or prefers-reduced-motion) kills it.
WL.Party = (function () {
  var KEY = 'wl.party';
  var pref = { fx: 'wild', hq: 'auto' };       // fx: wild | chill | off   hq: auto | deluxe | standard
  var reduced = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  try { var sv = JSON.parse(localStorage.getItem(KEY)); if (sv) Object.keys(pref).forEach(function (k) { if (sv[k]) pref[k] = sv[k]; }); else if (reduced) pref.fx = 'off'; } catch (e) { if (reduced) pref.fx = 'off'; }
  var live = false, forced = false, launched = false, t = 0, pulse = 0, lastBeat = -1, beatN = 0, bpmCache = {}, pops = [], balloonT = 3, jokeT = 25, trailT = 0, free0 = performance.now();
  var $ = function (id) { return document.getElementById(id); };
  var HUES = [330, 45, 150, 190, 270];
  var POPS = ['POW!', 'BONK!', 'YEET!', 'SLOP DOWN!', 'AI WHO?', 'DELETED', 'BOOP!', '404!', 'KABLOOEY', 'NICE!', 'CAKE!', 'GLITCH!'];
  var JOKES = [
    ['Dee', 'Is it my set yet? …wait, what time is it?'], ['Helix', 'Double strand, double trouble, double cake.'], ['Myster Y. Deep', 'Deep bass, deeper regrets about the buffet.'],
    ['Bo0m', 'Lucky Salvage found a party hat. Lucky Salvage is wearing it.'], ['Hypnotized', 'You are getting sleepy… of AI. Now dance.'], ['Dizzle', 'I am a cake and I have notes about the music.'],
    ['Kerry', 'Nobody tell the Simulation it\'s my birthday.'], ['Dee', 'I remembered! …Did I remember? Check the pager.'], ['Simulation', 'PARTY DETECTED. RESPONSE: LOL. (ERROR).']
  ];
  function saveP() { try { localStorage.setItem(KEY, JSON.stringify(pref)); } catch (e) {} }
  function on() { return live || forced; }
  function level() { return on() ? pref.fx : 'off'; }
  function wild() { return level() === 'wild'; }

  // ---- beat clock: locked to the music when a track is playing, free-running 120 BPM otherwise ----
  function bpm() {
    var id = WL.Audio.bgmId; if (!id) return 0; if (bpmCache[id]) return bpmCache[id];
    var tr = WL.Music && WL.Music.byId ? WL.Music.byId(id) : null; if (tr) bpmCache[id] = tr.bpm; return bpmCache[id] || 0;
  }
  function beatClock() {
    var b = bpm(), ctx = WL.Audio.ctx, ph, n;
    if (b && ctx) { var x = (ctx.currentTime - WL.Audio.bgmStart - (ctx.outputLatency || ctx.baseLatency || 0)) / (60 / b); n = Math.floor(x); ph = x - n; }
    else { var y = (performance.now() - free0) / 500; n = Math.floor(y); ph = y - n; }
    return { n: n, ph: ph };
  }

  // ---- launch: called by the party clock ----
  function setHq() {
    var want = pref.hq === 'deluxe' || (pref.hq === 'auto' && on());
    var was = WL.Audio.quality; WL.Audio.setQuality(want ? 'deluxe' : 'standard');
    if (was !== WL.Audio.quality && WL.Music) WL.Music.refresh();      // re-render the playing track in the new mix
  }
  function start(dramatic) {
    if (launched) return; launched = true;
    document.body.classList.add('party'); setHq(); applyClasses();
    prewarm();
    if (dramatic) launchShow(); else if (level() !== 'off') WL.UI.toast('🪩 Party mode is ON. The party is live!');
  }
  function launchShow() {
    var cur = WL.Setlist && WL.Setlist.current();
    WL.Audio.sfx('airhorn'); setTimeout(function () { WL.Audio.sfx('cheer'); WL.Audio.sfx('sparkle'); }, 500);
    if (level() === 'off') { WL.UI.toast('🎉 THE PARTY HAS STARTED!'); return; }
    rain(['🎉', '🎂', '🪩', '🥳', '🤖', '🎈', '💥'], 46);
    if (WL.Game.running) { WL.UI.toast('🪩 THE PARTY HAS STARTED! Deluxe sound + party mode ON'); return; }   // never interrupt a level
    var o = $('partyLaunch'); if (!o) return;
    $('plSub').textContent = cur ? '🔴 NOW: ' + cur.dj + ' · ' + cur.title : 'Doors are open!';
    o.hidden = false; setTimeout(function () { o.hidden = true; }, 7500);
    if (WL.updateReady) setTimeout(function () { if (!WL.Game.running) location.reload(); }, 8000);   // pick up a newer build while we're on a menu
  }
  function prewarm() {   // render the deluxe mix for the main themes in the background so the switch is instant
    if (WL.Audio.quality !== 'deluxe' || !WL.Audio.ctx) return;
    ['simulation-lullaby', 'weirdling-walk', 'glitch-highway', 'overfit-boss', 'kerry-birthday-anthem'].forEach(function (id, i) { setTimeout(function () { WL.Audio.load(id).catch(function () {}); }, 1500 + i * 2500); });
  }
  function applyClasses() { var b = document.body.classList; ['wild', 'chill', 'off'].forEach(function (k) { b.toggle('fx-' + k, level() === k); }); b.toggle('party', on()); }

  // ---- DOM fx: balloons + emoji rain ----
  function rain(emos, n) {
    var layer = $('fxLayer'); if (!layer || level() === 'off') return; n = level() === 'chill' ? Math.ceil(n / 3) : n;
    for (var i = 0; i < n && layer.childElementCount < 90; i++) {
      var e = document.createElement('span'); e.className = 'emo'; e.textContent = emos[i % emos.length];
      e.style.left = Math.random() * 100 + '%'; e.style.fontSize = (18 + Math.random() * 26) + 'px'; e.style.animationDuration = (2.6 + Math.random() * 3) + 's'; e.style.animationDelay = (Math.random() * 1.2) + 's';
      e.addEventListener('animationend', function () { this.remove(); }); layer.appendChild(e);
    }
  }
  function balloon() {
    var layer = $('fxLayer'); if (!layer || layer.childElementCount > 14) return;
    var e = document.createElement('span'); e.className = 'balloon'; e.textContent = ['🎈', '🎈', '🪩', '🎂'][Math.floor(Math.random() * 4)];
    e.style.left = (5 + Math.random() * 90) + '%'; e.style.fontSize = (28 + Math.random() * 30) + 'px'; e.style.animationDuration = (7 + Math.random() * 6) + 's';
    e.addEventListener('animationend', function () { this.remove(); }); layer.appendChild(e);
  }

  // ---- per-frame (menus + gameplay) ----
  function frame(dt) {
    if (!on()) { if (document.body.style.getPropertyValue('--beat')) document.body.style.removeProperty('--beat'); return; }
    t += dt; var bc = beatClock(); pulse = Math.pow(1 - bc.ph, 3);
    if (bc.n !== lastBeat) { lastBeat = bc.n; beatN++; onBeat(); }
    document.body.style.setProperty('--beat', level() === 'off' ? '0' : (pulse * (wild() ? 1 : 0.5)).toFixed(2));
    if (level() === 'off') return;
    if ((balloonT -= dt) <= 0) { balloonT = wild() ? 2.4 + Math.random() * 2 : 6 + Math.random() * 4; balloon(); }
    if (WL.Game.running && document.body.classList.contains('playing') && (jokeT -= dt) <= 0) { jokeT = 28 + Math.random() * 20; var j = JOKES[Math.floor(Math.random() * JOKES.length)]; WL.UI.say(j[0] + ': ' + j[1]); }
  }
  function onBeat() { if (wild() && beatN % 8 === 0 && Math.random() < 0.5) rain(['🎉', '✨', '🎶'], 6); }

  // ---- in-game hooks (called from game.js) ----
  function tick(S, dt) {
    if (level() === 'off' || !S) return;
    pops.forEach(function (p) { p.life -= dt; p.y -= 38 * dt; });
    pops = pops.filter(function (p) { return p.life > 0; });
    var p = S.player; if (!p || S.state !== 'play') return;
    if ((trailT -= dt) <= 0 && (Math.abs(p.vx) > 40 || !p.onGround)) {   // rainbow trail
      trailT = wild() ? 0.025 : 0.06; var hue = (t * 240) % 360;
      S.parts.push({ x: p.x + p.w / 2 - 2 - p.face * 8, y: p.y + p.h - 6 + Math.random() * 6, vx: -p.vx * 0.05, vy: 0, life: 0.5, color: 'hsl(' + hue + ',95%,60%)', size: 4 + Math.random() * 3, g: 0 });
    }
  }
  function onKill(S, e) {
    if (level() === 'off') return;
    var txt = e.type === 'boss' ? 'HAPPY BIRTHDAY!!' : POPS[Math.floor(Math.random() * POPS.length)];
    pops.push({ x: e.x + e.w / 2, y: e.y, txt: txt, life: 1.1, hue: Math.floor(Math.random() * 360), big: e.type === 'boss' });
    var n = wild() ? (e.type === 'boss' ? 90 : 26) : 10;
    for (var i = 0; i < n; i++) { var a = Math.random() * 6.283, sp = 80 + Math.random() * 260; S.parts.push({ x: e.x + e.w / 2, y: e.y + e.h / 2, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 120, life: 0.8 + Math.random() * 0.9, color: 'hsl(' + Math.floor(Math.random() * 360) + ',95%,62%)', size: 3 + Math.random() * 5 }); }
    WL.Audio.sfx(Math.random() < 0.5 ? 'pop' : 'boing');
  }
  function bulletColor(b) { return level() === 'off' ? b.color : 'hsl(' + ((t * 300 + b.x * 0.5) % 360).toFixed(0) + ',92%,62%)'; }

  // canvas, behind the world (screen space): light beams, disco ball, beat tint
  function drawBack(cx, W, H, cam) {
    var lv = level(); if (lv === 'off') return;
    cx.save();
    cx.globalCompositeOperation = 'lighter';
    cx.fillStyle = 'hsla(' + ((t * 40) % 360).toFixed(0) + ',90%,55%,' + (0.035 + 0.05 * pulse) + ')'; cx.fillRect(0, 0, W, H);
    var beams = lv === 'wild' ? 6 : 2;
    for (var i = 0; i < beams; i++) {
      var ox = W * (0.1 + 0.8 * i / Math.max(1, beams - 1)), ang = Math.sin(t * (0.6 + i * 0.13) + i * 1.7) * 0.5, len = H * 1.25, w = 60 + 36 * pulse;
      var tx = ox + Math.sin(ang) * len, ty = Math.cos(ang) * len, hue = (t * 55 + i * 62) % 360;
      var g = cx.createLinearGradient(ox, 0, tx, ty); g.addColorStop(0, 'hsla(' + hue.toFixed(0) + ',100%,65%,' + (0.2 + 0.18 * pulse) + ')'); g.addColorStop(1, 'hsla(' + hue.toFixed(0) + ',100%,65%,0)');
      cx.fillStyle = g; cx.beginPath(); cx.moveTo(ox - 5, 0); cx.lineTo(ox + 5, 0); cx.lineTo(tx + w, ty); cx.lineTo(tx - w, ty); cx.closePath(); cx.fill();
    }
    cx.restore();
    if (lv === 'wild') {   // disco ball
      var bx = W / 2, by = 44 + pulse * 4, r = 26;
      cx.save(); cx.strokeStyle = '#9ca3af'; cx.lineWidth = 2; cx.beginPath(); cx.moveTo(bx, 0); cx.lineTo(bx, by - r); cx.stroke();
      var gr = cx.createRadialGradient(bx - 8, by - 8, 2, bx, by, r); gr.addColorStop(0, '#fff'); gr.addColorStop(0.5, '#b8c1d6'); gr.addColorStop(1, '#5b6478');
      cx.fillStyle = gr; cx.beginPath(); cx.arc(bx, by, r, 0, 6.283); cx.fill();
      cx.clip(); cx.beginPath(); cx.arc(bx, by, r, 0, 6.283); cx.clip();
      for (var gy = -r; gy < r; gy += 7) for (var gx = -r; gx < r; gx += 7) { var sh = Math.sin(gx * 0.7 + gy * 0.9 + t * 4); if (sh > 0.55) { cx.fillStyle = 'hsla(' + ((gx * 6 + t * 120) % 360).toFixed(0) + ',100%,80%,' + (0.4 + 0.5 * pulse) + ')'; cx.fillRect(bx + gx, by + gy, 6, 6); } }
      cx.restore();
    }
  }
  // canvas, inside the world transform (after entities): pops
  function drawWorld(cx) {
    if (level() === 'off') return; cx.save(); cx.textAlign = 'center';
    pops.forEach(function (p) { var k = Math.min(1, (1.1 - p.life) * 6), sc = (p.big ? 1.6 : 1) * (0.6 + 0.6 * Math.sin(Math.min(1, k) * 1.9)); cx.globalAlpha = Math.min(1, p.life * 2.5); cx.font = 'bold ' + Math.round(22 * sc) + 'px "Comic Sans MS","Segoe Print",system-ui,sans-serif'; cx.lineWidth = 5; cx.strokeStyle = '#1a0630'; cx.strokeText(p.txt, p.x, p.y); cx.fillStyle = 'hsl(' + p.hue + ',100%,68%)'; cx.fillText(p.txt, p.x, p.y); });
    cx.restore();
  }
  function hat(cx, x, y, w, h, hue, tilt) {
    cx.save(); cx.translate(x, y); cx.rotate(tilt || 0);
    cx.fillStyle = 'hsl(' + hue + ',90%,58%)'; cx.beginPath(); cx.moveTo(-w / 2, 0); cx.lineTo(w / 2, 0); cx.lineTo(0, -h); cx.closePath(); cx.fill();
    cx.strokeStyle = '#fff'; cx.lineWidth = Math.max(1.5, w / 10); cx.beginPath(); cx.moveTo(-w / 3, -h * 0.3); cx.lineTo(w / 3, -h * 0.3); cx.stroke();
    cx.fillStyle = '#ffd23f'; cx.beginPath(); cx.arc(0, -h, Math.max(2.5, w / 8), 0, 6.283); cx.fill(); cx.restore();
  }
  function dressEnemy(cx, e) {
    var lv = level(); if (lv === 'off') return; var cxm = e.x + e.w / 2, wob = Math.sin(t * 6 + e.x * 0.05) * 0.12 * (wild() ? 1 : 0.4), hue = (e.x * 0.7) % 360;
    if (e.type === 'boss') { hat(cx, cxm, e.y + 4, 66, 74, 300, wob * 0.6); cx.fillStyle = '#111'; cx.fillRect(cxm - 26, e.y + 28, 52, 8); cx.fillStyle = '#fff'; cx.fillRect(cxm - 24, e.y + 30, 10, 3); cx.fillRect(cxm + 4, e.y + 30, 10, 3); return; }
    if (e.type === 'drone') {   // balloon on a string
      var by = e.y - 30 + Math.sin(t * 3 + e.x) * 4; cx.strokeStyle = '#ddd'; cx.lineWidth = 1; cx.beginPath(); cx.moveTo(cxm, e.y + 2); cx.lineTo(cxm + Math.sin(t * 2) * 3, by + 12); cx.stroke();
      cx.fillStyle = 'hsl(' + hue + ',90%,60%)'; cx.beginPath(); cx.ellipse(cxm + Math.sin(t * 2) * 3, by, 10, 13, 0, 0, 6.283); cx.fill(); cx.fillStyle = 'rgba(255,255,255,.55)'; cx.beginPath(); cx.ellipse(cxm - 3, by - 4, 3, 5, 0, 0, 6.283); cx.fill();
      return;
    }
    hat(cx, cxm, e.y + 2, 18, 22, hue, wob);
    if (e.type === 'walker') { var dir = e.vx > 0 ? 1 : -1; cx.fillStyle = '#0b0b12'; cx.fillRect(cxm - 10, e.y + 8, 20, 6); cx.fillStyle = '#7dd3fc'; cx.fillRect(cxm - 9, e.y + 9, 8, 3); cx.fillRect(cxm + 1, e.y + 9, 8, 3); }   // sunglasses
  }
  function dressPlayer(cx, p) {
    var lv = level(); if (lv === 'off') return; hat(cx, p.x + p.w / 2 + p.face * 2, p.y - 4, 16, 20, (p.ch.color ? 300 : 300) + Math.sin(t * 3) * 40, p.face * 0.2);
    if (wild() && Math.random() < 0.05) { cx.fillStyle = '#fff'; cx.fillRect(p.x + Math.random() * p.w, p.y + Math.random() * p.h, 2, 2); }
  }

  // ---- settings ----
  function bindSettings() {
    var fx = $('setFx'), hq = $('setHq');
    if (fx) { fx.value = pref.fx; fx.onchange = function () { pref.fx = this.value; saveP(); applyClasses(); }; }
    if (hq) { hq.value = pref.hq; hq.onchange = function () { pref.hq = this.value; saveP(); setHq(); }; }
    var go = $('plGo'); if (go) go.onclick = function () { $('partyLaunch').hidden = true; };
    if (WL.Audio.onSlow) WL.Audio.onSlow(function () { if (pref.hq !== 'standard') { pref.hq = 'standard'; saveP(); setHq(); if (hq) hq.value = 'standard'; WL.UI.toast('Deluxe mix was too slow on this device, switched back to Standard.'); } });
  }
  function init() {
    bindSettings(); applyClasses();
    var first = true;
    function check(p) {
      if (p.over && !live) { live = true; start(!first); }
      else if (!p.over && live) { live = false; launched = false; if (!forced) { document.body.classList.remove('party'); setHq(); applyClasses(); } }   // only happens when the dev clock is wound back
      first = false;
    }
    WL.Countdown.subscribe(check); check(WL.Countdown.parts());
  }
  return {
    init: init, frame: frame, tick: tick, onKill: onKill, bulletColor: bulletColor, drawBack: drawBack, drawWorld: drawWorld, dressEnemy: dressEnemy, dressPlayer: dressPlayer,
    level: level, get on() { return on(); }, get live() { return live; }, get pref() { return pref; },
    force: function (v) { forced = !!v; if (forced) { launched = false; document.body.classList.add('party'); start(true); } else if (!live) { launched = false; document.body.classList.remove('party'); setHq(); } applyClasses(); },
    launch: function () { launchShow(); }, rain: rain
  };
})();
