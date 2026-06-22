export interface Ball {
	claimedBy: string | null;
	id: number;
	x: number;
	y: number;
}

// A position in the inner field, away from the edges (fractions 0–1).
export function randomBallPosition(): {x: number; y: number} {
	return {
		x: 0.08 + Math.random() * 0.84,
		y: 0.08 + Math.random() * 0.84,
	};
}

export function isBallHit(
	x: number,
	y: number,
	ball: Ball,
	radius: number
): boolean {
	const dx = x - ball.x;
	const dy = y - ball.y;

	return dx * dx + dy * dy <= radius * radius + Number.EPSILON;
}

export function nextBall(prevId: number): Ball {
	return {claimedBy: null, id: prevId + 1, ...randomBallPosition()};
}

export function sortScores(
	scores: Record<string, number>
): [string, number][] {
	return Object.entries(scores).sort(
		(a, b) => b[1] - a[1] || a[0].localeCompare(b[0])
	);
}
