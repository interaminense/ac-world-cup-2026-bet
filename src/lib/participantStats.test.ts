import {describe, expect, it} from 'vitest';

import {buildKnockoutStats, buildParticipantStats} from './participantStats';
import type {Game, Participant} from './types';
import type {KnockoutMatch} from './useKnockout';

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
	predictions: Array<[number, string, number, number, string]>
): Participant {
	return {
		name,
		predictions: predictions.map(([matchNo, team1, p1, p2, team2]) => ({
			date: 'Jun/11',
			group: 'Group A',
			matchNo,
			p1,
			p2,
			team1,
			team2,
			time: '13:00',
		})),
	};
}

// Ana nails the 2–0 exactly (25); Bia picks 1–1 and scores nothing.
const ANA = makeParticipant('Ana', [[1, 'Mexico', 2, 0, 'South Africa']]);
const BIA = makeParticipant('Bia', [[1, 'Mexico', 1, 1, 'South Africa']]);

const FINISHED = makeGame({
	finished: true,
	homeScore: 2,
	timeElapsed: 'finished',
});

describe('buildParticipantStats', () => {
	it('reports exact-score tier, hit rate and best round for a winner', () => {
		const stats = buildParticipantStats(ANA, [ANA, BIA], [FINISHED]);

		expect(stats.rank).toBe(1);
		expect(stats.total).toBe(25);
		expect(stats.hits).toBe(1);
		expect(stats.hitRate).toBe(1);
		expect(stats.avgPerMatch).toBe(25);
		expect(stats.streak).toBe(1);
		expect(stats.tierCounts[0]).toBe(1); // one exact (25)
		expect(stats.bestRound).toEqual({
			label: 'Mexico 2–0 South Africa',
			points: 25,
		});
		expect(stats.rankHistory).toEqual([1]);
	});

	it('captures the gap to the leader and a missed call', () => {
		const stats = buildParticipantStats(BIA, [ANA, BIA], [FINISHED]);

		expect(stats.rank).toBe(2);
		expect(stats.gapToLeader).toBe(25);
		expect(stats.hits).toBe(0);
		expect(stats.tierCounts[5]).toBe(1); // one miss (0)
		expect(stats.bestRound).toBeNull();
	});

	it('flags a unique pick as contrarian', () => {
		const stats = buildParticipantStats(ANA, [ANA, BIA], [FINISHED]);

		// Ana's 2–0 is hers alone among the two players.
		expect(stats.uniquePicks).toBe(1);
		expect(stats.contrarianRate).toBe(1);
		expect(stats.favoriteScoreline).toBe('2–0');
		expect(stats.avgGoals).toBe(2);
	});
});

function makeKnockout(overrides: Partial<KnockoutMatch> = {}): KnockoutMatch {
	return {
		a: 'Winner Group A',
		b: 'Winner Group B',
		date: null,
		finished: false,
		matchNumber: 73,
		scoreA: null,
		scoreB: null,
		stage: 'Round of 32',
		teamA: 'Brazil',
		teamB: 'Mexico',
		...overrides,
	};
}

describe('buildKnockoutStats', () => {
	it('reads all-zero while no knockout match has finished', () => {
		const stats = buildKnockoutStats([makeKnockout()], {73: {p1: 2, p2: 1}});

		expect(stats.total).toBe(0);
		expect(stats.finishedCount).toBe(0);
		expect(stats.hits).toBe(0);
		expect(stats.tierCounts.every((count) => count === 0)).toBe(true);
		expect(stats.bestRound).toBeNull();
		expect(stats.avgPerMatch).toBeNull();
		// The picked scoreline still reads even before kickoff.
		expect(stats.avgGoals).toBe(3);
		expect(stats.favoriteScoreline).toBe('2–1');
	});

	it('scores a finished knockout match', () => {
		const stats = buildKnockoutStats(
			[makeKnockout({finished: true, scoreA: 2, scoreB: 1})],
			{73: {p1: 2, p2: 1}}
		);

		expect(stats.total).toBe(25);
		expect(stats.finishedCount).toBe(1);
		expect(stats.hits).toBe(1);
		expect(stats.tierCounts[0]).toBe(1);
		expect(stats.streak).toBe(1);
		expect(stats.bestRound).toEqual({
			label: 'Brazil 2–1 Mexico',
			points: 25,
		});

		// Pool-wide fields stay neutral without cross-participant data.
		expect(stats.rank).toBe(0);
		expect(stats.contrarianRate).toBeNull();
		expect(stats.rankHistory).toEqual([]);
	});

	it('counts only the matches the participant picked', () => {
		const stats = buildKnockoutStats(
			[makeKnockout(), makeKnockout({matchNumber: 74})],
			{73: {p1: 1, p2: 0}}
		);

		expect(stats.avgGoals).toBe(1);
		expect(stats.favoriteScoreline).toBe('1–0');
	});

	// The knockout field, expressed in the (Participant, Game) shape buildKnockout-
	// Stats reads for its pool-wide metrics: match 73 finished 2–1, Ana nailed it
	// (25), Bia picked 1–1 (0).
	const KO_FINISHED = makeGame({
		awayScore: 1,
		awayTeam: 'Mexico',
		finished: true,
		homeScore: 2,
		homeTeam: 'Brazil',
		id: 73,
		timeElapsed: 'finished',
	});
	const KO_POOL = {
		games: [KO_FINISHED],
		participants: [
			makeParticipant('Ana', [[73, 'Brazil', 2, 1, 'Mexico']]),
			makeParticipant('Bia', [[73, 'Brazil', 1, 1, 'Mexico']]),
		],
	};

	it('fills rank history, gap and contrarian from the finished pool', () => {
		const stats = buildKnockoutStats(
			[makeKnockout({finished: true, scoreA: 2, scoreB: 1})],
			{73: {p1: 2, p2: 1}},
			KO_POOL,
			'Ana'
		);

		expect(stats.rank).toBe(1);
		expect(stats.gapToLeader).toBe(0);
		expect(stats.rankHistory).toEqual([1]);
		expect(stats.uniquePicks).toBe(1);
		expect(stats.contrarianRate).toBe(1);
	});

	it('ranks a trailing pick below the leader', () => {
		const stats = buildKnockoutStats(
			[makeKnockout({finished: true, scoreA: 2, scoreB: 1})],
			{73: {p1: 1, p2: 1}},
			KO_POOL,
			'Bia'
		);

		expect(stats.rank).toBe(2);
		expect(stats.gapToLeader).toBe(25);
		expect(stats.rankHistory).toEqual([2]);
	});

	it('measures contrarian over finished matches only, never sealed ones', () => {
		const upcoming = makeGame({
			awayTeam: 'Japan',
			homeTeam: 'Spain',
			id: 74,
			// notstarted: picks here are still sealed.
		});

		// On the finished match 73 Ana matches Bia (not unique); on the unplayed
		// match 74 Ana's pick is unique — but that must not count.
		const pool = {
			games: [KO_FINISHED, upcoming],
			participants: [
				makeParticipant('Ana', [
					[73, 'Brazil', 1, 1, 'Mexico'],
					[74, 'Spain', 3, 0, 'Japan'],
				]),
				makeParticipant('Bia', [
					[73, 'Brazil', 1, 1, 'Mexico'],
					[74, 'Spain', 0, 0, 'Japan'],
				]),
			],
		};

		const stats = buildKnockoutStats(
			[
				makeKnockout({finished: true, scoreA: 2, scoreB: 1}),
				makeKnockout({matchNumber: 74}),
			],
			{73: {p1: 1, p2: 1}, 74: {p1: 3, p2: 0}},
			pool,
			'Ana'
		);

		expect(stats.uniquePicks).toBe(0);
		expect(stats.contrarianRate).toBe(0);
	});
});
