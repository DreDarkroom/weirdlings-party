// Unified input: keyboard + gamepad + touch -> held / pressed flags.
WL.Input = (function () {
  var ACTIONS = ['left', 'right', 'up', 'down', 'jump', 'fire', 'pause', 'accept', 'back'];
  var held = {}, prev = {}, pressed = {}, src = { key: {}, pad: {}, touch: {} };
  ACTIONS.forEach(function (a) { held[a] = prev[a] = pressed[a] = false; });
  var KEYS = {
    ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
    Space: 'jump', KeyZ: 'jump', KeyK: 'jump', KeyX: 'fire', KeyJ: 'fire', ControlLeft: 'fire', Escape: 'pause', KeyP: 'pause', Backspace: 'back'
  };
  function typing(e) { var t = e.target; return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT'); }
  addEventListener('keydown', function (e) {
    var a = KEYS[e.code]; if (!a || typing(e)) return;
    if (e.code === 'Space' || e.code.indexOf('Arrow') === 0) e.preventDefault();
    src.key[a] = true;
  });
  addEventListener('keyup', function (e) { var a = KEYS[e.code]; if (a) src.key[a] = false; });
  addEventListener('blur', function () { src.key = {}; src.touch = {}; });

  // touch buttons: <button data-act="left">
  function bindTouch() {
    document.querySelectorAll('#touch [data-act]').forEach(function (b) {
      var act = b.dataset.act, ids = {};
      function down(e) { e.preventDefault(); ids[e.pointerId] = 1; src.touch[act] = true; b.classList.add('on'); try { b.setPointerCapture(e.pointerId); } catch (x) {} }
      function up(e) { delete ids[e.pointerId]; if (!Object.keys(ids).length) { src.touch[act] = false; b.classList.remove('on'); } }
      b.addEventListener('pointerdown', down); b.addEventListener('pointerup', up);
      b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
      b.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    });
  }
  function pollPad() {
    var pads = navigator.getGamepads ? navigator.getGamepads() : [], p = {};
    for (var i = 0; i < pads.length; i++) {
      var g = pads[i]; if (!g || !g.connected) continue;
      var ax = g.axes[0] || 0, ay = g.axes[1] || 0, b = g.buttons;
      var B = function (n) { return b[n] && b[n].pressed; };
      if (ax < -0.35 || B(14)) p.left = true;
      if (ax > 0.35 || B(15)) p.right = true;
      if (ay < -0.5 || B(12)) p.up = true;
      if (ay > 0.5 || B(13)) p.down = true;
      if (B(0) || B(1)) { p.jump = true; p.accept = true; }
      if (B(2) || B(3) || B(7) || B(5)) p.fire = true;
      if (B(9)) p.pause = true;
      if (B(1) && false) p.back = true;
      WL.Input.padName = g.id;
    }
    src.pad = p;
  }
  function update() {
    pollPad();
    ACTIONS.forEach(function (a) {
      prev[a] = held[a];
      held[a] = !!(src.key[a] || src.pad[a] || src.touch[a]);
      pressed[a] = held[a] && !prev[a];
    });
  }
  var isTouch = ('ontouchstart' in window) || (matchMedia && matchMedia('(pointer:coarse)').matches);
  addEventListener('gamepadconnected', function (e) { if (WL.UI) WL.UI.toast('🎮 Controller connected: ' + e.gamepad.id.slice(0, 40)); });
  return { held: held, pressed: pressed, update: update, bindTouch: bindTouch, isTouch: isTouch, padName: '' };
})();
