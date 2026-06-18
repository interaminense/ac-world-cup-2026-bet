import {useParams} from 'react-router-dom';

import type {Game, Participant} from '../lib/types';
import {ParticipantView} from './ParticipantView';

// The /bets/:id route: resolves the participant from the URL (id = lowercased
// name; unknown falls back to the first). Switching participants is done from
// the menu's Bets dropdown.
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
		<ParticipantView
			games={games}
			participant={active}
			participants={participants}
		/>
	);
}
