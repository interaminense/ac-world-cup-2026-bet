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

	return (
		<span
			className={`flex shrink-0 items-center justify-center bg-white/10 font-display font-bold text-slate-300 ${className}`}
		>
			{name.charAt(0)}
		</span>
	);
}
