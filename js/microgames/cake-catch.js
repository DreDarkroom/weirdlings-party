WL.Lab.register({
  id: 'cake-catch', title: 'Cake Catch', author: 'Core team', status: 'live',
  blurb: 'Catch Dizzle\'s falling cake slices on the plate. Dodge the slop. 30 seconds.',
  play: function (host, api) {
    var c = document.createElement('canvas'); c.width = 480; c.height = 320; c.style.cssText = 'max-width:100%;touch-action:none;border-radius:12px;background:#1b0b3a'; host.appendChild(c);
    var g = c.getContext('2d'), x = 240, items = [], score = 0, lives = 3, t = 30, last = performance.now(), raf, over = false;
    function pm(e) { var r = c.getBoundingClientRect(); x = (e.clientX - r.left) * 480 / r.width; }
    c.addEventListener('pointermove', pm); c.addEventListener('pointerdown', pm);
    function loop(now) {
      var dt = Math.min(0.05, (now - last) / 1000); last = now;
      var I = api.input.held; if (I.left) x -= 320 * dt; if (I.right) x += 320 * dt; x = Math.max(25, Math.min(455, x));
      if (!over) { t -= dt; if (Math.random() < dt * (1.4 + (30 - t) / 15)) items.push({ x: 20 + Math.random() * 440, y: -12, bad: Math.random() < 0.28, v: 110 + Math.random() * 90 }); }
      g.fillStyle = '#1b0b3a'; g.fillRect(0, 0, 480, 320); g.font = '24px serif'; g.textAlign = 'center';
      items.forEach(function (i) {
        i.y += i.v * dt; g.fillText(i.bad ? '🤖' : '🍰', i.x, i.y);
        if (i.y > 285 && i.y < 310 && Math.abs(i.x - x) < 34 && !i.gone) { i.gone = 1; if (i.bad) { lives--; api.sfx('hurt'); } else { score++; api.sfx('pickup'); } api.score(score + ' · ♥' + lives); }
        if (i.y > 330) i.gone = 1;
      });
      items = items.filter(function (i) { return !i.gone; });
      g.fillStyle = '#ff4fd8'; g.fillRect(x - 32, 300, 64, 10); g.fillStyle = '#fff'; g.font = 'bold 16px system-ui'; g.textAlign = 'left'; g.fillText('Time ' + Math.max(0, Math.ceil(t)) + '  ♥' + lives, 10, 22);
      if (!over && (t <= 0 || lives <= 0)) { over = true; api.done('Cake Catch: ' + score + ' slices!'); }
      if (over) { g.fillStyle = '#000a'; g.fillRect(0, 110, 480, 90); g.fillStyle = '#ffd23f'; g.textAlign = 'center'; g.font = 'bold 28px system-ui'; g.fillText('Score ' + score, 240, 165); }
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop); api.score('0 · ♥3');
    return { stop: function () { cancelAnimationFrame(raf); } };
  }
});
