const path = require('path');

/**
 * SPIKE webpack config: build the AdvancedChart WebView IIFE from the shared
 * core package (@metamask-previews/advanced-chart-core) instead of the local
 * TypeScript source under
 * app/components/UI/Charts/AdvancedChart/webview/src/.
 *
 * This exists to validate that the platform-agnostic engine extracted into
 * `@metamask/advanced-chart-core` produces a functional WebView bundle when
 * consumed by mobile. Once the integration is finalized this replaces
 * webpack.config.js.
 *
 * Differences from webpack.config.js:
 *   1. Entry is the published package (precompiled ESM/CJS), not local TS.
 *   2. No ts-loader — the package ships compiled JS with type declarations.
 *   3. optimization.sideEffects is disabled so webpack does not tree-shake the
 *      engine's import-time handler/overlay registrations. The package declares
 *      `sideEffects: false`, which is inaccurate for this runnable entry.
 *
 * Output: scripts/advanced-chart-webview/dist-core/chartLogic.iife.js
 */

module.exports = {
  entry: '@metamask/advanced-chart-core',

  mode: 'production',

  output: {
    path: path.resolve(__dirname, 'dist-core'),
    filename: 'chartLogic.iife.js',
    library: { type: 'self' },
    iife: true,
  },

  resolve: {
    extensions: ['.mjs', '.cjs', '.js', '.ts'],
    // Prefer the ESM entry so tree-shaking metadata is available.
    conditionNames: ['import', 'require', 'default'],
  },

  optimization: {
    splitChunks: false,
    runtimeChunk: false,
    minimize: false,
    // The package's `sideEffects: false` is accurate: the engine registers
    // handlers/overlays via explicit calls inside bootstrap(), not at import
    // time. The only side effect is the entry's bootstrap() call, and entry
    // modules are never tree-shaken. So default tree-shaking is safe here.
  },
};
