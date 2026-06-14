import {useEffect, useRef, useState} from 'react';

import {colorByName} from '../lib/colors';
import {kickoffDate} from '../lib/kickoff';
import type {TimelineFrame} from '../lib/timeline';
import {Avatar} from './Avatar';

// Vertical slot per row (bar height + gap), in pixels. Rows are absolutely
// positioned at `index * ROW_H` so a changed rank glides via a transform.
const ROW_H = 48;

const PLAY_INTERVAL_MS = 1300;

// One shared glide for both the reorder (translateY) and the bar length
// (scaleX). Animating transforms only — never width/top — keeps the work on
// the GPU compositor, so the whole field can move at once and still read
// smooth.
const GLIDE = 'transform 700ms cubic-bezier(0.22, 1, 0.36, 1)';

function frameLabel(frame: TimelineFrame): string {
	const kickoff = kickoffDate(frame.date, frame.time);

	if (!kickoff) {
		return frame.date;
	}

	return kickoff.toLocaleDateString('en-US', {
		day: 'numeric',
		month: 'short',
	});
}

export function PointsTimeline({frames}: {frames: TimelineFrame[]}) {
	const [index, setIndex] = useState(() => Math.max(0, frames.length - 1));
	const [playing, setPlaying] = useState(false);
	const touched = useRef(false);

	// Follow the latest match until the user grabs the scrubber; afterwards,
	// just keep their position in range as new frames arrive.
	useEffect(() => {
		setIndex((current) =>
			touched.current
				? Math.min(current, Math.max(0, frames.length - 1))
				: Math.max(0, frames.length - 1)
		);
	}, [frames.length]);

	useEffect(() => {
		if (!playing) {
			return undefined;
		}

		const id = setInterval(() => {
			setIndex((current) => {
				if (current >= frames.length - 1) {
					setPlaying(false);

					return current;
				}

				return current + 1;
			});
		}, PLAY_INTERVAL_MS);

		return () => clearInterval(id);
	}, [playing, frames.length]);

	if (frames.length === 0) {
		return (
			<div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-12 text-center">
				<p className="font-display text-lg font-bold text-white">
					No results to rewind yet ⏳
				</p>

				<p className="mt-1 text-sm text-slate-400">
					The timeline unlocks after the first match is final.
				</p>
			</div>
		);
	}

	const safeIndex = Math.min(index, frames.length - 1);
	const frame = frames[safeIndex];

	// The leader's total sets the scale: their bar fills the whole card, every
	// other bar is drawn proportionally to it.
	const maxTotal = Math.max(1, frame.standings[0]?.total ?? 0);
	const colors = colorByName(frame.standings.map((row) => row.name));

	const seek = (next: number) => {
		touched.current = true;
		setPlaying(false);
		setIndex(Math.max(0, Math.min(next, frames.length - 1)));
	};

	const togglePlay = () => {
		touched.current = true;

		if (!playing && safeIndex >= frames.length - 1) {
			setIndex(0);
		}

		setPlaying((value) => !value);
	};

	return (
		<div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4">
			<div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
				<p className="font-display text-base font-bold text-white">
					{frame.team1}{' '}
					<span className="text-amber-300">
						{frame.r1}–{frame.r2}
					</span>{' '}
					{frame.team2}
				</p>

				<p className="text-xs text-slate-400">
					Match {frame.matchNo} · {frameLabel(frame)} ·{' '}
					{safeIndex + 1}/{frames.length}
				</p>
			</div>

			<div
				className="relative"
				style={{height: frame.standings.length * ROW_H}}
			>
				{frame.standings.map((row, position) => {
					const color = colors.get(row.name) ?? '#94a3b8';

					return (
						<div
							className="absolute inset-x-0"
							key={row.name}
							style={{
								transform: `translateY(${position * ROW_H}px)`,
								transition: GLIDE,
								willChange: 'transform',
							}}
						>
							<div className="relative flex h-10 items-center overflow-hidden rounded-lg bg-white/5">
								<div
									className="absolute inset-y-0 left-0 w-full origin-left"
									style={{
										backgroundColor: color,
										opacity: 0.3,
										transform: `scaleX(${row.total / maxTotal})`,
										transition: GLIDE,
										willChange: 'transform',
									}}
								/>

								<div className="relative flex w-full items-center gap-2.5 px-3">
									<span className="w-4 text-center text-xs font-semibold tabular-nums text-slate-400">
										{row.rank}
									</span>

									<Avatar
										className="h-6 w-6 rounded-full"
										name={row.name}
									/>

									<span className="flex-1 truncate text-sm font-medium text-white">
										{row.name}
									</span>

									{row.gained > 0 && (
										<span className="text-xs font-bold text-emerald-300">
											+{row.gained}
										</span>
									)}

									<span className="w-8 text-right font-display text-base font-bold tabular-nums text-white">
										{row.total}
									</span>
								</div>
							</div>
						</div>
					);
				})}
			</div>

			<div className="flex items-center gap-3">
				<button
					aria-label={playing ? 'Pause' : 'Play'}
					className="shrink-0 rounded-full bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-emerald-950 transition-colors hover:bg-emerald-400"
					onClick={togglePlay}
				>
					{playing ? '⏸' : '▶'}
				</button>

				<button
					aria-label="Previous match"
					className="shrink-0 rounded-full bg-white/5 px-3 py-1.5 text-sm font-medium text-slate-300 transition-colors hover:bg-white/10 disabled:opacity-30"
					disabled={safeIndex === 0}
					onClick={() => seek(safeIndex - 1)}
				>
					◀
				</button>

				<input
					aria-label="Match timeline"
					className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-white/15 accent-emerald-500"
					max={frames.length - 1}
					min={0}
					onChange={(event) => seek(Number(event.target.value))}
					step={1}
					type="range"
					value={safeIndex}
				/>

				<button
					aria-label="Next match"
					className="shrink-0 rounded-full bg-white/5 px-3 py-1.5 text-sm font-medium text-slate-300 transition-colors hover:bg-white/10 disabled:opacity-30"
					disabled={safeIndex === frames.length - 1}
					onClick={() => seek(safeIndex + 1)}
				>
					▶
				</button>
			</div>
		</div>
	);
}
