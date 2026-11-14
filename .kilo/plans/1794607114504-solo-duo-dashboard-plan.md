# Plan: Solo/Duo modes, shared dashboard, WPM check

Repo: /home/taki/Projects/typing_speed_test_cic
Stack: Node.js + `ws` WebSocket server (`server.js`) + vanilla HTML/JS client (`index.html`). Single page, no build step, no lint/typecheck tooling.

## Current behavior (baseline)
- Every WS connection enters duo matchmaking (`server.js:153`, `waiting` slot): first client waits, second is paired. Roles alice/rabbit, swapped each round.
- Intensity 3 or 7 stages (`server.js:75`, MODES).
- `matched` includes `names` = level names (Warm-up, …). **Name collision risk**: player names must use a new field.
- Stats computed client-side every 200 ms (`index.html:1154`): WPM = correctChars / 5 / elapsedMinutes (net WPM), accuracy = 1 − errors/keys.
- No persistence, no leaderboard, no separate home/dashboard view (one page only).

## Decisions (recommended)
1. Game mode (solo vs duo) chosen on the initial overlay before play; intensity (3/7) stays a separate selector, unchanged.
2. Name entry via a theme-consistent form overlay (not `prompt()`); each client sends its own name.
3. Duo = current queue behavior + names exchanged in `matched`; both lane tags show player names.
4. Solo = immediate match, single lane (Alice), no opponent progress, result overlay when all stages are done.
5. Dashboard = in-memory best-runs store on the server, keyed by player name (keep highest WPM only — "if two plays, choose the best"), broadcast as `dashboard` payload to all connected clients on every change; rendered in a panel on the same page (idle/home view), toggleable from the header.
6. Optional `dashboard.json` persistence: load on start, save on update (survives restarts).
7. WPM: no computation bug — the formula is net WPM by design, reads lower than gross-WPM testers when errors occur. Fix = add a gross-WPM stat alongside net WPM, not change the core formula.

## Decisions resolved
- Dashboard: same page as a panel, shown when idle, toggleable from the header.
- Persistence: in-memory + `dashboard.json` (load on start, save on update).
- Dashboard submissions: any finished game where the player completed all stages (solo and duo).

## Implementation tasks

### Phase 1 — Solo/Duo modes
1.1 Client (`index.html`): initial overlay adds "Play mode" choice (Solo / Duo) + name input form; store `state.gameMode`, `state.myName`.
1.2 Client: new WS `join` message `{type:'join', gameMode, name, intensity}` sent once mode/name are chosen.
1.3 Server (`server.js`): handle `join`:
   - solo → create solo match record, send `matched {role:'solo', gameMode:'solo', names:[myName], texts, mode, ...}`, 3s countdown, `go`.
   - duo → existing `enqueue` flow storing `ws.name`; on pair, `matched` includes `playerNames: [waiting.name, ws.name]` for both clients.
1.4 Client `matched` handler: set `state.playerNames` (separate from level `names`); lane tags show names (e.g. "👱‍♀️ AliceName · YOU"); solo hides rabbit lane and opponent stats/score.
1.5 Client: solo completion → `end` (won=true) → result overlay; no opponent progress handling.
1.6 Server `finish` for solo: winner is the single player.

### Phase 2 — Shared dashboard
2.1 Server: `bestRuns` Map keyed by name → `{name, wpm, acc, mode, intensity, at}`; `submitRun` handler keeps max WPM per name, sorts desc by WPM, broadcasts `{type:'dashboard', runs}` to all `wss.clients`.
2.2 Server: load/save `dashboard.json` (load on start, write on change).
2.3 Client: send `submitRun` at game end with `{name, wpm, acc, mode, intensity}`.
2.4 Client: dashboard panel (idle view): table sorted by WPM, columns Rank/Name/WPM/Accuracy/Mode/Date; highlight own row; render on `dashboard` message.
2.5 Header: "Dashboard" toggle to show/hide the panel.

### Phase 3 — WPM check
3.1 Verify `index.html:1159`: net WPM formula confirmed correct, no bug. Document finding: lower-than-usual readings explained by net-WPM (correct chars only) + error time penalty + accuracy penalizing re-typed corrections; `secs > 1` guard yields 0 WPM on sub-1s games.
3.2 Add gross WPM stat (`keys / 5 / minutes`) displayed next to net WPM, clearly labeled.

## Validation
- `node --check server.js` syntax check.
- `npm start`; two tabs on localhost → duo match on one machine; names show on both tags.
- Second device on same network → identical dashboard; submit a run on one device, see it on the other.
- Solo: name prompt → solo game → result with WPM → run appears on dashboard.
- WPM: gross vs net both displayed; values sensible versus a gross-WPM reference test.
- Manual only: no test suite exists.

## Risks / notes
- Client-reported WPM is trust-based (matches existing architecture; server validates stage text but not stats). Out of scope to recompute server-side.
- Keep `state.names` (level names) and `state.playerNames` strictly separate.
- Add `dashboard.json` to `.gitignore` if persistence is adopted.
- Files to touch: `index.html`, `server.js`. Runtime file: `dashboard.json`. Do not touch README/assets.
