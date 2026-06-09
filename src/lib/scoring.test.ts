import {describe, expect, it} from 'vitest';

import {POINTS, scorePrediction} from './scoring';

describe('scorePrediction', () => {
	it('awards 25 for the exact score', () => {
		expect(scorePrediction(2, 1, 2, 1)).toBe(POINTS.EXACT_SCORE);
	});

	it('awards 25 for an exact draw score', () => {
		expect(scorePrediction(1, 1, 1, 1)).toBe(POINTS.EXACT_SCORE);
	});

	it('awards 18 for the correct winner with correct winner goals', () => {
		expect(scorePrediction(2, 1, 2, 0)).toBe(POINTS.WINNER_AND_GOALS);
	});

	it('awards 18 when the away team is the winner', () => {
		expect(scorePrediction(1, 3, 0, 3)).toBe(POINTS.WINNER_AND_GOALS);
	});

	it('awards 15 for the correct winner with correct goal difference', () => {
		expect(scorePrediction(2, 1, 3, 2)).toBe(POINTS.WINNER_AND_DIFF);
	});

	it('awards 12 for a correct draw with the wrong score', () => {
		expect(scorePrediction(1, 1, 2, 2)).toBe(POINTS.DRAW);
	});

	it('awards 10 for the correct winner only', () => {
		expect(scorePrediction(2, 1, 4, 1)).toBe(POINTS.WINNER_ONLY);
	});

	it('awards 0 when the predicted winner loses', () => {
		expect(scorePrediction(2, 1, 0, 1)).toBe(POINTS.NONE);
	});

	it('awards 0 when a draw was predicted but a team won', () => {
		expect(scorePrediction(1, 1, 2, 1)).toBe(POINTS.NONE);
	});

	it('awards 0 when a win was predicted but the match drew', () => {
		expect(scorePrediction(2, 0, 1, 1)).toBe(POINTS.NONE);
	});
});
