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
        // Add properties to include CI metadata
        addFileAttribute: 'true',
        testExecutionProperties: {
          JOB_NAME: process.env.JOB_NAME || '',
          RUN_ID: process.env.RUN_ID || '',
          PR_NUMBER: process.env.PR_NUMBER || '',
        },
      },
    ],
  ],
  testEnvironment: 'detox/runners/jest/testEnvironment',
  verbose: true,
};