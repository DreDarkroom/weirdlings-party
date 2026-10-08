// Music controller + always-visible music bar.
//   Source "game"     : the soundtrack. Style "auto" follows what you're doing (level / menu / finale);
//                       a chosen style plays a playlist of that style instead.
//   Source "stopiffy" : the whole Stopiffy catalogue (CC0), browse/search and play any track as an alternative.
// The DJ booth (and micro-games) suspend the music: the DJ booth does it with a vinyl-stop effect, then it resumes on exit.
WL.Music = (function () {
  var KEY = 'wl.music';
  var STYLES = [['auto', '✨ Auto'], ['synthwave', '🌆 Synthwave'], ['house', '🏠 House'], ['techno', '⚡ Techno'], ['breaks', '🥁 Breaks'], ['chill', '🌊 Chill']];
  var st = { source: 'game', style: 'auto', track: null, shuffle: true, on: true, prevVol: 0.6 };
  var tracks = [], curId = null, ctxId = 'simulation-lullaby', susp = {}, plays = 0, started = false, search = '';
  try { var s = JSON.parse(localStorage.getItem(KEY)); if (s) Object.keys(st).forEach(function (k) { if (s[k] !== undefined) st[k] = s[k]; }); } catch (e) {}
  var $ = function (id) { return document.getElementById(id); };
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  function suspended() { for (var k in susp) return true; return false; }
  function byId(id) { return tracks.filter(function (t) { return t.id === id; })[0]; }
  function pool(style, gameOnly) { return tracks.filter(function (t) { return (style === 'auto' || t.style === style) && (!gameOnly || t.tags.indexOf('game') >= 0); }); }
  function playlist() {
    if (st.source === 'stopiffy') { var q = search.toLowerCase(); return pool(st.style, false).filter(function (t) { return !q || (t.title + ' ' + t.artist).toLowerCase().indexOf(q) >= 0; }); }
    if (st.style === 'auto') return pool('auto', true);
    var g = pool(st.style, true); return g.length ? g : pool(st.style, false);
  }
  function isAuto() { return st.source === 'game' && st.style === 'auto'; }

  function play(id, keepPlays) {
    if (!WL.Audio.ctx || !id) return;
    curId = id; if (!keepPlays) plays = 0;
    if (st.source === 'stopiffy') { st.track = id; save(); }
    WL.Audio.playBgm(id, {
      force: true, loop: isAuto(),
      onEnd: function () { if (++plays < 2) play(id, true); else advance(1); }   // each track plays twice, then the playlist moves on
    });
    render();
  }
  function advance(dir) {
    var list = playlist(); if (!list.length) return;
    var i = -1; list.forEach(function (t, k) { if (t.id === curId) i = k; });
    var n = (st.shuffle && list.length > 1 && dir > 0) ? (function () { var k; do { k = Math.floor(Math.random() * list.length); } while (k === i); return k; })() : (i + dir + list.length) % list.length;
    play(list[n].id);
  }
  function pick() {
    if (isAuto()) return ctxId;
    var list = playlist(), want = st.source === 'stopiffy' ? (st.track || curId) : curId;
    if (want && list.some(function (t) { return t.id === want; })) return want;
    return list.length ? list[st.shuffle ? Math.floor(Math.random() * list.length) : 0].id : null;
  }
  function apply() { if (!started || !st.on || suspended()) return render(); var id = pick(); if (id) play(id); else render(); }

  // ---- public controls ----------------------------------------------------
  function context(id) {           // "this is the music that belongs here" (menu, level, finale)
    ctxId = id; if (!started) return;
    if (isAuto() && st.on && !suspended()) play(id); else render();
  }
  function toggle() { st.on = !st.on; save(); if (!st.on) { WL.Audio.fadeOutBgm(0.4); } else apply(); render(); }
  function setSource(src) { st.source = src; save(); curId = null; if (st.on && !suspended()) { WL.Audio.fadeOutBgm(0.25); setTimeout(apply, 260); } renderPanel(); render(); }
  function setStyle(x) { st.style = x; save(); curId = null; if (st.on && !suspended()) { WL.Audio.fadeOutBgm(0.25); setTimeout(apply, 260); } renderPanel(); render(); }
  function playTrack(id) { st.on = true; save(); play(id); renderList(); }
  function suspend(reason, vinyl) {
    if (!suspended() && started && WL.Audio.bgmId) { if (vinyl) WL.Audio.vinylStop(); else WL.Audio.fadeOutBgm(0.35); }
    susp[reason] = 1; render();
  }
  function resume(reason) { if (!susp[reason]) return; delete susp[reason]; if (!suspended() && st.on) apply(); render(); }
  function start() { if (started) return; started = true; ensureTracks().then(apply); }
  function ensureTracks() { return WL.Audio.client.tracks().then(function (t) { tracks = t; return t; }); }
  function setVol(v) { WL.Audio.set('music', v); var a = $('mbVol'), b = $('setMusic'); if (a) a.value = v; if (b) b.value = v; render(); }
  function toggleMute() { var v = WL.Audio.settings.music; if (v > 0) { st.prevVol = v; save(); setVol(0); } else setVol(st.prevVol || 0.6); }

  // ---- UI -----------------------------------------------------------------
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function render() {
    var t = byId(curId), now = $('mbNow'); if (!now) return;
    var playing = started && st.on && !suspended() && !!WL.Audio.bgmId; $('mbToggle').textContent = playing ? '⏸' : '▶';
    $('mbToggle').setAttribute('aria-label', playing ? 'Pause music' : 'Play music');
    $('mbSrc').textContent = st.source === 'stopiffy' ? 'STOPIFFY' : 'GAME'; $('mbSrc').className = 'chip ' + st.source;
    $('mbMute').textContent = WL.Audio.settings.music > 0 ? '🔊' : '🔇';
    now.textContent = suspended() ? "🎛 Music paused while you're in the booth" : !st.on ? '♪ Music off' : !started ? '♪ Tap ▶ to start the music' : t ? '♪ ' + t.title + ' · ' + t.artist : '♪ …';
    now.title = t ? t.title + ' — ' + t.artist + ' (' + t.style + ', ' + t.bpm + ' BPM)' : '';
    $('mbMore').setAttribute('aria-expanded', String(!$('musicPanel').hidden));
  }
  function renderList() {
    var box = $('mpList'); if (!box) return; box.innerHTML = '';
    var list = playlist();
    if (!list.length) { box.appendChild(el('p', 'muted', st.source === 'stopiffy' ? 'No tracks match.' : 'Loading tracks…')); return; }
    list.forEach(function (t) {
      var b = el('button', 'mpTrack' + (t.id === curId ? ' now' : '')); b.type = 'button';
      b.appendChild(el('b', null, (t.id === curId ? '▶ ' : '') + t.title)); b.appendChild(el('small', null, t.artist + ' · ' + t.style + ' · ' + t.bpm + ' BPM'));
      b.onclick = function () { WL.Audio.unlock(); playTrack(t.id); b.blur(); }; box.appendChild(b);
    });
  }
  function renderPanel() {
    var p = $('mpBody'); if (!p) return; p.innerHTML = '';
    var seg = el('div', 'seg'); seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'Music source');
    [['game', '🎮 In-game music'], ['stopiffy', '🎵 Stopiffy']].forEach(function (s) { var b = el('button', st.source === s[0] ? 'on' : '', s[1]); b.type = 'button'; b.onclick = function () { setSource(s[0]); b.blur(); }; seg.appendChild(b); });
    p.appendChild(seg);
    p.appendChild(el('p', 'muted', st.source === 'stopiffy' ? 'Stopiffy: free CC0 music that anyone can use. Pick any track to play it instead of the in-game soundtrack.' : (st.style === 'auto' ? 'Auto: the soundtrack follows what you\'re doing: menus, levels, bosses and finales.' : 'Playing a ' + st.style + ' playlist from the soundtrack.')));
    var chips = el('div', 'chips'); chips.setAttribute('role', 'group'); chips.setAttribute('aria-label', 'Music style');
    STYLES.forEach(function (s) { var b = el('button', st.style === s[0] ? 'on' : '', s[1]); b.type = 'button'; b.onclick = function () { setStyle(s[0]); b.blur(); }; chips.appendChild(b); });
    p.appendChild(chips);
    var row = el('div', 'mpRow');
    if (st.source === 'stopiffy') {
      var q = el('input'); q.type = 'search'; q.placeholder = 'Search Stopiffy…'; q.value = search; q.setAttribute('aria-label', 'Search Stopiffy'); q.oninput = function () { search = q.value; renderList(); }; row.appendChild(q);
    }
    var sh = el('label', 'chk'); var cb = el('input'); cb.type = 'checkbox'; cb.checked = st.shuffle; cb.onchange = function () { st.shuffle = cb.checked; save(); cb.blur(); }; sh.appendChild(cb); sh.appendChild(document.createTextNode(' Shuffle')); row.appendChild(sh);
    var nx = el('button', null, '⏭ Next'); nx.type = 'button'; nx.onclick = function () { WL.Audio.unlock(); st.on = true; save(); advance(1); nx.blur(); }; row.appendChild(nx);
    p.appendChild(row);
    p.appendChild(el('div', null)).id = 'mpList'; renderList();
    if (st.source === 'stopiffy' && WL.CONFIG.stopiffyBase) { var a = el('a', 'muted', 'Open the Stopiffy website ↗'); a.href = WL.CONFIG.stopiffyBase + '/'; a.target = '_blank'; a.rel = 'noopener'; p.appendChild(a); }
  }
  function togglePanel(force) {
    var pn = $('musicPanel'), open = force != null ? force : pn.hidden; pn.hidden = !open;
    if (open) { renderPanel(); } render();
  }
  function init() {
    $('mbToggle').onclick = function () { WL.Audio.unlock(); if (!started) { st.on = true; save(); start(); } else toggle(); this.blur(); };
    $('mbNext').onclick = function () { WL.Audio.unlock(); if (!started) start(); st.on = true; save(); if (isAuto()) { var list = pool('auto', true), i = -1; list.forEach(function (t, k) { if (t.id === curId) i = k; }); var n = list[(i + 1) % list.length]; if (n) play(n.id); } else advance(1); this.blur(); };
    $('mbPrev').onclick = function () { WL.Audio.unlock(); if (!started) start(); st.on = true; save(); if (isAuto()) { var list = pool('auto', true), i = -1; list.forEach(function (t, k) { if (t.id === curId) i = k; }); var n = list[(i - 1 + list.length) % list.length]; if (n) play(n.id); } else advance(-1); this.blur(); };
    $('mbMore').onclick = function () { togglePanel(); this.blur(); };
    $('mpClose').onclick = function () { togglePanel(false); };
    $('mbMute').onclick = function () { toggleMute(); this.blur(); };
    var v = $('mbVol'); v.value = WL.Audio.settings.music; v.oninput = function () { WL.Audio.set('music', +v.value); var b = $('setMusic'); if (b) b.value = v.value; render(); }; v.onchange = function () { v.blur(); };
    var sm = $('setMusic'); if (sm) sm.addEventListener('input', function () { v.value = sm.value; render(); });
    addEventListener('keydown', function (e) { if (e.code === 'KeyM' && !/INPUT|TEXTAREA|SELECT/.test((e.target || {}).tagName || '')) { WL.Audio.unlock(); if (!started) start(); toggle(); } });
    ensureTracks().then(function () { render(); if (started) apply(); });
    render();
  }
  return { init: init, start: start, context: context, suspend: suspend, resume: resume, toggle: toggle, next: function () { advance(1); }, state: st, get current() { return curId; } };
})();
