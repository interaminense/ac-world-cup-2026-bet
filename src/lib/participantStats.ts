import {realScoreFor} from './games';
import {kickoffDate} from './kickoff';
import {buildMatchCards} from './matches';
import {buildLeaderboardWithMovement, scoreParticipant} from './ranking';
import {scorePrediction} from './scoring';
import {buildPointsTimeline} from './timeline';
import type {Game, Participant} from './types';
import type {KnockoutMatch} from './useKnockout';

// The six scoring tiers, highest first. Colors mirror TIER_STYLES (the chips
// in the Rules and on match cards) so the breakdown reads the same: 25 amber,
// 18 emerald, 15 teal, 12 sky, 10 indigo, 0 rose.
export const SCORE_TIERS = [
	{color: '#fcd34d', label: 'Exact', points: 25},
	{color: '#6ee7b7', label: 'Winner + goals', points: 18},
	{color: '#5eead4', label: 'Winner + diff', points: 15},
	{color: '#7dd3fc', label: 'Right draw', points: 12},
	{color: '#a5b4fc', label: 'Winner', points: 10},
	{color: '#fb7185', label: 'Miss', points: 0},
];

export interface ParticipantStats {
	avgGoals: number | null;
	avgPerMatch: number | null;
	bestRound: {label: string; points: number} | null;
	contrarianRate: number | null;
	favoriteScoreline: string | null;
	finishedCount: number;
	gapToLeader: number;
	hitRate: number | null;
	hits: number;
	leadOverNext: number | null;
	movement: number;
	rank: number;
	rankHistory: number[];
	streak: number;
	tierCounts: number[];
	total: number;
	uniquePicks: number;
}

export function buildParticipantStats(
	participant: Participant,
	participants: Participant[],
	games: Game[]
): ParticipantStats {
	const {scored, total} = scoreParticipant(participant, games);

	const finished = scored.filter((item) => item.status === 'finished');
	const finishedCount = finished.length;
	const finishedPoints = finished.reduce(
		(sum, item) => sum + (item.points ?? 0),
		0
	);

	// Hit rate: finished matches where the winner was called (10+ points).
	const hits = finished.filter((item) => (item.points ?? 0) >= 10).length;

	const tierCounts = SCORE_TIERS.map(
		(tier) =>
			finished.filter((item) => (item.points ?? 0) === tier.points).length
	);

	let bestRound: ParticipantStats['bestRound'] = null;

	for (const item of finished) {
		const points = item.points ?? 0;

		if (item.game && points > 0 && (!bestRound || points > bestRound.points)) {
			const {r1, r2} = realScoreFor(item.prediction, item.game);

			bestRound = {
				label: `${item.prediction.team1} ${r1}–${r2} ${item.prediction.team2}`,
				points,
			};
		}
	}

	// Current streak: trailing run of finished matches that scored, newest last.
	const chronological = [...finished].sort(
		(a, b) =>
			(kickoffDate(a.prediction.date, a.prediction.time)?.getTime() ?? 0) -
			(kickoffDate(b.prediction.date, b.prediction.time)?.getTime() ?? 0)
	);

	let streak = 0;

	for (let i = chronological.length - 1; i >= 0; i--) {
		if ((chronological[i].points ?? 0) > 0) {
			streak++;
		}
		else {
			break;
		}
	}

	const totalGoals = participant.predictions.reduce(
		(sum, prediction) => sum + prediction.p1 + prediction.p2,
		0
	);
	const avgGoals = participant.predictions.length
		? totalGoals / participant.predictions.length
		: null;

	// Favorite scoreline shape, orientation-agnostic (a 2–1 win and a 1–2 win
	// both count as "2–1").
	const scorelineCount = new Map<string, number>();

	for (const prediction of participant.predictions) {
		const key = `${Math.max(prediction.p1, prediction.p2)}–${Math.min(
			prediction.p1,
			prediction.p2
		)}`;

		scorelineCount.set(key, (scorelineCount.get(key) ?? 0) + 1);
	}

	let favoriteScoreline: string | null = null;
	let favoriteCount = 0;

	for (const [key, count] of scorelineCount) {
		if (count > favoriteCount) {
			favoriteCount = count;
			favoriteScoreline = key;
		}
	}

	const board = buildLeaderboardWithMovement(participants, games);
	const myIndex = board.findIndex((row) => row.name === participant.name);
	const myRow = myIndex >= 0 ? board[myIndex] : undefined;
	const next = myIndex >= 0 ? board[myIndex + 1] : undefined;

	const rank = myRow?.rank ?? board.length;
	const movement = myRow?.movement ?? 0;
	const gapToLeader = Math.max(0, (board[0]?.total ?? 0) - total);
	const leadOverNext = next ? total - next.total : null;

	// Contrarian index: matches where nobody else made the same (oriented) call.
	const cards = buildMatchCards(participants, games);

	let considered = 0;
	let uniquePicks = 0;

	for (const card of cards) {
		const mine = card.entries.find((entry) => entry.name === participant.name);

		if (!mine) {
			continue;
		}

		considered++;

		const same = card.entries.filter(
			(entry) => entry.p1 === mine.p1 && entry.p2 === mine.p2
		).length;

		if (same === 1) {
			uniquePicks++;
		}
	}

	const rankHistory = buildPointsTimeline(participants, games)
		.map(
			(frame) =>
				frame.standings.find((row) => row.name === participant.name)?.rank
		)
		.filter((value): value is number => value !== undefined);

	return {
		avgGoals,
		avgPerMatch: finishedCount ? finishedPoints / finishedCount : null,
		bestRound,
		contrarianRate: considered ? uniquePicks / considered : null,
		favoriteScoreline,
		finishedCount,
		gapToLeader,
		hitRate: finishedCount ? hits / finishedCount : null,
		hits,
		leadOverNext,
		movement,
		rank,
		rankHistory,
		streak,
		tierCounts,
		total,
		uniquePicks,
	};
}

// Knockout-phase stats for one participant, shaped like ParticipantStats so the
// same panel renders both phases. Per-player fields come from this participant's
// own picks and the match results; pool-wide fields (rank, movement, gap,
// contrarian, rankHistory) come from `pool` — the whole knockout field projected
// into the (Participant, Game) shape (see knockoutAsGroupStage). Everything
// pool-wide reads only finished bracket matches: the knockout panel is a record
// of games already played, never a peek at the sealed picks ahead. Without a
// pool (or a name to find in it) those fields stay neutral.
export function buildKnockoutStats(
	matches: KnockoutMatch[],
	picks: Record<number, {p1: number; p2: number}>,
	pool: {games: Game[]; participants: Participant[]} | null = null,
	participantName: string | null = null
): ParticipantStats {
	const bets = matches
		.filter((match) => picks[match.matchNumber])
		.sort((a, b) => a.matchNumber - b.matchNumber)
		.map((match) => {
			const pick = picks[match.matchNumber];
			const hasScore = match.scoreA != null && match.scoreB != null;
			// Points only once the match is over (extra time included).
			const finished = match.finished && hasScore;

			return {
				finished,
				p1: pick.p1,
				p2: pick.p2,
				points: finished
					? scorePrediction(
							pick.p1,
							pick.p2,
							match.scoreA as number,
							match.scoreB as number
						)
					: null,
				teamA: match.teamA ?? match.a,
				teamB: match.teamB ?? match.b,
			};
		});

	const finished = bets.filter((bet) => bet.finished);
	const finishedCount = finished.length;
	const finishedPoints = finished.reduce(
		(sum, bet) => sum + (bet.points ?? 0),
		0
	);
	const hits = finished.filter((bet) => (bet.points ?? 0) >= 10).length;

	const tierCounts = SCORE_TIERS.map(
		(tier) =>
			finished.filter((bet) => (bet.points ?? 0) === tier.points).length
	);

	let bestRound: ParticipantStats['bestRound'] = null;

	for (const bet of finished) {
		const points = bet.points ?? 0;

		if (points > 0 && (!bestRound || points > bestRound.points)) {
			bestRound = {
				label: `${bet.teamA} ${bet.p1}–${bet.p2} ${bet.teamB}`,
				points,
			};
		}
	}

	// Trailing run of scoring picks, in match order (newest last).
	let streak = 0;

	for (let i = finished.length - 1; i >= 0; i--) {
		if ((finished[i].points ?? 0) > 0) {
			streak++;
		}
		else {
			break;
		}
	}

	const totalGoals = bets.reduce((sum, bet) => sum + bet.p1 + bet.p2, 0);
	const avgGoals = bets.length ? totalGoals / bets.length : null;

	const scorelineCount = new Map<string, number>();

	for (const bet of bets) {
		const key = `${Math.max(bet.p1, bet.p2)}–${Math.min(bet.p1, bet.p2)}`;

		scorelineCount.set(key, (scorelineCount.get(key) ?? 0) + 1);
	}

	let favoriteScoreline: string | null = null;
	let favoriteCount = 0;

	for (const [key, count] of scorelineCount) {
		if (count > favoriteCount) {
			favoriteCount = count;
			favoriteScoreline = key;
		}
	}

	// Contrarian index over the *finished* bracket matches only: matches where
	// nobody else made the same (oriented) call. Upcoming matches are skipped —
	// their picks are sealed, so comparing against them would peek at the future.
	const cards = pool ? buildMatchCards(pool.participants, pool.games) : [];

	let considered = 0;
	let uniquePicks = 0;

	for (const card of cards) {
		if (card.status !== 'finished') {
			continue;
		}

		const mine = card.entries.find((entry) => entry.name === participantName);

		if (!mine) {
			continue;
		}

		considered++;

		const same = card.entries.filter(
			(entry) => entry.p1 === mine.p1 && entry.p2 === mine.p2
		).length;

		if (same === 1) {
			uniquePicks++;
		}
	}

	// Rank history and the current standing, both from the finished-match
	// timeline so they read the past exactly like the group stage does.
	const timeline = pool ? buildPointsTimeline(pool.participants, pool.games) : [];

	const rankHistory = participantName
		? timeline
				.map(
					(frame) =>
						frame.standings.find(
							(row) => row.name === participantName
						)?.rank
				)
				.filter((value): value is number => value !== undefined)
		: [];

	const lastStandings = timeline[timeline.length - 1]?.standings ?? [];
	const myIndex = lastStandings.findIndex(
		(row) => row.name === participantName
	);
	const myStanding = myIndex >= 0 ? lastStandings[myIndex] : undefined;
	const nextStanding = myIndex >= 0 ? lastStandings[myIndex + 1] : undefined;

	return {
		avgGoals,
		avgPerMatch: finishedCount ? finishedPoints / finishedCount : null,
		bestRound,
		contrarianRate: considered ? uniquePicks / considered : null,
		favoriteScoreline,
		finishedCount,
		gapToLeader: myStanding
			? Math.max(0, (lastStandings[0]?.total ?? 0) - myStanding.total)
			: 0,
		hitRate: finishedCount ? hits / finishedCount : null,
		hits,
		leadOverNext:
			myStanding && nextStanding
				? myStanding.total - nextStanding.total
				: null,
		movement: myStanding?.movement ?? 0,
		rank: myStanding?.rank ?? 0,
		rankHistory,
		streak,
		tierCounts,
		total: finishedPoints,
		uniquePicks,
	};
}
