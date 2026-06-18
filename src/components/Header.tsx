interface HeaderProps {
	onMenuClick: () => void;
	statusText: string;
}

export function Header({onMenuClick, statusText}: HeaderProps) {
	return (
		<header className="border-b border-white/10 bg-gradient-to-r from-emerald-950 via-slate-950 to-emerald-950">
			<div className="mx-auto flex max-w-5xl items-start justify-between gap-3 px-4 py-5">
				<div className="min-w-0">
					<p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-400">
						Analytics Cloud
					</p>

					<h1 className="font-display text-3xl font-bold text-white sm:text-4xl">
						World Cup 2026 <span className="text-amber-400">BET</span>
					</h1>

					<span className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
						<span
							aria-hidden
							className="inline-block animate-spin"
							title="Updates automatically"
						>
							⚽
						</span>

						{statusText}
					</span>
				</div>

				<button
					aria-label="Open menu"
					className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10"
					onClick={onMenuClick}
				>
					<svg
						aria-hidden
						className="h-5 w-5"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						viewBox="0 0 24 24"
					>
						<line x1="3" x2="21" y1="6" y2="6" />

						<line x1="3" x2="21" y1="12" y2="12" />

						<line x1="3" x2="21" y1="18" y2="18" />
					</svg>
				</button>
			</div>
		</header>
	);
}
