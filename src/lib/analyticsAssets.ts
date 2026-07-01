// Marks DOM elements as Analytics Cloud "object-entry" assets so the AC SDK
// (loaded and initialized in analyticsCloud.ts) fires an impression/view event
// when they enter the viewport. Returns a spreadable set of data-* attributes;
// the SDK's objectEntry plugin does the rest — no per-element JS call.
//
// The bolão has no Liferay Objects, so each domain entity is modeled as a
// synthetic object entry: a stable externalReferenceCode plus an object-
// DefinitionName we pick. Two asset kinds are tracked — matches and pool
// participants. `action` is a passive "impression" (the element appeared) or a
// deeper "view" (the entity's own page was opened).

import {participantSlug} from './auth';

interface AssetAttributes {
	'data-analytics-asset-action': 'impression' | 'view';
	'data-analytics-asset-title': string;
	'data-analytics-asset-type': 'object-entry';
	'data-analytics-external-reference-code': string;
	'data-analytics-object-definition-name': string;
}

// A World Cup match (group or knockout). `matchNumber` is the stable id and the
// title is the resolved matchup. No categories: the pool has no real taxonomy,
// and AC expects that field as a JSON array of {id, name, vocabularyId}.
export function matchAssetProps(
	match: {
		matchNumber: number;
		teamA: string | null;
		teamB: string | null;
	},
	action: 'impression' | 'view' = 'impression'
): AssetAttributes {
	return {
		'data-analytics-asset-action': action,
		'data-analytics-asset-title': `${match.teamA} vs ${match.teamB}`,
		'data-analytics-asset-type': 'object-entry',
		'data-analytics-external-reference-code': `match-${match.matchNumber}`,
		'data-analytics-object-definition-name': 'WorldCupMatch',
	};
}

// A pool participant. The slug keeps the id stable regardless of name casing.
export function participantAssetProps(
	name: string,
	action: 'impression' | 'view' = 'impression'
): AssetAttributes {
	return {
		'data-analytics-asset-action': action,
		'data-analytics-asset-title': name,
		'data-analytics-asset-type': 'object-entry',
		'data-analytics-external-reference-code': `participant-${participantSlug(
			name
		)}`,
		'data-analytics-object-definition-name': 'PoolParticipant',
	};
}
