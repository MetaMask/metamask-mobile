// react-native.config.js
// eslint-disable-next-line import/no-commonjs
module.exports = {
	dependencies: {
		'react-native-aes-crypto': {
			platforms: {
				ios: null // disable Android platform, other platforms will still autolink if provided
			}
		},
		'react-native-gesture-handler': {
			platforms: {
				android: null // disable Android platform, other platforms will still autolink if provided
			}
		}
	}
};
