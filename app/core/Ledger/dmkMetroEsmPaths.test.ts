// eslint-disable-next-line import-x/no-nodejs-modules
import fs from 'fs';
// eslint-disable-next-line import-x/no-nodejs-modules
import path from 'path';

/**
 * Guard for the Ledger DMK ESM pins in metro.config.js.
 *
 * metro.config.js bypasses the DMK packages' `exports` maps and resolves
 * `lib/esm/index.js` directly (see LEDGER_DMK_ESM_PACKAGES there) to keep the
 * `reflect-metadata` polyfill to a single evaluation. Because those are deep,
 * hardcoded paths, a package upgrade that reorganizes `lib/` would only fail
 * at bundle time — or worse, silently fall back to the CJS build and
 * reintroduce the non-deterministic "property is not configurable" crash the
 * shim exists to prevent. This test makes such an upgrade fail loudly in CI.
 *
 * The package list is parsed out of metro.config.js itself so the two can
 * never drift.
 */
describe('Ledger DMK metro ESM pins', () => {
  const repoRoot = path.resolve(__dirname, '../../..');
  const metroConfigSource = fs.readFileSync(
    path.join(repoRoot, 'metro.config.js'),
    'utf8',
  );

  const arrayMatch = metroConfigSource.match(
    /const LEDGER_DMK_ESM_PACKAGES = \[([\s\S]*?)\];/u,
  );
  const pinnedPackages = (arrayMatch?.[1] ?? '')
    .split('\n')
    .map((line) => line.trim().replace(/^'|',?$/gu, ''))
    .filter((line) => line.startsWith('@'));

  it('finds the LEDGER_DMK_ESM_PACKAGES list in metro.config.js', () => {
    expect(pinnedPackages.length).toBeGreaterThanOrEqual(5);
  });

  it.each(pinnedPackages)(
    'resolves the pinned ESM entry for %s',
    (packageName) => {
      // Mirrors the resolveRequest in metro.config.js, which joins the bare
      // specifier onto the top-level node_modules. If hoisting ever moves a
      // (transitive) package like @ledgerhq/signer-utils into a nested
      // node_modules, or an upgrade drops lib/esm/index.js, this fails.
      const pinnedPath = path.join(
        repoRoot,
        'node_modules',
        packageName,
        'lib/esm/index.js',
      );
      expect(fs.existsSync(pinnedPath)).toBe(true);
    },
  );

  it('resolves the reflect-metadata shim target', () => {
    // The shim requires the package subpath to bypass the metro alias; both
    // the shim and its require target must exist.
    expect(
      fs.existsSync(path.join(repoRoot, 'app/shims/reflect-metadata-once.js')),
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(repoRoot, 'node_modules/reflect-metadata/Reflect.js'),
      ),
    ).toBe(true);
  });
});
