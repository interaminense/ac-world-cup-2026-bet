import type {MatchCard} from './matches';

export interface PoolStats {
	avgPointsPerPick: number | null;
	biggestMiss: {label: string; total: number; zeros: number} | null;
	exactScoresTotal: number;
	loneWolf: {label: string; name: string} | null;
	matchesPlayed: number;
	popularScoreline: {count: number; score: string} | null;
	topExact: {count: number; name: string} | null;
	totalPoints: number;
}

export function buildStats(cards: MatchCard[]): PoolStats {
	const finished = cards.filter((card) => card.status === 'finished');

	const scoredEntries = cards
		.flatMap((card) => card.entries)
		.filter((entry) => entry.points !== null);

	const totalPoints = scoredEntries.reduce(
		(sum, entry) => sum + (entry.points ?? 0),
		0
	);

	const exactByName = new Map<string, number>();
	const scorelineCount = new Map<string, number>();

	for (const card of cards) {
		for (const entry of card.entries) {
			if (entry.points === 25) {
				exactByName.set(
					entry.name,
					(exactByName.get(entry.name) ?? 0) + 1
				);
			}

			const score = `${entry.p1}–${entry.p2}`;

			scorelineCount.set(score, (scorelineCount.get(score) ?? 0) + 1);
		}
	}

	let topExact: PoolStats['topExact'] = null;

	for (const [name, count] of exactByName) {
		if (
			!topExact ||
			count > topExact.count ||
			(count === topExact.count && name.localeCompare(topExact.name) < 0)
		) {
			topExact = {count, name};
		}
	}

	let popularScoreline: PoolStats['popularScoreline'] = null;

	for (const [score, count] of scorelineCount) {
		if (!popularScoreline || count > popularScoreline.count) {
			popularScoreline = {count, score};
		}
	}

	let biggestMiss: PoolStats['biggestMiss'] = null;
	let loneWolf: PoolStats['loneWolf'] = null;

	for (const card of finished) {
		const label = `${card.team1} ${card.r1}–${card.r2} ${card.team2}`;
		const zeros = card.entries.filter((entry) => entry.points === 0).length;

		if (!biggestMiss || zeros > biggestMiss.zeros) {
			biggestMiss = {label, total: card.entries.length, zeros};
		}

		const scorers = card.entries.filter((entry) => (entry.points ?? 0) > 0);

		// Keep the latest finished match where a single person cashed in.
		if (scorers.length === 1) {
			loneWolf = {label, name: scorers[0].name};
		}
	}

	return {
		avgPointsPerPick: scoredEntries.length
			? totalPoints / scoredEntries.length
			: null,
		biggestMiss,
		exactScoresTotal: [...exactByName.values()].reduce((a, b) => a + b, 0),
		loneWolf,
		matchesPlayed: finished.length,
		popularScoreline,
		topExact,
		totalPoints,
	};
}
