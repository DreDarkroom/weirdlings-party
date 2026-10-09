(function () {
  function boot() {
    WL.Game.init(); WL.UI.init(); WL.Countdown.tick();
    // first user gesture unlocks audio + starts menu music
    var once = function (e) { if (e && e.target && e.target.closest && e.target.closest('#musicBar, #musicPanel')) return; WL.Audio.unlock(); WL.Music.start(); removeEventListener('pointerdown', once); removeEventListener('keydown', once); };
    addEventListener('pointerdown', once); addEventListener('keydown', once);
    document.addEventListener('visibilitychange', function () { if (document.hidden && WL.Game.running && document.body.classList.contains('playing')) WL.UI.pause(true); });
    // Update check: if a newer build is deployed while this tab is open, tell the player (and the party launch reloads on menus).
    function sig() { return fetch('index.html', { cache: 'no-store' }).then(function (r) { return r.text(); }).then(function (t) { var h = 0; for (var i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) | 0; return h; }); }
    var base = null; sig().then(function (h) { base = h; }).catch(function () {});
    function poll() { if (base === null) return; sig().then(function (h) { if (h !== base && !WL.updateReady) { WL.updateReady = true; WL.UI.toast('✨ A new version is ready. Reload to update!'); } }).catch(function () {}); }
    setInterval(poll, 4 * 60 * 1000); document.addEventListener('visibilitychange', function () { if (!document.hidden) poll(); });
    if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) navigator.serviceWorker.register('sw.js').catch(function () {});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
