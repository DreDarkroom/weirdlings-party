// Workshop + Lab: micro-game registry, public feedback, Writers' Room (narrative contributions), Dev Lab (sandboxed editor).
// Anyone can add a micro-game by dropping js/microgames/<id>.js in a PR and listing it in content/microgames.json.
WL.Lab = (function () {
  var games = [], running = null, VOTES = 'wl.votes', LOCAL = 'wl.lab.local';
  var IDEAS = [
    { id: 'idea-karaoke-boss', title: 'Overfit Karaoke', author: 'Idea', status: 'idea', blurb: 'Out-sing the boss: hit the lyrics in time to drain its health.' },
    { id: 'idea-coop', title: 'Couch co-op', author: 'Idea', status: 'idea', blurb: 'Two players, two pads, one party. Shared hearts.' },
    { id: 'idea-bakeoff', title: 'Dizzle\'s Bake-Off', author: 'Idea', status: 'idea', blurb: 'Stack the cake without it collapsing. Dizzle is not pleased.' }
  ];
  var STATUS = { live: 'Live in game', testing: 'Testing: tell us!', idea: 'Idea' };

  function register(g) { if (!g || !g.id) return; games = games.filter(function (x) { return x.id !== g.id; }); games.push(g); }
  function all() { return games.concat(IDEAS.filter(function (i) { return !games.some(function (g) { return g.id === i.id; }); })); }
  function votes() { try { return JSON.parse(localStorage.getItem(VOTES)) || {}; } catch (e) { return {}; } }
  function vote(id, v) { var o = votes(); o[id] = o[id] === v ? 0 : v; try { localStorage.setItem(VOTES, JSON.stringify(o)); } catch (e) {} renderWorkshop(); }
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }

  // load community micro-games listed in content/microgames.json
  function loadManifest() {
    return fetch('content/microgames.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (list) {
      return Promise.all(list.map(function (src) { return new Promise(function (res) { var s = document.createElement('script'); s.src = src; s.onload = s.onerror = res; document.body.appendChild(s); }); }));
    }).catch(function () {});
  }

  // ---- play a micro-game -----------------------------------------------
  function play(id) {
    var g = games.filter(function (x) { return x.id === id; })[0]; if (!g || !g.play) return;
    WL.UI.show('micro'); WL.Audio.unlock(); WL.Music.suspend('micro', false);
    var host = document.getElementById('microHost'); host.innerHTML = '';
    document.getElementById('microTitle').textContent = g.title; document.getElementById('microScore').textContent = '';
    var api = { W: 480, H: 320, input: WL.Input, sfx: WL.Audio.sfx, toast: WL.UI.toast, audio: WL.Audio, score: function (n) { document.getElementById('microScore').textContent = String(n); }, done: function (msg) { WL.Audio.sfx('win'); WL.UI.toast(msg || 'Nice one!'); } };
    try { running = g.play(host, api) || {}; } catch (e) { host.textContent = 'This micro-game crashed: ' + e.message; running = null; }
  }
  function stop() { if (running && running.stop) { try { running.stop(); } catch (e) {} } running = null; var h = document.getElementById('microHost'); if (h) h.innerHTML = ''; WL.Music.resume('micro'); }

  // ---- feedback --------------------------------------------------------
  function sendFeedback(kind, title, body) {
    title = WL.Wishes.clean(title, 100); body = WL.Wishes.clean(body, 2000);
    if (body.length < 3) { WL.UI.toast('Tell us a bit more first.'); return Promise.resolve(false); }
    if (WL.CONFIG.apiBase) {
      return fetch(WL.CONFIG.apiBase + '/feedback', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind: kind, title: title, body: body }) })
        .then(function (r) { if (!r.ok) throw 0; WL.UI.toast('Thanks! Feedback sent 💜'); return true; }).catch(function () { return viaGitHub(kind, title, body); });
    }
    return Promise.resolve(viaGitHub(kind, title, body));
  }
  function viaGitHub(kind, title, body) {
    var q = 'title=' + encodeURIComponent('[' + kind + '] ' + (title || 'Feedback')) + '&body=' + encodeURIComponent(body + '\n\n— sent from the game v' + WL.CONFIG.version) + '&labels=' + encodeURIComponent(kind);
    window.open('https://github.com/' + WL.CONFIG.issuesRepo + '/issues/new?' + q, '_blank', 'noopener');
    WL.UI.toast('Opening GitHub to finish sending (needs a free GitHub account).'); return true;
  }
  function openFeedback(prefillTitle, kind) {
    document.getElementById('fbKind').value = kind || 'feedback'; document.getElementById('fbTitle').value = prefillTitle || ''; document.getElementById('fbBody').value = '';
    WL.UI.show('feedback');
  }

  // ---- workshop --------------------------------------------------------
  function renderWorkshop() {
    var box = document.getElementById('workshopList'); box.innerHTML = ''; var v = votes();
    var dev = WL.Dev.enabled;
    all().forEach(function (g) {
      if (g.status === 'hidden' && !dev) return;
      var c = el('div', 'wcard ' + g.status);
      c.appendChild(el('b', null, g.title)); c.appendChild(el('span', 'chip', STATUS[g.status] || g.status));
      c.appendChild(el('p', 'muted', g.blurb)); c.appendChild(el('small', 'muted', 'By ' + (g.author || 'unknown')));
      var r = el('div', 'menu row');
      if (g.play) { var p = el('button', 'primary', '▶ Play'); p.onclick = function () { play(g.id); }; r.appendChild(p); }
      var up = el('button', v[g.id] === 1 ? 'on' : '', '👍'); up.setAttribute('aria-label', 'Like'); up.onclick = function () { vote(g.id, 1); };
      var dn = el('button', v[g.id] === -1 ? 'on' : '', '👎'); dn.setAttribute('aria-label', 'Dislike'); dn.onclick = function () { vote(g.id, -1); };
      var fb = el('button', null, '💬 Feedback'); fb.onclick = function () { openFeedback('About: ' + g.title, 'feedback'); };
      r.appendChild(up); r.appendChild(dn); r.appendChild(fb); c.appendChild(r); box.appendChild(c);
    });
  }

  // ---- writers' room ---------------------------------------------------
  function sceneToText(lines) { return lines.map(function (l) { return l[0] + ': ' + l[1]; }).join('\n'); }
  function textToScene(t) { return t.split('\n').map(function (s) { var i = s.indexOf(':'); return i > 0 ? [s.slice(0, i).trim(), s.slice(i + 1).trim()] : null; }).filter(function (l) { return l && l[1]; }); }
  function renderWriters() {
    var sel = document.getElementById('wrScene'), story = WL.UI.story(), cur = sel.value;
    if (!sel.options.length) Object.keys(story).forEach(function (k) { var o = document.createElement('option'); o.textContent = k; sel.appendChild(o); });
    if (cur) sel.value = cur; document.getElementById('wrText').value = sceneToText(story[sel.value] || []);
    sel.onchange = renderWriters;
    document.getElementById('wrPreview').onclick = function () { var l = textToScene(document.getElementById('wrText').value); if (!l.length) return WL.UI.toast('Write some lines first: "Speaker: text"'); WL.UI.previewScene(l); };
    document.getElementById('wrCopy').onclick = function () { var j = JSON.stringify({ scenes: (function (o) { o[sel.value] = textToScene(document.getElementById('wrText').value); return o; })({}) }, null, 2); (navigator.clipboard ? navigator.clipboard.writeText(j) : Promise.reject()).then(function () { WL.UI.toast('Scene JSON copied (paste into content/story.json)'); }, function () { WL.UI.toast('Copy failed, select the text yourself.'); }); };
    document.getElementById('wrSend').onclick = function () { sendFeedback('narrative', 'Scene: ' + sel.value, 'Proposed lines for scene "' + sel.value + '":\n\n' + document.getElementById('wrText').value); };
  }

  // ---- dev lab (sandboxed iframe, never touches the main page) -----------
  var TEMPLATE = "// Your micro-game. `canvas` (480x320) and `ctx` are provided. Define stop() to clean up.\nvar x = 240, items = [], score = 0, raf;\naddEventListener('pointermove', function (e) { var r = canvas.getBoundingClientRect(); x = (e.clientX - r.left) * 480 / r.width; });\nfunction loop() {\n  ctx.fillStyle = '#1b0b3a'; ctx.fillRect(0, 0, 480, 320);\n  if (Math.random() < 0.04) items.push({ x: Math.random() * 460, y: -10 });\n  items.forEach(function (i) { i.y += 3; ctx.font = '22px serif'; ctx.fillText('🎂', i.x, i.y); if (i.y > 290 && Math.abs(i.x - x) < 30) { i.hit = 1; score++; } });\n  items = items.filter(function (i) { return i.y < 330 && !i.hit; });\n  ctx.fillStyle = '#ff4fd8'; ctx.fillRect(x - 25, 300, 50, 10);\n  ctx.fillStyle = '#fff'; ctx.fillText('Score ' + score, 10, 24);\n  raf = requestAnimationFrame(loop);\n}\nloop();\nfunction stop() { cancelAnimationFrame(raf); }\n";
  function localList() { try { return JSON.parse(localStorage.getItem(LOCAL)) || {}; } catch (e) { return {}; } }
  function runSandbox(code) {
    var f = document.getElementById('dlFrame');
    f.srcdoc = '<!doctype html><body style="margin:0;background:#111;color:#fff;font:14px sans-serif"><canvas id="c" width="480" height="320" style="width:100%;max-width:480px"></canvas><pre id="e" style="color:#f66"></pre><script>var canvas=document.getElementById("c"),ctx=canvas.getContext("2d");try{' + code.replace(/<\/script/gi, '<\\/script') + '}catch(e){document.getElementById("e").textContent=e.message}<\/script>';
  }
  function renderDevLab() {
    var ta = document.getElementById('dlCode'), name = document.getElementById('dlName'), sel = document.getElementById('dlSaved');
    if (!ta.value) ta.value = TEMPLATE;
    var saved = localList(); sel.innerHTML = '<option value="">Saved drafts…</option>'; Object.keys(saved).forEach(function (k) { var o = document.createElement('option'); o.textContent = k; sel.appendChild(o); });
    sel.onchange = function () { if (saved[sel.value]) { ta.value = saved[sel.value]; name.value = sel.value; } };
    document.getElementById('dlRun').onclick = function () { runSandbox(ta.value); };
    document.getElementById('dlSave').onclick = function () { var n = WL.Wishes.clean(name.value, 40) || 'draft'; var s = localList(); s[n] = ta.value; try { localStorage.setItem(LOCAL, JSON.stringify(s)); WL.UI.toast('Saved "' + n + '" on this device'); renderDevLab(); } catch (e) {} };
    document.getElementById('dlExport').onclick = function () {
      var id = (WL.Wishes.clean(name.value, 40) || 'my-game').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'my-game';
      var wrapped = "WL.Lab.register({\n  id: '" + id + "', title: '" + (name.value || 'My Game').replace(/'/g, '') + "', author: 'YOUR NAME', status: 'testing', blurb: 'One line about it.',\n  play: function (host, api) {\n    var canvas = document.createElement('canvas'); canvas.width = 480; canvas.height = 320; canvas.style.maxWidth = '100%'; host.appendChild(canvas);\n    var ctx = canvas.getContext('2d');\n" + ta.value.split('\n').map(function (l) { return '    ' + l; }).join('\n') + "\n    return { stop: typeof stop === 'function' ? stop : function () {} };\n  }\n});\n";
      var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([wrapped], { type: 'text/javascript' })); a.download = id + '.js'; a.click();
      WL.UI.toast('Exported ' + id + '.js. Add it to js/microgames/ + content/microgames.json in a PR.');
    };
  }
  return { register: register, play: play, stop: stop, renderWorkshop: renderWorkshop, renderWriters: renderWriters, renderDevLab: renderDevLab, loadManifest: loadManifest, openFeedback: openFeedback, sendFeedback: sendFeedback, all: all };
})();
