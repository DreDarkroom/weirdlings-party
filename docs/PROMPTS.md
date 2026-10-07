# Round-2 prompts (copy/paste)

Repos: `DreDarkroom/weirdlings-party` (game) and `DreDarkroom/stopiffy` (music service). Both zero-dependency static sites.
Live: https://dredarkroom.github.io/weirdlings-party/ · https://dredarkroom.github.io/stopiffy/
Constraint for ALL tasks: no build step, no frameworks, keep `WL` global namespace, keep the countdown visible on every screen, open one PR per task and keep PRs small.

---
## JULES (async GitHub tasks: paste one per task, repo `weirdlings-party` unless stated)

### J1: Automated playthrough tests
"Add a Playwright test suite in `tests/` (dev-dependency only; do not change the shipped site). Serve with `node serve.js`. Tests: (1) title screen shows the countdown banner and `.cd` elements on every screen (title, select, settings, help, credits, pause, dj); (2) New Game → dialogue → level starts; (3) a bot playthrough using `WL.Game.step(1/60)` completes levels 0 and 1 with every character; (4) the fall-respawn loop cannot go on forever (hp decreases on each fall). Add a GitHub Action that runs it on PRs. Report any game bugs you find as issues instead of silently fixing gameplay."

### J2: Accessibility + mobile audit
"Audit the game against WCAG 2.2 AA and mobile usability: focus order, visible focus, aria labels on touch controls and canvas, reduced-motion handling (screen shake, glitch overlay, confetti), colour contrast of the banner/HUD/hidden `.whisper` text (must stay hidden-in-plain-sight but not hurt a11y: use aria-hidden where appropriate), 44px touch targets, safe-area insets, portrait handling. Fix what is safe, list the rest in docs/A11Y.md."

### J3: Gameplay polish: coyote/knockback/fairness
"Review js/game.js for fairness: enemy contact damage, invulnerability frames, boss patterns, knockback into gaps, respawn placement near turrets, jump feel. Add a `?debug=1` overlay (fps, hitboxes, seed). Add difficulty setting (Chill / Normal / Tribe-Hard) in Settings that scales enemy HP, damage and fire rates. Keep changes within game.js/ui.js/index.html."

### J4: Save data + settings robustness
"Wrap all localStorage use, add a version field to saved data, add a migration function, and add Reset-all. Add an in-game Stats screen (kills, vinyl, best time per level). Add unit tests for the save/migration module."

### J5: (repo `stopiffy`) More tracks, more styles, loop quality
"Extend js/SDK `public/sdk/stopiffy.js`: add styles `dnb`, `trance`, `lofi`, `electro`; add 12 more tracks tagged by mood; make track loops seamless (render N+1 bars and crossfade the tail into the head); add per-track `beatOffset` metadata for accurate beat-grid drawing; keep render time under 1s/track in Node. Regenerate `public/api/tracks.json` via `npm run build` and update docs/API.md. Add a test that renders every track and asserts non-silence, no NaN, peak ≤ 1."

### J6: (repo `stopiffy`) Real CC0 source adapter
"Add an optional second source type: tracks with `url` pointing to CC0 audio files (Internet Archive / Free Music Archive / OpenGameArt CC0 only). `Client.load()` should fetch+decode when `url` exists. Add a `LICENSES.md` ledger that requires a source link + licence proof for every file. Do not add any non-CC0 audio."

### J7: Spotify PKCE + Web Playback SDK (spike)
"Behind `WL.CONFIG.spotifyClientId`, implement Authorization Code with PKCE (no client secret), token refresh, and Spotify Web Playback SDK in `js/spotify.js` as a third 'Bo0m' deck exposing play/pause/next/volume (Premium required). Fall back to the existing embed when no client id/Premium. Write docs/SPOTIFY.md covering app registration, redirect URIs for the GitHub Pages URL, scopes (`streaming user-read-email user-read-private user-modify-playback-state`), and the DRM limitation (cannot beat-match or EQ)."

---
## ANTIGRAVITY (interactive IDE agent: open the `weirdlings-party` folder; give these as questions/tasks)

### A1: Game-feel review (ask it to play and critique)
"Run `node serve.js`, open the game in the integrated browser and play levels 1-3 as each of the five characters. Produce a prioritised list of game-feel problems (controls, camera, hit feedback, pacing, difficulty spikes) with concrete code changes in js/game.js. Then implement the top 5."

### A2: Art pass
"Replace the programmatic rectangles/circles with a cohesive pixel-art look WITHOUT external assets: generate sprite sheets procedurally onto offscreen canvases at startup (player x5 with walk/jump/shoot frames, walker, drone, turret, Overfit boss, tiles, vinyl, hearts, party door). Keep 60fps on a mid-range phone. Characters: DeeDarkgloom (purple, spiky black hair), Bo0m/Lucky Salvage (amber, cap), Hypnotized/Ilian (cyan, long white hair), Myster Y. Deep (green hoodie), Helix (rose, hair bun)."

### A3: Level design
"Add a hand-authored level format (ASCII maps in `js/levels/*.js`) alongside the procedural generator. Hand-build a 4th bonus level 'Kerry's Garden Party' with checkpoints, secrets, and a mini-boss (Dizzle-the-cake is NOT an enemy). Add a checkpoint system."

### A4: DJ booth upgrade (djay-style)
"Study `js/dj.js`. Add: beat-grid overlay and auto-detected first-beat offset, hot cues (4), pitch bend nudge buttons, per-deck filter knob (sweep), an Automix button that transitions deck A→B on the bar over 16 beats, a master VU meter, MIDI/Gamepad control mapping (Web MIDI + Gamepad API), and a record-to-WAV master capture. Keep it playable on tablets."

### A5: Cross-browser / device matrix
"Test in Chrome, Safari (iOS), Firefox, Edge; with keyboard, an Xbox controller, a DualSense, and touch. List bugs, fix input and audio-unlock issues (iOS silent switch, autoplay), and verify the PWA install flow."

---
## Questions to ask them (not tasks)
- Jules: "Which of the above PRs conflict with each other? Suggest a merge order."
- Antigravity: "What is the riskiest assumption in this architecture for a 10-minute party demo on a projector with a flaky venue wifi?"
