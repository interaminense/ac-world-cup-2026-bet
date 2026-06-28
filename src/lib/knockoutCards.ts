import type {MatchCard, MatchEntry} from './matches';
import {scorePrediction} from './scoring';
import type {MatchStatus} from './types';
import type {KnockoutMatch} from './useKnockout';

export interface KnockoutPick {
	at?: number;
	name: string;
	p1: number;
	p2: number;
	photoURL?: string | null;
	uid?: string;
}

const MONTHS_ABBR = [
	'Jan',
	'Feb',
	'Mar',
	'Apr',
	'May',
	'Jun',
	'Jul',
	'Aug',
	'Sep',
	'Oct',
	'Nov',
	'Dec',
];

// The knockout `date` is ISO; the rest of the app keeps kickoffs in Brasília
// time (no DST). Convert to the "Jun/29" + "17:30" shape that kickoffDate and
// the day-grouping helpers expect, so knockout cards sort and group like the
// group-stage cards.
export function knockoutKickoff(
	iso: string | null
): {date: string; time: string} | null {
	if (!iso) {
		return null;
	}

	const ms = Date.parse(iso);

	if (!Number.isFinite(ms)) {
		return null;
	}

	const brasilia = new Date(ms - 3 * 60 * 60 * 1000);

	return {
		date: `${MONTHS_ABBR[brasilia.getUTCMonth()]}/${brasilia.getUTCDate()}`,
		time: `${String(brasilia.getUTCHours()).padStart(2, '0')}:${String(
			brasilia.getUTCMinutes()
		).padStart(2, '0')}`,
	};
}

export function knockoutStatus(
	match: KnockoutMatch,
	nowMs: number
): MatchStatus {
	// Only the FIFA full-time flag (MatchStatus 0, mapped to `finished`) closes a
	// match. A score alone is not enough: FIFA fills HomeTeamScore/AwayTeamScore
	// live, so a present score can still be an in-progress (or extra-time) result.
	if (match.finished) {
		return 'finished';
	}

	const kickoff = match.date ? Date.parse(match.date) : NaN;

	if (Number.isFinite(kickoff) && nowMs >= kickoff) {
		return 'live';
	}

	return 'notstarted';
}

export function isKnockoutPickable(
	match: KnockoutMatch,
	nowMs: number
): boolean {
	if (!match.teamA || !match.teamB || !match.date) {
		return false;
	}

	const kickoff = Date.parse(match.date);

	return Number.isFinite(kickoff) && nowMs < kickoff;
}

// A pick can be created or changed only while the match accepts picks: both
// teams known, before kickoff, and opened by the admin. Gates the entry UI and
// rejects late/closed writes — a click after kickoff is ignored.
export function canEditKnockoutPick(
	match: KnockoutMatch,
	open: boolean,
	nowMs: number
): boolean {
	return open && isKnockoutPickable(match, nowMs);
}

// Turn the knockout matches (plus everyone's in-app picks) into match cards that
// drop straight into the Upcoming/Finished lists and the predictions table.
export function buildKnockoutCards(
	matches: KnockoutMatch[],
	picksByMatch: Record<number, KnockoutPick[]>,
	nowMs: number
): MatchCard[] {
	return [...matches]
		.sort((a, b) => a.matchNumber - b.matchNumber)
		.map((match) => {
			const hasScore = match.scoreA != null && match.scoreB != null;

			// Show the score as soon as FIFA has one (live or final), but only
			// award points once the match is finished — a knockout that goes to
			// extra time/penalties is scored on its full-time (drawn) result.
			const scored = match.finished && hasScore;
			const kickoff = knockoutKickoff(match.date);

			const entries: MatchEntry[] = (
				picksByMatch[match.matchNumber] ?? []
			).map((pick) => ({
				name: pick.name,
				p1: pick.p1,
				p2: pick.p2,
				points: scored
					? scorePrediction(
							pick.p1,
							pick.p2,
							match.scoreA as number,
							match.scoreB as number
						)
					: null,
			}));

			return {
				date: kickoff?.date ?? '',
				entries,
				group: match.stage,
				knockout: true,
				matchNo: match.matchNumber,
				status: knockoutStatus(match, nowMs),
				team1: match.teamA ?? match.a,
				team2: match.teamB ?? match.b,
				time: kickoff?.time ?? '',
				timeElapsed: match.timeElapsed ?? undefined,
				...(hasScore
					? {r1: match.scoreA as number, r2: match.scoreB as number}
					: {}),
			};
		});
}

export interface KnockoutCountdown {
	label: string | null;
	startingSoon: boolean;
}

// Live countdown for an upcoming knockout match. Within 24h it returns a short
// "Hh Mm" / "Mm" label (zero parts dropped); within 1h it also flags
// startingSoon. Otherwise — no date, already started, or >24h away — nothing.
export function knockoutCountdown(
	iso: string | null,
	nowMs: number
): KnockoutCountdown {
	const none = {label: null, startingSoon: false};

	if (!iso) {
		return none;
	}

	const kickoff = Date.parse(iso);
	const diff = kickoff - nowMs;

	if (!Number.isFinite(kickoff) || diff <= 0 || diff > 24 * 60 * 60 * 1000) {
		return none;
	}

	const totalMinutes = Math.floor(diff / 60000);
	const hours = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;
	const label =
		hours > 0
			? minutes > 0
				? `${hours}h ${minutes}m`
				: `${hours}h`
			: `${minutes}m`;

	return {label, startingSoon: diff <= 60 * 60 * 1000};
}
