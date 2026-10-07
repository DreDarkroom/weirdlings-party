# Roadmap

## v0.1 (shipped): playable vertical slice
Countdown everywhere · 3 levels · 5 characters · boss · story · DJ booth (Stopiffy decks + Spotify embed) · PWA · keyboard/gamepad/touch.

## Before the party (Fri 9 Oct 2026)
- [ ] Confirm party hour + time zone, edit `partyISO` in `js/config.js`
- [ ] Human listening pass on all 12 Stopiffy tracks; tweak seeds/styles
- [ ] Test on real phone + controller + projector laptop; add venue offline fallback (installed PWA)
- [ ] Decide: should Bo0m's Spotify use a pre-loaded playlist link? (set default in `js/spotify.js`)

## Next
- Pixel-art pass (procedural sprites) · hand-made levels + checkpoints · difficulty modes
- DJ: beat grid, hot cues, automix, record · Spotify PKCE + Web Playback SDK
- Tests + CI · accessibility audit · Stopiffy: more styles/tracks/real CC0 adapter
- Multiplayer co-op at the party? (local 2P on one keyboard/pads)

## Decisions log
- Vanilla JS, no build: fastest path to deploy; revisit if the codebase outgrows globals.
- Stopiffy is a separate repo/service so other projects can reuse it; game vendors a copy of the SDK (`js/stopiffy.js`).
- Spotify: embed-only for pass 1 (DRM prevents mixing). 
- Tracks rendered by direct DSP (graph-based OfflineAudioContext took 6–13s per track; now ~0.4s).
