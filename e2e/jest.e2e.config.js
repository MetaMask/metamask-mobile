/* eslint-disable import/no-commonjs */
require('dotenv').config({ path: '.e2e.env' });
module.exports = {
  rootDir: '..',
  testMatch: [
    '<rootDir>/e2e/specs/*.spec.js',
    '<rootDir>/e2e/specs/*/*.spec.js',
  ],
  testTimeout: 220000,
  maxWorkers: process.env.CI ? 4 : 1,
  setupFilesAfterEnv: ['<rootDir>/e2e/init.js'],
  globalSetup: 'detox/runners/jest/globalSetup',
  globalTeardown: 'detox/runners/jest/globalTeardown',
  reporters: [
    'detox/runners/jest/reporter',
    [
      'jest-junit',
      {
        outputDirectory: './e2e/reports',
      },
    ],
  ],
  testEnvironment: 'detox/runners/jest/testEnvironment',
  verbose: true,
};
