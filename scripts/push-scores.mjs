import {readFileSync} from 'node:fs';

import {cert, initializeApp} from 'firebase-admin/app';
import {getDatabase} from 'firebase-admin/database';

import {parsePredictions} from './commentary-facts.mjs';
import {updateCommentary} from './commentary-core.mjs';
import {fetchEspnGames} from './sources/espn.mjs';
import {fetchFifaGames} from './sources/fifa.mjs';
import {fetchWorldcup26Games} from './sources/worldcup26.mjs';

// Poll the score sources and push the result to the Realtime Database under
// `games`. Mirrors update-scores.mjs (same source chain + payload shape), but
// writes to RTDB instead of committing games.json — and only when changed.
const SOURCES = {
	espn: fetchEspnGames,
	fifa: fetchFifaGames,
	worldcup26: fetchWorldcup26Games,
};

const DEFAULT_ORDER = ['fifa', 'espn', 'worldcup26'];

const DATABASE_URL =
	'https://ac-world-cup-2026-bet-default-rtdb.firebaseio.com';

const PRED_DIR = new URL('../src/data/predictions/', import.meta.url);

const credentialsPath =
	process.env.GOOGLE_APPLICATION_CREDENTIALS ||
	`${process.env.HOME}/.config/wc2026/serviceAccount.json`;

initializeApp({
	credential: cert(JSON.parse(readFileSync(credentialsPath, 'utf8'))),
	databaseURL: DATABASE_URL,
});

const db = getDatabase();

const preferred = process.env.SCORE_SOURCE;
const order = preferred
	? [preferred, ...DEFAULT_ORDER.filter((name) => name !== preferred)]
	: DEFAULT_ORDER;

let games = null;
let source = null;

for (const name of order) {
	const fetchGames = SOURCES[name];

	if (!fetchGames) {
		console.error(`Unknown source "${name}"; skipping`);
		continue;
	}

	try {
		const candidate = await fetchGames();

		if (candidate.length === 0) {
			console.error(`Source "${name}" returned no games; trying next`);
			continue;
		}

		games = candidate;
		source = name;
		break;
	}
	catch (error) {
		console.error(`Source "${name}" failed: ${error.message}; trying next`);
	}
}

if (!games) {
	console.error('All score sources failed');
	process.exit(1);
}

// Order-independent stringify — RTDB reorders object keys on read, so a plain
// JSON.stringify of the round-tripped value never matches the freshly fetched.
function canonical(value) {
	if (Array.isArray(value)) {
		return value.map(canonical);
	}

	if (value && typeof value === 'object') {
		return Object.fromEntries(
			Object.keys(value)
				.sort()
				.map((key) => [key, canonical(value[key])])
		);
	}

	return value;
}

// Diff against the current RTDB state — push only when something changed.
const snapshot = await db.ref('games').once('value');
const previous = snapshot.val();

if (
	previous &&
	JSON.stringify(canonical(previous.games)) ===
		JSON.stringify(canonical(games))
) {
	console.log(`Games unchanged (source: ${source}); skipping write`);
	process.exit(0);
}

await db.ref('games').set({
	fetchedAt: new Date().toISOString(),
	games,
	source,
});

console.log(`Pushed ${games.length} games to RTDB (source: ${source})`);

// Scores changed → refresh the AI commentary (and Slack digests). Gated by
// ANTHROPIC_API_KEY: without it updateCommentary is a no-op, so the cron poller
// stays scores-only until the key is added to its environment (the cutover that
// also retires the GitHub Action, to avoid double-posting).
const players = parsePredictions(PRED_DIR);
const snapshotCommentary = await db.ref('commentary').once('value');
const commentary = snapshotCommentary.val() || {byMatch: {}};

const {changed: commentaryChanged} = await updateCommentary(
	games,
	players,
	commentary
);

if (commentaryChanged) {
	await db.ref('commentary').set(commentary);
	console.log('Updated RTDB commentary');
}

process.exit(0);
