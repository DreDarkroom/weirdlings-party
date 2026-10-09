// Network-first service worker: always try fresh code (party date matters), fall back to cache offline.
const CACHE = 'wl-v6';
const ASSETS = ['./', 'index.html', 'style.css', 'icon.svg', 'manifest.webmanifest', 'js/config.js', 'js/countdown.js', 'js/stopiffy.js', 'js/input.js', 'js/audio.js', 'js/spotify.js', 'js/dj.js', 'js/game.js', 'js/ui.js', 'js/main.js', 'js/setlist.js', 'js/dev.js', 'js/cake.js', 'js/music.js', 'js/party.js', 'js/wishes.js', 'js/lab.js', 'content/microgames.json', 'content/story.json', 'js/microgames/cake-catch.js', 'js/microgames/memory.js', 'js/microgames/beat-tap.js'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== CACHE).map(x => caches.delete(x)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request)));
});
