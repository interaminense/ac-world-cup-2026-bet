const MONTHS: Record<string, string> = {
	Apr: '04',
	Aug: '08',
	Dec: '12',
	Feb: '02',
	Jan: '01',
	Jul: '07',
	Jun: '06',
	Mar: '03',
	May: '05',
	Nov: '11',
	Oct: '10',
	Sep: '09',
};

const TOURNAMENT_YEAR = 2026;

// The pool sheet records kickoffs in Brasília time; Brazil has no DST.
const SHEET_UTC_OFFSET = '-03:00';

export function kickoffDate(date: string, time: string): Date | null {
	const dateMatch = date.match(/^([A-Za-z]{3})\/(\d{1,2})$/);
	const timeMatch = time.match(/^(\d{1,2}):(\d{2})$/);

	if (!dateMatch || !timeMatch) {
		return null;
	}

	const month = MONTHS[dateMatch[1]];

	if (!month) {
		return null;
	}

	const day = dateMatch[2].padStart(2, '0');
	const hour = timeMatch[1].padStart(2, '0');

	const parsed = new Date(
		`${TOURNAMENT_YEAR}-${month}-${day}T${hour}:${timeMatch[2]}:00${SHEET_UTC_OFFSET}`
	);

	return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatKickoff(date: string, time: string): string {
	const kickoff = kickoffDate(date, time);

	if (!kickoff) {
		return `${date} ${time}`.trim();
	}

	return kickoff.toLocaleString('en-US', {
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
		month: 'short',
		timeZoneName: 'short',
	});
}
