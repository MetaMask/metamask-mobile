/**
 * Custom error class for Quality Gate failures.
 * Tests that fail with this error should NOT be retried
 * because the performance measurement was successful - only the threshold was exceeded.
 */
class QualityGateError extends Error {
  constructor(message) {
    super(message);
    this.name = 'QualityGateError';
    this.isQualityGateError = true;
  }
}

// Global registry to track tests that failed due to quality gates
// Key: testId (projectName + testTitle), Value: true
const qualityGateFailures = new Map();

/**
 * Mark a test as failed due to quality gates
 * @param {string} testId - Unique test identifier
 */
export function markQualityGateFailure(testId) {
  qualityGateFailures.set(testId, true);
}

/**
 * Check if a test previously failed due to quality gates
 * @param {string} testId - Unique test identifier
 * @returns {boolean}
 */
export function hasQualityGateFailure(testId) {
  return qualityGateFailures.has(testId);
}

/**
 * Generate a unique test ID from testInfo
 * @param {Object} testInfo - Playwright testInfo object
 * @returns {string}
 */
export function getTestId(testInfo) {
  return `${testInfo.project.name}::${testInfo.titlePath.join('::')}`;
}

export default QualityGateError;
