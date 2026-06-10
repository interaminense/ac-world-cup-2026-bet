import type {WhatIfScenario} from '../lib/whatif';

function ordinal(rank: number): string {
	const mod100 = rank % 100;

	if (mod100 >= 11 && mod100 <= 13) {
		return `${rank}th`;
	}

	const suffix =
		rank % 10 === 1
			? 'st'
			: rank % 10 === 2
				? 'nd'
				: rank % 10 === 3
					? 'rd'
					: 'th';

	return `${rank}${suffix}`;
}

function MoverChip({mover}: {mover: WhatIfScenario['movers'][number]}) {
	const gained = mover.pointsDelta > 0;

	return (
		<span
			className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
				gained
					? 'bg-emerald-400/10 text-emerald-300'
					: 'bg-rose-400/10 text-rose-300'
			}`}
		>
			<span className="font-medium">{mover.name}</span>

			<span className="font-display font-bold">
				{gained ? '+' : ''}
				{mover.pointsDelta}
			</span>

			{mover.rankAfter !== mover.rankBefore && (
				<span className="text-slate-400">
					{ordinal(mover.rankBefore)} → {ordinal(mover.rankAfter)}
					{mover.rankAfter < mover.rankBefore ? ' ↑' : ' ↓'}
				</span>
			)}
		</span>
	);
}

export function WhatIfPanel({scenarios}: {scenarios: WhatIfScenario[]}) {
	if (scenarios.length === 0) {
		return null;
	}

	return (
		<details className="mt-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
			<summary className="cursor-pointer select-none text-xs font-semibold uppercase tracking-wider text-emerald-400">
				🔮 What if…
			</summary>

			<div className="mt-2 space-y-3">
				{scenarios.map((scenario) => {
					const movers = scenario.movers.filter(
						(mover) => mover.pointsDelta !== 0
					);

					return (
						<div key={scenario.label}>
							<p className="mb-1.5 text-xs text-slate-400">
								If{' '}
								<span className="font-medium text-white">
									{scenario.label}
								</span>{' '}
								scores →{' '}
								<span className="font-display font-bold text-amber-300">
									{scenario.score}
								</span>
							</p>

							{movers.length === 0 ? (
								<p className="text-xs text-slate-500">
									Nobody moves. 😴
								</p>
							) : (
								<div className="flex flex-wrap gap-1.5">
									{movers.map((mover) => (
										<MoverChip key={mover.name} mover={mover} />
									))}
								</div>
							)}
						</div>
					);
				})}
			</div>
		</details>
	);
}
