# Knockout Match Countdown — Design

**Date:** 2026-06-27

## Goal

Show a live countdown to kickoff on upcoming knockout-bracket matches, with a
prominent "starting soon" highlight in the last hour. Pure client-side — no
server, cron, RTDB, or emitsignal.

## Behavior

For each knockout match that has a kickoff date and has not started yet, on the
bracket:

- **> 24h away** → nothing (avoid clutter on the many far-off matches).
- **≤ 24h away** → a discreet countdown, e.g. `⏳ 6h 12m` / `⏳ 45m`.
- **≤ 1h away** → a prominent "starting soon" treatment: an amber ring on the
  card and the countdown rendered in amber (e.g. `🔴 45m`).
- **already started / finished** → nothing extra (the card already shows the
  score and the picks popover once `live`/`finished`).

The countdown updates live (a 30-second tick).

## Architecture (client-only)

### Pure logic

`knockoutCountdown(iso: string | null, nowMs: number): KnockoutCountdown` in
`src/lib/knockoutCards.ts`:

```ts
interface KnockoutCountdown {
  label: string | null;   // "6h 12m" within the ≤24h window, else null
  startingSoon: boolean;  // within 1h of kickoff
}
```

Rules: null/invalid date or already started (`now >= kickoff`) → `{label: null,
startingSoon: false}`; more than 24h away → `{label: null, startingSoon:
false}`; within 24h → a `Hh Mm` / `Mm` label; within 1h → `startingSoon: true`.
Format drops a zero minutes/hours part (`2h`, `45m`, `6h 12m`). Unit-tested.

### UI

`KnockoutBracket` holds a ticking `now` (state updated by a 30s `setInterval`)
and threads it through the bracket to the desktop `MatchCard` and the mobile
`MobileMatchCard`. Each card calls `knockoutCountdown(m.date, now)` and renders:
the countdown label when present, and an amber ring + amber label when
`startingSoon`.

## Scope

The knockout **bracket** only (desktop symmetric tree + mobile stacked cards).
The Matches-tab knockout cards are out of scope (a possible later extension).

## Verification

`tsc` clean, all tests pass (plus the new `knockoutCountdown` tests), build
clean, and a demo screenshot of a near-kickoff match showing the countdown and
the ≤1h highlight.
