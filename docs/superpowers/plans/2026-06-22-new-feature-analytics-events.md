# New-Feature Analytics Events Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Instrument the new features (global chat, slash commands, `/celebrate`, chat reactions, Arena) with Liferay Analytics Cloud custom events, reusing the existing `acTrack` call-site convention.

**Architecture:** Each event is a one-line `acTrack(eventId, props)` at the call site that already performs the action, mirroring the existing events (`player_reaction`, `goal_celebration_shown`, etc.). No new pure logic. Three areas, each independently reviewable: ChatPanel, App (chat button + celebrate), Arena (view + hook).

**Tech Stack:** React 19 + TypeScript, Firebase RTDB, `acTrack` from `src/lib/analyticsCloud.ts`, Vite, Vitest.

## Global Constraints

- Work on `master`; a single commit `--no-gpg-sign`, title-only (no body, no trailers).
- Push only to `interaminense/ac-world-cup-2026-bet`, never any Liferay remote.
- Event ids are snake_case, area-prefixed; props are flat string/number values (AC accepts numbers — see existing `match_reaction {matchNo}`).
- Do NOT add `acTrack` to pure-logic modules that the node-env Vitest suite imports (e.g. `src/lib/chatCommands.ts`, `src/lib/arena.ts`). Tracking lives in components and the browser hook `useArena.ts` only.
- Do NOT track cursor movement (high-volume stream).
- No new unit tests (no new pure logic); existing 191 tests must stay green and `npm run build` must be clean.

---

### Task 1: Chat panel events (`chat_message_sent`, `chat_command_used`, `chat_reaction`)

**Files:**
- Modify: `src/components/ChatPanel.tsx`

**Interfaces:**
- Consumes: `acTrack(eventId: string, properties?: Record<string, unknown>): void` from `../lib/analyticsCloud`; `parseChatInput(text: string): {arg: string; kind: ChatCommandKind}` from `../lib/chatCommands` where `kind` ∈ `'celebrate'|'help'|'me'|'message'|'picks'|'score'|'unknown'|'whatif'`; the existing `chatReactions` (`ReactionsApi`) with `mine: Record<string, string[]>`.

- [ ] **Step 1: Add imports**

In `src/components/ChatPanel.tsx`, change the chatCommands import to also pull `parseChatInput`, and add the analyticsCloud import. The import block currently starts:

```ts
import {runChatCommand} from '../lib/chatCommands';
```

Replace that line with:

```ts
import {acTrack} from '../lib/analyticsCloud';
import {parseChatInput, runChatCommand} from '../lib/chatCommands';
```

(Place `acTrack` import in alphabetical position among the `../lib/*` imports — before `chatCommands`. The final order of the leading imports should be `acTrack`, then `runChatCommand`/`parseChatInput`, then the existing `MatchCard`/types/`useChat`/`useChatReactions`/`Avatar`/`Reactions` imports already present.)

- [ ] **Step 2: Track message vs command in `submit()`**

In `submit()`, after the existing `setDraft('');` is the end of the function. Insert the tracking just before `setDraft('');`. The current tail of `submit` is:

```ts
		if (result.celebrate) {
			onCelebrate(result.celebrate);
		}

		setDraft('');
	};
```

Change it to:

```ts
		if (result.celebrate) {
			onCelebrate(result.celebrate);
		}

		const parsed = parseChatInput(draft);

		if (parsed.kind === 'message') {
			acTrack('chat_message_sent', {length: parsed.arg.length});
		}
		else {
			acTrack('chat_command_used', {command: parsed.kind});
		}

		setDraft('');
	};
```

- [ ] **Step 3: Track reactions in the per-message `Reactions`**

The `Reactions` element currently reads:

```tsx
								<Reactions
									counts={chatReactions.counts[msg.id] ?? {}}
									mine={chatReactions.mine[msg.id] ?? []}
									onReact={(emoji) =>
										chatReactions.toggle(msg.id, emoji)
									}
								/>
```

Change the `onReact` to compute the action from current `mine` before toggling, then track:

```tsx
								<Reactions
									counts={chatReactions.counts[msg.id] ?? {}}
									mine={chatReactions.mine[msg.id] ?? []}
									onReact={(emoji) => {
										const action = chatReactions.mine[
											msg.id
										]?.includes(emoji)
											? 'remove'
											: 'add';

										chatReactions.toggle(msg.id, emoji);
										acTrack('chat_reaction', {action, emoji});
									}}
								/>
```

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: clean TypeScript build.

---

### Task 2: App chat-button + celebrate events (`chat_opened`, `celebrate_sent`, `celebrate_shown`)

**Files:**
- Modify: `src/App.tsx` (already imports `acTrack`)

**Interfaces:**
- Consumes: `acTrack` (already imported); the existing `celebrate(name)` from `useCelebrate`, `celebrateEvent` (`{n, name}`), `setChatOpen`, and the `ChatButton`/`ChatPanel` JSX.

- [ ] **Step 1: Track `celebrate_shown` in the celebrate effect**

In the celebrate effect, the line `setCelebrating(celebrateEvent.name);` currently is followed by the setTimeout. Add the track right after it:

```ts
		setCelebrating(celebrateEvent.name);
		acTrack('celebrate_shown', {name: celebrateEvent.name});

		const timer = setTimeout(() => setCelebrating(null), 2600);
```

- [ ] **Step 2: Track `chat_opened` on the floating button**

Change:

```tsx
			{!chatOpen && <ChatButton onClick={() => setChatOpen(true)} />}
```

to:

```tsx
			{!chatOpen && (
				<ChatButton
					onClick={() => {
						setChatOpen(true);
						acTrack('chat_opened');
					}}
				/>
			)}
```

- [ ] **Step 3: Track `celebrate_sent` on the chat's celebrate action**

Change the `ChatPanel` prop:

```tsx
						onCelebrate={celebrate}
```

to:

```tsx
						onCelebrate={(name) => {
							celebrate(name);
							acTrack('celebrate_sent', {name});
						}}
```

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: clean TypeScript build.

---

### Task 3: Arena events (`arena_opened`, `arena_ready`, `arena_ball_caught`, `arena_round_finished`)

**Files:**
- Modify: `src/lib/useArena.ts`
- Modify: `src/components/ArenaView.tsx`

**Interfaces:**
- Consumes: `acTrack` from `../lib/analyticsCloud` (useArena) / `'../lib/analyticsCloud'` (ArenaView); in `tryClaim` the locals `ball` (`Ball` with `.kind`) and `value` (number points); in ArenaView the hook returns `phase: ArenaPhase` (`'playing'|'starting'|'waiting'`), `scores: Record<string, number>`, `present: ArenaCursor[]`, `isReady: boolean`, `toggleReady`, and the `ranked = sortScores(scores)` array of `[player, score]`, plus the `identity` prop.

- [ ] **Step 1: Track `arena_ball_caught` in `useArena.ts`**

Add the import at the top of `src/lib/useArena.ts`, after the firebase imports and before the `./arena` import (keep the relative imports grouped):

```ts
import {acTrack} from './analyticsCloud';
```

(Place it in alphabetical order among the `./*` imports: `./analyticsCloud`, then `./arena`, then `./dataRoot`, then `./firebase`.)

In `tryClaim`, the committed block currently is:

```ts
				if (committed) {
					update(ref(db, dataPath('arena/scores')), {
						[name]: increment(value),
					});
					set(ballNode, nextBall(claimedId, Date.now() + offset));
				}
```

Add the track:

```ts
				if (committed) {
					update(ref(db, dataPath('arena/scores')), {
						[name]: increment(value),
					});
					set(ballNode, nextBall(claimedId, Date.now() + offset));
					acTrack('arena_ball_caught', {kind: ball.kind, points: value});
				}
```

- [ ] **Step 2: Add the `acTrack` import to `ArenaView.tsx`**

At the top of `src/components/ArenaView.tsx`, add:

```ts
import {acTrack} from '../lib/analyticsCloud';
```

(Place before the `../lib/arena` import to keep `../lib/*` alphabetical: `analyticsCloud`, `arena`, `useArena`.)

- [ ] **Step 3: Track `arena_opened` on mount**

After the hook destructuring (the `const {...} = useArena(identity);` block) and the existing refs, add a mount effect. Put it next to the other `useEffect`s, e.g. right before the "Re-render once a tick" effect:

```ts
	useEffect(() => {
		acTrack('arena_opened');
	}, []);
```

- [ ] **Step 4: Track `arena_round_finished` on the playing→waiting transition**

`ranked`, `present`, `scores`, and `identity` are computed/available in the render body (`ranked` is defined as `const ranked = sortScores(scores);`). Add a ref that mirrors them each render plus a `prevPhase` ref, and an effect keyed on `phase`. Place the ref assignment near the other `*.current =` ref updates (after `drawState.current = ...`), and the effect among the other effects:

```ts
	const roundResultRef = useRef({identity, present, ranked, scores});

	roundResultRef.current = {identity, present, ranked, scores};

	const prevPhaseRef = useRef(phase);

	useEffect(() => {
		const prev = prevPhaseRef.current;

		prevPhaseRef.current = phase;

		if (prev !== 'playing' || phase !== 'waiting') {
			return;
		}

		const {
			identity: name,
			present: players,
			ranked: standings,
			scores: tally,
		} = roundResultRef.current;

		if (!name) {
			return;
		}

		const rankIndex = standings.findIndex(([player]) => player === name);

		acTrack('arena_round_finished', {
			players: players.length,
			rank: rankIndex >= 0 ? rankIndex + 1 : 0,
			score: tally[name] ?? 0,
		});
	}, [phase]);
```

(`ranked`/`present`/`scores`/`identity` must be declared above this effect. `ranked` and `now`/`playing` are currently declared *after* the JSX-prep section near `const now = Date.now() + offset;` — move the `roundResultRef` assignment and effect to **after** `const ranked = sortScores(scores);` so `ranked` is in scope, or compute `sortScores(scores)` inline in the ref assignment. Prefer placing both the ref update and the effect immediately after the `const ranked = sortScores(scores);` line.)

- [ ] **Step 5: Track `arena_ready` on the READY button**

The READY button currently is:

```tsx
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
```

Change `onClick`:

```tsx
										onClick={() => {
											if (!isReady) {
												acTrack('arena_ready');
											}

											toggleReady();
										}}
```

- [ ] **Step 6: Build**

Run: `npm run build`
Expected: clean TypeScript build.

---

### Final: tests, single commit, publish

- [ ] **Run unit tests**

Run: `npm test`
Expected: 191 passed (no behavior change to pure logic).

- [ ] **Commit (single, all areas)**

```bash
git add src/components/ChatPanel.tsx src/App.tsx src/lib/useArena.ts src/components/ArenaView.tsx
git commit --no-gpg-sign -m "Track AC custom events for chat, reactions, celebrate, and arena"
```

- [ ] **Publish**

Push `master`, watch `deploy.yml` to success. No RTDB rule needed.

## Self-Review

- **Spec coverage:** all 10 events mapped to a task — chat (Task 1: message/command/reaction), App (Task 2: opened/celebrate_sent/celebrate_shown), Arena (Task 3: opened/ready/ball_caught/round_finished). Guardrails honored: no cursor tracking; `arena_ball_caught` in the commit block (no miss-count); `arena_round_finished` per client (no global double-count); `acTrack` kept out of `chatCommands.ts`/`arena.ts`.
- **Placeholder scan:** none — every step has concrete code.
- **Type consistency:** `parseChatInput(...).kind` matches the `chat_command_used`/`chat_message_sent` branch; `chatReactions.mine[msg.id]?.includes(emoji)` → `'add'|'remove'`; `ball.kind`/`value` exist in `tryClaim`; `sortScores(scores)` is `[player, score][]` so `findIndex(([player]) => ...)` is valid; props are numbers/strings only.
