process.env.TZ = 'America/Toronto';

const config = {
	preset: 'react-native',
	setupFiles: ['<rootDir>/app/util/testSetup.js'],
	transform: {
		'^.+\\.js$': '<rootDir>jest.preprocessor.js',
	},
	transformIgnorePatterns: [
		'node_modules/(?!(react-native|rn-fetch|redux-persist-filesystem|@react-navigation|@react-native-community|@react-native-masked-view|react-navigation|react-navigation-redux-helpers|@sentry))',
	],
	snapshotSerializers: ['enzyme-to-json/serializer'],
	collectCoverage: false,
	collectCoverageFrom: [
		'<rootDir>/app/**/*.{js,jsx}',
		'!<rootDir>/node_modules/',
		'!<rootDir>/app/util/*.{js,jsx}',
		'!<rootDir>/app/entry*.js',
	],
};

// eslint-disable-next-line import/no-commonjs
module.exports = config;
