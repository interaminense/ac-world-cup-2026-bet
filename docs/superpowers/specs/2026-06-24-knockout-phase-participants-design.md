# Knockout-Phase Participants & Ranking — Design

**Date:** 2026-06-24

## Goal

Open the knockout phase to new people (Google sign-in + admin approval) and give
the knockout stage its own **zeroed ranking** for all approved participants,
while the existing group-stage leaderboard stays untouched for consultation.

## Context

- Participants are static CSVs (`src/data/predictions/*.csv`) with group-stage
  predictions; the main leaderboard (`/`) scores those vs results.
- Google users get a `profiles/<uid>` on sign-in and may `claim` an existing CSV
  participant; the owner approves via `approvals/<uid>.participant`
  (`useProfiles`, `AdminView`).
- In-app knockout picks already exist (`knockoutPicks/<uid>/<matchNo>`,
  `useKnockoutPicks`) and surface in the Matches → Upcoming cards.

## Decisions (confirmed with the user)

1. Knockout ranking lists only **approved** knockout participants — current
   players who log in and claim, plus brand-new people who request and are
   approved. Everyone starts at 0; points come only from their in-app knockout
   picks. Current players must log in to play the knockout phase.
2. New participant's display name = **Google name**, editable as a **nickname**
   on a profile screen. A brand-new user (no group-stage CSV) keeps null
   group-stage predictions and does not appear in the group leaderboard.
3. The current **Leaderboard (`/`) stays as-is**; we add a **new "Knockout
   Stage" menu** (`/knockout`) with the zeroed ranking. No auto-switch.
4. The group leaderboard remains viewable for consultation (it is recomputed
   from CSV + results — no frozen snapshot needed).
5. Approval gates who is in the knockout pool; non-approved users' picks do not
   count.

## Data model (RTDB)

- `profiles/<uid>.nickname` — user-writable; display name = `nickname ?? name`.
- `profiles/<uid>.wantsKnockout` (boolean) — user-writable; the join request.
- `approvals/<uid>.knockout` (boolean) — owner-writable; approved for knockout.
  A user already approved as a CSV participant (`approvals.participant`) is also
  treated as an approved knockout participant.

**RTDB rules (`database.rules.json`, edited not deployed — "sem publicar"):**
- Add `nickname` (string or absent) and `wantsKnockout` (boolean or absent)
  validations under `profiles/$uid` (the strict `$other:false` blocks them
  otherwise).
- Add the missing top-level `knockoutPicks` rule: public read,
  `auth.uid === $uid` write per user.
- `approvals/$uid` already accepts arbitrary owner-written fields.

The `?demo` subtree is fully open, so demo testing needs no rule deploy.

## Pure logic (TDD) — `src/lib/knockoutStandings.ts`

- `knockoutRoster(profiles, approvals, participants): {name: string; uid: string}[]`
  — every uid that is approved (`approvals.knockout === true` OR a non-blocked
  `approvals.participant`), with display name = the claimed participant's name,
  else `nickname ?? profile.name`. Sorted by name.
- `pendingKnockout(profiles, approvals): {email: string; name: string; uid: string}[]`
  — uids with `wantsKnockout` that are not yet knockout-approved and not blocked.
- `buildKnockoutStandings(roster, picksByUid, matches): {exact: number; name: string; played: number; points: number; rank: number; uid: string}[]`
  — for each roster uid, sum `scorePrediction(p1,p2,scoreA,scoreB)` over matches
  that are finished (`scoreA`/`scoreB` set); count exacts and played; sort by
  points, then exact, then name; assign ranks with ties.

## UI

1. **Profile screen** — new `ProfileView` at `/profile` (signed-in only; the
   header avatar/name links to it via a new `onProfile` prop). Edit the nickname
   (`setNickname`); if not yet a knockout participant, a **"Participar do
   mata-mata"** button (`requestKnockout`) and a status line
   (pendente/aprovado). Anonymous users see a sign-in prompt.
2. **Knockout Stage menu** — `NAV_ITEMS` gains `{icon, label: 'Knockout Stage',
   to: '/knockout'}`; route renders `KnockoutLeaderboard` (rows from
   `buildKnockoutStandings`), the signed-in viewer's row highlighted, with an
   empty state before any results. Public to view. The current `/` leaderboard
   is untouched.
3. **Admin** — `AdminView` gains a **"Knockout sign-ups"** section listing
   `pendingKnockout` rows with Approve (`approveKnockout`) / Reject
   (`rejectKnockout`).

## Hooks

- `useAuth`: add `setNickname(nickname)` and `requestKnockout()` (own-profile
  writes).
- `useProfiles`: add `approveKnockout(uid)` / `rejectKnockout(uid)` and expose
  the raw `profiles`/`approvals` for the admin pending list.
- `useKnockoutPicks`: also return `byUid` (the raw per-uid tree) for the
  standings.
- `App`: subscribe to `profiles`, compute `knockoutRoster` + standings, wire the
  `/knockout` route and the header `onProfile`.

## Out of scope

- Deploying the RTDB rules (edited only).
- Auto-switching the main leaderboard when the group stage ends (manual/later).
- Group-stage in-app picks (still CSV-sourced).

## Verification

- `tsc` + `npm run build` + `npx vitest run` green (new `knockoutStandings`
  tests + existing suite).
- Manual on `?demo`: a signed-in user opens `/profile`, sets a nickname,
  requests knockout; the owner approves in Admin; the user appears in the
  `/knockout` ranking at 0 and accrues points from finished knockout picks
  (#76 Brazil 2–1 Croatia). Not published.
