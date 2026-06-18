import {describe, expect, it} from 'vitest';

import {buildGroups} from './groups';
import type {Game} from './types';

function game(partial: Partial<Game>): Game {
	return {
		awayScore: 0,
		awayTeam: '',
		finished: false,
		group: 'Group A',
		homeScore: 0,
		homeTeam: '',
		id: 0,
		localDate: '2026-06-11',
		matchday: 1,
		timeElapsed: 'notstarted',
		...partial,
	};
}

describe('buildGroups', () => {
	const games: Game[] = [
		game({
			awayScore: 1,
			awayTeam: 'Bravo',
			finished: true,
			homeScore: 2,
			homeTeam: 'Alpha',
			id: 1,
			timeElapsed: 'finished',
		}),
		game({
			awayScore: 0,
			awayTeam: 'Delta',
			finished: true,
			homeScore: 0,
			homeTeam: 'Charlie',
			id: 2,
			timeElapsed: 'finished',
		}),
		// Live match must NOT count toward the table yet.
		game({
			awayScore: 0,
			awayTeam: 'Charlie',
			homeScore: 5,
			homeTeam: 'Bravo',
			id: 3,
			timeElapsed: "60'",
		}),
		// Not-started fixture only contributes its teams.
		game({awayTeam: 'Charlie', homeTeam: 'Alpha', id: 4}),
	];

	const [groupA] = buildGroups(games);

	it('lists every team in the group, even before kickoff', () => {
		expect(groupA.name).toBe('Group A');
		expect(groupA.teams.map((team) => team.team).sort()).toEqual([
			'Alpha',
			'Bravo',
			'Charlie',
			'Delta',
		]);
	});

	it('orders by points, then goal difference, then goals for, then name', () => {
		expect(groupA.teams.map((team) => team.team)).toEqual([
			'Alpha',
			'Charlie',
			'Delta',
			'Bravo',
		]);
	});

	it('computes points and goal difference from finished matches', () => {
		const alpha = groupA.teams.find((team) => team.team === 'Alpha');

		expect(alpha).toMatchObject({
			goalDifference: 1,
			played: 1,
			points: 3,
			won: 1,
		});
	});

	it('ignores live matches', () => {
		const bravo = groupA.teams.find((team) => team.team === 'Bravo');

		// Only the finished 2–1 loss counts; the live 5–0 is excluded.
		expect(bravo).toMatchObject({goalsFor: 1, played: 1, points: 0});
	});
});
