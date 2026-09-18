import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { flaskTags, smokeTags } from '../../../tests/tags.js';
import { performanceTags } from '../../../tests/tags.performance.js';
import { buildSmartE2eCatalog, catalogEntries } from './catalog-from-tags';

describe('buildSmartE2eCatalog', () => {
  it('uses smoke and flask tag ids and descriptions from tests/tags.js', () => {
    const expected = catalogEntries({ ...smokeTags, ...flaskTags });

    const catalog = buildSmartE2eCatalog();

    assert.deepEqual(catalog.e2e, expected);
  });

  it('uses performance tag ids and descriptions from tests/tags.performance.js', () => {
    const expected = catalogEntries(performanceTags);

    const catalog = buildSmartE2eCatalog();

    assert.deepEqual(catalog.performance, expected);
  });
});
