import type {ParticipantStats} from '../lib/participantStats';
import type {LeaderboardRow} from '../lib/ranking';
import {Avatar} from './Avatar';
import {LeaderCard} from './LeaderCard';
import {Reactions} from './Reactions';

const MEDALS = ['🥇', '🥈', '🥉'];

interface LeaderboardProps {
	leader?: {name: string; stats: ParticipantStats};
	live?: boolean;
	myReactions?: Record<string, string[]>;
	onClearReaction?: (name: string, emoji: string) => void;
	onClearRecap?: () => void;
	onHype: (rx: number, ry: number) => void;
	onReact?: (name: string, emoji: string) => void;
	onSelect: (name: string) => void;
	reactions?: Record<string, Record<string, number>>;
	recap?: string;
	rows: LeaderboardRow[];
	titleOdds?: Record<string, number>;
	titles?: Record<string, string>;
	youName?: string | null;
}

// Chance of finishing the group stage in first place. Anything below 1% (but
// still possible) reads "<1%"; a dash means mathematically out.
function formatOdds(odds?: number): string {
	if (odds === undefined || odds <= 0) {
		return '—';
	}

	if (odds < 0.01) {
		return '<1%';
	}

	return `${Math.round(odds * 100)}%`;
}

export function Leaderboard({
	leader,
	live = false,
	myReactions = {},
	onClearReaction,
	onClearRecap,
	onHype,
	onReact,
	onSelect,
	reactions = {},
	recap,
	rows,
	titleOdds,
	titles = {},
	youName = null,
}: LeaderboardProps) {
	return (
		<div className="space-y-4">
			{leader && (
				<LeaderCard
					name={leader.name}
					onHype={onHype}
					stats={leader.stats}
				/>
			)}

			{recap && (
				<div className="flex items-start gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-400/5 px-4 py-3">
					<span aria-hidden className="text-sm">
						🎙️
					</span>

					<p className="flex-1 text-sm italic leading-relaxed text-slate-300">
						{recap}
					</p>

					{onClearRecap && (
						<button
							aria-label="Remove the recap"
							className="shrink-0 rounded-full bg-rose-500/20 px-1.5 text-[10px] text-rose-300 transition hover:bg-rose-500/40"
							onClick={onClearRecap}
						>
							✕
						</button>
					)}
				</div>
			)}

			<div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
				<table className="w-full text-left">
					<thead>
						<tr className="border-b border-white/10 text-xs font-semibold uppercase tracking-wider text-slate-400">
							<th className="w-10 py-3 pl-3 pr-0 sm:w-12">#</th>

							<th className="py-3 pl-1 pr-2">Participant</th>

							<th className="hidden px-4 py-3 text-right sm:table-cell">
								Exact scores
							</th>

							{titleOdds && (
								<th
									className="px-2 py-3 text-right sm:px-4"
									title="Estimated chance of finishing the group stage in 1st place, from a simulation of the remaining matches."
								>
									<span aria-label="Title odds">🏆</span>
								</th>
							)}

							<th className="px-3 py-3 text-right sm:px-4">Points</th>
						</tr>
					</thead>

					<tbody>
						{rows.map((row) => {
						const isYou = row.name === youName;

						return (
							<tr
								className={`group cursor-pointer border-b border-white/5 transition-colors last:border-0 hover:bg-white/10 ${
									isYou ? 'bg-emerald-400/10' : ''
								}`}
								key={row.name}
								onClick={() => onSelect(row.name)}
							>
								<td className="w-10 py-3 pl-3 pr-0 font-display text-lg font-bold text-slate-300 sm:w-12">
									{row.rank <= 3 ? MEDALS[row.rank - 1] : row.rank}
								</td>

								<td className="py-3 pl-1 pr-2">
									<div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
										<div className="flex min-w-0 items-start gap-2.5 sm:items-center">
											<Avatar
												className="h-8 w-8 shrink-0 rounded-full"
												name={row.name}
												photoURL={row.photoURL}
											/>

											<div className="min-w-0">
												<span className="flex items-center gap-1.5">
													<span className="truncate font-medium text-white">
														{row.name}
													</span>

													{isYou && (
														<span className="rounded-full bg-emerald-400/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-300">
															you
														</span>
													)}

													{!live && (row.movement ?? 0) > 0 && (
														<span className="text-xs text-emerald-400">▲</span>
													)}

													{!live && (row.movement ?? 0) < 0 && (
														<span className="text-xs text-rose-400">▼</span>
													)}

													{!live && titles[row.name] && (
														<span className="hidden truncate text-xs text-slate-500 sm:inline">
															{titles[row.name]}
														</span>
													)}
												</span>

												{!live && titles[row.name] && (
													<span className="block truncate text-xs text-slate-500 sm:hidden">
														{titles[row.name]}
													</span>
												)}

												{onReact && (
													<div className="mt-1.5 sm:hidden">
														<Reactions
															collapsible
															counts={reactions[row.name] ?? {}}
															mine={myReactions[row.name] ?? []}
															onClear={
																onClearReaction
																	? (emoji) => onClearReaction(row.name, emoji)
																	: undefined
															}
															onReact={(emoji) => onReact(row.name, emoji)}
														/>
													</div>
												)}
											</div>
										</div>

										{onReact && (
											<div className="hidden sm:flex">
												<Reactions
													collapsible
													counts={reactions[row.name] ?? {}}
													mine={myReactions[row.name] ?? []}
													onClear={
														onClearReaction
															? (emoji) => onClearReaction(row.name, emoji)
															: undefined
													}
													onReact={(emoji) => onReact(row.name, emoji)}
												/>
											</div>
										)}
									</div>
								</td>

								<td className="hidden px-4 py-3 text-right text-slate-400 sm:table-cell">
									{row.exactCount}
								</td>

								{titleOdds && (
									<td className="whitespace-nowrap px-2 py-3 text-right text-sm font-semibold text-emerald-300 sm:px-4">
										{formatOdds(titleOdds[row.name])}
									</td>
								)}

								<td className="whitespace-nowrap px-3 py-3 text-right font-display text-lg font-bold text-amber-400 sm:px-4">
									{row.livePoints > 0 ? (
										<>
											{row.total - row.livePoints}{' '}
											<span className="animate-pulse text-emerald-400">
												+{row.livePoints}
											</span>
										</>
									) : (
										row.total
									)}
								</td>
							</tr>
						);
					})}
					</tbody>
				</table>
			</div>
		</div>
	);
}
