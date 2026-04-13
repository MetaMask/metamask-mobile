/* eslint-disable import-x/no-commonjs */
const baseConfig = require('./jest.config.js');

// Derive from base config and remove the view-test ignore entry to avoid drift.
const derivedIgnorePatterns = (baseConfig.testPathIgnorePatterns || []).filter(
  (pattern) => !pattern.includes('.view'),
);

module.exports = {
  ...baseConfig,
  setupFilesAfterEnv: ['<rootDir>/app/util/test/testSetupView.js'],
  testTimeout: 30000,
  forceExit: true,
  maxWorkers: 1,
  // Override jest.config.js: allow *.view.test.* here (view setup + single worker).
  testPathIgnorePatterns: derivedIgnorePatterns,
};
