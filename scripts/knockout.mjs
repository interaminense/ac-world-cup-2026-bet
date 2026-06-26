import {ServerValue} from 'firebase-admin/database';

const FEED_URL =
	'https://api.fifa.com/api/v3/calendar/matches?idCompetition=17&idSeason=285023&language=en&count=500';

const STAGES = [
	'Round of 32',
	'Round of 16',
	'Quarter-final',
	'Semi-final',
	'Play-off for third place',
	'Final',
];

const desc = (entries) => entries?.[0]?.Description ?? '';

// FIFA calendar Results → the compact knockout shape the bracket renders.
export function normalizeKnockout(results) {
	return (results || [])
		.filter((match) => STAGES.includes(desc(match.StageName)))
		.map((match) => ({
			a: match.PlaceHolderA ?? '',
			b: match.PlaceHolderB ?? '',
			date: match.Date ?? null,
			// MatchStatus 0 = played/full-time (includes extra time). Penalties
			// live in HomeTeamPenaltyScore/AwayTeamPenaltyScore, so the score
			// below stays the drawn full-time result for a shootout match.
			finished: match.MatchStatus === 0,
			matchNumber: match.MatchNumber ?? 0,
			scoreA: match.HomeTeamScore ?? null,
			scoreB: match.AwayTeamScore ?? null,
			stage: desc(match.StageName),
			teamA: desc(match.Home?.TeamName) || null,
			teamB: desc(match.Away?.TeamName) || null,
		}))
		.sort((x, y) => x.matchNumber - y.matchNumber);
}

export async function fetchKnockout() {
	const response = await fetch(FEED_URL, {
		headers: {'User-Agent': 'Mozilla/5.0 (ac-world-cup-2026-bet pool app)'},
	});

	if (!response.ok) {
		throw new Error(`FIFA API: HTTP ${response.status}`);
	}

	const payload = await response.json();

	if (!Array.isArray(payload.Results)) {
		throw new Error('FIFA API: missing Results array');
	}

	return normalizeKnockout(payload.Results);
}

// Stable string that ignores null/undefined and key-order differences, so the
// RTDB round-trip (which drops nulls and re-sorts keys) compares cleanly.
function canonical(matches) {
	return JSON.stringify(
		(matches ?? []).map((match) =>
			Object.keys(match)
				.filter((key) => match[key] != null)
				.sort()
				.map((key) => [key, match[key]])
		)
	);
}

// Fetch the knockout bracket and push it to RTDB `knockout`, only when changed.
export async function pushKnockout(db) {
	const matches = await fetchKnockout();

	if (matches.length === 0) {
		return 0;
	}

	const snapshot = await db.ref('knockout').once('value');
	const previous = snapshot.val();

	if (previous && canonical(previous.matches) === canonical(matches)) {
		return 0;
	}

	await db.ref('knockout').set({fetchedAt: ServerValue.TIMESTAMP, matches});

	return matches.length;
}
