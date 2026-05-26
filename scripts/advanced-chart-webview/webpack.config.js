const path = require('path');

/**
 * Webpack config to bundle the AdvancedChart WebView TypeScript modules
 * into a single IIFE for inline embedding in the WebView HTML.
 *
 * Output: scripts/advanced-chart-webview/dist/chartLogic.iife.js
 *
 * The build script (scripts/build-advanced-chart-webview.sh) reads this
 * file and generates chartLogicString.ts for inline embedding in the WebView.
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
    library: {
      type: 'self',
    },
    // No chunking — everything in one file for inline <script>.
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
            // Skip type-checking during build for speed; tsc --noEmit runs separately.
            transpileOnly: true,
          },
        },
        exclude: /node_modules|\.test\.ts$/,
      },
    ],
  },

  resolve: {
    extensions: ['.ts', '.js'],
  },

  // Disable code-splitting and ensure a single bundle.
  optimization: {
    splitChunks: false,
    runtimeChunk: false,
    minimize: false,
  },
};
