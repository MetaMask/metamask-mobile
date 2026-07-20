/* eslint-disable import-x/no-commonjs */
/**
 * Metro configuration for React Native
 * https://github.com/facebook/react-native
 *
 * @type {import('metro-config').MetroConfig}
 */

const { getDefaultConfig: getExpoDefaultConfig } = require('expo/metro-config');
const { mergeConfig } = require('@react-native/metro-config');
const { getSentryExpoConfig } = require('@sentry/react-native/metro');
const { lockdownSerializer } = require('@lavamoat/react-native-lockdown');

// eslint-disable-next-line import-x/no-nodejs-modules
const { parseArgs } = require('node:util');
// eslint-disable-next-line import-x/no-nodejs-modules
const os = require('node:os');

const parsedArgs = parseArgs({
  options: {
    platform: {
      type: 'string',
    },
  },
  allowPositionals: true,
  strict: false,
});

const getPolyfills = () => [
  // eslint-disable-next-line import-x/no-extraneous-dependencies
  ...require('@react-native/js-polyfills')(),
  // Must come AFTER @react-native/js-polyfills (which installs RN's Promise)
  // and BEFORE lockdown's hardenIntrinsics(). Defines Promise.withResolvers so
  // babel-preset-expo's injected core-js polyfill skips its own (illegal, post-
  // freeze) definition. See the file header for the full rationale.
  require.resolve('./polyfills/promise-with-resolvers.js'),
  require.resolve('reflect-metadata'),
  // ^ Bootstraps `globalThis.Reflect.metadata` once at app startup. The
  // Ledger DMK + inversify stack reaches `reflect-metadata` indirectly
  // via decorator metadata; routing those packages to their ESM builds
  // (see `LEDGER_DMK_ESM_PACKAGES` below) keeps the polyfill's IIFE
  // from being re-evaluated by Metro's CJS interop on Fast Refresh.
  // Expo's `expo/fetch` (used by @metamask/bridge-controller for SSE
  // `getQuoteStream`) constructs a `ReadableStream` for the response
  // body. Hermes does not ship `ReadableStream`, and Expo expects Metro
  // to inject one as a global (see
  // node_modules/expo/src/winter/runtime.native.ts L17-18:
  //   "// ReadableStream is injected by Metro as a global").
  // The official `expo/metro-config` defaults wire this in
  // automatically; because we bootstrap from `@react-native/js-polyfills`
  // we have to opt in explicitly. Without this, `expo/fetch` rejects
  // every request with `ReferenceError: Property 'ReadableStream'
  // doesn't exist`, breaking bridge SSE quotes silently on iOS Hermes
  // (and every other expo/fetch consumer).
  require.resolve('expo/virtual/streams'),
];

// We should replace path for react-native-fs
// eslint-disable-next-line import-x/no-nodejs-modules
const path = require('path');
const {
  wrapWithReanimatedMetroConfig,
} = require('react-native-reanimated/metro-config');

// True when the module being resolved was requested from a file inside
// @metamask/perps-controller. Normalizes separators first so this works on
// Windows (`\`) too; the surrounding `/` deliberately require a file *inside*
// the package, not just a package-name prefix.
const isPerpsControllerOrigin = (context) =>
  (context.originModulePath ?? '')
    .replace(/\\/g, '/')
    .includes('/@metamask/perps-controller/');

// Ledger DMK-family packages whose published `exports` field routes
// `require`/`import` of the bare specifier to a CJS build under
// `lib/cjs/`. The CJS output wraps `reflect-metadata` (and the rest of
// the module body) in TypeScript's `__esModule` interop helpers, which
// causes Metro's CJS interop to re-execute the `reflect-metadata` IIFE
// whenever Fast Refresh re-evaluates a DMK module group. The IIFE is
// not idempotent on Hermes (it calls `Object.defineProperty` on
// `globalThis.Reflect` with `configurable: false`), and re-execution
// throws `TypeError: property is not configurable`.
//
// Each of these packages ships a parallel ESM build at
// `lib/esm/index.js` whose top-level statement is the single canonical
// `import "reflect-metadata"`. Routing the bare specifier through the
// ESM entry keeps the polyfill bootstrap to one execution per JS
// runtime, matching the working configuration validated on
// `poc/dmk-test-page`.
//
// We bypass the package's `exports` field by resolving the file path
// directly under `node_modules`; `require.resolve` cannot reach
// `lib/esm/index.js` while `unstable_enablePackageExports: true` is
// active.
const LEDGER_DMK_ESM_PACKAGES = [
  '@ledgerhq/context-module',
  '@ledgerhq/device-management-kit',
  '@ledgerhq/device-signer-kit-ethereum',
  '@ledgerhq/device-transport-kit-react-native-ble',
  '@ledgerhq/signer-utils',
];

// Path fragments matched against `originModulePath` in `resolveRequest`
// to scope the `reflect-metadata` idempotent shim to the Ledger DMK
// closure (the only consumer of `reflect-metadata@0.2.x` in this app).
// All five LEDGER_DMK_ESM_PACKAGES, plus their DI substrate (inversify
// and `@inversifyjs/*`), live under one of these path fragments. Other
// consumers (e.g. the nested `reflect-metadata@0.1.14` copies bundled
// inside `@consensys/*-ramps-sdk`, which use their own package-local
// copy and don't share the registry symbol) resolve normally to their
// own `reflect-metadata`.
//
// See `app/shims/reflect-metadata-once.js` for the rationale on why
// the second IIFE execution must be short-circuited.
const DMK_REFLECT_METADATA_IMPORTERS = [
  'node_modules/@ledgerhq/',
  'node_modules/inversify',
  'node_modules/@inversifyjs/',
];

module.exports = function (baseConfig) {
  return getSentryExpoConfig(__dirname, {
    getDefaultConfig: (projectRoot, options) => {
      const defaultConfig = mergeConfig(
        baseConfig,
        getExpoDefaultConfig(projectRoot, options),
      );
      const {
        resolver: { assetExts, sourceExts },
      } = defaultConfig;
      // IS_PERFORMANCE_TEST opts out of E2E startup overhead (ReadOnlyNetworkStore,
      // command polling, Sentry mock) while keeping METAMASK_ENVIRONMENT='e2e' so
      // the build still works on feature branches with e2e signing/secrets.
      const isPerformanceTest = process.env.IS_PERFORMANCE_TEST === 'true';
      const hasTestOverrides =
        !isPerformanceTest && process.env.HAS_TEST_OVERRIDES === 'true';

      /**
       * E2E Metro redirects under tests/module-mocking.
       * Enables both: seedless-onboarding-controller + OAuthLoginHandlers mocks.
       * True when HAS_TEST_OVERRIDES OR E2E_MOCK_OAUTH.
       * Performance builds set E2E_MOCK_OAUTH=true to keep this mock active
       * even though hasTestOverrides is false (preventing real OAuth calls to production).
       */
      const isE2EMockOAuth = process.env.E2E_MOCK_OAUTH === 'true';

      const e2eAllowsSeedlessOAuthMetroMocks =
        hasTestOverrides || isE2EMockOAuth;

      // For less powerful machines, leave room to do other tasks. For instance,
      // if you have 10 cores but only 16GB, only 3 workers would get used.
      // Also forces maxWorkers value to be no less than 2, ensuring
      // worker code runs concurrently and not on the main Metro process
      //
      // CI Override: Set METRO_MAX_WORKERS env var to limit workers on constrained runners
      // Example: METRO_MAX_WORKERS=4 for 48GB runners to prevent OOM kills
      const maxWorkers = process.env.METRO_MAX_WORKERS
        ? Math.max(2, parseInt(process.env.METRO_MAX_WORKERS, 10))
        : Math.ceil(
            Math.max(
              2,
              os.availableParallelism() *
                Math.min(1, os.totalmem() / (64 * 1024 * 1024 * 1024)),
            ),
          );

      return wrapWithReanimatedMetroConfig(
        mergeConfig(defaultConfig, {
          resolver: {
            unstable_enablePackageExports: true,
            assetExts: [...assetExts.filter((ext) => ext !== 'svg'), 'riv'],
            sourceExts: [...sourceExts, 'svg', 'cjs', 'mjs'],
            resolverMainFields: ['sbmodern', 'react-native', 'browser', 'main'],
            extraNodeModules: {
              ...defaultConfig.resolver.extraNodeModules,
              'node:crypto': require.resolve('react-native-crypto'),
              crypto: require.resolve('react-native-crypto'),
              stream: require.resolve('stream-browserify'),
              _stream_transform: require.resolve('readable-stream/transform'),
              _stream_readable: require.resolve('readable-stream/readable'),
              _stream_writable: require.resolve('readable-stream/writable'),
              _stream_duplex: require.resolve('readable-stream/duplex'),
              _stream_passthrough: require.resolve(
                'readable-stream/passthrough',
              ),
              http: require.resolve('@tradle/react-native-http'),
              https: require.resolve('https-browserify'),
              vm: require.resolve('vm-browserify'),
              os: require.resolve('react-native-os'),
              zlib: require.resolve('browserify-zlib'),
              net: require.resolve('react-native-tcp-socket'),
              fs: require.resolve('react-native-level-fs'),
              images: path.resolve(__dirname, 'app/images'),
              'base64-js': 'react-native-quick-base64',
              base64: 'react-native-quick-base64',
              'js-base64': 'react-native-quick-base64',
              buffer: '@craftzdog/react-native-buffer',
              'node:buffer': '@craftzdog/react-native-buffer',
            },
            resolveRequest: (context, moduleName, platform) => {
              // Redirect Ledger DMK-family bare imports to their ESM build.
              // See `LEDGER_DMK_ESM_PACKAGES` above for the full rationale;
              // in short, the CJS build re-evaluates `reflect-metadata`'s
              // IIFE under Fast Refresh and Hermes rejects the second
              // `Object.defineProperty` on the registry symbol.
              if (LEDGER_DMK_ESM_PACKAGES.includes(moduleName)) {
                return {
                  filePath: path.resolve(
                    __dirname,
                    'node_modules',
                    moduleName,
                    'lib/esm/index.js',
                  ),
                  type: 'sourceFile',
                };
              }
              // Reroute `reflect-metadata` imports from the Ledger DMK
              // closure (DMK packages + inversify DI substrate) through an
              // idempotent shim. The Metro polyfill loads
              // `reflect-metadata` once at app startup but does not
              // register it in the `__d` module cache, so the lazy DMK
              // chunk re-evaluates the file body and the second IIFE
              // throws "property is not configurable" on the
              // `Symbol.for("@reflect-metadata:registry")` defineProperty.
              //
              // The shim short-circuits whenever Reflect.metadata is
              // already a function (always true after the polyfill
              // bootstrap). Other consumers (e.g. `@consensys/*-ramps-sdk`
              // which carry their own nested `reflect-metadata@0.1.14`)
              // resolve normally to their package-local copy.
              if (
                moduleName === 'reflect-metadata' &&
                DMK_REFLECT_METADATA_IMPORTERS.some((fragment) =>
                  context.originModulePath?.includes(fragment),
                )
              ) {
                return {
                  filePath: require.resolve(
                    './app/shims/reflect-metadata-once.js',
                  ),
                  type: 'sourceFile',
                };
              }
              // MYXProvider is intentionally excluded from @metamask/perps-controller's
              // published dist (extension-only). The dynamic import() uses webpackIgnore
              // but babel's dynamicImportToRequire rewrites it to require(), causing Metro
              // to resolve it statically. Return an empty module stub.
              if (
                moduleName === './providers/MYXProvider' &&
                context.originModulePath?.includes('@metamask/perps-controller')
              ) {
                return { type: 'empty' };
              }
              // @metamask/perps-controller@9.2.1's CJS build (standaloneInfoClient.cjs,
              // HyperLiquidClientService.cjs) contains a leftover absolute file:// require
              // from the package's own CI build machine instead of `@nktkas/hyperliquid`
              // (the ESM build correctly imports `@nktkas/hyperliquid`, confirming this is
              // a CJS-transpile bug in the published package). Redirect to the real package
              // until upstream ships a patched release.
              if (
                moduleName ===
                  'file:///home/runner/work/hyperliquid/hyperliquid/src/mod.ts' &&
                context.originModulePath?.includes('@metamask/perps-controller')
              ) {
                return context.resolveRequest(
                  context,
                  '@nktkas/hyperliquid',
                  platform,
                );
              }
              // @ledgerhq packages use exports field subpath mapping (e.g. ./signers/index -> ./lib/signers/index.js)
              // which doesn't work with unstable_enablePackageExports: false — manually replicate the lib/ mapping
              // Affected: domain-service, evm-tools, devices, cryptoassets-evm-signatures
              const ledgerhqSubpathMatch = moduleName.match(
                /^(@ledgerhq\/[^/]+)\/(.+)$/,
              );
              if (ledgerhqSubpathMatch) {
                const [, pkgName, subpath] = ledgerhqSubpathMatch;
                try {
                  return {
                    filePath: require.resolve(`${pkgName}/lib/${subpath}`),
                    type: 'sourceFile',
                  };
                } catch {
                  // fall through to default resolution if lib/ mapping doesn't exist
                }
              }
              // Use axios browser build so Node-only deps (e.g. http2) are never pulled in
              if (
                moduleName === 'axios' ||
                moduleName.includes('axios/dist/node/')
              ) {
                return {
                  filePath: require.resolve('axios/dist/browser/axios.cjs'),
                  type: 'sourceFile',
                };
              }
              // Use contentful browser build so Node-only built-ins (tty, zlib, etc.) are never pulled in
              if (moduleName === 'contentful') {
                return {
                  filePath: require.resolve(
                    'contentful/dist/contentful.browser.js',
                  ),
                  type: 'sourceFile',
                };
              }
              if (hasTestOverrides) {
                if (moduleName === '@sentry/react-native') {
                  return {
                    type: 'sourceFile',
                    filePath: path.resolve(
                      __dirname,
                      'tests/module-mocking/sentry/react-native.ts',
                    ),
                  };
                }
                if (moduleName === '@sentry/core') {
                  return {
                    type: 'sourceFile',
                    filePath: path.resolve(
                      __dirname,
                      'tests/module-mocking/sentry/core.ts',
                    ),
                  };
                }
              }
              if (e2eAllowsSeedlessOAuthMetroMocks) {
                if (
                  moduleName.endsWith(
                    'controllers/seedless-onboarding-controller',
                  ) ||
                  moduleName.endsWith(
                    'controllers/seedless-onboarding-controller/index',
                  ) ||
                  moduleName === './seedless-onboarding-controller' ||
                  moduleName === '../seedless-onboarding-controller'
                ) {
                  return {
                    type: 'sourceFile',
                    filePath: path.resolve(
                      __dirname,
                      'tests/module-mocking/seedless/index.ts',
                    ),
                  };
                }
                // Skips native Google/Apple UI; tokens still hit auth server (see module mock).
                if (
                  moduleName.endsWith('OAuthService/OAuthLoginHandlers') ||
                  moduleName.endsWith(
                    'OAuthService/OAuthLoginHandlers/index',
                  ) ||
                  moduleName === './OAuthLoginHandlers' ||
                  moduleName === '../OAuthLoginHandlers'
                ) {
                  return {
                    type: 'sourceFile',
                    filePath: path.resolve(
                      __dirname,
                      'tests/module-mocking/oauth/OAuthLoginHandlers/index.ts',
                    ),
                  };
                }
              }
              return context.resolveRequest(context, moduleName, platform);
            },
          },
          transformer: {
            babelTransformerPath: require.resolve('./metro.transform.js'),
            assetPlugins: [
              'react-native-svg-asset-plugin',
              'expo-asset/tools/hashAssetFiles',
            ],
            svgAssetPlugin: {
              pngCacheDir: '.png-cache',
              scales: [1],
              output: {
                compressionLevel: 6,
              },
            },
            getTransformOptions: async () => ({
              transform: {
                experimentalImportSupport: true,
                inlineRequires: true,
              },
            }),
          },
          serializer: lockdownSerializer(
            { hermesRuntime: true },
            {
              getPolyfills,
            },
          ),
          resetCache: process.env.METRO_RESET_CACHE !== 'false',
          maxWorkers,
        }),
      );
    },
  });
};
