process.env.TZ = 'America/Toronto';

process.env.SEGMENT_DELETE_API_SOURCE_ID = 'testSourceId';
process.env.SEGMENT_REGULATIONS_ENDPOINT = 'TestRegulationsEndpoint';

process.env.MM_FOX_CODE = 'EXAMPLE_FOX_CODE';

process.env.MM_SECURITY_ALERTS_API_ENABLED = 'true';
process.env.PORTFOLIO_VIEW = 'true';
process.env.SECURITY_ALERTS_API_URL = 'https://example.com';

process.env.LAUNCH_DARKLY_URL =
  'https://client-config.dev-api.cx.metamask.io/v1';

process.env.MM_SMART_ACCOUNT_UI_ENABLED = 'true';

process.env.ANDROID_APPLE_CLIENT_ID = 'AppleClientId';
process.env.ANDROID_GOOGLE_SERVER_CLIENT_ID = 'androidGoogleWebClientId';

process.env.IOS_GOOGLE_CLIENT_ID = 'iosGoogleClientId';
process.env.IOS_GOOGLE_REDIRECT_URI = 'iosGoogleRedirectUri';

const config = {
  preset: 'react-native',
  setupFilesAfterEnv: ['<rootDir>/app/util/test/testSetup.js'],
  testEnvironment: 'jest-environment-node',
  transformIgnorePatterns: [
    'node_modules/(?!((@metamask/)?(@react-native|react-native|redux-persist-filesystem|@react-navigation|@react-native-community|@react-native-masked-view|react-navigation|react-navigation-redux-helpers|@sentry|d3-color|d3-shape|d3-path|d3-scale|d3-array|d3-time|d3-format|d3-interpolate|d3-selection|d3-axis|d3-transition|internmap|react-native-wagmi-charts|@notifee|expo-file-system|expo-modules-core|expo(nent)?|@expo(nent)?/.*)|@noble/.*|@deeeed/hyperliquid-node20|@metamask/design-system-twrnc-preset|@metamask/design-system-react-native))',
  ],
  transform: {
    '^.+\\.[jt]sx?$': ['babel-jest', { configFile: './babel.config.tests.js' }],
    '^.+\\.cjs$': ['babel-jest', { configFile: './babel.config.tests.js' }],
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
    '\\.(svg)$': '<rootDir>/app/__mocks__/svgMock.js',
    '\\.(png)$': '<rootDir>/app/__mocks__/pngMock.js',
    '\\webview/index.html': '<rootDir>/app/__mocks__/htmlMock.ts',
    '^@expo/vector-icons@expo/vector-icons$': 'react-native-vector-icons',
    '^@expo/vector-icons/(.*)': 'react-native-vector-icons/$1',
    '^@deeeed/hyperliquid-node20(/.*)?$':
      '<rootDir>/app/__mocks__/hyperliquidMock.js',
    '^expo-auth-session(/.*)?$': '<rootDir>/app/__mocks__/expo-auth-session.js',
    '^expo-apple-authentication(/.*)?$':
      '<rootDir>/app/__mocks__/expo-apple-authentication.js',
  },
  // Disable jest cache
  cache: false,
};

// eslint-disable-next-line import/no-commonjs
module.exports = config;
