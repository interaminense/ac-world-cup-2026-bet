import {increment, onValue, ref, update} from 'firebase/database';
import {useEffect, useState} from 'react';

import {dataPath} from './dataRoot';
import {db} from './firebase';

// A shared trophy burst on the leader card. Clicking writes the click's
// position (as fractions of the card, so it maps across screen sizes) plus a
// bumping counter; every online client detects the bump and explodes trophies
// at that spot on its own card — like the live-bar cheers, but anywhere.
export interface LeaderHype {
	n: number;
	rx: number;
	ry: number;
}

export function useLeaderHype(): {
	hype: (rx: number, ry: number) => void;
	last: LeaderHype;
	loaded: boolean;
} {
	const [last, setLast] = useState<LeaderHype>({n: 0, rx: 0.5, ry: 0.5});
	const [loaded, setLoaded] = useState(false);

	useEffect(
		() =>
			onValue(ref(db, dataPath('leaderHype')), (snapshot) => {
				const value = snapshot.val() as LeaderHype | null;

				if (value) {
					setLast({
						n: value.n ?? 0,
						rx: value.rx ?? 0.5,
						ry: value.ry ?? 0.5,
					});
				}

				setLoaded(true);
			}),
		[]
	);

	const hype = (rx: number, ry: number) => {
		update(ref(db, dataPath('leaderHype')), {n: increment(1), rx, ry});
	};

	return {hype, last, loaded};
}
