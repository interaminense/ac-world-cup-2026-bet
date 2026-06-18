import {useMemo} from 'react';

import {buildGroups} from '../lib/groups';
import type {Game} from '../lib/types';
import {Flag} from './Flag';

export function GroupsView({games}: {games: Game[]}) {
	const groups = useMemo(() => buildGroups(games), [games]);

	if (groups.length === 0) {
		return (
			<div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-12 text-center text-sm text-slate-400">
				No group data yet.
			</div>
		);
	}

	return (
		<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{groups.map((group) => (
				<div
					className="rounded-2xl border border-white/10 bg-white/5 p-3"
					key={group.name}
				>
					<h3 className="mb-2 px-1 text-sm font-bold text-white">
						{group.name}
					</h3>

					<table className="w-full text-left text-xs">
						<thead>
							<tr className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
								<th className="w-5 pb-1 pl-1 pr-1">#</th>

								<th className="pb-1 pr-1">Team</th>

								<th className="px-1 pb-1 text-center">P</th>

								<th className="hidden px-1 pb-1 text-center sm:table-cell">
									W
								</th>

								<th className="hidden px-1 pb-1 text-center sm:table-cell">
									D
								</th>

								<th className="hidden px-1 pb-1 text-center sm:table-cell">
									L
								</th>

								<th className="px-1 pb-1 text-center">GD</th>

								<th className="pb-1 pl-1 text-right">Pts</th>
							</tr>
						</thead>

						<tbody>
							{group.teams.map((team, index) => (
								<tr
									className={`border-t border-white/5 ${
										index < 2 ? 'bg-emerald-400/[0.06]' : ''
									}`}
									key={team.team}
								>
									<td className="py-1.5 pl-1 pr-1 text-slate-500">
										{index + 1}
									</td>

									<td className="py-1.5 pr-1">
										<span className="flex min-w-0 items-center gap-1.5">
											<Flag
												className="h-3.5 w-5 shrink-0"
												team={team.team}
											/>

											<span className="truncate text-slate-200">
												{team.team}
											</span>
										</span>
									</td>

									<td className="px-1 py-1.5 text-center text-slate-400">
										{team.played}
									</td>

									<td className="hidden px-1 py-1.5 text-center text-slate-400 sm:table-cell">
										{team.won}
									</td>

									<td className="hidden px-1 py-1.5 text-center text-slate-400 sm:table-cell">
										{team.drawn}
									</td>

									<td className="hidden px-1 py-1.5 text-center text-slate-400 sm:table-cell">
										{team.lost}
									</td>

									<td className="px-1 py-1.5 text-center text-slate-400">
										{team.goalDifference > 0 ? '+' : ''}
										{team.goalDifference}
									</td>

									<td className="py-1.5 pl-1 text-right font-display font-bold text-amber-300">
										{team.points}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			))}
		</div>
	);
}
