// Fire a GA4 custom event through the gtag snippet in index.html. No-op when
// gtag is absent (ad blockers, or before the tag loads), so callers never need
// to guard.
type Gtag = (
	command: 'event',
	eventName: string,
	params?: Record<string, unknown>
) => void;

export function trackEvent(
	name: string,
	params?: Record<string, unknown>
): void {
	const gtag = (window as unknown as {gtag?: Gtag}).gtag;

	gtag?.('event', name, params);
}

// GA4 page_view for a client route. With HashRouter the real path never changes
// (the route lives in the hash, which GA4 ignores), so we synthesize a
// path-based page_location — /…/bets/adriano — to get one distinct page per
// route in the reports.
export function trackPageView(routePath: string): void {
	const base = window.location.pathname.replace(/\/$/, '');

	trackEvent('page_view', {
		page_location: `${window.location.origin}${base}${routePath}`,
		page_title: document.title,
	});
}
