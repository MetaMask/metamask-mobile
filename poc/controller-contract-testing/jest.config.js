/**
 * Standalone jest config so the PoC runs without the mobile app's RN setup.
 * It still resolves modules from the parent repo's node_modules, so we share
 * @metamask/base-controller, jest, etc. with the real app.
 */
const path = require('path');

module.exports = {
  rootDir: __dirname,
  testEnvironment: 'node',
  testMatch: ['<rootDir>/test/**/*.test.ts'],
  transform: {
    '^.+\\.[jt]sx?$': ['babel-jest', { configFile: path.resolve(__dirname, 'babel.config.js') }],
    '^.+\\.cjs$': ['babel-jest', { configFile: path.resolve(__dirname, 'babel.config.js') }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@metamask|@noble))',
  ],
  moduleDirectories: [
    'node_modules',
    path.resolve(__dirname, '../../node_modules'),
  ],
};
