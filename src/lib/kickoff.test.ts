import {describe, expect, it} from 'vitest';

import {kickoffDate} from './kickoff';

describe('kickoffDate', () => {
	it('parses a CSV date/time pair as Brasília time (UTC-3)', () => {
		expect(kickoffDate('Jun/11', '16:00')?.toISOString()).toBe(
			'2026-06-11T19:00:00.000Z'
		);
	});

	it('keeps early-morning kickoffs on the Brasília calendar date', () => {
		expect(kickoffDate('Jun/14', '01:00')?.toISOString()).toBe(
			'2026-06-14T04:00:00.000Z'
		);
	});

	it('returns null for unparseable input', () => {
		expect(kickoffDate('', '16:00')).toBeNull();
		expect(kickoffDate('Junho/11', '16:00')).toBeNull();
		expect(kickoffDate('Jun/11', '')).toBeNull();
	});
});
