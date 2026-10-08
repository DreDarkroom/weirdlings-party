// Cake·AI™: a fake "AI" cake maker. There is no AI: the picture is "hand-drawn" stroke by stroke, and the player
// can draw on the cake too (mouse, touch, pen / S-Pen with pressure + tilt, palm rejection, eraser).
// Artwork is stored as strokes (points + pressure), never pixels, so replay / undo / redo are free.
WL.Cake = (function () {
  var W = 800, H = 560;
  var base, layer, live, view, vctx, lctx, gctx, bctx, cursorEl;
  var strokes = [], redoStack = [], cur = null, scene = [], tool = 'pen', color = '#ffffff', size = 7;
  var penSeen = 0, dirty = true, anim = null, raf = 0, built = false, uid = 0;
  var PALETTE = ['#ffffff', '#ff8fd8', '#e11d48', '#fb923c', '#ffd23f', '#4ade80', '#14b8a6', '#60a5fa', '#8b5cf6', '#3b2a2a', '#8a6a4a', '#9ca3af'];

  // ---------------------------------------------------------------- helpers
  function mulberry(seed) { var a = seed >>> 0; return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function shade(hex, amt) {
    var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    var f = function (c) { return Math.round(clamp(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt, 0, 255)); };
    return 'rgb(' + f(r) + ',' + f(g) + ',' + f(b) + ')';
  }

  // ---------------------------------------------------------------- stroke renderer ("icing")
  function widthAt(s, i, n) {
    var p = s.pts[i].p, taper = Math.min(1, 0.45 + 0.55 * Math.min(i, n - 1 - i) / 3);
    return Math.max(1.2, s.w * (0.55 + 0.9 * p) * taper * (s.pts[i].k || 1));
  }
  function path(g, pts, upTo, w0, off) {
    // quadratic mid-point smoothing; one call per segment so the width can change along the stroke
    var n = Math.min(upTo, pts.length);
    for (var i = 1; i < n; i++) {
      var a = i === 1 ? pts[0] : mid(pts[i - 1], pts[i]), b = i === n - 1 ? pts[i] : mid(pts[i], pts[i + 1]);
      g.beginPath(); g.moveTo(a.x + off[0], a.y + off[1]); g.quadraticCurveTo(pts[i].x + off[0], pts[i].y + off[1], b.x + off[0], b.y + off[1]);
      g.lineWidth = w0(i); g.stroke();
    }
  }
  function mid(a, b) { return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }
  function renderStroke(g, s, upTo) {
    var pts = s.pts, n = Math.min(upTo == null ? pts.length : upTo, pts.length); if (!n) return;
    g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
    if (s.erase) {
      g.globalCompositeOperation = 'destination-out'; g.strokeStyle = '#000'; g.fillStyle = '#000';
      if (n === 1) { g.beginPath(); g.arc(pts[0].x, pts[0].y, s.w * 1.2, 0, 6.283); g.fill(); } else path(g, pts, n, function (i) { return widthAt(s, i, pts.length) * 2.2; }, [0, 0]);
      g.restore(); return;
    }
    if (n === 1) {
      var r = s.w * (0.7 + 0.5 * pts[0].p) * 0.6;
      g.fillStyle = shade(s.c, -0.4); g.beginPath(); g.arc(pts[0].x + 1, pts[0].y + 1.6, r * 1.12, 0, 6.283); g.fill();
      g.fillStyle = s.c; g.beginPath(); g.arc(pts[0].x, pts[0].y, r, 0, 6.283); g.fill();
      g.fillStyle = shade(s.c, 0.55); g.beginPath(); g.arc(pts[0].x - r * 0.3, pts[0].y - r * 0.35, r * 0.3, 0, 6.283); g.fill();
      g.restore(); return;
    }
    var w = function (i) { return widthAt(s, i, pts.length); };
    g.strokeStyle = shade(s.c, -0.4); path(g, pts, n, function (i) { return w(i) * 1.14 + 0.8; }, [1.1, 1.7]);   // soft shadow edge
    g.strokeStyle = s.c; path(g, pts, n, w, [0, 0]);                                                           // icing body
    g.strokeStyle = shade(s.c, 0.55); path(g, pts, n, function (i) { return w(i) * 0.32; }, [-w(1) * 0.12, -w(1) * 0.18]);   // wet highlight
    g.restore();
  }

  // ---------------------------------------------------------------- cake base (static)
  function drawBase() {
    var g = bctx, r = mulberry(5);
    g.clearRect(0, 0, W, H);
    var bg = g.createLinearGradient(0, 0, W, H); bg.addColorStop(0, '#d9d4c7'); bg.addColorStop(1, '#bdb6a5'); g.fillStyle = bg; g.fillRect(0, 0, W, H);   // cake board
    g.strokeStyle = 'rgba(0,0,0,.12)'; g.lineWidth = 3; g.strokeRect(6, 6, W - 12, H - 12);
    g.save(); g.shadowColor = 'rgba(0,0,0,.4)'; g.shadowBlur = 24; g.shadowOffsetY = 10; g.fillStyle = '#f0c987'; rr(g, 34, 26, W - 68, H - 52, 34); g.fill(); g.restore();   // sponge sides
    var top = g.createLinearGradient(0, 30, 0, H - 40); top.addColorStop(0, '#fffaf0'); top.addColorStop(1, '#f6ead6'); g.fillStyle = top; rr(g, 44, 34, W - 88, H - 82, 28); g.fill();   // fondant top
    g.fillStyle = 'rgba(160,120,60,.05)'; for (var i = 0; i < 700; i++) g.fillRect(50 + r() * (W - 100), 40 + r() * (H - 90), 1.4, 1.4);
    g.strokeStyle = 'rgba(120,80,30,.18)'; g.lineWidth = 2; rr(g, 44, 34, W - 88, H - 82, 28); g.stroke();
  }
  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

  // ---------------------------------------------------------------- hand-lettering (single-stroke font)
  var FONT = {
    H: [[[0, 0], [0, 12]], [[8, 0], [8, 12]], [[0, 6], [8, 6]]], B: [[[0, 0], [0, 12]], [[0, 0], [5, 0], [7, 2], [5, 5.5], [0, 6]], [[0, 6], [5.5, 6], [8, 9], [5.5, 12], [0, 12]]],
    K: [[[0, 0], [0, 12]], [[8, 0], [0, 7]], [[2.5, 5.5], [8, 12]]], M: [[[0, 12], [0, 0], [4, 8], [8, 0], [8, 12]]], Y: [[[0, 0], [4, 6.5], [8, 0]], [[4, 6.5], [4, 12]]],
    D: [[[0, 0], [0, 12]], [[0, 0], [4, 0], [8, 3], [8, 9], [4, 12], [0, 12]]],
    a: [[[7, 8], [5, 5.5], [2, 6], [0.5, 9], [2, 12], [5, 12], [7, 10]], [[7, 5.5], [7, 12]]], p: [[[0, 5], [0, 17]], [[0, 7], [2, 5.2], [5, 5.2], [7, 8], [5, 11.8], [2, 12], [0, 10]]],
    y: [[[0, 5], [3.5, 12]], [[7, 5], [2.5, 15], [1, 17]]], i: [[[2, 5], [2, 12]], [[2, 1.5], [2.1, 1.6]]], r: [[[0, 5], [0, 12]], [[0, 8], [2, 5.5], [5, 5]]],
    t: [[[3, 1], [3, 11], [4.5, 12]], [[0.5, 5.5], [6, 5.5]]], h: [[[0, 0], [0, 12]], [[0, 7], [2, 5.5], [5, 5.5], [6.5, 8], [6.5, 12]]],
    d: [[[7, 0], [7, 12]], [[7, 7], [5, 5.3], [2, 5.5], [0.5, 9], [2, 12], [5, 12], [7, 10]]],
    e: [[[0.5, 8.5], [7, 8], [6, 5.8], [3.5, 5], [1, 6.5], [0, 9.5], [1.5, 12], [4, 12.3], [6.5, 11]]],
    s: [[[6.5, 6.2], [4, 5], [1.5, 6], [2.5, 8.5], [5.5, 9.5], [6.5, 11], [4, 12.3], [0.5, 11]]],
    '!': [[[1, 0], [1, 8.5]], [[1, 11], [1.1, 11.5]]], '.': [[[1, 11.5], [1.2, 11.8]]]
  };

  // ---------------------------------------------------------------- scene builder ("the hand")
  function buildScene() {
    var r = mulberry(2026), out = [], phase = 0;
    function jig(pts, amp) {   // low-frequency hand tremor + uneven pressure
      var ph = r() * 6.28, ph2 = r() * 6.28, n = pts.length, pr = 0.45 + r() * 0.3;
      return pts.map(function (q, i) { return { x: q[0] + Math.sin(i * 0.35 + ph) * amp + (r() - 0.5) * 0.6, y: q[1] + Math.cos(i * 0.31 + ph2) * amp + (r() - 0.5) * 0.6, p: clamp(pr + Math.sin(i * 0.2 + ph) * 0.18 + (r() - 0.5) * 0.08, 0.15, 1) }; });
    }
    function sample(a, b, step) {   // a gently bowed line sampled like a real pen path
      var d = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(2, Math.round(d / step)), bow = (r() - 0.5) * Math.min(6, d * 0.04), nx = -(b[1] - a[1]) / (d || 1), ny = (b[0] - a[0]) / (d || 1), o = [];
      for (var i = 0; i <= n; i++) { var t = i / n, k = Math.sin(t * Math.PI) * bow; o.push([a[0] + (b[0] - a[0]) * t + nx * k, a[1] + (b[1] - a[1]) * t + ny * k]); }
      return o;
    }
    function add(c, w, pts, amp) { out.push({ id: ++uid, c: c, w: w, pts: jig(pts, amp == null ? 0.7 : amp) }); }
    function line(a, b, c, w, step) { var ov = 1 + r() * 2.5, d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, ux = (b[0] - a[0]) / d, uy = (b[1] - a[1]) / d; add(c, w, sample([a[0] - ux * ov * 0.4, a[1] - uy * ov * 0.4], [b[0] + ux * ov, b[1] + uy * ov], step || 7)); }   // overshoot
    function poly(pts, c, w, close) { var p = pts.slice(); if (close) p.push(pts[0]); var o = []; for (var i = 0; i < p.length - 1; i++) o = o.concat(sample(p[i], p[i + 1], 7).slice(i ? 1 : 0)); add(c, w, o); }
    function ell(cx, cy, rx, ry, c, w, a0, a1) { a0 = a0 == null ? 0 : a0; a1 = a1 == null ? 6.4 : a1; var o = [], n = Math.max(10, Math.round((a1 - a0) * Math.max(rx, ry) / 5)); for (var i = 0; i <= n; i++) { var a = a0 + (a1 - a0) * i / n; o.push([cx + Math.cos(a) * rx * (1 + (r() - 0.5) * 0.03), cy + Math.sin(a) * ry]); } add(c, w, o, 0.8); }
    function hatch(poly_, c, w, gap, ang) {   // scribbled colouring-in that spills a little past the lines
      var cs = Math.cos(ang || 0), sn = Math.sin(ang || 0), rot = function (q) { return [q[0] * cs + q[1] * sn, -q[0] * sn + q[1] * cs]; }, un = function (q) { return [q[0] * cs - q[1] * sn, q[0] * sn + q[1] * cs]; };
      var P = poly_.map(rot), ys = P.map(function (q) { return q[1]; }), y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys), dir = 1;
      for (var y = y0 + gap / 2; y < y1; y += gap * (0.85 + r() * 0.3)) {
        var xs = []; for (var i = 0; i < P.length; i++) { var a = P[i], b = P[(i + 1) % P.length]; if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) xs.push(a[0] + (y - a[1]) / (b[1] - a[1]) * (b[0] - a[0])); }
        xs.sort(function (p, q) { return p - q; });
        for (var k = 0; k + 1 < xs.length; k += 2) { var xa = xs[k] - (r() * 3 - 0.5), xb = xs[k + 1] + (r() * 3 - 0.5), seg = dir > 0 ? [[xa, y], [xb, y + (r() - 0.5) * 3]] : [[xb, y], [xa, y + (r() - 0.5) * 3]]; add(c, w, sample(un(seg[0]), un(seg[1]), 9), 0.5); }
        dir = -dir;
      }
    }
    function text(str, x, y, sc, c, w, rotAmt) {
      for (var ci = 0; ci < str.length; ci++) {
        var ch = str.charAt(ci), gl = FONT[ch], rot = ((r() - 0.5) * (rotAmt == null ? 0.08 : rotAmt)), dy = (r() - 0.5) * sc * 0.8;
        if (gl) gl.forEach(function (st) { add(c, w, st.map(function (q) { var qx = q[0] * sc, qy = (q[1] - 12) * sc; return [x + qx * Math.cos(rot) - qy * Math.sin(rot), y + dy + qx * Math.sin(rot) + qy * Math.cos(rot)]; }).reduce(function (acc, q, i, arr) { if (i) acc = acc.concat(sample(arr[i - 1], q, 3).slice(1)); else acc.push(q); return acc; }, []), 0.35); });
        x += (ch === ' ' ? 7 : 11) * sc * (0.95 + r() * 0.1);
      }
      return x;
    }

    // --- piped border beads
    var dots = []; for (var bx = 70; bx <= 730; bx += 17) { dots.push([bx, 54]); dots.push([bx, 470]); } for (var by = 70; by <= 460; by += 17) { dots.push([62, by]); dots.push([738, by]); }
    dots.forEach(function (d, i) { out.push({ id: ++uid, c: i % 2 ? '#ff8fd8' : '#ffffff', w: 8, pts: [{ x: d[0] + (r() - 0.5) * 2, y: d[1] + (r() - 0.5) * 2, p: 0.7 }] }); });

    // --- the dungeon (own composition): corridor in one-point perspective, vanishing point (400,255)
    var VP = [400, 255], STONE = '#7d79a0';
    hatch([[84, 70], [716, 70], [716, 452], [84, 452]], '#2e2440', 15, 13, 0.15);                 // dark base
    hatch([[84, 452], [716, 452], [460, 305], [340, 305]], '#5b5470', 9, 12, 0.1);                // floor
    hatch([[84, 70], [340, 205], [340, 305], [84, 452]], '#443f60', 9, 13, 1.4);                  // left wall
    hatch([[716, 70], [460, 205], [460, 305], [716, 452]], '#443f60', 9, 13, -1.4);               // right wall
    hatch([[84, 70], [716, 70], [460, 205], [340, 205]], '#3a3250', 9, 13, 0.05);                 // ceiling
    hatch([[340, 205], [460, 205], [460, 305], [340, 305]], '#3d3858', 8, 11, 0.2);               // back wall
    ell(400, 262, 24, 34, '#120c1c', 10);                                                           // doorway
    [-1, 1].forEach(function (sd) { [130, 215, 300, 385].forEach(function (y) { var x0 = sd < 0 ? 84 : 716, x1 = sd < 0 ? 340 : 460; line([x0, y], [x1, 255 + (y - 255) * 0.1818], STONE, 2.4, 10); }); });   // brick courses
    [150, 235, 310].forEach(function (x) { line([x, 452], [VP[0] + (x - VP[0]) * 0.32, 305], STONE, 2.4, 10); line([800 - x, 452], [VP[0] + (800 - x - VP[0]) * 0.32, 305], STONE, 2.4, 10); });   // flagstones
    [345, 390].forEach(function (y) { var t = (y - 305) / 147; line([340 - 256 * t, y], [460 + 256 * t, y], STONE, 2.4, 10); });
    // pillars + gold trim
    [[112, 156], [644, 688]].forEach(function (pl) { hatch([[pl[0], 66], [pl[1], 66], [pl[1], 450], [pl[0], 450]], '#6b5a4a', 10, 11, 1.55); poly([[pl[0], 66], [pl[1], 66], [pl[1], 450], [pl[0], 450]], '#2a1d14', 4, true); line([pl[0] + 12, 100], [pl[0] + 12, 420], '#a08a74', 3, 8);
      [[78, 100], [412, 442]].forEach(function (bnd) { var zz = []; for (var x = pl[0]; x <= pl[1]; x += 6) zz.push([x, bnd[0] + ((x / 6 | 0) % 2 ? 0 : (bnd[1] - bnd[0]))]); add('#ffd23f', 5, zz, 0.4); }); });
    // the two heroes, big enough to read. Feet on y=440, drawn with local coords scaled by K
    var K = 1.3, FY = 440;
    function P(x, dx, dy) { return [x + dx * K, FY + dy * K]; }
    function hero(x, cloak, hood) {
      var body = [P(x, -26, -110), P(x, 24, -110), P(x, 34, -16), P(x, -36, -16)];
      hatch(body, cloak, 9, 9, 1.2); poly(body, '#1a1020', 3.4, true);
      var hc = P(x, 0, -128); ell(hc[0], hc[1], 15 * K, 16 * K, hood, 8); ell(hc[0], hc[1] + 2, 8 * K, 9 * K, '#120c1c', 7);
      var l1 = P(x, -12, -16), l2 = P(x, -14, 0), l3 = P(x, 14, -16), l4 = P(x, 16, 0); line(l1, l2, '#1a1020', 7, 6); line(l3, l4, '#1a1020', 7, 6);
    }
    hero(342, '#ff4fd8', '#c0268f'); hero(458, '#10b981', '#0a7a56');
    var ka = P(342, 26, -88), kb = P(342, -46, -92); line(ka, kb, '#cbd5e1', 7, 6); line(kb, [kb[0] - 14, kb[1] - 4], '#ffd23f', 6, 5);          // Kerry's blaster
    var ta = P(458, -20, -84), tb = P(458, 40, -116), tc = [tb[0] + 22, tb[1] - 24]; line(ta, tb, '#8a6a4a', 6, 6); line(tb, tc, '#8a6a4a', 6, 6);   // torch arm
    poly([[tc[0] - 8, tc[1] + 2], [tc[0] + 8, tc[1] + 2], [tc[0] + 5, tc[1] - 14], [tc[0], tc[1] - 28], [tc[0] - 5, tc[1] - 14]], '#ffb347', 5, true); hatch([[tc[0] - 5, tc[1]], [tc[0] + 5, tc[1]], [tc[0], tc[1] - 18]], '#ffd23f', 4, 4, 0.2);
    for (var gl = 0; gl < 4; gl++) ell(tc[0], tc[1] - 12, 20 + gl * 12, 18 + gl * 11, '#ffb347', 3, 0.3 + gl, 1.5 + gl * 0.9);   // flame glow rings
    // defeated Clankers + sparks
    function clanker(x, y, sc) { ell(x, y, 24 * sc, 15 * sc, '#9ca3af', 8); ell(x, y, 24 * sc, 15 * sc, '#4b5563', 3); [[-9, -3], [3, 5]].forEach(function (o) { line([x + o[0] * sc, y - 5 * sc], [x + (o[0] + 6) * sc, y + 4 * sc], '#ef4444', 3.2, 4); line([x + (o[0] + 6) * sc, y - 5 * sc], [x + o[0] * sc, y + 4 * sc], '#ef4444', 3.2, 4); }); }
    clanker(232, 410, 1.1); clanker(590, 404, 0.95);
    [[232, 380], [262, 390], [206, 386], [590, 376], [614, 386]].forEach(function (sp) { line([sp[0], sp[1]], [sp[0] + (r() - 0.5) * 16, sp[1] - 14 - r() * 8], '#ffd23f', 3.4, 4); });
    // name tags (own lettering), above each head
    text('Kerry', 304, 236, 1.7, '#ff8fd8', 4); text('Myster Y. Deep', 392, 226, 1.45, '#6ee7b7', 3.8);
    line([430, 238], [546, 238], '#ef4444', 3.4, 6);
    // little game HUD along the bottom edge
    [[104, '#9ca3af'], [140, '#ffd23f'], [176, '#60a5fa'], [212, '#a78bfa'], [248, '#fb7185']].forEach(function (h) { ell(h[0], 444, 11, 11, h[1], 4); });
    line([548, 436], [660, 436], '#e11d48', 6, 5); line([548, 447], [630, 447], '#22c55e', 5, 5);
    // birthday lettering on the cake board
    text('Happy Birthday Kerry!', 220, 520, 1.6, '#ffffff', 5.5, 0.1);
    return out;
  }

  // ---------------------------------------------------------------- drawing surface
  function present() {
    vctx.clearRect(0, 0, W, H); vctx.drawImage(base, 0, 0); vctx.drawImage(layer, 0, 0); vctx.drawImage(live, 0, 0); dirty = false;
  }
  function loop() { if (dirty) present(); raf = requestAnimationFrame(loop); }
  function rerender() {
    gctx.clearRect(0, 0, W, H); strokes.forEach(function (s) { renderStroke(gctx, s); }); lctx.clearRect(0, 0, W, H); dirty = true; updateButtons();
  }
  function updateButtons() { var u = document.getElementById('ckUndo'), r = document.getElementById('ckRedo'); if (u) u.disabled = !strokes.length; if (r) r.disabled = !redoStack.length; }

  function toLocal(e) { var b = view.getBoundingClientRect(); return { x: (e.clientX - b.left) * W / b.width, y: (e.clientY - b.top) * H / b.height }; }
  function showCursor(e) {
    if (!cursorEl) return; var b = view.getBoundingClientRect(), d = Math.max(6, size * 1.6 * b.width / W);
    cursorEl.style.cssText = 'display:block;width:' + d + 'px;height:' + d + 'px;left:' + (e.clientX - b.left) + 'px;top:' + (e.clientY - b.top) + 'px;border-color:' + (tool === 'eraser' || (e.buttons & 34) ? '#ff4d6d' : color);
  }
  function pressureFor(e, pt, prev) {
    if (e.pointerType === 'pen') return clamp(e.pressure || 0.5, 0.05, 1);
    if (!prev) return 0.55;
    var v = Math.hypot(pt.x - prev.x, pt.y - prev.y); return clamp(prev.p * 0.8 + (1 - clamp(v / 26, 0, 1)) * 0.2 * 1.1 + 0.04, 0.2, 0.95);   // mouse/finger: slower = fatter, like a real piping bag
  }
  function down(e) {
    if (anim) return;
    if (e.pointerType === 'pen') penSeen = Date.now();
    else if (e.pointerType === 'touch' && Date.now() - penSeen < 2500) return;     // palm rejection while the S-Pen is in use
    if (e.button > 0 && e.pointerType !== 'pen') return;
    e.preventDefault(); try { view.setPointerCapture(e.pointerId); } catch (x) {}
    var erase = tool === 'eraser' || (e.pointerType === 'pen' && ((e.buttons & 32) || (e.buttons & 2)));   // pen eraser end / barrel button
    cur = { id: ++uid, c: color, w: size, erase: erase, pts: [], pid: e.pointerId, type: e.pointerType };
    addPoint(e); redoStack = []; updateButtons();
  }
  function addPoint(e) {
    var evs = (e.getCoalescedEvents && e.getCoalescedEvents().length) ? e.getCoalescedEvents() : [e];
    evs.forEach(function (ev) {
      var q = toLocal(ev), prev = cur.pts[cur.pts.length - 1];
      if (prev && Math.hypot(q.x - prev.x, q.y - prev.y) < 1.2) return;
      q.p = pressureFor(ev, q, prev); if (ev.pointerType === 'pen' && (ev.tiltX || ev.tiltY)) q.k = 1 + Math.min(0.6, Math.hypot(ev.tiltX, ev.tiltY) / 90 * 0.6);   // tilting the pen = broader piping nozzle
      cur.pts.push(q);
    });
    lctx.clearRect(0, 0, W, H); renderStroke(lctx, cur); dirty = true;
  }
  function move(e) {
    if (e.pointerType === 'pen') penSeen = Date.now();
    showCursor(e);
    if (!cur || e.pointerId !== cur.pid) return; e.preventDefault(); addPoint(e);
  }
  function up(e) {
    if (!cur || e.pointerId !== cur.pid) return;
    renderStroke(gctx, cur); lctx.clearRect(0, 0, W, H); strokes.push(cur); cur = null; dirty = true; updateButtons();
  }

  // ---------------------------------------------------------------- animation: the "hand" draws the scene
  function startAnimation(onDone) {
    strokes = []; redoStack = []; gctx.clearRect(0, 0, W, H); lctx.clearRect(0, 0, W, H);
    scene = buildScene(); var si = 0, pi = 0, last = performance.now(), nozzle = document.getElementById('ckNozzle');
    anim = { skip: function () { scene.slice(si).forEach(function (s) { strokes.push(s); renderStroke(gctx, s); }); si = scene.length; } };
    function step(now) {
      var dt = Math.min(0.05, (now - last) / 1000); last = now;
      var budget = Math.max(2, Math.round(dt * 520)); if (si >= 60) budget = Math.round(budget * 1.5);
      while (budget > 0 && si < scene.length) {
        var s = scene[si], left = s.pts.length - pi; if (left <= 0) { strokes.push(s); renderStroke(gctx, s); lctx.clearRect(0, 0, W, H); si++; pi = 0; budget--; continue; }
        var take = Math.min(left, budget); pi += take; budget -= take;
        lctx.clearRect(0, 0, W, H); renderStroke(lctx, s, pi);
        if (pi >= s.pts.length) { strokes.push(s); renderStroke(gctx, s); lctx.clearRect(0, 0, W, H); si++; pi = 0; }
        else if (nozzle) { var q = s.pts[pi - 1], b = view.getBoundingClientRect(); nozzle.style.cssText = 'display:block;left:' + (q.x * b.width / W) + 'px;top:' + (q.y * b.height / H) + 'px'; }
      }
      dirty = true;
      if (si >= scene.length) { if (nozzle) nozzle.style.display = 'none'; anim = null; updateButtons(); if (onDone) onDone(); return; }
      anim.raf = requestAnimationFrame(step);
    }
    anim.raf = requestAnimationFrame(step);
  }
  function cancelAnim() { if (anim) { cancelAnimationFrame(anim.raf); anim.skip(); anim = null; var n = document.getElementById('ckNozzle'); if (n) n.style.display = 'none'; lctx.clearRect(0, 0, W, H); dirty = true; } }

  // ---------------------------------------------------------------- UI
  var $ = function (id) { return document.getElementById(id); };
  function say(who, txt, mine) { var b = document.createElement('div'); b.className = 'bub ' + (mine ? 'me' : 'ai'); var n = document.createElement('b'); n.textContent = who; var p = document.createElement('span'); p.textContent = txt; b.appendChild(n); b.appendChild(p); $('ckChat').appendChild(b); $('ckChat').scrollTop = 1e6; }
  function showTools(on) { $('ckTools').hidden = !on; }
  function generate() {
    if (anim) return;
    var prompt = WL.Wishes.clean($('ckPrompt').value, 140) || 'Print me and Myster Y. Deep slaying through the dungeon on my birthday cake';
    $('ckChat').innerHTML = ''; say('Kerry', prompt, true); showTools(false); $('ckGo').disabled = true; strokes = []; redoStack = []; rerender();
    var prog = $('ckProgress'), bar = $('ckBar'), st = $('ckStatus'); prog.hidden = false;
    var phases = ['Tokenising buttercream…', 'Consulting the Simulation…', 'Upscaling sprinkles…', 'Hallucinating a dungeon…', 'Finalising pixels…'], t0 = performance.now(), dur = 3600;
    (function tick() {
      var f = Math.min(1, (performance.now() - t0) / dur); bar.style.width = (f * 97).toFixed(0) + '%'; st.textContent = phases[Math.min(phases.length - 1, Math.floor(f * phases.length))] + ' ' + (f * 97).toFixed(0) + '%';
      if (f < 1) return setTimeout(tick, 60);
      st.textContent = 'Error 418: there is no AI. There is only a person.'; bar.style.width = '100%'; bar.classList.add('err');
      setTimeout(function () {
        prog.hidden = true; bar.classList.remove('err'); bar.style.width = '0';
        WL.UI.playScene('cake', function () { reveal(); });
      }, 900);
    })();
  }
  function reveal() {
    say('Myster Y. Deep', 'Wrong chat. This isn\'t an AI cake maker, it\'s me with a piping bag. Hold still.', false);
    startAnimation(function () { say('Cake·AI™', 'Hand-drawn, stroke by stroke. 0% AI, 100% icing. Now it\'s your turn: add your own bits.', false); showTools(true); $('ckGo').disabled = false; WL.Audio.sfx('win'); });
    showTools(false);
  }
  function blank() { cancelAnim(); strokes = []; redoStack = []; rerender(); $('ckChat').innerHTML = ''; say('Cake·AI™', 'Blank cake ready. Draw with a mouse, finger or S-Pen. Pen eraser end / barrel button rubs out.', false); showTools(true); }
  function renderPalette() {
    var box = $('ckPalette'); box.innerHTML = '';
    PALETTE.forEach(function (c) { var b = document.createElement('button'); b.type = 'button'; b.className = 'sw' + (c === color && tool === 'pen' ? ' sel' : ''); b.style.background = c; b.setAttribute('aria-label', 'Icing colour ' + c); b.onclick = function () { color = c; tool = 'pen'; renderPalette(); renderTool(); }; box.appendChild(b); });
  }
  function renderTool() { $('ckPen').classList.toggle('on', tool === 'pen'); $('ckErase').classList.toggle('on', tool === 'eraser'); }
  function exportCanvas(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; var g = c.getContext('2d'); g.drawImage(base, 0, 0, w, h); g.drawImage(layer, 0, 0, w, h); return c; }
  function build() {
    base = document.createElement('canvas'); layer = document.createElement('canvas'); live = document.createElement('canvas');
    [base, layer, live].forEach(function (c) { c.width = W; c.height = H; });
    bctx = base.getContext('2d'); gctx = layer.getContext('2d'); lctx = live.getContext('2d');
    view = $('ckCanvas'); vctx = view.getContext('2d'); cursorEl = $('ckCursor'); drawBase();
    view.addEventListener('pointerdown', down); view.addEventListener('pointermove', move); view.addEventListener('pointerup', up); view.addEventListener('pointercancel', up);
    view.addEventListener('pointerleave', function () { cursorEl.style.display = 'none'; }); view.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    $('ckGo').onclick = generate; $('ckBlank').onclick = blank; $('ckSkip').onclick = function () { cancelAnim(); showTools(true); $('ckGo').disabled = false; };
    $('ckPen').onclick = function () { tool = 'pen'; renderTool(); renderPalette(); }; $('ckErase').onclick = function () { tool = 'eraser'; renderTool(); renderPalette(); };
    $('ckSize').oninput = function () { size = +this.value; };
    $('ckUndo').onclick = function () { if (strokes.length) { redoStack.push(strokes.pop()); rerender(); } };
    $('ckRedo').onclick = function () { if (redoStack.length) { strokes.push(redoStack.pop()); rerender(); } };
    $('ckClear').onclick = function () { if (strokes.length && confirm('Wipe the whole cake?')) { redoStack = []; strokes = []; rerender(); } };
    $('ckReplay').onclick = function () { cancelAnim(); showTools(false); startAnimation(function () { showTools(true); }); };
    $('ckSave').onclick = function () { exportCanvas(W, H).toBlob(function (b) { var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'kerrys-birthday-cake.png'; a.click(); }); };
    $('ckCard').onclick = function () { try { localStorage.setItem('wl.cake.v1', exportCanvas(400, 280).toDataURL('image/jpeg', 0.85)); WL.UI.toast('🎂 Cake is now on the birthday card cover!'); } catch (e) { WL.UI.toast('Could not save (storage full?)'); } };
    renderPalette(); renderTool(); raf = requestAnimationFrame(loop); built = true;
  }
  function open() { if (!built) build(); dirty = true; updateButtons(); if (!strokes.length && !anim) { $('ckChat').innerHTML = ''; say('Cake·AI™', 'Describe any picture and our advanced artificial intelligence will print it on your cake. (Terms apply. There are no terms.)', false); } }
  return { open: open, getSaved: function () { try { return localStorage.getItem('wl.cake.v1') || ''; } catch (e) { return ''; } }, stop: cancelAnim, strokesCount: function () { return strokes.length; }, _scene: function () { return buildScene(); } };
})();
