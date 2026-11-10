/* eslint-disable import-x/no-commonjs */

/**
 * Babel config for Jest imports of .mts CI scripts.
 *
 * The app test config parses unknown extensions as Flow. These scripts are
 * TypeScript, and the triage workflow runs them with node rather than Babel.
 */
module.exports = {
  presets: [
    [
      '@babel/preset-typescript',
      { allExtensions: true, onlyRemoveTypeImports: true },
    ],
  ],
  plugins: ['@babel/plugin-transform-modules-commonjs'],
};
