// React Compiler plugin (incl. bailout logging and test-env gating) lives in its
// own module so this config stays focused on wiring plugins together.
// `reactCompilerPlugins` is empty under Jest and a single-element array otherwise.
// eslint-disable-next-line import-x/no-commonjs
const { reactCompilerBabelConfig } = require('./scripts/react-compiler');

// Hermes (RN's bytecode compiler) does not accept dynamic `import()` syntax —
// even inside dead code branches — and aborts with "Invalid expression
// encountered", producing a `.app` with no JS bundle.
//
// Some shared controllers (e.g. PerpsController) and third-party packages
// (e.g. lilconfig) intentionally use `import(/* webpackIgnore: true */ x)` for
// webpack code splitting. Those constructs only make sense for webpack-based
// builds (extension); on Metro/Hermes they're parser-fatal.
//
// This visitor rewrites every `import(x)` call to
// `Promise.resolve().then(() => require(x))`, mirroring what
// babel-plugin-dynamic-import-node does, so Hermes never sees raw `import()`.
// Inlined to avoid pulling in another dependency.
//
// eslint-disable-next-line import-x/no-commonjs
const dynamicImportToRequire = ({ types: t }) => ({
  name: 'transform-dynamic-import-to-require',
  visitor: {
    Import(path) {
      const callExpr = path.parentPath;
      if (!callExpr.isCallExpression()) {
        return;
      }
      const arg = callExpr.node.arguments[0];
      if (!arg) {
        return;
      }
      const requireCall = t.callExpression(t.identifier('require'), [arg]);
      const arrowFn = t.arrowFunctionExpression([], requireCall);
      const replacement = t.callExpression(
        t.memberExpression(
          t.callExpression(
            t.memberExpression(
              t.identifier('Promise'),
              t.identifier('resolve'),
            ),
            [],
          ),
          t.identifier('then'),
        ),
        [arrowFn],
      );
      callExpr.replaceWith(replacement);
    },
  },
});

// eslint-disable-next-line import-x/no-commonjs
module.exports = {
  ignore: [
    (filename) =>
      !!filename &&
      (/\/ses\.cjs$/.test(filename) ||
        /\/ses-hermes\.cjs$/.test(filename) ||
        /\/react-native-lockdown\/src\/repair\.js$/.test(filename) ||
        // expo/virtual/streams.js is a Metro polyfill — no require() available at that stage
        // Babel must not transform it or it injects require("@babel/runtime/helpers/...")
        /\/expo\/virtual\/streams\.js$/.test(filename)),
  ],
  presets: ['babel-preset-expo'],
  plugins: [
    ...reactCompilerBabelConfig,
    // `JEST_WORKER_ID` must NOT be inlined: Metro runs Babel transforms inside
    // `jest-worker` child processes, which set `JEST_WORKER_ID` in their env.
    // Inlining it bakes a truthy value into the app bundle and defeats every
    // `process.env.JEST_WORKER_ID` runtime guard (e.g. the xhr2-based test-only
    // XMLHttpRequest shim), crashing the app. Excluding it keeps the lookup at
    // runtime: undefined in the app, set under Jest.
    ['transform-inline-environment-variables', { exclude: ['JEST_WORKER_ID'] }],
    dynamicImportToRequire,
    // NOTE: react-native-worklets/plugin must be listed LAST (reanimated v4).
    // Required to compile `'worklet'` directives; without it, gesture-handler
    // worklets silently no-op on iOS Fabric and GestureDetector children (e.g.
    // WebView) render at 0x0 (white screen).
    'react-native-worklets/plugin',
  ],
  overrides: [
    {
      test: (f) => !!f?.includes('/node_modules/marked'),
      plugins: [['@babel/plugin-transform-private-methods', { loose: true }]],
    },
    {
      test: (f) =>
        !!f?.includes('/node_modules/@metamask/profile-sync-controller'),
      plugins: [['@babel/plugin-transform-private-methods', { loose: true }]],
    },
    {
      test: (f) =>
        !!f?.includes(
          '/node_modules/@metamask/notification-services-controller',
        ),
      plugins: [['@babel/plugin-transform-private-methods', { loose: true }]],
    },
    {
      test: (f) => !!f?.includes('/node_modules/@metamask/bridge-controller'),
      plugins: [['@babel/plugin-transform-private-methods', { loose: true }]],
    },
    {
      test: (f) => !!f?.includes('/node_modules/@nktkas/hyperliquid'),
      plugins: [
        [
          '@babel/plugin-transform-modules-commonjs',
          { allowTopLevelThis: true },
        ],
      ],
    },
    {
      test: (f) => !!f?.includes('/node_modules/@noble/secp256k1'),
      plugins: [
        [
          '@babel/plugin-transform-modules-commonjs',
          { allowTopLevelThis: true },
        ],
      ],
    },
    {
      test: (f) => !!f?.includes('/node_modules/@metamask/rpc-errors'),
      plugins: [['@babel/plugin-transform-classes', { loose: true }]],
    },
    {
      test: (f) => !!f?.includes('/app/lib/snaps/SnapsExecutionWebView.tsx'),
      plugins: [['babel-plugin-inline-import', { extensions: ['.html'] }]],
    },
    // TODO: Remove this once we have a fix for the private methods
    // Do not apply this plugin globally since it breaks FlatList props.getItem
    {
      test: (f) => !!f?.includes('/app/core/redux/ReduxService.ts'),
      plugins: [['@babel/plugin-transform-private-methods', { loose: true }]],
    },
    {
      test: (f) => !!f?.includes('/app/core/Engine/Engine.ts'),
      plugins: [['@babel/plugin-transform-private-methods', { loose: true }]],
    },
    {
      test: (f) =>
        !!f?.includes('/app/core/NavigationService/NavigationService.ts'),
      plugins: [['@babel/plugin-transform-private-methods', { loose: true }]],
    },
    {
      test: (f) => !!f?.includes('/app/core/OAuthService/OAuthLoginHandlers'),
      plugins: [['@babel/plugin-transform-private-methods', { loose: true }]],
    },
  ],
  env: {
    production: {
      plugins: ['transform-remove-console'],
    },
  },
  comments: false,
  compact: true,
};
