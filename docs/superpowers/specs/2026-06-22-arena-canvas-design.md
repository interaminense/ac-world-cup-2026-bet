# Arena Canvas Rendering — Design

## Context

The Arena field currently renders with DOM: the ball is a `<span>` (emoji)
moved via `requestAnimationFrame` mutating `style.left/top`, and each other
player's cursor is an absolutely-positioned `<div>` (pointer + name). The game
logic + state live in `useArena.ts` (round state machine, deterministic ball
physics seeded in `arena/ball`), and `arena.ts` has the pure helpers.

This migrates the field rendering to a single `<canvas>` for smoother animation
and a foundation for effects (trails/particles later).

## Goal

Render the live Arena field (the bouncing ball + other players' cursors) on a
`<canvas>` instead of DOM elements, with interpolated cursor movement for
fluidity. Game logic, the hook, and the round/overlay UI are unchanged.

## Decisions (approved)

- **Canvas for the field visuals only.** The ball and other players' cursors are
  drawn on a `<canvas>`. Everything else stays DOM/React: the waiting/starting
  overlay (roster, READY button, "Starting in N…", last winner), the scoreboard
  sidebar, the identity CTA, and the mobile "desktop only" message.
- **`useArena.ts` and `arena.ts` logic are unchanged** — only `ArenaView.tsx`
  rendering changes (plus a tiny `lerp` helper).
- **Cursor interpolation** (`lerp` toward the latest network position each
  frame) for smoothness; the ball is already formula-smooth at 60fps.
- **Not anti-cheat.** Canvas does not stop devtools cheating (state/logic stay
  client-side; `arena/scores` is still client-writable). Real anti-cheat is a
  separate server-authority phase (Cloud Function / Blaze) — explicitly out of
  scope here.

## Architecture

### What moves to canvas (in `ArenaView.tsx`)

- A `<canvas ref={canvasRef}>` fills the square field container. Click and
  mousemove handlers stay on it → fractions (from the canvas rect) →
  `tryClaim` / `moveCursor` (unchanged hook API).
- A single `requestAnimationFrame` draw loop (started in an effect, reading
  latest state from a ref so it never restarts) that each frame:
  1. Clears the canvas.
  2. **Cursors** (others, all phases): lerp each cursor's rendered position
     toward its latest target (`lerp`, ~0.2 factor), then draw a pointer
     (a small filled triangle) + the name label, in the player's
     `cursorColor(name)`.
  3. **Ball** (only when `phase === 'playing'` and a ball exists): compute
     `ballPositionAt(ball, Date.now() + offset)`, draw `BALL_EMOJI[ball.kind]`
     via `ctx.fillText` (`textAlign='center'`, `textBaseline='middle'`); gold
     gets a `shadowColor='gold'` + `shadowBlur` glow; basket/gold draw a small
     `+2`/`+5` badge.
- **Crispness:** size the canvas backing store to `rect.width * dpr` ×
  `rect.height * dpr` (where `dpr = window.devicePixelRatio || 1`) and scale the
  context once per resize; CSS size stays 100% of the square field.
- **Responsive:** a `ResizeObserver` on the field updates the stored
  pixel size so the canvas re-fits when the layout changes; positions are drawn
  from fractions × current pixel size.

### Interpolation state

A ref holds each cursor's currently-rendered `{x, y}` keyed by uid; each frame it
eases toward the latest `cursors` target via `lerp`. New cursors snap to their
first position; departed cursors are dropped.

### Pure helper — `src/lib/arena.ts`

```ts
lerp(a: number, b: number, t: number): number   // a + (b - a) * t
```

### Unchanged

`useArena.ts` (round machine, ball physics, claim, ready), the rest of
`ArenaView.tsx` (waiting/starting overlay, scoreboard, CTA, mobile message), all
RTDB data and rules.

## Out of scope

Anti-cheat / server authority; trails/particles (this just enables them);
moving the waiting overlay or scoreboard to canvas; touch support (still
desktop-only).

## Testing & verification

- Unit (vitest): `lerp` (endpoints `t=0→a`, `t=1→b`, midpoint). Existing tests
  stay green.
- `npm run build` clean.
- Manual on `?demo` (desktop, with a running round): the ball animates smoothly
  on canvas with the right kind/emoji/glow/badge; other cursors move smoothly
  (interpolated) in each player's color; clicking the ball still scores; the
  canvas stays crisp (DPR) and re-fits on window resize; the waiting/starting
  overlay + scoreboard are unchanged.

## Branch & publishing

Work on `master`; build + test; manual test on `?demo`. Not pushed/published
until the user confirms after testing. (A separate background agent is adding
chat message timestamps on the `chat-timestamps` branch — different files, no
overlap.)
