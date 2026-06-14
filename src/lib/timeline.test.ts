import {describe, expect, it} from 'vitest';

import {buildPointsTimeline} from './timeline';
import type {Game, Participant} from './types';

function makeGame(overrides: Partial<Game> = {}): Game {
	return {
		awayScore: 0,
		awayTeam: 'South Africa',
		finished: false,
		group: 'A',
		homeScore: 0,
		homeTeam: 'Mexico',
		id: 1,
		localDate: '06/11/2026 13:00',
		matchday: 1,
		timeElapsed: 'notstarted',
		...overrides,
	};
}

function makeParticipant(
	name: string,
	predictions: Array<[number, string, number, number, string, string, string]>
): Participant {
	return {
		name,
		predictions: predictions.map(
			([matchNo, team1, p1, p2, team2, date, time]) => ({
				date,
				group: 'Group A',
				matchNo,
				p1,
				p2,
				team1,
				team2,
				time,
			})
		),
	};
}

// Two matches: Ana nails #1 exactly (25), then Bia nails #2 exactly (25) while
// Ana misses — so Ana leads after match 1 and they tie after match 2.
const ANA = makeParticipant('Ana', [
	[1, 'Mexico', 2, 0, 'South Africa', 'Jun/11', '13:00'],
	[2, 'France', 0, 0, 'Canada', 'Jun/12', '13:00'],
]);
const BIA = makeParticipant('Bia', [
	[1, 'Mexico', 1, 1, 'South Africa', 'Jun/11', '13:00'],
	[2, 'France', 1, 0, 'Canada', 'Jun/12', '13:00'],
]);

const MATCH_1 = makeGame({
	finished: true,
	homeScore: 2,
	id: 1,
	localDate: '06/11/2026 13:00',
	timeElapsed: 'finished',
});
const MATCH_2 = makeGame({
	awayTeam: 'Canada',
	finished: true,
	group: 'B',
	homeScore: 1,
	homeTeam: 'France',
	id: 2,
	localDate: '06/12/2026 13:00',
	timeElapsed: 'finished',
});

describe('buildPointsTimeline', () => {
	it('returns no frames before any match finishes', () => {
		expect(buildPointsTimeline([ANA, BIA], [makeGame()])).toEqual([]);
	});

	it('builds one chronological frame per finished match', () => {
		const frames = buildPointsTimeline([ANA, BIA], [MATCH_1, MATCH_2]);

		expect(frames.map((frame) => frame.matchNo)).toEqual([1, 2]);
		expect(frames[0].team1).toBe('Mexico');
		expect(frames[1].team1).toBe('France');
	});

	it('accumulates totals and reports per-match gains', () => {
		const [first, second] = buildPointsTimeline([ANA, BIA], [MATCH_1, MATCH_2]);

		const anaFirst = first.standings.find((row) => row.name === 'Ana');
		const anaSecond = second.standings.find((row) => row.name === 'Ana');
		const biaSecond = second.standings.find((row) => row.name === 'Bia');

		expect(anaFirst).toMatchObject({gained: 25, rank: 1, total: 25});
		expect(anaSecond).toMatchObject({gained: 0, total: 25});
		expect(biaSecond).toMatchObject({gained: 25, total: 25});
	});

	it('reports zero movement on the opening frame, then tracks rank changes', () => {
		const [first, second] = buildPointsTimeline([ANA, BIA], [MATCH_1, MATCH_2]);

		expect(first.standings.every((row) => row.movement === 0)).toBe(true);

		// Bia was rank 2 after match 1, ties Ana at 25 after match 2 → both
		// share rank 1, so Bia climbs one.
		expect(second.standings.find((row) => row.name === 'Bia')?.rank).toBe(1);
		expect(second.standings.find((row) => row.name === 'Bia')?.movement).toBe(
			1
		);
	});
});
