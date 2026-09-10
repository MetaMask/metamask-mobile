const fs = require('fs');
const path = require('path');

process.env.TZ = 'America/Toronto';

/**
 * Build a jest moduleNameMapper *value* for a file inside the
 * `@metamask/perps-controller` package.
 *
 * Different releases of the controller ship different distribution shapes:
 * - 16.x → dual CJS/ESM (`dist/*.cjs` and `dist/*.js`)
 * - 17.x (and current previews) → ESM-only (`dist/*.js`)
 *
 * We probe the on-disk shape at config load time so tests keep working no
 * matter which version is installed (production or preview).
 *
 * @param {string} relativePath Path relative to the `dist/` directory,
 *   without extension. Empty string maps to `dist/index`.
 *   May include `$1`/`$2` placeholders for regex captures — these are
 *   ignored by the disk check and passed through untouched to jest.
 * @returns {string} An absolute filepath jest can rewrite the import to.
 */
function resolvePerpsControllerEntry(relativePath) {
  const base = path.join(
    __dirname,
    'node_modules',
    '@metamask',
    'perps-controller',
    'dist',
    relativePath || 'index',
  );
  // If the caller passed a regex-substituted path with capture groups,
  // we can't check the exact file on disk. Prefer .js in that case, as
  // that's the format used by 16.x + 17.x.
  if (base.includes('$')) {
    return `${base}.js`;
  }
  return fs.existsSync(`${base}.cjs`) ? `${base}.cjs` : `${base}.js`;
}


// Unit tests need a test-like environment before Babel transforms app modules.
process.env.METAMASK_ENVIRONMENT ??= 'test';

process.env.MM_INFURA_PROJECT_ID = 'fake-infura-project-id';

process.env.SEGMENT_DELETE_API_SOURCE_ID = 'testSourceId';
process.env.SEGMENT_REGULATIONS_ENDPOINT = 'TestRegulationsEndpoint';

process.env.MM_FOX_CODE = 'EXAMPLE_FOX_CODE';

process.env.MM_SECURITY_ALERTS_API_ENABLED = 'true';
process.env.SECURITY_ALERTS_API_URL = 'https://example.com';
process.env.COMPLIANCE_API_URL = 'https://compliance.example.com';

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
  // RN 0.85 removes the bundled 'react-native' Jest preset in favor of the
  // extracted '@react-native/jest-preset' package (functionally identical on
  // RN 0.83). Landed pre-upgrade so the RN 0.85 upgrade PR stays minimal.
  preset: '@react-native/jest-preset',
  setupFilesAfterEnv: ['<rootDir>/app/util/test/testSetup.js'],
  testEnvironment: 'jest-environment-node',
  transformIgnorePatterns: [
    // NOTE: @metamask/base-controller, @metamask/controller-utils, and
    // @metamask/abi-utils are transitive deps of @metamask/perps-controller.
    // 17.x ships them ESM-only under a nested node_modules; each nested
    // `node_modules/` in the path causes the outer negative lookahead to
    // re-evaluate, so they must appear as top-level allow-list entries
    // (not scoped under perps-controller) to be transformed.
    'node_modules/(?!((@metamask/)?(@react-native|react-native|redux-persist-filesystem|@react-navigation|@react-native-community|@react-native-masked-view|react-navigation|react-navigation-redux-helpers|@sentry|d3-color|d3-shape|d3-path|d3-scale|d3-array|d3-time|d3-format|d3-interpolate|d3-selection|d3-axis|d3-transition|internmap|react-native-wagmi-charts|react-native-nitro-modules|@notifee|expo-file-system|expo-modules-core|expo(nent)?|@expo(nent)?/.*)|@noble/.*|@nktkas/hyperliquid|@metamask/design-system-twrnc-preset|@metamask/design-system-react-native|@metamask/native-utils|@metamask/perps-controller|@metamask/base-controller|@metamask/controller-utils|@metamask/abi-utils|@metamask/messenger|@metamask/superstruct|@metamask/utils|lodash-es|@metamask/smart-transactions-controller|@tommasini/react-native-scrollable-tab-view|@veriff/react-native-sdk|@sumsub/react-native-mobilesdk-module|@braze/react-native-sdk|uuid))',
  ],
  transform: {
    '^.+\\.[jt]sx?$': ['babel-jest', { configFile: './babel.config.tests.js' }],
    '^.+\\.cjs$': ['babel-jest', { configFile: './babel.config.tests.js' }],
    '^.+\\.mjs$': ['babel-jest', { configFile: './babel.config.tests.js' }],
    '^.+\\.(png|jpg|jpeg|gif|webp|svg|mp4|riv)$':
      '<rootDir>/app/util/test/assetFileTransformer.js',
  },
  snapshotSerializers: [],
  snapshotFormat: {
    // Prevent pretty-format from recursing infinitely into deeply nested
    // objects (e.g. Reanimated shared values with circular refs, React fiber
    // nodes). The default is Infinity which causes RangeError: Invalid string length.
    maxDepth: 15,
  },
  // Disable coverage collection for Reassure runs to avoid OOM
  collectCoverage: !isReassureRun && process.env.NODE_ENV !== 'production',
  collectCoverageFrom: !isReassureRun
    ? [
        '<rootDir>/app/**/*.{js,ts,tsx,jsx}',
        '!<rootDir>/app/**/*.stories.tsx',
        '!<rootDir>/app/**/*.test.{js,ts,tsx,jsx}',
        '!<rootDir>/app/**/*.spec.{js,ts,tsx,jsx}',
      ]
    : undefined,
  coveragePathIgnorePatterns: [
    '__mocks__/',
    '<rootDir>/app/util/test/',
    '<rootDir>/app/util/testUtils/',
    '<rootDir>/app/core/InpageBridgeWeb3.js',
    '<rootDir>/app/features/SampleFeature/e2e/',
    '<rootDir>/app/components/UI/MarketInsights/components/MarketInsightsEntryCard/MarketInsightsEntryCardOriginal.tsx',
    '<rootDir>/app/components/UI/MarketInsights/components/MarketInsightsEntryCard/AnimatedGradientBorder.tsx',
  ],
  testPathIgnorePatterns: [
    '.*/tests/(smoke|regression|performance)/.*\\.spec\\.(ts|tsx|js)$',
    '.*/e2e/.*\\.spec\\.(ts|js)$',
    '.*/e2e/pages/',
    '.*/e2e/selectors/',
    '.*\\.integration\\.test\\.(ts|tsx)$',
    '.*\\.view\\.test\\.(ts|tsx)$',
  ],
  coverageReporters: ['text-summary', 'lcov'],
  coverageDirectory: '<rootDir>/tests/coverage',
  maxWorkers: process.env.CI ? '50%' : '20%',
  moduleNameMapper: {
    '\\.(svg)$': '<rootDir>/app/__mocks__/svgMock.js',
    '\\.(png)$': '<rootDir>/app/__mocks__/pngMock.js',
    '\\.(mp4)$': '<rootDir>/app/__mocks__/mp4Mock.js',
    '^react-native-video$': '<rootDir>/app/__mocks__/react-native-video.tsx',
    '\\webview/index.html': '<rootDir>/app/__mocks__/htmlMock.ts',
    '^@expo/vector-icons@expo/vector-icons$': 'react-native-vector-icons',
    '^@expo/vector-icons/(.*)': 'react-native-vector-icons/$1',
    '^@metamask/native-utils$':
      '<rootDir>/app/__mocks__/@metamask/native-utils.js',
    // NOTE: @metamask/perps-controller 16.x shipped a dual CJS/ESM build
    // (dist/*.cjs and dist/*.js). 17.x (and current previews) ship
    // ESM-only under dist/*.js. To stay compatible with either shape,
    // resolve the file dynamically at config load time and prefer .cjs
    // when it exists, falling back to .js.
    '^@metamask/perps-controller$': resolvePerpsControllerEntry(''),
    '^@metamask/perps-controller/(constants|types|utils)$':
      resolvePerpsControllerEntry('$1/index'),
    '^@metamask/perps-controller/(constants|types|utils)/(.*)$':
      resolvePerpsControllerEntry('$1/$2'),
    '^@metamask/perps-controller/(.*)$': resolvePerpsControllerEntry('$1'),
    '^@nktkas/hyperliquid(/.*)?$': '<rootDir>/app/__mocks__/hyperliquidMock.js',
    // @metamask/perps-controller@9.1.0+ ships a broken CJS build whose
    // bundler baked in a CI-only absolute path (a file:// URL left over from
    // its CI build environment) instead of the `@nktkas/hyperliquid`
    // specifier (the ESM build is unaffected). Map it to the same mock used
    // for the npm package above so jest.requireActual can load
    // @metamask/perps-controller without crashing, until upstream publishes a fix.
    '^file:///home/runner/work/hyperliquid/hyperliquid/src/mod\\.ts$':
      '<rootDir>/app/__mocks__/hyperliquidMock.js',
    '^expo-auth-session(/.*)?$': '<rootDir>/app/__mocks__/expo-auth-session.js',
    '^expo-apple-authentication(/.*)?$':
      '<rootDir>/app/__mocks__/expo-apple-authentication.js',
    '^expo-haptics(/.*)?$': '<rootDir>/app/__mocks__/expo-haptics.js',
    '^expo-local-authentication(/.*)?$':
      '<rootDir>/app/__mocks__/expo-local-authentication.ts',
    '^expo-screen-orientation(/.*)?$':
      '<rootDir>/app/__mocks__/expo-screen-orientation.js',
    '^expo-image$': '<rootDir>/app/__mocks__/expo-image.js',
    '^expo$': '<rootDir>/app/__mocks__/expo.ts',
    '^expo-updates(/.*)?$': '<rootDir>/app/__mocks__/expo-updates.ts',
    '^@metamask/design-system-react-native/spinner$':
      '<rootDir>/app/__mocks__/spinnerMock.js',
    '^@metamask/design-system-react-native/dist/components/temp-components/Spinner/index.cjs$':
      '<rootDir>/app/__mocks__/spinnerMock.js',
    '^@rive-app/react-native$':
      '<rootDir>/app/__mocks__/rive-app-react-native.tsx',
    '^react-native-qrcode-svg$':
      '<rootDir>/app/__mocks__/react-native-qrcode-svg.js',
  },
  cache: true,
  ...(process.env.JEST_CACHE_DIRECTORY && {
    cacheDirectory: process.env.JEST_CACHE_DIRECTORY,
  }),
};

// eslint-disable-next-line import-x/no-commonjs
module.exports = config;
