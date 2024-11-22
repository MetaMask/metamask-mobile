/* eslint-disable import/no-commonjs */
/**
 * Metro configuration for React Native
 * https://github.com/facebook/react-native
 *
 * @type {import('metro-config').MetroConfig}
 */

const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const path = require("path");

const featureFlagModuleDir = path.resolve(__dirname, "../../core/feature-flags/packages/remote-feature-flag-controller");

const extraNodeModules = {
  "@metamask/remote-feature-flag-controller": featureFlagModuleDir,
};

const watchFolders = [
  featureFlagModuleDir,
];

module.exports = function (baseConfig) {
  const defaultConfig = mergeConfig(baseConfig, getDefaultConfig(__dirname));
  const {
    resolver: { assetExts, sourceExts },
  } = defaultConfig;

  return mergeConfig(defaultConfig, {
    watchFolders,
    resolver: {
      assetExts: assetExts.filter((ext) => ext !== 'svg'),
      sourceExts: [...sourceExts, 'svg', 'cjs', 'mjs'],
      resolverMainFields: ['sbmodern', 'react-native', 'browser', 'main'],
      extraNodeModules: new Proxy (extraNodeModules, {
        get: (target, name) =>
          name in target ? target[name] : path.join(process.cwd(), `node_modules/${name}`),
      }),
      unstable_enableSymlinks: true,
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
