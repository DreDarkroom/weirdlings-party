# Weirdlings: Road to Kerry's Party

A browser 2D platform shooter for the **Weirdlings Anti-AI Tribe**. Reach Kerry Queenslayer's birthday party,
shoot the Clankers, beat the Overfit, then take over the decks. A cake countdown is visible on **every** screen
(banner, HUD, in-world billboards, tab title, menus, settings, help, and a few hidden spots).

**Party time:** Friday 9 Oct 2026, **7pm UK** (`js/config.js` → `partyISO`, fixed +01:00 so it's the same for everyone). The countdown runs to doors/Bo0m's Spotify playlist; once live, the banner shows who's playing and who's next.

## Run
```bash
node serve.js        # http://localhost:4200  (any static host works; no build step)
```

## Platforms and input
| Platform | Notes |
|---|---|
| PC / Mac | Keyboard (WASD/arrows, Space, J/X, Esc) |
| Controller | Gamepad API: stick/d-pad, A/B jump, X/Y/RT fire, Start pause, menu navigation |
| Phone / tablet | On-screen touch controls (landscape), installable PWA (`manifest.webmanifest`, `sw.js`) |

## Architecture (zero dependencies, classic scripts on a `WL` namespace)
- `js/config.js`: party date, service URLs
- `js/countdown.js`: single timer driving every `.cd` element, tab title, HUD, `.ics` export
- `js/input.js`: keyboard + gamepad + touch → `held/pressed`
- `js/game.js`: seeded level generator, physics, enemies, boss, render, 5 playable characters
- `js/audio.js`: sfx synth + music via Stopiffy
- `js/dj.js`: two-deck mixer (sync, EQ, loop, cue, crossfader, waveform)
- `js/spotify.js`: embed-only Spotify (see limits below)
- `js/ui.js`: screens, story dialogue, progress save, gamepad menu nav
- `js/stopiffy.js`: copy of the SDK from the sibling `stopiffy` project (**keep in sync**)

## DJ + Spotify
djay-style: two decks, crossfader, per-deck bass/treble, tempo + SYNC, cue, 4-beat loop. Decks play
**Stopiffy** (our CC0 generative music service, separate project). Spotify's audio is DRM-protected and cannot enter
the Web Audio graph, so Bo0m's panel is an **embed** you fade manually. Pass 2: PKCE login + Web Playback SDK.

## Testing
`WL.Game.step(dt)` advances the simulation without requestAnimationFrame (used by bot playthroughs in the browser console).

See `docs/` for the roadmap and AI hand-off prompts.

## v0.2 additions
- **Set list** (`js/setlist.js`): 7:00 Bo0m (Spotify playlist), 7:40 Myster Y. Deep, 9:00 Hypnotized, 10:20 DeeDarkgloom, 11:40 Helix till 1am. Each DJ is a playable character. Times shown in UK time + your local time.
- **Part 2: Mick Beach's birthday** (3 beach levels). Locked until Part 1's finale, or unlocked with Developer mode. Date TBC (`part2ISO`).
- **Sign book + birthday cards** (`js/wishes.js`): leave wishes for Kerry or Mick. Stored on-device until the Cloudflare Worker in `backend/` is deployed, then shared. All user text is rendered as plain text.
- **Cake·AI™** (`js/cake.js`): a fake "AI" cake maker. The picture is drawn stroke-by-stroke with hand tremor, uneven pressure and scribbled fills; then you can draw on the cake yourself. Stylus/S-Pen: pressure = thickness, tilt = nozzle width, eraser end / barrel button = erase, palm rejection. The artwork is a stroke list (replay/undo/redo), never a pre-made image.
- **Developer mode** (Settings): performance HUD (FPS/frame time, long tasks, CPU pressure where the browser offers it, heap, cores, device memory, battery, network, GPU, audio latency, entity counts), level jumper, god mode, hitboxes, time scale, scene player, party-clock simulator, unlock/lock Part 2, debug report. Browsers do not expose CPU/GPU temperature.
- **Workshop & Lab** (`js/lab.js`, `js/microgames/`): live and test micro-games, voting, feedback, Writers' Room, and a sandboxed Dev Lab. See [CONTRIBUTING.md](CONTRIBUTING.md).
