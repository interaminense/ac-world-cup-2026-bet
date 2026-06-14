import {kickoffDate} from './kickoff';
import {buildMatchCards} from './matches';
import type {Game, Participant} from './types';

export interface TimelineStanding {
	gained: number;
	movement: number;
	name: string;
	rank: number;
	total: number;
}

export interface TimelineFrame {
	date: string;
	matchNo: number;
	r1: number;
	r2: number;
	standings: TimelineStanding[];
	team1: string;
	team2: string;
	time: string;
}

// A rewindable history of the leaderboard: one frame per finished match, in
// chronological order. Each frame holds the cumulative standings *after* that
// match — the points each player gained from it, their running total, their
// rank, and how that rank moved versus the previous frame. The frames feed the
// Stats timeline, where a scrubber walks back and forth through the field.
export function buildPointsTimeline(
	participants: Participant[],
	games: Game[]
): TimelineFrame[] {
	const names = participants.map((participant) => participant.name);

	const finished = buildMatchCards(participants, games)
		.filter((card) => card.status === 'finished')
		.sort(
			(a, b) =>
				(kickoffDate(a.date, a.time)?.getTime() ?? 0) -
					(kickoffDate(b.date, b.time)?.getTime() ?? 0) ||
				a.matchNo - b.matchNo
		);

	const totals = new Map<string, number>(names.map((name) => [name, 0]));

	// Empty until the first match: no baseline, so the opening frame reports
	// zero movement for everyone rather than a phantom drop from a 13-way tie.
	let previousRanks = new Map<string, number>();

	const frames: TimelineFrame[] = [];

	for (const card of finished) {
		const gained = new Map<string, number>(names.map((name) => [name, 0]));

		for (const entry of card.entries) {
			const points = entry.points ?? 0;

			gained.set(entry.name, points);
			totals.set(entry.name, (totals.get(entry.name) ?? 0) + points);
		}

		const ordered = [...names].sort(
			(a, b) =>
				(totals.get(b) ?? 0) - (totals.get(a) ?? 0) ||
				a.localeCompare(b)
		);

		let lastRank = 0;
		let lastTotal = Number.NaN;

		const standings: TimelineStanding[] = ordered.map((name, index) => {
			const total = totals.get(name) ?? 0;

			// Competition ranking: equal totals share a rank, the next total
			// skips ahead — matching the live leaderboard.
			const rank = total === lastTotal ? lastRank : index + 1;

			lastRank = rank;
			lastTotal = total;

			return {
				gained: gained.get(name) ?? 0,
				movement: (previousRanks.get(name) ?? rank) - rank,
				name,
				rank,
				total,
			};
		});

		previousRanks = new Map(
			standings.map((standing) => [standing.name, standing.rank])
		);

		frames.push({
			date: card.date,
			matchNo: card.matchNo,
			r1: card.r1 ?? 0,
			r2: card.r2 ?? 0,
			standings,
			team1: card.team1,
			team2: card.team2,
			time: card.time,
		});
	}

	return frames;
}
