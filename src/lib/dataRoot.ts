// Add ?demo to the URL to flip the whole app onto an isolated `demo/` subtree
// of the Realtime Database — a clone of the live data we can mutate to rehearse
// realtime pushes (live scores, reactions) without touching what users see.
export const DEMO =
	typeof window !== 'undefined' &&
	new URLSearchParams(window.location.search).has('demo');

export function dataPath(path: string): string {
	return DEMO ? `demo/${path}` : path;
}
