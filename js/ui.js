// Screens, story dialogue, settings, progression. Plain DOM, no framework.
WL.UI = (function () {
  var stack = ['title'], cur = 'title', charId = 'dee', unlocked = 0, part1Done = false, dlg = null, lastLevel = 0;
  var $ = function (id) { return document.getElementById(id); };
  try { var sv = JSON.parse(localStorage.getItem('wl.save')); if (sv) { charId = sv.charId || charId; unlocked = sv.unlocked || 0; part1Done = !!sv.part1Done; } } catch (e) {}
  function save() { try { localStorage.setItem('wl.save', JSON.stringify({ charId: charId, unlocked: unlocked, part1Done: part1Done })); } catch (e) {} }
  function canPart2() { return part1Done || WL.Dev.enabled; }

  var NAMECOL = { Narrator: '#9a90b8', DeeDarkgloom: '#8b5cf6', Dee: '#8b5cf6', 'Bo0m': '#f59e0b', Hypnotized: '#22d3ee', 'Myster Y. Deep': '#10b981', Helix: '#f43f5e', Kerry: '#ff4fd8', Dizzle: '#f9a8d4', Simulation: '#ef4444', Mick: '#ffb347', 'Cake·AI': '#38f2c1', 'Cake·AI™': '#38f2c1' };
  // Scene keys: intro, before<N>, after<N>, finale (Kerry), finale2 (Mick). Overridable via content/story.json
  var STORY = {
    intro: [
      ['Narrator', 'The Simulation cracked open. AI had been running everything, and one morning everybody found out they were living inside it. Only the Weirdlings Anti-AI Tribe stayed gloriously, stubbornly weird.'],
      ['Dee', 'Why is my pager screaming? "KERRY. BIRTHDAY. FRIDAY. DJ SET." Oh no. Oh NO. The party starts in {t}!'],
      ['Narrator', 'Kerry Queenslayer, the tribe\'s artist (and the reason half of us have colour in our lives), asked Dee to DJ nine months ago. Dee, naturally, forgot. Get to the party. Collect vinyl. Shoot Clankers.']
    ],
    after0: [
      ['Bo0m', 'Heads up: I\'m opening the night with a Spotify playlist at 7pm while everyone arrives. There\'s a panel for it in the DJ booth.'],
      ['Dee', 'Wait, when am I on? 10:20pm. Right. I knew that. Party starts in {t}, right?']
    ],
    before1: [
      ['Simulation', 'GLITCH DETECTED. ROUTE TO PARTY: BLOCKED. REASON: NOT ENOUGH SLOP.'],
      ['Helix', 'Double strand, double trouble. Keep moving!']
    ],
    after1: [
      ['Hypnotized', 'You are getting sleepy… of the AI. Ahead is the Overfit Gate. It has memorised everything and understood nothing.'],
      ['Myster Y. Deep', 'Deep breaths. Deep bass. Then boom.']
    ],
    before2: [
      ['Narrator', 'The Overfit Gate looms. Something huge hums behind it.'],
      ['Dee', 'Is that thing the AI that wanted to replace DJs? Rude. Shoot it.']
    ],
    finale: [
      ['Kerry', 'You made it!! Thank you, everyone. 生日快乐, as they say at home. Wait, why is the DJ booth… a cake?'],
      ['Dizzle', 'Simulation glitch. I turned into a cake. I\'m still DJing though. Please be gentle with the knife.'],
      ['Dee', 'I remembered! I actually remembered! Kerry, I\'ve been reminded of this all week by everything. Doors at 7, I\'m on at 10:20.'],
      ['Kerry', 'Right. Cut the cake. HAPPY BIRTHDAY TO ME! Hit it, DJs. And then, someone needs to go and wish Mick Beach a happy birthday too…']
    ],
    before3: [
      ['Narrator', 'One party down. The Simulation hasn\'t stopped glitching, though. Word has come in: it\'s Mick Beach\'s birthday next, and the party is on a beach the Simulation keeps trying to delete.'],
      ['Kerry', 'Go! Take the vinyl. Wish Mick a happy birthday from me!'],
      ['Dee', 'Another party? I\'ve only just got used to this one. Fine. Beach it is.']
    ],
    after3: [
      ['Bo0m', 'Sand in my headphones. Again. Lucky Salvage found a flip-flop though.'],
      ['Helix', 'The pier is up ahead. It\'s glitching. Mind the gaps.']
    ],
    before4: [
      ['Simulation', 'TIDE ERROR: SEA NOT FOUND. RENDERING WATER.'],
      ['Myster Y. Deep', 'The sea is just deep bass with good PR.']
    ],
    after4: [
      ['Hypnotized', 'Look into the waves… the Tidal Overfit is coming for the party. Do not look away.'],
      ['Dee', 'Nobody cancels a birthday on my watch. (I wrote it on my hand this time.)']
    ],
    before5: [
      ['Narrator', 'The Tidal Overfit rises out of the glitching surf, memorising every wave and understanding none of them.']
    ],
    cake: [
      ['Kerry', 'Cake·AI, print me and Myster Y. Deep slaying through the dungeon on my cake!'],
      ['Cake·AI', 'Certainly! Generating your image using advanced artificial intelligence…'],
      ['Myster Y. Deep', "…there is no AI. It's me. I've got a piping bag and a very steady hand. Please don't tell the Simulation."],
      ['Kerry', "Wait. You're hand-drawing my cake? Stroke by stroke? That's the most Weirdling thing I've ever heard."]
    ],
    finale2: [
      ['Mick', 'You came all this way… for me? Cheers, everyone. Happy birthday to me, apparently!'],
      ['Kerry', 'Happy birthday, Mick! (Sent by video call. The Simulation ate my plane ticket.)'],
      ['Dizzle', 'I do birthdays. I am also a cake. It\'s a whole thing. Mick, please cut me.'],
      ['Mick', 'Right. Somebody pass the DJ booth, and everyone sign the book!']
    ]
  };

  // ---------- screens
  var HOOK = {};
  function show(id, push) {
    document.querySelectorAll('.screen').forEach(function (s) { s.hidden = s.id !== id; });
    if (push !== false && cur !== id) stack.push(id);
    cur = id; document.body.dataset.screen = id;
    var sc = $(id); if (sc && sc.scrollTo) sc.scrollTo(0, 0);
    if (HOOK[id]) HOOK[id]();
    focusFirst();
    if (id === 'dj') { WL.Audio.unlock(); WL.DJ.open(); } else if (WL.DJ.built) WL.DJ.close();
    if (id !== 'micro') WL.Lab.stop();
  }
  function back() {
    if (cur === 'pause' || cur === 'title') return;
    stack.pop(); show(stack[stack.length - 1] || 'title', false);
  }
  function hideAll() { document.querySelectorAll('.screen').forEach(function (s) { s.hidden = true; }); cur = ''; document.body.dataset.screen = ''; }
  function focusFirst() { var s = $(cur); if (!s) return; var b = s.querySelector('button:not([disabled]),a[href]'); if (b && !WL.Input.isTouch) b.focus({ preventScroll: true }); }
  function toast(msg) { var t = $('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast.h); toast.h = setTimeout(function () { t.classList.remove('on'); }, 3200); }
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
      var t = $('dlgText'); t.textContent = '';
      String(l[1]).split('{t}').forEach(function (part, k) { if (k) { var b = document.createElement('b'); b.className = 'cd'; t.appendChild(b); } t.appendChild(document.createTextNode(part)); });
      WL.Countdown.tick(); WL.Audio.sfx('click');
    }
    dlg.step = step; step(); $('dlgNext').focus();
  }

  // ---------- flow
  function startLevel(li, opts) {
    opts = opts || {};
    if (li >= 3 && !canPart2()) { toast('Finish the Kerry party first to unlock Part 2.'); return; }
    lastLevel = li; WL.Audio.unlock(); hideAll(); document.body.classList.add('playing');
    var begin = function () { WL.Audio.playBgm(WL.Game.LEVELS[li].bgm); WL.Game.start(li, charId, onEnd); };
    var pre = STORY[li === 0 ? 'intro' : 'before' + li];
    if (pre && !opts.skipIntro) dialogue(pre, begin); else begin();
  }
  function onEnd(res) {
    document.body.classList.remove('playing');
    if (!res.win) { $('overScore').textContent = res.score; show('over'); return; }
    unlocked = Math.max(unlocked, res.lv + 1);
    if (res.lv === 2) { part1Done = true; unlocked = Math.max(unlocked, 3); }
    save();
    if (res.lv === 2) return finale(1, res);
    if (res.lv === 5) return finale(2, res);
    var after = STORY['after' + res.lv];
    var next = function () { startLevel(res.lv + 1); };
    if (after) dialogue(after, next); else next();
  }
  function finale(n, res) {
    WL.Audio.playBgm(n === 1 ? 'kerry-birthday-anthem' : 'mick-birthday-anthem');
    WL.Game.stop();
    var who = n === 1 ? 'Kerry' : 'Mick';
    $('partyTitle').textContent = '🎉 Happy Birthday ' + who + '! 🎉';
    $('finalScore').textContent = res ? res.score : '—';
    $('partyText').textContent = n === 1 ? 'Dizzle (now a cake) is on the decks. Sign the book, read the card, or open the DJ booth.' : 'Beach party, achieved. Sign Mick\'s book and take the decks.';
    $('btnPartyCard').dataset.who = who.toLowerCase(); $('btnPartySign').dataset.who = who.toLowerCase();
    $('btnPartyNext').hidden = n !== 1; $('btnPartyNext').disabled = !canPart2();
    dialogue(STORY[n === 1 ? 'finale' : 'finale2'], function () { show('party'); });
    for (var i = 0; i < 4; i++) setTimeout(spawnConfetti, i * 400);
  }
  function spawnConfetti() { var c = $('confetti'); if (!c) return; for (var i = 0; i < 40; i++) { var s = document.createElement('i'); s.style.left = Math.random() * 100 + '%'; s.style.background = ['#ff4fd8', '#38f2c1', '#ffd23f', '#8b5cf6'][i % 4]; s.style.animationDuration = 2 + Math.random() * 3 + 's'; c.appendChild(s); setTimeout(function (e) { e.remove(); }.bind(null, s), 5500); } }
  function cakeCut() { toast('🎂 Dizzle has been cut! HAPPY BIRTHDAY KERRY!'); spawnConfetti(); spawnConfetti(); }
  function pause(v) {
    if (v) { WL.Game.pause(true); document.body.classList.remove('playing'); show('pause'); }
    else { hideAll(); document.body.classList.add('playing'); WL.Game.pause(false); }
  }

  // ---------- character select + level select
  function pickCharacter(id) { charId = id; save(); toast('Playing as ' + WL.Game.CHARS[id].name); show('levels'); }
  function renderChars() {
    var grid = $('chars'); grid.innerHTML = '';
    Object.keys(WL.Game.CHARS).forEach(function (k) {
      var c = WL.Game.CHARS[k], b = document.createElement('button');
      b.className = 'card' + (k === charId ? ' sel' : ''); b.style.setProperty('--c', c.color);
      var av = document.createElement('span'); av.className = 'av'; av.style.background = c.color; av.textContent = c.name.charAt(0);
      var nm = document.createElement('b'); nm.textContent = c.name; var rl = document.createElement('small'); rl.textContent = c.role;
      var pk = document.createElement('span'); pk.className = 'perk'; pk.textContent = c.perk; var hp = document.createElement('small'); hp.textContent = 'HP ' + c.hp;
      [av, nm, rl, pk, hp].forEach(function (x) { b.appendChild(x); });
      b.onclick = function () { charId = k; save(); renderChars(); WL.Audio.sfx('pickup'); };
      grid.appendChild(b);
    });
  }
  function renderLevels() {
    var g = $('levelList'); g.innerHTML = ''; var dev = WL.Dev.enabled;
    WL.Game.LEVELS.forEach(function (l, i) {
      if (i === 0 || i === 3) { var h = document.createElement('h3'); h.textContent = i === 0 ? 'Part 1 · Kerry\'s Party' : 'Part 2 · Mick Beach\'s Birthday' + (canPart2() ? '' : ' 🔒'); g.appendChild(h); }
      var b = document.createElement('button'); b.textContent = (i + 1) + '. ' + l.name;
      b.disabled = !dev && (i > unlocked || (i >= 3 && !part1Done));
      b.onclick = function () { startLevel(i); }; g.appendChild(b);
    });
  }
  function renderTitle() {
    var b = $('btnPart2'); b.textContent = canPart2() ? '🏖 Part 2: Mick\'s Beach Party' : '🔒 Part 2: Mick\'s Beach Party (finish Part 1)';
    b.classList.toggle('locked', !canPart2());
  }

  // ---------- gamepad menu navigation (called every frame by the game loop)
  function nav() {
    var P = WL.Input.pressed;
    if (dlg) { if (P.accept || P.jump || P.fire) dlg.step(); return; }
    if (!cur || cur === '') return;
    var sc = $(cur); if (!sc) return;
    var els = Array.prototype.slice.call(sc.querySelectorAll('button:not([disabled]),select,input,textarea,a[href]')).filter(function (e) { return e.offsetParent; });
    if (!els.length) return;
    var i = els.indexOf(document.activeElement), typing = document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
    if (typing && !(P.pause)) return;       // don't hijack arrow keys while typing in a form
    if (P.down) { els[(i + 1) % els.length].focus(); }
    if (P.up) { els[(i - 1 + els.length) % els.length].focus(); }
    if (P.accept && i >= 0 && els[i].tagName === 'BUTTON') els[i].click();
    if (P.pause && cur === 'pause') pause(false);
    else if ((P.pause || P.back) && cur !== 'title' && cur !== 'over' && cur !== 'party') back();
  }

  function mergeStory(j) { var sc = j && j.scenes; if (sc) Object.keys(sc).forEach(function (k) { if (Array.isArray(sc[k]) && sc[k].length) STORY[k] = sc[k]; }); }

  function bind() {
    HOOK.title = renderTitle; HOOK.select = renderChars; HOOK.levels = renderLevels;
    HOOK.setlist = function () { WL.Setlist.render(); };
    HOOK.workshop = function () { WL.Lab.renderWorkshop(); }; HOOK.writers = function () { WL.Lab.renderWriters(); }; HOOK.devlab = function () { WL.Lab.renderDevLab(); };
    HOOK.cakemaker = function () { WL.Cake.open(); }; HOOK.devmenu = function () { WL.Dev.buildMenu(); }; HOOK.card = function () { WL.Wishes.renderCard(); }; HOOK.signbook = function () { WL.Wishes.prepSign(); };
    document.querySelectorAll('[data-go]').forEach(function (b) { b.addEventListener('click', function () { WL.Audio.unlock(); WL.Audio.sfx('click'); show(b.dataset.go); }); });
    document.querySelectorAll('[data-back]').forEach(function (b) { b.addEventListener('click', function () { WL.Audio.sfx('click'); back(); }); });
    $('btnPlay').onclick = function () { WL.Audio.unlock(); startLevel(0); };
    $('btnPart2').onclick = function () { WL.Audio.unlock(); if (!canPart2()) { toast('Finish Part 1 (Kerry\'s party) to unlock this.'); return; } startLevel(3); };
    $('btnSelectGo').onclick = function () { WL.Audio.unlock(); startLevel(lastLevel); };
    $('dlgNext').onclick = function () { if (dlg) dlg.step(); };
    $('btnResume').onclick = function () { pause(false); };
    $('btnRestart').onclick = function () { WL.Game.stop(); startLevel(lastLevel, { skipIntro: true }); };
    $('btnQuit').onclick = function () { WL.Game.stop(); WL.Audio.playBgm('simulation-lullaby'); stack = ['title']; show('title', false); };
    $('btnRetry').onclick = function () { startLevel(lastLevel, { skipIntro: true }); };
    $('btnOverMenu').onclick = function () { stack = ['title']; show('title', false); };
    $('btnPartyDJ').onclick = function () { show('dj'); };
    $('btnPartyCard').onclick = function () { WL.Wishes.openCard(this.dataset.who); };
    $('btnPartySign').onclick = function () { WL.Wishes.openSign(this.dataset.who); };
    $('btnPartyNext').onclick = function () { startLevel(3); };
    $('btnPause').onclick = function () { if (WL.Game.running) pause(true); };
    $('btnFull').onclick = function () { var d = document.documentElement; if (document.fullscreenElement) document.exitFullscreen(); else if (d.requestFullscreen) d.requestFullscreen().catch(function () {}); };
    $('btnIcs').onclick = function () { var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([WL.Countdown.ics()], { type: 'text/calendar' })); a.download = 'kerrys-party.ics'; a.click(); };
    $('fbSend').onclick = function () { WL.Lab.sendFeedback($('fbKind').value, $('fbTitle').value, $('fbBody').value).then(function (ok) { if (ok) back(); }); };
    $('microQuit').onclick = function () { back(); };
    var sM = $('setMusic'), sS = $('setSfx'), sT = $('setTouch');
    sM.value = WL.Audio.settings.music; sS.value = WL.Audio.settings.sfx;
    sM.oninput = function () { WL.Audio.set('music', +this.value); }; sS.oninput = function () { WL.Audio.set('sfx', +this.value); };
    sS.onchange = function () { WL.Audio.sfx('pickup'); };
    sT.checked = WL.Input.isTouch; document.body.classList.toggle('touch', sT.checked);
    sT.onchange = function () { document.body.classList.toggle('touch', this.checked); WL.Game.resize(); };
    $('btnReset').onclick = function () { if (confirm('Reset progress? (Dee will not remember this either.)')) { unlocked = 0; part1Done = false; save(); toast('Progress reset'); renderTitle(); } };
    if (WL.Input.padName) toast('🎮 Controller ready');
  }
  function init() {
    bind(); WL.Input.bindTouch(); WL.Wishes.bind(); WL.Dev.init(); show('title', false);
    fetch('content/story.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(mergeStory).catch(function () {});
    WL.Lab.loadManifest();
  }
  return {
    init: init, show: show, back: back, toast: toast, say: say, pause: pause, nav: nav, cakeCut: cakeCut, startLevel: startLevel, hideAll: hideAll, pickCharacter: pickCharacter,
    story: function () { return STORY; }, mergeStory: mergeStory,
    playScene: function (k, done) { if (STORY[k]) dialogue(STORY[k], done); else if (done) done(); }, previewScene: function (l) { dialogue(l); },
    devFinale: function (n) { hideAll(); document.body.classList.remove('playing'); finale(n, null); },
    devSet: function (o) { if ('part1Done' in o) part1Done = o.part1Done; if ('unlocked' in o) unlocked = o.unlocked; save(); toast('Saved'); renderTitle(); },
    get charId() { return charId; }
  };
})();
