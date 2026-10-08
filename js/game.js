// Core platform-shooter: levels, physics, entities, rendering.
WL.Game = (function () {
  'use strict';
  var W = 960, H = 540, T = 32, ROWS = 17, GROUND = 13;
  var canvas, cx, scaleK = 1;

  // ---------------------------------------------------------------- data
  var CHARS = {
    dee:     { id: 'dee',     name: 'DeeDarkgloom',    role: 'Forgetful DJ',   color: '#8b5cf6', hair: '#121212', hairStyle: 'spike', hp: 5, speed: 230, cd: 0.22, shot: 'forget', perk: 'Brain-fog Blaster: sometimes fires a triple spread… sometimes forgets to fire.' },
    boom:    { id: 'boom',    name: 'Lucky Salvage',   role: 'DJ Bo0m',        color: '#f59e0b', hair: '#5b3a12', hairStyle: 'cap',   hp: 5, speed: 235, cd: 0.22, shot: 'normal', luck: 0.2, perk: 'Lucky: 20% chance to shrug off any hit.' },
    hypno:   { id: 'hypno',   name: 'Ilian',           role: 'DJ Hypnotized',  color: '#22d3ee', hair: '#e5e7eb', hairStyle: 'long',  hp: 5, speed: 225, cd: 0.3,  shot: 'pierce', perk: 'Hypno-rings pierce through every Clanker in a line.' },
    myster:  { id: 'myster',  name: 'Myster Y. Deep',  role: 'DJ',             color: '#10b981', hair: '#0b3b2c', hairStyle: 'hood',  hp: 6, speed: 215, cd: 0.38, shot: 'big',    perk: 'Deep bass shots: slow, heavy, double damage, extra health.' },
    helix:   { id: 'helix',   name: 'Helix',           role: 'DJ',             color: '#f43f5e', hair: '#fda4af', hairStyle: 'bun',   hp: 3, speed: 255, cd: 0.13, shot: 'helix',  perk: 'Double-strand rapid fire. Fast, fragile.' }
  };
  var LEVELS = [
    { name: 'Tribe Trail',          seed: 11, cols: 110, gapEvery: 20, maxGap: 4, enemyEvery: 9, sky: ['#1b0b3a', '#7a1fa2'], neon: '#ff4fd8', ground: '#2a1450', bgm: 'weirdling-walk', glitch: 0 },
    { name: 'Glitch Highway',       seed: 22, cols: 140, gapEvery: 15, maxGap: 4, enemyEvery: 7, sky: ['#021522', '#0b6a8f'], neon: '#38f2c1', ground: '#0b2a3a', bgm: 'glitch-highway', glitch: 1 },
    { name: 'The Overfit Gate',     seed: 33, cols: 90,  gapEvery: 16, maxGap: 3, enemyEvery: 7, sky: ['#1a0000', '#8a1c1c'], neon: '#ffd23f', ground: '#3a1010', bgm: 'overfit-boss',   glitch: 2, boss: true },
    // ---- Part 2: Mick Beach's birthday ----
    { name: 'Shoreline Shuffle',    seed: 44, cols: 120, gapEvery: 18, maxGap: 4, enemyEvery: 8, sky: ['#ff7e5f', '#5b2a86'], neon: '#ffd23f', ground: '#7a5a2b', bgm: 'shoreline-shuffle', glitch: 0, part: 2, beach: true },
    { name: 'Pier Pressure',        seed: 55, cols: 150, gapEvery: 14, maxGap: 4, enemyEvery: 7, sky: ['#0f2027', '#2c5364'], neon: '#38f2c1', ground: '#3b2f1d', bgm: 'pier-pressure',     glitch: 1, part: 2, beach: true },
    { name: 'The Tidal Overfit',    seed: 66, cols: 90,  gapEvery: 16, maxGap: 3, enemyEvery: 7, sky: ['#232526', '#c0392b'], neon: '#ffd23f', ground: '#3a2a12', bgm: 'overfit-boss',      glitch: 2, boss: true, bossName: 'TIDAL OVERFIT', part: 2, beach: true }
  ];

  function rng(seed) { var a = seed >>> 0; return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  // ---------------------------------------------------------------- state
  var S = null, running = false, paused = false, last = 0, tAll = 0, onEnd = null, attractX = 0, shake = 0;

  function build(li) {
    var spec = LEVELS[li], r = rng(spec.seed);
    var cols = spec.cols + (spec.boss ? 30 : 0);
    var grid = new Uint8Array(cols * ROWS), gap = [];
    for (var i = 0; i < cols; i++) gap[i] = false;
    var x = 14, gaps = [];
    while (x < spec.cols - 14) {
      x += Math.floor(spec.gapEvery * 0.5 + r() * spec.gapEvery * 0.6);
      if (x >= spec.cols - 14) break;
      var gw = 2 + Math.floor(r() * (spec.maxGap - 1));
      for (var k = 0; k < gw; k++) gap[x + k] = true;
      gaps.push({ x: x, w: gw }); x += gw + 4;
    }
    function put(cx_, cy, v) { if (cx_ >= 0 && cx_ < cols && cy >= 0 && cy < ROWS) grid[cy * cols + cx_] = v; }
    for (x = 0; x < cols; x++) if (!gap[x]) for (var y = GROUND; y < ROWS; y++) put(x, y, 1);
    var nearGap = function (cx_, m) { for (var d = -m; d <= m; d++) if (gap[cx_ + d]) return true; return false; };
    var items = [], enemies = [], signs = [];
    // blocks / steps
    for (x = 16; x < spec.cols - 16; x += 5 + Math.floor(r() * 7)) {
      if (nearGap(x, 3) || nearGap(x + 3, 3) || r() < 0.45) continue;
      var bw = 2 + Math.floor(r() * 2), bh = 1 + Math.floor(r() * 2);
      for (var bx = 0; bx < bw; bx++) for (var by = 0; by < bh; by++) put(x + bx, GROUND - 1 - by, 1);
      for (bx = 0; bx < bw; bx++) items.push({ type: 'vinyl', x: (x + bx) * T + 10, y: (GROUND - bh - 1) * T + 6 });
    }
    // platforms (one-way = 2)
    gaps.forEach(function (g) {
      if (r() < 0.55) {
        var py = r() < 0.5 ? 10 : 11, px = g.x - 1, pw = g.w + 2;
        for (var q = 0; q < pw; q++) put(px + q, py, 2);
        for (q = 0; q < pw; q++) items.push({ type: 'vinyl', x: (px + q) * T + 10, y: (py - 1) * T + 6 });
      } else {
        for (var a = 0; a < g.w; a++) items.push({ type: 'vinyl', x: (g.x + a) * T + 10, y: (GROUND - 3 - Math.sin(a / Math.max(1, g.w - 1) * Math.PI) * 1.5) * T });
      }
    });
    for (x = 20; x < spec.cols - 18; x += 10 + Math.floor(r() * 8)) {
      if (nearGap(x, 3)) continue;
      var pw2 = 3 + Math.floor(r() * 3), py2 = r() < 0.4 ? 8 : 10;
      for (var q2 = 0; q2 < pw2; q2++) put(x + q2, py2, 2);
      for (q2 = 0; q2 < pw2; q2++) items.push({ type: 'vinyl', x: (x + q2) * T + 10, y: (py2 - 1) * T + 6 });
      if (r() < 0.25) items.push({ type: 'heart', x: (x + 1) * T + 8, y: (py2 - 2) * T });
    }
    // enemies
    for (x = 18; x < spec.cols - 16; x += spec.enemyEvery + Math.floor(r() * 5)) {
      var roll = r();
      if (roll < 0.4 && !nearGap(x, 3)) enemies.push(mk('walker', x * T, (GROUND - 1) * T - 4));
      else if (roll < 0.62 && !nearGap(x, 2)) enemies.push(mk('turret', x * T, GROUND * T - 28));
      else enemies.push(mk('drone', x * T, 150 + r() * 120));
    }
    // billboards
    for (x = 5; x < spec.cols - 6; x += 26) if (!nearGap(x, 4) && !nearGap(x + 5, 1)) signs.push({ x: x * T, y: GROUND * T });
    // arena + boss
    var boss = null;
    if (spec.boss) {
      var ax = spec.cols + 2;
      boss = mk('boss', (ax + 12) * T, 130);
      enemies.push(boss);
      boss.arenaX = ax * T;
    }
    var goalCol = (spec.boss ? cols - 6 : spec.cols - 6);
    return {
      lv: li, spec: spec, grid: grid, cols: cols, enemies: enemies, items: items, signs: signs,
      bullets: [], ebullets: [], parts: [], boss: boss,
      goal: { x: goalCol * T, y: GROUND * T - 96, w: 64, h: 96, open: !spec.boss },
      stars: (function () { var rr = rng(7), a = []; for (var s = 0; s < 70; s++) a.push([rr() * 1400, rr() * 300, rr() * 1.6 + 0.4]); return a; })(),
      score: 0, vinyl: 0, time: 0, kills: 0, state: 'play', endT: 0
    };
  }
  function mk(type, x, y) {
    var base = { type: type, x: x, y: y, vx: 0, vy: 0, dir: -1, t: Math.random() * 6, cd: 1 + Math.random(), flash: 0, dead: false };
    if (type === 'walker') return Object.assign(base, { w: 26, h: 28, hp: 3, vx: -55, pts: 100 });
    if (type === 'drone')  return Object.assign(base, { w: 28, h: 22, hp: 2, y0: y, pts: 80 });
    if (type === 'turret') return Object.assign(base, { w: 28, h: 28, hp: 4, pts: 150 });
    return Object.assign(base, { w: 92, h: 78, hp: 40, maxhp: 40, pts: 1000, y0: y, active: false, summon: 4 });
  }
  function mkPlayer(ch) {
    return { x: 2 * T, y: (GROUND - 1) * T - 4, w: 22, h: 30, vx: 0, vy: 0, face: 1, onGround: false, coyote: 0, buf: 0, cd: 0, inv: 0, hp: ch.hp, maxhp: ch.hp, safe: { x: 2 * T, y: (GROUND - 1) * T - 4 }, safeT: 0, ch: ch, anim: 0 };
  }

  // ---------------------------------------------------------------- collision
  function tile(tx, ty) { if (ty < 0) return 0; if (ty >= ROWS) return 0; if (tx < 0 || tx >= S.cols) return 1; return S.grid[ty * S.cols + tx]; }
  function moveX(e, dx) {
    e.x += dx; e.hitWall = false;
    var t0 = Math.floor(e.y / T), t1 = Math.floor((e.y + e.h - 0.01) / T), tx, ty;
    if (dx > 0) { tx = Math.floor((e.x + e.w) / T); for (ty = t0; ty <= t1; ty++) if (tile(tx, ty) === 1) { e.x = tx * T - e.w; e.vx = 0; e.hitWall = true; break; } }
    else if (dx < 0) { tx = Math.floor(e.x / T); for (ty = t0; ty <= t1; ty++) if (tile(tx, ty) === 1) { e.x = (tx + 1) * T; e.vx = 0; e.hitWall = true; break; } }
  }
  function moveY(e, dy) {
    var prevBottom = e.y + e.h; e.y += dy; e.onGround = false;
    var l0 = Math.floor(e.x / T), l1 = Math.floor((e.x + e.w - 0.01) / T), tx, ty;
    if (dy >= 0) {
      ty = Math.floor((e.y + e.h) / T);
      for (tx = l0; tx <= l1; tx++) { var v = tile(tx, ty); if (v === 1 || (v === 2 && prevBottom <= ty * T + 0.5 && !e.drop)) { e.y = ty * T - e.h; e.vy = 0; e.onGround = true; break; } }
    } else {
      ty = Math.floor(e.y / T);
      for (tx = l0; tx <= l1; tx++) if (tile(tx, ty) === 1) { e.y = (ty + 1) * T; e.vy = 0; break; }
    }
  }
  function hit(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }

  // ---------------------------------------------------------------- spawning helpers
  function burst(x, y, color, n, spd) {
    for (var i = 0; i < n; i++) { var a = Math.random() * 6.283, s = (0.3 + Math.random()) * (spd || 200); S.parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60, life: 0.5 + Math.random() * 0.5, color: color, size: 2 + Math.random() * 3 }); }
  }
  function confetti(n) {
    var cols = ['#ff4fd8', '#38f2c1', '#ffd23f', '#8b5cf6', '#f43f5e'];
    for (var i = 0; i < n; i++) S.parts.push({ x: Math.random() * W + (S.cam || 0), y: -10 - Math.random() * 200, vx: (Math.random() - 0.5) * 60, vy: 60 + Math.random() * 120, life: 4 + Math.random() * 3, color: cols[i % 5], size: 3 + Math.random() * 4, g: 0 });
  }
  function fire(p) {
    var ch = p.ch, I = WL.Input.held, dx = p.face, dy = 0;
    if (I.up) { dy = -1; if (!I.left && !I.right) dx = 0; }
    var len = Math.hypot(dx, dy) || 1; dx /= len; dy /= len;
    var ox = p.x + p.w / 2 + dx * 14, oy = p.y + 14 + dy * 10;
    function bullet(ang, extra) {
      var c = Math.cos(ang), s = Math.sin(ang), sp = 620;
      S.bullets.push(Object.assign({ x: ox, y: oy, vx: c * sp, vy: s * sp, t: 0, life: 0.85, dmg: 1, r: 5, color: ch.color, hits: [] }, extra || {}));
    }
    var a = Math.atan2(dy, dx);
    if (ch.shot === 'forget') { var q = Math.random(); if (q < 0.1) { WL.UI.say('…wait, what was I doing?'); return; } if (q < 0.4) { bullet(a - 0.22); bullet(a); bullet(a + 0.22); } else bullet(a); }
    else if (ch.shot === 'pierce') bullet(a, { pierce: true, r: 7, color: '#e0f7ff' });
    else if (ch.shot === 'big') bullet(a, { dmg: 2, r: 11, life: 0.7 });
    else if (ch.shot === 'helix') { var ax = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y'; bullet(a, { hv: true, ph: 0, axis: ax, r: 4 }); bullet(a, { hv: true, ph: Math.PI, axis: ax, r: 4, color: '#fff' }); }
    else bullet(a);
    WL.Audio.sfx('shoot');
  }
  function hurtPlayer(p, from) {
    if (WL.Dev && WL.Dev.flags.god) return;
    if (p.inv > 0 || S.state !== 'play') return;
    if (p.ch.luck && Math.random() < p.ch.luck) { p.inv = 0.6; WL.UI.say('Lucky! Salvaged that one.'); burst(p.x + 10, p.y + 10, '#ffd23f', 10); return; }
    p.hp--; p.inv = 1.3; p.vy = -320; p.vx = (p.x < from ? -1 : 1) * 260; shake = 0.25;
    WL.Audio.sfx('hurt'); burst(p.x + 10, p.y + 14, '#ff4d6d', 12);
    if (p.hp <= 0) { S.state = 'dead'; S.endT = 0; burst(p.x + 10, p.y + 14, p.ch.color, 40, 300); WL.Audio.sfx('boom'); }
  }
  function killEnemy(e) {
    e.dead = true; S.score += e.pts; S.kills++; WL.Audio.sfx('boom'); burst(e.x + e.w / 2, e.y + e.h / 2, e.type === 'boss' ? '#ffd23f' : '#ff7a59', e.type === 'boss' ? 80 : 18, e.type === 'boss' ? 400 : 220);
    if (Math.random() < 0.18 && e.type !== 'boss') S.items.push({ type: 'heart', x: e.x, y: e.y });
    if (e.type === 'boss') { S.goal.open = true; shake = 0.8; WL.UI.say('The Overfit overheated! The gate to the party is open!'); }
  }

  // ---------------------------------------------------------------- update
  function update(dt) {
    var p = S.player, I = WL.Input.held, P = WL.Input.pressed;
    S.time += dt;
    if (S.state === 'play') {
      var dir = (I.right ? 1 : 0) - (I.left ? 1 : 0);
      if (dir) p.face = dir;
      var target = dir * p.ch.speed, acc = p.onGround ? 2600 : 1500;
      p.vx += clamp(target - p.vx, -acc * dt, acc * dt);
      p.coyote = p.onGround ? 0.1 : p.coyote - dt;
      p.buf = P.jump ? 0.12 : p.buf - dt;
      if (p.buf > 0 && p.coyote > 0) { p.vy = -700; p.buf = 0; p.coyote = 0; WL.Audio.sfx('jump'); }
      if (!I.jump && p.vy < -220) p.vy += 2600 * dt;
      p.drop = I.down && I.jump;
      p.vy = Math.min(p.vy + 1800 * dt, 900);
      moveX(p, p.vx * dt); moveY(p, p.vy * dt);
      if (p.y > ROWS * T + 60) { p.inv = 0; hurtPlayer(p, p.x); if (S.state === 'play') { p.x = p.safe.x; p.y = p.safe.y; p.vx = p.vy = 0; p.inv = 1.5; } }
      if (p.onGround && (p.safeT -= dt) <= 0) { var sx = Math.floor((p.x + p.w / 2) / T); if (tile(sx - 1, GROUND) && tile(sx + 1, GROUND) && p.x > p.safe.x - 400) { p.safe = { x: p.x, y: p.y }; } p.safeT = 0.4; }
      p.cd -= dt; p.inv -= dt; p.anim += dt * (Math.abs(p.vx) / 60);
      if (I.fire && p.cd <= 0) { p.cd = p.ch.cd; fire(p); }
      p.x = clamp(p.x, 0, S.cols * T - p.w);
      // pickups
      S.items.forEach(function (it) {
        if (it.got) return;
        var bb = { x: it.x, y: it.y, w: 16, h: 16 };
        if (hit(p, bb)) {
          it.got = true; WL.Audio.sfx('pickup');
          if (it.type === 'vinyl') { S.vinyl++; S.score += 25; }
          else if (p.hp < p.maxhp) p.hp++; else S.score += 50;
          burst(it.x + 8, it.y + 8, '#ffd23f', 6, 120);
        }
      });
      // goal
      if (S.goal.open && hit(p, S.goal)) { S.state = 'win'; S.endT = 0; WL.Audio.sfx('win'); confetti(120); }
      else if (!S.goal.open && hit(p, S.goal) && !S.warned) { S.warned = 1; WL.UI.say('The gate is sealed by the Overfit! Defeat it first.'); }
    } else { S.endT += dt; }

    // player bullets
    S.bullets.forEach(function (b) {
      b.t += dt; b.life -= dt;
      if (b.hv) { var w = Math.cos(b.t * 30 + b.ph) * 240; if (b.axis === 'x') b.vy = w; else b.vx = w; }
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.life <= 0 || tile(Math.floor(b.x / T), Math.floor(b.y / T)) === 1) { b.dead = true; return; }
      S.enemies.forEach(function (e) {
        if (e.dead || b.dead || (b.hits.indexOf(e) >= 0)) return;
        if (b.x > e.x - b.r && b.x < e.x + e.w + b.r && b.y > e.y - b.r && b.y < e.y + e.h + b.r) {
          e.hp -= b.dmg; e.flash = 0.1; WL.Audio.sfx('hit'); burst(b.x, b.y, '#fff', 4, 120);
          if (e.type === 'boss' && !e.active) e.active = true;
          if (b.pierce) b.hits.push(e); else b.dead = true;
          if (e.hp <= 0) killEnemy(e);
        }
      });
    });
    // enemies
    S.enemies.forEach(function (e) {
      if (e.dead) return;
      e.t += dt; e.flash -= dt; e.cd -= dt;
      var dxp = p.x - e.x, near = Math.abs(dxp) < 520;
      if (e.type === 'walker') {
        if (!near) return;
        e.vy = Math.min(e.vy + 1800 * dt, 800);
        var ahead = tile(Math.floor((e.x + (e.vx > 0 ? e.w + 4 : -4)) / T), Math.floor((e.y + e.h + 4) / T));
        moveX(e, e.vx * dt); moveY(e, e.vy * dt);
        if (e.hitWall || (e.onGround && !ahead)) { e.vx = -e.vx || 55; e.x += Math.sign(e.vx) * 3; }
        else if (Math.abs(e.vx) < 1) e.vx = e.dir * 55;
      } else if (e.type === 'drone') {
        if (!near) return;
        var sp = Math.abs(dxp) < 320 ? 85 : 40; e.x += Math.sign(dxp) * sp * dt;
        e.y = e.y0 + Math.sin(e.t * 3) * 38 + (Math.abs(dxp) < 200 ? (p.y - e.y0) * 0.35 : 0);
      } else if (e.type === 'turret') {
        if (near && e.cd <= 0 && S.state === 'play') { e.cd = 1.8; shootAt(e, p, 230, 0); }
      } else if (e.type === 'boss') {
        if (!e.active && Math.abs(dxp) < 560) e.active = true;
        if (!e.active) return;
        var mid = e.arenaX + 13 * T, fast = e.hp < e.maxhp / 2;
        e.x = mid + Math.sin(e.t * (fast ? 1.2 : 0.8)) * 220 - e.w / 2;
        e.y = e.y0 + Math.sin(e.t * 1.7) * 30;
        if (e.cd <= 0) { e.cd = fast ? 1.0 : 1.6; for (var f = -2; f <= 2; f++) shootAt(e, p, 210, f * 0.22); }
        if ((e.summon -= dt) <= 0) { e.summon = fast ? 4 : 7; var d = mk('drone', e.x, e.y + 60); d.y0 = e.y + 60; S.enemies.push(d); }
      }
      if (S.state === 'play' && hit(p, e)) hurtPlayer(p, e.x + e.w / 2);
    });
    S.enemies = S.enemies.filter(function (e) { return !e.dead; });
    // enemy bullets
    S.ebullets.forEach(function (b) {
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (b.life <= 0 || tile(Math.floor(b.x / T), Math.floor(b.y / T)) === 1) b.dead = true;
      else if (S.state === 'play' && hit(p, { x: b.x - 5, y: b.y - 5, w: 10, h: 10 })) { b.dead = true; hurtPlayer(p, b.x); }
    });
    S.bullets = S.bullets.filter(function (b) { return !b.dead; });
    S.ebullets = S.ebullets.filter(function (b) { return !b.dead; });
    S.parts.forEach(function (q) { q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt; if (q.g !== 0) q.vy += 500 * dt; });
    S.parts = S.parts.filter(function (q) { return q.life > 0; });
    shake = Math.max(0, shake - dt);
    S.cam = clamp(p.x - W * 0.4, 0, S.cols * T - W);
    if (S.state === 'win' && S.endT < 3) { if (Math.random() < 0.3) confetti(4); }
    if ((S.state === 'win' && S.endT > 2.2) || (S.state === 'dead' && S.endT > 1.4)) finish();
  }
  function shootAt(e, p, spd, off) {
    var a = Math.atan2(p.y + 12 - (e.y + e.h / 2), p.x + 10 - (e.x + e.w / 2)) + off;
    S.ebullets.push({ x: e.x + e.w / 2, y: e.y + e.h / 2, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, life: 3 });
  }
  function finish() {
    if (!running) return;
    running = false;
    var res = { win: S.state === 'win', lv: S.lv, score: S.score, vinyl: S.vinyl, kills: S.kills, time: S.time };
    if (onEnd) onEnd(res);
  }

  // ---------------------------------------------------------------- render
  function sky(spec, cam, t) {
    var g = cx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, spec.sky[0]); g.addColorStop(1, spec.sky[1]);
    cx.fillStyle = g; cx.fillRect(0, 0, W, H);
    cx.fillStyle = 'rgba(255,255,255,.7)';
    var stars = S ? S.stars : [];
    for (var i = 0; i < stars.length; i++) { var s = stars[i]; cx.fillRect(((s[0] - cam * 0.05) % 1400 + 1400) % 1400 % W, s[1], s[2], s[2]); }
    // moon
    cx.fillStyle = 'rgba(255,240,255,.85)'; cx.beginPath(); cx.arc(780, 90, 34, 0, 6.283); cx.fill();
    if (spec.beach) { beachBg(spec, cam, t); return; }
    // skylines
    for (var layer = 0; layer < 2; layer++) {
      var par = layer ? 0.5 : 0.25, bw = layer ? 80 : 110, base = layer ? H - 120 : H - 190;
      cx.fillStyle = layer ? 'rgba(10,5,25,.75)' : 'rgba(30,10,60,.55)';
      var off = cam * par, first = Math.floor(off / bw);
      for (var b = first; b < first + W / bw + 2; b++) {
        var hsh = Math.abs(Math.sin(b * 12.9898 + layer * 7) * 43758.5453) % 1, bh = 70 + hsh * (layer ? 150 : 170);
        cx.fillRect(b * bw - off, base + (layer ? 40 : 0) - bh + 100, bw - 6, bh + 200);
        if (hsh > 0.5) { cx.fillStyle = spec.neon; cx.globalAlpha = 0.5; cx.fillRect(b * bw - off, base + (layer ? 40 : 0) - bh + 100, bw - 6, 2); cx.globalAlpha = 1; cx.fillStyle = layer ? 'rgba(10,5,25,.75)' : 'rgba(30,10,60,.55)'; }
      }
    }
  }
  function beachBg(spec, cam, t) {
    var sun = cx.createRadialGradient(700, 300, 10, 700, 300, 150); sun.addColorStop(0, 'rgba(255,240,170,.95)'); sun.addColorStop(1, 'rgba(255,200,120,0)');
    cx.fillStyle = sun; cx.fillRect(500, 120, 400, 400);
    cx.fillStyle = 'rgba(255,236,160,.95)'; cx.beginPath(); cx.arc(700, 300, 44, 0, 6.283); cx.fill();
    cx.fillStyle = 'rgba(15,45,100,.55)'; cx.fillRect(0, 330, W, H - 330);
    cx.strokeStyle = 'rgba(255,255,255,.18)'; cx.lineWidth = 2;
    for (var i = 0; i < 6; i++) { cx.beginPath(); for (var x = 0; x <= W; x += 20) { var y = 345 + i * 22 + Math.sin(x / 40 + t * 1.2 + i) * 3; if (x) cx.lineTo(x, y); else cx.moveTo(x, y); } cx.stroke(); }
    for (var k = 0; k < 7; k++) {
      var px = (((k * 230 - cam * 0.45) % 1610) + 1610) % 1610 - 120, base = 400;
      cx.strokeStyle = 'rgba(25,12,35,.85)'; cx.lineWidth = 7; cx.beginPath(); cx.moveTo(px, base); cx.quadraticCurveTo(px + 18, base - 70, px + 8, base - 130); cx.stroke();
      cx.lineWidth = 4; for (var l = -2; l <= 2; l++) { cx.beginPath(); cx.moveTo(px + 8, base - 130); cx.quadraticCurveTo(px + 8 + l * 22, base - 160 + Math.abs(l) * 8, px + 8 + l * 38, base - 120 + Math.abs(l) * 14 + Math.sin(t * 1.5 + k) * 3); cx.stroke(); }
    }
  }
  function drawPerson(x, y, w, h, face, ch, anim, moving, alpha) {
    cx.save(); cx.translate(x + w / 2, y); cx.scale(face, 1); if (alpha !== undefined) cx.globalAlpha = alpha;
    var bob = moving ? Math.abs(Math.sin(anim * 2)) * 2 : 0, leg = moving ? Math.sin(anim * 2) * 5 : 0;
    cx.fillStyle = '#222'; cx.fillRect(-7 + leg, h - 8, 6, 8); cx.fillRect(1 - leg, h - 8, 6, 8);
    cx.fillStyle = ch.color; cx.fillRect(-9, 11 - bob, 18, h - 19);
    cx.fillStyle = '#f2c9a0'; cx.beginPath(); cx.arc(0, 8 - bob, 8, 0, 6.283); cx.fill();
    cx.fillStyle = ch.hair;
    if (ch.hairStyle === 'spike') { for (var i = -2; i <= 2; i++) { cx.beginPath(); cx.moveTo(i * 3 - 3, 3 - bob); cx.lineTo(i * 3, -7 - bob); cx.lineTo(i * 3 + 3, 3 - bob); cx.fill(); } }
    else if (ch.hairStyle === 'cap') { cx.fillRect(-9, -1 - bob, 18, 5); cx.fillRect(2, 2 - bob, 11, 3); }
    else if (ch.hairStyle === 'long') { cx.fillRect(-9, -1 - bob, 18, 6); cx.fillRect(-10, 2 - bob, 5, 18); }
    else if (ch.hairStyle === 'hood') { cx.beginPath(); cx.arc(0, 7 - bob, 10, Math.PI, 0); cx.fill(); cx.fillRect(-10, 6 - bob, 4, 8); }
    else { cx.fillRect(-9, 0 - bob, 18, 4); cx.beginPath(); cx.arc(0, -4 - bob, 5, 0, 6.283); cx.fill(); }
    cx.fillStyle = '#111'; cx.fillRect(2, 6 - bob, 2, 3); cx.fillRect(-3, 6 - bob, 2, 3);
    cx.restore();
  }
  function drawEnemy(e, t) {
    cx.save(); var f = e.flash > 0;
    if (e.type === 'walker') {
      cx.fillStyle = f ? '#fff' : '#5a5f6b'; cx.fillRect(e.x, e.y, e.w, e.h - 6); cx.fillStyle = f ? '#fff' : '#3b3f49';
      var l = Math.sin(t * 10 + e.x) * 3; cx.fillRect(e.x + 3 + l, e.y + e.h - 8, 6, 8); cx.fillRect(e.x + e.w - 9 - l, e.y + e.h - 8, 6, 8);
      cx.fillStyle = '#ff2e63'; cx.fillRect(e.x + (e.vx > 0 ? 14 : 4), e.y + 6, 8, 6); cx.fillStyle = '#111'; cx.fillRect(e.x + 4, e.y + 16, e.w - 8, 3);
    } else if (e.type === 'drone') {
      cx.translate(e.x + e.w / 2, e.y + e.h / 2); cx.fillStyle = f ? '#fff' : '#6b7280'; cx.beginPath(); cx.ellipse(0, 0, 14, 9, 0, 0, 6.283); cx.fill();
      cx.fillStyle = '#ff2e63'; cx.beginPath(); cx.arc(0, 0, 4 + Math.sin(t * 8) , 0, 6.283); cx.fill();
      cx.strokeStyle = '#9ca3af'; cx.lineWidth = 2; cx.beginPath(); cx.moveTo(-14, -9); cx.lineTo(-22 + Math.sin(t * 40) * 3, -13); cx.moveTo(14, -9); cx.lineTo(22 - Math.sin(t * 40) * 3, -13); cx.stroke();
    } else if (e.type === 'turret') {
      cx.fillStyle = f ? '#fff' : '#4b5563'; cx.fillRect(e.x, e.y + 10, e.w, e.h - 10);
      var a = Math.atan2(S.player.y - e.y, S.player.x - e.x); cx.translate(e.x + 14, e.y + 10); cx.rotate(a); cx.fillStyle = f ? '#fff' : '#9ca3af'; cx.fillRect(0, -4, 20, 8);
    } else {
      cx.translate(e.x + e.w / 2, e.y + e.h / 2);
      cx.fillStyle = f ? '#fff' : '#3a3f4b'; cx.beginPath(); cx.ellipse(0, 0, 46, 38, 0, 0, 6.283); cx.fill();
      cx.strokeStyle = '#ffd23f'; cx.lineWidth = 3; cx.stroke();
      cx.fillStyle = '#ff2e63'; cx.beginPath(); cx.arc(0, -4, 14 + Math.sin(t * 6) * 2, 0, 6.283); cx.fill();
      cx.fillStyle = '#fff'; cx.font = 'bold 12px monospace'; cx.textAlign = 'center'; cx.fillText(S.spec.bossName || 'OVERFIT', 0, 28);
      cx.fillStyle = '#000a'; cx.fillRect(-44, -56, 88, 8); cx.fillStyle = '#ff2e63'; cx.fillRect(-44, -56, 88 * Math.max(0, e.hp / e.maxhp), 8);
    }
    cx.restore();
  }
  function drawSign(s, t) {
    cx.fillStyle = '#2b1b3d'; cx.fillRect(s.x + 14, s.y - 70, 6, 70); cx.fillRect(s.x + 130, s.y - 70, 6, 70);
    cx.fillStyle = '#12091f'; cx.fillRect(s.x, s.y - 128, 150, 60);
    cx.strokeStyle = S.spec.neon; cx.lineWidth = 3; cx.strokeRect(s.x, s.y - 128, 150, 60);
    cx.fillStyle = '#fff'; cx.textAlign = 'center'; cx.font = 'bold 12px system-ui,sans-serif'; cx.fillText('DJ CAKE CUT IN', s.x + 75, s.y - 108);
    cx.fillStyle = S.spec.neon; cx.font = 'bold 20px monospace'; cx.fillText(WL.Countdown.text(), s.x + 75, s.y - 82);
    cx.fillStyle = '#9a90b8'; cx.font = '10px system-ui'; cx.fillText('(hey Dee. yes, you.)', s.x + 75, s.y - 71);
    cx.textAlign = 'left';
  }
  function drawGoal(g, t) {
    cx.save();
    cx.fillStyle = g.open ? '#ffd23f' : '#555'; cx.fillRect(g.x - 6, g.y - 6, g.w + 12, g.h + 6);
    cx.fillStyle = g.open ? '#2a0a40' : '#222'; cx.fillRect(g.x, g.y, g.w, g.h);
    if (g.open) { var gr = cx.createRadialGradient(g.x + 32, g.y + 60, 4, g.x + 32, g.y + 60, 60); gr.addColorStop(0, '#ff4fd8'); gr.addColorStop(1, 'transparent'); cx.fillStyle = gr; cx.fillRect(g.x - 30, g.y - 20, g.w + 60, g.h + 40); }
    cx.fillStyle = '#fff'; cx.font = 'bold 12px system-ui'; cx.textAlign = 'center'; cx.fillText(g.open ? "KERRY'S PARTY" : 'SEALED', g.x + 32, g.y - 12);
    ['#ff4fd8', '#38f2c1', '#ffd23f'].forEach(function (c, i) { cx.fillStyle = c; cx.beginPath(); cx.arc(g.x - 18 + i * 36 + 18, g.y - 40 + Math.sin(t * 2 + i) * 4, 9, 0, 6.283); cx.fill(); });
    cx.restore();
  }
  function render(t) {
    var spec = S ? S.spec : LEVELS[0], cam = S ? S.cam : attractX;
    cx.setTransform(scaleK, 0, 0, scaleK, 0, 0);
    if (shake > 0) cx.translate((Math.random() - 0.5) * shake * 24, (Math.random() - 0.5) * shake * 24);
    sky(spec, cam, t);
    if (!S) return;
    cx.save(); cx.translate(-Math.floor(cam), 0);
    var c0 = Math.floor(cam / T), c1 = c0 + W / T + 2;
    for (var ty = 0; ty < ROWS; ty++) for (var tx = c0; tx <= c1 && tx < S.cols; tx++) {
      var v = S.grid[ty * S.cols + tx]; if (!v) continue;
      if (v === 1) {
        var top = tile(tx, ty - 1) === 0;
        cx.fillStyle = spec.ground; cx.fillRect(tx * T, ty * T, T, T);
        if (top) { cx.fillStyle = spec.neon; cx.fillRect(tx * T, ty * T, T, 3); cx.globalAlpha = 0.25; cx.fillRect(tx * T, ty * T + 3, T, 6); cx.globalAlpha = 1; }
        else { cx.fillStyle = 'rgba(255,255,255,.04)'; cx.fillRect(tx * T + 2, ty * T + 2, T - 4, T - 4); }
      } else { cx.fillStyle = spec.neon; cx.fillRect(tx * T, ty * T, T, 6); cx.globalAlpha = 0.3; cx.fillRect(tx * T, ty * T + 6, T, 8); cx.globalAlpha = 1; }
    }
    S.signs.forEach(function (s) { if (s.x > cam - 200 && s.x < cam + W + 50) drawSign(s, t); });
    drawGoal(S.goal, t);
    S.items.forEach(function (it) {
      if (it.got) return;
      var yb = Math.sin(t * 4 + it.x) * 3;
      if (it.type === 'vinyl') { cx.fillStyle = '#111'; cx.beginPath(); cx.arc(it.x + 8, it.y + 8 + yb, 8, 0, 6.283); cx.fill(); cx.fillStyle = '#ff4fd8'; cx.beginPath(); cx.arc(it.x + 8, it.y + 8 + yb, 3, 0, 6.283); cx.fill(); cx.strokeStyle = '#fff5'; cx.beginPath(); cx.arc(it.x + 8, it.y + 8 + yb, 6, 0.3, 1.5); cx.stroke(); }
      else { cx.fillStyle = '#ff4d6d'; cx.font = '20px sans-serif'; cx.fillText('♥', it.x, it.y + 16 + yb); }
    });
    S.enemies.forEach(function (e) { if (e.x > cam - 150 && e.x < cam + W + 150) drawEnemy(e, t); });
    var p = S.player;
    if (S.state !== 'dead') drawPerson(p.x, p.y, p.w, p.h, p.face, p.ch, p.anim, Math.abs(p.vx) > 20 && p.onGround, p.inv > 0 && Math.floor(t * 20) % 2 ? 0.4 : 1);
    S.bullets.forEach(function (b) { cx.fillStyle = b.color; cx.beginPath(); cx.arc(b.x, b.y, b.r, 0, 6.283); cx.fill(); cx.globalAlpha = 0.3; cx.beginPath(); cx.arc(b.x - b.vx * 0.02, b.y - b.vy * 0.02, b.r * 1.6, 0, 6.283); cx.fill(); cx.globalAlpha = 1; });
    S.ebullets.forEach(function (b) { cx.fillStyle = '#ff2e63'; cx.beginPath(); cx.arc(b.x, b.y, 5, 0, 6.283); cx.fill(); cx.strokeStyle = '#fff'; cx.lineWidth = 1; cx.stroke(); });
    if (WL.Dev && WL.Dev.flags.hitboxes) {
      cx.lineWidth = 1; cx.strokeStyle = '#38f2c1'; cx.strokeRect(p.x, p.y, p.w, p.h);
      cx.strokeStyle = '#ff4d6d'; S.enemies.forEach(function (e) { cx.strokeRect(e.x, e.y, e.w, e.h); }); cx.strokeRect(S.goal.x, S.goal.y, S.goal.w, S.goal.h);
    }
    S.parts.forEach(function (q) { cx.globalAlpha = Math.min(1, q.life * 2); cx.fillStyle = q.color; cx.fillRect(q.x, q.y, q.size, q.size); }); cx.globalAlpha = 1;
    cx.restore();
    // glitch overlay
    if (spec.glitch && Math.random() < 0.06 * spec.glitch) { for (var gi = 0; gi < 3; gi++) { cx.fillStyle = Math.random() < 0.5 ? 'rgba(255,0,200,.18)' : 'rgba(0,255,230,.18)'; cx.fillRect(0, Math.random() * H, W, 4 + Math.random() * 14); } }
    hud(t);
  }
  function hud(t) {
    var p = S.player; cx.textAlign = 'left';
    cx.fillStyle = 'rgba(0,0,0,.45)'; cx.fillRect(8, 8, 250, 54);
    cx.font = '22px sans-serif'; for (var i = 0; i < p.maxhp; i++) { cx.fillStyle = i < p.hp ? '#ff4d6d' : '#553'; cx.fillText('♥', 16 + i * 24, 36); }
    cx.fillStyle = '#fff'; cx.font = 'bold 14px system-ui,sans-serif';
    cx.fillText(p.ch.name + ' · ' + S.spec.name, 16, 54);
    cx.textAlign = 'right'; cx.fillText('SCORE ' + S.score + '   ● ' + S.vinyl, W - 12, 24);
    // countdown plate
    var txt = 'DJ CAKE: ' + WL.Countdown.text();
    cx.font = 'bold 18px monospace'; var tw = cx.measureText(txt).width + 24;
    cx.fillStyle = 'rgba(18,9,31,.8)'; cx.fillRect(W / 2 - tw / 2, 8, tw, 32);
    cx.strokeStyle = S.spec.neon; cx.lineWidth = 2; cx.strokeRect(W / 2 - tw / 2, 8, tw, 32);
    cx.fillStyle = '#fff'; cx.textAlign = 'center'; cx.fillText(txt, W / 2, 30);
    if (S.state === 'win') { cx.font = 'bold 56px system-ui'; cx.fillStyle = '#ffd23f'; cx.fillText('LEVEL CLEAR!', W / 2, H / 2); }
    if (S.state === 'dead') { cx.font = 'bold 56px system-ui'; cx.fillStyle = '#ff4d6d'; cx.fillText('GLITCHED OUT', W / 2, H / 2); }
    cx.textAlign = 'left';
  }

  // ---------------------------------------------------------------- loop
  function frame(ts) {
    requestAnimationFrame(frame);
    var rawDt = Math.min(0.05, (ts - last) / 1000 || 0); last = ts; tAll += rawDt;
    if (WL.Dev) WL.Dev.frame(rawDt * 1000);
    var dt = rawDt * (WL.Dev ? WL.Dev.flags.timeScale : 1);
    WL.Input.update();
    if (WL.UI && WL.UI.nav) WL.UI.nav();
    if (running && !paused) {
      if (WL.Input.pressed.pause) WL.UI.pause(true);
      else { update(dt / 2); update(dt / 2); }
    } else if (!running) { attractX += dt * 40; }
    if (running || !S || true) render(tAll);
  }
  function resize() {
    var st = document.getElementById('stage'); if (!st) return;
    var bw = st.clientWidth, bh = st.clientHeight, k = Math.min(bw / W, bh / H);
    var cw = Math.floor(W * k), ch = Math.floor(H * k), dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.style.width = cw + 'px'; canvas.style.height = ch + 'px';
    canvas.width = Math.floor(cw * dpr); canvas.height = Math.floor(ch * dpr); scaleK = canvas.width / W;
  }
  function init() {
    canvas = document.getElementById('game'); cx = canvas.getContext('2d');
    resize(); addEventListener('resize', resize); addEventListener('orientationchange', function () { setTimeout(resize, 200); });
    requestAnimationFrame(frame);
  }
  return {
    init: init, resize: resize, CHARS: CHARS, LEVELS: LEVELS,
    start: function (li, charId, cb) {
      S = build(li); S.player = mkPlayer(CHARS[charId] || CHARS.dee); S.cam = 0; onEnd = cb; running = true; paused = false; shake = 0;
    },
    stop: function () { running = false; S = null; },
    pause: function (v) { paused = v; },
    dev: {
      win: function () { if (S && S.state === 'play') { S.state = 'win'; S.endT = 0; WL.Audio.sfx('win'); confetti(120); } },
      killBoss: function () { if (S && S.boss && !S.boss.dead) { S.boss.hp = 0; killEnemy(S.boss); } },
      spawn: function (n) { if (!S) return; for (var i = 0; i < n; i++) { var d = mk('drone', S.player.x + 160 + i * 60, 140 + (i % 3) * 50); d.y0 = d.y; S.enemies.push(d); } },
      heal: function () { if (S) S.player.hp = S.player.maxhp; }
    },
    step: function (dt) { WL.Input.update(); update(dt); },  // test hook: advance simulation without rAF
    get running() { return running; },
    get state() { return S; },
    confettiBurst: function (n) { if (S) confetti(n); }
  };
})();
