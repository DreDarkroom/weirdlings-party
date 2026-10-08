if (typeof WL === 'undefined') {
  var WL = {};
}
if (typeof window === 'undefined' && typeof global !== 'undefined') {
  global.WL = WL;
}

WL.Storage = (function () {
  var KEY = 'wl.data';
  var VERSION = 1;

  function tryGet(k) {
    try { return localStorage.getItem(k); } catch (e) { return null; }
  }

  function trySet(k, v) {
    try { localStorage.setItem(k, v); } catch (e) {}
  }

  function tryRemove(k) {
    try { localStorage.removeItem(k); } catch (e) {}
  }

  function getDefault() {
    return {
      version: VERSION,
      save: { charId: 'dee', unlocked: 0, part1Done: false, diff: 1 },
      audio: { music: 0.6, sfx: 0.8 },
      spotify: '',
      stats: { kills: 0, vinyl: 0, bestTimes: [] }
    };
  }

  function migrate(dataStr) {
    var def = getDefault();
    var obj = null;
    if (dataStr) {
      try { obj = JSON.parse(dataStr); } catch (e) {}
    }

    if (!obj) {
      // First time using the new unified storage format.
      // Try to migrate from legacy keys.
      obj = def;
      var oldSave = tryGet('wl.save');
      if (oldSave) {
        try {
          var s = JSON.parse(oldSave);
          if (s) {
            if (s.charId !== undefined) obj.save.charId = s.charId;
            if (s.unlocked !== undefined) obj.save.unlocked = s.unlocked;
            if (s.part1Done !== undefined) obj.save.part1Done = !!s.part1Done;
          }
        } catch (e) {}
      }
      var oldAudio = tryGet('wl.audio');
      if (oldAudio) {
        try {
          var a = JSON.parse(oldAudio);
          if (a) {
            if (a.music !== undefined) obj.audio.music = a.music;
            if (a.sfx !== undefined) obj.audio.sfx = a.sfx;
          }
        } catch (e) {}
      }
      var oldSpotify = tryGet('wl.spotify.url');
      if (oldSpotify) {
        obj.spotify = oldSpotify;
      }

      // Cleanup legacy keys
      tryRemove('wl.save');
      tryRemove('wl.audio');
      tryRemove('wl.spotify.url');

    } else {
      // We have an object, ensure all required fields exist
      if (!obj.save) obj.save = def.save;
      else {
        if (obj.save.charId === undefined) obj.save.charId = def.save.charId;
        if (obj.save.unlocked === undefined) obj.save.unlocked = def.save.unlocked;
        if (obj.save.part1Done === undefined) obj.save.part1Done = def.save.part1Done;
        if (obj.save.diff === undefined) obj.save.diff = def.save.diff;
      }

      if (!obj.audio) obj.audio = def.audio;
      else {
        if (obj.audio.music === undefined) obj.audio.music = def.audio.music;
        if (obj.audio.sfx === undefined) obj.audio.sfx = def.audio.sfx;
      }

      if (obj.spotify === undefined) obj.spotify = def.spotify;

      if (!obj.stats) obj.stats = def.stats;
      else {
        if (obj.stats.kills === undefined) obj.stats.kills = def.stats.kills;
        if (obj.stats.vinyl === undefined) obj.stats.vinyl = def.stats.vinyl;
        if (!Array.isArray(obj.stats.bestTimes)) obj.stats.bestTimes = def.stats.bestTimes;
      }

      obj.version = VERSION;
    }

    return obj;
  }

  function load() {
    var dataStr = tryGet(KEY);
    var migrated = migrate(dataStr);
    save(migrated);
    return migrated;
  }

  function save(data) {
    data.version = VERSION;
    trySet(KEY, JSON.stringify(data));
  }

  function resetAll() {
    tryRemove(KEY);
    tryRemove('wl.save');
    tryRemove('wl.audio');
    tryRemove('wl.spotify.url');
    // v0.2 keys: dev flag, wishes saved on this device, cake picture, workshop votes, dev-lab drafts
    ['wl.dev', 'wl.wishes.v1', 'wl.cake.v1', 'wl.votes', 'wl.lab.local', 'wl.music'].forEach(tryRemove);
  }

  var api = {
    load: load,
    save: save,
    resetAll: resetAll,
    migrate: migrate,
    VERSION: VERSION
  };
  return api;
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = WL.Storage;
}
