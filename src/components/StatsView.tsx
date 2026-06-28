import type {Evolution} from '../lib/evolution';
import type {PoolStats} from '../lib/stats';
import type {TimelineFrame} from '../lib/timeline';
import {EvolutionChart} from './EvolutionChart';
import {PointsTimeline} from './PointsTimeline';

function StatCard({
	hint,
	label,
	value,
}: {
	hint?: string;
	label: string;
	value: string;
}) {
	return (
		<div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
			<p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
				{label}
			</p>

			<p className="mt-1 font-display text-2xl font-bold text-white">
				{value}
			</p>

			{hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
		</div>
	);
}

export function StatsView({
	evolution,
	stats,
	timeline,
}: {
	evolution: Evolution;
	stats: PoolStats;
	timeline: TimelineFrame[];
}) {
	return (
		<div className="space-y-6">
			<section>
				<h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.2em] text-sky-400">
					⏪ Rewind the race
				</h2>

				<PointsTimeline frames={timeline} />
			</section>

			<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
				<StatCard
					label="Matches played"
					value={String(stats.matchesPlayed)}
				/>

				<StatCard
					hint="across the whole pool"
					label="Points scored"
					value={String(stats.totalPoints)}
				/>

				<StatCard
					label="Avg points per pick"
					value={
						stats.avgPointsPerPick === null
							? '—'
							: stats.avgPointsPerPick.toFixed(1)
					}
				/>

				<StatCard
					hint={
						stats.topExact
							? `${stats.topExact.name} leads with ${stats.topExact.count}`
							: undefined
					}
					label="Exact scores"
					value={String(stats.exactScoresTotal)}
				/>

				<StatCard
					hint={
						stats.popularScoreline
							? `picked ${stats.popularScoreline.count} times`
							: undefined
					}
					label="Pool's favorite scoreline"
					value={stats.popularScoreline?.score ?? '—'}
				/>

				<StatCard
					hint={
						stats.biggestMiss
							? `${stats.biggestMiss.zeros} of ${stats.biggestMiss.total} scored zero`
							: 'No matches played yet'
					}
					label="Biggest collective miss"
					value={stats.biggestMiss?.label ?? '—'}
				/>

				<StatCard
					hint={
						stats.loneWolf
							? `${stats.loneWolf.name} cashed in alone`
							: 'Nobody has gone solo yet'
					}
					label="Lone wolf"
					value={stats.loneWolf?.label ?? '—'}
				/>
			</div>

			<section>
				<h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.2em] text-sky-400">
					📈 Points over time
				</h2>

				<EvolutionChart evolution={evolution} />
			</section>
		</div>
	);
}
