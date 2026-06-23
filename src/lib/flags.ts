// FIFA team names (as they appear in the pool sheet) → flagcdn codes.
// England/Scotland/Wales use GB subdivision codes; everything else is ISO 3166-1.
// The map is shared with the poller's flag-emoji helper via team-flags.json.
import BY_NAME from '../data/team-flags.json';

function normalize(name: string): string {
	return name
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]/g, '');
}

const CODES: Record<string, string> = Object.fromEntries(
	Object.entries(BY_NAME).map(([name, code]) => [normalize(name), code])
);

export function flagCode(team: string): string | undefined {
	return CODES[normalize(team)];
}

export function flagUrl(team: string, width = 40): string | undefined {
	const code = flagCode(team);

	return code ? `https://flagcdn.com/w${width}/${code}.png` : undefined;
}
