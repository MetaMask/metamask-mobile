/* eslint-disable import-x/no-commonjs */
/** @type {import('@expo/fingerprint').Config} */

/**
 * This config is used when generating an EAS fingerprint for the project.
 * Docs - https://docs.expo.dev/versions/latest/sdk/fingerprint/#fingerprintconfigjs
 */
const config = {
  /**
   * Track files and directories under `extraSources` if they affect native code changes.
   *
   * Intentionally NOT tracked:
   * - `.github/workflows/**` and `.github/scripts/**` — these orchestrate CI
   *   but do not change what `scripts/build.sh` / native toolchains compile
   *   into the artifacts. Including them would invalidate the fingerprint on
   *   every unrelated CI workflow edit on `main`, which currently breaks
   *   build caching and cross-PR artifact reuse (every open PR's merge ref
   *   picks up those edits). The files that actually drive the native build
   *   (`scripts/build.sh`, `scripts/setup.mjs`, `react-native.config.js`,
   *   native dirs, `package.json`/`yarn.lock`, and `.yarn/patches`) are
   *   tracked explicitly below or by `@expo/fingerprint` defaults.
   */
  extraSources: [
    {
      type: 'dir',
      filePath: '.yarn/patches',
      reasons: ['Detect yarn patch changes.'],
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
      type: 'file',
      filePath: './scripts/setup.mjs',
      reasons: ['Detect setup script changes.'],
    },
  ],
};

module.exports = config;
