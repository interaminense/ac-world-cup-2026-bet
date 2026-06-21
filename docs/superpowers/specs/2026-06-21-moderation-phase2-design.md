# Content Moderation — Phase 2

## Context

Phase 1 added Google auth, profiles, and an owner-gated `/admin`. The owner is
`adriano.interaminense@gmail.com`, enforced in the RTDB rules. This phase adds
the owner's janitorial tools to clean up user-generated content: emoji
reactions, AI commentary, and cheer counts.

The content lives in RTDB: `reactions/<player>/<emoji>/<uid>`,
`matches/reactions/<matchId>/<emoji>/<uid>`, `commentary/byMatch/<matchNo>`,
`commentary/leaderboard/recap`, and `cheers/<matchNo>/{team1,team2}`.

## Goal

Give the owner inline, in-place moderation controls — visible only when signed
in as the owner — to remove a specific reaction emoji, remove a bad AI
commentary blurb, and reset a match's cheer counts. The RTDB rules are the real
gate; the UI affordances are convenience.

## Decisions (approved)

- **Inline placement.** Controls appear on the content itself (leaderboard,
  match cards, live bar), only for `auth.isOwner`. No centralized moderation
  screen.
- **Reactions: per-emoji.** A `✕` on each active emoji chip removes that emoji
  for the target (`reactions/<player>/<emoji>` or
  `matches/reactions/<matchId>/<emoji>`), not the whole cluster.
- **Commentary: remove only.** A `✕` removes the blurb entirely (all languages)
  — `commentary/byMatch/<matchNo>` and the leaderboard `commentary/leaderboard/recap`.
  No rewrite/editor. The poller regenerates on its next cycle if applicable.
- **Cheers: reset.** A `✕`/reset on the live bar zeroes a match's cheers
  (`cheers/<matchNo>`).
- **leaderHype reset: dropped (YAGNI)** — it's an invisible burst trigger with
  no visible counter, so resetting it has no user-facing value.

## Architecture

### RTDB rules (security boundary)

Grant the owner `write` where it currently lacks it. Owner =
`adriano.interaminense@gmail.com`, verified email. Other users' write rules are
unchanged; the poller uses the admin SDK and bypasses rules.

```jsonc
"reactions": {
  ".read": true,
  ".write": "auth.token.email === 'adriano.interaminense@gmail.com' && auth.token.email_verified === true",
  "$player": { "$emoji": { "$uid": {
    ".write": "auth != null && auth.uid === $uid",
    ".validate": "newData.isBoolean()"
  } } }
},
"matches": { "reactions": {
  ".read": true,
  ".write": "auth.token.email === 'adriano.interaminense@gmail.com' && auth.token.email_verified === true",
  "$matchId": { "$emoji": { "$uid": {
    ".write": "auth != null && auth.uid === $uid",
    ".validate": "newData.isBoolean()"
  } } }
} },
"commentary": {
  ".read": true,
  ".write": "auth.token.email === 'adriano.interaminense@gmail.com' && auth.token.email_verified === true"
}
```

- The owner `.write` at the `reactions` / `matches/reactions` roots lets the
  owner `remove()` any `$player/$emoji` subtree. The per-`$uid` rule still lets
  normal users toggle their own reaction. `.validate: isBoolean` is not
  evaluated on removal, so owner deletes are allowed.
- `cheers` is already `".write": true`, so the owner reset needs no rule change.
- `leaderHype` is untouched.

### UI affordances (owner only)

- `Reactions.tsx` — optional `onClear?: (emoji: string) => void`. When present
  (owner), each active emoji chip renders a small `✕` that calls `onClear(emoji)`.
  `onClear` is passed only when `auth.isOwner`.
- Commentary blurb (`MatchesView.tsx` per-match box, `Leaderboard.tsx` recap
  box) — an owner-only `✕` that calls a removal handler.
- `LiveGames.tsx` — an owner-only reset on the cheer counters that zeroes the
  match's cheers.

### App handlers (owner only)

In `App.tsx`, pass these only when `auth.isOwner`:

- `clearPlayerReaction(name, emoji)` → `remove(ref(db, reactions/<name>/<emoji>))`
- `clearMatchReaction(matchNo, emoji)` → `remove(ref(db, matches/reactions/<matchNo>/<emoji>))`
- `clearMatchCommentary(matchNo)` → `remove(ref(db, commentary/byMatch/<matchNo>))`
- `clearRecap()` → `remove(ref(db, commentary/leaderboard/recap))`
- `resetCheers(matchNo)` → `remove(ref(db, cheers/<matchNo>))`

Paths use `dataPath(...)` where the existing hooks do (so `?demo` works).

## Out of scope

Commentary rewrite/editor; centralized moderation screen; leaderHype reset;
bulk "clear all reactions on a target"; tightening the open `cheers` write rule.

## Testing & verification

- Unit: the change is RTDB removals (IO), so no significant new pure logic.
  Keep the existing 153 tests green; add a path-builder helper test only if a
  helper is extracted.
- Manual: as the owner, remove a reaction emoji / a commentary blurb / a recap /
  a match's cheers and confirm each disappears live; as a non-owner, confirm the
  `✕` affordances are absent AND that a forced write to those nodes is denied by
  the rules. Confirm normal users can still toggle their own reactions.
- `npm run build` clean.
- Everything on `develop`; not published.

## Manual console step (owner)

Publish the updated full ruleset (current rules + the three owner `write`
additions). The complete file ships in `database.rules.json`.
