# Party mode (auto-starts at 7pm UK, Fri 9 Oct 2026)

Shipped dormant. `WL.Party` watches the party clock (`partyISO` in js/config.js); the moment it passes, every open page flips on:
- **Deluxe audio** (Stopiffy `renderDeluxe`): stereo, sidechain pump, supersaw lead/pad, sub bass, ping-pong echo, room reverb, snare fills, risers + impacts. Same key/BPM/chords/drums as the standard mix (decks still sync) and level-matched to it. Rendered in a Web Worker, falls back to Standard if the device is too slow.
- **Visuals**: beat-synced light beams + disco ball, party hats / sunglasses / balloon drones, rainbow note bullets + trail, comic pops (POW! YEET! AI WHO?), balloons + emoji rain, rainbow banner, joke bubbles, launch show with airhorn + cheer.
- **Audio polish everywhere**: bus compressor, short room reverb on sound effects, new sfx (airhorn, cheer, pop, sparkle, boing).
- **Settings** (appear at party time): Party effects Wild / Chill / Off (Off by default if the device asks for reduced motion); Audio quality Auto / Deluxe / Standard.
- **Dev preview**: Developer menu → Party mode, or the party-clock simulator (e.g. "5 min before doors").
