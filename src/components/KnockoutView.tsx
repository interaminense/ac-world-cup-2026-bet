import type {KnockoutStandingRow} from '../lib/knockoutStandings';
import type {ParticipantStats} from '../lib/participantStats';
import type {KnockoutIdentity} from '../lib/useKnockoutPicks';
import {KnockoutBracket} from './KnockoutBracket';
import {KnockoutLeaderboard} from './KnockoutLeaderboard';

// The Knockout Stage page: the bracket and the zeroed knockout ranking stacked
// as two sections on the same screen.
export function KnockoutView({
	knockoutUser,
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
	knockoutUser: KnockoutIdentity | null;
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
	return (
		<div className="space-y-8">
			<section>
				<h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
					Bracket
				</h2>

				<KnockoutBracket user={knockoutUser} />
			</section>

			<section>
				<h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
					Leaderboard
				</h2>

				<KnockoutLeaderboard
					leader={leader}
					live={live}
					myReactions={myReactions}
					onClearReaction={onClearReaction}
					onHype={onHype}
					onReact={onReact}
					onSelect={onSelect}
					reactions={reactions}
					rows={rows}
					titleOdds={titleOdds}
					youName={youName}
				/>
			</section>
		</div>
	);
}
