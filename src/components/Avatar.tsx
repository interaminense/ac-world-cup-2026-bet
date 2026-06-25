import {resolveAvatarUrl} from '../lib/avatars';
import {usePhotos} from './PhotosContext';

interface AvatarProps {
	className: string;
	name: string;
	photoURL?: string | null;
}

export function Avatar({className, name, photoURL}: AvatarProps) {
	const photos = usePhotos();

	// Signed-in user's Google photo (explicit prop, or by name) → the
	// participant's Slack photo → the initial below.
	const url = resolveAvatarUrl(name, photoURL, photos);

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
