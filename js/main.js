(function () {
  function boot() {
    WL.Game.init(); WL.UI.init(); WL.Countdown.tick();
    // first user gesture unlocks audio + starts menu music
    var once = function (e) { if (e && e.target && e.target.closest && e.target.closest('#musicBar, #musicPanel')) return; WL.Audio.unlock(); WL.Music.start(); removeEventListener('pointerdown', once); removeEventListener('keydown', once); };
    addEventListener('pointerdown', once); addEventListener('keydown', once);
    document.addEventListener('visibilitychange', function () { if (document.hidden && WL.Game.running && document.body.classList.contains('playing')) WL.UI.pause(true); });
    if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) navigator.serviceWorker.register('sw.js').catch(function () {});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
