process.env.TZ = 'America/Toronto';

process.env.SEGMENT_DELETE_API_SOURCE_ID = 'testSourceId';
process.env.SEGMENT_REGULATIONS_ENDPOINT = 'TestRegulationsEndpoint';

process.env.MM_FOX_CODE = 'EXAMPLE_FOX_CODE';

process.env.SECURITY_ALERTS_API_ENABLED = 'true';
process.env.SECURITY_ALERTS_API_URL = 'https://example.com';

const config = {
  preset: 'react-native',
  setupFilesAfterEnv: [
    '<rootDir>/app/util/test/testSetup.js',
    '<rootDir>/e2e/init.js',
    '<rootDir>/jest.setup.js',
  ],
  transformIgnorePatterns: [
    'node_modules/(?!((@metamask/)?(@react-native|react-native|redux-persist-filesystem|@react-navigation|@react-native-community|@react-native-masked-view|react-navigation|react-navigation-redux-helpers|@sentry|d3-color|@notifee)))',
  ],
  transform: {
    '^.+\\.[jt]sx?$': 'babel-jest',
    '^.+\\.(png|jpg|jpeg|gif|webp|svg|mp4)$':
      '<rootDir>/app/util/test/assetFileTransformer.js',
  },
  snapshotSerializers: ['enzyme-to-json/serializer'],
  // This is an environment variable that can be used to execute logic only in development
  collectCoverage: process.env.NODE_ENV !== 'production',
  collectCoverageFrom: ['<rootDir>/app/**/*.{js,ts,tsx,jsx}'],
  coveragePathIgnorePatterns: [
    '__mocks__/',
    '<rootDir>/app/util/test/',
    '<rootDir>/app/util/testUtils/',
    '<rootDir>/app/lib/ppom/ppom.html.js',
    '<rootDir>/app/lib/ppom/blockaid-version.js',
    '<rootDir>/app/core/InpageBridgeWeb3.js',
  ],
  coverageReporters: ['text-summary', 'lcov'],
  coverageDirectory: '<rootDir>/tests/coverage',
  maxWorkers: process.env.NODE_ENV === 'production' ? '50%' : '20%',
  moduleNameMapper: {
    '\\.svg': '<rootDir>/app/__mocks__/svgMock.js',
    '\\.png': '<rootDir>/app/__mocks__/pngMock.js',
    '\\.detoxrc.json': '<rootDir>/.detoxrc.json',
  },
  // Disable jest cache
  cache: false,
};

if (process.env.TEST_ENV === 'e2e') {
  config.testMatch = ['<rootDir>/e2e/specs/**/*.spec.js'];
  config.testEnvironment = 'detox/runners/jest/testEnvironment';
  config.globalSetup = 'detox/runners/jest/globalSetup';
  config.globalTeardown = 'detox/runners/jest/globalTeardown';
} else {
  // For unit tests
  config.testMatch = ['<rootDir>/app/**/__tests__/**/*.js?(x)', '<rootDir>/app/**/?(*.)+(spec|test).js?(x)'];
  config.testEnvironment = 'jest-environment-jsdom';
  config.globalSetup = undefined;
  config.globalTeardown = undefined;
}

// eslint-disable-next-line import/no-commonjs
module.exports = config;