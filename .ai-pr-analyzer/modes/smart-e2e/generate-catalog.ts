import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { flaskTags, smokeTags } from '../../../tests/tags.js';
import { performanceTags } from '../../../tests/tags.performance.js';

type TagConfig = { tag: string; description: string };

const here = dirname(fileURLToPath(import.meta.url));

function catalogEntries(tags: Record<string, TagConfig>) {
  return Object.values(tags).map((config) => ({
    id: config.tag.replace(/:$/, ''),
    description: config.description,
  }));
}

const catalog = {
  e2e: catalogEntries({ ...smokeTags, ...flaskTags }),
  performance: catalogEntries(performanceTags),
};

writeFileSync(
  join(here, 'catalog.json'),
  `${JSON.stringify(catalog, null, 2)}\n`,
);
console.log(
  `Wrote catalog.json (${catalog.e2e.length} e2e, ${catalog.performance.length} performance) from tests/tags.js and tests/tags.performance.js`,
);
