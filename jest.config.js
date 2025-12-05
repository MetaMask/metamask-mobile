process.env.TZ = 'America/Toronto';

process.env.SEGMENT_DELETE_API_SOURCE_ID = 'testSourceId';
process.env.SEGMENT_REGULATIONS_ENDPOINT = 'TestRegulationsEndpoint';

process.env.MM_FOX_CODE = 'EXAMPLE_FOX_CODE';

process.env.MM_SECURITY_ALERTS_API_ENABLED = 'true';
process.env.SECURITY_ALERTS_API_URL = 'https://example.com';

process.env.LAUNCH_DARKLY_URL =
  'https://client-config.dev-api.cx.metamask.io/v1';

process.env.MM_SMART_ACCOUNT_UI_ENABLED = 'true';

process.env.ANDROID_APPLE_CLIENT_ID = 'AppleClientId';
process.env.ANDROID_GOOGLE_SERVER_CLIENT_ID = 'androidGoogleWebClientId';

process.env.IOS_GOOGLE_CLIENT_ID = 'iosGoogleClientId';
process.env.IOS_GOOGLE_REDIRECT_URI = 'iosGoogleRedirectUri';

process.env.MM_CARD_BAANX_API_CLIENT_KEY = 'test-api-key';

// When running Reassure perf tests we want to avoid Jest coverage to reduce memory usage
const isReassureRun = process.env.REASSURE === 'true';

const config = {
  preset: 'react-native',
  setupFilesAfterEnv: ['<rootDir>/app/util/test/testSetup.js'],
  testEnvironment: 'jest-environment-node',
  transformIgnorePatterns: [
    'node_modules/(?!((@metamask/)?(@react-native|react-native|redux-persist-filesystem|@react-navigation|@react-native-community|@react-native-masked-view|react-navigation|react-navigation-redux-helpers|@sentry|d3-color|d3-shape|d3-path|d3-scale|d3-array|d3-time|d3-format|d3-interpolate|d3-selection|d3-axis|d3-transition|internmap|react-native-wagmi-charts|@notifee|expo-file-system|expo-modules-core|expo(nent)?|@expo(nent)?/.*)|@noble/.*|@nktkas/hyperliquid|@metamask/design-system-twrnc-preset|@metamask/design-system-react-native|@tommasini/react-native-scrollable-tab-view))',
  ],
  transform: {
    '^.+\\.[jt]sx?$': ['babel-jest', { configFile: './babel.config.tests.js' }],
    '^.+\\.cjs$': ['babel-jest', { configFile: './babel.config.tests.js' }],
    '^.+\\.(png|jpg|jpeg|gif|webp|svg|mp4|riv)$':
      '<rootDir>/app/util/test/assetFileTransformer.js',
  },
  snapshotSerializers: ['enzyme-to-json/serializer'],
  // Disable coverage collection for Reassure runs to avoid OOM
  collectCoverage: !isReassureRun && process.env.NODE_ENV !== 'production',
  collectCoverageFrom: !isReassureRun
    ? ['<rootDir>/app/**/*.{js,ts,tsx,jsx}', '!<rootDir>/app/**/*.stories.tsx']
    : undefined,
  coveragePathIgnorePatterns: [
    '__mocks__/',
    '<rootDir>/app/util/test/',
    '<rootDir>/app/util/testUtils/',
    '<rootDir>/app/core/InpageBridgeWeb3.js',
    '<rootDir>/app/features/SampleFeature/e2e/',
  ],
  testPathIgnorePatterns: [
    '.*/e2e/specs/.*\\.spec\\.(ts|js)$',
    '.*/e2e/pages/',
    '.*/e2e/selectors/',
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
    '^@nktkas/hyperliquid(/.*)?$': '<rootDir>/app/__mocks__/hyperliquidMock.js',
    '^expo-auth-session(/.*)?$': '<rootDir>/app/__mocks__/expo-auth-session.js',
    '^expo-apple-authentication(/.*)?$':
      '<rootDir>/app/__mocks__/expo-apple-authentication.js',
    '^expo-haptics(/.*)?$': '<rootDir>/app/__mocks__/expo-haptics.js',
    '^expo-screen-orientation(/.*)?$':
      '<rootDir>/app/__mocks__/expo-screen-orientation.js',
    '^expo-image$': '<rootDir>/app/__mocks__/expo-image.js',
    '^expo-updates(/.*)?$': '<rootDir>/app/__mocks__/expo-updates.ts',
    '^@metamask/design-system-react-native/dist/components/temp-components/Spinner/index.cjs$':
      '<rootDir>/app/__mocks__/spinnerMock.js',
    '^rive-react-native$': '<rootDir>/app/__mocks__/rive-react-native.tsx',
  },
  // Disable jest cache
  cache: false,
};

// eslint-disable-next-line import/no-commonjs
module.exports = config;
