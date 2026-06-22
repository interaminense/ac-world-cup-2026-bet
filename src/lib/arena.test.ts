import {describe, expect, it} from 'vitest';

import {
	type Ball,
	isBallHit,
	nextBall,
	randomBallPosition,
	sortScores,
} from './arena';

describe('randomBallPosition', () => {
	it('stays within the inner field on every roll', () => {
		for (let i = 0; i < 200; i += 1) {
			const {x, y} = randomBallPosition();

			expect(x).toBeGreaterThanOrEqual(0.08);
			expect(x).toBeLessThanOrEqual(0.92);
			expect(y).toBeGreaterThanOrEqual(0.08);
			expect(y).toBeLessThanOrEqual(0.92);
		}
	});
});

describe('isBallHit', () => {
	const ball: Ball = {claimedBy: null, id: 1, x: 0.5, y: 0.5};

	it('is a hit at the center and within the radius', () => {
		expect(isBallHit(0.5, 0.5, ball, 0.06)).toBe(true);
		expect(isBallHit(0.5, 0.54, ball, 0.06)).toBe(true);
	});

	it('is a hit exactly on the radius edge', () => {
		expect(isBallHit(0.56, 0.5, ball, 0.06)).toBe(true);
	});

	it('misses beyond the radius', () => {
		expect(isBallHit(0.5, 0.7, ball, 0.06)).toBe(false);
	});
});

describe('nextBall', () => {
	it('increments the id, clears claimedBy, and stays in bounds', () => {
		const ball = nextBall(4);

		expect(ball.id).toBe(5);
		expect(ball.claimedBy).toBeNull();
		expect(ball.x).toBeGreaterThanOrEqual(0.08);
		expect(ball.x).toBeLessThanOrEqual(0.92);
	});
});

describe('sortScores', () => {
	it('sorts by score desc, then name asc', () => {
		expect(sortScores({Ana: 3, Bob: 5, Cid: 5})).toEqual([
			['Bob', 5],
			['Cid', 5],
			['Ana', 3],
		]);
	});

	it('handles empty', () => {
		expect(sortScores({})).toEqual([]);
	});
});
