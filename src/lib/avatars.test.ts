import {describe, expect, it} from 'vitest';

import {getAvatarUrl, resolveAvatarUrl} from './avatars';

describe('resolveAvatarUrl', () => {
	it('prefers the explicit (signed-in) photo over the Slack photo', () => {
		expect(resolveAvatarUrl('Bruna', 'https://google/pic')).toBe(
			'https://google/pic'
		);
	});

	it('uses the by-name signed-in photo over the Slack photo', () => {
		expect(resolveAvatarUrl('Bruna', null, {Bruna: 'https://google/b'})).toBe(
			'https://google/b'
		);
	});

	it('falls back to the Slack photo when there is no signed-in photo', () => {
		expect(resolveAvatarUrl('Bruna', null, {})).toBe(getAvatarUrl('Bruna'));
		expect(resolveAvatarUrl('Bruna', '', {})).toBe(getAvatarUrl('Bruna'));
	});

	it('returns undefined when neither a signed-in nor a Slack photo exists', () => {
		expect(resolveAvatarUrl('Marcos Martins', null, {})).toBeUndefined();
	});

	it('uses the signed-in photo for a participant with no Slack photo', () => {
		expect(
			resolveAvatarUrl('Marcos Martins', null, {
				'Marcos Martins': 'https://google/m',
			})
		).toBe('https://google/m');
	});
});
