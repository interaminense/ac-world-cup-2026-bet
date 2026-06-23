# Match Status Bot + Chat Unread Badge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An automated bot posts to the chat on kickoff/goal/full-time (with flag emoji + score), and the chat button shows an unread count that clears when opened.

**Architecture:** The bot lives in the server-side poller (`scripts/push-scores.mjs`), which is the single writer that already diffs `games` every minute and holds the admin SDK — so each transition posts exactly once. Flag emoji come from a shared `team-flags.json` (used by both `flags.ts` and a new `scripts/flag-emoji.mjs`). The unread badge is a client hook (`useChatUnread`) backed by `localStorage`.

**Tech Stack:** Node 22 ESM (`.mjs` poller + JSON import attributes), `firebase-admin`, React 19 + TypeScript, Firebase RTDB client SDK, Vitest (node env — pure logic only).

## Global Constraints

- Work on `master`; commits `--no-gpg-sign`, title-only (no body/trailers).
- Push only to `interaminense/ac-world-cup-2026-bet`.
- Bot messages are **language-neutral** (emoji + team names + score + LIVE/GOOOAL/FT). One shared string per message — never localized per-viewer.
- Goal **scorer is out of scope** (FIFA calendar API has no goal events) — announce the scoring team only.
- The poller writes to the **literal** `'chatRoom'` / `'games'` paths (no `dataPath`, which is client-only/TS).
- Bot identity: `name: '⚽ Match Bot'` (define once as `BOT_NAME`).
- Do NOT add `acTrack`/analytics to pure-logic modules the node test suite imports.

---

### Task 1: Shared flag emoji (`team-flags.json` + `flag-emoji.mjs`)

**Files:**
- Create: `src/data/team-flags.json`
- Modify: `src/lib/flags.ts` (import the JSON instead of the inline literal)
- Create: `scripts/flag-emoji.mjs`
- Create: `scripts/flag-emoji.test.mjs`

**Interfaces:**
- Produces: `teamFlagEmoji(name: string): string` from `scripts/flag-emoji.mjs` (flag emoji, or `🏳️` for unknown). `src/data/team-flags.json` = `Record<string, string>` (team name → flagcdn code).

- [ ] **Step 1: Create `src/data/team-flags.json`** with the exact pairs currently in `flags.ts`:

```json
{
	"Algeria": "dz",
	"Argentina": "ar",
	"Australia": "au",
	"Austria": "at",
	"Belgium": "be",
	"Bosnia and Herzegovina": "ba",
	"Brazil": "br",
	"Cabo Verde": "cv",
	"Canada": "ca",
	"Colombia": "co",
	"Congo DR": "cd",
	"Côte d'Ivoire": "ci",
	"Croatia": "hr",
	"Curaçao": "cw",
	"Czechia": "cz",
	"Ecuador": "ec",
	"Egypt": "eg",
	"England": "gb-eng",
	"France": "fr",
	"Germany": "de",
	"Ghana": "gh",
	"Haiti": "ht",
	"IR Iran": "ir",
	"Iraq": "iq",
	"Japan": "jp",
	"Jordan": "jo",
	"Korea Republic": "kr",
	"Mexico": "mx",
	"Morocco": "ma",
	"Netherlands": "nl",
	"New Zealand": "nz",
	"Norway": "no",
	"Panama": "pa",
	"Paraguay": "py",
	"Portugal": "pt",
	"Qatar": "qa",
	"Saudi Arabia": "sa",
	"Scotland": "gb-sct",
	"Senegal": "sn",
	"South Africa": "za",
	"Spain": "es",
	"Sweden": "se",
	"Switzerland": "ch",
	"Tunisia": "tn",
	"Türkiye": "tr",
	"USA": "us",
	"Uruguay": "uy",
	"Uzbekistan": "uz",
	"Wales": "gb-wls"
}
```

- [ ] **Step 2: Point `flags.ts` at the JSON.** In `src/lib/flags.ts`, delete the inline `const BY_NAME: Record<string, string> = { ... };` literal and replace the file head with:

```ts
// FIFA team names (as they appear in the pool sheet) → flagcdn codes.
// England/Scotland/Wales use GB subdivision codes; everything else is ISO 3166-1.
import BY_NAME from '../data/team-flags.json';
```

Leave `normalize`, `CODES`, `flagCode`, `flagUrl` exactly as they are.

- [ ] **Step 3: Run the existing flags tests (must stay green)**

Run: `npx vitest run src/lib/flags.test.ts`
Expected: PASS (the JSON has identical pairs).

If it fails with a JSON-import type error, ensure `tsconfig.app.json` (or `tsconfig.json`) has `"resolveJsonModule": true` and `"esModuleInterop": true`; add them if missing, then re-run.

- [ ] **Step 4: Write the failing test for `flag-emoji.mjs`**

Create `scripts/flag-emoji.test.mjs`:

```js
import {describe, expect, it} from 'vitest';

import {teamFlagEmoji} from './flag-emoji.mjs';

describe('teamFlagEmoji', () => {
	it('maps a two-letter ISO country to its flag', () => {
		expect(teamFlagEmoji('France')).toBe('🇫🇷');
		expect(teamFlagEmoji('Iraq')).toBe('🇮🇶');
	});

	it('maps a fuzzy / special FIFA name', () => {
		expect(teamFlagEmoji('IR Iran')).toBe('🇮🇷');
	});

	it('maps a GB subdivision to its tag-sequence flag', () => {
		expect(teamFlagEmoji('England')).toBe('🏴\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}');
	});

	it('falls back for an unknown name', () => {
		expect(teamFlagEmoji('Wakanda')).toBe('🏳️');
	});
});
```

- [ ] **Step 5: Run it to verify it fails**

Run: `npx vitest run scripts/flag-emoji.test.mjs`
Expected: FAIL ("Cannot find module './flag-emoji.mjs'").

- [ ] **Step 6: Implement `scripts/flag-emoji.mjs`**

```js
import BY_NAME from '../src/data/team-flags.json' with {type: 'json'};

function normalize(name) {
	return name
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]/g, '');
}

const BY_NORM = Object.fromEntries(
	Object.entries(BY_NAME).map(([name, code]) => [normalize(name), code])
);

// 'gb-eng' → 🏴 + tag letters for 'gbeng' + cancel tag.
function subdivisionFlag(code) {
	const tag = code.replace('-', '');

	return (
		'\u{1F3F4}' +
		[...tag]
			.map((char) => String.fromCodePoint(0xe0000 + char.charCodeAt(0)))
			.join('') +
		'\u{E007F}'
	);
}

// 'fr' → 🇫🇷 (two regional indicator symbols).
function regionalIndicator(code) {
	return code
		.toUpperCase()
		.replace(/./g, (char) =>
			String.fromCodePoint(127397 + char.charCodeAt(0))
		);
}

export function teamFlagEmoji(name) {
	const code = BY_NORM[normalize(name)];

	if (!code) {
		return '🏳️';
	}

	return code.includes('-')
		? subdivisionFlag(code)
		: regionalIndicator(code);
}
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `npx vitest run scripts/flag-emoji.test.mjs`
Expected: PASS (4 tests).

- [ ] **Step 8: Commit**

```bash
git add src/data/team-flags.json src/lib/flags.ts scripts/flag-emoji.mjs scripts/flag-emoji.test.mjs
git commit --no-gpg-sign -m "Add shared team-flags data and flag-emoji helper"
```

---

### Task 2: Bot engine (`match-bot.mjs`)

**Files:**
- Create: `scripts/match-bot.mjs`
- Create: `scripts/match-bot.test.mjs`

**Interfaces:**
- Consumes: `teamFlagEmoji` from `./flag-emoji.mjs`. Game objects shaped `{id, homeTeam, awayTeam, homeScore, awayScore, finished, timeElapsed}` (the normalized poller shape).
- Produces: `detectMatchEvents(previousGames, games): Event[]` (pure), `formatEvent(event): string` (pure), `postMatchEvents(db, previousGames, games): Promise<number>`, and `BOT_NAME = '⚽ Match Bot'`. `Event = {type: 'kickoff'|'goal'|'final', game, side?}`.

- [ ] **Step 1: Write the failing tests**

Create `scripts/match-bot.test.mjs`:

```js
import {describe, expect, it} from 'vitest';

import {detectMatchEvents, formatEvent} from './match-bot.mjs';

const base = {
	awayScore: 0,
	awayTeam: 'Iraq',
	finished: false,
	homeScore: 0,
	homeTeam: 'France',
	id: 1,
	timeElapsed: 'notstarted',
};

describe('detectMatchEvents', () => {
	it('returns nothing when there is no previous snapshot', () => {
		expect(detectMatchEvents(null, [base])).toEqual([]);
	});

	it('detects a kickoff (notstarted -> live)', () => {
		const events = detectMatchEvents(
			[base],
			[{...base, timeElapsed: '1'}]
		);

		expect(events).toEqual([{game: {...base, timeElapsed: '1'}, type: 'kickoff'}]);
	});

	it('detects a home and an away goal while live', () => {
		const prev = [{...base, timeElapsed: '20'}];
		const next = [{...base, awayScore: 1, homeScore: 1, timeElapsed: '40'}];
		const events = detectMatchEvents(prev, next);

		expect(events.map((e) => [e.type, e.side])).toEqual([
			['goal', 'home'],
			['goal', 'away'],
		]);
	});

	it('detects full time (live -> finished) without a goal event', () => {
		const prev = [{...base, homeScore: 2, timeElapsed: '90'}];
		const next = [
			{...base, finished: true, homeScore: 2, timeElapsed: 'finished'},
		];
		const events = detectMatchEvents(prev, next);

		expect(events.map((e) => e.type)).toEqual(['final']);
	});
});

describe('formatEvent', () => {
	const game = {
		awayScore: 0,
		awayTeam: 'Iraq',
		homeScore: 1,
		homeTeam: 'France',
		id: 1,
	};

	it('formats kickoff with flags', () => {
		expect(formatEvent({game, type: 'kickoff'})).toBe(
			'🟢 LIVE — 🇫🇷 France 🆚 Iraq 🇮🇶'
		);
	});

	it('formats a goal with the scoring team', () => {
		expect(formatEvent({game, side: 'home', type: 'goal'})).toBe(
			'⚽ GOOOOAL! 🇫🇷 France — France 1-0 Iraq'
		);
	});

	it('formats full time with the score', () => {
		expect(
			formatEvent({game: {...game, awayScore: 1, homeScore: 2}, type: 'final'})
		).toBe('🏁 FT — 🇫🇷 France 2 x 1 Iraq 🇮🇶');
	});
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run scripts/match-bot.test.mjs`
Expected: FAIL ("Cannot find module './match-bot.mjs'").

- [ ] **Step 3: Implement `scripts/match-bot.mjs`**

```js
import {ServerValue} from 'firebase-admin/database';

import {teamFlagEmoji} from './flag-emoji.mjs';

export const BOT_NAME = '⚽ Match Bot';

// Mirror src/lib/games.ts getMatchStatus, on the normalized poller shape.
function statusOf(game) {
	if (game.finished || game.timeElapsed === 'finished') {
		return 'finished';
	}

	if (game.timeElapsed === 'notstarted') {
		return 'notstarted';
	}

	return 'live';
}

// Compare the prior RTDB games against the freshly fetched games and return the
// transitions worth announcing. No previous snapshot (first poll) → nothing, so
// history is never backfilled.
export function detectMatchEvents(previousGames, games) {
	if (!previousGames) {
		return [];
	}

	const prevById = new Map(previousGames.map((game) => [game.id, game]));
	const events = [];

	for (const game of games) {
		const prev = prevById.get(game.id);

		if (!prev) {
			continue;
		}

		const before = statusOf(prev);
		const after = statusOf(game);

		if (before === 'notstarted' && after === 'live') {
			events.push({game, type: 'kickoff'});
		}

		if (after === 'live') {
			if (game.homeScore > prev.homeScore) {
				events.push({game, side: 'home', type: 'goal'});
			}

			if (game.awayScore > prev.awayScore) {
				events.push({game, side: 'away', type: 'goal'});
			}
		}

		if (before !== 'finished' && after === 'finished') {
			events.push({game, type: 'final'});
		}
	}

	return events;
}

export function formatEvent(event) {
	const {game} = event;
	const home = `${teamFlagEmoji(game.homeTeam)} ${game.homeTeam}`;
	const away = `${game.awayTeam} ${teamFlagEmoji(game.awayTeam)}`;

	if (event.type === 'kickoff') {
		return `🟢 LIVE — ${home} 🆚 ${away}`;
	}

	if (event.type === 'final') {
		return `🏁 FT — ${home} ${game.homeScore} x ${game.awayScore} ${away}`;
	}

	const team = event.side === 'home' ? game.homeTeam : game.awayTeam;

	return `⚽ GOOOOAL! ${teamFlagEmoji(team)} ${team} — ${game.homeTeam} ${game.homeScore}-${game.awayScore} ${game.awayTeam}`;
}

// Post one chat message per detected event, as the bot. Returns the count.
export async function postMatchEvents(db, previousGames, games) {
	const events = detectMatchEvents(previousGames, games);

	for (const event of events) {
		await db.ref('chatRoom').push({
			at: ServerValue.TIMESTAMP,
			name: BOT_NAME,
			text: formatEvent(event),
		});
	}

	return events.length;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run scripts/match-bot.test.mjs`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/match-bot.mjs scripts/match-bot.test.mjs
git commit --no-gpg-sign -m "Add match status bot engine"
```

---

### Task 3: Wire the bot into the poller

**Files:**
- Modify: `scripts/push-scores.mjs`

**Interfaces:**
- Consumes: `postMatchEvents(db, previousGames, games)` from `./match-bot.mjs`.

- [ ] **Step 1: Import the bot.** In `scripts/push-scores.mjs`, add to the local imports (after `import {updateCommentary} from './commentary-core.mjs';`):

```js
import {postMatchEvents} from './match-bot.mjs';
```

- [ ] **Step 2: Post events before writing the new games.** The script already has `previous` (from `db.ref('games').once('value')`) and the new `games`, and the unchanged-skip early-return above. The current block is:

```js
await db.ref('games').set({
	fetchedAt: new Date().toISOString(),
	games,
	source,
});

console.log(`Pushed ${games.length} games to RTDB (source: ${source})`);
```

Change it to post the bot events first (against the prior state), then write:

```js
try {
	const posted = await postMatchEvents(db, previous?.games ?? null, games);

	if (posted) {
		console.log(`Match bot posted ${posted} chat event(s)`);
	}
}
catch (botError) {
	console.error(`Match bot failed: ${botError.message}`);
}

await db.ref('games').set({
	fetchedAt: new Date().toISOString(),
	games,
	source,
});

console.log(`Pushed ${games.length} games to RTDB (source: ${source})`);
```

(`previous` is the RTDB `games` snapshot value read earlier for the diff; on the very first run it is `null`, so the bot no-ops and never backfills.)

- [ ] **Step 3: Verify the script still parses and the suite is green**

Run: `node --check scripts/push-scores.mjs && npx vitest run scripts/`
Expected: no parse error; all script tests PASS.

- [ ] **Step 4: Commit**

```bash
git add scripts/push-scores.mjs
git commit --no-gpg-sign -m "Post match bot chat events from the poller"
```

---

### Task 4: Unread count helper + hook

**Files:**
- Create: `src/lib/chatUnread.ts`
- Create: `src/lib/chatUnread.test.ts`
- Create: `src/lib/useChatUnread.ts`

**Interfaces:**
- Consumes: `ChatMessage` from `./useChat`; `dataPath` from `./dataRoot`; `db` from `./firebase`.
- Produces: `countUnread(messages: ChatMessage[], lastReadAt: number, myName: string | null): number`, `latestAt(messages: ChatMessage[]): number` from `chatUnread.ts`; `useChatUnread(myName: string | null): {unread: number; markRead: () => void}` from `useChatUnread.ts`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/chatUnread.test.ts`:

```ts
import {describe, expect, it} from 'vitest';

import {countUnread, latestAt} from './chatUnread';

const msg = (at: number, name: string) => ({at, id: String(at), name, text: 'x'});

describe('countUnread', () => {
	const messages = [msg(10, 'Ana'), msg(20, 'me'), msg(30, '⚽ Match Bot')];

	it('counts messages after lastReadAt, excluding my own', () => {
		expect(countUnread(messages, 5, 'me')).toBe(2);
	});

	it('counts bot messages as unread', () => {
		expect(countUnread(messages, 20, 'me')).toBe(1);
	});

	it('is zero when caught up', () => {
		expect(countUnread(messages, 30, 'me')).toBe(0);
	});
});

describe('latestAt', () => {
	it('returns the max at, or 0 when empty', () => {
		expect(latestAt([msg(10, 'a'), msg(40, 'b')])).toBe(40);
		expect(latestAt([])).toBe(0);
	});
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/chatUnread.test.ts`
Expected: FAIL ("Cannot find module './chatUnread'").

- [ ] **Step 3: Implement `src/lib/chatUnread.ts`**

```ts
import type {ChatMessage} from './useChat';

// Messages newer than the last read, excluding the viewer's own.
export function countUnread(
	messages: ChatMessage[],
	lastReadAt: number,
	myName: string | null
): number {
	return messages.filter(
		(message) => message.at > lastReadAt && message.name !== myName
	).length;
}

export function latestAt(messages: ChatMessage[]): number {
	return messages.reduce((max, message) => Math.max(max, message.at), 0);
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/chatUnread.test.ts`
Expected: PASS.

- [ ] **Step 5: Implement `src/lib/useChatUnread.ts`** (browser hook; not unit-tested in the node env):

```ts
import {limitToLast, onValue, query, ref} from 'firebase/database';
import {useEffect, useState} from 'react';

import {countUnread, latestAt} from './chatUnread';
import {dataPath} from './dataRoot';
import {db} from './firebase';
import type {ChatMessage} from './useChat';

const STORAGE_KEY = 'wc2026.chatLastReadAt';

// Unread chat count for the floating button. `lastReadAt` lives in localStorage
// (per device); on the first ever load it seeds to the newest message so the
// existing history is not counted. The viewer's own messages never count.
export function useChatUnread(myName: string | null): {
	markRead: () => void;
	unread: number;
} {
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [lastReadAt, setLastReadAt] = useState<number>(() => {
		const stored = localStorage.getItem(STORAGE_KEY);

		return stored ? Number(stored) : -1;
	});

	useEffect(
		() =>
			onValue(
				query(ref(db, dataPath('chatRoom')), limitToLast(50)),
				(snapshot) => {
					const raw = snapshot.val() as Record<
						string,
						{at: number; name: string; text: string}
					> | null;

					const list = raw
						? Object.entries(raw)
								.map(([id, data]) => ({
									at: data.at ?? 0,
									id,
									name: data.name,
									text: data.text,
								}))
								.sort((a, b) => a.at - b.at)
						: [];

					setMessages(list);

					setLastReadAt((previous) => {
						if (previous >= 0) {
							return previous;
						}

						const seed = latestAt(list);

						localStorage.setItem(STORAGE_KEY, String(seed));

						return seed;
					});
				}
			),
		[]
	);

	const markRead = () => {
		const seed = latestAt(messages) || Date.now();

		localStorage.setItem(STORAGE_KEY, String(seed));
		setLastReadAt(seed);
	};

	return {
		markRead,
		unread: lastReadAt < 0 ? 0 : countUnread(messages, lastReadAt, myName),
	};
}
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/chatUnread.ts src/lib/chatUnread.test.ts src/lib/useChatUnread.ts
git commit --no-gpg-sign -m "Add chat unread count helper and hook"
```

---

### Task 5: ChatButton badge + App wiring

**Files:**
- Modify: `src/components/ChatButton.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `useChatUnread` from `../lib/useChatUnread`.

- [ ] **Step 1: Add the badge to `ChatButton`.** Replace `src/components/ChatButton.tsx` with:

```tsx
// Floating button that opens the global chat from any page.
export function ChatButton({
	onClick,
	unread = 0,
}: {
	onClick: () => void;
	unread?: number;
}) {
	return (
		<button
			aria-label="Open chat"
			className="fixed bottom-4 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-xl shadow-lg transition-colors hover:bg-emerald-400"
			onClick={onClick}
		>
			💬
			{unread > 0 && (
				<span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
					{unread > 9 ? '9+' : unread}
				</span>
			)}
		</button>
	);
}
```

(The button is already `fixed`, which establishes a positioning context, so the absolutely-positioned badge anchors to it.)

- [ ] **Step 2: Call the hook in `App.tsx`.** After `const identity = useIdentity();` (around line 120), add:

```ts
	const {markRead: markChatRead, unread: chatUnread} = useChatUnread(
		identity.name
	);
```

And add the import next to the other `./lib/use*` imports:

```ts
import {useChatUnread} from './lib/useChatUnread';
```

- [ ] **Step 3: Pass `unread` and mark read on open.** Change the `ChatButton` block (currently lines ~646-653):

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

to:

```tsx
			{!chatOpen && (
				<ChatButton
					onClick={() => {
						setChatOpen(true);
						markChatRead();
						acTrack('chat_opened');
					}}
					unread={chatUnread}
				/>
			)}
```

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: clean TypeScript build.

- [ ] **Step 5: Commit**

```bash
git add src/components/ChatButton.tsx src/App.tsx
git commit --no-gpg-sign -m "Show unread chat badge on the floating button"
```

---

### Task 6: Bot message styling in ChatPanel (polish)

**Files:**
- Modify: `src/components/ChatPanel.tsx`

**Interfaces:**
- Consumes: nothing new. Detects `msg.name === '⚽ Match Bot'`.

- [ ] **Step 1: Render bot messages as a centered system line.** In `src/components/ChatPanel.tsx`, inside `messages.map((msg) => { ... })`, before the existing `const isMe = msg.name === identity;` line, add an early branch that returns a distinct row for the bot:

```tsx
						if (msg.name === '⚽ Match Bot') {
							return (
								<div className="flex justify-center" key={msg.id}>
									<div className="max-w-[90%] rounded-xl bg-emerald-500/10 px-3 py-1.5 text-center text-xs font-medium text-emerald-200">
										{msg.text}
									</div>
								</div>
							);
						}

						const isMe = msg.name === identity;
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: clean build.

- [ ] **Step 3: Commit**

```bash
git add src/components/ChatPanel.tsx
git commit --no-gpg-sign -m "Render match bot messages as a system line in chat"
```

---

### Final: verify & publish

- [ ] **Run the full suite**

Run: `npm test`
Expected: all green (existing + new flag-emoji / match-bot / chatUnread tests).

- [ ] **Build**

Run: `npm run build`
Expected: clean.

- [ ] **Publish**

Push `master`, watch `deploy.yml` to success.

- [ ] **Update the VM poller** (so the bot goes live):

```bash
ssh ubuntu@163.176.141.61 'cd ~/ac-world-cup-2026-bet && git pull --ff-only && node --check scripts/push-scores.mjs && echo OK'
```

No RTDB rule needed (the bot writes `chatRoom` via the admin SDK, which bypasses rules).

## Self-Review

- **Spec coverage:** bot in poller (Tasks 2+3); kickoff/goal/final messages with flags (Task 2 `formatEvent`); scorer out of scope (team-only in `formatEvent`); idempotent via existing prev-vs-new diff (Task 3 uses `previous?.games`); shared flag emoji DRY (Task 1); unread hook + localStorage + exclude-own + bot-counts (Task 4); badge + clear-on-open (Task 5); bot styling (Task 6); tests + publish + VM pull (Final). All covered.
- **Placeholder scan:** none — every step has concrete code/commands.
- **Type/name consistency:** `teamFlagEmoji` (T1) used in T2; `detectMatchEvents`/`formatEvent`/`postMatchEvents`/`BOT_NAME` (T2) used in T3; `countUnread`/`latestAt` (T4) used in `useChatUnread` (T4) used in App (T5); `'⚽ Match Bot'` literal matches between `BOT_NAME` (T2) and ChatPanel check (T6); `ChatMessage` shape (`{at,id,name,text}`) consistent across `useChat`/`chatUnread`/`useChatUnread`. Consistent.
