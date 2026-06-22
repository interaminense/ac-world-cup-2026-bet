import type {MatchCard} from './matches';
import type {Game, Participant} from './types';
import {simulateWhatIf, type WhatIfMover} from './whatif';

export type ChatCommandKind =
	| 'celebrate'
	| 'help'
	| 'me'
	| 'message'
	| 'picks'
	| 'score'
	| 'unknown'
	| 'whatif';

export interface ChatCommandContext {
	card: MatchCard | null;
	games: Game[];
	matchNo: number;
	name: string;
	participants: Participant[];
}

const COMMANDS: Record<string, ChatCommandKind> = {
	celebrate: 'celebrate',
	help: 'help',
	me: 'me',
	picks: 'picks',
	score: 'score',
	whatif: 'whatif',
};

export function parseChatInput(text: string): {
	arg: string;
	kind: ChatCommandKind;
} {
	const trimmed = text.trim();

	if (!trimmed.startsWith('/')) {
		return {arg: trimmed, kind: 'message'};
	}

	const space = trimmed.indexOf(' ');
	const word = (
		space === -1 ? trimmed.slice(1) : trimmed.slice(1, space)
	).toLowerCase();

	return {
		arg: space === -1 ? '' : trimmed.slice(space + 1).trim(),
		kind: COMMANDS[word] ?? 'unknown',
	};
}

export function parseScoreArg(arg: string): {r1: number; r2: number} | null {
	const match = arg.match(/^(\d+)\s*-\s*(\d+)$/);

	return match ? {r1: Number(match[1]), r2: Number(match[2])} : null;
}

export const HELP_TEXT = [
	'Commands:',
	'/score — current score (only you)',
	'/picks — pool picks for this match (only you)',
	'/whatif 2-1 — projected standings (only you)',
	'/celebrate <name> — celebrate someone (public — everyone sees)',
	'/me <action> — emote (public — everyone sees)',
	'/help — this list (only you)',
].join('\n');

export function resolveCelebrateTarget(
	arg: string,
	participants: Participant[]
): {name: string} | null {
	const needle = arg.trim().toLowerCase();

	if (!needle) {
		return null;
	}

	const exact = participants.find(
		(participant) => participant.name.toLowerCase() === needle
	);
	const prefix = participants.find((participant) =>
		participant.name.toLowerCase().startsWith(needle)
	);
	const match = exact ?? prefix;

	return match ? {name: match.name} : null;
}

export function formatScore(card: MatchCard | null): string {
	if (
		!card ||
		card.status !== 'live' ||
		card.r1 === undefined ||
		card.r2 === undefined
	) {
		return 'No live score right now.';
	}

	const minute = /^\d+$/.test(card.timeElapsed ?? '')
		? ` · ${card.timeElapsed}'`
		: '';

	return `${card.team1} ${card.r1}–${card.r2} ${card.team2}${minute}`;
}

export function formatPicks(card: MatchCard | null): string {
	if (!card || card.entries.length === 0) {
		return 'No picks for this match.';
	}

	let team1 = 0;
	let draw = 0;
	let team2 = 0;

	for (const entry of card.entries) {
		if (entry.p1 > entry.p2) {
			team1 += 1;
		}
		else if (entry.p1 < entry.p2) {
			team2 += 1;
		}
		else {
			draw += 1;
		}
	}

	return `Pool picks: ${card.team1} ${team1} · Draw ${draw} · ${card.team2} ${team2}`;
}

export function formatWhatIfMovers(
	movers: WhatIfMover[],
	label: string
): string {
	if (movers.length === 0) {
		return "Can't project this match.";
	}

	const moved = movers.filter((mover) => mover.rankAfter !== mover.rankBefore);
	const shown = (moved.length > 0 ? moved : movers).slice(0, 4);

	const parts = shown.map((mover) => {
		const rank =
			mover.rankBefore === mover.rankAfter
				? `#${mover.rankAfter}`
				: `${mover.rankBefore}→${mover.rankAfter}`;
		const delta = mover.pointsDelta > 0 ? ` (+${mover.pointsDelta})` : '';

		return `${mover.name} ${rank}${delta}`;
	});

	return `If ${label}: ${parts.join(' · ')}`;
}

export function formatWhatIf(ctx: ChatCommandContext, arg: string): string {
	const score = parseScoreArg(arg);

	if (!score) {
		return 'Usage: /whatif 2-1';
	}

	const team1 = ctx.card?.team1 ?? 'Team 1';
	const team2 = ctx.card?.team2 ?? 'Team 2';
	const movers = simulateWhatIf(
		ctx.participants,
		ctx.games,
		ctx.matchNo,
		score.r1,
		score.r2
	);

	return formatWhatIfMovers(
		movers,
		`${team1} ${score.r1}–${score.r2} ${team2}`
	);
}

export function formatMe(name: string, arg: string): string {
	return `* ${name} ${arg}`;
}

export function runChatCommand(
	text: string,
	ctx: ChatCommandContext
): {broadcast?: string; celebrate?: string; ephemeral?: string} {
	const {arg, kind} = parseChatInput(text);

	switch (kind) {
		case 'celebrate': {
			if (!arg) {
				return {ephemeral: 'Usage: /celebrate <name>'};
			}

			const target = resolveCelebrateTarget(arg, ctx.participants);

			return target
				? {celebrate: target.name}
				: {ephemeral: `No one named "${arg}" in the pool`};
		}
		case 'help':
			return {ephemeral: HELP_TEXT};
		case 'me':
			return arg
				? {broadcast: formatMe(ctx.name, arg)}
				: {ephemeral: 'Usage: /me <action>'};
		case 'picks':
			return {ephemeral: formatPicks(ctx.card)};
		case 'score':
			return {ephemeral: formatScore(ctx.card)};
		case 'unknown':
			return {ephemeral: 'Unknown command. Try /help'};
		case 'whatif':
			return {ephemeral: formatWhatIf(ctx, arg)};
		default:
			return {broadcast: text.trim()};
	}
}
