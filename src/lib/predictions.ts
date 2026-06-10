import {parsePredictionsCsv} from './parsePredictions';
import type {Participant} from './types';

const csvModules = import.meta.glob('../data/predictions/*.csv', {
	eager: true,
	import: 'default',
	query: '?raw',
}) as Record<string, string>;

export function loadParticipants(): Participant[] {
	return Object.entries(csvModules)
		.map(([path, content]) => {
			const participant = parsePredictionsCsv(content);

			if (!participant) {
				console.error(`Skipping malformed predictions CSV: ${path}`);
			}

			return participant;
		})
		.filter(
			(participant): participant is Participant => participant !== null
		)
		.sort((a, b) => a.name.localeCompare(b.name));
}
