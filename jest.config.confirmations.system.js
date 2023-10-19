process.env.TZ = 'America/Toronto';
process.env.MM_BLOCKAID_UI_ENABLED = 'true';

const config = {
  preset: 'react-native',
  setupFilesAfterEnv: ['<rootDir>/app/util/test/testSetup.js'],
  testEnvironment: 'jest-environment-node',
  transformIgnorePatterns: [
    'node_modules/(?!(@react-native|react-native|rn-fetch|redux-persist-filesystem|@react-navigation|@react-native-community|@react-native-masked-view|react-navigation|react-navigation-redux-helpers|@sentry|d3-color))',
  ],
  transform: {
    '^.+\\.[jt]sx?$': 'babel-jest',
    '^.+\\.(png|jpg|jpeg|gif|webp|svg|mp4)$':
      '<rootDir>/app/util/test/assetFileTransformer.js',
  },
  snapshotSerializers: ['enzyme-to-json/serializer'],
  // This is an environment variable that can be used to execute logic only in development
  testMatch: [
    '<rootDir>/app/**/?(*.)+(spec|test).[jt]s?(x)',
    '<rootDir>/locales/**/?(*.)+(spec|test).[jt]s?(x)',
  ],
  collectCoverage: process.env.NODE_ENV !== 'production',
  collectCoverageFrom: [
    '<rootDir>/app/components/Approvals/**/*.[jt]s?(x)',
    '<rootDir>/app/components/hooks/useApproval*.[jt]s?(x)',
    '<rootDir>/app/components/UI/Approval/**/*.[jt]s?(x)',
    '<rootDir>/app/components/UI/TemplateRenderer/**/*.[jt]s?(x)',
    '<rootDir>/app/selectors/approvalController*.[jt]s?(x)',
  ],
  coveragePathIgnorePatterns: [
    '__mocks__/',
    '<rootDir>/app/util/test/',
    '<rootDir>/app/util/testUtils/',
    '<rootDir>/app/lib/ppom/ppom.html.js',
  ],
  coverageReporters: ['text-summary', 'lcov'],
  coverageDirectory: '<rootDir>/tests/coverage',
  maxWorkers: process.env.NODE_ENV === 'production' ? '50%' : '20%',
  moduleNameMapper: {
    '\\.svg': '<rootDir>/app/__mocks__/svgMock.js',
    '\\.png': '<rootDir>/app/__mocks__/pngMock.js',
  },
};

// eslint-disable-next-line import/no-commonjs
module.exports = config;
