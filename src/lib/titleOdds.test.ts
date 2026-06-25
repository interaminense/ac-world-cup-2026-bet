import {describe, expect, it} from 'vitest';

import {simulateTitleOdds} from './titleOdds';
import type {Game, Participant, Prediction} from './types';

function pred(matchNo: number, t1: string, p1: number, t2: string, p2: number): Prediction {
	return {date: 'Jun/1', group: 'A', matchNo, p1, p2, team1: t1, team2: t2, time: '12:00'};
}

function game(
	id: number,
	home: string,
	away: string,
	hs: number,
	as: number,
	finished: boolean
): Game {
	return {
		awayScore: finished ? as : 0,
		awayTeam: away,
		finished,
		group: 'A',
		homeScore: finished ? hs : 0,
		homeTeam: home,
		id,
		localDate: '6/1/2026',
		matchday: 1,
		timeElapsed: finished ? 'finished' : 'notstarted',
	};
}

describe('simulateTitleOdds', () => {
	it('hands the title to the leader when no games remain', () => {
		const a: Participant = {name: 'A', predictions: [pred(1, 'X', 2, 'Y', 1)]};
		const b: Participant = {name: 'B', predictions: [pred(1, 'X', 1, 'Y', 1)]};
		const games = [game(1, 'X', 'Y', 2, 1, true)];

		const odds = simulateTitleOdds([a, b], games, {sims: 200});

		expect(odds.A).toBe(1);
		expect(odds.B).toBe(0);
	});

	it('splits the odds 50/50 between two identical entries', () => {
		const picks = [pred(1, 'X', 2, 'Y', 1), pred(2, 'P', 1, 'Q', 1)];
		const a: Participant = {name: 'A', predictions: picks};
		const b: Participant = {name: 'B', predictions: picks};
		// match 1 decided, match 2 still to play.
		const games = [game(1, 'X', 'Y', 2, 1, true), game(2, 'P', 'Q', 0, 0, false)];

		const odds = simulateTitleOdds([a, b], games, {sims: 1000});

		expect(odds.A).toBe(0.5);
		expect(odds.B).toBe(0.5);
	});

	it('produces probabilities that sum to 1', () => {
		const a: Participant = {name: 'A', predictions: [pred(1, 'X', 2, 'Y', 1), pred(2, 'P', 1, 'Q', 0)]};
		const b: Participant = {name: 'B', predictions: [pred(1, 'X', 1, 'Y', 1), pred(2, 'P', 0, 'Q', 1)]};
		const c: Participant = {name: 'C', predictions: [pred(1, 'X', 0, 'Y', 0), pred(2, 'P', 2, 'Q', 2)]};
		const games = [game(1, 'X', 'Y', 2, 1, true), game(2, 'P', 'Q', 0, 0, false)];

		const odds = simulateTitleOdds([a, b, c], games, {sims: 2000});

		expect(odds.A + odds.B + odds.C).toBeCloseTo(1, 10);
	});

	it('gives a comfortably-ahead leader the highest odds', () => {
		// A nailed both finished games (+50); the others scored nothing. One game left.
		const a: Participant = {
			name: 'A',
			predictions: [pred(1, 'X', 2, 'Y', 1), pred(2, 'P', 3, 'Q', 0), pred(3, 'R', 1, 'S', 0)],
		};
		const b: Participant = {
			name: 'B',
			predictions: [pred(1, 'X', 0, 'Y', 2), pred(2, 'P', 0, 'Q', 2), pred(3, 'R', 0, 'S', 1)],
		};
		const c: Participant = {
			name: 'C',
			predictions: [pred(1, 'X', 1, 'Y', 1), pred(2, 'P', 1, 'Q', 1), pred(3, 'R', 2, 'S', 2)],
		};
		const games = [
			game(1, 'X', 'Y', 2, 1, true),
			game(2, 'P', 'Q', 3, 0, true),
			game(3, 'R', 'S', 0, 0, false),
		];

		const odds = simulateTitleOdds([a, b, c], games, {sims: 2000});

		expect(odds.A).toBeGreaterThan(odds.B);
		expect(odds.A).toBeGreaterThan(odds.C);
		expect(odds.A).toBeGreaterThan(0.5);
	});

	it('is deterministic for a fixed seed', () => {
		const a: Participant = {name: 'A', predictions: [pred(1, 'X', 2, 'Y', 1), pred(2, 'P', 1, 'Q', 0)]};
		const b: Participant = {name: 'B', predictions: [pred(1, 'X', 1, 'Y', 1), pred(2, 'P', 0, 'Q', 1)]};
		const games = [game(1, 'X', 'Y', 2, 1, true), game(2, 'P', 'Q', 0, 0, false)];

		const first = simulateTitleOdds([a, b], games, {seed: 123, sims: 500});
		const second = simulateTitleOdds([a, b], games, {seed: 123, sims: 500});

		expect(first).toEqual(second);
	});
});
