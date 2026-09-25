/**
 * Paths Stage 1 sends to history sampling and the AI analyzer.
 *
 * Matches Jest unit shards (jest.config.js testPathIgnorePatterns), not
 * component-view, integration, Appium, performance, or e2e specs.
 */

const UNIT_TEST_FILE_PATTERN = /\.(test|spec)\.(ts|tsx)$/;

const EXCLUDE_PATTERNS = [
  /\.view\.test\./,
  /\.integration\.test\./,
  /^tests\/(smoke|regression|performance)\/.*\.spec\.(ts|tsx|js)$/,
  /^tests\/smoke-appium\//,
  /\/e2e\/.*\.spec\.(ts|js)$/,
  /\/e2e\/(pages|selectors)\//,
];

export function isFlakyWorkflowUnitTestPath(path: string): boolean {
  return (
    UNIT_TEST_FILE_PATTERN.test(path) &&
    !EXCLUDE_PATTERNS.some((pattern) => pattern.test(path))
  );
}
