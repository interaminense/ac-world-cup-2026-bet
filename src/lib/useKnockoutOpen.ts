import {onValue, ref, remove, set} from 'firebase/database';
import {useEffect, useState} from 'react';

import {dataPath} from './dataRoot';
import {db} from './firebase';

// knockoutOpen/<matchNo> = true once the admin opens that match for picks.
// Absent = closed (the default). Public read so everyone sees the locked state;
// only the owner writes (enforced by the RTDB rules).
export function useKnockoutOpen(): {
	open: Record<number, boolean>;
	setOpen: (matchNo: number, isOpen: boolean) => void;
} {
	const [open, setOpenState] = useState<Record<number, boolean>>({});

	useEffect(
		() =>
			onValue(ref(db, dataPath('knockoutOpen')), (snapshot) => {
				setOpenState((snapshot.val() as Record<number, boolean>) ?? {});
			}),
		[]
	);

	const setOpen = (matchNo: number, isOpen: boolean) => {
		const node = ref(db, `${dataPath('knockoutOpen')}/${matchNo}`);

		if (isOpen) {
			set(node, true);
		}
		else {
			remove(node);
		}
	};

	return {open, setOpen};
}
