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
  }
}

export default QualityGateError;
