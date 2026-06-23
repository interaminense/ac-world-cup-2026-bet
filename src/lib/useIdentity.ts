import {useState} from 'react';

const KEY = 'wc2026:me';

// The viewer's identity: a participant name, or null for anonymous. Persisted
// in localStorage so it sticks across sessions — they identify once (from the
// header) and it's remembered; no name = browsing anonymously.
export function useIdentity(): {
	choose: (name: string | null) => void;
	name: string | null;
} {
	const [name, setName] = useState<string | null>(() => {
		try {
			return localStorage.getItem(KEY);
		}
		catch {
			return null;
		}
	});

	const choose = (value: string | null) => {
		try {
			if (value) {
				localStorage.setItem(KEY, value);
			}
			else {
				localStorage.removeItem(KEY);
			}
		}
		catch {
			// Private mode / storage disabled — keep it in memory only.
		}

		setName(value);
	};

	return {choose, name};
}
