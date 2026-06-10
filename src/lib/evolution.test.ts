import {describe, expect, it} from 'vitest';

import {buildEvolution} from './evolution';
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
	predictions: Array<[number, string, string, number, number, string, string]>
): Participant {
	return {
		name,
		predictions: predictions.map(
			([matchNo, date, time, p1, p2, team1, team2]) => ({
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

const GAME_1_FT = makeGame({
	awayScore: 0,
	finished: true,
	homeScore: 2,
	timeElapsed: 'finished',
});

const GAME_2_FT = makeGame({
	awayTeam: 'Czechia',
	finished: true,
	homeScore: 1,
	awayScore: 1,
	homeTeam: 'Korea Republic',
	id: 2,
	timeElapsed: 'finished',
});

describe('buildEvolution', () => {
	it('returns no days when nothing has finished', () => {
		const ana = makeParticipant('Ana', [
			[1, 'Jun/11', '16:00', 2, 0, 'Mexico', 'South Africa'],
		]);

		const evolution = buildEvolution([ana], [makeGame()]);

		expect(evolution.days).toEqual([]);
		expect(evolution.series).toEqual([{name: 'Ana', totals: []}]);
	});

	it('excludes live games', () => {
		const ana = makeParticipant('Ana', [
			[1, 'Jun/11', '16:00', 2, 0, 'Mexico', 'South Africa'],
		]);

		const evolution = buildEvolution(
			[ana],
			[makeGame({homeScore: 2, timeElapsed: '80'})]
		);

		expect(evolution.days).toEqual([]);
	});

	it('accumulates points per tournament day in kickoff order', () => {
		const ana = makeParticipant('Ana', [
			[2, 'Jun/12', '16:00', 1, 1, 'Korea Republic', 'Czechia'],
			[1, 'Jun/11', '16:00', 2, 0, 'Mexico', 'South Africa'],
		]);

		const evolution = buildEvolution([ana], [GAME_2_FT, GAME_1_FT]);

		expect(evolution.days).toEqual(['Jun/11', 'Jun/12']);
		expect(evolution.series).toEqual([{name: 'Ana', totals: [25, 50]}]);
	});

	it('adds zero for days where a participant has no bet', () => {
		const ana = makeParticipant('Ana', [
			[1, 'Jun/11', '16:00', 2, 0, 'Mexico', 'South Africa'],
		]);
		const bia = makeParticipant('Bia', [
			[2, 'Jun/12', '16:00', 0, 3, 'Korea Republic', 'Czechia'],
		]);

		const evolution = buildEvolution([ana, bia], [GAME_1_FT, GAME_2_FT]);

		expect(evolution.days).toEqual(['Jun/11', 'Jun/12']);
		expect(evolution.series).toEqual([
			{name: 'Ana', totals: [25, 25]},
			{name: 'Bia', totals: [0, 0]},
		]);
	});

	it('orients flipped predictions before scoring', () => {
		const flip = makeParticipant('Flip', [
			[1, 'Jun/11', '16:00', 0, 2, 'South Africa', 'Mexico'],
		]);

		const evolution = buildEvolution([flip], [GAME_1_FT]);

		expect(evolution.series).toEqual([{name: 'Flip', totals: [25]}]);
	});
});
