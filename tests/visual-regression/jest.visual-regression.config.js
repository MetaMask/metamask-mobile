/* eslint-disable import-x/no-commonjs */
require('dotenv').config({ path: '.e2e.env' });

module.exports = {
  rootDir: '../..',
  testMatch: [
    '<rootDir>/tests/visual-regression/specs/**/*.visual.spec.{js,ts}',
  ],
  testTimeout: 600000,
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
        outputDirectory: './tests/visual-regression/reports',
        classNameTemplate: '{filepath}',
        outputName: (() => {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          return `visual-regression-${timestamp}.xml`;
        })(),
      },
    ],
  ],
  testEnvironment: 'detox/runners/jest/testEnvironment',
  verbose: true,
};
