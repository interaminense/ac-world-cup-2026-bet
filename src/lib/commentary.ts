import type {Localized} from './locale';

// Shape of the `commentary` Realtime Database node, written by the local poller
// (scripts/push-scores.mjs) and read live via useCommentary.
export interface CommentaryFile {
	byMatch: Record<number, Localized>;
	generatedAt: string;
	leaderboard?: {
		recap: Localized;
		titles: Record<string, Localized>;
	};
}
