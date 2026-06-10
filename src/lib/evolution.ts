import {findGameForPrediction, getMatchStatus, realScoreFor} from './games';
import {kickoffDate} from './kickoff';
import {scorePrediction} from './scoring';
import type {Game, Participant, Prediction} from './types';

export interface EvolutionSeries {
	name: string;
	totals: number[];
}

export interface Evolution {
	days: string[];
	series: EvolutionSeries[];
}

interface FinishedFixture {
	day: string;
	game: Game;
	kickoff: number;
}

export function buildEvolution(
	participants: Participant[],
	games: Game[]
): Evolution {
	const fixtures = new Map<number, Prediction>();

	for (const participant of participants) {
		for (const prediction of participant.predictions) {
			if (!fixtures.has(prediction.matchNo)) {
				fixtures.set(prediction.matchNo, prediction);
			}
		}
	}

	const finished = new Map<number, FinishedFixture>();

	for (const fixture of fixtures.values()) {
		const game = findGameForPrediction(fixture, games);

		if (!game || getMatchStatus(game) !== 'finished') {
			continue;
		}

		finished.set(fixture.matchNo, {
			day: fixture.date,
			game,
			kickoff: kickoffDate(fixture.date, fixture.time)?.getTime() ?? 0,
		});
	}

	const firstKickoffByDay = new Map<string, number>();

	for (const {day, kickoff} of finished.values()) {
		const current = firstKickoffByDay.get(day);

		if (current === undefined || kickoff < current) {
			firstKickoffByDay.set(day, kickoff);
		}
	}

	const days = [...firstKickoffByDay.entries()]
		.sort((a, b) => a[1] - b[1])
		.map(([day]) => day);

	const dayIndex = new Map(days.map((day, index) => [day, index]));

	const series = participants.map((participant) => {
		const perDay: number[] = new Array(days.length).fill(0);

		for (const prediction of participant.predictions) {
			const item = finished.get(prediction.matchNo);

			if (!item) {
				continue;
			}

			const index = dayIndex.get(item.day);

			if (index === undefined) {
				continue;
			}

			const {r1, r2} = realScoreFor(prediction, item.game);

			perDay[index] += scorePrediction(prediction.p1, prediction.p2, r1, r2);
		}

		const totals: number[] = [];
		let sum = 0;

		for (const value of perDay) {
			sum += value;
			totals.push(sum);
		}

		return {name: participant.name, totals};
	});

	return {days, series};
}
