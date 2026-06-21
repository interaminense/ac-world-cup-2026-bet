// src/lib/useAuth.ts
import {onAuthStateChanged, type User} from 'firebase/auth';
import {onValue, ref, serverTimestamp, set, update} from 'firebase/database';
import {useEffect, useState} from 'react';

import {isOwner as checkOwner} from './auth';
import {auth, db, ensureAnonymous, signInWithGoogle, signOutUser} from './firebase';
import {buildProfileUpdate, type Profile} from './profiles';

export interface AuthState {
	isAnonymous: boolean;
	isOwner: boolean;
	profile: Profile | null;
	setClaim: (slug: string | null) => void;
	signIn: () => void;
	signOut: () => void;
	user: User | null;
}

export function useAuth(): AuthState {
	const [user, setUser] = useState<User | null>(null);
	const [profile, setProfile] = useState<Profile | null>(null);

	useEffect(
		() =>
			onAuthStateChanged(auth, (next) => {
				setUser(next);

				// Signed all the way out → fall back to anonymous so the open
				// features keep working.
				if (!next) {
					ensureAnonymous().catch(() => undefined);
				}
			}),
		[]
	);

	// For a real (non-anonymous) user: write the profile and subscribe to it.
	useEffect(() => {
		if (!user || user.isAnonymous) {
			setProfile(null);

			return undefined;
		}

		update(
			ref(db, `profiles/${user.uid}`),
			buildProfileUpdate(user, Date.now())
		).catch(() => undefined);

		// lastSeenAt as a server timestamp (overwrites the optimistic Date.now()).
		update(ref(db, `profiles/${user.uid}`), {
			lastSeenAt: serverTimestamp(),
		}).catch(() => undefined);

		return onValue(ref(db, `profiles/${user.uid}`), (snapshot) => {
			setProfile((snapshot.val() as Profile) ?? null);
		});
	}, [user]);

	const setClaim = (slug: string | null) => {
		if (!user || user.isAnonymous) {
			return;
		}

		set(ref(db, `profiles/${user.uid}/claim`), slug);
	};

	return {
		isAnonymous: user?.isAnonymous ?? true,
		isOwner: checkOwner(user?.email, user?.emailVerified),
		profile,
		setClaim,
		signIn: () => {
			signInWithGoogle().catch(() => undefined);
		},
		signOut: () => {
			signOutUser().catch(() => undefined);
		},
		user,
	};
}
