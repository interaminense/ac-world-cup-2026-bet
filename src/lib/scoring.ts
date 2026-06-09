export const POINTS = {
	EXACT_SCORE: 25,
	WINNER_AND_GOALS: 18,
	WINNER_AND_DIFF: 15,
	DRAW: 12,
	WINNER_ONLY: 10,
	NONE: 0,
} as const;

export function scorePrediction(
	p1: number,
	p2: number,
	r1: number,
	r2: number
): number {
	if (p1 === r1 && p2 === r2) {
		return POINTS.EXACT_SCORE;
	}

	const predictedDraw = p1 === p2;
	const realDraw = r1 === r2;

	if (predictedDraw && realDraw) {
		return POINTS.DRAW;
	}

	if (predictedDraw || realDraw) {
		return POINTS.NONE;
	}

	if (p1 > p2 !== r1 > r2) {
		return POINTS.NONE;
	}

	if (Math.max(p1, p2) === Math.max(r1, r2)) {
		return POINTS.WINNER_AND_GOALS;
	}

	if (p1 - p2 === r1 - r2) {
		return POINTS.WINNER_AND_DIFF;
	}

	return POINTS.WINNER_ONLY;
}
