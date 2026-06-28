import type {KnockoutStandingRow} from '../lib/knockoutStandings';
import type {ParticipantStats} from '../lib/participantStats';
import type {LeaderboardRow} from '../lib/ranking';
import {Leaderboard} from './Leaderboard';

// The knockout ranking, rendered with the same table + leader card as the main
// group-stage leaderboard. Picks score on the in-app knockout predictions: live
// matches show provisional (pulsing) points, and the "% to win" column appears
// only once no match is live.
export function KnockoutLeaderboard({
	leader,
	live,
	myReactions,
	onClearReaction,
	onHype,
	onReact,
	onSelect,
	reactions,
	rows,
	titleOdds,
	youName,
}: {
	leader: {name: string; stats: ParticipantStats} | null;
	live?: boolean;
	myReactions?: Record<string, string[]>;
	onClearReaction?: (name: string, emoji: string) => void;
	onHype: (rx: number, ry: number) => void;
	onReact?: (name: string, emoji: string) => void;
	onSelect: (name: string) => void;
	reactions?: Record<string, Record<string, number>>;
	rows: KnockoutStandingRow[];
	titleOdds?: Record<string, number>;
	youName: string | null;
}) {
	if (rows.length === 0) {
		return (
			<p className="rounded-2xl border border-white/10 bg-white/5 px-6 py-12 text-center text-sm text-slate-400">
				Nobody in the knockout yet — join from your profile and points
				appear once games start to be decided.
			</p>
		);
	}

	const leaderboardRows: LeaderboardRow[] = rows.map((row) => ({
		exactCount: row.exact,
		livePoints: row.livePoints,
		name: row.name,
		photoURL: row.photoURL,
		rank: row.rank,
		total: row.points,
	}));

	return (
		<Leaderboard
			leader={leader ?? undefined}
			live={live}
			myReactions={myReactions}
			onClearReaction={onClearReaction}
			onHype={onHype}
			onReact={onReact}
			onSelect={onSelect}
			reactions={reactions}
			rows={leaderboardRows}
			titleOdds={titleOdds}
			youName={youName}
		/>
	);
}
