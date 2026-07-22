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

// Metro hands Babel platform-native paths — backslash-separated on Windows —
// so every path check below must normalize separators first or it silently
// never matches there (e.g. ses/streams.js get transformed and the injected
// require() crashes the app before Metro's module system exists).
const posixPath = (filename) => (filename ? filename.replace(/\\/g, '/') : '');

// Every override `test` must go through this factory (never a bare
// `f.includes(...)`) so separator normalization can't be forgotten at
// individual call sites.
const pathIncludes = (needle) => (f) => posixPath(f).includes(needle);

// TODO: Remove this once we have a fix for the private methods
// Do not apply this plugin globally since it breaks FlatList props.getItem
const privateMethodsLoose = [
  ['@babel/plugin-transform-private-methods', { loose: true }],
];

// eslint-disable-next-line import-x/no-commonjs
module.exports = {
  ignore: [
    (filename) => {
      const f = posixPath(filename);
      return (
        /\/ses\.cjs$/.test(f) ||
        /\/ses-hermes\.cjs$/.test(f) ||
        /\/react-native-lockdown\/src\/repair\.js$/.test(f) ||
        // promise-with-resolvers.js is a Metro polyfill — no require() at that
        // stage, and Babel/preset-expo must not inject core-js/@babel/runtime
        // into it (which is exactly the crash this polyfill exists to prevent).
        /\/polyfills\/promise-with-resolvers\.js$/.test(f) ||
        // expo/virtual/streams.js is a Metro polyfill — no require() available at that stage
        // Babel must not transform it or it injects require("@babel/runtime/helpers/...")
        /\/expo\/virtual\/streams\.js$/.test(f)
      );
    },
  ],
  presets: [
    // `disableImportExportTransform: false` keeps Babel responsible for the
    // ES-module -> CommonJS conversion (RN's preset runs it with
    // `strictMode: false`), instead of deferring to Metro's static-ESM path.
    // The `@expo/metro-config` babel-transformer maps Metro's
    // `experimentalImportSupport: true` to the Babel caller flag
    // `supportsStaticESM: true`; babel-preset-expo would otherwise use that to
    // default `disableImportExportTransform` to `true`, leaving files as ES
    // modules (`sourceType: 'module'`). metro-transform-worker then injects a
    // `"use strict"` directive into every such module, which breaks code that
    // relies on sloppy-mode semantics. Pinning this to `false` reproduces the
    // pre-Expo-transformer pipeline and prevents the forced strict mode.
    ['babel-preset-expo', { disableImportExportTransform: false }],
  ],
  plugins: [
    ...reactCompilerBabelConfig,
    // `JEST_WORKER_ID` must NOT be inlined: Metro runs Babel transforms inside
    // `jest-worker` child processes, which set `JEST_WORKER_ID` in their env.
    // Inlining it bakes a truthy value into the app bundle and defeats every
    // `process.env.JEST_WORKER_ID` runtime guard (e.g. the xhr2-based test-only
    // XMLHttpRequest shim), crashing the app. Excluding it keeps the lookup at
    // runtime: undefined in the app, set under Jest.
    // `EXPO_OS` / `EXPO_SERVER` / `EXPO_BASE_URL` are NOT real environment
    // variables — `babel-preset-expo`'s define-plugin substitutes them (e.g.
    // `process.env.EXPO_OS` -> "ios") using the babel caller. Babel runs plugins
    // BEFORE preset plugins, so if we don't exclude them here this plugin inlines
    // them to `undefined` first, producing the runtime error
    // "The global process.env.EXPO_OS is not defined". Excluding them lets
    // babel-preset-expo define them correctly.
    [
      'transform-inline-environment-variables',
      {
        exclude: ['JEST_WORKER_ID', 'EXPO_OS', 'EXPO_SERVER', 'EXPO_BASE_URL'],
      },
    ],
    dynamicImportToRequire,
    // NOTE: react-native-reanimated/plugin must be listed LAST.
    // Required by reanimated v3 to compile `'worklet'` directives; without it,
    // gesture-handler worklets silently no-op on iOS Fabric and GestureDetector
    // children (e.g. WebView) render at 0x0 (white screen).
    'react-native-reanimated/plugin',
  ],
  overrides: [
    {
      test: pathIncludes('/node_modules/marked'),
      plugins: privateMethodsLoose,
    },
    {
      test: pathIncludes('/node_modules/@metamask/profile-sync-controller'),
      plugins: privateMethodsLoose,
    },
    {
      test: pathIncludes(
        '/node_modules/@metamask/notification-services-controller',
      ),
      plugins: privateMethodsLoose,
    },
    {
      test: pathIncludes('/node_modules/@metamask/bridge-controller'),
      plugins: privateMethodsLoose,
    },
    {
      test: pathIncludes('/node_modules/@nktkas/hyperliquid'),
      plugins: [
        [
          '@babel/plugin-transform-modules-commonjs',
          { allowTopLevelThis: true },
        ],
      ],
    },
    {
      test: pathIncludes('/node_modules/@noble/secp256k1'),
      plugins: [
        [
          '@babel/plugin-transform-modules-commonjs',
          { allowTopLevelThis: true },
        ],
      ],
    },
    {
      test: pathIncludes('/node_modules/@metamask/rpc-errors'),
      plugins: [['@babel/plugin-transform-classes', { loose: true }]],
    },
    {
      test: pathIncludes('/app/lib/snaps/SnapsExecutionWebView.tsx'),
      plugins: [['babel-plugin-inline-import', { extensions: ['.html'] }]],
    },
    {
      test: pathIncludes('/app/core/redux/ReduxService.ts'),
      plugins: privateMethodsLoose,
    },
    {
      test: pathIncludes('/app/core/Engine/Engine.ts'),
      plugins: privateMethodsLoose,
    },
    {
      test: pathIncludes('/app/core/NavigationService/NavigationService.ts'),
      plugins: privateMethodsLoose,
    },
    {
      test: pathIncludes('/app/core/OAuthService/OAuthLoginHandlers'),
      plugins: privateMethodsLoose,
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
