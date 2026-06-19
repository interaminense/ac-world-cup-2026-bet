import {flagUrl} from '../lib/flags';

interface FlagProps {
	className?: string;
	team: string;
	// Source pixel width to fetch from flagcdn (40/80/160/320…). Bump it where
	// the flag renders large — a 40px source upscaled looks blurry.
	width?: number;
}

export function Flag({className = 'h-3.5 w-5', team, width = 80}: FlagProps) {
	const url = flagUrl(team, width);

	if (!url) {
		return null;
	}

	return (
		<img
			alt=""
			aria-hidden
			className={`inline-block shrink-0 rounded-[2px] object-cover ${className}`}
			loading="lazy"
			src={url}
		/>
	);
}
