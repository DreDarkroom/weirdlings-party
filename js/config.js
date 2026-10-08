window.WL = window.WL || {};
WL.CONFIG = {
  // The moment the DJ cake is cut. Interpreted in each player's LOCAL time zone.
  // TODO(party-time): confirm real start time with Kerry/Dee. 20:00 is a guess.
  partyISO: '2026-10-09T20:00:00',
  honoree: 'Kerry Queenslayer',
  // Deployed Stopiffy origin (empty = use the bundled catalogue).
  stopiffyBase: 'https://dredarkroom.github.io/stopiffy',
  // Spotify app client id (PKCE flow, not yet wired). Empty = embed-only mode.
  spotifyClientId: '',
  version: '0.1.0'
};
