import {writeFileSync} from 'node:fs';

import {fetchKnockout} from './knockout.mjs';

// Snapshot the FIFA knockout fixtures (bracket slots + dates; teams fill in as
// the groups finish) into src/data/knockout.json — the bracket's bundled
// baseline before the live poller takes over.
const matches = await fetchKnockout();

writeFileSync(
	new URL('../src/data/knockout.json', import.meta.url),
	`${JSON.stringify(matches, null, '\t')}\n`
);
console.log(`Wrote ${matches.length} knockout matches to src/data/knockout.json`);
