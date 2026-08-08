/**
 * Custom error class for Quality Gate failures.
 * Tests that fail with this error should NOT be retried
 * because the performance measurement was successful - only the threshold was exceeded.
 */
class QualityGateError extends Error {
  isQualityGateError: boolean;

  constructor(message: string) {
    super(message);
    this.name = 'QualityGateError';
    this.isQualityGateError = true;
    // Suppress stack trace so Playwright reporters don't show code snippets —
    // the violation message is already self-explanatory.
    this.stack = `QualityGateError: ${message}`;
  }
}

export default QualityGateError;
