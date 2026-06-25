import {afterEach, describe, expect, it, vi} from 'vitest';

import {emitSignal} from './emitSignal';

describe('emitSignal', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('posts the event wrapped in a stringified payload to the webhook', () => {
		const fetchMock = vi.fn().mockResolvedValue({ok: true});
		vi.stubGlobal('fetch', fetchMock);

		emitSignal('knockout_entry_request', {
			email: 'ana@example.com',
			name: 'Ana',
			uid: 'u1',
		});

		expect(fetchMock).toHaveBeenCalledTimes(1);

		const [url, init] = fetchMock.mock.calls[0];

		expect(url).toContain('api.emitsignal.com');
		expect(init.method).toBe('POST');
		expect(init.headers['Content-Type']).toBe('application/json');

		const body = JSON.parse(init.body as string);

		expect(typeof body.payload).toBe('string');

		const payload = JSON.parse(body.payload);

		expect(payload.event).toBe('knockout_entry_request');
		expect(payload.name).toBe('Ana');
		expect(payload.email).toBe('ana@example.com');
		expect(payload.uid).toBe('u1');
		expect(payload.demo).toBe(false);
		expect(typeof payload.at).toBe('string');
	});

	it('never throws when the request fails', () => {
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')));

		expect(() => emitSignal('participant_claim', {claim: 'caio'})).not.toThrow();
	});
});
