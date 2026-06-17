import {onValue, ref} from 'firebase/database';
import {useEffect, useState} from 'react';

import type {CommentaryFile} from './commentary';
import {dataPath} from './dataRoot';
import {db} from './firebase';

// AI commentary, live from the Realtime Database. The local poller
// (scripts/push-scores.mjs) writes the `commentary` node whenever a match
// finishes or the ranking moves, so blurbs and titles push in like the scores.
export function useCommentary(): {
	commentaryFile: CommentaryFile | null;
	ready: boolean;
} {
	const [commentaryFile, setCommentaryFile] = useState<CommentaryFile | null>(
		null
	);
	const [ready, setReady] = useState(false);

	useEffect(
		() =>
			onValue(
				ref(db, dataPath('commentary')),
				(snapshot) => {
					setCommentaryFile(
						(snapshot.val() as CommentaryFile | null) ?? null
					);
					setReady(true);
				},
				() => setReady(true)
			),
		[]
	);

	return {commentaryFile, ready};
}
