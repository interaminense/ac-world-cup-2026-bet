import {onAuthStateChanged} from 'firebase/auth';
import {onValue, ref, remove, set} from 'firebase/database';
import {useEffect, useState} from 'react';

import {dataPath} from './dataRoot';
import {auth, db, signedIn} from './firebase';

// <root>/<key>/<emoji>/<uid> = true  — key is a player name or a match id.
type ReactionTree = Record<string, Record<string, Record<string, boolean>>>;

export interface ReactionsApi {
	counts: Record<string, Record<string, number>>;
	mine: Record<string, string[]>;
	toggle: (key: string, emoji: string) => void;
}

// Realtime reactions backed by Firebase under `rootPath`. Each anonymous
// session can toggle one reaction per emoji per key; counts aggregate live.
function useReactionTree(rootPath: string): ReactionsApi {
	const [uid, setUid] = useState<string | null>(null);
	const [tree, setTree] = useState<ReactionTree>({});

	useEffect(() => {
		signedIn.catch(() => undefined);

		return onAuthStateChanged(auth, (user) => setUid(user?.uid ?? null));
	}, []);

	useEffect(
		() =>
			onValue(ref(db, rootPath), (snapshot) => {
				setTree((snapshot.val() as ReactionTree) ?? {});
			}),
		[rootPath]
	);

	const counts: Record<string, Record<string, number>> = {};
	const mine: Record<string, string[]> = {};

	for (const [key, emojis] of Object.entries(tree)) {
		for (const [emoji, uids] of Object.entries(emojis ?? {})) {
			const ids = Object.keys(uids ?? {});

			if (ids.length === 0) {
				continue;
			}

			(counts[key] ??= {})[emoji] = ids.length;

			if (uid && uids[uid]) {
				(mine[key] ??= []).push(emoji);
			}
		}
	}

	const toggle = (key: string, emoji: string) => {
		if (!uid) {
			return;
		}

		const node = ref(db, `${rootPath}/${key}/${emoji}/${uid}`);

		if (mine[key]?.includes(emoji)) {
			remove(node);
		}
		else {
			set(node, true);
		}
	};

	return {counts, mine, toggle};
}

// Reactions on each leaderboard player.
export function useReactions(): ReactionsApi {
	return useReactionTree(dataPath('reactions'));
}

// Reactions on each match (keyed by match number).
export function useMatchReactions(): ReactionsApi {
	return useReactionTree(dataPath('matches/reactions'));
}
