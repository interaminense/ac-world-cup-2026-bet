import {Flag} from './Flag';
import {StatusChip} from './StatusChip';

export interface LiveGame {
	matchNo: number;
	r1: number;
	r2: number;
	team1: string;
	team2: string;
	timeElapsed?: string;
}

// The live-scores bar below the header: one entry per live match — the green
// LIVE + minute badge (same StatusChip used in the Matches tab) sits to the
// left, above the box, and the box holds the big flag · score vs score · flag.
export function LiveGames({games}: {games: LiveGame[]}) {
	if (games.length === 0) {
		return null;
	}

	return (
		<div className="border-b border-white/10 bg-emerald-950/30">
			<div className="mx-auto flex max-w-5xl flex-wrap justify-center gap-4 px-4 py-4">
				{games.map((game) => (
					<div className="w-full sm:w-80" key={game.matchNo}>
						<StatusChip status="live" timeElapsed={game.timeElapsed} />

						<article className="mt-2 flex items-center justify-center gap-3 rounded-2xl border border-emerald-400/30 bg-emerald-400/5 p-4">
							<div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
								<Flag className="h-8 w-12" team={game.team1} />

								<span className="max-w-full truncate text-xs font-medium text-slate-300">
									{game.team1}
								</span>
							</div>

							<span className="font-display text-4xl font-bold text-white">
								{game.r1}
							</span>

							<span className="text-sm font-medium text-slate-500">
								vs
							</span>

							<span className="font-display text-4xl font-bold text-white">
								{game.r2}
							</span>

							<div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
								<Flag className="h-8 w-12" team={game.team2} />

								<span className="max-w-full truncate text-xs font-medium text-slate-300">
									{game.team2}
								</span>
							</div>
						</article>
					</div>
				))}
			</div>
		</div>
	);
}
