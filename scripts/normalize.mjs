export function normalizeGames(rawGames) {
	return rawGames.map((game) => ({
		awayScore: Number(game.away_score),
		awayTeam: game.away_team_name_en,
		finished: String(game.finished).toUpperCase() === 'TRUE',
		group: game.group,
		homeScore: Number(game.home_score),
		homeTeam: game.home_team_name_en,
		id: Number(game.id),
		localDate: game.local_date,
		matchday: Number(game.matchday),
		timeElapsed: game.time_elapsed,
	}));
}
