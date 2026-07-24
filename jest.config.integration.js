/* eslint-disable import-x/no-commonjs */
const baseConfig = require('./jest.config.js');

/**
 * Jest config for integration tests (`*.integration.test.ts?(x)`).
 *
 * Mirrors `jest.config.view.js` for component view tests. Lets CI run the
 * integration suite as its own job and lets devs run all of them with one
 * command:
 *
 *   yarn jest -c jest.config.integration.js
 *
 * Integration tests instantiate real controllers / providers / services and
 * mock only the I/O boundary (SDK clients, wallet, subscription services).
 * See tests/integration/AGENTS.md for the framework rules and
 * .agents/skills/integration-test/ for the full skill.
 */
module.exports = {
  ...baseConfig,
  // Unit coverage already owns the repo-wide collectCoverageFrom list. Let
  // integration tests report coverage for the production files they execute so
  // CI shards stay small while still contributing to merged PR coverage.
  collectCoverageFrom: undefined,
  testPathIgnorePatterns: (baseConfig.testPathIgnorePatterns || []).filter(
    (pattern) => !pattern.includes('integration'),
  ),
  testMatch: ['**/*.integration.test.ts?(x)'],
  testTimeout: 30000,
  forceExit: true,
  maxWorkers: 1,
};
