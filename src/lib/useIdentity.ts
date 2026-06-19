import {useState} from 'react';

const KEY = 'wc2026:me';
const GUEST = '__guest__';

// Who the viewer says they are, persisted in localStorage. `name` is a
// participant name, or null for a guest ("just watching"). `chosen` is false
// until they answer the prompt the first time.
export function useIdentity(): {
	choose: (name: string | null) => void;
	chosen: boolean;
	name: string | null;
} {
	const [raw, setRaw] = useState<string | null>(() => {
		try {
			return localStorage.getItem(KEY);
		}
		catch {
			return null;
		}
	});

	const choose = (name: string | null) => {
		const stored = name ?? GUEST;

		try {
			localStorage.setItem(KEY, stored);
		}
		catch {
			// Private mode / storage disabled — keep it in memory only.
		}

		setRaw(stored);
	};

	return {
		choose,
		chosen: raw !== null,
		name: raw && raw !== GUEST ? raw : null,
	};
}
