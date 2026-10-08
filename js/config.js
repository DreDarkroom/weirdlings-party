window.WL = window.WL || {};
WL.CONFIG = {
  // Everything is defined in UK time (the party's local time). The +01:00 offset (BST) makes the
  // countdown identical for every player, whatever their own time zone.
  tz: 'Europe/London',
  partyISO: '2026-10-09T19:00:00+01:00',      // 7pm Fri 9 Oct 2026: Bo0m's Spotify playlist kicks the night off
  partyEndISO: '2026-10-10T01:00:00+01:00',   // last set ends 1am
  part2ISO: '',                                // Mick Beach's birthday party: date TBC (leave '' until known)
  honoree: 'Kerry Queenslayer',
  // Deployed Stopiffy origin (empty = use the bundled catalogue).
  stopiffyBase: 'https://dredarkroom.github.io/stopiffy',
  // Shared wishes/feedback API (Cloudflare Worker in /backend). Empty = wishes stay on this device.
  apiBase: '',
  // Where "send feedback / suggest an idea" links open a pre-filled GitHub issue.
  issuesRepo: 'DreDarkroom/weirdlings-party',
  // Spotify app client id (PKCE flow, not yet wired). Empty = embed-only mode.
  spotifyClientId: '',
  version: '0.2.0'
};
