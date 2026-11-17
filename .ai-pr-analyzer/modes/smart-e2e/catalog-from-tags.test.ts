import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { flaskTags, smokeTags } from '../../../tests/tags.js';
import { buildSmartE2eCatalog, catalogEntries } from './catalog-from-tags';

describe('buildSmartE2eCatalog', () => {
  it('uses smoke and flask tag ids and descriptions from tests/tags.js', () => {
    const expected = catalogEntries({ ...smokeTags, ...flaskTags });

    const catalog = buildSmartE2eCatalog();

    assert.deepEqual(catalog.e2e, expected);
    assert.equal('performance' in catalog, false);
  });
});
