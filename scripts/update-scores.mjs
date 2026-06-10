import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';

import {normalizeGames} from './normalize.mjs';

const API_URL = process.env.API_URL || 'https://worldcup26.ir';
const OUT_DIR = new URL('../public/', import.meta.url);
const OUT_FILE = new URL('games.json', OUT_DIR);

const response = await fetch(`${API_URL}/get/games`);

if (!response.ok) {
	console.error(`Failed to fetch games: HTTP ${response.status}`);
	process.exit(1);
}

const payload = await response.json();

if (!Array.isArray(payload.games)) {
	console.error('Unexpected API payload: missing games array');
	process.exit(1);
}

const games = normalizeGames(payload.games);

if (existsSync(OUT_FILE)) {
	const previous = JSON.parse(readFileSync(OUT_FILE, 'utf8'));

	if (JSON.stringify(previous.games) === JSON.stringify(games)) {
		console.log('Games unchanged; skipping write');
		process.exit(0);
	}
}

mkdirSync(OUT_DIR, {recursive: true});
writeFileSync(
	OUT_FILE,
	`${JSON.stringify({fetchedAt: new Date().toISOString(), games}, null, '\t')}\n`
);
console.log(`Wrote ${games.length} games to public/games.json`);
