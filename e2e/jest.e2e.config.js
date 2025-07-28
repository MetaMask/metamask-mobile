/* eslint-disable import/no-commonjs */
require('dotenv').config({ path: '.e2e.env' });

// Determine maxWorkers based on environment
let workers = process.env.CI ? 2 : 1;

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
        outputName: 'junit.xml', // Single file with all test results (like junit-[hash].xml but with correct name)
        // Configuration for comprehensive test reporting
        suiteName: 'E2E Mobile Tests',
        classNameTemplate: '{filepath}',
        titleTemplate: '{classname} {title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: 'true',
        reportTestSuiteErrors: true,
        addFileAttribute: 'true',
        properties: (() => {
          // Debug: Check environment variables
          console.log('🔍 Jest Environment Variables:');
          console.log(`  JOB_NAME: "${process.env.JOB_NAME}"`);
          console.log(`  RUN_ID: "${process.env.RUN_ID}"`);
          console.log(`  PR_NUMBER: "${process.env.PR_NUMBER}"`);
          
          return {
            // These properties will be added to the JUnit XML for the test report script
            JOB_NAME: process.env.JOB_NAME || 'unknown-job',
            RUN_ID: process.env.RUN_ID || '0',
            PR_NUMBER: process.env.PR_NUMBER || '0',
          };
        })(),
      },
    ],
  ],
  testEnvironment: 'detox/runners/jest/testEnvironment',
  verbose: true,
};
