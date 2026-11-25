import { PredictError, PredictErrorCode } from '../errors';

const RETRYABLE_CODES = new Set([
  PredictErrorCode.NETWORK_ERROR,
  PredictErrorCode.RATE_LIMITED,
  PredictErrorCode.VENUE_UNAVAILABLE,
]);

/** Returns whether a Predict read error is safe to retry. */
export const isRetryablePredictError = (error: unknown): boolean =>
  error instanceof PredictError && RETRYABLE_CODES.has(error.code);
