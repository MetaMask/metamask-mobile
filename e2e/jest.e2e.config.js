/* eslint-disable import/no-commonjs */
require('dotenv').config({ path: '.e2e.env' });

// Determine maxWorkers based on environment
let workers = process.env.GITHUB_CI ? 2 : process.env.CI ? 3 : 1;

// Set maxWorkers to 1 for performance workflows
if (process.env.BITRISE_TRIGGERED_WORKFLOW_ID) {
  const workflowId = process.env.BITRISE_TRIGGERED_WORKFLOW_ID;
  if (
    workflowId === 'run_tag_smoke_performance_ios' ||
    workflowId === 'run_tag_smoke_performance_android'
  ) {
    workers = 1;
  }
}

module.exports = {
  rootDir: '..',
  testMatch: ['<rootDir>/e2e/specs/**/*.spec.{js,ts}'],
  testTimeout: 500000,
  maxWorkers: workers,
  setupFilesAfterEnv: ['<rootDir>/e2e/init.js'],
  globalSetup: 'detox/runners/jest/globalSetup',
  globalTeardown: 'detox/runners/jest/globalTeardown',
  reporters: [
    'detox/runners/jest/reporter',
    [
      'jest-junit',
      {
        outputDirectory: './e2e/reports',
        classNameTemplate: '{filepath}',
        uniqueOutputName: true,
        // Include retry attempt in test name for better tracking
        testNameTemplate: '{title} (attempt {retryAttempt})',
      },
    ],
  ],
  testEnvironment: 'detox/runners/jest/testEnvironment',
  verbose: true,
  // Jest retry configuration - retry failed tests once
  retryTimes: 1,
};
