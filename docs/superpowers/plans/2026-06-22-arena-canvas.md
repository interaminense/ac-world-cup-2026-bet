# Arena Canvas Rendering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render the Arena field (bouncing ball + other players' cursors) on a `<canvas>` instead of DOM elements, with interpolated cursor motion for fluidity.

**Architecture:** `ArenaView` keeps all its DOM chrome (waiting/starting overlay, scoreboard, CTA, mobile message) but the field's ball/cursor visuals move to one `<canvas>` driven by a single `requestAnimationFrame` loop reading the latest game state from a ref. `useArena.ts` and `arena.ts` logic are unchanged except a new pure `lerp` helper.

**Tech Stack:** Vite 7 + React 19 + TypeScript + Tailwind 4, Canvas 2D, Vitest (node env → pure-logic tests only).

## Global Constraints

- Branch: work on `master` (already checked out). Commit locally; do NOT push/publish until the user confirms after testing on `?demo`.
- Desktop-only Arena, English (unchanged). `useArena.ts`, `arena.ts` logic, and RTDB unchanged (only `lerp` added).
- Not anti-cheat — rendering only. Do not change game logic, rules, or `arena/scores` write access.
- Commit `--no-gpg-sign`, title-only messages. Keep existing tests green (188).

---

## File Structure

- `src/lib/arena.ts` (modify) — add `lerp`.
- `src/lib/arena.test.ts` (modify) — test `lerp`.
- `src/components/ArenaView.tsx` (replace) — canvas field; keep all other UI.

---

### Task 1: `lerp` helper (pure)

**Files:**
- Modify: `src/lib/arena.ts`
- Modify: `src/lib/arena.test.ts`

**Interfaces:**
- Produces: `lerp(a: number, b: number, t: number): number` → `a + (b - a) * t`.

- [ ] **Step 1: Add the failing test**

Append to `src/lib/arena.test.ts` (and add `lerp` to the existing top `import { … } from './arena'`):

```ts
describe('lerp', () => {
	it('interpolates between endpoints', () => {
		expect(lerp(0, 10, 0)).toBe(0);
		expect(lerp(0, 10, 1)).toBe(10);
		expect(lerp(0, 10, 0.5)).toBe(5);
		expect(lerp(2, 4, 0.25)).toBe(2.5);
	});
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/arena.test.ts`
Expected: FAIL — `lerp` not exported.

- [ ] **Step 3: Implement in `src/lib/arena.ts`** (add after `cursorColor`)

```ts
// Linear interpolation, for easing rendered cursor positions between updates.
export function lerp(a: number, b: number, t: number): number {
	return a + (b - a) * t;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/arena.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/arena.ts src/lib/arena.test.ts
git commit --no-gpg-sign -m "Add lerp helper to arena"
```

---

### Task 2: Canvas field in ArenaView

**Files:**
- Replace: `src/components/ArenaView.tsx`

**Interfaces:**
- Consumes: `useArena` (unchanged); `BALL_EMOJI`, `BALL_VALUES`, `ballPositionAt`, `cursorColor`, `formatCountdown`, `lerp`, `MIN_PLAYERS`, `sortScores` (`../lib/arena`); `Avatar`.

- [ ] **Step 1: Replace the file**

Replace `src/components/ArenaView.tsx` entirely with:

```tsx
// src/components/ArenaView.tsx
import {type MouseEvent, useEffect, useRef, useState} from 'react';

import {
	BALL_EMOJI,
	BALL_VALUES,
	ballPositionAt,
	cursorColor,
	formatCountdown,
	lerp,
	MIN_PLAYERS,
	sortScores,
} from '../lib/arena';
import {useArena} from '../lib/useArena';
import {Avatar} from './Avatar';

export function ArenaView({
	identity,
	onRequestIdentify,
}: {
	identity: string | null;
	onRequestIdentify: () => void;
}) {
	const {
		ball,
		cursors,
		endsAt,
		isReady,
		lastWinner,
		moveCursor,
		offset,
		phase,
		present,
		ready,
		readyCount,
		scores,
		startsAt,
		toggleReady,
		tryClaim,
	} = useArena(identity);
	const fieldRef = useRef<HTMLDivElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const sizeRef = useRef({dpr: 1, h: 0, w: 0});
	const renderedCursors = useRef<Map<string, {x: number; y: number}>>(
		new Map()
	);
	const drawState = useRef({ball, cursors, offset, phase});
	const [, setTick] = useState(0);

	drawState.current = {ball, cursors, offset, phase};

	const toFraction = (event: MouseEvent) => {
		const rect = fieldRef.current?.getBoundingClientRect();

		if (!rect) {
			return null;
		}

		return {
			x: (event.clientX - rect.left) / rect.width,
			y: (event.clientY - rect.top) / rect.height,
		};
	};

	// Re-render once a tick so the countdown text updates.
	useEffect(() => {
		if (phase !== 'starting' && phase !== 'playing') {
			return undefined;
		}

		const id = setInterval(() => setTick((value) => value + 1), 250);

		return () => clearInterval(id);
	}, [phase]);

	// Keep the canvas backing store matched to the field size (DPR-aware).
	useEffect(() => {
		const canvas = canvasRef.current;
		const field = fieldRef.current;

		if (!canvas || !field) {
			return undefined;
		}

		const resize = () => {
			const rect = field.getBoundingClientRect();
			const dpr = window.devicePixelRatio || 1;

			canvas.width = Math.round(rect.width * dpr);
			canvas.height = Math.round(rect.height * dpr);
			sizeRef.current = {dpr, h: rect.height, w: rect.width};
		};

		resize();

		const observer = new ResizeObserver(resize);

		observer.observe(field);

		return () => observer.disconnect();
	}, []);

	// One draw loop for the whole field; reads latest state from the ref so it
	// never restarts.
	useEffect(() => {
		const canvas = canvasRef.current;
		const ctx = canvas?.getContext('2d');

		if (!canvas || !ctx) {
			return undefined;
		}

		let frame = 0;

		const draw = () => {
			const {dpr, h, w} = sizeRef.current;
			const state = drawState.current;

			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			ctx.clearRect(0, 0, w, h);

			const seen = new Set<string>();

			for (const cursor of state.cursors) {
				seen.add(cursor.uid);

				const target = {x: cursor.x * w, y: cursor.y * h};
				const prev = renderedCursors.current.get(cursor.uid) ?? target;
				const pos = {
					x: lerp(prev.x, target.x, 0.2),
					y: lerp(prev.y, target.y, 0.2),
				};

				renderedCursors.current.set(cursor.uid, pos);

				const color = cursorColor(cursor.name);

				ctx.fillStyle = color;
				ctx.beginPath();
				ctx.moveTo(pos.x, pos.y);
				ctx.lineTo(pos.x + 13, pos.y + 4);
				ctx.lineTo(pos.x + 4, pos.y + 13);
				ctx.closePath();
				ctx.fill();

				ctx.font =
					'600 11px Inter, system-ui, sans-serif';
				ctx.textAlign = 'left';
				ctx.textBaseline = 'middle';

				const labelWidth = ctx.measureText(cursor.name).width;
				const bx = pos.x + 15;
				const by = pos.y + 3;
				const bw = labelWidth + 10;
				const bh = 16;

				ctx.fillStyle = color;
				ctx.beginPath();
				ctx.roundRect(bx, by, bw, bh, 8);
				ctx.fill();

				ctx.fillStyle = '#ffffff';
				ctx.fillText(cursor.name, bx + 5, by + bh / 2 + 0.5);
			}

			for (const uid of [...renderedCursors.current.keys()]) {
				if (!seen.has(uid)) {
					renderedCursors.current.delete(uid);
				}
			}

			if (state.phase === 'playing' && state.ball) {
				const position = ballPositionAt(
					state.ball,
					Date.now() + state.offset
				);
				const x = position.x * w;
				const y = position.y * h;

				ctx.textAlign = 'center';
				ctx.textBaseline = 'middle';

				if (state.ball.kind === 'gold') {
					ctx.shadowColor = 'gold';
					ctx.shadowBlur = 16;
				}

				ctx.font = '28px system-ui, sans-serif';
				ctx.fillText(BALL_EMOJI[state.ball.kind], x, y);
				ctx.shadowBlur = 0;

				if (state.ball.kind !== 'normal') {
					ctx.font = '700 12px Inter, system-ui, sans-serif';
					ctx.fillStyle = '#fcd34d';
					ctx.fillText(`+${BALL_VALUES[state.ball.kind]}`, x + 18, y - 14);
				}
			}

			frame = requestAnimationFrame(draw);
		};

		frame = requestAnimationFrame(draw);

		return () => cancelAnimationFrame(frame);
	}, []);

	const now = Date.now() + offset;
	const ranked = sortScores(scores);
	const playing = phase === 'playing';
	const startIn = Math.max(0, Math.ceil((startsAt - now) / 1000));

	return (
		<div>
			<div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm text-slate-400 sm:hidden">
				⚽ Arena is available on desktop.
			</div>

			<div className="hidden sm:block">
				{!identity && (
					<div className="mb-3 flex items-center justify-between rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-4 py-3">
						<span className="text-sm text-slate-300">
							Pick a name to join the arena and score.
						</span>

						<button
							className="shrink-0 rounded-full bg-emerald-500 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-emerald-400"
							onClick={onRequestIdentify}
						>
							👋 Who are you?
						</button>
					</div>
				)}

				<div className="flex gap-4">
					<div
						className="relative aspect-square h-[70vh] max-w-full shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-950/40 to-slate-950"
						onClick={(event) => {
							const point = toFraction(event);

							if (point) {
								tryClaim(point.x, point.y);
							}
						}}
						onMouseMove={(event) => {
							const point = toFraction(event);

							if (point) {
								moveCursor(point.x, point.y);
							}
						}}
						ref={fieldRef}
					>
						<canvas
							className="pointer-events-none absolute inset-0 h-full w-full"
							ref={canvasRef}
						/>

						{!playing && (
							<div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-4 px-4 text-center">
								<div>
									{phase === 'starting' ? (
										<p className="font-display text-4xl font-bold text-white">
											Starting in {startIn}…
										</p>
									) : (
										<>
											<p className="text-lg font-semibold text-white">
												Click READY to play
											</p>

											<p className="text-sm text-slate-400">
												{readyCount}/{MIN_PLAYERS} ready —
												need {MIN_PLAYERS} to start
											</p>
										</>
									)}

									{lastWinner && (
										<p className="mt-1 text-sm text-amber-300">
											🏆 Last round: {lastWinner}
										</p>
									)}
								</div>

								{present.length > 0 && (
									<div className="flex flex-wrap items-center justify-center gap-2">
										{present.map((player) => (
											<span
												className="flex items-center gap-1.5 rounded-full bg-white/10 py-0.5 pl-0.5 pr-2.5"
												key={player.uid}
												style={{
													boxShadow: ready[player.uid]
														? `0 0 0 2px ${cursorColor(player.name)}`
														: undefined,
												}}
											>
												<Avatar
													className="h-6 w-6 rounded-full"
													name={player.name}
												/>

												<span className="text-xs font-medium text-slate-200">
													{player.name}
												</span>

												<span className="text-xs">
													{ready[player.uid] ? '✓' : '·'}
												</span>
											</span>
										))}
									</div>
								)}

								{identity && (
									<button
										className={`pointer-events-auto rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
											isReady
												? 'bg-white/10 text-slate-300 hover:bg-white/20'
												: 'bg-emerald-500 text-white hover:bg-emerald-400'
										}`}
										onClick={toggleReady}
									>
										{isReady ? 'Cancel ready' : 'READY'}
									</button>
								)}
							</div>
						)}
					</div>

					<div className="w-48 shrink-0 self-start rounded-2xl border border-white/10 bg-white/5 p-3">
						<p className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
							{playing ? formatCountdown(endsAt - now) : 'Scores'}
						</p>

						{ranked.length === 0 ? (
							<p className="text-xs text-slate-500">
								{playing
									? 'No goals yet — click the balls!'
									: 'Ready up to start a round.'}
							</p>
						) : (
							<ul className="space-y-1.5">
								{ranked.map(([player, score]) => (
									<li
										className="flex items-center gap-2"
										key={player}
									>
										<Avatar
											className="h-6 w-6 shrink-0 rounded-full"
											name={player}
										/>

										<span className="min-w-0 flex-1 truncate text-sm text-slate-200">
											{player}
										</span>

										<span className="font-display text-sm font-bold text-white">
											{score}
										</span>
									</li>
								))}
							</ul>
						)}

						{playing && identity && !isReady && (
							<p className="mt-2 text-[10px] text-slate-500">
								You're spectating — ready up for the next round.
							</p>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
```

- [ ] **Step 2: Build + full suite**

Run: `npm run build && npx vitest run`
Expected: `✓ built`; tests pass (188 + the new `lerp` test).

- [ ] **Step 3: Commit**

```bash
git add src/components/ArenaView.tsx
git commit --no-gpg-sign -m "Render the arena field on a canvas"
```

---

## Notes

- The draw loop is keyed `[]` and reads latest state from `drawState.current`
  (reassigned every render), so it never restarts and has no stale closures —
  same pattern as the round ticker.
- The canvas is `pointer-events-none`; click/mousemove stay on the field `<div>`
  so `tryClaim`/`moveCursor` are unchanged.
- `ctx.roundRect` is used for cursor labels (supported in modern desktop
  browsers; the Arena is desktop-only).
- The old DOM ball `<span>` + cursor `<div>`s and the style-mutating rAF are
  gone; the countdown `setTick` interval stays (it drives the React-rendered
  countdown text, which the canvas loop does not).
- Manual test on `?demo` (desktop, running round): ball smooth on canvas with
  correct emoji/glow/badge; other cursors smooth (interpolated) in their colors;
  click still scores; crisp on a HiDPI display; re-fits on window resize.
- A separate `chat-timestamps` change (chat message times) is already merged
  into local `master` — unrelated file (`LiveChatPanel.tsx`), no interaction.
