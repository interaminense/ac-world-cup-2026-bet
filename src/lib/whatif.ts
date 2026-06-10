import {
	findGameForPrediction,
	getMatchStatus,
	normalizeTeamName,
	realScoreFor,
} from './games';
import {buildLeaderboard} from './ranking';
import type {Game, Participant, Prediction} from './types';

export interface WhatIfMover {
	name: string;
	pointsDelta: number;
	rankAfter: number;
	rankBefore: number;
	totalAfter: number;
}

export interface WhatIfScenario {
	label: string;
	movers: WhatIfMover[];
	score: string;
}

export function buildWhatIf(
	participants: Participant[],
	games: Game[],
	matchNo: number
): WhatIfScenario[] {
	let fixture: Prediction | undefined;

	for (const participant of participants) {
		fixture = participant.predictions.find(
			(prediction) => prediction.matchNo === matchNo
		);

		if (fixture) {
			break;
		}
	}

	if (!fixture) {
		return [];
	}

	const game = findGameForPrediction(fixture, games);

	if (!game || getMatchStatus(game) !== 'live') {
		return [];
	}

	const baseline = new Map(
		buildLeaderboard(participants, games).map((row) => [
			row.name,
			{rank: row.rank, total: row.total},
		])
	);

	const team1IsHome =
		normalizeTeamName(fixture.team1) === normalizeTeamName(game.homeTeam);

	const bumps = [
		{
			label: fixture.team1,
			simGame: team1IsHome
				? {...game, homeScore: game.homeScore + 1}
				: {...game, awayScore: game.awayScore + 1},
		},
		{
			label: fixture.team2,
			simGame: team1IsHome
				? {...game, awayScore: game.awayScore + 1}
				: {...game, homeScore: game.homeScore + 1},
		},
	];

	return bumps.map(({label, simGame}) => {
		const simGames = games.map((item) => (item === game ? simGame : item));

		const {r1, r2} = realScoreFor(fixture, simGame);

		const movers = buildLeaderboard(participants, simGames)
			.map((row) => {
				const before = baseline.get(row.name);

				return {
					name: row.name,
					pointsDelta: row.total - (before?.total ?? 0),
					rankAfter: row.rank,
					rankBefore: before?.rank ?? row.rank,
					totalAfter: row.total,
				};
			})
			.sort(
				(a, b) =>
					Math.abs(b.pointsDelta) - Math.abs(a.pointsDelta) ||
					a.name.localeCompare(b.name)
			);

		return {label, movers, score: `${r1}–${r2}`};
	});
}
