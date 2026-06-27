# Winners Podium — Design

**Date:** 2026-06-27

## Goal

A podium widget showing the group-stage leaderboard's top 3 — each with a 96×96
photo, name, and points — hidden by default and turned on for everyone by the
admin. Mobile: below the header. Desktop: floating bottom-left.

## Data

Top 3 of the group-stage leaderboard (`rows = buildLeaderboardWithMovement(...)`,
`LeaderboardRow[]`, already sorted by rank). Each row carries `name`,
`photoURL`, `total` (points), `rank`. A pure helper `topWinners(rows)` returns
the first three (fewer when the pool is smaller) — unit-tested.

## Layout (podium)

1st centered and elevated (🥇 gold accent), 2nd on the left (🥈 silver), 3rd on
the right (🥉 bronze). Each column: a 96×96 round photo (`Avatar` with the
participant's `photoURL`), the name, and the points. With fewer than 3 entries,
only the existing places render.

## Positioning

A single `WinnersPodium` rendered right below `<Header>` in `App`:

- **Mobile** — in normal flow, directly under the header (full width).
- **Desktop** — `sm:fixed sm:bottom-4 sm:left-4 sm:z-40` so it floats at the
  bottom-left (the chat button floats bottom-right), capped to a fixed width.

## Admin toggle

Hidden by default. A new global setting `settings/showWinners` added to
`useSettings` (owner-writable, public read, demo-aware — same pattern as
`chatLoginOnly`). `AdminView` gets a toggle in its settings section; flipping it
shows/hides the podium for everyone. The podium renders only when
`showWinners === true` and at least one place exists.

## Components / changes

- `src/lib/ranking.ts` — add `topWinners(rows: LeaderboardRow[]): LeaderboardRow[]`
  (+ test in `ranking.test.ts`).
- `src/lib/useSettings.ts` — add `showWinners` / `setShowWinners`.
- `src/components/WinnersPodium.tsx` — new podium component (reuses `Avatar`).
- `src/components/AdminView.tsx` — add the "Show winners podium" toggle.
- `src/App.tsx` — read `showWinners`, render `<WinnersPodium rows={rows} />`
  below the header when enabled; pass the setting + setter to `AdminView`'s
  settings (via `useSettings`, which `AdminView` already calls).

## Verification

`tsc` clean, all tests pass (plus the `topWinners` test), build clean, and a
demo screenshot of the podium (toggled on) on mobile and desktop.
