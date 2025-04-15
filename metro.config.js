/* eslint-disable import/no-commonjs */
/**
 * Metro configuration for React Native
 * https://github.com/facebook/react-native
 *
 * @type {import('metro-config').MetroConfig}
 */

const { getDefaultConfig } = require('expo/metro-config');
const { mergeConfig } = require('@react-native/metro-config');

// Maps out the file extension to use for the mock files based on the
// RN_SRC_EXT environment variable passed in to the build and start commands
const mockExts = process.env.RN_SRC_EXT !== undefined
  ? process.env.RN_SRC_EXT.split(',').map(ext => ext.trim())
  : [];

module.exports = function (baseConfig) {
  const defaultConfig = mergeConfig(baseConfig, getDefaultConfig(__dirname));
  const {
    resolver: { assetExts, sourceExts },
  } = defaultConfig;

  return mergeConfig(defaultConfig, {
    resolver: {
      assetExts: assetExts.filter((ext) => ext !== 'svg'),
      sourceExts: [...mockExts, ...sourceExts, 'svg', 'cjs', 'mjs'],
      resolverMainFields: ['sbmodern', 'react-native', 'browser', 'main'],
    },
    transformer: {
      babelTransformerPath: require.resolve('./metro.transform.js'),
      assetPlugins: ['react-native-svg-asset-plugin'],
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
    resetCache: true,
  });
};
