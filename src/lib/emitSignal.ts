import {DEMO} from './dataRoot';

// External signal/notification webhook (emitsignal.com). The endpoint stores a
// single string `payload`, so we wrap the event JSON in {payload: "<json>"}.
const WEBHOOK_URL = 'https://api.emitsignal.com/h/gh_1la4spf';

// Fire-and-forget push to the signal webhook. Never blocks the UI or throws —
// failures are swallowed. `demo` flags events fired from the ?demo sandbox so
// they can be told apart from real entry requests.
export function emitSignal(event: string, data: Record<string, unknown>): void {
	if (typeof fetch === 'undefined') {
		return;
	}

	const payload = JSON.stringify({
		event,
		...data,
		at: new Date().toISOString(),
		demo: DEMO,
	});

	void fetch(WEBHOOK_URL, {
		body: JSON.stringify({payload}),
		headers: {'Content-Type': 'application/json'},
		method: 'POST',
	}).catch(() => undefined);
}
