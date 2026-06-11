import type {LeaderboardRow} from '../lib/ranking';
import {Avatar} from './Avatar';

const MEDALS = ['🥇', '🥈', '🥉'];

interface LeaderboardProps {
	onSelect: (name: string) => void;
	rows: LeaderboardRow[];
}

export function Leaderboard({onSelect, rows}: LeaderboardProps) {
	return (
		<div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
			<table className="w-full text-left">
				<thead>
					<tr className="border-b border-white/10 text-xs font-semibold uppercase tracking-wider text-slate-400">
						<th className="w-20 py-3 pl-4 pr-2">Rank</th>

						<th className="py-3 pl-2 pr-4">Participant</th>

						<th className="px-4 py-3 text-right">Exact scores</th>

						<th className="px-4 py-3 text-right">Points</th>
					</tr>
				</thead>

				<tbody>
					{rows.map((row) => (
						<tr
							className="cursor-pointer border-b border-white/5 transition-colors last:border-0 hover:bg-white/10"
							key={row.name}
							onClick={() => onSelect(row.name)}
						>
							<td className="w-20 py-3 pl-4 pr-2 font-display text-lg font-bold text-slate-300">
								{row.rank <= 3 ? MEDALS[row.rank - 1] : row.rank}
							</td>

							<td className="py-3 pl-2 pr-4">
								<span className="flex items-center gap-2.5 font-medium text-white">
									<Avatar
										className="h-8 w-8 rounded-full"
										name={row.name}
									/>

									{row.name}

									{(row.movement ?? 0) > 0 && (
										<span className="text-xs text-emerald-400">
											▲
										</span>
									)}

									{(row.movement ?? 0) < 0 && (
										<span className="text-xs text-rose-400">
											▼
										</span>
									)}
								</span>
							</td>

							<td className="px-4 py-3 text-right text-slate-400">
								{row.exactCount}
							</td>

							<td className="px-4 py-3 text-right font-display text-lg font-bold text-amber-400">
								{row.total}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
