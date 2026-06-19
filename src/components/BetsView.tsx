import {useParams} from 'react-router-dom';

import type {Game, Participant} from '../lib/types';
import {ParticipantView} from './ParticipantView';

// The /bets/:id route: resolves the participant from the URL (id = lowercased
// name; unknown falls back to the first). Switching participants is done from
// the menu's Participants dropdown.
export function BetsView({
	games,
	myReactions,
	onReact,
	participants,
	reactions,
}: {
	games: Game[];
	myReactions: Record<string, string[]>;
	onReact: (name: string, emoji: string) => void;
	participants: Participant[];
	reactions: Record<string, Record<string, number>>;
}) {
	const {id} = useParams();

	const active =
		participants.find(
			(participant) => participant.name.toLowerCase() === id
		) ?? participants[0];

	return (
		<ParticipantView
			games={games}
			myReactions={myReactions[active.name] ?? []}
			onReact={(emoji) => onReact(active.name, emoji)}
			participant={active}
			participants={participants}
			reactions={reactions[active.name] ?? {}}
		/>
	);
}
