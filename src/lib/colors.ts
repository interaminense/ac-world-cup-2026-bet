const PALETTE = [
	'#fbbf24',
	'#34d399',
	'#60a5fa',
	'#f472b6',
	'#a78bfa',
	'#f87171',
	'#2dd4bf',
	'#fb923c',
	'#a3e635',
	'#22d3ee',
	'#e879f9',
	'#facc15',
	'#4ade80',
	'#93c5fd',
	'#fda4af',
	'#c084fc',
	'#5eead4',
];

// One stable color per participant. Names are sorted first so the mapping is
// deterministic regardless of standings order — the same person keeps the same
// color across the Race chart and the rewind timeline, and as ranks shuffle.
export function colorByName(names: string[]): Map<string, string> {
	return new Map(
		[...names]
			.sort((a, b) => a.localeCompare(b))
			.map((name, index) => [name, PALETTE[index % PALETTE.length]])
	);
}
