module.exports = {
	presets: ['module:metro-react-native-babel-preset', 'module:react-native-dotenv'],
	plugins: ['transform-inline-environment-variables'],
	env: {
		production: {
			plugins: ['transform-remove-console']
		}
	}
};
