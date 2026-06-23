import {getAvatarUrl} from '../lib/avatars';

interface AvatarProps {
	className: string;
	name: string;
}

export function Avatar({className, name}: AvatarProps) {
	const url = getAvatarUrl(name);

	if (url) {
		return (
			<img
				alt={name}
				className={`shrink-0 object-cover ${className}`}
				loading="lazy"
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
