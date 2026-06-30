import {useEffect, useMemo, useState} from 'react';
import {Link} from 'react-router-dom';

import {flagCode} from '../lib/flags';
import {
	type KnockoutPick,
	knockoutCountdown,
	knockoutStatus,
} from '../lib/knockoutCards';
import type {MatchEntry} from '../lib/matches';
import {scorePrediction} from '../lib/scoring';
import {type KnockoutMatch, useKnockout} from '../lib/useKnockout';
import {type KnockoutIdentity, useKnockoutPicks} from '../lib/useKnockoutPicks';
import {Flag} from './Flag';
import {MatchPicks} from './MatchPicks';

type ByNum = Record<number, KnockoutMatch>;

// Bracket tree, derived from the FIFA "W##" feeders so each match's two feeders
// are adjacent (a planar tree). Rounds run leaves → semifinal; the final is the
// centre. Left half feeds SF #101, right half feeds SF #102.
const LEFT: number[][] = [
	[74, 77, 73, 75, 83, 84, 81, 82],
	[89, 90, 93, 94],
	[97, 98],
	[101],
];
const RIGHT: number[][] = [
	[76, 78, 79, 80, 86, 88, 85, 87],
	[91, 92, 95, 96],
	[99, 100],
	[102],
];
const SPAN = [1, 2, 4, 8];

// Round groupings for the stacked mobile view.
const MOBILE_ROUNDS: {key: string; label: string}[] = [
	{key: 'Round of 32', label: 'Round of 32'},
	{key: 'Round of 16', label: 'Round of 16'},
	{key: 'Quarter-final', label: 'Quarter-finals'},
	{key: 'Semi-final', label: 'Semi-finals'},
	{key: 'Final', label: 'Final'},
	{key: 'Play-off for third place', label: '3rd place'},
];

const LINE = 'absolute border-white/15';

function TeamLine({
	placeholder,
	score,
	team,
}: {
	placeholder: string;
	score: number | null;
	team: string | null;
}) {
	const hasFlag = Boolean(team && flagCode(team));

	return (
		<div className="flex items-center justify-between gap-1.5">
			{hasFlag ? (
				<Flag className="h-5 w-7 shrink-0" team={team as string} />
			) : (
				<span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-400">
					{placeholder}
				</span>
			)}

			{score !== null && (
				<span className="shrink-0 text-sm font-bold text-amber-300">
					{score}
				</span>
			)}
		</div>
	);
}

// Live countdown line shown on an upcoming match within 24h of kickoff. Inside
// the last hour it turns pink with a pulsing dot.
function Countdown({label, startingSoon}: {label: string; startingSoon: boolean}) {
	return (
		<div
			className={`mt-3 flex items-center justify-center gap-1.5 text-[10px] font-semibold tracking-wide ${
				startingSoon ? 'text-pink-300' : 'text-slate-400'
			}`}
		>
			{startingSoon ? (
				<span aria-hidden className="relative flex h-2 w-2">
					<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pink-400 opacity-75" />

					<span className="relative inline-flex h-2 w-2 rounded-full bg-pink-500" />
				</span>
			) : (
				<span aria-hidden>⏳</span>
			)}

			<span>{label}</span>
		</div>
	);
}

// Hover/tap popover listing everyone's picks for the match, with the current
// points and tier colors.
function PicksPopover({
	m,
	open = false,
	picks,
}: {
	m: KnockoutMatch;
	open?: boolean;
	picks: KnockoutPick[];
}) {
	// Score live (provisional, pulsing) and finished matches alike — the popover
	// only opens once the match is under way, and a shootout never moves the
	// scoreline (penalties are excluded). Mirrors the match cards.
	const hasScore = m.scoreA != null && m.scoreB != null;
	const live = hasScore && !m.finished;

	const entries: MatchEntry[] = picks.map((pick) => ({
		name: pick.name,
		p1: pick.p1,
		p2: pick.p2,
		photoURL: pick.photoURL,
		points: hasScore
			? scorePrediction(
					pick.p1,
					pick.p2,
					m.scoreA as number,
					m.scoreB as number
				)
			: null,
	}));

	return (
		<div
			className={`absolute left-1/2 top-full z-50 mt-1 w-64 -translate-x-1/2 rounded-2xl border border-white/10 bg-slate-900 p-3 text-left shadow-xl transition group-hover:visible group-hover:opacity-100 ${
				open ? 'visible opacity-100' : 'invisible opacity-0'
			}`}
		>
			<MatchPicks entries={entries} live={live} />
		</div>
	);
}

function MatchCard({
	m,
	now,
	pick,
	picks,
	signedIn,
}: {
	m: KnockoutMatch;
	now: number;
	pick?: KnockoutPick;
	picks: KnockoutPick[];
	signedIn: boolean;
}) {
	const {label, startingSoon} = knockoutCountdown(m.date, now);
	const defined = Boolean(m.teamA && m.teamB);
	const live = knockoutStatus(m, now) === 'live';
	const finished = knockoutStatus(m, now) === 'finished';

	return (
		<div className="w-full min-w-0">
			<div
				className={`group relative rounded-md border bg-white/5 px-1.5 py-1 ${
					live
						? 'border-emerald-400/70 ring-1 ring-emerald-400/40'
						: startingSoon
							? 'border-pink-400/70 ring-1 ring-pink-400/40'
							: 'border-white/10'
				}`}
			>
				{/* Dim the result once the match is over (the popover stays full). */}
				<div className={finished ? 'opacity-50' : ''}>
					<TeamLine
						placeholder={m.a}
						score={m.scoreA ?? null}
						team={m.teamA ?? null}
					/>

					<div className="my-0.5 h-px bg-white/5" />

					<TeamLine
						placeholder={m.b}
						score={m.scoreB ?? null}
						team={m.teamB ?? null}
					/>
				</div>

				{label && (
					<Countdown label={label} startingSoon={startingSoon} />
				)}

				{picks.length > 0 && knockoutStatus(m, now) !== 'notstarted' && (
					<PicksPopover m={m} picks={picks} />
				)}
			</div>

			{signedIn && defined && (
				<div className="mt-1 text-center text-[9px]">
					{pick ? (
						<Link
							className="font-semibold text-sky-400 underline hover:text-sky-300"
							to={`/matches?match=${m.matchNumber}`}
						>
							✓ {pick.p1}–{pick.p2}
						</Link>
					) : (
						<Link
							className="text-slate-400 underline hover:text-slate-200"
							to={`/matches?match=${m.matchNumber}`}
						>
							Predict →
						</Link>
					)}
				</div>
			)}
		</div>
	);
}

function MobileTeam({
	placeholder,
	team,
}: {
	placeholder: string;
	team: string | null;
}) {
	const hasFlag = Boolean(team && flagCode(team));

	return hasFlag ? (
		<Flag className="h-6 w-9 shrink-0" team={team as string} />
	) : (
		<span className="truncate text-xs font-medium text-slate-400">
			{placeholder}
		</span>
	);
}

// Mobile card: flags side by side with the scoreline when there is one, and —
// for a signed-in user — whether they've already submitted a pick (picks are
// made over in the Matches tab, so this only informs).
function MobileMatchCard({
	m,
	now,
	pick,
	picks,
	signedIn,
}: {
	m: KnockoutMatch;
	now: number;
	pick?: KnockoutPick;
	picks: KnockoutPick[];
	signedIn: boolean;
}) {
	const hasScore = m.scoreA != null && m.scoreB != null;
	const defined = Boolean(m.teamA && m.teamB);
	const {label, startingSoon} = knockoutCountdown(m.date, now);
	const live = knockoutStatus(m, now) === 'live';
	const finished = knockoutStatus(m, now) === 'finished';
	const hasPicks =
		picks.length > 0 && knockoutStatus(m, now) !== 'notstarted';
	const [showPicks, setShowPicks] = useState(false);

	return (
		<div
			className={`group relative w-full min-w-0 rounded-md border bg-white/5 px-2 py-1.5 ${
				hasPicks ? 'cursor-pointer' : ''
			} ${
				live
					? 'border-emerald-400/70 ring-1 ring-emerald-400/40'
					: startingSoon
						? 'border-pink-400/70 ring-1 ring-pink-400/40'
						: 'border-white/10'
			}`}
			onClick={() => hasPicks && setShowPicks((value) => !value)}
		>
			<div
				className={`flex items-center justify-center gap-2 ${
					finished ? 'opacity-50' : ''
				}`}
			>
				<MobileTeam placeholder={m.a} team={m.teamA ?? null} />

				<span className="shrink-0 font-display text-sm font-bold text-amber-300">
					{hasScore ? `${m.scoreA}–${m.scoreB}` : 'vs'}
				</span>

				<MobileTeam placeholder={m.b} team={m.teamB ?? null} />
			</div>

			{label && <Countdown label={label} startingSoon={startingSoon} />}

			{signedIn && defined && (
				<div
					className="mt-1.5 border-t border-white/5 pt-1 text-center text-[10px]"
					onClick={(event) => event.stopPropagation()}
				>
					{pick ? (
						<Link
							className="font-semibold text-sky-400 underline hover:text-sky-300"
							to={`/matches?match=${m.matchNumber}`}
						>
							✓ You predicted {pick.p1}–{pick.p2}
						</Link>
					) : (
						<Link
							className="text-slate-400 underline hover:text-slate-200"
							to={`/matches?match=${m.matchNumber}`}
						>
							Not predicted — pick now →
						</Link>
					)}
				</div>
			)}

			{hasPicks && <PicksPopover m={m} open={showPicks} picks={picks} />}
		</div>
	);
}

function Half({
	byMatch,
	byNum,
	mine,
	now,
	rounds,
	side,
	signedIn,
}: {
	byMatch: Record<number, KnockoutPick[]>;
	byNum: ByNum;
	mine: Record<number, KnockoutPick>;
	now: number;
	rounds: number[][];
	side: 'left' | 'right';
	signedIn: boolean;
}) {
	const left = side === 'left';

	return (
		<div
			className="grid flex-1 gap-x-6"
			style={{
				gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
				gridTemplateRows: 'repeat(8, minmax(4.5rem, 1fr))',
			}}
		>
			{rounds.flatMap((nums, round) =>
				nums.map((num, index) => {
					const span = SPAN[round];
					const rowStart = index * span + 1;
					const match = byNum[num];

					if (!match) {
						return null;
					}

					return (
						<div
							className="relative flex items-center"
							key={num}
							style={{
								gridColumn: left ? round + 1 : 4 - round,
								gridRow: `${rowStart} / span ${span}`,
							}}
						>
							<span
								className={`${LINE} border-t`}
								style={{
									top: '50%',
									width: '12px',
									...(left ? {left: '100%'} : {right: '100%'}),
								}}
							/>

							{round > 0 && (
								<>
									<span
										className={`${LINE} border-l`}
										style={{
											height: '50%',
											top: '25%',
											...(left
												? {left: '-12px'}
												: {right: '-12px'}),
										}}
									/>

									<span
										className={`${LINE} border-t`}
										style={{
											top: '50%',
											width: '12px',
											...(left
												? {left: '-12px'}
												: {right: '-12px'}),
										}}
									/>
								</>
							)}

							<MatchCard
								m={match}
								now={now}
								pick={mine[num]}
								picks={byMatch[num] ?? []}
								signedIn={signedIn}
							/>
						</div>
					);
				})
			)}
		</div>
	);
}

function Center({
	byMatch,
	byNum,
	mine,
	now,
	signedIn,
}: {
	byMatch: Record<number, KnockoutPick[]>;
	byNum: ByNum;
	mine: Record<number, KnockoutPick>;
	now: number;
	signedIn: boolean;
}) {
	const final = byNum[104];
	const third = byNum[103];

	return (
		<div className="relative flex w-28 shrink-0 flex-col items-center justify-center gap-1">
			<span
				className={`${LINE} border-t`}
				style={{left: '-12px', top: '50%', width: '12px'}}
			/>

			<span
				className={`${LINE} border-t`}
				style={{right: '-12px', top: '50%', width: '12px'}}
			/>

			<div aria-hidden className="text-3xl leading-none">
				🏆
			</div>

			<span className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300">
				Final
			</span>

			{final && (
				<MatchCard
					m={final}
					now={now}
					pick={mine[104]}
					picks={byMatch[104] ?? []}
					signedIn={signedIn}
				/>
			)}

			{third && (
				<div className="mt-2 flex w-full flex-col items-center gap-0.5">
					<span className="text-[10px] uppercase tracking-wide text-slate-500">
						3rd place
					</span>

					<MatchCard
						m={third}
						now={now}
						pick={mine[103]}
						picks={byMatch[103] ?? []}
						signedIn={signedIn}
					/>
				</div>
			)}
		</div>
	);
}

export function KnockoutBracket({user}: {user?: KnockoutIdentity | null}) {
	const {matches} = useKnockout();
	const {byMatch, mine} = useKnockoutPicks(user ?? null);

	// Tick every 30s so the kickoff countdowns and the ≤1h highlight stay live
	// without waiting for a data change to re-render.
	const [now, setNow] = useState(() => Date.now());

	useEffect(() => {
		const id = setInterval(() => setNow(Date.now()), 30000);

		return () => clearInterval(id);
	}, []);

	const byNum = useMemo<ByNum>(
		() =>
			Object.fromEntries(matches.map((match) => [match.matchNumber, match])),
		[matches]
	);

	return (
		<div>
			{/* Desktop: symmetric tree with the trophy in the centre. */}
			<div className="hidden sm:block">
				<div className="flex items-stretch gap-2">
					<Half
						byMatch={byMatch}
						byNum={byNum}
						now={now}
						mine={mine}
						signedIn={Boolean(user)}
						rounds={LEFT}
						side="left"
					/>

					<Center
						byMatch={byMatch}
						byNum={byNum}
						mine={mine}
						now={now}
						signedIn={Boolean(user)}
					/>

					<Half
						byMatch={byMatch}
						byNum={byNum}
						now={now}
						mine={mine}
						signedIn={Boolean(user)}
						rounds={RIGHT}
						side="right"
					/>
				</div>
			</div>

			{/* Mobile: rounds stacked vertically, full width. */}
			<div className="space-y-5 sm:hidden">
				{MOBILE_ROUNDS.map((round) => {
					const roundMatches = matches.filter(
						(match) => match.stage === round.key
					);

					if (roundMatches.length === 0) {
						return null;
					}

					const single = roundMatches.length <= 2;

					return (
						<section key={round.key}>
							<h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-sky-400">
								{round.key === 'Final' && <span aria-hidden>🏆</span>}

								{round.label}
							</h3>

							<div
								className={`grid gap-2 ${
									single ? 'grid-cols-1' : 'grid-cols-2'
								}`}
							>
								{roundMatches.map((match) => (
									<MobileMatchCard
										key={match.matchNumber}
										m={match}
										now={now}
										pick={mine[match.matchNumber]}
										picks={byMatch[match.matchNumber] ?? []}
										signedIn={Boolean(user)}
									/>
								))}
							</div>
						</section>
					);
				})}
			</div>
		</div>
	);
}
