/* eslint-disable import/no-commonjs */
/**
 * Metro configuration for React Native
 * https://github.com/facebook/react-native
 *
 * @type {import('metro-config').MetroConfig}
 */

const { getDefaultConfig } = require('expo/metro-config');
const { mergeConfig } = require('@react-native/metro-config');
const { lockdownSerializer } = require('@lavamoat/react-native-lockdown');

// eslint-disable-next-line import/no-nodejs-modules
const { parseArgs } = require('node:util');
// eslint-disable-next-line import/no-nodejs-modules
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
  // eslint-disable-next-line import/no-extraneous-dependencies
  ...require('@react-native/js-polyfills')(),
  require.resolve('reflect-metadata'),
];

// We should replace path for react-native-fs
// eslint-disable-next-line import/no-nodejs-modules
const path = require('path');
const {
  wrapWithReanimatedMetroConfig,
} = require('react-native-reanimated/metro-config');

module.exports = function (baseConfig) {
  const defaultConfig = mergeConfig(baseConfig, getDefaultConfig(__dirname));
  const {
    resolver: { assetExts, sourceExts },
  } = defaultConfig;
  const isE2E =
    process.env.IS_TEST === 'true' ||
    process.env.METAMASK_ENVIRONMENT === 'e2e';

  // For less powerful machines, leave room to do other tasks. For instance,
  // if you have 10 cores but only 16GB, only 3 workers would get used.
  // Also forces maxWorkers value to be no less than 2, ensuring
  // worker code runs concurrently and not on the main Metro process
  const maxWorkers = Math.ceil(
    Math.max(
      2,
      os.availableParallelism() *
        Math.min(1, os.totalmem() / (64 * 1024 * 1024 * 1024)),
    ),
  );

  return wrapWithReanimatedMetroConfig(
    mergeConfig(defaultConfig, {
      resolver: {
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
          net: require.resolve('react-native-tcp-socket'),
          fs: require.resolve('react-native-level-fs'),
          images: path.resolve(__dirname, 'app/images'),
          'base64-js': 'react-native-quick-base64',
          base64: 'react-native-quick-base64',
          'js-base64': 'react-native-quick-base64',
          buffer: '@craftzdog/react-native-buffer',
          'node:buffer': '@craftzdog/react-native-buffer',
        },
        resolveRequest: isE2E
          ? (context, moduleName, platform) => {
              if (moduleName === '@sentry/react-native') {
                return {
                  type: 'sourceFile',
                  filePath: path.resolve(
                    __dirname,
                    'e2e/module-mocking/sentry/react-native.ts',
                  ),
                };
              }
              if (moduleName === '@sentry/core') {
                return {
                  type: 'sourceFile',
                  filePath: path.resolve(
                    __dirname,
                    'e2e/module-mocking/sentry/core.ts',
                  ),
                };
              }
              return context.resolveRequest(context, moduleName, platform);
            }
          : defaultConfig.resolver.resolveRequest,
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
      resetCache: true,
      maxWorkers,
    }),
  );
};
