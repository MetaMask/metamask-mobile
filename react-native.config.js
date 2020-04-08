// react-native.config.js
// eslint-disable-next-line import/no-commonjs
module.exports = {
	dependencies: {
		'react-native-aes-crypto': {
			platforms: {
				ios: null // disable Android platform, other platforms will still autolink if provided
			}
		},
		'react-native-os': {
			platforms: {
				ios: null // disable Android platform, other platforms will still autolink if provided
			}
		},
		'react-native-search-api': {
			platforms: {
				ios: null // disable Android platform, other platforms will still autolink if provided
			}
		},
		'react-native-tcp': {
			platforms: {
				ios: null // disable Android platform, other platforms will still autolink if provided
			}
		}
	}
};
