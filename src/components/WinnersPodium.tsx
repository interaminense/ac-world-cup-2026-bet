import {type LeaderboardRow, topWinners} from '../lib/ranking';
import {Avatar} from './Avatar';

const MEDALS: Record<number, {accent: string; medal: string; ring: string}> = {
	1: {accent: 'text-amber-300', medal: '🥇', ring: 'ring-amber-400'},
	2: {accent: 'text-slate-200', medal: '🥈', ring: 'ring-slate-300'},
	3: {accent: 'text-orange-300', medal: '🥉', ring: 'ring-orange-400'},
};

function Place({
	elevated,
	place,
	row,
}: {
	elevated: boolean;
	place: number;
	row: LeaderboardRow;
}) {
	const {accent, medal, ring} = MEDALS[place];

	return (
		<div
			className={`flex w-16 shrink-0 flex-col items-center text-center ${
				elevated ? '-translate-y-2' : ''
			}`}
		>
			<span aria-hidden className="text-lg leading-none">
				{medal}
			</span>

			<Avatar
				className={`mt-1 rounded-xl ring-2 ${ring} ${
					elevated ? 'h-16 w-16 text-xl' : 'h-11 w-11 text-sm'
				}`}
				name={row.name}
				photoURL={row.photoURL}
			/>

			<span className="mt-1.5 w-full truncate text-xs font-semibold text-white">
				{row.name}
			</span>

			<span className={`text-sm font-bold ${accent}`}>{row.total} pts</span>
		</div>
	);
}

// The leaderboard's top three, as a podium. Mobile: a band right under the
// header. Desktop: floats bottom-left (the chat button floats bottom-right).
// Rendered only when the admin has turned it on (see settings/showWinners).
export function WinnersPodium({rows}: {rows: LeaderboardRow[]}) {
	const [first, second, third] = topWinners(rows);

	if (!first) {
		return null;
	}

	return (
		<div className="border-b border-white/10 bg-slate-900/95 px-4 py-3 sm:fixed sm:bottom-4 sm:left-4 sm:z-40 sm:w-auto sm:rounded-2xl sm:border sm:border-amber-400/20 sm:shadow-2xl sm:backdrop-blur">
			<p className="mb-4 text-center text-[10px] font-semibold uppercase tracking-[0.25em] text-amber-400">
				🏆 Pódio
			</p>

			<div className="flex items-end justify-center gap-0.5">
				{second && <Place elevated={false} place={2} row={second} />}

				<Place elevated place={1} row={first} />

				{third && <Place elevated={false} place={3} row={third} />}
			</div>
		</div>
	);
}
