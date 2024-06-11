/* eslint-disable import/no-commonjs */
/**
 * Metro configuration for React Native
 * https://github.com/facebook/react-native
 *
 * @format
 */

const { getDefaultConfig } = require('metro-config');

module.exports = (async () => {
  const {
    resolver: { sourceExts: defaultSourceExts, assetExts },
  } = await getDefaultConfig();
  const exts = [...defaultSourceExts, 'svg', 'cjs'];
  const sourceExts = process.env.IS_TEST
    ? ['mock.ts', 'mock.js', ...exts]
    : exts;
  return {
    transformer: {
      getTransformOptions: async () => ({
        transform: {
          experimentalImportSupport: true,
          inlineRequires: true,
        },
      }),
      resetCache: true,
      babelTransformerPath: require.resolve('./metro.transform.js'),
      assetPlugins: ['react-native-svg-asset-plugin'],
      svgAssetPlugin: {
        pngCacheDir: '.png-cache',
        scales: [1],
        output: {
          compressionLevel: 6,
        },
      },
    },
    resolver: {
      assetExts: assetExts.filter((ext) => ext !== 'svg'),
      // sourceExts: [...sourceExts, 'svg', 'cjs'],
      sourceExts,
      resolverMainFields: ['sbmodern', 'react-native', 'browser', 'main'],
    },
    maxWorkers: 2,
  };
})();
