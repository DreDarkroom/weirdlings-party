// Cloudflare Worker: shared birthday wishes + feedback for the Weirdlings game.
// Storage: one KV namespace bound as WISHES. No third-party services, no user accounts.
//   GET    /wishes?to=kerry|mick         public: newest 200 wishes
//   POST   /wishes {to,name,msg,emoji}   public: rate-limited per IP
//   DELETE /wishes/:id?to=kerry          admin: header x-admin-token
//   POST   /feedback {kind,title,body}   public: rate-limited per IP
//   GET    /feedback                     admin: header x-admin-token
// Secrets: ADMIN_TOKEN (wrangler secret put ADMIN_TOKEN). Var: ALLOWED_ORIGIN.
const TO = ['kerry', 'mick'];
const EMOJI = ['🎂', '🎉', '🥳', '🎈', '🎧', '💜', '🔥', '✨'];
const clean = (s, n) => String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);

function cors(env, req) {
  const origin = req.headers.get('origin') || '';
  const ok = origin === env.ALLOWED_ORIGIN || /^http:\/\/localhost(:\d+)?$/.test(origin);
  return {
    'access-control-allow-origin': ok ? origin : env.ALLOWED_ORIGIN,
    'access-control-allow-methods': 'GET,POST,DELETE,OPTIONS',
    'access-control-allow-headers': 'content-type,x-admin-token',
    'vary': 'origin'
  };
}
const json = (env, req, body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...cors(env, req) } });

async function limited(env, req, bucket, seconds) {
  const ip = req.headers.get('cf-connecting-ip') || 'unknown', key = `rl:${bucket}:${ip}`;
  if (await env.WISHES.get(key)) return true;
  await env.WISHES.put(key, '1', { expirationTtl: Math.max(60, seconds) });   // KV minimum TTL is 60s
  return false;
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url), path = url.pathname;
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(env, req) });
    const secret = String(env.ADMIN_TOKEN || '').trim(), sent = (req.headers.get('x-admin-token') || '').trim();
    const admin = !!secret && sent === secret;

    if (path === '/wishes' && req.method === 'GET') {
      const to = url.searchParams.get('to');
      if (!TO.includes(to)) return json(env, req, { error: 'bad card' }, 400);
      const list = await env.WISHES.list({ prefix: `w:${to}:`, limit: 200 });
      const wishes = (await Promise.all(list.keys.map(k => env.WISHES.get(k.name, 'json')))).filter(Boolean);
      return json(env, req, { wishes });
    }
    if (path === '/wishes' && req.method === 'POST') {
      let b; try { b = await req.json(); } catch { return json(env, req, { error: 'bad json' }, 400); }
      if (!TO.includes(b.to)) return json(env, req, { error: 'bad card' }, 400);
      const msg = clean(b.msg, 280); if (msg.length < 2) return json(env, req, { error: 'too short' }, 400);
      if (await limited(env, req, 'wish', 60)) return json(env, req, { error: 'slow down' }, 429);
      const ts = Date.now(), id = `${ts}-${crypto.randomUUID().slice(0, 6)}`;
      const wish = { id, to: b.to, name: clean(b.name, 40) || 'A friend', msg, emoji: EMOJI.includes(b.emoji) ? b.emoji : '🎉', ts };
      await env.WISHES.put(`w:${b.to}:${String(ts).padStart(15, '0')}-${id}`, JSON.stringify(wish));
      return json(env, req, { ok: true, wish }, 201);
    }
    const del = path.match(/^\/wishes\/([\w-]+)$/);
    if (del && req.method === 'DELETE') {
      if (!admin) return json(env, req, { error: 'forbidden' }, 403);
      const to = url.searchParams.get('to'), list = await env.WISHES.list({ prefix: `w:${to}:` });
      const hit = list.keys.find(k => k.name.endsWith(del[1]));
      if (hit) await env.WISHES.delete(hit.name);
      return json(env, req, { ok: !!hit });
    }
    if (path === '/feedback' && req.method === 'POST') {
      let b; try { b = await req.json(); } catch { return json(env, req, { error: 'bad json' }, 400); }
      if (await limited(env, req, 'fb', 60)) return json(env, req, { error: 'slow down' }, 429);
      const ts = Date.now(), item = { ts, kind: clean(b.kind, 20) || 'idea', title: clean(b.title, 100), body: clean(b.body, 2000) };
      if (item.body.length < 3) return json(env, req, { error: 'too short' }, 400);
      await env.WISHES.put(`f:${String(ts).padStart(15, '0')}-${crypto.randomUUID().slice(0, 6)}`, JSON.stringify(item));
      return json(env, req, { ok: true }, 201);
    }
    if (path === '/feedback' && req.method === 'GET') {
      if (!admin) return json(env, req, { error: 'forbidden' }, 403);
      const list = await env.WISHES.list({ prefix: 'f:', limit: 500 });
      return json(env, req, { feedback: (await Promise.all(list.keys.map(k => env.WISHES.get(k.name, 'json')))).filter(Boolean) });
    }
    return json(env, req, { service: 'weirdlings-wishes', ok: true });
  }
};
