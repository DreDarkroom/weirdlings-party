WL.Lab.register({
  id: 'dee-memory', title: 'Dee\'s Memory', author: 'Core team', status: 'live',
  blurb: 'Match the Weirdlings. Dee has the memory of a goldfish, so try to do better.',
  play: function (host, api) {
    var cast = [['D', '#8b5cf6'], ['B', '#f59e0b'], ['H', '#22d3ee'], ['M', '#10b981'], ['X', '#f43f5e'], ['K', '#ff4fd8']];
    var deck = cast.concat(cast).map(function (c, i) { return { c: c, id: i, open: false, done: false }; });
    for (var i = deck.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = deck[i]; deck[i] = deck[j]; deck[j] = t; }
    var grid = document.createElement('div'); grid.style.cssText = 'display:grid;grid-template-columns:repeat(4,72px);gap:8px;justify-content:center;margin:10px auto';
    host.appendChild(grid);
    var first = null, lock = false, moves = 0, pairs = 0;
    deck.forEach(function (card) {
      var b = document.createElement('button'); b.style.cssText = 'height:72px;font-size:28px;font-weight:800'; b.textContent = '?'; b.setAttribute('aria-label', 'Hidden card');
      b.onclick = function () {
        if (lock || card.open || card.done) return;
        card.open = true; b.textContent = card.c[0]; b.style.background = card.c[1]; b.style.color = '#111'; api.sfx('click');
        if (!first) { first = { card: card, b: b }; return; }
        moves++; api.score(moves + ' moves');
        if (first.card.c === card.c) { first.card.done = card.done = true; pairs++; api.sfx('pickup'); first = null; if (pairs === cast.length) api.done('Matched in ' + moves + ' moves. Better than Dee!'); }
        else { lock = true; var a = first; first = null; setTimeout(function () { [a, { card: card, b: b }].forEach(function (x) { x.card.open = false; x.b.textContent = '?'; x.b.style.background = ''; x.b.style.color = ''; }); lock = false; }, 700); }
      };
      grid.appendChild(b);
    });
    api.score('0 moves');
    return { stop: function () {} };
  }
});
