/* eslint-disable import-x/no-commonjs */
const baseConfig = require('./jest.config.js');

module.exports = {
  ...baseConfig,
  setupFilesAfterEnv: ['<rootDir>/app/util/test/testSetupView.js'],
  testTimeout: 30000,
  forceExit: true,
  maxWorkers: 1,
  // Re-include *.view.test.* files excluded from the base config
  testPathIgnorePatterns: (baseConfig.testPathIgnorePatterns ?? []).filter(
    (p) => p !== '\\.view\\.test\\.(ts|tsx)$',
  ),
};
