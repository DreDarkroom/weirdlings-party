// Spotify integration, pass 1: embed-only.
// Why not mix Spotify through the decks? Spotify audio is DRM-protected and cannot be routed into the
// Web Audio graph, so no EQ/sync. Real in-app mixing needs a licensed SDK (what djay uses natively).
// Plan for pass 2: Authorization-Code-with-PKCE login + Web Playback SDK (Premium) for play/pause/volume
// control of a "Bo0m" deck that you fade manually against the Stopiffy decks. Set WL.CONFIG.spotifyClientId.
WL.Spotify = (function () {
  var KEY = 'wl.spotify.url';
  function parse(url) {
    var m = String(url || '').match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?(track|playlist|album|episode|show|artist)\/([A-Za-z0-9]+)/);
    return m ? { type: m[1], id: m[2] } : null;
  }
  function embedSrc(url) { var p = parse(url); return p ? 'https://open.spotify.com/embed/' + p.type + '/' + p.id + '?theme=0' : null; }
  function remembered() { try { return localStorage.getItem(KEY) || ''; } catch (e) { return ''; } }
  function remember(u) { try { localStorage.setItem(KEY, u); } catch (e) {} }
  return { parse: parse, embedSrc: embedSrc, remembered: remembered, remember: remember, hasOAuth: function () { return !!WL.CONFIG.spotifyClientId; } };
})();
