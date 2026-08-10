/**
 * @jest-environment node
 */
/* eslint-disable import-x/no-commonjs */

const {
  DMK_REFLECT_METADATA_IMPORTERS,
  isDmkReflectMetadataImporter,
} = require('./metro.dmkReflectMetadataImporter');

describe('isDmkReflectMetadataImporter', () => {
  it('matches POSIX Ledger DMK origin paths', () => {
    expect(
      isDmkReflectMetadataImporter(
        '/Users/dev/metamask-mobile/node_modules/@ledgerhq/device-management-kit/lib/esm/index.js',
      ),
    ).toBe(true);
  });

  it('matches Windows Ledger DMK origin paths after separator normalization', () => {
    // Without replace(/\\/g, '/'), forward-slash fragments never match Metro's
    // Windows `\` paths and the reflect-metadata shim is skipped.
    expect(
      isDmkReflectMetadataImporter(
        'C:\\Users\\dev\\metamask-mobile\\node_modules\\@ledgerhq\\device-management-kit\\lib\\esm\\index.js',
      ),
    ).toBe(true);
  });

  it('matches Windows inversify and @inversifyjs origins', () => {
    expect(
      isDmkReflectMetadataImporter(
        'C:\\Users\\dev\\metamask-mobile\\node_modules\\inversify\\lib\\inversify.js',
      ),
    ).toBe(true);
    expect(
      isDmkReflectMetadataImporter(
        'C:\\Users\\dev\\metamask-mobile\\node_modules\\@inversifyjs\\core\\lib\\index.js',
      ),
    ).toBe(true);
  });

  it('does not match non-DMK consumers (e.g. nested ramps-sdk reflect-metadata)', () => {
    expect(
      isDmkReflectMetadataImporter(
        'C:\\Users\\dev\\metamask-mobile\\node_modules\\@consensys\\foo-ramps-sdk\\node_modules\\bar\\index.js',
      ),
    ).toBe(false);
  });

  it('returns false for missing origin paths', () => {
    expect(isDmkReflectMetadataImporter(undefined)).toBe(false);
    expect(isDmkReflectMetadataImporter(null)).toBe(false);
    expect(isDmkReflectMetadataImporter('')).toBe(false);
  });

  it('keeps importer fragments on forward slashes', () => {
    for (const fragment of DMK_REFLECT_METADATA_IMPORTERS) {
      expect(fragment).toContain('/');
      expect(fragment).not.toContain('\\');
    }
  });
});
