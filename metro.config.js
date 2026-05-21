/* eslint-disable import-x/no-commonjs */
/**
 * Metro configuration for React Native
 * https://github.com/facebook/react-native
 *
 * @type {import('metro-config').MetroConfig}
 */

const { getDefaultConfig } = require('expo/metro-config');
const { mergeConfig } = require('@react-native/metro-config');
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
  require.resolve('reflect-metadata'),
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

module.exports = function (baseConfig) {
  const defaultConfig = mergeConfig(baseConfig, getDefaultConfig(__dirname));
  const {
    resolver: { assetExts, sourceExts },
  } = defaultConfig;
  // IS_PERFORMANCE_TEST opts out of E2E startup overhead (ReadOnlyNetworkStore,
  // command polling, Sentry mock) while keeping METAMASK_ENVIRONMENT='e2e' so
  // the build still works on feature branches with e2e signing/secrets.
  const isPerformanceTest = process.env.IS_PERFORMANCE_TEST === 'true';
  const isE2E =
    !isPerformanceTest &&
    (process.env.IS_TEST === 'true' ||
      process.env.METAMASK_ENVIRONMENT === 'e2e');

  /**
   * E2E Metro redirects under tests/module-mocking.
   * Enables both: seedless-onboarding-controller + OAuthLoginHandlers mocks.
   * True when IS_TEST / METAMASK_ENVIRONMENT=e2e OR E2E_MOCK_OAUTH.
   * Performance builds set E2E_MOCK_OAUTH=true to keep this mock active
   * even though isE2E is false (preventing real OAuth calls to production).
   */
  const isE2EMockOAuth = process.env.E2E_MOCK_OAUTH === 'true';

  const e2eAllowsSeedlessOAuthMetroMocks = isE2E || isE2EMockOAuth;

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
        // Disable package exports field resolution - it changes module ID assignment
        // which breaks LavaMoat's lockdownSerializer (hardenIntrinsics fires before require is set up)
        // See: https://github.com/expo/expo/discussions/36551
        //unstable_enablePackageExports: true,
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
          _stream_passthrough: require.resolve('readable-stream/passthrough'),
          http: require.resolve('@tradle/react-native-http'),
          https: require.resolve('https-browserify'),
          vm: require.resolve('vm-browserify'),
          os: require.resolve('react-native-os'),
          zlib: require.resolve('browserify-zlib'),
          net: require.resolve('react-native-tcp-socket'),
          fs: require.resolve('react-native-level-fs'),
          images: path.resolve(__dirname, 'app/images'),
          '@metamask/perps-controller': path.resolve(
            __dirname,
            'app/controllers/perps',
          ),
          'base64-js': 'react-native-quick-base64',
          base64: 'react-native-quick-base64',
          'js-base64': 'react-native-quick-base64',
          buffer: '@craftzdog/react-native-buffer',
          'node:buffer': '@craftzdog/react-native-buffer',
        },
        resolveRequest: (context, moduleName, platform) => {
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
          if (isE2E) {
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
              moduleName.endsWith('OAuthService/OAuthLoginHandlers/index') ||
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
};
