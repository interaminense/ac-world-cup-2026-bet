import {describe, expect, it} from 'vitest';

import type {MatchCard} from './matches';
import {buildStats} from './stats';

function card(overrides: Partial<MatchCard> = {}): MatchCard {
	return {
		date: 'Jun/11',
		entries: [],
		group: 'Group A',
		matchNo: 1,
		status: 'finished',
		team1: 'Mexico',
		team2: 'South Africa',
		time: '16:00',
		...overrides,
	};
}

describe('buildStats', () => {
	it('summarizes points, exact scores and the popular scoreline', () => {
		const cards: MatchCard[] = [
			card({
				entries: [
					{name: 'Ana', p1: 2, p2: 0, points: 25},
					{name: 'Bia', p1: 2, p2: 0, points: 25},
					{name: 'Caio', p1: 1, p2: 1, points: 0},
				],
				r1: 2,
				r2: 0,
			}),
		];

		const stats = buildStats(cards);

		expect(stats.matchesPlayed).toBe(1);
		expect(stats.totalPoints).toBe(50);
		expect(stats.exactScoresTotal).toBe(2);
		expect(stats.popularScoreline).toEqual({count: 2, score: '2–0'});
		expect(stats.topExact).toEqual({count: 1, name: 'Ana'});
	});

	it('finds the biggest collective miss and a lone wolf', () => {
		const cards: MatchCard[] = [
			card({
				entries: [
					{name: 'Ana', p1: 1, p2: 0, points: 0},
					{name: 'Bia', p1: 1, p2: 0, points: 0},
					{name: 'Caio', p1: 0, p2: 2, points: 25},
				],
				matchNo: 3,
				r1: 0,
				r2: 2,
				team1: 'Canada',
				team2: 'Bosnia',
			}),
		];

		const stats = buildStats(cards);

		expect(stats.biggestMiss).toEqual({
			label: 'Canada 0–2 Bosnia',
			total: 3,
			zeros: 2,
		});
		expect(stats.loneWolf).toEqual({
			label: 'Canada 0–2 Bosnia',
			name: 'Caio',
		});
	});

	it('handles a tournament that has not started', () => {
		const cards: MatchCard[] = [
			card({
				entries: [
					{name: 'Ana', p1: 2, p2: 1, points: null},
					{name: 'Bia', p1: 2, p2: 1, points: null},
				],
				r1: undefined,
				r2: undefined,
				status: 'notstarted',
			}),
		];

		const stats = buildStats(cards);

		expect(stats.matchesPlayed).toBe(0);
		expect(stats.totalPoints).toBe(0);
		expect(stats.avgPointsPerPick).toBeNull();
		expect(stats.biggestMiss).toBeNull();
		expect(stats.loneWolf).toBeNull();
		// Frozen predictions still yield a favorite scoreline.
		expect(stats.popularScoreline).toEqual({count: 2, score: '2–1'});
	});
});
