import {onAuthStateChanged} from 'firebase/auth';
import {
	onDisconnect,
	onValue,
	ref,
	remove,
	serverTimestamp,
	set,
} from 'firebase/database';
import {useEffect, useState} from 'react';

import {dataPath} from './dataRoot';
import {auth, db, signedIn} from './firebase';

export interface OnlineUser {
	name: string | null;
	uid: string;
}

// Realtime presence: each anonymous session writes itself to `presence/<uid>`
// and registers an onDisconnect cleanup, so the list self-heals when tabs
// close or connections drop. `name` (a participant or null for a guest) rides
// along so the header can show faces.
export function usePresence(name: string | null): OnlineUser[] {
	const [uid, setUid] = useState<string | null>(null);
	const [online, setOnline] = useState<OnlineUser[]>([]);

	useEffect(() => {
		signedIn.catch(() => undefined);

		return onAuthStateChanged(auth, (user) => setUid(user?.uid ?? null));
	}, []);

	useEffect(
		() =>
			onValue(ref(db, dataPath('presence')), (snapshot) => {
				const value =
					(snapshot.val() as Record<
						string,
						{name?: string | null}
					>) ?? {};

				setOnline(
					Object.entries(value).map(([id, entry]) => ({
						name: entry?.name ?? null,
						uid: id,
					}))
				);
			}),
		[]
	);

	// Register the disconnect cleanup once per session and remove on unmount.
	useEffect(() => {
		if (!uid) {
			return;
		}

		const node = ref(db, `${dataPath('presence')}/${uid}`);

		onDisconnect(node).remove();

		return () => {
			remove(node);
		};
	}, [uid]);

	// Keep my entry (and name) fresh; overwrites without dropping presence.
	useEffect(() => {
		if (!uid) {
			return;
		}

		set(ref(db, `${dataPath('presence')}/${uid}`), {
			at: serverTimestamp(),
			name: name ?? null,
		});
	}, [uid, name]);

	return online;
}
