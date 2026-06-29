import Papa from 'papaparse';

import type {Participant, Prediction} from './types';

export function parsePredictionsCsv(content: string): Participant | null {
	const {data} = Papa.parse<string[]>(content.trim(), {
		skipEmptyLines: 'greedy',
	});

	const titleMatch = (data[0]?.[0] ?? '').match(
		/PREDICTIONS & POINTS FOR:\s*(.+)/i
	);

	if (!titleMatch) {
		return null;
	}

	const rawName = titleMatch[1].trim();
	// Title-case each word so multi-word names (e.g. "JOE PAK") render properly,
	// not just the first letter.
	const name = rawName
		.split(/\s+/)
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
		.join(' ');

	const headerIndex = data.findIndex((row) => row[0]?.trim() === 'Match #');

	if (headerIndex === -1) {
		return null;
	}

	const predictions: Prediction[] = [];

	for (const row of data.slice(headerIndex + 1)) {
		const matchNo = Number(row[0]);

		if (!row[0]?.trim() || !Number.isFinite(matchNo)) {
			continue;
		}

		const p1 = Number(row[5]);
		const p2 = Number(row[6]);

		if (
			!row[5]?.trim() ||
			!row[6]?.trim() ||
			!Number.isFinite(p1) ||
			!Number.isFinite(p2)
		) {
			continue;
		}

		predictions.push({
			date: row[2]?.trim() ?? '',
			group: row[1]?.trim() ?? '',
			matchNo,
			p1,
			p2,
			team1: row[4]?.trim() ?? '',
			team2: row[7]?.trim() ?? '',
			time: row[3]?.trim() ?? '',
		});
	}

	if (predictions.length === 0) {
		return null;
	}

	return {name, predictions};
}
