const path = require('path');

/**
 * Webpack config to bundle liveline as a browser IIFE for use inside the
 * LivelineChart WebView.
 *
 * React and ReactDOM are externalized — they are provided separately via UMD
 * builds copied from node_modules and inlined into the HTML template.
 * `react/jsx-runtime` is mapped to a thin shim (`window.ReactJsxRuntime`) that
 * the HTML template sets up from the already-loaded `window.React` global.
 *
 * Output: scripts/liveline-webview/dist/liveline.iife.js
 * The build script (scripts/build-liveline-webview.sh) reads this file and
 * generates app/components/UI/Charts/LivelineChart/LivelineChartAssets.ts.
 */

module.exports = {
  // Use the CJS build so webpack can statically resolve all requires.
  // We reference the file directly because the package exports map only
  // exposes the main '.' entry; subpath access is not exported.
  entry: require.resolve('liveline').replace('index.js', 'index.cjs'),

  mode: 'production',

  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'liveline.iife.js',
    library: {
      // Exported as window.Liveline = { Liveline, LivelineTransition, ... }
      name: 'Liveline',
      type: 'window',
    },
  },

  externals: {
    // window.React is set by react.production.min.js UMD before this script runs.
    react: 'React',
    // window.ReactDOM is set by react-dom.production.min.js UMD.
    'react-dom': 'ReactDOM',
    // react/jsx-runtime is not a separate UMD file.  The HTML template creates
    // window.ReactJsxRuntime = { jsx, jsxs, Fragment } from window.React before
    // this script loads.
    'react/jsx-runtime': 'ReactJsxRuntime',
  },

  // No transpilation needed — the CJS output is already ES2020 and targets
  // modern WebView engines (WKWebView on iOS, Chromium on Android).
  module: {
    rules: [],
  },

  resolve: {
    extensions: ['.js', '.cjs'],
  },
};
