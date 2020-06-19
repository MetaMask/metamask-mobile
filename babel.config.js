// eslint-disable-next-line import/no-commonjs
module.exports = {
	presets: ['module:metro-react-native-babel-preset'],
	plugins: ['transform-inline-environment-variables'],
	env: {
		production: {
			plugins: ['transform-remove-console']
		}
	}
};
