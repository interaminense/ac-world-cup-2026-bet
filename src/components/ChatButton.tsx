// Floating button that opens the global chat from any page.
export function ChatButton({
	onClick,
	unread = 0,
}: {
	onClick: () => void;
	unread?: number;
}) {
	return (
		<button
			aria-label="Open chat"
			className="fixed bottom-4 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-sky-500 text-xl shadow-lg transition-colors hover:bg-sky-400"
			onClick={onClick}
		>
			💬
			{unread > 0 && (
				<span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
					{unread > 9 ? '9+' : unread}
				</span>
			)}
		</button>
	);
}
