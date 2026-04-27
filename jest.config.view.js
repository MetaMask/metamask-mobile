/* eslint-disable import-x/no-commonjs */
const baseConfig = require('./jest.config.js');

module.exports = {
  ...baseConfig,
  setupFilesAfterEnv: ['<rootDir>/app/util/test/testSetupView.js'],
  testPathIgnorePatterns: (baseConfig.testPathIgnorePatterns || []).filter(
    (pattern) => !pattern.includes('view'),
  ),
  testMatch: ['**/*.view.test.ts?(x)'],
  testTimeout: 30000,
  forceExit: true,
  maxWorkers: process.env.CI ? 2 : 1,
  workerIdleMemoryLimit: '512MB',
};
