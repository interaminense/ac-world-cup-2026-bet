import {describe, expect, it} from 'vitest';

import type {MatchCard} from './matches';
import {
	formatMe,
	formatPicks,
	formatScore,
	formatWhatIfMovers,
	HELP_TEXT,
	parseChatInput,
	parseScoreArg,
	runChatCommand,
} from './chatCommands';

const liveCard: MatchCard = {
	entries: [
		{name: 'Ana', p1: 2, p2: 0},
		{name: 'Bob', p1: 1, p2: 1},
		{name: 'Cid', p1: 0, p2: 3},
		{name: 'Dan', p1: 3, p2: 1},
	],
	group: 'A',
	matchNo: 28,
	r1: 2,
	r2: 0,
	status: 'live',
	team1: 'Mexico',
	team2: 'Korea Republic',
	timeElapsed: '67',
} as MatchCard;

const ctx = {
	card: liveCard,
	games: [],
	matchNo: 28,
	name: 'Adriano',
	participants: [],
};

describe('parseChatInput', () => {
	it('treats non-slash text as a message', () => {
		expect(parseChatInput('hello there')).toEqual({
			arg: 'hello there',
			kind: 'message',
		});
	});

	it('parses a bare command', () => {
		expect(parseChatInput('/score')).toEqual({arg: '', kind: 'score'});
	});

	it('parses a command with an argument', () => {
		expect(parseChatInput('/whatif 2-1')).toEqual({
			arg: '2-1',
			kind: 'whatif',
		});
	});

	it('keeps the full /me argument and is case-insensitive', () => {
		expect(parseChatInput('/ME comemora muito')).toEqual({
			arg: 'comemora muito',
			kind: 'me',
		});
	});

	it('flags an unknown command', () => {
		expect(parseChatInput('/bogus x').kind).toBe('unknown');
	});
});

describe('parseScoreArg', () => {
	it('parses a-b', () => {
		expect(parseScoreArg('2-1')).toEqual({r1: 2, r2: 1});
		expect(parseScoreArg('2 - 1')).toEqual({r1: 2, r2: 1});
	});

	it('rejects junk', () => {
		expect(parseScoreArg('abc')).toBeNull();
		expect(parseScoreArg('2')).toBeNull();
	});
});

describe('formatScore', () => {
	it('formats a live score with the minute', () => {
		expect(formatScore(liveCard)).toBe('Mexico 2–0 Korea Republic · 67\'');
	});

	it('handles no live match', () => {
		expect(formatScore(null)).toBe('No live score right now.');
		expect(formatScore({...liveCard, status: 'finished'})).toBe(
			'No live score right now.'
		);
	});
});

describe('formatPicks', () => {
	it('counts team1/draw/team2 from entries', () => {
		expect(formatPicks(liveCard)).toBe(
			'Pool picks: Mexico 2 · Draw 1 · Korea Republic 1'
		);
	});

	it('handles no entries', () => {
		expect(formatPicks({...liveCard, entries: []})).toBe(
			'No picks for this match.'
		);
	});
});

describe('formatWhatIfMovers', () => {
	it('shows movers with rank change and gained points', () => {
		const out = formatWhatIfMovers(
			[
				{name: 'Rachael', pointsDelta: 15, rankAfter: 1, rankBefore: 3, totalAfter: 240},
				{name: 'Caio', pointsDelta: 0, rankAfter: 2, rankBefore: 1, totalAfter: 230},
			],
			'Mexico 2–1 Korea Republic'
		);

		expect(out).toContain('If Mexico 2–1 Korea Republic:');
		expect(out).toContain('Rachael 3→1 (+15)');
		expect(out).toContain('Caio 1→2');
	});

	it('handles no movers', () => {
		expect(formatWhatIfMovers([], 'x')).toBe("Can't project this match.");
	});
});

describe('formatMe', () => {
	it('emotes', () => {
		expect(formatMe('Adriano', 'comemora')).toBe('* Adriano comemora');
	});
});

describe('HELP_TEXT', () => {
	it('tags each command visibility', () => {
		expect(HELP_TEXT).toContain('/score');
		expect(HELP_TEXT).toContain('(only you)');
		expect(HELP_TEXT).toContain('/me');
		expect(HELP_TEXT).toContain('(public — everyone sees)');
	});
});

describe('runChatCommand', () => {
	it('broadcasts a plain message', () => {
		expect(runChatCommand('vamos!', ctx)).toEqual({broadcast: 'vamos!'});
	});

	it('broadcasts /me as an emote', () => {
		expect(runChatCommand('/me chora', ctx)).toEqual({
			broadcast: '* Adriano chora',
		});
	});

	it('gives a usage hint for an empty /me', () => {
		expect(runChatCommand('/me', ctx).ephemeral).toBe('Usage: /me <action>');
	});

	it('returns ephemeral data for /score and /picks', () => {
		expect(runChatCommand('/score', ctx).ephemeral).toBe(
			'Mexico 2–0 Korea Republic · 67\''
		);
		expect(runChatCommand('/picks', ctx).ephemeral).toContain('Pool picks:');
	});

	it('returns ephemeral help and unknown', () => {
		expect(runChatCommand('/help', ctx).ephemeral).toBe(HELP_TEXT);
		expect(runChatCommand('/nope', ctx).ephemeral).toBe(
			'Unknown command. Try /help'
		);
	});

	it('gives a usage hint for a bad /whatif arg', () => {
		expect(runChatCommand('/whatif abc', ctx).ephemeral).toBe(
			'Usage: /whatif 2-1'
		);
	});
});

import {resolveCelebrateTarget} from './chatCommands';
import type {Participant} from './types';

const participants = [
	{name: 'Rachael', predictions: []},
	{name: 'Caio', predictions: []},
] as Participant[];

describe('resolveCelebrateTarget', () => {
	it('matches case-insensitively', () => {
		expect(resolveCelebrateTarget('rachael', participants)).toEqual({
			name: 'Rachael',
		});
	});

	it('matches a prefix', () => {
		expect(resolveCelebrateTarget('cai', participants)).toEqual({
			name: 'Caio',
		});
	});

	it('returns null for no match', () => {
		expect(resolveCelebrateTarget('zzz', participants)).toBeNull();
	});
});

describe('runChatCommand /celebrate', () => {
	const cctx = {...ctx, participants};

	it('returns a celebrate effect when the name resolves', () => {
		expect(runChatCommand('/celebrate rachael', cctx)).toEqual({
			celebrate: 'Rachael',
		});
	});

	it('is ephemeral when the name does not resolve', () => {
		expect(runChatCommand('/celebrate zzz', cctx).ephemeral).toBe(
			'No one named "zzz" in the pool'
		);
	});

	it('gives a usage hint when empty', () => {
		expect(runChatCommand('/celebrate', cctx).ephemeral).toBe(
			'Usage: /celebrate <name>'
		);
	});

	it('lists /celebrate in help as public', () => {
		expect(HELP_TEXT).toContain('/celebrate');
	});
});

describe('runChatCommand match commands without a single live match', () => {
	const noLive = {...ctx, card: null};

	it('hints for /score, /picks, /whatif when no single live match', () => {
		const hint = 'No single live match right now — check the Matches tab.';

		expect(runChatCommand('/score', noLive).ephemeral).toBe(hint);
		expect(runChatCommand('/picks', noLive).ephemeral).toBe(hint);
		expect(runChatCommand('/whatif 2-1', noLive).ephemeral).toBe(hint);
	});

	it('still scores against a live card when present', () => {
		expect(runChatCommand('/score', ctx).ephemeral).toContain('Mexico');
	});
});
