import {useState} from 'react';

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

function ScoringCard() {
	return (
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
	);
}

function RankingCard() {
	return (
		<RuleCard title="🏆 Ranking">
			<ul className="list-inside list-disc space-y-1.5 text-sm text-slate-400">
				<li>
					The leaderboard sums your points across all matches played.
				</li>

				<li>
					Equal totals share the same rank, and the next rank is
					skipped — two leaders on 50 points are both 1st, and the next
					participant is 3rd.
				</li>

				<li>Exact scores are shown as a stat, not a tie-breaker.</li>
			</ul>
		</RuleCard>
	);
}

function KnockoutRules() {
	return (
		<div className="space-y-4">
			<ScoringCard />

			<RuleCard title="✍️ Making your picks">
				<ul className="list-inside list-disc space-y-1.5 text-sm text-slate-400">
					<li>
						Knockout picks are made in the app, round by round — a
						match opens for predictions once both teams are known.
					</li>

					<li>
						You must be{' '}
						<span className="font-medium text-sky-400">
							signed in with Google
						</span>{' '}
						to make a pick.
					</li>

					<li>
						Predict a scoreline for every game{' '}
						<span className="font-medium text-white">
							before it kicks off
						</span>
						.
					</li>

					<li>
						Picks lock at kickoff: once a match starts you can no
						longer add or change your pick — a late change is ignored.
					</li>

					<li>
						The admin can open or close any defined match; by default
						it stays open until kickoff.
					</li>

					<li>
						A countdown appears in the last 24 hours before kickoff,
						turning pink in the final hour.
					</li>
				</ul>
			</RuleCard>

			<RuleCard title="⏱️ When points count">
				<ul className="list-inside list-disc space-y-1.5 text-sm text-slate-400">
					<li>
						Points are awarded only at{' '}
						<span className="font-medium text-white">full time</span>{' '}
						— extra time included.
					</li>

					<li>
						The score shows live (and through extra time) but does not
						count until the final whistle.
					</li>

					<li>
						A match decided on penalties is scored on its full-time
						draw — the shootout never changes the scoreline, so
						calling the draw still scores.
					</li>
				</ul>
			</RuleCard>

			<RankingCard />

			<RuleCard title="🗂️ Bracket & data">
				<ul className="list-inside list-disc space-y-1.5 text-sm text-slate-400">
					<li>
						The bracket fills in as each round finishes and the next
						round's matchups are set.
					</li>

					<li>
						Scores come from FIFA's public match feed (penalties
						excluded), refreshed every few minutes.
					</li>

					<li>Kickoff times are shown in your local timezone.</li>
				</ul>
			</RuleCard>
		</div>
	);
}

function GroupRules() {
	return (
		<div className="space-y-4">
			<ScoringCard />

			<RankingCard />

			<RuleCard title="⏱️ Live Matches">
				<ul className="list-inside list-disc space-y-1.5 text-sm text-slate-400">
					<li>
						Matches that have not kicked off never score — a predicted
						0–0 does not count before the whistle.
					</li>

					<li>
						Live matches score{' '}
						<span className="font-medium text-sky-400">
							provisionally
						</span>{' '}
						(pulsing points) and can change until full time.
					</li>

					<li>
						The 🔮 What if panel on a live card shows how one more goal
						for either side would reshuffle the ranking.
					</li>
				</ul>
			</RuleCard>

			<RuleCard title="📡 Data">
				<ul className="list-inside list-disc space-y-1.5 text-sm text-slate-400">
					<li>
						Scores come from FIFA's public match feed, refreshed every
						few minutes.
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

export function RulesView() {
	// Knockout is the current phase, so it leads.
	const [tab, setTab] = useState<'group' | 'knockout'>('knockout');

	const isKnockout = tab === 'knockout';

	return (
		<div className="space-y-4">
			<div className="flex gap-1 rounded-xl border border-white/10 bg-white/5 p-1 text-sm font-medium">
				<button
					className={`flex-1 rounded-lg px-3 py-1.5 transition ${
						isKnockout
							? 'bg-sky-500 text-white'
							: 'text-slate-300 hover:text-white'
					}`}
					onClick={() => setTab('knockout')}
				>
					Knockout Stage
				</button>

				<button
					className={`flex-1 rounded-lg px-3 py-1.5 transition ${
						isKnockout
							? 'text-slate-300 hover:text-white'
							: 'bg-sky-500 text-white'
					}`}
					onClick={() => setTab('group')}
				>
					Group Stage
				</button>
			</div>

			{isKnockout ? <KnockoutRules /> : <GroupRules />}
		</div>
	);
}
