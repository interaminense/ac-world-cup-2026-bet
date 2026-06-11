const AVATARS: Record<string, string> = {
	adriano: 'https://ca.slack-edge.com/T03BTCQAJ-U6Y1V782G-cbc09d378813-512',
	bruna: 'https://ca.slack-edge.com/T03BTCQAJ-U065S8QK0RG-26c748e1d9a1-512',
	caio: 'https://ca.slack-edge.com/T03BTCQAJ-U07M3BSPVK9-29ef619de0cc-512',
	deborah:
		'https://ca.slack-edge.com/T03BTCQAJ-U01QJUY594Y-e6768c9436af-512',
	eudaldo: 'https://ca.slack-edge.com/T03BTCQAJ-U03LGE8SD-71dd7bcc4a00-512',
	gabriel:
		'https://ca.slack-edge.com/T03BTCQAJ-U07P59330RM-357f6d624c4e-512',
	joe: 'https://ca.slack-edge.com/T03BTCQAJ-U01ERR8RKAR-27fd335a1031-512',
	marcio: 'https://ca.slack-edge.com/T03BTCQAJ-U01P75VDNLB-0c149bc8e901-512',
	nilton: 'https://ca.slack-edge.com/T03BTCQAJ-U02S5TB2H45-f76b4c001ca5-512',
	rachael: 'https://ca.slack-edge.com/T03BTCQAJ-UBWC4SU7P-91575a05cc4a-512',
	rafaella:
		'https://ca.slack-edge.com/T03BTCQAJ-U01QAQ8756C-7da8eca1de1c-512',
	renan: 'https://ca.slack-edge.com/T03BTCQAJ-U01JMU3HQUQ-372317c0e8d8-512',
	tiago: 'https://ca.slack-edge.com/T03BTCQAJ-U05RNGD8SVD-8a352a2ec2cc-512',
};

export function getAvatarUrl(name: string): string | undefined {
	return AVATARS[name.toLowerCase()];
}
