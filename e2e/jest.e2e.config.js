/* eslint-disable import/no-commonjs */
require('dotenv').config({ path: '.e2e.env' });

// Due the emulator resource constraints, is much better to run the tests in band (1 worker)
// Multiple workers will cause the tests to fail due to resource constraints.
// Read https://medium.com/adobetech/improve-jest-runner-performance-a8f56708ba94

module.exports = {
  rootDir: '..',
  testMatch: ['<rootDir>/tests/**/*.spec.{js,ts}'],
  testTimeout: 300000,
  maxWorkers: 1,
  clearMocks: true,
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
        outputName: (() => {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          return `junit-${timestamp}.xml`;
        })(),
      },
    ],
  ],
  testEnvironment: 'detox/runners/jest/testEnvironment',
  verbose: true,
};
