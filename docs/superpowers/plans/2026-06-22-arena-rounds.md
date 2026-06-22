# Arena Rounds Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the always-on Arena into a ready-check → 5s countdown → timed 2-minute round, with per-round scores, three ball values (⚽1/🏀2/gold5), and per-user cursor colors.

**Architecture:** A `waiting`→`starting`→`playing`→`waiting` state machine lives in `arena/round`, driven by a client-side ticker running guarded RTDB transactions (only one client commits each transition). `arena/ready/<uid>` is the participant set. Pure helpers (`pickBallKind`, `topScorer`, `formatCountdown`, `cursorColor`) are unit-tested; the hook and page are build-verified.

**Tech Stack:** Vite 7 + React 19 + TypeScript + Tailwind 4, Firebase RTDB, Vitest (node env → pure-logic tests only).

## Global Constraints

- Branch: work on `master` (already checked out). Commit locally; do NOT push/publish until the user confirms after testing on `?demo`.
- All UI text in English. Desktop-only Arena (unchanged).
- All RTDB paths via `dataPath(...)`. Constants (verbatim): `ROUND_MS = 120000`, `START_COUNTDOWN_MS = 5000`, `MIN_PLAYERS = 3`, ball values `{normal:1, basket:2, gold:5}`, weights gold `< 0.10`, basket `< 0.35`, else normal.
- Scores reset each round. Only ready participants can score. Transitions use transactions to avoid double start/end.
- Commit `--no-gpg-sign`, title-only messages. Keep existing tests green.

---

## File Structure

- `src/lib/arena.ts` (modify) — add `BallKind` + `kind`, value/emoji maps, round constants, `pickBallKind`, `topScorer`, `formatCountdown`, `cursorColor`; `nextBall` sets `kind`.
- `src/lib/arena.test.ts` (modify) — tests for the new helpers + `kind`.
- `src/lib/useArena.ts` (replace) — the round state machine.
- `src/components/ArenaView.tsx` (replace) — waiting/starting/playing UI, colored cursors, ball kinds.

---

### Task 1: Ball kinds + round helpers (pure)

**Files:**
- Modify: `src/lib/arena.ts`
- Modify: `src/lib/arena.test.ts`

**Interfaces:**
- Produces: `type BallKind = 'normal'|'basket'|'gold'`; `Ball.kind: BallKind`; `ROUND_MS`, `START_COUNTDOWN_MS: number`; `BALL_VALUES: Record<BallKind, number>`; `BALL_EMOJI: Record<BallKind, string>`; `pickBallKind(rand: number): BallKind`; `topScorer(scores: Record<string, number>): string | null`; `formatCountdown(ms: number): string`; `cursorColor(name: string): string`. `nextBall(prevId, nowMs)` now sets `kind`.

- [ ] **Step 1: Add the failing tests**

Append to `src/lib/arena.test.ts`:

```ts
import {
	BALL_VALUES,
	cursorColor,
	formatCountdown,
	pickBallKind,
	topScorer,
} from './arena';

describe('pickBallKind', () => {
	it('maps the weight bands', () => {
		expect(pickBallKind(0)).toBe('gold');
		expect(pickBallKind(0.09)).toBe('gold');
		expect(pickBallKind(0.1)).toBe('basket');
		expect(pickBallKind(0.34)).toBe('basket');
		expect(pickBallKind(0.35)).toBe('normal');
		expect(pickBallKind(0.99)).toBe('normal');
	});
});

describe('BALL_VALUES', () => {
	it('scores 1 / 2 / 5', () => {
		expect(BALL_VALUES).toEqual({basket: 2, gold: 5, normal: 1});
	});
});

describe('topScorer', () => {
	it('returns the highest, breaking ties by name', () => {
		expect(topScorer({Ana: 3, Bob: 5, Cid: 5})).toBe('Bob');
	});

	it('is null when empty or all zero', () => {
		expect(topScorer({})).toBeNull();
		expect(topScorer({Ana: 0})).toBeNull();
	});
});

describe('formatCountdown', () => {
	it('formats m:ss and clamps at zero', () => {
		expect(formatCountdown(120000)).toBe('2:00');
		expect(formatCountdown(65000)).toBe('1:05');
		expect(formatCountdown(0)).toBe('0:00');
		expect(formatCountdown(-500)).toBe('0:00');
	});
});

describe('cursorColor', () => {
	it('is deterministic and returns an hsl color', () => {
		expect(cursorColor('Adriano')).toBe(cursorColor('Adriano'));
		expect(cursorColor('Adriano')).toMatch(/^hsl\(\d+, 70%, 60%\)$/);
	});
});
```

Also extend the existing `nextBall` test (in the `describe('nextBall', …)` block) with a kind assertion — add this line after the velocity assertion:

```ts
		expect(['normal', 'basket', 'gold']).toContain(ball.kind);
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/arena.test.ts`
Expected: FAIL — `pickBallKind`/`topScorer`/`formatCountdown`/`cursorColor` not exported.

- [ ] **Step 3: Implement in `src/lib/arena.ts`**

Replace the `Ball` interface and the constants block at the top with:

```ts
export type BallKind = 'basket' | 'gold' | 'normal';

export interface Ball {
	claimedBy: string | null;
	id: number;
	kind: BallKind;
	t0: number;
	vx: number;
	vy: number;
	x0: number;
	y0: number;
}

// The ball's center bounces within this margin of the field edges (fractions).
export const BALL_WALL = 0.04;

// Default ball speed, in fractions of the field per second.
export const BALL_SPEED = 0.35;

// The game only runs with at least this many players in the arena.
export const MIN_PLAYERS = 3;

// A round lasts this long; the start countdown after 3 are ready.
export const ROUND_MS = 120000;
export const START_COUNTDOWN_MS = 5000;

export const BALL_VALUES: Record<BallKind, number> = {
	basket: 2,
	gold: 5,
	normal: 1,
};

export const BALL_EMOJI: Record<BallKind, string> = {
	basket: '🏀',
	gold: '⚽',
	normal: '⚽',
};
```

Add these functions (anywhere after `sortScores`):

```ts
// Weighted ball kind: gold ~10%, basket ~25%, normal ~65%.
export function pickBallKind(rand: number): BallKind {
	if (rand < 0.1) {
		return 'gold';
	}

	if (rand < 0.35) {
		return 'basket';
	}

	return 'normal';
}

// The round's winner (highest score, tie broken by name); null if no one scored.
export function topScorer(scores: Record<string, number>): string | null {
	const [top] = sortScores(scores);

	return top && top[1] > 0 ? top[0] : null;
}

export function formatCountdown(ms: number): string {
	const total = Math.max(0, Math.ceil(ms / 1000));
	const minutes = Math.floor(total / 60);
	const seconds = total % 60;

	return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

// A stable, distinct color per player, hashed from their name.
export function cursorColor(name: string): string {
	let hash = 0;

	for (let i = 0; i < name.length; i += 1) {
		hash = (hash * 31 + name.charCodeAt(i)) % 360;
	}

	return `hsl(${hash}, 70%, 60%)`;
}
```

Update `nextBall` to set the kind:

```ts
export function nextBall(prevId: number, nowMs: number): Ball {
	const {x, y} = randomBallPosition();
	const {vx, vy} = randomVelocity();

	return {
		claimedBy: null,
		id: prevId + 1,
		kind: pickBallKind(Math.random()),
		t0: nowMs,
		vx,
		vy,
		x0: x,
		y0: y,
	};
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/arena.test.ts`
Expected: PASS (existing + new).

- [ ] **Step 5: Commit**

```bash
git add src/lib/arena.ts src/lib/arena.test.ts
git commit --no-gpg-sign -m "Add ball kinds and round helpers to arena"
```

---

### Task 2: Round state machine in useArena

**Files:**
- Replace: `src/lib/useArena.ts`

**Interfaces:**
- Consumes: Task 1 exports.
- Produces: `type ArenaPhase = 'waiting'|'starting'|'playing'`; `useArena(name)` returns `{ball, cursors, endsAt, isReady, lastWinner, moveCursor, offset, phase, playerCount, present, ready, readyCount, scores, startsAt, toggleReady, tryClaim}` where `cursors`/`present` are `ArenaCursor[]` (cursors = others; present = all), `ready: Record<string, boolean>`.

- [ ] **Step 1: Write the file**

Replace `src/lib/useArena.ts` entirely with:

```ts
// src/lib/useArena.ts
import {onAuthStateChanged} from 'firebase/auth';
import {
	increment,
	onDisconnect,
	onValue,
	ref,
	runTransaction,
	serverTimestamp,
	set,
	update,
} from 'firebase/database';
import {useEffect, useRef, useState} from 'react';

import {
	type Ball,
	BALL_VALUES,
	ballPositionAt,
	isBallHit,
	MIN_PLAYERS,
	nextBall,
	ROUND_MS,
	START_COUNTDOWN_MS,
	topScorer,
} from './arena';
import {dataPath} from './dataRoot';
import {auth, db, signedIn} from './firebase';

const HIT_RADIUS = 0.06;
const MOVE_THROTTLE_MS = 50;
const TICK_MS = 300;

export type ArenaPhase = 'playing' | 'starting' | 'waiting';

export interface ArenaCursor {
	name: string;
	uid: string;
	x: number;
	y: number;
}

export interface ArenaRound {
	endsAt: number;
	lastWinner: string | null;
	phase: ArenaPhase;
	startsAt: number;
}

const DEFAULT_ROUND: ArenaRound = {
	endsAt: 0,
	lastWinner: null,
	phase: 'waiting',
	startsAt: 0,
};

export function useArena(name: string | null): {
	ball: Ball | null;
	cursors: ArenaCursor[];
	endsAt: number;
	isReady: boolean;
	lastWinner: string | null;
	moveCursor: (x: number, y: number) => void;
	offset: number;
	phase: ArenaPhase;
	playerCount: number;
	present: ArenaCursor[];
	ready: Record<string, boolean>;
	readyCount: number;
	scores: Record<string, number>;
	startsAt: number;
	toggleReady: () => void;
	tryClaim: (x: number, y: number) => void;
} {
	const [uid, setUid] = useState<string | null>(null);
	const [cursors, setCursors] = useState<ArenaCursor[]>([]);
	const [ball, setBall] = useState<Ball | null>(null);
	const [scores, setScores] = useState<Record<string, number>>({});
	const [offset, setOffset] = useState(0);
	const [round, setRound] = useState<ArenaRound>(DEFAULT_ROUND);
	const [ready, setReady] = useState<Record<string, boolean>>({});
	const lastMove = useRef(0);

	useEffect(() => {
		signedIn.catch(() => undefined);

		return onAuthStateChanged(auth, (user) => setUid(user?.uid ?? null));
	}, []);

	useEffect(
		() =>
			onValue(ref(db, '.info/serverTimeOffset'), (snapshot) => {
				setOffset((snapshot.val() as number | null) ?? 0);
			}),
		[]
	);

	useEffect(
		() =>
			onValue(ref(db, dataPath('arena/cursors')), (snapshot) => {
				const value =
					(snapshot.val() as Record<
						string,
						{name?: string; x?: number; y?: number}
					>) ?? {};

				setCursors(
					Object.entries(value).map(([id, cursor]) => ({
						name: cursor.name ?? '',
						uid: id,
						x: cursor.x ?? 0,
						y: cursor.y ?? 0,
					}))
				);
			}),
		[]
	);

	useEffect(
		() =>
			onValue(ref(db, dataPath('arena/ball')), (snapshot) => {
				setBall((snapshot.val() as Ball | null) ?? null);
			}),
		[]
	);

	useEffect(
		() =>
			onValue(ref(db, dataPath('arena/scores')), (snapshot) => {
				setScores((snapshot.val() as Record<string, number>) ?? {});
			}),
		[]
	);

	useEffect(
		() =>
			onValue(ref(db, dataPath('arena/round')), (snapshot) => {
				setRound((snapshot.val() as ArenaRound | null) ?? DEFAULT_ROUND);
			}),
		[]
	);

	useEffect(
		() =>
			onValue(ref(db, dataPath('arena/ready')), (snapshot) => {
				setReady((snapshot.val() as Record<string, boolean>) ?? {});
			}),
		[]
	);

	const serverNow = () => Date.now() + offset;
	const others = cursors.filter((cursor) => cursor.uid !== uid);
	const playerCount = cursors.length;
	const readyCount = Object.keys(ready).length;
	const isReady = Boolean(uid && ready[uid]);

	// Latest values for the ticker, read without restarting the interval.
	const refs = useRef({ball, offset, ready, readyCount, round, scores});
	refs.current = {ball, offset, ready, readyCount, round, scores};

	// Announce my presence at center as soon as I'm identified.
	useEffect(() => {
		if (!uid || !name) {
			return;
		}

		set(ref(db, `${dataPath('arena/cursors')}/${uid}`), {
			at: serverTimestamp(),
			name,
			x: 0.5,
			y: 0.5,
		}).catch(() => undefined);
	}, [uid, name]);

	// Remove my cursor + ready on disconnect or leave.
	useEffect(() => {
		if (!uid) {
			return undefined;
		}

		const cursorNode = ref(db, `${dataPath('arena/cursors')}/${uid}`);
		const readyNode = ref(db, `${dataPath('arena/ready')}/${uid}`);

		onDisconnect(cursorNode).remove();
		onDisconnect(readyNode).remove();

		return () => {
			set(cursorNode, null).catch(() => undefined);
			set(readyNode, null).catch(() => undefined);
		};
	}, [uid]);

	// The round driver: every client ticks; guarded transactions ensure only
	// one commits each transition.
	useEffect(() => {
		if (!uid) {
			return undefined;
		}

		const roundNode = ref(db, dataPath('arena/round'));
		const ballNode = ref(db, dataPath('arena/ball'));

		const id = setInterval(() => {
			const now = Date.now() + refs.current.offset;
			const {phase, startsAt, endsAt} = refs.current.round;
			const rc = refs.current.readyCount;

			if (phase === 'waiting' && rc >= MIN_PLAYERS) {
				runTransaction(roundNode, (current: ArenaRound | null) => {
					const value = current ?? DEFAULT_ROUND;

					return value.phase === 'waiting'
						? {...value, phase: 'starting', startsAt: now + START_COUNTDOWN_MS}
						: undefined;
				}).catch(() => undefined);
			}
			else if (phase === 'starting' && rc < MIN_PLAYERS) {
				runTransaction(roundNode, (current: ArenaRound | null) => {
					const value = current ?? DEFAULT_ROUND;

					return value.phase === 'starting'
						? {...value, phase: 'waiting', startsAt: 0}
						: undefined;
				}).catch(() => undefined);
			}
			else if (phase === 'starting' && now >= startsAt) {
				runTransaction(roundNode, (current: ArenaRound | null) => {
					const value = current ?? DEFAULT_ROUND;

					if (value.phase !== 'starting' || now < value.startsAt) {
						return undefined;
					}

					return {...value, endsAt: now + ROUND_MS, phase: 'playing'};
				})
					.then((result) => {
						const ok =
							result.committed &&
							(result.snapshot.val() as ArenaRound | null)?.phase ===
								'playing';

						if (ok) {
							set(ref(db, dataPath('arena/scores')), null).catch(
								() => undefined
							);
							runTransaction(ballNode, (current: Ball | null) =>
								current ?? nextBall(0, now)
							).catch(() => undefined);
						}
					})
					.catch(() => undefined);
			}
			else if (phase === 'playing' && now >= endsAt) {
				const winner = topScorer(refs.current.scores);

				runTransaction(roundNode, (current: ArenaRound | null) => {
					const value = current ?? DEFAULT_ROUND;

					if (value.phase !== 'playing' || now < value.endsAt) {
						return undefined;
					}

					return {...value, endsAt: 0, lastWinner: winner, phase: 'waiting'};
				})
					.then((result) => {
						const ok =
							result.committed &&
							(result.snapshot.val() as ArenaRound | null)?.phase ===
								'waiting';

						if (ok) {
							set(ballNode, null).catch(() => undefined);
							set(ref(db, dataPath('arena/ready')), null).catch(
								() => undefined
							);
						}
					})
					.catch(() => undefined);
			}
			else if (phase === 'playing' && !refs.current.ball) {
				runTransaction(ballNode, (current: Ball | null) =>
					current ?? nextBall(0, now)
				).catch(() => undefined);
			}
		}, TICK_MS);

		return () => clearInterval(id);
	}, [uid]);

	const moveCursor = (x: number, y: number) => {
		if (!uid || !name) {
			return;
		}

		const now = Date.now();

		if (now - lastMove.current < MOVE_THROTTLE_MS) {
			return;
		}

		lastMove.current = now;

		set(ref(db, `${dataPath('arena/cursors')}/${uid}`), {
			at: serverTimestamp(),
			name,
			x,
			y,
		}).catch(() => undefined);
	};

	const toggleReady = () => {
		if (!uid || !name || round.phase === 'playing') {
			return;
		}

		set(
			ref(db, `${dataPath('arena/ready')}/${uid}`),
			ready[uid] ? null : true
		).catch(() => undefined);
	};

	const tryClaim = (x: number, y: number) => {
		if (
			round.phase !== 'playing' ||
			!name ||
			!uid ||
			!ready[uid] ||
			!ball ||
			ball.claimedBy ||
			!isBallHit(x, y, ballPositionAt(ball, serverNow()), HIT_RADIUS)
		) {
			return;
		}

		const ballNode = ref(db, dataPath('arena/ball'));
		const claimedId = ball.id;
		const value = BALL_VALUES[ball.kind] ?? 1;

		runTransaction(ballNode, (current: Ball | null) => {
			if (!current || current.id !== claimedId || current.claimedBy) {
				return undefined;
			}

			return {...current, claimedBy: name};
		})
			.then((result) => {
				const committed =
					result.committed &&
					(result.snapshot.val() as Ball | null)?.claimedBy === name;

				if (committed) {
					update(ref(db, dataPath('arena/scores')), {
						[name]: increment(value),
					});
					set(ballNode, nextBall(claimedId, Date.now() + offset));
				}
			})
			.catch(() => undefined);
	};

	return {
		ball,
		cursors: others,
		endsAt: round.endsAt,
		isReady,
		lastWinner: round.lastWinner,
		moveCursor,
		offset,
		phase: round.phase,
		playerCount,
		present: cursors,
		ready,
		readyCount,
		scores,
		startsAt: round.startsAt,
		toggleReady,
		tryClaim,
	};
}
```

- [ ] **Step 2: Build to verify it compiles**

Run: `npm run build`
Expected: `✓ built` (will error in `ArenaView.tsx` until Task 3 — if so, that's expected; confirm the error is only ArenaView prop usage, then continue to Task 3 before committing). If the build fails ONLY inside `ArenaView.tsx`, proceed; commit after Task 3 builds clean.

Actually, to keep this task independently green, run `npx tsc --noEmit src/lib/useArena.ts` is not reliable; instead verify the hook file has no syntax error by building and confirming any errors are confined to `ArenaView.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/useArena.ts
git commit --no-gpg-sign -m "Rewrite useArena as a ready-check round state machine"
```

(The build may not be fully green until Task 3; that's acceptable for this commit since the two files are a unit. Task 3 restores a green build + tests.)

---

### Task 3: Arena round UI

**Files:**
- Replace: `src/components/ArenaView.tsx`

**Interfaces:**
- Consumes: `useArena` (Task 2); `BALL_EMOJI`, `BALL_VALUES`, `MIN_PLAYERS`, `ballPositionAt`, `cursorColor`, `formatCountdown`, `sortScores` (Task 1); `Avatar`.

- [ ] **Step 1: Write the file**

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
	const ballRef = useRef<HTMLSpanElement>(null);
	const [, setTick] = useState(0);

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

	// Animate the ball from the shared seed.
	useEffect(() => {
		if (!ball || phase !== 'playing') {
			return undefined;
		}

		let frame = 0;

		const tick = () => {
			const node = ballRef.current;

			if (node) {
				const position = ballPositionAt(ball, Date.now() + offset);

				node.style.left = `${position.x * 100}%`;
				node.style.top = `${position.y * 100}%`;
			}

			frame = requestAnimationFrame(tick);
		};

		frame = requestAnimationFrame(tick);

		return () => cancelAnimationFrame(frame);
	}, [ball, offset, phase]);

	const now = Date.now() + offset;
	const ranked = sortScores(scores);
	const playing = phase === 'playing';
	const ballStart =
		playing && ball ? ballPositionAt(ball, now) : null;
	const ballValue = ball ? BALL_VALUES[ball.kind] : 1;
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

						{playing && ball && ballStart && (
							<span
								className={`pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 text-3xl ${
									ball.kind === 'gold'
										? 'drop-shadow-[0_0_8px_gold]'
										: 'drop-shadow-lg'
								}`}
								ref={ballRef}
								style={{
									left: `${ballStart.x * 100}%`,
									top: `${ballStart.y * 100}%`,
								}}
							>
								{BALL_EMOJI[ball.kind]}

								{ball.kind !== 'normal' && (
									<span className="absolute -right-2 -top-1 rounded-full bg-black/70 px-1 text-[10px] font-bold text-amber-300">
										+{ballValue}
									</span>
								)}
							</span>
						)}

						{cursors.map((cursor) => (
							<div
								className="pointer-events-none absolute flex -translate-y-1 items-center gap-1"
								key={cursor.uid}
								style={{
									left: `${cursor.x * 100}%`,
									top: `${cursor.y * 100}%`,
								}}
							>
								<span
									aria-hidden
									className="text-lg"
									style={{color: cursorColor(cursor.name)}}
								>
									➤
								</span>

								<span
									className="rounded-full px-1.5 py-0.5 text-[10px] font-medium text-white"
									style={{
										backgroundColor: cursorColor(cursor.name),
									}}
								>
									{cursor.name}
								</span>
							</div>
						))}
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
Expected: `✓ built`; all tests pass (existing + Task 1's new helper tests).

- [ ] **Step 3: Commit**

```bash
git add src/components/ArenaView.tsx
git commit --no-gpg-sign -m "Arena round UI: ready-check, countdown, ball kinds, colored cursors"
```

---

## Notes

- The round driver is a 300ms `setInterval` reading latest state from a ref, so
  the effect never restarts; guarded transactions make every transition
  single-commit across clients.
- `arena/ready` doubles as the round's participant set — only ready players can
  `tryClaim`, and it's cleared at round end so everyone re-readies.
- Stale `arena/ball`/`arena/round` from the previous (always-on) game in `?demo`
  should be cleared once before testing (the round/kind shapes differ): delete
  `demo/arena/ball` and `demo/arena/round`. The live `arena/*` clears itself the
  first time the round machine runs (waiting has no ball).
- Manual test on `?demo` with 3 desktop browsers per the spec.
