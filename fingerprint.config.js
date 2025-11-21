/* eslint-disable import/no-commonjs */
/** @type {import('@expo/fingerprint').Config} */

/**
 * This config is used when generating an EAS fingerprint for the project.
 * Docs - https://docs.expo.dev/versions/latest/sdk/fingerprint/#fingerprintconfigjs
 */
const config = {
  /**
   * Track files and directories under `extraSources` if they affect native code changes.
   */
  extraSources: [
    {
      type: 'dir',
      filePath: '.yarn/patches',
      reasons: ['Detect yarn patch changes.'],
    },
    {
      type: 'dir',
      filePath: '.github/workflows',
      reasons: ['Detect Github workflow changes.'],
    },
    {
      type: 'dir',
      filePath: '.github/scripts',
      reasons: ['Detect Github workflow script changes.'],
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
