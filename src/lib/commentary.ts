import type {Localized} from './locale';

export interface CommentaryFile {
	byMatch: Record<number, Localized>;
	generatedAt: string;
	leaderboard?: {
		recap: Localized;
		titles: Record<string, Localized>;
	};
}

const DEFAULT_URL = `${import.meta.env.BASE_URL}commentary.json`;

export async function fetchCommentary(
	url: string = DEFAULT_URL
): Promise<CommentaryFile | null> {
	try {
		const response = await fetch(`${url}?t=${Date.now()}`);

		if (!response.ok) {
			return null;
		}

		return (await response.json()) as CommentaryFile;
	}
	catch {
		return null;
	}
}
