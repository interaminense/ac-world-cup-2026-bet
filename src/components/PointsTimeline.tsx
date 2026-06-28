import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from 'react';

import {getAvatarUrl} from '../lib/avatars';
import {colorByName} from '../lib/colors';
import {kickoffDate} from '../lib/kickoff';
import type {TimelineFrame} from '../lib/timeline';

const ROW_H = 46;
const BAR_H = 34;
const BAR_Y = (ROW_H - BAR_H) / 2;
const AVATAR = 26;
const NAME_X = 7 + AVATAR + 9;
const RIGHT_PAD = 48;

// Milliseconds the auto-play spends gliding through one match → next match.
const STEP_MS = 950;

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
	const L = frames.length;

	// Per-participant series: their total and their slot (row index) at every
	// frame. The render loop interpolates between consecutive frames, so the
	// bars glide and overtake continuously instead of snapping.
	const {colors, names, slotsByName, totalsByName} = useMemo(() => {
		const nameSet = new Set<string>();

		frames.forEach((frame) =>
			frame.standings.forEach((row) => nameSet.add(row.name))
		);

		const names = [...nameSet];
		const totalsByName = new Map<string, number[]>(
			names.map((name) => [name, []])
		);
		const slotsByName = new Map<string, number[]>(
			names.map((name) => [name, []])
		);

		frames.forEach((frame) => {
			const byName = new Map(
				frame.standings.map((row, slot) => [row.name, {slot, total: row.total}])
			);

			names.forEach((name) => {
				const entry = byName.get(name);

				totalsByName.get(name)!.push(entry?.total ?? 0);
				slotsByName.get(name)!.push(entry?.slot ?? names.length - 1);
			});
		});

		return {colors: colorByName(names), names, slotsByName, totalsByName};
	}, [frames]);

	const containerRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const rowsRef = useRef<
		Record<string, {g?: SVGGElement | null; rect?: SVGRectElement | null; val?: SVGTextElement | null}>
	>({});
	const tRef = useRef(Math.max(0, L - 1));
	const playRaf = useRef(0);
	const tweenRaf = useRef(0);
	const lastHeader = useRef(-1);
	const touched = useRef(false);

	const [width, setWidth] = useState(0);
	const [playing, setPlaying] = useState(false);
	const [headerIndex, setHeaderIndex] = useState(() => Math.max(0, L - 1));

	const syncHeader = useCallback(
		(t: number) => {
			const idx = Math.max(0, Math.min(Math.round(t), L - 1));

			if (idx !== lastHeader.current) {
				lastHeader.current = idx;
				setHeaderIndex(idx);
			}
		},
		[L]
	);

	const renderAt = useCallback(
		(t: number) => {
			if (L === 0 || width === 0) {
				return;
			}

			const i = Math.max(0, Math.min(Math.floor(t), L - 1));
			const j = Math.min(i + 1, L - 1);
			const f = t - i;

			let max = 1;
			const values: Record<string, number> = {};
			const slots: Record<string, number> = {};

			for (const name of names) {
				const totals = totalsByName.get(name)!;
				const rowSlots = slotsByName.get(name)!;
				const value = totals[i] + (totals[j] - totals[i]) * f;

				values[name] = value;
				slots[name] = rowSlots[i] + (rowSlots[j] - rowSlots[i]) * f;

				if (value > max) {
					max = value;
				}
			}

			const barMax = Math.max(0, width - RIGHT_PAD);

			for (const name of names) {
				const row = rowsRef.current[name];

				if (!row?.g) {
					continue;
				}

				row.g.setAttribute('transform', `translate(0, ${slots[name] * ROW_H})`);

				row.rect?.setAttribute(
					'width',
					String((values[name] / max) * barMax)
				);

				if (row.val) {
					row.val.textContent = String(Math.round(values[name]));
					row.val.setAttribute('x', String(width - 12));
				}
			}
		},
		[L, names, slotsByName, totalsByName, width]
	);

	// Measure the container so the chart renders in crisp 1:1 pixels (text and
	// avatars stay a consistent size across breakpoints).
	useLayoutEffect(() => {
		const element = containerRef.current;

		if (!element) {
			return undefined;
		}

		const observer = new ResizeObserver((entries) =>
			setWidth(entries[0].contentRect.width)
		);

		observer.observe(element);
		setWidth(element.clientWidth);

		return () => observer.disconnect();
	}, []);

	useLayoutEffect(() => {
		renderAt(tRef.current);
		syncHeader(tRef.current);

		if (inputRef.current) {
			inputRef.current.value = String(tRef.current);
		}
	}, [renderAt, syncHeader]);

	// Follow the newest match until the user grabs the controls.
	useEffect(() => {
		tRef.current = touched.current
			? Math.min(tRef.current, Math.max(0, L - 1))
			: Math.max(0, L - 1);

		renderAt(tRef.current);
		syncHeader(tRef.current);

		if (inputRef.current) {
			inputRef.current.value = String(tRef.current);
		}
	}, [L, renderAt, syncHeader]);

	useEffect(() => {
		if (!playing) {
			return undefined;
		}

		let last: number | null = null;

		const tick = (now: number) => {
			last ??= now;
			const next = Math.min(tRef.current + (now - last) / STEP_MS, L - 1);

			last = now;
			tRef.current = next;
			renderAt(next);
			syncHeader(next);

			if (inputRef.current) {
				inputRef.current.value = String(next);
			}

			if (next >= L - 1) {
				setPlaying(false);

				return;
			}

			playRaf.current = requestAnimationFrame(tick);
		};

		playRaf.current = requestAnimationFrame(tick);

		return () => cancelAnimationFrame(playRaf.current);
	}, [playing, L, renderAt, syncHeader]);

	useEffect(() => () => cancelAnimationFrame(tweenRaf.current), []);

	const settle = (t: number) => {
		tRef.current = t;
		renderAt(t);
		syncHeader(t);

		if (inputRef.current) {
			inputRef.current.value = String(t);
		}
	};

	// Eased glide to a target frame, for the step buttons.
	const tweenTo = (target: number) => {
		cancelAnimationFrame(tweenRaf.current);

		const start = tRef.current;
		const distance = target - start;

		if (distance === 0) {
			return;
		}

		let t0: number | null = null;

		const step = (now: number) => {
			t0 ??= now;

			const progress = Math.min(1, (now - t0) / 550);
			const eased = 1 - (1 - progress) ** 3;

			settle(start + distance * eased);

			if (progress < 1) {
				tweenRaf.current = requestAnimationFrame(step);
			}
		};

		tweenRaf.current = requestAnimationFrame(step);
	};

	const stepBy = (delta: number) => {
		touched.current = true;
		setPlaying(false);

		tweenTo(
			Math.max(0, Math.min(Math.round(tRef.current) + delta, L - 1))
		);
	};

	const onScrub = (value: number) => {
		touched.current = true;
		setPlaying(false);
		cancelAnimationFrame(tweenRaf.current);
		settle(Math.max(0, Math.min(value, L - 1)));
	};

	const togglePlay = () => {
		touched.current = true;
		cancelAnimationFrame(tweenRaf.current);

		if (!playing && tRef.current >= L - 1) {
			settle(0);
		}

		setPlaying((value) => !value);
	};

	if (L === 0) {
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

	const frame = frames[headerIndex];

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
					{headerIndex + 1}/{L}
				</p>
			</div>

			<div ref={containerRef}>
				<svg
					height={names.length * ROW_H}
					width={width || '100%'}
				>
					<defs>
						<clipPath clipPathUnits="objectBoundingBox" id="ptl-avatar">
							<circle cx="0.5" cy="0.5" r="0.5" />
						</clipPath>
					</defs>

					{names.map((name) => {
						const color = colors.get(name) ?? '#94a3b8';
						const url = getAvatarUrl(name);

						return (
							<g
								key={name}
								ref={(node) => {
									rowsRef.current[name] = {
										...rowsRef.current[name],
										g: node,
									};
								}}
							>
								<rect
									fill={color}
									height={BAR_H}
									opacity={0.32}
									ref={(node) => {
										rowsRef.current[name] = {
											...rowsRef.current[name],
											rect: node,
										};
									}}
									rx={8}
									width={0}
									x={0}
									y={BAR_Y}
								/>

								{url ? (
									<image
										clipPath="url(#ptl-avatar)"
										height={AVATAR}
										href={url}
										preserveAspectRatio="xMidYMid slice"
										width={AVATAR}
										x={7}
										y={(ROW_H - AVATAR) / 2}
									/>
								) : (
									<circle
										cx={7 + AVATAR / 2}
										cy={ROW_H / 2}
										fill={color}
										r={AVATAR / 2}
									/>
								)}

								<text
									dominantBaseline="central"
									fill="#ffffff"
									fontSize={14}
									fontWeight={500}
									x={NAME_X}
									y={ROW_H / 2}
								>
									{name}
								</text>

								<text
									dominantBaseline="central"
									fill="#ffffff"
									fontSize={15}
									fontWeight={700}
									ref={(node) => {
										rowsRef.current[name] = {
											...rowsRef.current[name],
											val: node,
										};
									}}
									textAnchor="end"
									x={0}
									y={ROW_H / 2}
								>
									0
								</text>
							</g>
						);
					})}
				</svg>
			</div>

			<div className="flex items-center gap-3">
				<button
					aria-label={playing ? 'Pause' : 'Play'}
					className="shrink-0 rounded-full bg-sky-500 px-3 py-1.5 text-sm font-semibold text-sky-950 transition-colors hover:bg-sky-400"
					onClick={togglePlay}
				>
					{playing ? '⏸' : '▶'}
				</button>

				<button
					aria-label="Previous match"
					className="shrink-0 rounded-full bg-white/5 px-3 py-1.5 text-sm font-medium text-slate-300 transition-colors hover:bg-white/10 disabled:opacity-30"
					disabled={headerIndex === 0}
					onClick={() => stepBy(-1)}
				>
					◀
				</button>

				<input
					aria-label="Match timeline"
					className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-white/15 accent-sky-500"
					defaultValue={Math.max(0, L - 1)}
					max={L - 1}
					min={0}
					onChange={(event) => onScrub(Number(event.target.value))}
					ref={inputRef}
					step={0.001}
					type="range"
				/>

				<button
					aria-label="Next match"
					className="shrink-0 rounded-full bg-white/5 px-3 py-1.5 text-sm font-medium text-slate-300 transition-colors hover:bg-white/10 disabled:opacity-30"
					disabled={headerIndex === L - 1}
					onClick={() => stepBy(1)}
				>
					▶
				</button>
			</div>
		</div>
	);
}
