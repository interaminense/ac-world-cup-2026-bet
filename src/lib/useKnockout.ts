import {onValue, ref} from 'firebase/database';
import {useEffect, useState} from 'react';

import staticKnockout from '../data/knockout.json';
import {dataPath} from './dataRoot';
import {db} from './firebase';

export interface KnockoutMatch {
	a: string;
	b: string;
	date: string | null;
	matchNumber: number;
	scoreA: number | null;
	scoreB: number | null;
	stage: string;
	teamA: string | null;
	teamB: string | null;
}

// The bundled snapshot is the baseline; the live poller keeps `knockout` in the
// Realtime Database fresh as the bracket fills in.
const FALLBACK = staticKnockout as KnockoutMatch[];

export function useKnockout(): KnockoutMatch[] {
	const [matches, setMatches] = useState<KnockoutMatch[]>(FALLBACK);

	useEffect(
		() =>
			onValue(ref(db, dataPath('knockout')), (snapshot) => {
				const value = snapshot.val() as {
					matches?: KnockoutMatch[];
				} | null;

				if (value?.matches?.length) {
					setMatches(value.matches);
				}
			}),
		[]
	);

	return matches;
}
