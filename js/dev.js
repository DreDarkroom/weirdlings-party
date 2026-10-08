// Developer mode: performance HUD, test tools, clock simulation. Off by default; enabled in Settings.
// Browsers do NOT expose CPU/GPU temperature. We show what the web platform really offers: FPS/frame time,
// long-task count, CPU "pressure" state (Chrome PressureObserver), JS heap, device memory, logical cores, battery,
// network, GPU name, audio latency and game entity counts.
WL.Dev = (function () {
  var KEY = 'wl.dev';
  var flags = { god: false, hitboxes: false, timeScale: 1 };
  var enabled = false, hud = null, frames = [], longTasks = [], pressure = 'n/a', battery = null, errors = [], gpu = 'n/a', t0 = performance.now();

  try { enabled = localStorage.getItem(KEY) === '1'; } catch (e) {}
  window.addEventListener('error', function (e) { errors.push((e.message || 'error') + ' @' + (e.filename || '').split('/').pop() + ':' + e.lineno); errors = errors.slice(-8); });
  window.addEventListener('unhandledrejection', function (e) { errors.push('promise: ' + (e.reason && e.reason.message || e.reason)); errors = errors.slice(-8); });
  try { new PerformanceObserver(function (l) { l.getEntries().forEach(function (en) { longTasks.push(performance.now()); }); }).observe({ entryTypes: ['longtask'] }); } catch (e) {}
  try { if (window.PressureObserver) { var po = new PressureObserver(function (r) { pressure = r[r.length - 1].state; }); po.observe('cpu', { sampleInterval: 1000 }).catch(function () {}); } } catch (e) {}
  try { if (navigator.getBattery) navigator.getBattery().then(function (b) { battery = b; }); } catch (e) {}
  try { var c = document.createElement('canvas'), gl = c.getContext('webgl'), x = gl && gl.getExtension('WEBGL_debug_renderer_info'); if (x) gpu = gl.getParameter(x.UNMASKED_RENDERER_WEBGL); } catch (e) {}

  function frame(dtMs) { if (!enabled) return; frames.push(dtMs); if (frames.length > 120) frames.shift(); }
  function snapshot() {
    var n = frames.length, avg = n ? frames.reduce(function (a, b) { return a + b; }, 0) / n : 0, max = n ? Math.max.apply(null, frames) : 0;
    var now = performance.now(); longTasks = longTasks.filter(function (t) { return now - t < 10000; });
    var S = WL.Game && WL.Game.state, m = performance.memory, conn = navigator.connection, ctx = WL.Audio && WL.Audio.ctx;
    return {
      fps: avg ? Math.round(1000 / avg) : 0, frameMs: +avg.toFixed(1), worstMs: Math.round(max), longTasks10s: longTasks.length, cpuPressure: pressure,
      heapMB: m ? Math.round(m.usedJSHeapSize / 1048576) + '/' + Math.round(m.jsHeapSizeLimit / 1048576) : 'n/a',
      deviceMemGB: navigator.deviceMemory || 'n/a', cores: navigator.hardwareConcurrency || 'n/a',
      battery: battery ? Math.round(battery.level * 100) + '%' + (battery.charging ? ' ⚡' : '') : 'n/a',
      net: conn ? (conn.effectiveType || '') + ' ' + (conn.downlink || '?') + 'Mb ' + (conn.rtt || '?') + 'ms' : 'n/a',
      screen: innerWidth + 'x' + innerHeight + '@' + (window.devicePixelRatio || 1) + ' canvas ' + (document.getElementById('game') || {}).width + 'px',
      gpu: gpu, audio: ctx ? ctx.state + ' lat ' + (ctx.baseLatency || 0).toFixed(3) + '/' + (ctx.outputLatency || 0).toFixed(3) : 'off',
      entities: S ? S.enemies.length + 'e ' + S.bullets.length + 'b ' + S.ebullets.length + 'eb ' + S.parts.length + 'p' : '-',
      level: S ? S.spec.name + ' seed ' + S.spec.seed : '-', uptimeS: Math.round((now - t0) / 1000),
      clockOffsetMin: Math.round(WL.Countdown.getOffset() / 60000), ua: navigator.userAgent.slice(0, 90), version: WL.CONFIG.version, errors: errors.slice()
    };
  }
  function drawHud() {
    if (!enabled || !hud) return;
    var s = snapshot(), color = s.fps >= 55 ? '#38f2c1' : s.fps >= 30 ? '#ffd23f' : '#ff4d6d';
    hud.innerHTML = '';
    var rows = [['FPS', s.fps + ' (' + s.frameMs + 'ms, worst ' + s.worstMs + ')', color], ['CPU pressure', s.cpuPressure + ' · long tasks/10s ' + s.longTasks10s], ['Heap MB', s.heapMB], ['Device', s.cores + ' cores · ' + s.deviceMemGB + ' GB'], ['Battery', s.battery], ['Network', s.net], ['Screen', s.screen], ['GPU', s.gpu], ['Audio', s.audio], ['World', s.entities + ' · ' + s.level], ['Clock', s.clockOffsetMin ? 'simulated ' + (s.clockOffsetMin > 0 ? '+' : '') + s.clockOffsetMin + ' min' : 'real']];
    if (s.errors.length) rows.push(['Errors', s.errors[s.errors.length - 1], '#ff4d6d']);
    rows.forEach(function (r) { var d = document.createElement('div'), a = document.createElement('b'), v = document.createElement('span'); a.textContent = r[0] + ' '; v.textContent = r[1]; if (r[2]) v.style.color = r[2]; d.appendChild(a); d.appendChild(v); hud.appendChild(d); });
  }
  function setEnabled(v) {
    enabled = !!v; try { localStorage.setItem(KEY, enabled ? '1' : '0'); } catch (e) {}
    document.body.classList.toggle('dev', enabled);
    if (hud) hud.hidden = !enabled;
    if (!enabled) { flags.god = flags.hitboxes = false; flags.timeScale = 1; WL.Countdown.setOffset(0); }
  }
  function init() {
    hud = document.getElementById('devHud');
    setEnabled(enabled); setInterval(drawHud, 500);
    var chk = document.getElementById('setDev'); if (chk) { chk.checked = enabled; chk.onchange = function () { setEnabled(this.checked); WL.UI.toast(this.checked ? '🛠 Developer mode ON: new menu on the title screen' : 'Developer mode off'); }; }
  }

  // ---- Developer menu ----------------------------------------------------
  function btn(label, fn, cls) { var b = document.createElement('button'); b.textContent = label; if (cls) b.className = cls; b.onclick = fn; return b; }
  function group(title) { var g = document.createElement('div'); g.className = 'devgroup'; var h = document.createElement('h3'); h.textContent = title; g.appendChild(h); return g; }
  function row(a) { var r = document.createElement('div'); r.className = 'menu row'; a.forEach(function (x) { r.appendChild(x); }); return r; }
  function toggle(label, key) {
    var b = btn(label + ': ' + (flags[key] ? 'ON' : 'off'), function () { flags[key] = !flags[key]; b.textContent = label + ': ' + (flags[key] ? 'ON' : 'off'); b.classList.toggle('on', flags[key]); }); b.classList.toggle('on', flags[key]); return b;
  }
  function buildMenu() {
    var root = document.getElementById('devRoot'); root.innerHTML = '';
    var skip = { checked: true };
    var g = group('Jump to any level'), chk = document.createElement('label'); chk.className = 'chk';
    var cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = true; chk.appendChild(cb); chk.appendChild(document.createTextNode(' Skip story dialogue'));
    g.appendChild(chk);
    WL.Game.LEVELS.forEach(function (l, i) { g.appendChild(btn((l.part === 2 ? 'P2 ' : 'P1 ') + (i + 1) + '. ' + l.name, function () { WL.UI.startLevel(i, { skipIntro: cb.checked }); })); });
    root.appendChild(g);

    g = group('In-game cheats');
    g.appendChild(row([toggle('God mode', 'god'), toggle('Hitboxes', 'hitboxes')]));
    var ts = document.createElement('label'); ts.textContent = 'Time scale '; var rg = document.createElement('input'); rg.type = 'range'; rg.min = 0.25; rg.max = 2; rg.step = 0.25; rg.value = flags.timeScale;
    var tv = document.createElement('b'); tv.textContent = flags.timeScale + 'x'; rg.oninput = function () { flags.timeScale = +rg.value; tv.textContent = rg.value + 'x'; }; ts.appendChild(rg); ts.appendChild(tv); g.appendChild(ts);
    g.appendChild(row([btn('Win level now', function () { WL.Game.dev.win(); }), btn('Kill boss', function () { WL.Game.dev.killBoss(); }), btn('Spawn 5 enemies', function () { WL.Game.dev.spawn(5); }), btn('Full heal', function () { WL.Game.dev.heal(); })]));
    g.appendChild(el('p', 'hint', 'Start a level above, then press Esc to pause and reach these from the pause menu → Developer.'));
    root.appendChild(g);

    g = group('Story + scenes');
    var sel = document.createElement('select'); Object.keys(WL.UI.story()).forEach(function (k) { var o = document.createElement('option'); o.textContent = k; sel.appendChild(o); }); g.appendChild(sel);
    g.appendChild(row([btn('Play scene', function () { WL.UI.playScene(sel.value); }), btn('Finale 1 (Kerry)', function () { WL.UI.devFinale(1); }), btn('Finale 2 (Mick)', function () { WL.UI.devFinale(2); })]));
    root.appendChild(g);

    g = group('Party clock simulator (UK time)');
    var sl = WL.Setlist.slots;
    g.appendChild(row([btn('5 min before doors', function () { WL.Countdown.setOffset(WL.Countdown.target - Date.now() - 300000); }), btn('1 min before doors', function () { WL.Countdown.setOffset(WL.Countdown.target - Date.now() - 60000); })]));
    g.appendChild(row(sl.map(function (s) { return btn('During ' + s.dj, function () { WL.Countdown.setOffset(s.startMs - Date.now() + 120000); }); })));
    g.appendChild(row([btn('After the party', function () { WL.Countdown.setOffset(sl[sl.length - 1].endMs - Date.now() + 60000); }), btn('Reset to real time', function () { WL.Countdown.setOffset(0); })]));
    root.appendChild(g);

    g = group('Progress + data');
    g.appendChild(row([btn('Unlock Part 2', function () { WL.UI.devSet({ part1Done: true, unlocked: 3 }); }), btn('Lock Part 2', function () { WL.UI.devSet({ part1Done: false, unlocked: 0 }); }), btn('Clear wishes (this device)', function () { try { localStorage.removeItem('wl.wishes.v1'); WL.UI.toast('Local wishes cleared'); } catch (e) {} }), btn('Reset everything', function () { if (confirm('Wipe all saved data?')) { try { localStorage.clear(); } catch (e) {} location.reload(); } })]));
    root.appendChild(g);

    g = group('Open screens');
    g.appendChild(row([btn('Cake·AI', function () { WL.UI.show('cakemaker'); }), btn('Set list', function () { WL.UI.show('setlist'); }), btn('DJ booth', function () { WL.UI.show('dj'); }), btn('Birthday card', function () { WL.Wishes.openCard('kerry'); }), btn('Sign book', function () { WL.Wishes.openSign('mick'); }), btn('Workshop', function () { WL.UI.show('workshop'); WL.Lab.renderWorkshop(); }), btn('Writers\' room', function () { WL.UI.show('writers'); WL.Lab.renderWriters(); }), btn('🧪 Dev Lab', function () { WL.UI.show('devlab'); WL.Lab.renderDevLab(); })]));
    root.appendChild(g);

    g = group('Diagnostics');
    var pre = document.createElement('pre'); pre.className = 'devpre'; pre.textContent = 'Press "Refresh" to snapshot.';
    g.appendChild(row([btn('Refresh stats', function () { pre.textContent = JSON.stringify(snapshot(), null, 2); }), btn('Copy debug report', function () { var r = JSON.stringify({ snapshot: snapshot(), flags: flags, save: localStorage.getItem('wl.save') }, null, 2); (navigator.clipboard ? navigator.clipboard.writeText(r) : Promise.reject()).then(function () { WL.UI.toast('Debug report copied'); }, function () { pre.textContent = r; }); })]));
    g.appendChild(pre); root.appendChild(g);
  }
  function el(tag, cls, txt) { var e = document.createElement(tag); e.className = cls; e.textContent = txt; return e; }
  return { flags: flags, frame: frame, snapshot: snapshot, init: init, buildMenu: buildMenu, get enabled() { return enabled; }, setEnabled: setEnabled };
})();
