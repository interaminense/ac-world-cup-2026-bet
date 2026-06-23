import BY_NAME from '../src/data/team-flags.json' with {type: 'json'};

function normalize(name) {
	return name
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]/g, '');
}

const BY_NORM = Object.fromEntries(
	Object.entries(BY_NAME).map(([name, code]) => [normalize(name), code])
);

// 'gb-eng' → 🏴 + tag letters for 'gbeng' + cancel tag.
function subdivisionFlag(code) {
	const tag = code.replace('-', '');

	return (
		'\u{1F3F4}' +
		[...tag]
			.map((char) => String.fromCodePoint(0xe0000 + char.charCodeAt(0)))
			.join('') +
		'\u{E007F}'
	);
}

// 'fr' → 🇫🇷 (two regional indicator symbols).
function regionalIndicator(code) {
	return code
		.toUpperCase()
		.replace(/./g, (char) =>
			String.fromCodePoint(127397 + char.charCodeAt(0))
		);
}

export function teamFlagEmoji(name) {
	const code = BY_NORM[normalize(name)];

	if (!code) {
		return '🏳️';
	}

	return code.includes('-') ? subdivisionFlag(code) : regionalIndicator(code);
}
