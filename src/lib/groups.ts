import {getMatchStatus} from './games';
import type {Game} from './types';

export interface GroupTeam {
	drawn: number;
	goalDifference: number;
	goalsAgainst: number;
	goalsFor: number;
	lost: number;
	played: number;
	points: number;
	team: string;
	won: number;
}

export interface Group {
	name: string;
	teams: GroupTeam[];
}

function emptyTeam(team: string): GroupTeam {
	return {
		drawn: 0,
		goalDifference: 0,
		goalsAgainst: 0,
		goalsFor: 0,
		lost: 0,
		played: 0,
		points: 0,
		team,
		won: 0,
	};
}

// Group-stage standings derived from the games. Teams come from every fixture
// in the group (so a group shows all four even before kickoff); only finished
// matches count toward the table — live ones land once the whistle blows.
export function buildGroups(games: Game[]): Group[] {
	const byGroup = new Map<string, Map<string, GroupTeam>>();

	for (const game of games) {
		if (!game.group) {
			continue;
		}

		let teams = byGroup.get(game.group);

		if (!teams) {
			teams = new Map();
			byGroup.set(game.group, teams);
		}

		for (const name of [game.homeTeam, game.awayTeam]) {
			if (name && !teams.has(name)) {
				teams.set(name, emptyTeam(name));
			}
		}

		if (getMatchStatus(game) !== 'finished') {
			continue;
		}

		const home = teams.get(game.homeTeam);
		const away = teams.get(game.awayTeam);

		if (!home || !away) {
			continue;
		}

		home.played += 1;
		away.played += 1;
		home.goalsFor += game.homeScore;
		home.goalsAgainst += game.awayScore;
		away.goalsFor += game.awayScore;
		away.goalsAgainst += game.homeScore;

		if (game.homeScore > game.awayScore) {
			home.won += 1;
			home.points += 3;
			away.lost += 1;
		}
		else if (game.homeScore < game.awayScore) {
			away.won += 1;
			away.points += 3;
			home.lost += 1;
		}
		else {
			home.drawn += 1;
			away.drawn += 1;
			home.points += 1;
			away.points += 1;
		}
	}

	return [...byGroup.entries()]
		.map(([name, teams]) => ({
			name,
			teams: [...teams.values()]
				.map((team) => ({
					...team,
					goalDifference: team.goalsFor - team.goalsAgainst,
				}))
				.sort(
					(a, b) =>
						b.points - a.points ||
						b.goalDifference - a.goalDifference ||
						b.goalsFor - a.goalsFor ||
						a.team.localeCompare(b.team)
				),
		}))
		.sort((a, b) => a.name.localeCompare(b.name));
}
