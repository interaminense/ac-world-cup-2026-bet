// src/lib/useAuth.ts
import {onAuthStateChanged, type User} from 'firebase/auth';
import {onValue, ref, serverTimestamp, set, update} from 'firebase/database';
import {useEffect, useState} from 'react';

import {isOwner as checkOwner} from './auth';
import {dataPath} from './dataRoot';
import {emitSignal} from './emitSignal';
import {auth, db, signInWithGoogle, signOutUser} from './firebase';
import {buildProfileUpdate, type Profile} from './profiles';

export interface AuthState {
	isAnonymous: boolean;
	isOwner: boolean;
	loading: boolean;
	profile: Profile | null;
	requestKnockout: () => void;
	setClaim: (slug: string | null) => void;
	setNickname: (nickname: string) => void;
	signIn: () => void;
	signOut: () => void;
	user: User | null;
}

export function useAuth(): AuthState {
	const [user, setUser] = useState<User | null>(null);
	const [profile, setProfile] = useState<Profile | null>(null);

	// True until Firebase restores the persisted session, so route guards don't
	// redirect before the owner's session is known. The anonymous fallback lives
	// in firebase.ts, so it never clobbers a real Google login.
	const [loading, setLoading] = useState(true);

	useEffect(
		() =>
			onAuthStateChanged(auth, (next) => {
				setUser(next);
				setLoading(false);
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
			ref(db, `${dataPath('profiles')}/${user.uid}`),
			buildProfileUpdate(user, Date.now())
		).catch(() => undefined);

		// lastSeenAt as a server timestamp (overwrites the optimistic Date.now()).
		update(ref(db, `${dataPath('profiles')}/${user.uid}`), {
			lastSeenAt: serverTimestamp(),
		}).catch(() => undefined);

		return onValue(
			ref(db, `${dataPath('profiles')}/${user.uid}`),
			(snapshot) => {
				setProfile((snapshot.val() as Profile) ?? null);
			}
		);
	}, [user]);

	// Who is asking — for the entry-request webhook below.
	const requesterName = () =>
		profile?.nickname || profile?.name || user?.displayName || user?.email;

	const setClaim = (slug: string | null) => {
		if (!user || user.isAnonymous) {
			return;
		}

		set(ref(db, `${dataPath('profiles')}/${user.uid}/claim`), slug);

		// A non-null claim is a request to enter the game as that participant.
		if (slug) {
			emitSignal('participant_claim', {
				claim: slug,
				email: user.email,
				name: requesterName(),
				uid: user.uid,
			});
		}
	};

	const requestKnockout = () => {
		if (!user || user.isAnonymous) {
			return;
		}

		set(ref(db, `${dataPath('profiles')}/${user.uid}/wantsKnockout`), true);

		emitSignal('knockout_entry_request', {
			email: user.email,
			name: requesterName(),
			uid: user.uid,
		});
	};

	const setNickname = (nickname: string) => {
		if (!user || user.isAnonymous) {
			return;
		}

		set(
			ref(db, `${dataPath('profiles')}/${user.uid}/nickname`),
			nickname.trim() || null
		);
	};

	return {
		isAnonymous: user?.isAnonymous ?? true,
		isOwner: checkOwner(user?.email, user?.emailVerified),
		loading,
		profile,
		requestKnockout,
		setClaim,
		setNickname,
		signIn: () => {
			signInWithGoogle().catch(() => undefined);
		},
		signOut: () => {
			signOutUser().catch(() => undefined);
		},
		user,
	};
}
