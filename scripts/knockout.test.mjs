import {describe, expect, it} from 'vitest';

import {normalizeKnockout} from './knockout.mjs';

const en = (text) => [{Description: text, Locale: 'en-GB'}];

describe('normalizeKnockout', () => {
	const results = [
		{
			Away: null,
			Date: '2026-06-28T19:00:00Z',
			Home: null,
			HomeTeamScore: null,
			MatchNumber: 73,
			PlaceHolderA: '2A',
			PlaceHolderB: '2B',
			StageName: en('Round of 32'),
		},
		{
			// a group-stage match must be dropped
			Away: {TeamName: en('Iraq')},
			Home: {TeamName: en('France')},
			MatchNumber: 5,
			StageName: en('First stage'),
		},
		{
			Away: {TeamName: en('Norway')},
			AwayTeamScore: 0,
			Date: '2026-07-19T19:00:00Z',
			Home: {TeamName: en('Brazil')},
			HomeTeamScore: 2,
			MatchNumber: 104,
			PlaceHolderA: 'W101',
			PlaceHolderB: 'W102',
			StageName: en('Final'),
		},
	];

	it('keeps only knockout matches, sorted by match number', () => {
		const out = normalizeKnockout(results);

		expect(out.map((m) => m.matchNumber)).toEqual([73, 104]);
		expect(out.map((m) => m.stage)).toEqual(['Round of 32', 'Final']);
	});

	it('maps placeholders, teams and scores', () => {
		const final = normalizeKnockout(results).find(
			(m) => m.matchNumber === 104
		);

		expect(final).toMatchObject({
			a: 'W101',
			b: 'W102',
			scoreA: 2,
			scoreB: 0,
			teamA: 'Brazil',
			teamB: 'Norway',
		});
	});

	it('uses null for an undecided slot', () => {
		const r32 = normalizeKnockout(results).find(
			(m) => m.matchNumber === 73
		);

		expect(r32.teamA).toBeNull();
		expect(r32.scoreA).toBeNull();
	});
});
