import {readFileSync} from 'node:fs';

import {cert, initializeApp} from 'firebase-admin/app';
import {getDatabase} from 'firebase-admin/database';

// Clone the live RTDB nodes into the isolated `demo/` subtree. Open the app
// with ?demo to read from there, then run demo-score.mjs to rehearse a live
// score push without touching what real users see. Writes go through the
// service account, which bypasses the security rules.
const DATABASE_URL =
	'https://ac-world-cup-2026-bet-default-rtdb.firebaseio.com';

const credentialsPath =
	process.env.GOOGLE_APPLICATION_CREDENTIALS ||
	`${process.env.HOME}/.config/wc2026/serviceAccount.json`;

initializeApp({
	credential: cert(JSON.parse(readFileSync(credentialsPath, 'utf8'))),
	databaseURL: DATABASE_URL,
});

const db = getDatabase();

const NODES = ['games', 'reactions', 'matches/reactions'];

for (const node of NODES) {
	const snapshot = await db.ref(node).once('value');
	const value = snapshot.val();

	await db.ref(`demo/${node}`).set(value ?? null);

	console.log(`Seeded demo/${node} (${value ? 'copied' : 'empty'})`);
}

process.exit(0);
