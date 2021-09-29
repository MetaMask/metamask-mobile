
/**
 * Metro configuration for React Native
 * https://github.com/facebook/react-native
 *
 * @format
 */

module.exports = {
	transformer: {
		getTransformOptions: async () => ({
			transform: {
				experimentalImportSupport: true,
				inlineRequires: true,
			},
		}),
		assetPlugins: ['react-native-svg-asset-plugin'],
		svgAssetPlugin: {
			pngCacheDir: '.png-cache',
			scales: [1],
			output: {
			  compressionLevel: 6,
			},
		  },
	},
	maxWorkers: 2
};
