import {scoreParticipant} from '../lib/ranking';
import type {Game, Participant} from '../lib/types';
import {MatchRow} from './MatchRow';

interface ParticipantViewProps {
	games: Game[];
	participant: Participant;
}

export function ParticipantView({games, participant}: ParticipantViewProps) {
	const {exactCount, scored, total} = scoreParticipant(participant, games);

	return (
		<div className="space-y-4">
			<div className="flex items-end justify-between rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
				<div>
					<h2 className="font-display text-2xl font-bold text-white">
						{participant.name}
					</h2>

					<p className="text-sm text-slate-400">
						{exactCount} exact score{exactCount === 1 ? '' : 's'}
					</p>
				</div>

				<div className="text-right">
					<p className="font-display text-4xl font-bold text-amber-400">
						{total}
					</p>

					<p className="text-xs uppercase tracking-wider text-slate-400">
						points
					</p>
				</div>
			</div>

			<div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
				<table className="w-full min-w-[640px] text-left">
					<thead>
						<tr className="border-b border-white/10 text-xs font-semibold uppercase tracking-wider text-slate-400">
							<th className="px-3 py-3">#</th>

							<th className="px-3 py-3">Group</th>

							<th className="hidden px-3 py-3 sm:table-cell">Date</th>

							<th className="px-3 py-3">Prediction</th>

							<th className="px-3 py-3 text-center">Result</th>

							<th className="px-3 py-3 text-center">Status</th>

							<th className="px-3 py-3 text-right">Points</th>
						</tr>
					</thead>

					<tbody>
						{scored.map((item) => (
							<MatchRow key={item.prediction.matchNo} scored={item} />
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}
