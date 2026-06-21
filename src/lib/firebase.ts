import {initializeApp} from 'firebase/app';
import {
	getAuth,
	GoogleAuthProvider,
	signInAnonymously,
	signInWithPopup,
	signInWithRedirect,
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

// Each browser keeps a stable anonymous uid so logged-out reactions/cheers/
// presence keep working.
export function ensureAnonymous() {
	return signInAnonymously(auth);
}

// Popup on desktop; redirect on mobile/PWA where popups are unreliable.
export function signInWithGoogle() {
	const isMobile = /Mobi|Android/i.test(navigator.userAgent);

	return isMobile
		? signInWithRedirect(auth, googleProvider)
		: signInWithPopup(auth, googleProvider);
}

export function signOutUser() {
	return signOut(auth);
}

// Sign in anonymously on first load (no-op once a session exists).
export const signedIn = signInAnonymously(auth);
