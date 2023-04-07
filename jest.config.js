process.env.TZ = 'America/Toronto';

const config = {
  preset: 'react-native',
  setupFiles: ['<rootDir>/app/util/test/testSetup.js'],
  transform: {
    '^.+\\.js$': '<rootDir>jest.preprocessor.js',
    '^.+\\.[jt]sx?$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@react-native|react-native|rn-fetch|redux-persist-filesystem|@react-navigation|@react-native-community|@react-native-masked-view|react-navigation|react-navigation-redux-helpers|@sentry))',
  ],
  snapshotSerializers: ['enzyme-to-json/serializer'],
  // This is an environment variable that can be used to execute logic only in development
  collectCoverage: process.env.NODE_ENV !== 'production',
  coveragePathIgnorePatterns: ['/node_modules/', '__mocks__', '<rootDir>/e2e/'],
  coverageReporters: ['text-summary', 'lcov'],
  coverageDirectory: '<rootDir>/tests/coverage',
  maxWorkers: process.env.NODE_ENV !== 'production' ? '25%' : '100%',
  moduleNameMapper: {
    '\\.svg': '<rootDir>/app/__mocks__/svgMock.js',
  },
};

// eslint-disable-next-line import/no-commonjs
module.exports = config;
