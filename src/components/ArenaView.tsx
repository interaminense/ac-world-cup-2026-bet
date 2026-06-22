// src/components/ArenaView.tsx
import {type MouseEvent, useRef} from 'react';

import {sortScores} from '../lib/arena';
import {useArena} from '../lib/useArena';
import {Avatar} from './Avatar';

export function ArenaView({
	identity,
	onRequestIdentify,
}: {
	identity: string | null;
	onRequestIdentify: () => void;
}) {
	const {ball, cursors, moveCursor, scores, tryClaim} = useArena(identity);
	const fieldRef = useRef<HTMLDivElement>(null);

	const toFraction = (event: MouseEvent) => {
		const rect = fieldRef.current?.getBoundingClientRect();

		if (!rect) {
			return null;
		}

		return {
			x: (event.clientX - rect.left) / rect.width,
			y: (event.clientY - rect.top) / rect.height,
		};
	};

	const ranked = sortScores(scores);

	return (
		<div>
			<div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm text-slate-400 sm:hidden">
				⚽ Arena is available on desktop.
			</div>

			<div className="hidden sm:block">
				{!identity && (
					<div className="mb-3 flex items-center justify-between rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-4 py-3">
						<span className="text-sm text-slate-300">
							Pick a name to join the arena and score.
						</span>

						<button
							className="shrink-0 rounded-full bg-emerald-500 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-emerald-400"
							onClick={onRequestIdentify}
						>
							👋 Who are you?
						</button>
					</div>
				)}

				<div className="flex gap-4">
					<div
						className="relative h-[70vh] flex-1 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-950/40 to-slate-950"
						onClick={(event) => {
							const point = toFraction(event);

							if (point) {
								tryClaim(point.x, point.y);
							}
						}}
						onMouseMove={(event) => {
							const point = toFraction(event);

							if (point) {
								moveCursor(point.x, point.y);
							}
						}}
						ref={fieldRef}
					>
						{ball && !ball.claimedBy && (
							<span
								className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 text-3xl drop-shadow-lg"
								style={{left: `${ball.x * 100}%`, top: `${ball.y * 100}%`}}
							>
								⚽
							</span>
						)}

						{cursors.map((cursor) => (
							<div
								className="pointer-events-none absolute flex -translate-y-1 items-center gap-1"
								key={cursor.uid}
								style={{
									left: `${cursor.x * 100}%`,
									top: `${cursor.y * 100}%`,
								}}
							>
								<span aria-hidden className="text-lg text-emerald-300">
									➤
								</span>

								<span className="rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
									{cursor.name}
								</span>
							</div>
						))}
					</div>

					<div className="w-48 shrink-0 self-start rounded-2xl border border-white/10 bg-white/5 p-3">
						<p className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
							Scores
						</p>

						{ranked.length === 0 ? (
							<p className="text-xs text-slate-500">
								No goals yet — click the ball!
							</p>
						) : (
							<ul className="space-y-1.5">
								{ranked.map(([name, score]) => (
									<li className="flex items-center gap-2" key={name}>
										<Avatar
											className="h-6 w-6 shrink-0 rounded-full"
											name={name}
										/>

										<span className="min-w-0 flex-1 truncate text-sm text-slate-200">
											{name}
										</span>

										<span className="font-display text-sm font-bold text-white">
											{score}
										</span>
									</li>
								))}
							</ul>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
