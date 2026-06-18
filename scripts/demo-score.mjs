import {readFileSync} from 'node:fs';

import {cert, initializeApp} from 'firebase-admin/app';
import {getDatabase} from 'firebase-admin/database';

import {parsePredictions} from './commentary-facts.mjs';
import {updateCommentary} from './commentary-core.mjs';

// Simulate a score change on the demo subtree so we can watch the UI push it
// live (the browser, opened with ?demo, is subscribed via onValue).
//
//   node scripts/demo-score.mjs <matchId> <homeScore> <awayScore> [status]
//     status: live (default) | finished | notstarted
//
// <matchId> matches game.id, falling back to the array index.
const [, , idArg, homeArg, awayArg, statusArg = 'live'] = process.argv;

if (idArg === undefined || homeArg === undefined || awayArg === undefined) {
	console.error(
		'Usage: node scripts/demo-score.mjs <matchId> <homeScore> <awayScore> [live|finished|notstarted]'
	);
	process.exit(1);
}

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

const snapshot = await db.ref('demo/games').once('value');
const value = snapshot.val();

if (!value || !value.games) {
	console.error(
		'demo/games is empty — run `node scripts/seed-demo.mjs` first'
	);
	process.exit(1);
}

const games = Array.isArray(value.games)
	? value.games
	: Object.values(value.games);

const id = Number(idArg);
const game = games.find((candidate) => candidate.id === id) ?? games[id];

if (!game) {
	console.error(`No game with id/index ${idArg} in demo/games`);
	process.exit(1);
}

game.homeScore = Number(homeArg);
game.awayScore = Number(awayArg);
game.finished = statusArg === 'finished';
game.timeElapsed =
	statusArg === 'finished'
		? 'finished'
		: statusArg === 'notstarted'
			? 'notstarted'
			: '67';

await db.ref('demo/games').set({
	fetchedAt: new Date().toISOString(),
	games,
	source: 'demo',
});

console.log(
	`demo: #${game.id} ${game.homeTeam} ${game.homeScore}–${game.awayScore} ` +
		`${game.awayTeam} (${statusArg})`
);

// Mirror the poller: regenerate the AI commentary into demo/commentary so the
// blurb push can be tested in the UI too. Slack is off in demo. No-op without
// ANTHROPIC_API_KEY (set it in your shell to exercise this).
const players = parsePredictions(PRED_DIR);
const snapshotCommentary = await db.ref('demo/commentary').once('value');
const commentary = snapshotCommentary.val() || {byMatch: {}};

const {changed: commentaryChanged} = await updateCommentary(
	games,
	players,
	commentary,
	{slack: false}
);

if (commentaryChanged) {
	await db.ref('demo/commentary').set(commentary);
	console.log('Updated demo/commentary');
}

process.exit(0);
