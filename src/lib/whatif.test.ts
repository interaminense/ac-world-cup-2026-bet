import {describe, expect, it} from 'vitest';

import {buildWhatIf} from './whatif';
import type {Game, Participant} from './types';

function makeGame(overrides: Partial<Game> = {}): Game {
	return {
		awayScore: 0,
		awayTeam: 'South Africa',
		finished: false,
		group: 'A',
		homeScore: 2,
		homeTeam: 'Mexico',
		id: 1,
		localDate: '06/11/2026 13:00',
		matchday: 1,
		timeElapsed: '60',
		...overrides,
	};
}

function makeParticipant(
	name: string,
	p1: number,
	p2: number,
	team1 = 'Mexico',
	team2 = 'South Africa'
): Participant {
	return {
		name,
		predictions: [
			{
				date: 'Jun/11',
				group: 'Group A',
				matchNo: 1,
				p1,
				p2,
				team1,
				team2,
				time: '16:00',
			},
		],
	};
}

describe('buildWhatIf', () => {
	it('returns nothing for matches that are not live', () => {
		const ana = makeParticipant('Ana', 2, 1);

		expect(
			buildWhatIf([ana], [makeGame({timeElapsed: 'notstarted'})], 1)
		).toEqual([]);
		expect(
			buildWhatIf(
				[ana],
				[makeGame({finished: true, timeElapsed: 'finished'})],
				1
			)
		).toEqual([]);
	});

	it('computes tier flips for one more goal on each side', () => {
		const ana = makeParticipant('Ana', 2, 1);

		const scenarios = buildWhatIf([ana], [makeGame()], 1);

		expect(scenarios).toHaveLength(2);

		const [home, away] = scenarios;

		expect(home.label).toBe('Mexico');
		expect(home.score).toBe('3–0');
		expect(home.movers[0].pointsDelta).toBe(-8);

		expect(away.label).toBe('South Africa');
		expect(away.score).toBe('2–1');
		expect(away.movers[0].pointsDelta).toBe(7);
	});

	it('tracks rank movement across participants', () => {
		const ana = makeParticipant('Ana', 2, 1);
		const bia = makeParticipant('Bia', 3, 0);

		const scenarios = buildWhatIf([ana, bia], [makeGame()], 1);
		const homeGoal = scenarios[0];

		const anaMover = homeGoal.movers.find((mover) => mover.name === 'Ana')!;
		const biaMover = homeGoal.movers.find((mover) => mover.name === 'Bia')!;

		expect(biaMover.pointsDelta).toBe(15);
		expect(biaMover.rankBefore).toBe(2);
		expect(biaMover.rankAfter).toBe(1);
		expect(anaMover.rankBefore).toBe(1);
		expect(anaMover.rankAfter).toBe(2);
	});

	it('sorts movers by absolute delta', () => {
		const ana = makeParticipant('Ana', 2, 1);
		const bia = makeParticipant('Bia', 0, 0);

		const scenarios = buildWhatIf([ana, bia], [makeGame()], 1);

		expect(scenarios[0].movers.map((mover) => mover.name)).toEqual([
			'Ana',
			'Bia',
		]);
	});

	it('bumps the correct side when the fixture lists teams flipped', () => {
		const flip = makeParticipant('Flip', 1, 2, 'South Africa', 'Mexico');

		const scenarios = buildWhatIf([flip], [makeGame()], 1);

		expect(scenarios[0].label).toBe('South Africa');
		expect(scenarios[0].score).toBe('1–2');
		expect(scenarios[1].label).toBe('Mexico');
		expect(scenarios[1].score).toBe('0–3');
	});
});
