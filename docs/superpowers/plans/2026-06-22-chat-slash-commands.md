# Chat Slash Commands Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `/score`, `/picks`, `/whatif <a>-<b>`, `/me <action>`, and `/help` commands to the live match chat — data commands render only to the sender (ephemeral), `/me` broadcasts, no DB change.

**Architecture:** A pure, fully-tested `chatCommands.ts` (parser + formatters + router) returns `{broadcast?}` or `{ephemeral?}`. `LiveChatPanel` calls it on submit: broadcast → existing `send()`, ephemeral → local-only React state. `App` passes the match card + participants + games as command context.

**Tech Stack:** Vite 7 + React 19 + TypeScript + Tailwind 4, Vitest (node env → pure-logic tests only).

## Global Constraints

- Branch: commit to `chat-commands` (already checked out, off `master`). Never push to `master`; never publish until the user asks.
- Commit `--no-gpg-sign`, title-only messages. Keep the existing 135 tests green.
- No RTDB schema or rules change. Data commands never write to the DB.
- Visibility tags in `/help` are required: data commands say "(only you)", `/me` says "(public — everyone sees)".
- `/celebrate` is explicitly OUT of scope (deferred follow-up) — do not build it.
- Scores use an en dash `–` (e.g. `2–0`), matching the app's existing score style.

---

## File Structure

- `src/lib/chatCommands.ts` (create) — pure parser + formatters + router.
- `src/lib/chatCommands.test.ts` (create) — unit tests for the above.
- `src/components/LiveChatPanel.tsx` (modify) — call the router on submit; render ephemeral lines.
- `src/App.tsx` (modify) — pass `card` + `participants` + `games` to `LiveChatPanel`.

---

### Task 1: Pure chat-command engine

**Files:**
- Create: `src/lib/chatCommands.ts`
- Test: `src/lib/chatCommands.test.ts`

**Interfaces:**
- Consumes: `MatchCard` (`./matches`), `Game`, `Participant` (`./types`), `WhatIfMover`, `simulateWhatIf` (`./whatif`).
- Produces:
  - `parseChatInput(text: string): {arg: string; kind: ChatCommandKind}` where `ChatCommandKind = 'help'|'me'|'message'|'picks'|'score'|'unknown'|'whatif'`
  - `parseScoreArg(arg: string): {r1: number; r2: number} | null`
  - `formatScore(card: MatchCard | null): string`
  - `formatPicks(card: MatchCard | null): string`
  - `formatWhatIfMovers(movers: WhatIfMover[], label: string): string`
  - `formatWhatIf(ctx: ChatCommandContext, arg: string): string`
  - `formatMe(name: string, arg: string): string`
  - `HELP_TEXT: string`
  - `interface ChatCommandContext { card: MatchCard | null; games: Game[]; matchNo: number; name: string; participants: Participant[] }`
  - `runChatCommand(text: string, ctx: ChatCommandContext): {broadcast?: string; ephemeral?: string}`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/chatCommands.test.ts
import {describe, expect, it} from 'vitest';

import type {MatchCard} from './matches';
import {
	formatMe,
	formatPicks,
	formatScore,
	formatWhatIfMovers,
	HELP_TEXT,
	parseChatInput,
	parseScoreArg,
	runChatCommand,
} from './chatCommands';

const liveCard: MatchCard = {
	entries: [
		{name: 'Ana', p1: 2, p2: 0},
		{name: 'Bob', p1: 1, p2: 1},
		{name: 'Cid', p1: 0, p2: 3},
		{name: 'Dan', p1: 3, p2: 1},
	],
	group: 'A',
	matchNo: 28,
	r1: 2,
	r2: 0,
	status: 'live',
	team1: 'Mexico',
	team2: 'Korea Republic',
	timeElapsed: '67',
} as MatchCard;

const ctx = {
	card: liveCard,
	games: [],
	matchNo: 28,
	name: 'Adriano',
	participants: [],
};

describe('parseChatInput', () => {
	it('treats non-slash text as a message', () => {
		expect(parseChatInput('hello there')).toEqual({
			arg: 'hello there',
			kind: 'message',
		});
	});

	it('parses a bare command', () => {
		expect(parseChatInput('/score')).toEqual({arg: '', kind: 'score'});
	});

	it('parses a command with an argument', () => {
		expect(parseChatInput('/whatif 2-1')).toEqual({
			arg: '2-1',
			kind: 'whatif',
		});
	});

	it('keeps the full /me argument and is case-insensitive', () => {
		expect(parseChatInput('/ME comemora muito')).toEqual({
			arg: 'comemora muito',
			kind: 'me',
		});
	});

	it('flags an unknown command', () => {
		expect(parseChatInput('/bogus x').kind).toBe('unknown');
	});
});

describe('parseScoreArg', () => {
	it('parses a-b', () => {
		expect(parseScoreArg('2-1')).toEqual({r1: 2, r2: 1});
		expect(parseScoreArg('2 - 1')).toEqual({r1: 2, r2: 1});
	});

	it('rejects junk', () => {
		expect(parseScoreArg('abc')).toBeNull();
		expect(parseScoreArg('2')).toBeNull();
	});
});

describe('formatScore', () => {
	it('formats a live score with the minute', () => {
		expect(formatScore(liveCard)).toBe('Mexico 2–0 Korea Republic · 67\'');
	});

	it('handles no live match', () => {
		expect(formatScore(null)).toBe('No live score right now.');
		expect(formatScore({...liveCard, status: 'finished'})).toBe(
			'No live score right now.'
		);
	});
});

describe('formatPicks', () => {
	it('counts team1/draw/team2 from entries', () => {
		expect(formatPicks(liveCard)).toBe(
			'Pool picks: Mexico 2 · Draw 1 · Korea Republic 1'
		);
	});

	it('handles no entries', () => {
		expect(formatPicks({...liveCard, entries: []})).toBe(
			'No picks for this match.'
		);
	});
});

describe('formatWhatIfMovers', () => {
	it('shows movers with rank change and gained points', () => {
		const out = formatWhatIfMovers(
			[
				{name: 'Rachael', pointsDelta: 15, rankAfter: 1, rankBefore: 3, totalAfter: 240},
				{name: 'Caio', pointsDelta: 0, rankAfter: 2, rankBefore: 1, totalAfter: 230},
			],
			'Mexico 2–1 Korea Republic'
		);

		expect(out).toContain('If Mexico 2–1 Korea Republic:');
		expect(out).toContain('Rachael 3→1 (+15)');
		expect(out).toContain('Caio 1→2');
	});

	it('handles no movers', () => {
		expect(formatWhatIfMovers([], 'x')).toBe("Can't project this match.");
	});
});

describe('formatMe', () => {
	it('emotes', () => {
		expect(formatMe('Adriano', 'comemora')).toBe('* Adriano comemora');
	});
});

describe('HELP_TEXT', () => {
	it('tags each command visibility', () => {
		expect(HELP_TEXT).toContain('/score');
		expect(HELP_TEXT).toContain('(only you)');
		expect(HELP_TEXT).toContain('/me');
		expect(HELP_TEXT).toContain('(public — everyone sees)');
	});
});

describe('runChatCommand', () => {
	it('broadcasts a plain message', () => {
		expect(runChatCommand('vamos!', ctx)).toEqual({broadcast: 'vamos!'});
	});

	it('broadcasts /me as an emote', () => {
		expect(runChatCommand('/me chora', ctx)).toEqual({
			broadcast: '* Adriano chora',
		});
	});

	it('gives a usage hint for an empty /me', () => {
		expect(runChatCommand('/me', ctx).ephemeral).toBe('Usage: /me <action>');
	});

	it('returns ephemeral data for /score and /picks', () => {
		expect(runChatCommand('/score', ctx).ephemeral).toBe(
			'Mexico 2–0 Korea Republic · 67\''
		);
		expect(runChatCommand('/picks', ctx).ephemeral).toContain('Pool picks:');
	});

	it('returns ephemeral help and unknown', () => {
		expect(runChatCommand('/help', ctx).ephemeral).toBe(HELP_TEXT);
		expect(runChatCommand('/nope', ctx).ephemeral).toBe(
			'Unknown command. Try /help'
		);
	});

	it('gives a usage hint for a bad /whatif arg', () => {
		expect(runChatCommand('/whatif abc', ctx).ephemeral).toBe(
			'Usage: /whatif 2-1'
		);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/chatCommands.test.ts`
Expected: FAIL — cannot resolve `./chatCommands`.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/chatCommands.ts
import type {MatchCard} from './matches';
import type {Game, Participant} from './types';
import {simulateWhatIf, type WhatIfMover} from './whatif';

export type ChatCommandKind =
	| 'help'
	| 'me'
	| 'message'
	| 'picks'
	| 'score'
	| 'unknown'
	| 'whatif';

export interface ChatCommandContext {
	card: MatchCard | null;
	games: Game[];
	matchNo: number;
	name: string;
	participants: Participant[];
}

const COMMANDS: Record<string, ChatCommandKind> = {
	help: 'help',
	me: 'me',
	picks: 'picks',
	score: 'score',
	whatif: 'whatif',
};

export function parseChatInput(text: string): {
	arg: string;
	kind: ChatCommandKind;
} {
	const trimmed = text.trim();

	if (!trimmed.startsWith('/')) {
		return {arg: trimmed, kind: 'message'};
	}

	const space = trimmed.indexOf(' ');
	const word = (
		space === -1 ? trimmed.slice(1) : trimmed.slice(1, space)
	).toLowerCase();

	return {
		arg: space === -1 ? '' : trimmed.slice(space + 1).trim(),
		kind: COMMANDS[word] ?? 'unknown',
	};
}

export function parseScoreArg(arg: string): {r1: number; r2: number} | null {
	const match = arg.match(/^(\d+)\s*-\s*(\d+)$/);

	return match ? {r1: Number(match[1]), r2: Number(match[2])} : null;
}

export const HELP_TEXT = [
	'Commands:',
	'/score — current score (only you)',
	'/picks — pool picks for this match (only you)',
	'/whatif 2-1 — projected standings (only you)',
	'/me <action> — emote (public — everyone sees)',
	'/help — this list (only you)',
].join('\n');

export function formatScore(card: MatchCard | null): string {
	if (
		!card ||
		card.status !== 'live' ||
		card.r1 === undefined ||
		card.r2 === undefined
	) {
		return 'No live score right now.';
	}

	const minute = /^\d+$/.test(card.timeElapsed ?? '')
		? ` · ${card.timeElapsed}'`
		: '';

	return `${card.team1} ${card.r1}–${card.r2} ${card.team2}${minute}`;
}

export function formatPicks(card: MatchCard | null): string {
	if (!card || card.entries.length === 0) {
		return 'No picks for this match.';
	}

	let team1 = 0;
	let draw = 0;
	let team2 = 0;

	for (const entry of card.entries) {
		if (entry.p1 > entry.p2) {
			team1 += 1;
		}
		else if (entry.p1 < entry.p2) {
			team2 += 1;
		}
		else {
			draw += 1;
		}
	}

	return `Pool picks: ${card.team1} ${team1} · Draw ${draw} · ${card.team2} ${team2}`;
}

export function formatWhatIfMovers(
	movers: WhatIfMover[],
	label: string
): string {
	if (movers.length === 0) {
		return "Can't project this match.";
	}

	const moved = movers.filter((mover) => mover.rankAfter !== mover.rankBefore);
	const shown = (moved.length > 0 ? moved : movers).slice(0, 4);

	const parts = shown.map((mover) => {
		const rank =
			mover.rankBefore === mover.rankAfter
				? `#${mover.rankAfter}`
				: `${mover.rankBefore}→${mover.rankAfter}`;
		const delta = mover.pointsDelta > 0 ? ` (+${mover.pointsDelta})` : '';

		return `${mover.name} ${rank}${delta}`;
	});

	return `If ${label}: ${parts.join(' · ')}`;
}

export function formatWhatIf(ctx: ChatCommandContext, arg: string): string {
	const score = parseScoreArg(arg);

	if (!score) {
		return 'Usage: /whatif 2-1';
	}

	const team1 = ctx.card?.team1 ?? 'Team 1';
	const team2 = ctx.card?.team2 ?? 'Team 2';
	const movers = simulateWhatIf(
		ctx.participants,
		ctx.games,
		ctx.matchNo,
		score.r1,
		score.r2
	);

	return formatWhatIfMovers(
		movers,
		`${team1} ${score.r1}–${score.r2} ${team2}`
	);
}

export function formatMe(name: string, arg: string): string {
	return `* ${name} ${arg}`;
}

export function runChatCommand(
	text: string,
	ctx: ChatCommandContext
): {broadcast?: string; ephemeral?: string} {
	const {arg, kind} = parseChatInput(text);

	switch (kind) {
		case 'help':
			return {ephemeral: HELP_TEXT};
		case 'me':
			return arg
				? {broadcast: formatMe(ctx.name, arg)}
				: {ephemeral: 'Usage: /me <action>'};
		case 'picks':
			return {ephemeral: formatPicks(ctx.card)};
		case 'score':
			return {ephemeral: formatScore(ctx.card)};
		case 'unknown':
			return {ephemeral: 'Unknown command. Try /help'};
		case 'whatif':
			return {ephemeral: formatWhatIf(ctx, arg)};
		default:
			return {broadcast: text.trim()};
	}
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/chatCommands.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/lib/chatCommands.ts src/lib/chatCommands.test.ts
git commit --no-gpg-sign -m "Add pure chat slash-command engine"
```

---

### Task 2: Wire commands into the chat panel and App

**Files:**
- Modify: `src/components/LiveChatPanel.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `runChatCommand`, `ChatCommandContext` (Task 1); `MatchCard` (`../lib/matches`), `Game`, `Participant` (`../lib/types`).
- Produces: `LiveChatPanel` gains props `card: MatchCard | null`, `games: Game[]`, `participants: Participant[]`.

- [ ] **Step 1: LiveChatPanel — imports, props, ephemeral state**

In `src/components/LiveChatPanel.tsx`, add imports:

```tsx
import {runChatCommand} from '../lib/chatCommands';
import type {MatchCard} from '../lib/matches';
import type {Game, Participant} from '../lib/types';
```

Extend the `Props` interface with:

```tsx
	card: MatchCard | null;
	games: Game[];
	participants: Participant[];
```

Add them to the destructured params (`card`, `games`, `participants`), and add ephemeral state + an id counter next to the existing `draft` state:

```tsx
	const [ephemeral, setEphemeral] = useState<{id: number; text: string}[]>(
		[]
	);
	const ephemeralId = useRef(0);
```

- [ ] **Step 2: LiveChatPanel — route input through runChatCommand**

Replace the `submit` function with:

```tsx
	const submit = () => {
		if (!identity || !draft.trim()) {
			return;
		}

		const result = runChatCommand(draft, {
			card,
			games,
			matchNo,
			name: identity,
			participants,
		});

		if (result.broadcast) {
			send(identity, result.broadcast);
		}

		if (result.ephemeral) {
			setEphemeral((current) => [
				...current,
				{id: (ephemeralId.current += 1), text: result.ephemeral as string},
			]);
		}

		setDraft('');
	};
```

- [ ] **Step 3: LiveChatPanel — render the only-you lines**

In the messages scroll container, immediately before `<div ref={bottomRef} />`, add:

```tsx
				{ephemeral.map((line) => (
					<div className="flex justify-center" key={line.id}>
						<div className="max-w-[85%] rounded-xl bg-white/5 px-3 py-1.5 text-xs text-slate-400">
							<span className="mr-1" aria-hidden>
								🤖
							</span>

							<span className="whitespace-pre-line">{line.text}</span>

							<span className="ml-1 text-[9px] uppercase tracking-wide text-slate-600">
								only you
							</span>
						</div>
					</div>
				))}
```

Also update the input placeholder to hint commands — change `placeholder="Type a message…"` to:

```tsx
						placeholder="Message or /help"
```

- [ ] **Step 4: App — pass the command context**

In `src/App.tsx`, find the `<LiveChatPanel ... />` render (it is inside the `chatMatchNo` block, where `chatCard` is already computed via `cards.find(...)`). Add these three props to it:

```tsx
							card={chatCard}
							games={games}
							participants={participants}
```

(`games` is `const games = gamesFile?.games ?? []` and `participants` are already in scope at that point.)

- [ ] **Step 5: Build + full test suite**

Run: `npm run build && npx vitest run`
Expected: `✓ built`; tests pass (135 prior + the new chatCommands tests).

- [ ] **Step 6: Commit**

```bash
git add src/components/LiveChatPanel.tsx src/App.tsx
git commit --no-gpg-sign -m "Wire slash commands into the live chat panel"
```

---

### Task 3: Add `/celebrate` to the command engine

**Files:**
- Modify: `src/lib/chatCommands.ts`
- Modify: `src/lib/chatCommands.test.ts`

**Interfaces:**
- Consumes: `parseChatInput`, `runChatCommand`, `ChatCommandContext` (Task 1).
- Produces: `resolveCelebrateTarget(arg: string, participants: Participant[]): {name: string} | null`; `runChatCommand` result gains an optional `celebrate?: string`; `HELP_TEXT` gains a `/celebrate` line; the kind `'celebrate'`.

- [ ] **Step 1: Add the failing tests**

Append to `src/lib/chatCommands.test.ts`:

```ts
import {resolveCelebrateTarget} from './chatCommands';
import type {Participant} from './types';

const participants = [
	{name: 'Rachael', predictions: []},
	{name: 'Caio', predictions: []},
] as Participant[];

describe('resolveCelebrateTarget', () => {
	it('matches case-insensitively', () => {
		expect(resolveCelebrateTarget('rachael', participants)).toEqual({
			name: 'Rachael',
		});
	});

	it('matches a prefix', () => {
		expect(resolveCelebrateTarget('cai', participants)).toEqual({
			name: 'Caio',
		});
	});

	it('returns null for no match', () => {
		expect(resolveCelebrateTarget('zzz', participants)).toBeNull();
	});
});

describe('runChatCommand /celebrate', () => {
	const cctx = {...ctx, participants};

	it('returns a celebrate effect when the name resolves', () => {
		expect(runChatCommand('/celebrate rachael', cctx)).toEqual({
			celebrate: 'Rachael',
		});
	});

	it('is ephemeral when the name does not resolve', () => {
		expect(runChatCommand('/celebrate zzz', cctx).ephemeral).toBe(
			'No one named "zzz" in the pool'
		);
	});

	it('gives a usage hint when empty', () => {
		expect(runChatCommand('/celebrate', cctx).ephemeral).toBe(
			'Usage: /celebrate <name>'
		);
	});

	it('lists /celebrate in help as public', () => {
		expect(HELP_TEXT).toContain('/celebrate');
	});
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/chatCommands.test.ts`
Expected: FAIL — `resolveCelebrateTarget` not exported / `/celebrate` not handled.

- [ ] **Step 3: Implement**

In `src/lib/chatCommands.ts`:

Add `'celebrate'` to the `ChatCommandKind` union and to `COMMANDS`:

```ts
const COMMANDS: Record<string, ChatCommandKind> = {
	celebrate: 'celebrate',
	help: 'help',
	me: 'me',
	picks: 'picks',
	score: 'score',
	whatif: 'whatif',
};
```

(Add `| 'celebrate'` to the `ChatCommandKind` type.)

Add the resolver:

```ts
export function resolveCelebrateTarget(
	arg: string,
	participants: Participant[]
): {name: string} | null {
	const needle = arg.trim().toLowerCase();

	if (!needle) {
		return null;
	}

	const exact = participants.find(
		(participant) => participant.name.toLowerCase() === needle
	);
	const prefix = participants.find((participant) =>
		participant.name.toLowerCase().startsWith(needle)
	);
	const match = exact ?? prefix;

	return match ? {name: match.name} : null;
}
```

Add the `/celebrate` line to `HELP_TEXT` (insert before the `/me` line):

```ts
	'/celebrate <name> — celebrate someone (public — everyone sees)',
```

Extend the `runChatCommand` return type to include `celebrate?: string` and add the case:

```ts
export function runChatCommand(
	text: string,
	ctx: ChatCommandContext
): {broadcast?: string; celebrate?: string; ephemeral?: string} {
	const {arg, kind} = parseChatInput(text);

	switch (kind) {
		case 'celebrate': {
			if (!arg) {
				return {ephemeral: 'Usage: /celebrate <name>'};
			}

			const target = resolveCelebrateTarget(arg, ctx.participants);

			return target
				? {celebrate: target.name}
				: {ephemeral: `No one named "${arg}" in the pool`};
		}
		case 'help':
			return {ephemeral: HELP_TEXT};
		case 'me':
			return arg
				? {broadcast: formatMe(ctx.name, arg)}
				: {ephemeral: 'Usage: /me <action>'};
		case 'picks':
			return {ephemeral: formatPicks(ctx.card)};
		case 'score':
			return {ephemeral: formatScore(ctx.card)};
		case 'unknown':
			return {ephemeral: 'Unknown command. Try /help'};
		case 'whatif':
			return {ephemeral: formatWhatIf(ctx, arg)};
		default:
			return {broadcast: text.trim()};
	}
}
```

Make sure `Participant` is imported (it already is, from `./types`).

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/chatCommands.test.ts`
Expected: PASS (Task 1 tests + the new celebrate tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/chatCommands.ts src/lib/chatCommands.test.ts
git commit --no-gpg-sign -m "Add /celebrate to the chat command engine"
```

---

### Task 4: Realtime celebrate broadcast — hook, overlay, wiring

**Files:**
- Create: `src/lib/useCelebrate.ts`
- Create: `src/components/CelebrateOverlay.tsx`
- Modify: `src/index.css`
- Modify: `src/App.tsx`
- Modify: `src/components/LiveChatPanel.tsx`

**Interfaces:**
- Consumes: `dataPath` (`./dataRoot`), `db` (`./firebase`); `Avatar` (`./Avatar`); `runChatCommand` result `celebrate` (Task 3).
- Produces: `useCelebrate(): {celebrate: (name: string) => void; last: {n: number; name: string}}`; `CelebrateOverlay({name}: {name: string})`; `LiveChatPanel` prop `onCelebrate: (name: string) => void`.

- [ ] **Step 1: useCelebrate hook (mirror useLeaderHype)**

Create `src/lib/useCelebrate.ts`:

```ts
import {increment, onValue, ref, update} from 'firebase/database';
import {useEffect, useState} from 'react';

import {dataPath} from './dataRoot';
import {db} from './firebase';

// A shared, everyone-sees-it celebration. `/celebrate <name>` bumps a counter
// plus the celebrated participant's name; every online client detects the bump
// and renders a full-screen burst — same broadcast pattern as the leader hype.
export interface CelebrateEvent {
	n: number;
	name: string;
}

export function useCelebrate(): {
	celebrate: (name: string) => void;
	last: CelebrateEvent;
} {
	const [last, setLast] = useState<CelebrateEvent>({n: 0, name: ''});

	useEffect(
		() =>
			onValue(ref(db, dataPath('celebrate')), (snapshot) => {
				const value = snapshot.val() as CelebrateEvent | null;

				if (value) {
					setLast({n: value.n ?? 0, name: value.name ?? ''});
				}
			}),
		[]
	);

	const celebrate = (name: string) => {
		update(ref(db, dataPath('celebrate')), {n: increment(1), name});
	};

	return {celebrate, last};
}
```

- [ ] **Step 2: The burst keyframe in index.css**

In `src/index.css`, add to the `@theme` block (next to the existing `--animate-flame`):

```css
	--animate-celebrate-pop: celebrate-pop 1.6s ease-out forwards;
```

And add the keyframe (next to the `flame` keyframe):

```css
/* Emoji flying outward from the celebrated avatar. */
@keyframes celebrate-pop {
	0% {
		transform: translate(-50%, -50%) scale(0.4);
		opacity: 0;
	}
	15% {
		opacity: 1;
	}
	100% {
		transform: translate(
				calc(-50% + var(--dx)),
				calc(-50% + var(--dy))
			)
			scale(1.2);
		opacity: 0;
	}
}
```

- [ ] **Step 3: CelebrateOverlay component**

Create `src/components/CelebrateOverlay.tsx`:

```tsx
import {Avatar} from './Avatar';

const EMOJIS = ['🎉', '🥳', '🎊', '⭐', '🔥', '👏', '🙌', '💥', '✨', '🏆', '⚽', '💚'];

// Full-screen, everyone-sees-it celebration: the participant's avatar with a
// ring of emojis flying outward. Presentational — the parent mounts it for the
// duration and unmounts it.
export function CelebrateOverlay({name}: {name: string}) {
	return (
		<div className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center">
			<div className="flex flex-col items-center gap-3">
				<div className="relative">
					<Avatar
						className="h-28 w-28 animate-bounce rounded-full shadow-2xl ring-4 ring-emerald-400/60"
						name={name}
					/>

					{EMOJIS.map((emoji, index) => {
						const angle = (index / EMOJIS.length) * Math.PI * 2;

						return (
							<span
								className="animate-celebrate-pop absolute left-1/2 top-1/2 text-3xl"
								key={index}
								style={{
									['--dx' as string]: `${Math.cos(angle) * 150}px`,
									['--dy' as string]: `${Math.sin(angle) * 150}px`,
								}}
							>
								{emoji}
							</span>
						);
					})}
				</div>

				<span className="rounded-full bg-black/60 px-4 py-1.5 text-lg font-bold text-white shadow-lg">
					🎉 {name}!
				</span>
			</div>
		</div>
	);
}
```

- [ ] **Step 4: LiveChatPanel — trigger the celebrate effect**

In `src/components/LiveChatPanel.tsx`, add `onCelebrate: (name: string) => void` to the `Props` interface and the destructured params. In the `submit` function, after the `result` is computed, add (alongside the broadcast/ephemeral handling):

```tsx
		if (result.celebrate) {
			onCelebrate(result.celebrate);
		}
```

- [ ] **Step 5: App — wire the hook, overlay, and panel prop**

In `src/App.tsx`:

Add imports:

```tsx
import {CelebrateOverlay} from './components/CelebrateOverlay';
import {useCelebrate} from './lib/useCelebrate';
```

Near the other hooks (next to `useLeaderHype`):

```tsx
	const {celebrate, last: celebrateEvent} = useCelebrate();
	const prevCelebrateN = useRef<number | null>(null);
	const [celebrating, setCelebrating] = useState<string | null>(null);
```

Add an effect (mirroring the leader-hype de-dupe) that shows the overlay on a bump:

```tsx
	// A celebrate event bumped — show the overlay for everyone, briefly.
	useEffect(() => {
		const prev = prevCelebrateN.current;

		prevCelebrateN.current = celebrateEvent.n;

		if (prev === null || celebrateEvent.n <= prev || !celebrateEvent.name) {
			return;
		}

		setCelebrating(celebrateEvent.name);

		const timer = setTimeout(() => setCelebrating(null), 2600);

		return () => clearTimeout(timer);
	}, [celebrateEvent]);
```

Render the overlay near `<CheerBurstLayer ... />`:

```tsx
			{celebrating && <CelebrateOverlay name={celebrating} />}
```

Pass `onCelebrate` to `<LiveChatPanel ... />` (alongside the props from Task 2):

```tsx
							onCelebrate={celebrate}
```

- [ ] **Step 6: Build + full suite**

Run: `npm run build && npx vitest run`
Expected: `✓ built`; all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/lib/useCelebrate.ts src/components/CelebrateOverlay.tsx src/index.css src/App.tsx src/components/LiveChatPanel.tsx
git commit --no-gpg-sign -m "Add realtime /celebrate broadcast with avatar burst"
```

---

## Notes

- Ephemeral lines are local React state — they are not persisted and clear when
  the panel closes or the page reloads. That's intended.
- Manual test on `?demo` (a live match exists): `/score`, `/picks`, `/whatif 2-1`,
  `/help` show only-you lines; `/me dança` posts `* <name> dança` for everyone; a
  second device confirms the split.
- `/celebrate` (Tasks 3–4) broadcasts via the `celebrate` RTDB node and shows on
  every online client; on `?demo` it writes `demo/celebrate` (open, no rule). For
  production a `"celebrate": {".read": true, ".write": "auth != null"}` rule is
  needed — deferred until publish, not required for demo testing.
