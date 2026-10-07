// One timer drives every countdown in the game: DOM banner, any element with
// class "cd" (menus, settings, help, hidden easter eggs), the tab title and the canvas HUD.
WL.Countdown = (function () {
  var target = new Date(WL.CONFIG.partyISO).getTime();
  var lines = [
    'Dee: wait, what is happening on Friday again? … KERRY\'S PARTY. Cake in {t}.',
    'Reminder for Dee: the DJ cake is cut in {t}.',
    'Dee, you promised Kerry 9 months ago. {t} to go.',
    'Dee, please check your decks. Cake in {t}.',
    'Kerry\'s birthday cake gets cut in {t}. Yes, Dee, that\'s soon.',
    'Pager: DEE. PARTY. CAKE. {t}.'
  ];
  var subs = [];
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function parts() {
    var ms = target - Date.now(), over = ms <= 0;
    var s = Math.floor(Math.abs(ms) / 1000);
    return { over: over, d: Math.floor(s / 86400), h: Math.floor(s % 86400 / 3600), m: Math.floor(s % 3600 / 60), s: s % 60, total: s };
  }
  function text(p) {
    p = p || parts();
    if (p.over) return p.total > 6 * 3600 ? 'the party was ' + p.d + 'd ago (hope you got cake)' : 'IT\'S CAKE TIME 🎂';
    return (p.d ? p.d + 'd ' : '') + pad(p.h) + ':' + pad(p.m) + ':' + pad(p.s);
  }
  var lineIdx = 0, lineTick = 0;
  function tick() {
    var p = parts(), t = text(p);
    var els = document.querySelectorAll('.cd');
    for (var i = 0; i < els.length; i++) els[i].textContent = t;
    var big = document.getElementById('cdBanner');
    if (big) big.classList.toggle('over', p.over);
    var msg = document.getElementById('cdMsg');
    if (msg && ++lineTick % 8 === 0) lineIdx = (lineIdx + 1) % lines.length;
    if (msg) msg.textContent = p.over ? 'Cut the cake, Kerry! Dizzle is ready (and delicious).' : lines[lineIdx].replace('{t}', t);
    document.title = (p.over ? '🎂 CAKE TIME' : '⏳ ' + t) + ' · Weirdlings: Road to Kerry\'s Party';
    for (var k = 0; k < subs.length; k++) subs[k](p, t);
  }
  setInterval(tick, 1000);
  // Hidden-in-plain-sight reminders for people who open the console
  setInterval(function () { console.log('%cDee, the cake is cut in ' + text(), 'color:#ff4fd8;font-size:14px'); }, 60000);
  return {
    parts: parts, text: text, tick: tick, target: target,
    subscribe: function (fn) { subs.push(fn); },
    ics: function () {
      var d = new Date(target), e = new Date(target + 4 * 3600e3);
      var f = function (x) { return x.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, ''); };
      return 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Weirdlings//EN\r\nBEGIN:VEVENT\r\nUID:kerry-bday-2026@weirdlings\r\nDTSTAMP:' + f(new Date()) +
        '\r\nDTSTART:' + f(d) + '\r\nDTEND:' + f(e) + '\r\nSUMMARY:Kerry Queenslayer\'s Birthday Party (DJ cake cut!)\r\nDESCRIPTION:Weirdlings Anti-AI Tribe. DeeDarkgloom DJs. Do not forget!\r\nBEGIN:VALARM\r\nTRIGGER:-PT3H\r\nACTION:DISPLAY\r\nDESCRIPTION:Kerry party in 3 hours\r\nEND:VALARM\r\nEND:VEVENT\r\nEND:VCALENDAR';
    }
  };
})();
