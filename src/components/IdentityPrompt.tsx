import type {Participant} from '../lib/types';
import {Avatar} from './Avatar';

// First-visit prompt: pick yourself so the group sees you online. Persisted by
// useIdentity, so it only shows once. "Just watching" keeps you a guest.
export function IdentityPrompt({
	onChoose,
	participants,
}: {
	onChoose: (name: string | null) => void;
	participants: Participant[];
}) {
	return (
		<div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
			<div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
				<h2 className="font-display text-xl font-bold text-white">
					Who are you? 👋
				</h2>

				<p className="mt-1 text-sm text-slate-400">
					Pick yourself so the group sees you online.
				</p>

				<div className="mt-4 grid grid-cols-3 gap-1.5 sm:grid-cols-4">
					{participants.map((participant) => (
						<button
							className="flex flex-col items-center gap-1.5 rounded-xl p-2 transition hover:bg-white/5"
							key={participant.name}
							onClick={() => onChoose(participant.name)}
						>
							<Avatar
								className="h-12 w-12 rounded-full"
								name={participant.name}
							/>

							<span className="w-full truncate text-center text-xs text-slate-300">
								{participant.name}
							</span>
						</button>
					))}
				</div>

				<button
					className="mt-4 w-full rounded-xl bg-white/5 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-white/10 hover:text-slate-200"
					onClick={() => onChoose(null)}
				>
					I'm just watching
				</button>
			</div>
		</div>
	);
}
