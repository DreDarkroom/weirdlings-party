// DJ booth, inspired by djay: two decks, crossfader, per-deck EQ, tempo + sync, cue, loop, waveform.
// Tracks come from Stopiffy (CC0). Bo0m's Spotify panel is an embed (see spotify.js).
WL.DJ = (function () {
  var out, decks = [], xfVal = 0, tracks = [], built = false, raf = 0;

  function Deck(side) {
    this.side = side; this.buf = null; this.track = null; this.rate = 1; this.offset = 0; this.startedAt = 0; this.playing = false;
    this.cue = 0; this.loop = null; this.src = null; this.peaks = null; this.spin = 0;
    var c = WL.Audio.ctx;
    this.low = c.createBiquadFilter(); this.low.type = 'lowshelf'; this.low.frequency.value = 200;
    this.high = c.createBiquadFilter(); this.high.type = 'highshelf'; this.high.frequency.value = 3000;
    this.vol = c.createGain(); this.xf = c.createGain();
    this.low.connect(this.high); this.high.connect(this.vol); this.vol.connect(this.xf); this.xf.connect(out);
  }
  Deck.prototype.bpm = function () { return this.track ? this.track.bpm * this.rate : 0; };
  Deck.prototype.pos = function () {
    if (!this.buf) return 0;
    if (!this.playing) return this.offset;
    var raw = this.offset + (WL.Audio.ctx.currentTime - this.startedAt) * this.rate;
    if (this.loop && raw >= this.loop.a) raw = this.loop.a + ((raw - this.loop.a) % (this.loop.b - this.loop.a));
    return raw % this.buf.duration;
  };
  Deck.prototype.play = function () {
    if (!this.buf || this.playing) return;
    var c = WL.Audio.ctx, s = c.createBufferSource();
    s.buffer = this.buf; s.loop = true; s.playbackRate.value = this.rate; s.connect(this.low);
    if (this.loop) { s.loopStart = this.loop.a; s.loopEnd = this.loop.b; }
    s.start(0, this.offset); this.src = s; this.startedAt = c.currentTime; this.playing = true;
  };
  Deck.prototype.pause = function () {
    if (!this.playing) return;
    this.offset = this.pos(); this.playing = false;
    try { this.src.stop(); } catch (e) {} this.src = null;
  };
  Deck.prototype.seek = function (t) { var was = this.playing; this.pause(); this.offset = t; if (was) this.play(); };
  Deck.prototype.setRate = function (r) {
    this.rate = r;
    if (this.playing) { this.offset = this.pos(); this.startedAt = WL.Audio.ctx.currentTime; this.src.playbackRate.value = r; }
  };
  Deck.prototype.toggleLoop = function () {
    if (!this.track) return;
    var was = this.playing, p = this.pos();
    if (this.loop) { this.loop = null; } else { var len = 4 * 60 / this.track.bpm; this.loop = { a: p, b: Math.min(this.buf.duration, p + len) }; }
    if (was) { this.pause(); this.offset = p; this.play(); }
    return !!this.loop;
  };
  Deck.prototype.load = function (track) {
    var self = this; self.pause(); self.loop = null;
    return WL.Audio.client.load(track).then(function (b) {
      self.buf = b; self.track = track; self.offset = 0; self.cue = 0; self.rate = 1;
      var d = b.getChannelData(0), n = 600, step = Math.floor(d.length / n), pk = new Float32Array(n);
      for (var i = 0; i < n; i++) { var m = 0; for (var j = 0; j < step; j += 64) m = Math.max(m, Math.abs(d[i * step + j])); pk[i] = m; }
      self.peaks = pk;
    });
  };

  function crossfade(v) {
    xfVal = v; var a = (v + 1) / 2 * Math.PI / 2;
    if (decks[0]) decks[0].xf.gain.value = Math.cos(a);
    if (decks[1]) decks[1].xf.gain.value = Math.sin(a);
  }

  function deckHTML(i) {
    var n = i ? 'B' : 'A';
    return '<div class="deck" data-d="' + i + '"><h3>DECK ' + n + '</h3>' +
      '<select class="trk" aria-label="Deck ' + n + ' track"></select>' +
      '<div class="ttl">— load a track —</div><canvas class="wave" width="600" height="70"></canvas>' +
      '<div class="platter"><div class="disc"></div><div class="bpm">0.0 BPM</div></div>' +
      '<div class="btns"><button class="pp">▶ PLAY</button><button class="cue">CUE</button><button class="sync">SYNC</button><button class="loop">LOOP 4</button></div>' +
      '<label>Tempo <input class="tempo" type="range" min="0.85" max="1.15" step="0.002" value="1"></label>' +
      '<label>Bass <input class="eq-l" type="range" min="-24" max="9" step="1" value="0"></label>' +
      '<label>Treble <input class="eq-h" type="range" min="-24" max="9" step="1" value="0"></label>' +
      '<label>Volume <input class="vol" type="range" min="0" max="1" step="0.01" value="0.9"></label></div>';
  }

  function build(root) {
    var c = WL.Audio.unlock(); if (!c) { root.textContent = 'Web Audio not supported on this device.'; return; }
    if (!out) { out = c.createGain(); out.gain.value = 0.9; out.connect(WL.Audio.master); }
    root.innerHTML =
      '<div class="djgrid">' + deckHTML(0) +
      '<div class="mixer"><h3>MIXER</h3><div class="cakewrap" title="Dizzle, DJing as a cake"><div class="cake">🎂</div><small>DJ Dizzle (cake)</small></div>' +
      '<label class="xfl">Crossfader<input id="xf" type="range" min="-1" max="1" step="0.01" value="0"></label>' +
      '<div class="xfs"><span>A</span><span>B</span></div>' +
      '<label>Master <input id="mst" type="range" min="0" max="1" step="0.01" value="0.9"></label>' +
      '<button id="cutcake" class="big">🔪 CUT THE CAKE</button><div class="muted">Cake cut in <b class="cd"></b></div></div>' +
      deckHTML(1) + '</div>' +
      '<details class="spot" open><summary>🟢 Bo0m\'s Spotify (embed — can\'t beat-match, fade it by hand)</summary>' +
      '<div class="row"><input id="spUrl" placeholder="Paste a Spotify track / playlist / album link" aria-label="Spotify link"><button id="spGo">Load</button></div>' +
      '<div id="spFrame" class="muted">Nothing loaded. Spotify only loads when you press Load.</div></details>';
    decks = [new Deck(0), new Deck(1)]; crossfade(0);
    WL.Audio.client.tracks().then(function (list) {
      tracks = list.slice().sort(function (a, b) { return (b.tags.indexOf('dj') >= 0) - (a.tags.indexOf('dj') >= 0); });
      root.querySelectorAll('.trk').forEach(function (sel, i) {
        sel.innerHTML = '<option value="">Select track…</option>' + tracks.map(function (t) { return '<option value="' + t.id + '">' + t.artist + ' — ' + t.title + ' (' + t.bpm + ')</option>'; }).join('');
        if (!i) sel.value = 'dee-forgot-the-date'; else sel.value = 'dizzle-cake-walk';
        sel.dispatchEvent(new Event('change'));
      });
    });
    root.querySelectorAll('.deck').forEach(function (el) {
      var d = decks[+el.dataset.d], q = function (s) { return el.querySelector(s); };
      q('.trk').onchange = function () {
        var t = tracks.filter(function (x) { return x.id === this.value; }, this)[0]; if (!t) return;
        q('.ttl').textContent = 'Baking ' + t.title + '…';
        d.load(t).then(function () { q('.ttl').textContent = t.artist + ' — ' + t.title; q('.tempo').value = 1; q('.pp').textContent = '▶ PLAY'; });
      };
      q('.pp').onclick = function () { if (d.playing) { d.pause(); this.textContent = '▶ PLAY'; } else { d.play(); this.textContent = '❚❚ PAUSE'; } };
      q('.cue').onclick = function () { if (d.playing) { d.pause(); d.offset = d.cue; q('.pp').textContent = '▶ PLAY'; } else { d.cue = d.pos(); } };
      q('.sync').onclick = function () { var o = decks[1 - d.side]; if (o.track && d.track) { var r = Math.min(1.15, Math.max(0.85, o.bpm() / d.track.bpm)); d.setRate(r); q('.tempo').value = r; } };
      q('.loop').onclick = function () { this.classList.toggle('on', d.toggleLoop()); };
      q('.tempo').oninput = function () { d.setRate(+this.value); };
      q('.eq-l').oninput = function () { d.low.gain.value = +this.value; };
      q('.eq-h').oninput = function () { d.high.gain.value = +this.value; };
      q('.vol').oninput = function () { d.vol.gain.value = +this.value; };
      d.vol.gain.value = 0.9;
    });
    root.querySelector('#xf').oninput = function () { crossfade(+this.value); };
    root.querySelector('#mst').oninput = function () { out.gain.value = +this.value; };
    root.querySelector('#cutcake').onclick = function () { WL.Audio.sfx('win'); if (WL.Game && WL.Game.state) WL.Game.confettiBurst(100); WL.UI.cakeCut(); };
    var inp = root.querySelector('#spUrl'); inp.value = WL.Spotify.remembered();
    function loadSp() {
      var src = WL.Spotify.embedSrc(inp.value), f = root.querySelector('#spFrame');
      if (!src) { f.textContent = 'That doesn\'t look like a Spotify link (open.spotify.com/…).'; return; }
      WL.Spotify.remember(inp.value);
      f.innerHTML = '<iframe title="Spotify player" style="border:0;width:100%;height:152px;border-radius:12px" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>';
      f.firstChild.src = src;
    }
    root.querySelector('#spGo').onclick = loadSp;
    built = true; loop();
  }

  function loop() {
    cancelAnimationFrame(raf);
    var root = document.getElementById('djRoot');
    (function f() {
      if (!root.offsetParent) return;           // screen hidden: stop drawing
      root.querySelectorAll('.deck').forEach(function (el) {
        var d = decks[+el.dataset.d]; if (!d) return;
        var c = el.querySelector('.wave'), g = c.getContext('2d'); g.clearRect(0, 0, c.width, c.height);
        if (d.peaks) {
          var dur = d.buf.duration, n = d.peaks.length, p = d.pos() / dur;
          for (var i = 0; i < n; i++) { g.fillStyle = i / n < p ? '#ff4fd8' : '#6a5a9a'; var h = d.peaks[i] * c.height; g.fillRect(i, (c.height - h) / 2, 1, h); }
          g.fillStyle = '#fff'; g.fillRect(p * n, 0, 2, c.height);
          if (d.loop) { g.fillStyle = 'rgba(56,242,193,.35)'; g.fillRect(d.loop.a / dur * n, 0, (d.loop.b - d.loop.a) / dur * n, c.height); }
          d.spin += d.playing ? 3 * d.rate : 0;
        }
        el.querySelector('.bpm').textContent = d.bpm().toFixed(1) + ' BPM';
        el.querySelector('.disc').style.transform = 'rotate(' + d.spin + 'deg)';
      });
      raf = requestAnimationFrame(f);
    })();
  }
  return {
    open: function () { var r = document.getElementById('djRoot'); if (!built) build(r); else loop(); },
    close: function () { decks.forEach(function (d) { d.pause(); }); document.querySelectorAll('#djRoot .pp').forEach(function (b) { b.textContent = '▶ PLAY'; }); },
    get built() { return built; }
  };
})();
