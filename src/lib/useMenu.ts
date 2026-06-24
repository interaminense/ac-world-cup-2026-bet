import {onValue, ref, set, update} from 'firebase/database';
import {useEffect, useState} from 'react';

import {db} from './firebase';
import {type MenuConfig, NAV_ITEMS, orderMenu} from './nav';

// menu/{order,hidden} — public read so every client renders the owner's chosen
// menu; only the owner writes (via the admin menu manager).
export function useMenu(): {
	config: MenuConfig;
	move: (id: string, direction: -1 | 1) => void;
	setHidden: (id: string, hidden: boolean) => void;
} {
	const [config, setConfig] = useState<MenuConfig>({});

	useEffect(
		() =>
			onValue(ref(db, 'menu'), (snapshot) => {
				setConfig((snapshot.val() as MenuConfig) ?? {});
			}),
		[]
	);

	return {
		config,
		move: (id, direction) => {
			const ids = orderMenu(NAV_ITEMS, config).map((item) => item.id);
			const from = ids.indexOf(id);
			const to = from + direction;

			if (from < 0 || to < 0 || to >= ids.length) {
				return;
			}

			[ids[from], ids[to]] = [ids[to], ids[from]];

			set(ref(db, 'menu/order'), ids);
		},
		setHidden: (id, hidden) => {
			update(ref(db, 'menu/hidden'), {[id]: hidden});
		},
	};
}
