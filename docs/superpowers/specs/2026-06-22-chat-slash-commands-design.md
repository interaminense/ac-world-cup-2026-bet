# Live Chat Slash Commands — Design

## Context

PR #1 added a live match chat (`useMatchChat`, `LiveChatPanel`) that appears in
the live bar during a match. Messages are `chat/<matchNo>/<pushId> = {name, text,
at}`, read/written via `dataPath` (so `?demo` is isolated). Identity comes from
the localStorage name picker (`useIdentity`); writes use the anonymous uid.

This feature adds `/`-commands to the chat input. The app is a static SPA with
no backend, so all command logic runs client-side.

## Goal

Let a chatter type `/`-commands in the chat input to surface pool/match data
inline and to emote — without spamming the shared chat or changing the DB.

## Decisions (approved)

- **Commands:** `/score`, `/picks`, `/whatif <a>-<b>`, `/me <action>`, `/help`.
- **Visibility:** `/score`, `/picks`, `/whatif`, `/help` are **ephemeral** —
  rendered only in the sender's panel, never written to RTDB. `/me <action>`
  **broadcasts** as a normal chat message (`* <name> <action>`). Plain text (no
  leading `/`) broadcasts as today.
- **`/help` labels each command's visibility** (public vs only-you).
- No RTDB schema or rules change. Base branch: `chat-commands` off `master`.

## Architecture

### Pure core — `src/lib/chatCommands.ts` (testable in vitest, node env)

```ts
type ChatCommandKind =
  'message' | 'me' | 'score' | 'picks' | 'whatif' | 'help' | 'unknown';

interface ParsedChatInput { kind: ChatCommandKind; arg: string }

interface ChatCommandContext {
  card: MatchCard | null;        // the live match (score, teams, entries)
  games: Game[];
  matchNo: number;
  name: string;                  // sender's identity name
  participants: Participant[];
}

interface ChatCommandResult { broadcast?: string; ephemeral?: string }
```

Functions:

- `parseChatInput(text: string): ParsedChatInput` — if `text` does not start
  with `/`, kind is `message`. Otherwise the first token after `/` selects the
  kind (`score`/`picks`/`whatif`/`me`/`help`); anything else is `unknown`. `arg`
  is the remainder after the command token, trimmed.
- `formatScore(card): string` — `Mexico 2–0 Korea Republic · 67'`. If the match
  is not live / no card: `No live score right now.`
- `formatPicks(card): string` — `Pool picks: Mexico 5 · Draw 2 · Korea 6`,
  counting `card.entries` by `p1>p2` / `p1===p2` / `p1<p2`. Empty: `No picks for
  this match.`
- `formatWhatIf(participants, games, matchNo, arg): string` — parse `arg` as
  `<a>-<b>` (two non-negative ints). On bad arg: `Usage: /whatif 2-1`. Otherwise
  run `simulateWhatIf(participants, games, matchNo, a, b)`, take the movers whose
  rank changed (fallback: top 3), format `If Mexico 2–1 Korea: Rachael 3→1
  (+15) · Caio 1→2 …`. Empty engine result: `Can't project this match.`
- `formatMe(name, arg): string` — `* <name> <arg>` (broadcast). Empty arg →
  treat as a plain message instead (return the raw text), so a lone `/me` does
  nothing weird.
- `HELP_TEXT: string` — lists every command **with its visibility tag**:

  ```
  Commands:
  /score — current score (only you)
  /picks — pool picks for this match (only you)
  /whatif 2-1 — projected standings (only you)
  /me <action> — emote (public — everyone sees)
  /help — this list (only you)
  ```

- `runChatCommand(text, ctx): ChatCommandResult` — parse, then:
  - `message` → `{broadcast: text}`
  - `me` → `{broadcast: formatMe(ctx.name, arg)}` (or `{broadcast: text}` if arg empty)
  - `score` → `{ephemeral: formatScore(ctx.card)}`
  - `picks` → `{ephemeral: formatPicks(ctx.card)}`
  - `whatif` → `{ephemeral: formatWhatIf(ctx.participants, ctx.games, ctx.matchNo, arg)}`
  - `help` → `{ephemeral: HELP_TEXT}`
  - `unknown` → `{ephemeral: 'Unknown command. Try /help'}`

### UI wiring — `src/components/LiveChatPanel.tsx`

- New props: `card: MatchCard | null`, `participants: Participant[]`,
  `games: Game[]` (matchNo already present).
- Local state `ephemeral: {id: number; text: string}[]` for only-you lines.
- On submit: `const result = runChatCommand(draft, {card, games, matchNo, name: identity, participants})`.
  - `result.broadcast` → `send(identity, result.broadcast)`.
  - `result.ephemeral` → append to `ephemeral` (not persisted).
  - Clear the draft either way.
- Render the ephemeral lines after the persisted messages, styled distinctly
  (muted, a `🤖` prefix and an "only you" hint) so it's clear they are private
  and local. They clear on close/refresh.

### App wiring — `src/App.tsx`

When rendering `LiveChatPanel`, pass the matching `MatchCard` (from the existing
`cards`), `participants`, and the live `games` array.

## Out of scope (this iteration)

`/cheer`, `/standings`, `/group`, `/clear`; broadcasting data commands;
persisting ephemeral results; flag emoji (use team names).

### Deferred — next iteration: `/celebrate <username>`

A realtime, everyone-sees-it visual: typing `/celebrate <username>` triggers an
emoji explosion plus that person's avatar on every online client's screen. This
is NOT a chat-text command — it's a broadcast visual effect, the same mechanism
as the existing cheer/trophy bursts (`leaderHype` / `CheerBurstLayer`): write a
small event (e.g. `celebrate = {name, n}` incremented) to RTDB, every client's
`onValue` detects the bump and renders the avatar + burst overlay. It needs its
own design pass (event schema, resolving `<username>` to a participant + avatar,
overlay component, demo/prod rule for the `celebrate` node). The user will test
this iteration's five commands first; `/celebrate` is explicitly a follow-up and
is not built here.

## Testing & verification

- Unit (vitest): `parseChatInput` (no-slash → message; each command; unknown;
  arg parsing), `formatScore`, `formatPicks`, `formatWhatIf` (valid + bad arg +
  empty), `formatMe` (normal + empty arg), `HELP_TEXT` includes the visibility
  tags, and `runChatCommand` routing (broadcast vs ephemeral for each kind).
- `npm run build` clean; existing 135 tests stay green.
- Manual on `?demo` (a live match exists): each command behaves per the spec; a
  second device confirms `/me` is shared and data commands are not.

## Base & publishing

Branch `chat-commands` off `master`. Not published until the user approves; a
merge to `master` would deploy via the existing Action.
