import {onValue, ref} from 'firebase/database';
import {useEffect, useState} from 'react';

import {dataPath} from './dataRoot';
import {db} from './firebase';
import type {Game, GamesFile} from './types';

// Live scores, straight from the Realtime Database. A local cron poller
// (scripts/push-scores.mjs) writes the `games` node whenever the score sources
// change, so the browser gets an instant push instead of polling games.json.
export function useGames(): {failed: boolean; gamesFile: GamesFile | null} {
	const [gamesFile, setGamesFile] = useState<GamesFile | null>(null);
	const [failed, setFailed] = useState(false);

	useEffect(
		() =>
			onValue(
				ref(db, dataPath('games')),
				(snapshot) => {
					const value = snapshot.val() as GamesFile | null;

					if (!value || !value.games) {
						setFailed(true);

						return;
					}

					// RTDB hands back a dense array as an array, but a sparse
					// one comes back as an object keyed by index — coerce both
					// to a plain array.
					const games = (
						Array.isArray(value.games)
							? value.games
							: Object.values(value.games)
					) as Game[];

					setFailed(false);
					setGamesFile({fetchedAt: value.fetchedAt, games});
				},
				() => setFailed(true)
			),
		[]
	);

	return {failed, gamesFile};
}
