import {NavLink, useParams} from 'react-router-dom';

import type {Game, Participant} from '../lib/types';
import {ParticipantView} from './ParticipantView';

// The /bets/:id route: a participant picker plus that participant's view. The
// id is the lowercased name (e.g. /bets/adriano); unknown ids fall back to the
// first participant.
export function BetsView({
	games,
	participants,
}: {
	games: Game[];
	participants: Participant[];
}) {
	const {id} = useParams();

	const active =
		participants.find(
			(participant) => participant.name.toLowerCase() === id
		) ?? participants[0];

	return (
		<>
			<nav className="-mt-4 mb-6 flex gap-1 overflow-x-auto border-l-2 border-emerald-500/30 pb-1 pl-3">
				{participants.map((participant) => (
					<NavLink
						className={({isActive}) =>
							`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-colors ${
								isActive
									? 'bg-amber-400 font-semibold text-amber-950'
									: 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200'
							}`
						}
						key={participant.name}
						to={`/bets/${participant.name.toLowerCase()}`}
					>
						{participant.name}
					</NavLink>
				))}
			</nav>

			<ParticipantView
				games={games}
				participant={active}
				participants={participants}
			/>
		</>
	);
}
