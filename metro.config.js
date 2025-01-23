/* eslint-disable import/no-commonjs */
/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */

const { getDefaultConfig } = require('expo/metro-config');
const { mergeConfig } = require('@react-native/metro-config');
const path = require('path');

module.exports = function (baseConfig) {
  const defaultConfig = mergeConfig(baseConfig, getDefaultConfig(__dirname));
  const {
    resolver: { assetExts, sourceExts },
  } = defaultConfig;

  return mergeConfig(defaultConfig, {
    resolver: {
      assetExts: assetExts.filter((ext) => ext !== 'svg'),
      sourceExts: [...sourceExts, 'svg', 'cjs', 'mjs'],
      resolverMainFields: ['sbmodern', 'react-native', 'browser', 'main'],
      extraNodeModules: {
        crypto: require.resolve('react-native-crypto'),
        module: path.resolve(
          __dirname,
          'node_modules/node-libs-react-native/mock/module.js',
        ),
      },
    },
    transformer: {
      babelTransformerPath: require.resolve('./metro.transform.js'),
      assetPlugins: ['expo-asset/tools/hashAssetFiles'], // Ensure expo-asset is included
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
