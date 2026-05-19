const ReactCompilerConfig = {
  target: '18',
};

// Rewrites `import(x)` to `Promise.resolve().then(() => require(x))`.
//
// Originally added for Hermes (RN 0.81 / hermesc rejected raw `import()`
// during the iOS release bytecode-compile step). That specific case is
// now covered by babel-preset-expo, but the transform is still load-bearing
// for Jest: tests run in a Node `vm` context that refuses `import()` unless
// `--experimental-vm-modules` is set. `NavigationService.ts` uses
// `import('../AgenticService/AgenticService')` inside an `if (__DEV__) { }`
// branch (active in Jest), so any test that touches NavigationService
// fails with "A dynamic import callback was invoked without
// --experimental-vm-modules" if this transform is not registered.
//
// Mirrors babel-plugin-dynamic-import-node; inlined to avoid a new
// dependency.
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
  // Babel can find the plugin without the `babel-plugin-` prefix. Ex. `babel-plugin-react-compiler` -> `react-compiler`
  plugins: [
    [
      'react-compiler',
      {
        target: '18',
        sources: (filename) => {
          // Match file paths or directories to include in the React Compiler.
          const pathsToInclude = [
            'app/components/Nav',
            'app/components/UI/DeepLinkModal',
          ];
          return pathsToInclude.some((path) => filename.includes(path));
        },
      },
    ],
    'transform-inline-environment-variables',
    dynamicImportToRequire,
    [
      'module-resolver',
      {
        alias: {
          '@metamask/perps-controller': './app/controllers/perps',
        },
      },
    ],
    // NOTE: react-native-reanimated/plugin must be listed LAST.
    // Required by reanimated v3 to compile `'worklet'` directives; without it,
    // gesture-handler worklets silently no-op on iOS Fabric and GestureDetector
    // children (e.g. WebView) render at 0x0 (white screen).
    'react-native-reanimated/plugin',
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
