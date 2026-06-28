// Shown when chat is restricted to signed-in users and the viewer is logged
// out. The chat button stays visible so the feature is discoverable; opening it
// surfaces a sign-in prompt instead of the conversation, keeping the messages
// private to signed-in users.
export function ChatLockedPanel({
	onClose,
	onSignIn,
}: {
	onClose: () => void;
	onSignIn: () => void;
}) {
	return (
		<div className="fixed inset-y-0 left-14 right-0 z-50 flex flex-col overflow-hidden border-l border-white/10 bg-slate-900 shadow-2xl sm:left-auto sm:w-80 md:w-96">
			<div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
				<div className="min-w-0">
					<p className="text-[10px] font-semibold uppercase tracking-wider text-sky-400">
						Chat
					</p>

					<p className="truncate text-sm font-medium text-white">
						Everyone online
					</p>
				</div>

				<button
					aria-label="Close chat"
					className="ml-3 shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
					onClick={onClose}
				>
					✕
				</button>
			</div>

			<div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
				<span aria-hidden className="text-4xl">
					💬
				</span>

				<p className="text-sm text-slate-300">
					Please log in to chat with everyone.
				</p>

				<button
					className="rounded-full bg-sky-500 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-400"
					onClick={onSignIn}
				>
					Sign in with Google
				</button>
			</div>
		</div>
	);
}
