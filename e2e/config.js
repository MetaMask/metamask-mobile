// eslint-disable-next-line import/no-commonjs
require('dotenv').config({ path: '.e2e.env' });

const config = {
  rootDir: '../',
  setupFilesAfterEnv: ['./e2e/init.js'],
  testEnvironment: 'node',
  forceExit: true,
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: './e2e/reports',
      },
    ],
  ],
};

// eslint-disable-next-line import/no-commonjs
module.exports = config;
