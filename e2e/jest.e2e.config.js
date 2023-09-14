/* eslint-disable import/no-commonjs */
require('dotenv').config({ path: '.e2e.env' });
// eslint-disable-next-line no-console
console.log(process.env.CI, 'TTTTTTTTTTTTTT');
module.exports = {
  rootDir: '..',
  testMatch: [
    '<rootDir>/e2e/specs/*.spec.js',
    '<rootDir>/e2e/specs/*/*.spec.js',
  ],
  testTimeout: 220000,
  maxWorkers: process.env.CI ? 3 : 1,
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
