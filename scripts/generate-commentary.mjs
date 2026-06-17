import {existsSync, readFileSync, writeFileSync} from 'node:fs';

import {parsePredictions} from './commentary-facts.mjs';
import {updateCommentary} from './commentary-core.mjs';

// File-backed commentary generator for the GitHub Action: reads the committed
// games.json + the CSV predictions, brings public/commentary.json up to date
// via the shared engine, and posts finished-match digests to Slack.
const GAMES_FILE = new URL('../public/games.json', import.meta.url);
const OUT_FILE = new URL('../public/commentary.json', import.meta.url);
const PRED_DIR = new URL('../src/data/predictions/', import.meta.url);

const games = JSON.parse(readFileSync(GAMES_FILE, 'utf8')).games;
const players = parsePredictions(PRED_DIR);

const commentary = existsSync(OUT_FILE)
	? JSON.parse(readFileSync(OUT_FILE, 'utf8'))
	: {byMatch: {}};

const {changed} = await updateCommentary(games, players, commentary, {
	dryRun:
		process.argv.includes('--dry-run') || !process.env.ANTHROPIC_API_KEY,
});

if (changed) {
	writeFileSync(OUT_FILE, `${JSON.stringify(commentary, null, '\t')}\n`);
	console.log('Wrote public/commentary.json');
}
