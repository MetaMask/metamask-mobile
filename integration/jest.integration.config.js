// Reuse the base Jest config and override only what we need for integration tests
// eslint-disable-next-line import/no-commonjs
const baseConfig = require('../jest.config');
// eslint-disable-next-line import/no-commonjs
const path = require('path');

/** @type {import('jest').Config} */
// eslint-disable-next-line import/no-commonjs
module.exports = {
  ...baseConfig,
  rootDir: path.resolve(__dirname, '..'),
  testMatch: ['<rootDir>/integration/**/*.test.(ts|tsx|js)'],
  // Keep the same RN preset and setup to leverage existing mocks
  setupFiles: ['<rootDir>/integration/setupFiles.pre-env.js'],
  setupFilesAfterEnv: baseConfig.setupFilesAfterEnv,
  testEnvironment: baseConfig.testEnvironment,
  transformIgnorePatterns: baseConfig.transformIgnorePatterns,
  transform: baseConfig.transform,
  moduleNameMapper: {
    ...baseConfig.moduleNameMapper,
    '^react-native-qrcode-svg$':
      '<rootDir>/integration/mocks/react-native-qrcode-svg.js',
    '^@metamask/react-native-button$':
      '<rootDir>/integration/mocks/react-native-button.js',
    '^react-native-material-textfield$':
      '<rootDir>/integration/mocks/react-native-material-textfield.js',
    '^expo-sensors(/.*)?$': '<rootDir>/integration/mocks/expo-sensors.js',
    '^react-native-device-info$':
      '<rootDir>/integration/mocks/react-native-device-info.js',
    '^@react-native-community/netinfo$':
      '<rootDir>/integration/mocks/netinfo.js',
    '^react-native-screens$':
      '<rootDir>/integration/mocks/react-native-screens.js',
    '.*/components/UI/FoxLoader/FoxLoader$':
      '<rootDir>/integration/mocks/empty-component.js',
    '.*/components/UI/FadeOutOverlay/index$':
      '<rootDir>/integration/mocks/empty-component.js',
    '.*/components/Nav/Main/index$':
      '<rootDir>/integration/mocks/wallet-main.js',
    '^../Main$': '<rootDir>/integration/mocks/wallet-main.js',
    '.*/lib/ppom/PPOMView$': '<rootDir>/integration/mocks/ppomview.js',
  },
  // Integration run: do not collect coverage from the whole app to avoid scanning unit test files
  collectCoverage: false,
  collectCoverageFrom: [],
  cache: false,
};
