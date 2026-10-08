const assert = require('assert');

// Mock localStorage
const mockStorage = {};
global.localStorage = {
  getItem: (k) => mockStorage[k] || null,
  setItem: (k, v) => { mockStorage[k] = String(v); },
  removeItem: (k) => { delete mockStorage[k]; }
};

const Storage = require('../js/storage.js');

function resetMock() {
  for (let key in mockStorage) {
    delete mockStorage[key];
  }
}

// Test 1: Empty state -> gets defaults and saves them
resetMock();
let data = Storage.load();
assert.strictEqual(data.version, 1);
assert.strictEqual(data.save.charId, 'dee');
assert.strictEqual(data.audio.music, 0.6);
assert.strictEqual(data.stats.kills, 0);
assert.strictEqual(mockStorage['wl.data'], JSON.stringify(data));

// Test 2: Migration from old keys
resetMock();
global.localStorage.setItem('wl.save', JSON.stringify({ charId: 'helix', unlocked: 2 }));
global.localStorage.setItem('wl.audio', JSON.stringify({ music: 0.1, sfx: 0.2 }));
global.localStorage.setItem('wl.spotify.url', 'test_url');

data = Storage.load();
assert.strictEqual(data.save.charId, 'helix');
assert.strictEqual(data.save.unlocked, 2);
assert.strictEqual(data.audio.music, 0.1);
assert.strictEqual(data.spotify, 'test_url');

// Test 3: Old keys are removed after migration
assert.strictEqual(mockStorage['wl.save'], undefined);
assert.strictEqual(mockStorage['wl.audio'], undefined);
assert.strictEqual(mockStorage['wl.spotify.url'], undefined);
assert.ok(mockStorage['wl.data']);

// Test 4: Broken JSON fallback
resetMock();
global.localStorage.setItem('wl.data', '{broken: json}');
global.localStorage.setItem('wl.save', JSON.stringify({ charId: 'boom' })); // Should fallback to migrating this since data is broken
data = Storage.load();
assert.strictEqual(data.save.charId, 'boom');

// Test 5: Incomplete data in existing 'wl.data' gets default values filled in
resetMock();
global.localStorage.setItem('wl.data', JSON.stringify({ version: 1, save: { charId: 'boom' } })); // Missing audio, stats, spotify, save.unlocked
data = Storage.load();
assert.strictEqual(data.save.charId, 'boom');
assert.strictEqual(data.save.unlocked, 0); // Default filled
assert.strictEqual(data.audio.music, 0.6); // Default filled
assert.strictEqual(data.stats.kills, 0); // Default filled
assert.deepStrictEqual(data.stats.bestTimes, []);

// Test 6: resetAll
resetMock();
Storage.save(Storage.migrate(null)); // Create some data
assert.ok(mockStorage['wl.data']);
global.localStorage.setItem('wl.save', 'junk');
Storage.resetAll();
assert.strictEqual(mockStorage['wl.data'], undefined);
assert.strictEqual(mockStorage['wl.save'], undefined);

// Test: Part 2 progress (part1Done) defaults, migrates and survives; reset clears v0.2 keys
resetMock();
data = Storage.load();
assert.strictEqual(data.save.part1Done, false);
global.localStorage.setItem('wl.data', JSON.stringify({ version: 1, save: { charId: 'dee', unlocked: 3 } }));
assert.strictEqual(Storage.load().save.part1Done, false);
resetMock();
global.localStorage.setItem('wl.save', JSON.stringify({ charId: 'dee', unlocked: 3, part1Done: true }));
assert.strictEqual(Storage.load().save.part1Done, true);
global.localStorage.setItem('wl.wishes.v1', '[]'); global.localStorage.setItem('wl.cake.v1', 'x'); global.localStorage.setItem('wl.dev', '1');
Storage.resetAll();
global.localStorage.setItem('wl.music', '{}');
Storage.resetAll();
['wl.wishes.v1', 'wl.cake.v1', 'wl.dev', 'wl.music'].forEach((k) => assert.strictEqual(mockStorage[k], undefined));

// Difficulty defaults to Normal (1) and is preserved when saved
resetMock();
data = Storage.load();
assert.strictEqual(data.save.diff, 1);
data.save.diff = 2; Storage.save(data);
assert.strictEqual(Storage.load().save.diff, 2);

console.log('All tests passed!');
