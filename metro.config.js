/* eslint-disable import/no-commonjs */
/**
 * Metro configuration for React Native
 * https://github.com/facebook/react-native
 *
 * @format
 */

const { getDefaultConfig } = require('metro-config');

// const sdkRootPath = '/Users/arthurbreton/Projects/metamask/metamask-sdk/'

module.exports = (async () => {
  const {
    resolver: { sourceExts, assetExts },
  } = await getDefaultConfig();
  return {
    transformer: {
      getTransformOptions: async () => ({
        transform: {
          experimentalImportSupport: true,
          inlineRequires: true,
        },
      }),
      babelTransformerPath: require.resolve('react-native-svg-transformer'),
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
      sourceExts: [...sourceExts, 'svg'],
      // // nodeModulesPaths: [
      // //   `${sdkRootPath}packages/sdk-communication-layer/node_modules`,
      // //   `${sdkRootPath}packages/sdk/node_modules`,
      // //   `${sdkRootPath}node_modules`,
      // // ],
      // resolveRequest(context, moduleName, platform) {
      //   // eslint-disable-next-line no-console
      //   console.debug(`Custom resolve request ${moduleName}`, moduleName);
      //   if (moduleName === '@metamask/sdk-communication-layer') {
      //     // eslint-disable-next-line no-console
      //     console.debug(`CUSTOM RESOLVER ${moduleName}`);
      //     // Logic to resolve the module name to a file path...
      //     // NOTE: Throw an error if there is no resolution.
      //     return {
      //       filePath:
      //         sdkRootPath + 'packages/sdk-communication-layer/src/index.ts',
      //       type: 'sourceFile',
      //     };
      //   }
      // return undefined;
      // },
    },
    maxWorkers: 2,
  };
})();
