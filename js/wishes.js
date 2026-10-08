// Sign book + birthday card. Storage adapters: 'local' (this device) and 'remote' (Cloudflare Worker, see /backend).
// All user text is rendered with textContent only, never innerHTML.
WL.Wishes = (function () {
  var KEY = 'wl.wishes.v1', MAX_MSG = 280, MAX_NAME = 40;
  var HONOREES = { kerry: { name: 'Kerry', full: 'Kerry Queenslayer', color: '#ff4fd8' }, mick: { name: 'Mick', full: 'Mick Beach', color: '#ffb347' } };
  var EMOJI = ['🎂', '🎉', '🥳', '🎈', '🎧', '💜', '🔥', '✨'];
  var lastPost = 0;

  function clean(s, n) { return String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n); }
  function readLocal() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } }
  function writeLocal(a) { try { localStorage.setItem(KEY, JSON.stringify(a.slice(-200))); } catch (e) {} }
  function mode() { return WL.CONFIG.apiBase ? 'remote' : 'local'; }

  function list(to) {
    var local = readLocal().filter(function (w) { return w.to === to; });
    if (mode() !== 'remote') return Promise.resolve(local);
    return fetch(WL.CONFIG.apiBase + '/wishes?to=' + encodeURIComponent(to), { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (j) { return (j.wishes || []).concat(local.filter(function (w) { return w.pending; })); })
      .catch(function () { return local; });
  }
  function add(to, name, msg, emoji) {
    if (!HONOREES[to]) return Promise.reject(new Error('Unknown card'));
    name = clean(name, MAX_NAME) || 'A friend'; msg = clean(msg, MAX_MSG); emoji = EMOJI.indexOf(emoji) >= 0 ? emoji : '🎉';
    if (msg.length < 2) return Promise.reject(new Error('Write a little more!'));
    if (Date.now() - lastPost < 15000) return Promise.reject(new Error('Easy there, wait a few seconds between wishes.'));
    lastPost = Date.now();
    var w = { id: 'l' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), to: to, name: name, msg: msg, emoji: emoji, ts: Date.now() };
    var saveLocal = function (pending) { var a = readLocal(); w.pending = !!pending; a.push(w); writeLocal(a); return w; };
    if (mode() !== 'remote') return Promise.resolve(saveLocal(false));
    return fetch(WL.CONFIG.apiBase + '/wishes', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ to: to, name: name, msg: msg, emoji: emoji }) })
      .then(function (r) { if (!r.ok) throw new Error('Server said ' + r.status); return w; })
      .catch(function () { return saveLocal(true); });   // keep it on this device if the server is unreachable
  }

  // ---- UI -------------------------------------------------------------
  var cardFor = 'kerry', pickedEmoji = '🎉';
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }

  function renderCard() {
    var h = HONOREES[cardFor], notes = document.getElementById('cardNotes'), cover = document.getElementById('cardCover');
    cover.style.setProperty('--c', h.color);
    document.getElementById('cardTitle').textContent = 'Happy Birthday ' + h.name + '!';
    var art = document.querySelector('#cardCover .coverart'), img = WL.Cake && cardFor === 'kerry' ? WL.Cake.getSaved() : '';
    art.textContent = ''; if (img) { var im = document.createElement('img'); im.src = img; im.alt = 'The hand-drawn birthday cake'; art.appendChild(im); } else art.textContent = '🎂';
    document.querySelectorAll('#cardTabs button').forEach(function (b) { b.classList.toggle('sel', b.dataset.to === cardFor); });
    document.getElementById('cardMode').textContent = mode() === 'local' ? 'Wishes are saved on this device for now. The shared card switches on when the server is connected.' : 'Wishes from everyone appear here.';
    notes.innerHTML = '';
    list(cardFor).then(function (ws) {
      if (!ws.length) { notes.appendChild(el('p', 'muted', 'No wishes yet. Be the first to sign the book!')); return; }
      ws.sort(function (a, b) { return b.ts - a.ts; }).forEach(function (w, i) {
        var n = el('div', 'note'); n.style.setProperty('--r', ((i * 37) % 7 - 3) + 'deg');
        n.appendChild(el('div', 'ne', w.emoji || '🎉')); n.appendChild(el('p', 'nm', w.msg)); n.appendChild(el('b', 'nn', '— ' + w.name + (w.pending ? ' (sending…)' : '')));
        notes.appendChild(n);
      });
    });
  }
  function openCard(who) { cardFor = who || cardFor; document.getElementById('cardInner').classList.remove('open'); WL.UI.show('card'); }
  function openSign(who) { if (who) cardFor = who; WL.UI.show('signbook'); }
  function prepSign() {
    document.getElementById('signTo').value = cardFor;
    var box = document.getElementById('emojiPick'); box.innerHTML = '';
    EMOJI.forEach(function (e) { var b = el('button', e === pickedEmoji ? 'sel' : '', e); b.type = 'button'; b.onclick = function () { pickedEmoji = e; box.querySelectorAll('button').forEach(function (x) { x.classList.toggle('sel', x === b); }); }; box.appendChild(b); });
  }
  function bind() {
    var msg = document.getElementById('signMsg'), count = document.getElementById('signCount');
    msg.addEventListener('input', function () { count.textContent = msg.value.length + '/' + MAX_MSG; });
    document.getElementById('signForm').addEventListener('submit', function (e) {
      e.preventDefault();
      add(document.getElementById('signTo').value, document.getElementById('signName').value, msg.value, pickedEmoji).then(function () {
        msg.value = ''; count.textContent = '0/' + MAX_MSG; WL.Audio.sfx('win'); WL.UI.toast('💌 Signed! See it on the card.'); openCard(document.getElementById('signTo').value);
      }).catch(function (err) { WL.UI.toast(err.message || 'Could not sign the book'); });
    });
    document.querySelectorAll('#cardTabs button').forEach(function (b) { b.onclick = function () { cardFor = b.dataset.to; renderCard(); }; });
    document.getElementById('cardCover').onclick = function () { document.getElementById('cardInner').classList.toggle('open'); WL.Audio.sfx('pickup'); };
    document.getElementById('btnSignFromCard').onclick = function () { openSign(cardFor); };
  }
  return { HONOREES: HONOREES, list: list, add: add, mode: mode, openCard: openCard, openSign: openSign, renderCard: renderCard, prepSign: prepSign, bind: bind, clean: clean };
})();
