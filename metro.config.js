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

const parsedArgs = parseArgs({
  options: {
    platform: {
      type: 'string',
    },
  },
  allowPositionals: true,
  strict: false,
});

// Apply 'ses/hermes' on Android (Hermes)
// Apply 'ses' on iOS (RN JSC) until on Hermes
const hermesRuntime =
  parsedArgs.values.platform === 'android' ||
  parsedArgs.positionals[0].includes('android');

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

  return wrapWithReanimatedMetroConfig(
    mergeConfig(defaultConfig, {
      resolver: {
        assetExts: assetExts.filter((ext) => ext !== 'svg'),
        sourceExts: [...sourceExts, 'svg', 'cjs', 'mjs'],
        resolverMainFields: ['sbmodern', 'react-native', 'browser', 'main'],
        extraNodeModules: {
          ...defaultConfig.resolver.extraNodeModules,
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
          net: require.resolve('react-native-tcp'),
          fs: require.resolve('react-native-level-fs'),
          images: path.resolve(__dirname, 'app/images'),
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
      // Note: 'expo start' not supported since we cannot detect android/ios
      // Unfortunately it does not 'run:android' or 'run:ios' which would be detectable
      serializer: lockdownSerializer(
        { hermesRuntime },
        {
          getPolyfills
        },
      ),
      resetCache: true,
    }),
  );
};
