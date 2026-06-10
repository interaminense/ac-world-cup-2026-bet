import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import gamesJson from '../../public/games.json?raw';
import {findGameForPrediction} from './games';
import {parsePredictionsCsv} from './parsePredictions';
import type {GamesFile} from './types';

const {games} = JSON.parse(gamesJson) as GamesFile;

const csvModules = import.meta.glob('../data/predictions/*.csv', {
	eager: true,
	import: 'default',
	query: '?raw',
}) as Record<string, string>;

describe('real games.json + predictions CSVs', () => {
	beforeEach(() => {
		vi.spyOn(console, 'warn').mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('ships only the 72 group-stage games, all with team names', () => {
		expect(games).toHaveLength(72);

		for (const game of games) {
			expect(game.awayTeam, `game ${game.id}`).toBeTruthy();
			expect(game.homeTeam, `game ${game.id}`).toBeTruthy();
		}
	});

	it('bundles at least one predictions CSV', () => {
		expect(Object.keys(csvModules).length).toBeGreaterThan(0);
	});

	for (const [path, content] of Object.entries(csvModules)) {
		describe(path, () => {
			const participant = parsePredictionsCsv(content);

			it('parses 72 predictions with a participant name', () => {
				expect(participant?.name).toBeTruthy();
				expect(participant?.predictions).toHaveLength(72);
			});

			it('joins every prediction to a game', () => {
				for (const prediction of participant?.predictions ?? []) {
					expect(
						findGameForPrediction(prediction, games),
						`${participant?.name} match #${prediction.matchNo} (${prediction.team1} x ${prediction.team2})`
					).toBeDefined();
				}
			});
		});
	}
});
