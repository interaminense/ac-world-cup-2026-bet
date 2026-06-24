import {initializeApp} from 'firebase/app';
import {
	getAuth,
	GoogleAuthProvider,
	onAuthStateChanged,
	signInAnonymously,
	signInWithPopup,
	signOut,
} from 'firebase/auth';
import {getDatabase} from 'firebase/database';

// Public web config — security comes from the Realtime Database rules and the
// authorized domains, not from hiding these values.
const firebaseConfig = {
	apiKey: 'AIzaSyAtJldVIYjQKRBUaepI1wQE0-u2nq4InxU',
	appId: '1:797211677840:web:61a5322b748fb4978fb415',
	authDomain: 'ac-world-cup-2026-bet.firebaseapp.com',
	databaseURL: 'https://ac-world-cup-2026-bet-default-rtdb.firebaseio.com',
	messagingSenderId: '797211677840',
	projectId: 'ac-world-cup-2026-bet',
	storageBucket: 'ac-world-cup-2026-bet.firebasestorage.app',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getDatabase(app);

export const googleProvider = new GoogleAuthProvider();

// Popup everywhere. The redirect flow loses its session on the deployed domain
// (the cross-origin authDomain's storage gets partitioned by Safari/Chrome on
// mobile), so the user came back signed out. The popup keeps the session.
export function signInWithGoogle() {
	return signInWithPopup(auth, googleProvider);
}

export function signOutUser() {
	return signOut(auth);
}

// Keep a session alive at all times WITHOUT clobbering a real sign-in: sign in
// anonymously only when nobody is signed in (first visit, or after a Google
// sign-out). A persisted Google session is left untouched on reload — calling
// signInAnonymously unconditionally would replace it and silently log the user
// out.
let ensuringAnonymous = false;

onAuthStateChanged(auth, (user) => {
	if (user || ensuringAnonymous) {
		return;
	}

	ensuringAnonymous = true;

	signInAnonymously(auth)
		.catch(() => undefined)
		.finally(() => {
			ensuringAnonymous = false;
		});
});

// Back-compat for hooks that import this; auth is established by the listener
// above, so there's nothing to await.
export const signedIn = Promise.resolve();
