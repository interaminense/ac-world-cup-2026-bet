import {flagUrl} from '../lib/flags';

interface FlagProps {
	className?: string;
	team: string;
}

export function Flag({className = 'h-3.5 w-5', team}: FlagProps) {
	const url = flagUrl(team, 40);

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
