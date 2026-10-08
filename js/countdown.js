// One timer drives every countdown in the game: DOM banner, any element with class "cd" (menus,
// settings, help, hidden easter eggs), the tab title and the canvas HUD.
// Before 7pm it counts down to the party; during the night the banner becomes "now playing / up next".
WL.Countdown = (function () {
  var offset = 0;   // dev-mode clock simulation (ms)
  var target = Date.parse(WL.CONFIG.partyISO), endT = Date.parse(WL.CONFIG.partyEndISO);
  function now() { return Date.now() + offset; }
  var lines = [
    'Dee: wait, what is happening on Friday again? … KERRY\'S PARTY. It starts in {t}.',
    'Reminder for Dee: the party starts in {t}. Your set is at 10:20pm. Yes, tonight-ish.',
    'Dee, you promised Kerry 9 months ago. {t} to go.',
    'Dee, please check your decks. Party starts in {t}.',
    'Bo0m\'s Spotify playlist kicks things off in {t}. Dee is on later. Don\'t forget, Dee.',
    'Pager: DEE. PARTY. DECKS. {t}.'
  ];
  var liveLines = ['Dee, you are on at 10:20pm. Check the set list!', 'It\'s happening. Dee: is your USB stick in your bag?', 'Dee: someone is DJing right now and it is not you (yet).'];
  var subs = [];
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function parts() {
    var ms = target - now(), over = ms <= 0, s = Math.floor(Math.abs(ms) / 1000);
    return { over: over, live: over && now() < endT, d: Math.floor(s / 86400), h: Math.floor(s % 86400 / 3600), m: Math.floor(s % 3600 / 60), s: s % 60, total: s };
  }
  function fmt(p) { return (p.d ? p.d + 'd ' : '') + pad(p.h) + ':' + pad(p.m) + ':' + pad(p.s); }
  function text(p) {
    p = p || parts();
    if (!p.over) return fmt(p);
    return p.live ? 'LIVE NOW 🎉' : 'the party was legendary';
  }
  var lineIdx = 0, lineTick = 0;
  function tick() {
    var p = parts(), t = text(p), els = document.querySelectorAll('.cd');
    for (var i = 0; i < els.length; i++) els[i].textContent = t;
    var banner = document.getElementById('cdBanner'), big = document.getElementById('cdBig'), label = document.getElementById('cdLabel'), msg = document.getElementById('cdMsg');
    var cur = window.WL.Setlist && WL.Setlist.current(), nxt = window.WL.Setlist && WL.Setlist.next();
    if (banner) banner.classList.toggle('over', p.live);
    if (++lineTick % 8 === 0) lineIdx++;
    if (!p.over) {
      if (label) label.textContent = '🎉 PARTY STARTS IN';
      if (big) big.textContent = t;
      if (msg) msg.textContent = lines[lineIdx % lines.length].replace('{t}', t);
    } else if (p.live && cur) {
      var left = Math.max(0, Math.floor((cur.endMs - now()) / 1000));
      if (label) label.textContent = '🔴 LIVE · ' + cur.dj.toUpperCase();
      if (big) big.textContent = pad(Math.floor(left / 3600)) + ':' + pad(Math.floor(left % 3600 / 60)) + ':' + pad(left % 60);
      if (msg) msg.textContent = (nxt ? 'Up next: ' + nxt.dj + '. ' : 'Last set of the night. ') + liveLines[lineIdx % liveLines.length];
    } else {
      if (label) label.textContent = '🎂 THANKS FOR COMING';
      if (big) big.textContent = '—';
      if (msg) msg.textContent = 'Happy birthday Kerry! Sign the book and see the card. Mick Beach\'s party is next.';
    }
    document.title = (p.live ? '🔴 LIVE' : p.over ? '🎂' : '⏳ ' + t) + ' · Weirdlings: Road to Kerry\'s Party';
    for (var k = 0; k < subs.length; k++) subs[k](p, t);
  }
  setInterval(tick, 1000);
  // Hidden-in-plain-sight reminders for people who open the console
  setInterval(function () { console.log('%cDee, the party starts in ' + text(), 'color:#ff4fd8;font-size:14px'); }, 60000);
  return {
    parts: parts, text: text, tick: tick, now: now, target: target,
    setOffset: function (ms) { offset = ms; tick(); }, getOffset: function () { return offset; },
    subscribe: function (fn) { subs.push(fn); },
    ics: function () {
      var d = new Date(target), e = new Date(endT);
      var f = function (x) { return x.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, ''); };
      return 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Weirdlings//EN\r\nBEGIN:VEVENT\r\nUID:kerry-bday-2026@weirdlings\r\nDTSTAMP:' + f(new Date()) +
        '\r\nDTSTART:' + f(d) + '\r\nDTEND:' + f(e) + '\r\nSUMMARY:Kerry Queenslayer\'s Birthday Party\r\nDESCRIPTION:Weirdlings Anti-AI Tribe. 7pm Bo0m\\\'s Spotify playlist, then live DJ sets. Do not forget!\r\nBEGIN:VALARM\r\nTRIGGER:-PT3H\r\nACTION:DISPLAY\r\nDESCRIPTION:Kerry party in 3 hours\r\nEND:VALARM\r\nEND:VEVENT\r\nEND:VCALENDAR';
    }
  };
})();
