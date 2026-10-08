WL.Lab.register({
  id: 'beat-tap', title: 'Beat Tap', author: 'Core team', status: 'testing',
  blurb: 'Tap (Space / click / any button) as the ring hits the target. Uses a real Stopiffy track. Latency varies by device: tell us how it feels!',
  play: function (host, api) {
    var c = document.createElement('canvas'); c.width = 480; c.height = 320; c.style.cssText = 'max-width:100%;border-radius:12px;background:#12091f;touch-action:none'; host.appendChild(c);
    var g = c.getContext('2d'), ctx = WL.Audio.unlock(), src = null, raf, t0 = 0, spb = 0, score = 0, hits = 0, total = 0, judged = {}, msg = '', msgT = 0, alive = true;
    g.fillStyle = '#fff'; g.font = '18px system-ui'; g.fillText('Baking track…', 20, 40);
    WL.Audio.client.find('kerry-birthday-anthem').then(function (tr) {
      spb = 60 / tr.bpm;
      return WL.Audio.client.load(tr);
    }).then(function (buf) {
      if (!alive) return;
      src = ctx.createBufferSource(); src.buffer = buf; src.loop = true; src.connect(WL.Audio.musicGain);
      t0 = ctx.currentTime + 0.4; src.start(t0); raf = requestAnimationFrame(draw);
    });
    function lat() { return (ctx.outputLatency || ctx.baseLatency || 0); }
    function tap() {
      if (!t0) return;
      var now = ctx.currentTime - lat(), k = Math.round((now - t0) / spb); if (k < 0 || judged[k]) return;
      var err = Math.abs(now - (t0 + k * spb)); judged[k] = 1; total++;
      if (err < 0.07) { score += 100; hits++; msg = 'PERFECT'; } else if (err < 0.14) { score += 50; hits++; msg = 'Good'; } else msg = 'Miss'; msgT = performance.now();
      api.score(score); api.sfx(msg === 'Miss' ? 'hit' : 'click');
    }
    function key(e) { if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); tap(); } }
    addEventListener('keydown', key); c.addEventListener('pointerdown', tap);
    function draw() {
      var now = ctx.currentTime - lat() - t0, ph = ((now / spb) % 1 + 1) % 1, beat = Math.floor(now / spb);
      g.fillStyle = '#12091f'; g.fillRect(0, 0, 480, 320);
      g.strokeStyle = '#38f2c1'; g.lineWidth = 4; g.beginPath(); g.arc(240, 160, 50, 0, 6.283); g.stroke();
      var r = 50 + (1 - ph) * 110; g.strokeStyle = '#ff4fd8'; g.lineWidth = 6; g.beginPath(); g.arc(240, 160, now < 0 ? 160 : r, 0, 6.283); g.stroke();
      g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = 'bold 18px system-ui'; g.fillText(beat >= 0 ? 'Beat ' + beat + ' · ' + hits + '/' + total + ' hit' : 'Get ready…', 240, 30);
      if (performance.now() - msgT < 500) { g.font = 'bold 30px system-ui'; g.fillStyle = msg === 'Miss' ? '#ff4d6d' : '#ffd23f'; g.fillText(msg, 240, 165); }
      if (beat >= 32 && !draw.done) { draw.done = 1; api.done('Beat Tap: ' + score + ' pts, ' + hits + '/' + total + ' hits'); }
      raf = requestAnimationFrame(draw);
    }
    return { stop: function () { alive = false; cancelAnimationFrame(raf); removeEventListener('keydown', key); if (src) { try { src.stop(); } catch (e) {} } } };
  }
});
