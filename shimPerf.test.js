/**
 * Guards the native-crypto monkey patch applied by `shimPerf.js`.
 *
 * `shimPerf.js` replaces `@noble/curves`' `secp256k1.getPublicKey` with the
 * native (C++) implementation from `@metamask/native-utils`. Because it mutates
 * a *module instance*, it only reaches consumers that resolve to the very same
 * copy of `@noble/curves` — a constraint `shimPerf.js` itself calls out:
 *
 *   "IMPORTANT: This patching works only if @noble/curves version in root
 *    package.json is same as @noble/curves version in package.json of
 *    @scure/bip32."
 *
 * That invariant silently broke: the repo root pinned `1.9.6` while
 * `@scure/bip32` (`~1.9.0`) and `@metamask/key-tree` (`^1.8.1`) each resolved a
 * nested `1.9.7`. HD key derivation therefore ran the pure-JS elliptic-curve
 * maths, measured at ~1.8 s of every unlock on a mid-range Android device.
 * Nothing threw, so nothing caught it.
 *
 * The guard is a *resolution* check rather than a runtime one. A runtime
 * variant — patch the root copy, then assert `HDKey` observes the patch — was
 * written and rejected: it passes even with the nested copies present (verified
 * by reinstalling the drifted tree), so it cannot detect the regression it
 * exists to catch. Module identity on disk is what actually determines whether
 * the patch lands, and it discriminates correctly.
 */

/* eslint-disable import-x/no-commonjs, import-x/no-nodejs-modules */
const fs = require('fs');
const path = require('path');

/**
 * Resolve the `@noble/curves` copy that `startDir` would load, mirroring the
 * `node_modules` upward walk used by both Node and Metro.
 *
 * @param {string} startDir - Directory to resolve from, relative to the repo root.
 * @returns {string | null} Absolute path to the resolved `package.json`, or null.
 */
const resolveCurvesFrom = (startDir) => {
  let dir = path.resolve(startDir);

  for (;;) {
    const candidate = path.join(
      dir,
      'node_modules',
      '@noble',
      'curves',
      'package.json',
    );
    if (fs.existsSync(candidate)) {
      return candidate;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      return null;
    }
    dir = parent;
  }
};

describe('shimPerf native secp256k1 patch coverage', () => {
  it.each([
    ['@scure/bip32', 'node_modules/@scure/bip32'],
    ['@metamask/key-tree', 'node_modules/@metamask/key-tree'],
    ['@metamask/eth-hd-keyring', 'node_modules/@metamask/eth-hd-keyring'],
  ])(
    'resolves the same @noble/curves copy as the repo root for %s',
    (_packageName, packageDir) => {
      // Arrange
      const rootCurves = resolveCurvesFrom('.');

      // Act
      const packageCurves = resolveCurvesFrom(packageDir);

      // Assert: a nested copy means shimPerf.js's patch cannot reach this
      // package, silently returning HD derivation to pure JS. Fix by pinning
      // the offending edge in `resolutions` (see `@scure/bip32/@noble/curves`
      // in package.json) rather than by patching package sources.
      expect(packageCurves).toBe(rootCurves);
    },
  );

  it('derives the BIP-32 spec Test Vector 1 fingerprint', () => {
    // Arrange: the seed and expected parent fingerprint are published in BIP-32
    // Test Vector 1, so this is anchored to the spec rather than to whichever
    // implementation happens to be wired in. Guards the resolution change
    // against a dedupe that silently altered derivation behaviour.
    /* eslint-disable-next-line import-x/no-extraneous-dependencies */
    const { HDKey } = require('@scure/bip32');
    const seed = Uint8Array.from([
      0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b,
      0x0c, 0x0d, 0x0e, 0x0f,
    ]);

    // Act
    const master = HDKey.fromMasterSeed(seed);

    // Assert
    expect(master.fingerprint.toString(16)).toBe('3442193e');
  });

  it('computes the secp256k1 generator point for a private key of 1', () => {
    // Arrange: privkey 1 must yield the generator G, a published constant.
    /* eslint-disable-next-line import-x/no-extraneous-dependencies */
    const { secp256k1 } = require('@noble/curves/secp256k1');
    const privateKey = new Uint8Array(32);
    privateKey[31] = 1;
    const generatorCompressed =
      '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798';

    // Act
    const publicKey = secp256k1.getPublicKey(privateKey, true);

    // Assert
    const toHex = (bytes) =>
      Array.from(bytes)
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('');
    expect(toHex(publicKey)).toBe(generatorCompressed);
  });

  it('pins every HD-derivation consumer to one @noble/curves version', () => {
    // Arrange: the packages whose elliptic-curve work happens on the unlock
    // path. Keeping them on a single copy is what makes the patch effective.
    const hdDerivationPackages = [
      'node_modules/@scure/bip32',
      'node_modules/@metamask/key-tree',
      'node_modules/@metamask/eth-hd-keyring',
    ];

    // Act
    const resolvedVersions = new Set(
      hdDerivationPackages
        .map(resolveCurvesFrom)
        .filter(Boolean)
        // eslint-disable-next-line import-x/no-dynamic-require, global-require
        .map((packageJsonPath) => require(packageJsonPath).version),
    );

    // Assert
    expect([...resolvedVersions]).toHaveLength(1);
  });
});
