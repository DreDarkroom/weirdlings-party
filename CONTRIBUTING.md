# Contributing: games, stories and ideas

Anyone can add to the real game. You don't need to be a developer for the first two.

## 1. Write story lines (no code)
Open the game → **Workshop → ✍ Writers' Room**. Pick a scene, rewrite the lines (`Speaker: text`, `{t}` = live countdown),
press **Preview** to see it in the real dialogue box, then **Send to the team** (or **Copy JSON** and paste into
`content/story.json`). Scene keys: `intro`, `before1`…`before5`, `after0`, `after1`, `after3`, `after4`, `finale` (Kerry),
`finale2` (Mick), `cake` (Cake·AI).

Style: warm, silly, anti-AI-flavoured, kind to everyone. Use the game's character names only.

## 2. Suggest ideas / give feedback
**Workshop → 💬 Feedback** or **💡 Suggest an idea**. Without the shared backend this opens a pre-filled GitHub issue.

## 3. Build a micro-game
1. Turn on **Settings → Developer mode**, then **Developer → 🧪 Dev Lab**.
2. Write your game in the editor (a `canvas` and `ctx` are provided), press **Run** (it runs in a sandboxed iframe).
3. **Export .js**. The file calls `WL.Lab.register({ id, title, author, status, blurb, play(host, api) })`.
4. Open a PR adding it to `js/microgames/` and one line to `content/microgames.json`.
   Use `status: 'testing'` first; maintainers promote it to `'live'` after feedback.

`api` gives you: `W`/`H` (480×320), `input` (keyboard + gamepad), `sfx(name)`, `score(n)`, `done(msg)`, `toast(msg)`, `audio`.
Rules: no external network calls, no tracking, no secrets, keep it under ~300 lines, make it work with touch.

## Privacy rules for everyone
Never put real people's private details, screenshots or private chat content in the game, the code or the docs.
Use the in-game character names.
