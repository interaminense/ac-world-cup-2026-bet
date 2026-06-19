// A representative flag color per team, used to tint the pool-picks bar. Keyed
// by the same FIFA names as the flag map.
const BY_NAME: Record<string, string> = {
	Algeria: '#007229',
	Argentina: '#6CACE4',
	Australia: '#00843D',
	Austria: '#ED2939',
	Belgium: '#FDDA24',
	'Bosnia and Herzegovina': '#002F6C',
	Brazil: '#009C3B',
	'Cabo Verde': '#003893',
	Canada: '#D52B1E',
	Colombia: '#FCD116',
	'Congo DR': '#007FFF',
	"Côte d'Ivoire": '#FF8200',
	Croatia: '#FF0000',
	Curaçao: '#002B7F',
	Czechia: '#11457E',
	Ecuador: '#FFDD00',
	Egypt: '#CE1126',
	England: '#CE1124',
	France: '#0055A4',
	Germany: '#DD0000',
	Ghana: '#006B3F',
	Haiti: '#00209F',
	'IR Iran': '#239F40',
	Iraq: '#CE1126',
	Japan: '#BC002D',
	Jordan: '#007A3D',
	'Korea Republic': '#003478',
	Mexico: '#006847',
	Morocco: '#C1272D',
	Netherlands: '#F36C21',
	'New Zealand': '#00247D',
	Norway: '#BA0C2F',
	Panama: '#005293',
	Paraguay: '#D52B1E',
	Portugal: '#006600',
	Qatar: '#8A1538',
	'Saudi Arabia': '#006C35',
	Scotland: '#0065BF',
	Senegal: '#00853F',
	'South Africa': '#007A4D',
	Spain: '#AA151B',
	Sweden: '#006AA7',
	Switzerland: '#D52B1E',
	Tunisia: '#E70013',
	Türkiye: '#E30A17',
	USA: '#3C3B6E',
	Uruguay: '#0038A8',
	Uzbekistan: '#0099B5',
	Wales: '#C8102E',
};

function normalize(name: string): string {
	return name
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]/g, '');
}

const COLORS: Record<string, string> = Object.fromEntries(
	Object.entries(BY_NAME).map(([name, color]) => [normalize(name), color])
);

export function teamColor(team: string): string {
	return COLORS[normalize(team)] ?? '#94a3b8';
}
