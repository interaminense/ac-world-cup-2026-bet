import {describe, expect, it} from 'vitest';

import {flagCode} from './flags';

describe('flagCode', () => {
	it('maps obvious names to their ISO code', () => {
		expect(flagCode('Brazil')).toBe('br');
		expect(flagCode('Spain')).toBe('es');
		expect(flagCode('Mexico')).toBe('mx');
		expect(flagCode('South Africa')).toBe('za');
	});

	it('maps the special FIFA names', () => {
		expect(flagCode('Korea Republic')).toBe('kr');
		expect(flagCode('IR Iran')).toBe('ir');
		expect(flagCode('Türkiye')).toBe('tr');
		expect(flagCode("Côte d'Ivoire")).toBe('ci');
		expect(flagCode('Cabo Verde')).toBe('cv');
		expect(flagCode('Congo DR')).toBe('cd');
		expect(flagCode('USA')).toBe('us');
		expect(flagCode('Czechia')).toBe('cz');
		expect(flagCode('Curaçao')).toBe('cw');
		expect(flagCode('Bosnia and Herzegovina')).toBe('ba');
	});

	it('maps the UK nations to GB subdivision codes', () => {
		expect(flagCode('England')).toBe('gb-eng');
		expect(flagCode('Scotland')).toBe('gb-sct');
		expect(flagCode('Wales')).toBe('gb-wls');
	});

	it('returns undefined for an unknown name', () => {
		expect(flagCode('Wakanda')).toBeUndefined();
	});
});
