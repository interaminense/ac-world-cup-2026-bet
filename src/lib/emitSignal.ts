import {DEMO} from './dataRoot';

// External signal/notification webhook (emitsignal.com). The event fields go at
// the top level of the JSON body — no wrapper.
const WEBHOOK_URL = 'https://api.emitsignal.com/h/gh_1la4spf';

// Fire-and-forget push to the signal webhook. Never blocks the UI or throws —
// failures are swallowed. `demo` flags events fired from the ?demo sandbox so
// they can be told apart from real entry requests.
export function emitSignal(event: string, data: Record<string, unknown>): void {
	if (typeof fetch === 'undefined') {
		return;
	}

	void fetch(WEBHOOK_URL, {
		body: JSON.stringify({
			event,
			...data,
			at: new Date().toISOString(),
			demo: DEMO,
		}),
		headers: {'Content-Type': 'application/json'},
		method: 'POST',
	}).catch(() => undefined);
}
