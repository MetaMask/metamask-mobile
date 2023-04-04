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
    resolver: { assetExts, sourceExts },
  } = await getDefaultConfig();

  console.log('transformero', assetExts, sourceExts);

  return {
    transformer: {
      babelTransformerPath: require.resolve('react-native-svg-transformer'),
      getTransformOptions: async () => ({
        transform: {
          experimentalImportSupport: false,
          inlineRequires: true,
        },
      }),
    /*   assetPlugins: ['react-native-svg-asset-plugin'], */
    /*   svgAssetPlugin: { */
    /*     pngCacheDir: '.png-cache', */
    /*     scales: [1], */
    /*     output: { */
    /*       compressionLevel: 6, */
    /*     }, */
    /*   }, */
    },
    resolver: {
      ...resolver,
      assetExts: resolver.assetExts.filter((ext) => ext !== 'svg'),
      sourceExts: [...resolver.sourceExts, 'svg'],
    },
  };
})();
