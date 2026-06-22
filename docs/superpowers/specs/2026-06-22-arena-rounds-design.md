# Arena Rounds — Ready-Check, Countdown, 2-Minute Timer, Ball Types & Cursor Colors — Design

## Context

The Arena (live in prod) is a multiplayer-cursor "catch the ball" game: with ≥3
players present, a soccer ball bounces (deterministic shared physics seeded in
`arena/ball`); clicking it scores +1 and respawns it; cursors live in
`arena/cursors/<uid>`, scores in `arena/scores/<name>`. Pure helpers in
`arena.ts`, the realtime hook in `useArena.ts`, the page in `ArenaView.tsx`.

This replaces the always-on game with a ready-check → countdown → timed
2-minute round flow, scores reset each round, balls come in three values, and
each player's cursor has its own color.

## Decisions (approved)

- **Round phases: `waiting` → `starting` → `playing` → `waiting`.**
- **Ready-check:** in `waiting`/`starting`, each player toggles READY.
- **Start trigger:** when **≥3 players are ready**, a **5-second countdown**
  begins (`starting`). Players may still ready during it. When it hits 0 the
  round starts with whoever is ready; if the ready count dropped below 3, it
  cancels back to `waiting`.
- **Non-ready players wait for the next round:** the ready set at start is the
  round's participant set. During `playing`, only participants can score;
  non-ready people spectate and ready up for the next round.
- **2-minute round** (`playing`) with a visible countdown; **scores reset each
  round** (overrides the earlier "never reset"). At end, the round's top scorer
  is shown as the last winner.
- **Ball types** (weighted per spawn): `normal` ⚽ = 1pt (~65%), `basket` 🏀 =
  2pts (~25%), `gold` = 5pts (~10%, ≈3 per round — approximate). Catching adds
  the ball's value.
- **Per-user cursor color:** each player's cursor (pointer + name label) is
  tinted a distinct color derived deterministically from their name.
- **Min 3 players** still required. Works on the existing `arena/*` subtree
  (the prod `arena` rule covers `round`/`ready`); `?demo` is open.

## Architecture

### Data (RTDB, via `dataPath`)

```
arena/cursors/<uid> = {x, y, name, at}                 // presence (unchanged)
arena/scores/<name> = <number>                         // per round; reset at start
arena/ready/<uid>   = true                             // ready / participant set; cleared at round end
arena/ball = {id, kind, x0, y0, vx, vy, t0, claimedBy} // kind added
arena/round = {phase: 'waiting'|'starting'|'playing', startsAt: number, endsAt: number, lastWinner: string|null}
```

Constants: `ROUND_MS = 120000`, `START_COUNTDOWN_MS = 5000`, `MIN_PLAYERS = 3`,
`BALL_VALUES = {normal: 1, basket: 2, gold: 5}`,
`BALL_EMOJI = {normal: '⚽', basket: '🏀', gold: '⚽'}` (gold rendered with a
gold glow).

### State machine (transactions on `arena/round` prevent races)

`now` = server-corrected time (`Date.now() + offset`). `readyCount` = number of
`arena/ready` entries.

- **waiting → starting** (readyCount ≥ MIN_PLAYERS): transaction → if not
  `waiting`, abort; else `{phase: 'starting', startsAt: now + START_COUNTDOWN_MS}`.
- **starting → waiting (cancel)** (readyCount < MIN_PLAYERS during `starting`):
  transaction → `{phase: 'waiting'}`.
- **starting → playing** (`starting` && now ≥ startsAt): transaction → if not
  `starting`/not elapsed, abort; if readyCount ≥ MIN_PLAYERS →
  `{phase: 'playing', endsAt: now + ROUND_MS, lastWinner: <kept>}`, else
  `{phase: 'waiting'}`. The committing client resets scores
  (`set(arena/scores, null)`) and spawns the first ball. `arena/ready` is **kept**
  as the participant set.
- **playing → waiting (end)** (`playing` && now ≥ endsAt): transaction → if not
  `playing`/not ended, abort; else `{phase: 'waiting', endsAt: 0,
  lastWinner: topScorer(scores)}`. The committing client removes the ball and
  clears `arena/ready`.
- **Ball presence during play:** if `playing` and no ball, spawn
  (`current ?? nextBall(...)`) — covers initial spawn and committer dropout.

### Scoring & ready gating

- `toggleReady` is allowed only in `waiting`/`starting` (locked during
  `playing`).
- `tryClaim` works only when `phase === 'playing'` **and** the viewer is a
  participant (`ready[myUid] === true`). On a winning transaction claim,
  increment `arena/scores/<name>` by `BALL_VALUES[ball.kind]` and spawn the next
  ball (new weighted kind).

### Pure helpers — `src/lib/arena.ts` (testable, vitest node env)

- `pickBallKind(rand: number): 'normal'|'basket'|'gold'` — `< 0.10` gold,
  `< 0.35` basket, else normal.
- `topScorer(scores: Record<string, number>): string | null` — highest score
  (tie → name asc); null if empty/all-zero.
- `formatCountdown(ms: number): string` — `m:ss`, clamped at 0.
- `cursorColor(name: string): string` — deterministic `hsl(h, 70%, 60%)` from a
  hash of the name (stable per person, distinct hues).
- `nextBall(prevId, nowMs)` — also sets `kind` via `pickBallKind(Math.random())`.
- `BALL_VALUES`, `BALL_EMOJI` exported.

### Hook — `src/lib/useArena.ts`

Subscribes to `cursors`, `ball`, `scores`, `round`, `ready`, and the server time
offset. Exposes `ball`, `cursors`, `offset`, `phase`, `startsAt`, `endsAt`,
`lastWinner`, `ready` (map), `readyCount`, `playerCount`, `present` (uids/names),
`scores`, `isReady` (self), `moveCursor`, `toggleReady`, `tryClaim`. Effects run
the four `round` transitions plus the ball-presence spawn, keyed on the relevant
state.

### Page — `src/components/ArenaView.tsx`

- **waiting/starting:** present roster, each with a ready ✓ and their cursor
  color; a READY toggle for the viewer; status ("Need 3 ready"); in `starting`,
  a big "Starting in N…" countdown; the last round's winner. No ball.
- **playing:** the bouncing ball (⚽ / 🏀 / gold, with a `+2`/`+5` badge), the
  `m:ss` countdown, colored cursors (pointer + name in each player's color), and
  the live per-round scoreboard. The viewer can score only if a participant.

## Out of scope

Auto-start without ≥3 ready; per-player ready timeouts; cross-round persistence;
sound; anonymous participation; mid-round joining.

## Testing & verification

- Unit (vitest): `pickBallKind` (boundaries 0, 0.09, 0.10, 0.34, 0.35, 0.99),
  `topScorer` (winner, tie, empty, all-zero), `formatCountdown` (120000→"2:00",
  65000→"1:05", 0/negative→"0:00"), `cursorColor` (deterministic — same name →
  same color; valid `hsl(...)`), `nextBall` (kind present + id/time/velocity).
- `npm run build` clean; existing tests stay green.
- Manual on `?demo` (desktop, 3 browsers): two ready → nothing; third ready →
  5s countdown → round starts; a 4th who didn't ready cannot score and waits;
  balls score 1/2/5; each cursor a different color; at 0:00 the winner shows and
  it returns to the ready-check.

## Branch & publishing

Work on `master`; build + test; manual test on `?demo` before publishing. Not
pushed/published until the user confirms after testing.
