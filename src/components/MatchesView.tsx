import {useState} from 'react';

import {kickoffDate} from '../lib/kickoff';
import type {MatchCard} from '../lib/matches';
import type {WhatIfScenario} from '../lib/whatif';
import {Flag} from './Flag';
import {StatusChip, TIER_STYLES} from './StatusChip';
import {WhatIfPanel} from './WhatIfPanel';

interface MatchesViewProps {
	cards: MatchCard[];
	commentary: Record<number, string>;
	whatIf: Record<number, WhatIfScenario[]>;
}

interface DayGroup {
	cards: MatchCard[];
	label: string;
}

function groupByLocalDay(cards: MatchCard[]): DayGroup[] {
	const groups: DayGroup[] = [];

	for (const card of cards) {
		const kickoff = kickoffDate(card.date, card.time);

		const label = kickoff
			? kickoff.toLocaleDateString('en-US', {
					day: 'numeric',
					month: 'short',
					weekday: 'short',
				})
			: card.date;

		const last = groups[groups.length - 1];

		if (last && last.label === label) {
			last.cards.push(card);
		}
		else {
			groups.push({cards: [card], label});
		}
	}

	return groups;
}

function kickoffTime(card: MatchCard): string {
	const kickoff = kickoffDate(card.date, card.time);

	if (!kickoff) {
		return card.time;
	}

	return kickoff.toLocaleTimeString('en-US', {
		hour: '2-digit',
		minute: '2-digit',
		timeZoneName: 'short',
	});
}

function EntryPill({
	entry,
	live,
}: {
	entry: MatchCard['entries'][number];
	live: boolean;
}) {
	return (
		<div className="flex items-center justify-between gap-2 rounded-lg bg-white/5 px-2.5 py-1.5">
			<span className="truncate text-sm text-slate-300">{entry.name}</span>

			<span className="flex items-center gap-1.5">
				<span className="rounded bg-white/10 px-1.5 py-0.5 font-display text-xs font-bold text-slate-200">
					{entry.p1}–{entry.p2}
				</span>

				{entry.points !== null && (
					<span
						className={`inline-block min-w-8 rounded-full px-1.5 py-0.5 text-center text-xs font-bold ${
							TIER_STYLES[entry.points]
						} ${live ? 'animate-pulse' : ''}`}
					>
						{entry.points}
					</span>
				)}
			</span>
		</div>
	);
}

function MatchCardArticle({
	card,
	commentary,
	whatIf,
}: {
	card: MatchCard;
	commentary: Record<number, string>;
	whatIf: Record<number, WhatIfScenario[]>;
}) {
	return (
		<article
			className={`rounded-2xl border bg-white/5 p-4 ${
				card.status === 'live'
					? 'border-emerald-400/40'
					: 'border-white/10'
			} ${card.status === 'finished' ? 'opacity-60' : ''}`}
		>
			<div className="mb-3 flex items-center justify-between text-xs text-slate-400">
				<span>
					#{card.matchNo} · {card.group} · {kickoffTime(card)}
				</span>

				<StatusChip status={card.status} timeElapsed={card.timeElapsed} />
			</div>

			<div className="mb-3 flex items-center justify-center gap-3 text-center">
				<span className="flex flex-1 items-center justify-end gap-2 font-medium text-white">
					{card.team1}

					<Flag team={card.team1} />
				</span>

				<span className="rounded-lg bg-white/10 px-3 py-1 font-display text-lg font-bold text-amber-300">
					{card.r1 !== undefined ? `${card.r1}–${card.r2}` : 'vs'}
				</span>

				<span className="flex flex-1 items-center justify-start gap-2 font-medium text-white">
					<Flag team={card.team2} />

					{card.team2}
				</span>
			</div>

			<div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
				{card.entries.map((entry) => (
					<EntryPill
						entry={entry}
						key={entry.name}
						live={card.status === 'live'}
					/>
				))}
			</div>

			{card.status === 'live' && (
				<WhatIfPanel scenarios={whatIf[card.matchNo] ?? []} />
			)}

			{commentary[card.matchNo] && (
				<div className="mt-3 flex gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-3 py-2.5">
					<span aria-hidden className="text-sm">
						🎙️
					</span>

					<p className="text-xs italic leading-relaxed text-slate-300">
						{commentary[card.matchNo]}
					</p>
				</div>
			)}
		</article>
	);
}

function MatchSection({
	commentary,
	emptyLabel,
	groups,
	whatIf,
}: {
	commentary: Record<number, string>;
	emptyLabel: string;
	groups: DayGroup[];
	whatIf: Record<number, WhatIfScenario[]>;
}) {
	if (groups.length === 0) {
		return (
			<div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-12 text-center text-sm text-slate-400">
				{emptyLabel}
			</div>
		);
	}

	return (
		<section className="space-y-6">
			{groups.map((group) => (
				<div key={group.label}>
					<h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
						{group.label}
					</h3>

					<div className="grid gap-3 lg:grid-cols-2">
						{group.cards.map((card) => (
							<MatchCardArticle
								card={card}
								commentary={commentary}
								key={card.matchNo}
								whatIf={whatIf}
							/>
						))}
					</div>
				</div>
			))}
		</section>
	);
}

function SubTab({
	active,
	children,
	count,
	live,
	onClick,
}: {
	active: boolean;
	children: React.ReactNode;
	count: number;
	live?: boolean;
	onClick: () => void;
}) {
	return (
		<button
			className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
				active
					? 'bg-emerald-500 text-emerald-950'
					: 'bg-white/5 text-slate-300 hover:bg-white/10'
			}`}
			onClick={onClick}
		>
			{live && (
				<span
					aria-hidden
					className="h-2 w-2 animate-pulse rounded-full bg-rose-500"
				/>
			)}

			{children}

			<span
				className={`rounded-full px-1.5 text-xs font-bold ${
					active
						? 'bg-emerald-950/15 text-emerald-950'
						: 'bg-white/10 text-slate-400'
				}`}
			>
				{count}
			</span>
		</button>
	);
}

export function MatchesView({cards, commentary, whatIf}: MatchesViewProps) {
	const upcoming = cards.filter((card) => card.status !== 'finished');
	const finished = cards.filter((card) => card.status === 'finished');

	const hasLive = upcoming.some((card) => card.status === 'live');

	const [view, setView] = useState<'finished' | 'upcoming'>(() =>
		upcoming.length === 0 && finished.length > 0 ? 'finished' : 'upcoming'
	);

	const groups =
		view === 'finished'
			? groupByLocalDay([...finished].reverse())
			: groupByLocalDay(upcoming);

	return (
		<div className="space-y-6">
			<div className="flex gap-1.5">
				<SubTab
					active={view === 'upcoming'}
					count={upcoming.length}
					live={hasLive}
					onClick={() => setView('upcoming')}
				>
					Upcoming
				</SubTab>

				<SubTab
					active={view === 'finished'}
					count={finished.length}
					onClick={() => setView('finished')}
				>
					Finished
				</SubTab>
			</div>

			<MatchSection
				commentary={commentary}
				emptyLabel={
					view === 'finished'
						? 'No finished matches yet — results show up here.'
						: 'No upcoming matches.'
				}
				groups={groups}
				whatIf={whatIf}
			/>
		</div>
	);
}
