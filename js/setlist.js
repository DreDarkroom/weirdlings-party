// The night's set list. Each slot is one of the five playable characters.
WL.Setlist = (function () {
  var D = function (iso) { return Date.parse(iso); };
  var slots = [
    { dj: 'Bo0m',            who: 'Lucky Salvage', charId: 'boom',   title: 'Spotify playlist + setup', start: '2026-10-09T19:00:00+01:00', end: '2026-10-09T19:40:00+01:00', track: null,                  note: 'Tunes from Spotify while everyone arrives.' },
    { dj: 'Myster Y. Deep',  who: 'Myster Y. Deep', charId: 'myster', title: 'First live set',         start: '2026-10-09T19:40:00+01:00', end: '2026-10-09T21:00:00+01:00', track: 'myster-deep-end',      note: 'Deep, warm, slightly nautical.' },
    { dj: 'Hypnotized',      who: 'Ilian',         charId: 'hypno',  title: 'Second live set',        start: '2026-10-09T21:00:00+01:00', end: '2026-10-09T22:20:00+01:00', track: 'hypnotized-spiral',    note: 'You are getting sleepy. Dance anyway.' },
    { dj: 'DeeDarkgloom',    who: 'Dee',           charId: 'dee',    title: 'Third live set',         start: '2026-10-09T22:20:00+01:00', end: '2026-10-09T23:40:00+01:00', track: 'dee-forgot-the-date',  note: 'Dee remembered. Probably. Check his pager.' },
    { dj: 'Helix',           who: 'Helix',         charId: 'helix',  title: 'Closing set',            start: '2026-10-09T23:40:00+01:00', end: '2026-10-10T01:00:00+01:00', track: 'helix-double-strand',  note: 'Double strand, double trouble, till 1am.' }
  ].map(function (s) { s.startMs = D(s.start); s.endMs = D(s.end); return s; });

  function nowMs() { return WL.Countdown.now(); }
  function current() { var n = nowMs(); return slots.filter(function (s) { return n >= s.startMs && n < s.endMs; })[0] || null; }
  function next() { var n = nowMs(); return slots.filter(function (s) { return s.startMs > n; })[0] || null; }
  function status(s) { var n = nowMs(); return n >= s.endMs ? 'done' : n >= s.startMs ? 'live' : (next() === s ? 'next' : 'later'); }

  function hm(ms, tz) { return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: tz }).format(new Date(ms)); }
  function range(s) {
    var uk = hm(s.startMs, WL.CONFIG.tz) + '–' + hm(s.endMs, WL.CONFIG.tz) + ' UK';
    var local = hm(s.startMs) + '–' + hm(s.endMs);
    return uk + (hm(s.startMs) !== hm(s.startMs, WL.CONFIG.tz) ? ' (your time ' + local + ')' : '');
  }

  function render() {
    var box = document.getElementById('setlistList'); if (!box) return;
    box.innerHTML = '';
    var chips = { done: 'Done', live: '🔴 LIVE', next: 'Up next', later: 'Later' };
    slots.forEach(function (s) {
      var ch = WL.Game.CHARS[s.charId], st = status(s), el = document.createElement('div');
      el.className = 'slot ' + st; el.style.setProperty('--c', ch.color);
      el.innerHTML = '<span class="av"></span><div class="si"><b></b><small class="time"></small><small class="note"></small></div><span class="chip"></span><button class="mini">Play as</button>';
      el.querySelector('.av').style.background = ch.color; el.querySelector('.av').textContent = s.dj.charAt(0);
      el.querySelector('b').textContent = s.dj + ' · ' + s.title;
      el.querySelector('.time').textContent = range(s);
      el.querySelector('.note').textContent = s.note;
      el.querySelector('.chip').textContent = chips[st];
      el.querySelector('button').onclick = function () { WL.UI.pickCharacter(s.charId); };
      box.appendChild(el);
    });
  }
  return { slots: slots, current: current, next: next, status: status, render: render, range: range };
})();
