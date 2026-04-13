/* eslint-disable import-x/no-commonjs */
const baseConfig = require('./jest.config.js');

module.exports = {
  ...baseConfig,
  setupFilesAfterEnv: ['<rootDir>/app/util/test/testSetupView.js'],
  testTimeout: 30000,
  forceExit: true,
  maxWorkers: 1,
  // Override jest.config.js: allow *.view.test.* here (view setup + single worker).
  testPathIgnorePatterns: [
    '.*/tests/(smoke|regression)/.*\\.spec\\.(ts|tsx|js)$',
    '.*/e2e/.*\\.spec\\.(ts|tsx|js)$',
    '.*/e2e/pages/',
    '.*/e2e/selectors/',
  ],
};
