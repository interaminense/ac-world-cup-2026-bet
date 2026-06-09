import {describe, expect, it} from 'vitest';

import {parsePredictionsCsv} from './parsePredictions';

const SAMPLE_CSV = `PREDICTIONS & POINTS FOR: ADRIANO,,,,,,,,,,
Enter your predictions in 'Prediction T1' and 'Prediction T2'. Points calculate automatically.,,,,,,,,,,
,,,,,,,,,,
Match #,Group,Date,Time,Team 1,Prediction T1,Prediction T2,Team 2,Real Score 1,Real Score 2,Points Earned
1,Group A,Jun/11,16:00,Mexico,2,0,South Africa,,,
11,Group E,Jun/14,20:00,"Côte d'Ivoire",1,1,Ecuador,,,
12,Group F,Jun/14,23:00,Sweden,,,Tunisia,,,
,,,,,,,,TOTAL:,0,
`;

describe('parsePredictionsCsv', () => {
	it('extracts the participant name in title case', () => {
		expect(parsePredictionsCsv(SAMPLE_CSV)?.name).toBe('Adriano');
	});

	it('parses match rows into predictions', () => {
		const participant = parsePredictionsCsv(SAMPLE_CSV);

		expect(participant?.predictions[0]).toEqual({
			date: 'Jun/11',
			group: 'Group A',
			matchNo: 1,
			p1: 2,
			p2: 0,
			team1: 'Mexico',
			team2: 'South Africa',
			time: '16:00',
		});
	});

	it('keeps quoted team names intact', () => {
		expect(parsePredictionsCsv(SAMPLE_CSV)?.predictions[1].team1).toBe(
			"Côte d'Ivoire"
		);
	});

	it('skips rows without a prediction and the trailing total row', () => {
		expect(parsePredictionsCsv(SAMPLE_CSV)?.predictions).toHaveLength(2);
	});

	it('returns null for content without the title header', () => {
		expect(parsePredictionsCsv('a,b,c\n1,2,3\n')).toBeNull();
	});
});
