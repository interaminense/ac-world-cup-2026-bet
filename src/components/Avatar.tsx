import {getAvatarUrl} from '../lib/avatars';

interface AvatarProps {
	className: string;
	name: string;
	photoURL?: string | null;
}

export function Avatar({className, name, photoURL}: AvatarProps) {
	// Known pool member → their Slack photo; else the profile photo (e.g. a new
	// Google participant); else the initial below.
	const url = getAvatarUrl(name) ?? photoURL ?? undefined;

	if (url) {
		return (
			<img
				alt={name}
				className={`shrink-0 object-cover ${className}`}
				loading="lazy"
				referrerPolicy="no-referrer"
				src={url}
			/>
		);
	}

	// The match bot gets its own look: a ⚽ on the brand emerald.
	const isBot = name === '⚽ Match Bot';

	return (
		<span
			className={`flex shrink-0 items-center justify-center font-display font-bold ${
				isBot
					? 'bg-emerald-500/30 text-emerald-100'
					: 'bg-white/10 text-slate-300'
			} ${className}`}
		>
			{name.charAt(0)}
		</span>
	);
}
