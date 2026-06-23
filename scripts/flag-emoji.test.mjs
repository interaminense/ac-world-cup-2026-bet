import {describe, expect, it} from 'vitest';

import {teamFlagEmoji} from './flag-emoji.mjs';

describe('teamFlagEmoji', () => {
	it('maps a two-letter ISO country to its flag', () => {
		expect(teamFlagEmoji('France')).toBe('🇫🇷');
		expect(teamFlagEmoji('Iraq')).toBe('🇮🇶');
	});

	it('maps a fuzzy / special FIFA name', () => {
		expect(teamFlagEmoji('IR Iran')).toBe('🇮🇷');
	});

	it('maps a GB subdivision to its tag-sequence flag', () => {
		expect(teamFlagEmoji('England')).toBe(
			'🏴\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}'
		);
	});

	it('falls back for an unknown name', () => {
		expect(teamFlagEmoji('Wakanda')).toBe('🏳️');
	});
});
