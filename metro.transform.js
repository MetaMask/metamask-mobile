/* eslint-disable import-x/no-commonjs */
const defaultTransformer = require('@expo/metro-config/babel-transformer');
const svgTransformer = require('react-native-svg-transformer/expo');

/**
 * The Metro babel transformer: SVGs go through SVGR, everything else through
 * the Expo babel transformer.
 *
 * Only `src`, `filename` and `options` are forwarded. Metro also passes
 * `plugins` (including `importLocationsPlugin`), which makes Metro resolve
 * `import` statements through the `import` package-exports condition. That
 * swaps many dependencies (viem, rxjs, the Ledger kits, ...) from their CJS to
 * their ESM builds and can load two copies of a package that is both imported
 * and required. Forwarding them must be a deliberate, separately tested change.
 */
module.exports.transform = ({ src, filename, options }) =>
  filename.endsWith('.svg')
    ? svgTransformer.transform({ src, filename, options })
    : defaultTransformer.transform({ src, filename, options });
