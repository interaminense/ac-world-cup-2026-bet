import {useState} from 'react';

import {Avatar} from './Avatar';

// The signed-in user's own profile: edit the display nickname and opt into the
// knockout pool (which the owner then approves).
export function ProfileView({
	approved,
	isAnonymous,
	name,
	nickname,
	onRequestKnockout,
	onSetNickname,
	onSignIn,
	pending,
	photoURL,
}: {
	approved: boolean;
	isAnonymous: boolean;
	name: string | null;
	nickname: string | null;
	onRequestKnockout: () => void;
	onSetNickname: (value: string) => void;
	onSignIn: () => void;
	pending: boolean;
	photoURL: string | null;
}) {
	const [draft, setDraft] = useState(nickname ?? '');
	const [saved, setSaved] = useState(false);

	if (isAnonymous) {
		return (
			<div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-12 text-center">
				<p className="mb-4 text-sm text-slate-300">
					Entre com Google para gerenciar seu perfil e participar do
					mata-mata.
				</p>

				<button
					className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-bold text-emerald-950 transition hover:bg-emerald-400"
					onClick={onSignIn}
				>
					Entrar com Google
				</button>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-3">
				{photoURL ? (
					<img
						alt=""
						className="h-12 w-12 rounded-full object-cover"
						referrerPolicy="no-referrer"
						src={photoURL}
					/>
				) : (
					<Avatar
						className="h-12 w-12 rounded-full"
						name={name ?? '?'}
					/>
				)}

				<div className="min-w-0">
					<p className="truncate text-lg font-semibold text-white">
						{nickname || name}
					</p>

					<p className="truncate text-xs text-slate-400">{name}</p>
				</div>
			</div>

			<section className="rounded-2xl border border-white/10 bg-white/5 p-4">
				<h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
					Apelido
				</h3>

				<div className="flex gap-2">
					<input
						className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/50"
						maxLength={24}
						onChange={(event) => {
							setDraft(event.target.value);
							setSaved(false);
						}}
						placeholder={name ?? 'Seu apelido'}
						value={draft}
					/>

					<button
						className="shrink-0 rounded-lg bg-emerald-500 px-4 text-sm font-bold text-emerald-950 transition hover:bg-emerald-400"
						onClick={() => {
							onSetNickname(draft);
							setSaved(true);
						}}
					>
						Salvar
					</button>
				</div>

				{saved && (
					<p className="mt-2 text-xs text-emerald-400">✓ salvo</p>
				)}
			</section>

			<section className="rounded-2xl border border-white/10 bg-white/5 p-4">
				<h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
					Mata-mata
				</h3>

				{approved ? (
					<p className="text-sm text-emerald-300">
						✅ Você está no bolão do mata-mata.
					</p>
				) : pending ? (
					<p className="text-sm text-amber-300">
						⏳ Pedido enviado — aguardando aprovação do admin.
					</p>
				) : (
					<>
						<p className="mb-3 text-sm text-slate-300">
							Participe da fase de mata-mata com um ranking zerado
							para todos.
						</p>

						<button
							className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-bold text-emerald-950 transition hover:bg-emerald-400"
							onClick={onRequestKnockout}
						>
							Participar do mata-mata
						</button>
					</>
				)}
			</section>
		</div>
	);
}
