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

// Apply SES Hermes shim on Android (Hermes) and Expo dev server by default
let hermesRuntime = true;

// Apply SES Vanilla shim on iOS (RN JSC)
if (parsedArgs.values.platform === 'ios' || parsedArgs.positionals[0] === 'run:ios') {
  // TODO: Remove once iOS upgraded to Hermes (i.e. both platforms on Hermes)
  hermesRuntime = false;
}

// TODO: Remove console warnings once iOS on Hermes (i.e. both platforms on Hermes)
if (parsedArgs.positionals[0] === 'start') {
  // Warn since we cannot detect Android/iOS from Expo dev server 'a' or 'i' keypress, nor when running Detox debug-mode locally
  console.warn('Expo dev server detected, @lavamoat/react-native-lockdown defaulting to "hermesRuntime: true"');
  console.warn('› to debug iOS please run "yarn start:ios" for correct hermesRuntime detection and lockdown behaviour');
  console.warn('› to debug iOS (Detox) please set "hermesRuntime: false" in metro.config.js then launch E2E tests');
}

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
      serializer: lockdownSerializer(
        { hermesRuntime },
        {
          getPolyfills,
        },
      ),
      resetCache: true,
    }),
  );
};
