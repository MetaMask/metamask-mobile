import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

import { flaskTags, smokeTags } from '../../../tests/tags.js';
import { performanceTags } from '../../../tests/tags.performance.js';

type TagConfig = { tag: string; description: string };

const here = dirname(fileURLToPath(import.meta.url));
const catalog = JSON.parse(
  readFileSync(join(here, 'catalog.json'), 'utf8'),
) as {
  e2e: { id: string; description: string }[];
  performance: { id: string; description: string }[];
};

function idsFromTags(tags: Record<string, TagConfig>) {
  return new Set(
    Object.values(tags).map((config) => config.tag.replace(/:$/, '')),
  );
}

describe('smart-e2e catalog.json', () => {
  it('matches smoke and flask tags from tests/tags.js', () => {
    const expected = idsFromTags({ ...smokeTags, ...flaskTags });
    const actual = new Set(catalog.e2e.map((entry) => entry.id));
    assert.deepEqual(actual, expected);
  });

  it('matches performance tags from tests/tags.performance.js', () => {
    const expected = idsFromTags(performanceTags);
    const actual = new Set(catalog.performance.map((entry) => entry.id));
    assert.deepEqual(actual, expected);
  });

  it('exists next to the mode definition', () => {
    assert.equal(existsSync(join(here, 'catalog.json')), true);
  });
});
