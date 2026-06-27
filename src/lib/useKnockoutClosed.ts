import {onValue, ref, remove, set} from 'firebase/database';
import {useEffect, useState} from 'react';

import {dataPath} from './dataRoot';
import {db} from './firebase';

// knockoutClosed/<matchNo> = true once the admin closes that match for picks.
// Absent = open (the default): a defined match accepts picks until kickoff, and
// the admin can close it early (or reopen). Public read; only the owner writes.
export function useKnockoutClosed(): {
	closed: Record<number, boolean>;
	setClosed: (matchNo: number, isClosed: boolean) => void;
} {
	const [closed, setClosedState] = useState<Record<number, boolean>>({});

	useEffect(
		() =>
			onValue(ref(db, dataPath('knockoutClosed')), (snapshot) => {
				setClosedState(
					(snapshot.val() as Record<number, boolean>) ?? {}
				);
			}),
		[]
	);

	const setClosed = (matchNo: number, isClosed: boolean) => {
		const node = ref(db, `${dataPath('knockoutClosed')}/${matchNo}`);

		if (isClosed) {
			set(node, true);
		}
		else {
			remove(node);
		}
	};

	return {closed, setClosed};
}
