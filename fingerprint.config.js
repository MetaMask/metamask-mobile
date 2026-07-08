/* eslint-disable import-x/no-commonjs */
/** @type {import('@expo/fingerprint').Config} */

/**
 * This config is used when generating an EAS fingerprint for the project.
 * Docs - https://docs.expo.dev/versions/latest/sdk/fingerprint/#fingerprintconfigjs
 */

// This config runs in a Node build environment (not in the React Native
// bundle), so importing a Node.js builtin is safe here. `child_process` is
// required to invoke the `expo-modules-autolinking` CLI synchronously — the
// config is loaded via CommonJS `require` with no top-level `await`, so the
// CLI's async programmatic API can't be used in its place.
// eslint-disable-next-line import-x/no-nodejs-modules
const { execSync } = require('child_process');

/**
 * Returns the set of package names that have native code, as resolved by Expo
 * autolinking. Falls back to `null` if autolinking fails (e.g. in environments
 * where native tooling is unavailable), in which case callers should treat
 * every package as native to stay safe.
 *
 * @returns {Set<string> | null}
 */
function getNativePackageNames() {
  try {
    const ios = JSON.parse(
      execSync('yarn expo-modules-autolinking resolve -p ios --json', {
        stdio: ['pipe', 'pipe', 'ignore'],
      }).toString(),
    );
    const android = JSON.parse(
      execSync('yarn expo-modules-autolinking resolve -p android --json', {
        stdio: ['pipe', 'pipe', 'ignore'],
      }).toString(),
    );

    return new Set([
      ...ios.modules.map((m) => m.packageName),
      ...android.modules.map((m) => m.packageName),
    ]);
  } catch {
    // Safe fallback: treat everything as native so nothing is accidentally
    // excluded from the fingerprint.
    return null;
  }
}

const nativePackages = getNativePackageNames();

// Accumulates `package.json` content across streamed chunks (see fileHookTransform).
let packageJsonBuffer = '';

const config = {
  /**
   * Track files and directories under `extraSources` if they affect native code changes.
   *
   * Note: `.yarn/patches` is intentionally omitted here and handled instead via
   * `fileHookTransform` below, where we filter it down to only patches that
   * target native packages. This prevents JS-only patches from invalidating
   * the fingerprint.
   *
   * Note: only the specific `.github/workflows` files that actually orchestrate/compile
   * the native binary are tracked below, rather than the entire `.github/workflows` and
   * `.github/scripts` directories. Workflows/scripts that merely run or report on tests
   * against an already-built app (e.g. `run-e2e-*.yml`, `.github/scripts/e2e-*.mjs`,
   * `update-e2e-fixtures.yml`) can't change the compiled native binary, so they're
   * intentionally excluded. Blanket-tracking every workflow/script (those, plus unrelated
   * GitHub automation like labelers, changelog automation, Crowdin sync, etc.) would
   * invalidate the fingerprint on changes that can't possibly affect the native binary,
   * which:
   *   - breaks native-build cache reuse in CI (`.github/actions/find-reusable-build`),
   *     forcing unnecessary full native rebuilds, and
   *   - causes false-positive fingerprint mismatches in the OTA guardrail
   *     (see `docs/nightly-ota-updates.md`), blocking otherwise-safe OTA updates.
   */
  extraSources: [
    {
      type: 'file',
      filePath: '.github/workflows/ci.yml',
      reasons: [
        'Detect changes to the main CI workflow that orchestrates native builds.',
      ],
    },
    {
      type: 'file',
      filePath: '.github/workflows/get-requirements.yml',
      reasons: [
        'Detect changes to the workflow that gates native build requirements.',
      ],
    },
    {
      type: 'file',
      filePath: '.github/workflows/build-android-e2e.yml',
      reasons: ['Detect changes to the Android native e2e build workflow.'],
    },
    {
      type: 'file',
      filePath: '.github/workflows/build-ios-e2e.yml',
      reasons: ['Detect changes to the iOS native e2e build workflow.'],
    },
    {
      type: 'file',
      filePath: '.github/workflows/build.yml',
      reasons: ['Detect changes to the shared native build workflow.'],
    },
    {
      type: 'file',
      filePath: 'react-native.config.js',
      reasons: ['Detect react-native.config.js changes.'],
    },
    {
      type: 'file',
      filePath: './scripts/build.sh',
      reasons: ['Detect build configuration changes.'],
    },
    {
      type: 'dir',
      filePath: './scripts/inpage-bridge',
      reasons: ['Detect inpage provider changes bundled into native apps.'],
    },
    {
      type: 'file',
      filePath: './scripts/setup.mjs',
      reasons: ['Detect setup script changes.'],
    },
  ],

  /**
   * Transform sources before hashing to exclude JS-only changes from the
   * fingerprint.
   *
   * - `package.json`: only the dependencies/devDependencies of native packages
   *   (as resolved by Expo autolinking) are included in the hash. Fields like
   *   `version`, `scripts`, and JS-only package version bumps are excluded.
   *
   * - `.yarn/patches/**`: patch files for JS-only packages are excluded. Only
   *   patches whose filename starts with a known native package name contribute
   *   to the hash.
   *
   * If autolinking resolution failed at startup (`nativePackages === null`),
   * both transforms fall back to hashing everything unchanged.
   *
   * The hook is called as a streaming transform: once per file chunk (with
   * `isEndOfFile === false`) and once more at end-of-file (`chunk === null`,
   * `isEndOfFile === true`). Content larger than a single chunk (such as
   * `package.json`) must therefore be buffered and parsed only once complete.
   *
   * @type {import('@expo/fingerprint').FileHookTransformFunction}
   */
  fileHookTransform: (source, chunk, isEndOfFile) => {
    // Fall back to hashing everything if we couldn't resolve native packages.
    if (!nativePackages) return chunk;

    // Filter package.json to only native-relevant dependency entries.
    if (source.type === 'file' && source.filePath === 'package.json') {
      // Buffer chunks until the full file has been read, then parse once.
      if (chunk) packageJsonBuffer += chunk.toString();
      if (!isEndOfFile) return '';

      const pkg = JSON.parse(packageJsonBuffer);
      packageJsonBuffer = '';

      const filterToNative = (deps = {}) =>
        Object.fromEntries(
          Object.entries(deps).filter(([name]) => nativePackages.has(name)),
        );

      return JSON.stringify({
        dependencies: filterToNative(pkg.dependencies),
        devDependencies: filterToNative(pkg.devDependencies),
        // Preserve autolinking config overrides (e.g. expo.autolinking).
        expo: pkg.expo,
      });
    }

    // Exclude patch files that only target JS-only packages.
    if (
      source.type === 'file' &&
      source.filePath.startsWith('.yarn/patches/')
    ) {
      const patchFilename = source.filePath.slice('.yarn/patches/'.length);
      // Yarn patch filenames are formatted as `<package-name>-npm-<version>-<hash>.patch`.
      // We extract the package name by finding the `-npm-` separator.
      const npmSeparatorIndex = patchFilename.indexOf('-npm-');
      const patchedPackage =
        npmSeparatorIndex !== -1
          ? // Scoped packages use `@scope-name` in the filename (the `/` is replaced with `-`),
            // so we restore it to match the package name from autolinking.
            patchFilename
              .slice(0, npmSeparatorIndex)
              .replace(/^(@[^-]+)-/, '$1/')
          : null;

      if (!patchedPackage || !nativePackages.has(patchedPackage)) {
        // Return empty string so this patch file contributes nothing to the hash.
        return '';
      }
    }

    return chunk;
  },
};

module.exports = config;
