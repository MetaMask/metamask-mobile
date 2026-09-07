/**
 * Paths Stage 1 sends to history sampling and the AI analyzer.
 *
 * Matches Jest unit shards (jest.config.js), not component-view, integration,
 * or Appium smoke specs.
 */

const UNIT_TEST_FILE_PATTERN = /\.(test|spec)\.(ts|tsx)$/;

const EXCLUDE_PATTERNS = [
  /\.view\.test\./,
  /\.integration\.test\./,
  /^tests\/smoke\//,
];

export function isFlakyWorkflowUnitTestPath(path: string): boolean {
  return (
    UNIT_TEST_FILE_PATTERN.test(path) &&
    !EXCLUDE_PATTERNS.some((pattern) => pattern.test(path))
  );
}
