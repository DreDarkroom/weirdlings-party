// Screens, story dialogue, settings, progression. Plain DOM, no framework.
WL.UI = (function () {
  var stack = ['title'], cur = 'title', charId = 'dee', unlocked = 0, dlg = null, bubbleT = 0, lastLevel = 0;
  var $ = function (id) { return document.getElementById(id); };
  try { var sv = JSON.parse(localStorage.getItem('wl.save')); if (sv) { charId = sv.charId || charId; unlocked = sv.unlocked || 0; } } catch (e) {}
  function save() { try { localStorage.setItem('wl.save', JSON.stringify({ charId: charId, unlocked: unlocked })); } catch (e) {} }

  var NAMECOL = { Narrator: '#9a90b8', DeeDarkgloom: '#8b5cf6', Dee: '#8b5cf6', 'Bo0m': '#f59e0b', Hypnotized: '#22d3ee', 'Myster Y. Deep': '#10b981', Helix: '#f43f5e', Kerry: '#ff4fd8', Dizzle: '#f9a8d4', Simulation: '#ef4444' };
  var STORY = {
    intro: [
      ['Narrator', 'The Simulation cracked open. AI had been running everything, and one morning everybody found out they were living inside it. Only the Weirdlings Anti-AI Tribe stayed gloriously, stubbornly weird.'],
      ['Dee', 'Why is my pager screaming? "KERRY. BIRTHDAY. FRIDAY. DJ SET." Oh no. Oh NO. The cake gets cut in {t}!'],
      ['Narrator', 'Kerry Queenslayer, the tribe\'s artist (and the reason half of us have colour in our lives), asked Dee to DJ nine months ago. Dee, naturally, forgot. Get to the party. Collect vinyl. Shoot Clankers.']
    ],
    after0: [
      ['Bo0m', 'Heads up: I might not make the decks on the night. If I\'m stuck, I\'ll be playing tunes from Spotify. There\'s a panel for it in the DJ booth.'],
      ['Dee', 'Wait, who is DJing? Me. I\'m DJing. I think. Cake in {t}, right?']
    ],
    before1: [
      ['Simulation', 'GLITCH DETECTED. ROUTE TO PARTY: BLOCKED. REASON: NOT ENOUGH SLOP.'],
      ['Helix', 'Double strand, double trouble. Keep moving!']
    ],
    after1: [
      ['Hypnotized', 'You are getting sleepy… of the AI. Ahead is the Overfit Gate. It has memorised everything and understood nothing.'],
      ['Myster Y. Deep', 'Deep breaths. Deep bass. Then boom.']
    ],
    finale: [
      ['Kerry', 'You made it!! Thank you, everyone. 生日快乐, as they say at home. Wait, why is the DJ booth… a cake?'],
      ['Dizzle', 'Simulation glitch. I turned into a cake. I\'m still DJing though. Please be gentle with the knife.'],
      ['Dee', 'I remembered! I actually remembered! Cake in {t}! …Kerry, I\'ve been reminded of this all week by everything.'],
      ['Kerry', 'Right. Cut the cake. HAPPY BIRTHDAY TO ME! Hit it, DJs.']
    ]
  };

  function show(id, push) {
    document.querySelectorAll('.screen').forEach(function (s) { s.hidden = s.id !== id; });
    if (push !== false && cur !== id) stack.push(id);
    cur = id; document.body.dataset.screen = id;
    var sc = $(id); if (sc && sc.scrollTo) sc.scrollTo(0, 0);
    focusFirst();
    if (id === 'dj') { WL.Audio.unlock(); WL.DJ.open(); } else if (WL.DJ.built) WL.DJ.close();
  }
  function back() {
    if (cur === 'pause' || cur === 'title') return;
    stack.pop(); show(stack[stack.length - 1] || 'title', false);
  }
  function hideAll() { document.querySelectorAll('.screen').forEach(function (s) { s.hidden = true; }); cur = ''; document.body.dataset.screen = ''; }
  function focusFirst() { var s = $(cur); if (!s) return; var b = s.querySelector('button:not([disabled]),a[href]'); if (b && !WL.Input.isTouch) b.focus({ preventScroll: true }); }
  function toast(msg) { var t = $('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast.h); toast.h = setTimeout(function () { t.classList.remove('on'); }, 2800); }
  function say(msg) { var b = $('bubble'); b.textContent = msg; b.classList.add('on'); clearTimeout(say.h); say.h = setTimeout(function () { b.classList.remove('on'); }, 3000); }

  // ---------- dialogue
  function dialogue(lines, done) {
    var i = 0, box = $('dlg'); dlg = { done: done };
    box.hidden = false; document.body.classList.add('talking');
    function step() {
      if (i >= lines.length) { box.hidden = true; document.body.classList.remove('talking'); var d = dlg.done; dlg = null; if (d) d(); return; }
      var l = lines[i++], col = NAMECOL[l[0]] || '#ccc';
      $('dlgName').textContent = l[0]; $('dlgName').style.color = col;
      $('dlgPic').style.background = col; $('dlgPic').textContent = l[0].charAt(0);
      $('dlgText').innerHTML = l[1].replace('{t}', '<b class="cd"></b>'); WL.Countdown.tick();
      WL.Audio.sfx('click');
    }
    dlg.step = step; step(); $('dlgNext').focus();
  }

  // ---------- flow
  function startLevel(li) {
    lastLevel = li; WL.Audio.unlock(); hideAll(); document.body.classList.add('playing');
    var begin = function () {
      WL.Audio.playBgm(WL.Game.LEVELS[li].bgm);
      WL.Game.start(li, charId, onEnd);
    };
    var pre = li === 0 ? STORY.intro : li === 1 ? STORY.before1 : [['Narrator', 'The Overfit Gate looms. Something huge hums behind it.']].concat(li === 2 ? [['Dee', 'Is that thing the AI that wanted to replace DJs? Rude. Shoot it.']] : []);
    dialogue(pre, begin);
  }
  function onEnd(res) {
    document.body.classList.remove('playing');
    if (res.win) {
      unlocked = Math.max(unlocked, res.lv + 1); save();
      var lines = res.lv === 0 ? STORY.after0 : res.lv === 1 ? STORY.after1 : null;
      if (lines) dialogue(lines, function () { startLevel(res.lv + 1); });
      else finale(res);
    } else {
      $('overScore').textContent = res.score; show('over');
    }
  }
  function finale(res) {
    WL.Audio.playBgm('kerry-birthday-anthem');
    WL.Game.stop();
    $('finalScore').textContent = res.score;
    dialogue(STORY.finale, function () { show('party'); });
    for (var i = 0; i < 4; i++) setTimeout(spawnConfetti, i * 400);
  }
  function spawnConfetti() { var c = $('confetti'); if (!c) return; for (var i = 0; i < 40; i++) { var s = document.createElement('i'); s.style.left = Math.random() * 100 + '%'; s.style.background = ['#ff4fd8', '#38f2c1', '#ffd23f', '#8b5cf6'][i % 4]; s.style.animationDuration = 2 + Math.random() * 3 + 's'; c.appendChild(s); setTimeout(function (e) { e.remove(); }.bind(null, s), 5500); } }
  function cakeCut() { toast('🎂 Dizzle has been cut! HAPPY BIRTHDAY KERRY!'); spawnConfetti(); spawnConfetti(); }

  function pause(v) {
    if (v) { WL.Game.pause(true); document.body.classList.remove('playing'); show('pause'); }
    else { hideAll(); document.body.classList.add('playing'); WL.Game.pause(false); }
  }

  // ---------- character select
  function renderChars() {
    var grid = $('chars'); grid.innerHTML = '';
    Object.keys(WL.Game.CHARS).forEach(function (k) {
      var c = WL.Game.CHARS[k], b = document.createElement('button');
      b.className = 'card' + (k === charId ? ' sel' : ''); b.style.setProperty('--c', c.color);
      b.innerHTML = '<span class="av" style="background:' + c.color + '">' + c.name.charAt(0) + '</span><b>' + c.name + '</b><small>' + c.role + '</small><span class="perk">' + c.perk + '</span><small>HP ' + c.hp + '</small>';
      b.onclick = function () { charId = k; save(); renderChars(); WL.Audio.sfx('pickup'); };
      grid.appendChild(b);
    });
  }
  function renderLevels() {
    var g = $('levelList'); g.innerHTML = '';
    WL.Game.LEVELS.forEach(function (l, i) {
      var b = document.createElement('button'); b.textContent = (i + 1) + '. ' + l.name; b.disabled = i > unlocked;
      b.onclick = function () { startLevel(i); }; g.appendChild(b);
    });
  }

  // ---------- gamepad menu navigation (called every frame by the game loop)
  function nav() {
    var P = WL.Input.pressed;
    if (dlg) { if (P.accept || P.jump || P.fire) dlg.step(); return; }
    if (!cur || cur === '') return;
    var sc = $(cur); if (!sc) return;
    var els = Array.prototype.slice.call(sc.querySelectorAll('button:not([disabled]),select,input,a[href]')).filter(function (e) { return e.offsetParent; });
    if (!els.length) return;
    var i = els.indexOf(document.activeElement);
    if (P.down) { els[(i + 1) % els.length].focus(); }
    if (P.up) { els[(i - 1 + els.length) % els.length].focus(); }
    if (P.accept && i >= 0 && els[i].tagName === 'BUTTON') els[i].click();
    if (P.pause && cur === 'pause') pause(false);
  }

  function bind() {
    document.querySelectorAll('[data-go]').forEach(function (b) { b.addEventListener('click', function () { WL.Audio.unlock(); WL.Audio.sfx('click'); show(b.dataset.go); if (b.dataset.go === 'select') renderChars(); if (b.dataset.go === 'dj') WL.Audio.playBgm('simulation-lullaby').then(function () { WL.Audio.stopBgm(); }); }); });
    document.querySelectorAll('[data-back]').forEach(function (b) { b.addEventListener('click', function () { WL.Audio.sfx('click'); back(); }); });
    $('btnPlay').onclick = function () { WL.Audio.unlock(); startLevel(0); };
    $('btnContinue').onclick = function () { WL.Audio.unlock(); renderLevels(); show('levels'); };
    $('btnSelectGo').onclick = function () { WL.Audio.unlock(); startLevel(lastLevel); };
    $('dlgNext').onclick = function () { if (dlg) dlg.step(); };
    $('btnResume').onclick = function () { pause(false); };
    $('btnRestart').onclick = function () { WL.Game.stop(); startLevel(lastLevel); };
    $('btnQuit').onclick = function () { WL.Game.stop(); WL.Audio.playBgm('simulation-lullaby'); stack = ['title']; show('title', false); };
    $('btnRetry').onclick = function () { startLevel(lastLevel); };
    $('btnOverMenu').onclick = function () { stack = ['title']; show('title', false); };
    $('btnPartyDJ').onclick = function () { show('dj'); };
    $('btnPause').onclick = function () { if (WL.Game.running) pause(true); };
    $('btnFull').onclick = function () { var d = document.documentElement; if (document.fullscreenElement) document.exitFullscreen(); else if (d.requestFullscreen) d.requestFullscreen().catch(function () {}); };
    $('btnIcs').onclick = function () { var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([WL.Countdown.ics()], { type: 'text/calendar' })); a.download = 'kerrys-party.ics'; a.click(); };
    var sM = $('setMusic'), sS = $('setSfx'), sT = $('setTouch');
    sM.value = WL.Audio.settings.music; sS.value = WL.Audio.settings.sfx;
    sM.oninput = function () { WL.Audio.set('music', +this.value); }; sS.oninput = function () { WL.Audio.set('sfx', +this.value); };
    sS.onchange = function () { WL.Audio.sfx('pickup'); };
    sT.checked = WL.Input.isTouch; document.body.classList.toggle('touch', sT.checked);
    sT.onchange = function () { document.body.classList.toggle('touch', this.checked); WL.Game.resize(); };
    $('btnReset').onclick = function () { if (confirm('Reset progress? (Dee will not remember this either.)')) { unlocked = 0; save(); toast('Progress reset'); } };
    $('btnContinue').disabled = false;
    if (WL.Input.padName) toast('🎮 Controller ready');
  }
  function init() { bind(); WL.Input.bindTouch(); show('title', false); }
  return { init: init, show: show, back: back, toast: toast, say: say, pause: pause, nav: nav, cakeCut: cakeCut, startLevel: startLevel, hideAll: hideAll, get charId() { return charId; } };
})();
