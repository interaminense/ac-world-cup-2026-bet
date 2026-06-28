import type {KnockoutRosterRow} from './knockoutStandings';
import {buildMatchCards} from './matches';
import {scorePrediction} from './scoring';
import type {Game, Participant} from './types';
import type {KnockoutMatch} from './useKnockout';

export interface TitleOddsOptions {
	// Mean goals per team for the neutral scoreline model.
	lambda?: number;
	// Fixed seed → stable result across renders and deterministic tests.
	seed?: number;
	sims?: number;
}

const MAX_GOALS = 7;

// Small, fast, seedable PRNG (mulberry32). A fixed seed keeps the odds stable
// between renders so the column doesn't flicker, and makes the lib testable.
function mulberry32(seed: number): () => number {
	let a = seed >>> 0;

	return () => {
		a |= 0;
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

// A Poisson draw (Knuth) for one team's goals, capped so blowouts stay sane.
function poisson(rand: () => number, lambda: number): number {
	const limit = Math.exp(-lambda);
	let k = 0;
	let p = 1;

	do {
		k++;
		p *= rand();
	} while (p > limit);

	return Math.min(k - 1, MAX_GOALS);
}

// Probability each participant finishes the group stage in first place, from a
// neutral Monte Carlo over the games not yet decided. Points already locked in
// (finished matches) carry over; every remaining game is replayed `sims` times
// with random-but-realistic scorelines and everyone is re-scored. Ties at the
// top split the credit, so the returned probabilities sum to 1.
export function simulateTitleOdds(
	participants: Participant[],
	games: Game[],
	options: TitleOddsOptions = {}
): Record<string, number> {
	const {lambda = 1.35, seed = 0x9e3779b9, sims = 20000} = options;

	const names = participants.map((participant) => participant.name);
	const out: Record<string, number> = {};

	if (names.length === 0) {
		return out;
	}

	const index = new Map(names.map((name, i) => [name, i]));
	const cards = buildMatchCards(participants, games);

	// Points locked in from finished matches, indexed by participant.
	const locked = new Array<number>(names.length).fill(0);

	for (const card of cards) {
		if (card.status !== 'finished') {
			continue;
		}

		for (const entry of card.entries) {
			const i = index.get(entry.name);

			if (i !== undefined) {
				locked[i] += entry.points ?? 0;
			}
		}
	}

	// Remaining fixtures as per-participant picks (−1 marks "no pick").
	const remaining = cards
		.filter((card) => card.status !== 'finished')
		.map((card) => {
			const p1 = new Array<number>(names.length).fill(-1);
			const p2 = new Array<number>(names.length).fill(-1);

			for (const entry of card.entries) {
				const i = index.get(entry.name);

				if (i !== undefined) {
					p1[i] = entry.p1;
					p2[i] = entry.p2;
				}
			}

			return {p1, p2};
		});

	const rand = mulberry32(seed);
	const wins = new Array<number>(names.length).fill(0);

	for (let s = 0; s < sims; s++) {
		const totals = locked.slice();

		for (const {p1, p2} of remaining) {
			const r1 = poisson(rand, lambda);
			const r2 = poisson(rand, lambda);

			for (let i = 0; i < names.length; i++) {
				if (p1[i] >= 0) {
					totals[i] += scorePrediction(p1[i], p2[i], r1, r2);
				}
			}
		}

		let max = -Infinity;

		for (const total of totals) {
			if (total > max) {
				max = total;
			}
		}

		let leaders = 0;

		for (const total of totals) {
			if (total === max) {
				leaders++;
			}
		}

		const credit = 1 / leaders;

		for (let i = 0; i < names.length; i++) {
			if (totals[i] === max) {
				wins[i] += credit;
			}
		}
	}

	for (let i = 0; i < names.length; i++) {
		out[names[i]] = wins[i] / sims;
	}

	return out;
}

// Probability each knockout participant finishes the bracket pool in first
// place, the same neutral Monte Carlo as the group stage but over the in-app
// knockout picks. Finished matches lock in; every undecided match someone has
// picked is replayed `sims` times and everyone is re-scored. Matches nobody has
// picked (future rounds with unknown teams) are skipped, so the estimate only
// reflects the picks made so far.
export function simulateKnockoutTitleOdds(
	roster: KnockoutRosterRow[],
	picksByUid: Record<string, Record<number, {p1: number; p2: number}>>,
	matches: KnockoutMatch[],
	options: TitleOddsOptions = {}
): Record<string, number> {
	const {lambda = 1.35, seed = 0x9e3779b9, sims = 20000} = options;

	const out: Record<string, number> = {};

	if (roster.length === 0) {
		return out;
	}

	const hasScore = (match: KnockoutMatch) =>
		match.scoreA != null && match.scoreB != null;

	// Points locked in from finished matches, indexed by roster position.
	const locked = roster.map(({uid}) => {
		const picks = picksByUid[uid] ?? {};
		let total = 0;

		for (const match of matches) {
			const pick = picks[match.matchNumber];

			if (match.finished && hasScore(match) && pick) {
				total += scorePrediction(
					pick.p1,
					pick.p2,
					match.scoreA as number,
					match.scoreB as number
				);
			}
		}

		return total;
	});

	// Undecided fixtures that at least one participant has picked.
	const remaining = matches
		.filter((match) => !match.finished)
		.map((match) => ({
			p1: roster.map(
				({uid}) => picksByUid[uid]?.[match.matchNumber]?.p1 ?? -1
			),
			p2: roster.map(
				({uid}) => picksByUid[uid]?.[match.matchNumber]?.p2 ?? -1
			),
		}))
		.filter(({p1}) => p1.some((value) => value >= 0));

	const rand = mulberry32(seed);
	const wins = new Array<number>(roster.length).fill(0);

	for (let s = 0; s < sims; s++) {
		const totals = locked.slice();

		for (const {p1, p2} of remaining) {
			const r1 = poisson(rand, lambda);
			const r2 = poisson(rand, lambda);

			for (let i = 0; i < roster.length; i++) {
				if (p1[i] >= 0) {
					totals[i] += scorePrediction(p1[i], p2[i], r1, r2);
				}
			}
		}

		let max = -Infinity;

		for (const total of totals) {
			if (total > max) {
				max = total;
			}
		}

		let leaders = 0;

		for (const total of totals) {
			if (total === max) {
				leaders++;
			}
		}

		const credit = 1 / leaders;

		for (let i = 0; i < roster.length; i++) {
			if (totals[i] === max) {
				wins[i] += credit;
			}
		}
	}

	for (let i = 0; i < roster.length; i++) {
		out[roster[i].name] = wins[i] / sims;
	}

	return out;
}
