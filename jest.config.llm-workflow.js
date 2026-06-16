/* eslint-disable import-x/no-commonjs */

// Lightweight Jest config for e2e/llm-workflow tests.
//
// These tests exercise pure Node.js tooling (daemon, prerequisites, capabilities)
// and do not depend on React Native. Running them under the base react-native
// preset causes OOM because the coverage collector instruments thousands of app
// files that are never loaded by these tests.

module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/e2e/llm-workflow/__tests__/**/*.test.ts'],
  transform: {
    '^.+\\.[jt]sx?$': ['babel-jest', { configFile: './babel.config.tests.js' }],
  },
  transformIgnorePatterns: ['node_modules/(?!(@metamask/client-mcp-core)/)'],
  collectCoverage: false,
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
};
