const path = require('path');

/**
 * Webpack config for the AdvancedChart WebView IIFE.
 *
 * Bundles local TypeScript source under
 * app/components/UI/Charts/AdvancedChart/webview/src/ into a single IIFE that
 * the build script (scripts/build-advanced-chart-webview.sh) stringifies into
 * app/components/UI/Charts/AdvancedChart/webview/chartLogicString.modular.ts.
 *
 * Differs from scripts/liveline-webview/webpack.config.js in three ways:
 *   1. Entry is local TS (this repo), not an npm CJS package.
 *   2. ts-loader runs with transpileOnly (no type checking at build time).
 *      After editing source, run `yarn build:advanced-chart-webview` and
 *      commit the regenerated chartLogicString.ts.
 *      TODO: Add a CI step to enforce type checking (`tsc --noEmit`)
 *      and bundle freshness (`git diff --exit-code`).
 *   3. No externals — the TradingView Advanced Charts library loads itself from
 *      a CDN script tag injected by the HTML template before this IIFE runs;
 *      there is no React inside the WebView.
 *
 * Output: scripts/advanced-chart-webview/dist/chartLogic.iife.js
 */

const SRC_DIR = path.resolve(
  __dirname,
  '../../app/components/UI/Charts/AdvancedChart/webview/src',
);

module.exports = {
  entry: path.join(SRC_DIR, 'index.ts'),

  mode: 'production',

  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'chartLogic.iife.js',
    // IIFE; no global namespace pollution. Module code runs and exits.
    library: { type: 'self' },
    iife: true,
  },

  module: {
    rules: [
      {
        test: /\.ts$/,
        use: {
          loader: 'ts-loader',
          options: {
            configFile: path.join(SRC_DIR, 'tsconfig.webview.json'),
            transpileOnly: true,
          },
        },
        exclude: [/node_modules/, /\.test\.ts$/],
      },
    ],
  },

  resolve: {
    extensions: ['.ts', '.js'],
  },

  optimization: {
    splitChunks: false,
    runtimeChunk: false,
    // Keep readable for debugging; TradingView ships its own minified core.
    minimize: false,
  },
};
