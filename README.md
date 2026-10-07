# Weirdlings: Road to Kerry's Party

A browser 2D platform shooter for the **Weirdlings Anti-AI Tribe**. Reach Kerry Queenslayer's birthday party,
shoot the Clankers, beat the Overfit, then take over the decks. A cake countdown is visible on **every** screen
(banner, HUD, in-world billboards, tab title, menus, settings, help, and a few hidden spots).

**Party time:** Friday 9 Oct 2026 (`js/config.js` → `partyISO`, local time, currently a 20:00 guess).

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
