// Server-side push to the emitsignal webhook, from the score-poller cron. The
// hook URL lives in the VM env (EMITSIGNAL_WEBHOOK_URL, kept out of the repo);
// unset → no-op, so the poller only signals where it's configured. The event
// fields go at the top level of the JSON body, matching the in-app client.
export async function emitSignal(payload) {
	const url = process.env.EMITSIGNAL_WEBHOOK_URL;

	if (!url) {
		return false;
	}

	try {
		await fetch(url, {
			body: JSON.stringify({...payload, at: new Date().toISOString()}),
			headers: {'Content-Type': 'application/json'},
			method: 'POST',
		});

		return true;
	}
	catch (error) {
		console.error(`emitSignal failed: ${error.message}`);

		return false;
	}
}
