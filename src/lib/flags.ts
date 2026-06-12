// FIFA team names (as they appear in the pool sheet) → flagcdn codes.
// England/Scotland/Wales use GB subdivision codes; everything else is ISO 3166-1.
const BY_NAME: Record<string, string> = {
	Algeria: 'dz',
	Argentina: 'ar',
	Australia: 'au',
	Austria: 'at',
	Belgium: 'be',
	'Bosnia and Herzegovina': 'ba',
	Brazil: 'br',
	'Cabo Verde': 'cv',
	Canada: 'ca',
	Colombia: 'co',
	'Congo DR': 'cd',
	"Côte d'Ivoire": 'ci',
	Croatia: 'hr',
	Curaçao: 'cw',
	Czechia: 'cz',
	Ecuador: 'ec',
	Egypt: 'eg',
	England: 'gb-eng',
	France: 'fr',
	Germany: 'de',
	Ghana: 'gh',
	Haiti: 'ht',
	'IR Iran': 'ir',
	Iraq: 'iq',
	Japan: 'jp',
	Jordan: 'jo',
	'Korea Republic': 'kr',
	Mexico: 'mx',
	Morocco: 'ma',
	Netherlands: 'nl',
	'New Zealand': 'nz',
	Norway: 'no',
	Panama: 'pa',
	Paraguay: 'py',
	Portugal: 'pt',
	Qatar: 'qa',
	'Saudi Arabia': 'sa',
	Scotland: 'gb-sct',
	Senegal: 'sn',
	'South Africa': 'za',
	Spain: 'es',
	Sweden: 'se',
	Switzerland: 'ch',
	Tunisia: 'tn',
	Türkiye: 'tr',
	USA: 'us',
	Uruguay: 'uy',
	Uzbekistan: 'uz',
	Wales: 'gb-wls',
};

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
