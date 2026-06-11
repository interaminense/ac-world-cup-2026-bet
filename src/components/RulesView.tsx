import {POINTS} from '../lib/scoring';
import {TIER_STYLES} from './StatusChip';

const TIERS = [
	{
		criterion: 'Exact Score',
		description: 'You nailed the final score.',
		example: 'Predicted 2–1, ended 2–1.',
		points: POINTS.EXACT_SCORE,
	},
	{
		criterion: "Correct Winner & Winner's Goals",
		description: 'Right winner, and you got how many goals they scored.',
		example: 'Predicted 2–1, ended 2–0.',
		points: POINTS.WINNER_AND_GOALS,
	},
	{
		criterion: 'Correct Winner & Goal Difference',
		description: 'Right winner, and you got the winning margin.',
		example: 'Predicted 2–1, ended 3–2.',
		points: POINTS.WINNER_AND_DIFF,
	},
	{
		criterion: 'Correct Draw (Incorrect Score)',
		description: 'You called the draw, but not the score.',
		example: 'Predicted 1–1, ended 2–2.',
		points: POINTS.DRAW,
	},
	{
		criterion: 'Correct Winner Only',
		description: 'Right winner — nothing else matched.',
		example: 'Predicted 2–1, ended 4–1.',
		points: POINTS.WINNER_ONLY,
	},
	{
		criterion: 'Wrong Outcome',
		description: 'Wrong winner, or a draw you did not see coming.',
		example: 'Predicted 2–1, ended 0–1.',
		points: POINTS.NONE,
	},
];

function RuleCard({
	children,
	title,
}: {
	children: React.ReactNode;
	title: string;
}) {
	return (
		<section className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
			<h2 className="mb-3 font-display text-lg font-bold text-white">
				{title}
			</h2>

			{children}
		</section>
	);
}

export function RulesView() {
	return (
		<div className="space-y-4">
			<RuleCard title="🎯 Scoring">
				<p className="mb-3 text-sm text-slate-400">
					Each match is scored against your prediction. Only the{' '}
					<span className="font-semibold text-white">
						highest matching tier
					</span>{' '}
					counts — tiers never stack.
				</p>

				<ul className="space-y-2">
					{TIERS.map((tier) => (
						<li
							className="flex items-start gap-3 rounded-xl bg-white/5 px-3 py-2.5"
							key={tier.criterion}
						>
							<span
								className={`mt-0.5 inline-block min-w-10 rounded-full px-2.5 py-0.5 text-center text-sm font-bold ${
									TIER_STYLES[tier.points]
								}`}
							>
								{tier.points}
							</span>

							<span>
								<span className="block text-sm font-medium text-white">
									{tier.criterion}
								</span>

								<span className="block text-xs text-slate-400">
									{tier.description}{' '}
									<span className="text-slate-500">
										{tier.example}
									</span>
								</span>
							</span>
						</li>
					))}
				</ul>
			</RuleCard>

			<RuleCard title="🏆 Ranking">
				<ul className="list-inside list-disc space-y-1.5 text-sm text-slate-400">
					<li>
						The leaderboard sums your points across all matches
						played.
					</li>

					<li>
						Equal totals share the same rank, and the next rank is
						skipped — two leaders on 50 points are both 1st, and the
						next participant is 3rd.
					</li>

					<li>
						Exact scores are shown as a stat, not a tie-breaker.
					</li>
				</ul>
			</RuleCard>

			<RuleCard title="⏱️ Live Matches">
				<ul className="list-inside list-disc space-y-1.5 text-sm text-slate-400">
					<li>
						Matches that have not kicked off never score — a
						predicted 0–0 does not count before the whistle.
					</li>

					<li>
						Live matches score{' '}
						<span className="font-medium text-emerald-400">
							provisionally
						</span>{' '}
						(pulsing points) and can change until full time.
					</li>

					<li>
						The 🔮 What if panel on a live card shows how one more
						goal for either side would reshuffle the ranking.
					</li>
				</ul>
			</RuleCard>

			<RuleCard title="📡 Data">
				<ul className="list-inside list-disc space-y-1.5 text-sm text-slate-400">
					<li>
						Scores come from FIFA's public match feed, refreshed
						every few minutes.
					</li>

					<li>
						Predictions were frozen before the opening match — group
						stage only, all 72 games.
					</li>

					<li>Kickoff times are shown in your local timezone.</li>
				</ul>
			</RuleCard>
		</div>
	);
}
