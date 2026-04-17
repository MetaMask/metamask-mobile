/* eslint-disable import-x/no-commonjs */
// Load .js.env for WATCHER_PORT used by helpers.js and general.flow.ts at
// test runtime. dotenv never overrides existing vars, so .e2e.env keys win
// when both files define the same key (in practice they don't overlap).
require('dotenv').config({ path: '.js.env' });
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
  setupFilesAfterEnv: ['<rootDir>/tests/init.detox.js'],
  globalSetup: 'detox/runners/jest/globalSetup',
  globalTeardown: 'detox/runners/jest/globalTeardown',
  reporters: [
    'detox/runners/jest/reporter',
    [
      'jest-junit',
      {
        outputDirectory: './tests/reports',
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
