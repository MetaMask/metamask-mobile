process.env.TZ = 'America/Toronto';

const config = {
	preset: 'react-native',
	setupFiles: ['<rootDir>/app/util/testSetup.js'],
	transform: {
		'^.+\\.js$': '<rootDir>jest.preprocessor.js',
	},
	transformIgnorePatterns: [
		'node_modules/(?!(@react-native|react-native|rn-fetch|redux-persist-filesystem|@react-navigation|@react-native-community|@react-native-masked-view|react-navigation|react-navigation-redux-helpers|@sentry))',
	],
	snapshotSerializers: ['enzyme-to-json/serializer'],
	collectCoverage: true,
	coveragePathIgnorePatterns: ['/node_modules/', '__mocks__', '<rootDir>/e2e/'],
	coverageReporters: ['text-summary', 'lcov'],
	coverageDirectory: '<rootDir>/tests/coverage',
};

// eslint-disable-next-line import/no-commonjs
module.exports = config;
