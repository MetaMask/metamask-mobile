export function toBase64UrlSafe(base64String: string): string {
  return base64String
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/[=]/g, '');
}

export function fromBase64UrlSafe(base64String: string): string {
  return base64String
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(base64String.length + ((4 - (base64String.length % 4)) % 4), '=');
}

export interface RetryContext {
  /** The error that caused the retry (0-indexed) */
  error: unknown;
  /** The attempt number that just failed (0-indexed) */
  attempt: number;
  /** Whether another retry will be attempted */
  willRetry: boolean;
  /** The delay before the next retry (if willRetry is true) */
  delayMs: number;
}

export interface RetryOptions {
  /** Maximum number of retry attempts (not including the initial attempt) */
  maxRetries: number;
  /** Base delay in milliseconds for exponential backoff */
  baseDelayMs?: number;
  /** Maximum delay cap in milliseconds */
  maxDelayMs?: number;
  /** Jitter factor (0-1) to randomize delays and prevent thundering herd */
  jitterFactor?: number;
  /** Custom function to determine if an error should be retried */
  shouldRetry?: (error: unknown) => boolean;
  /** Callback fired on each retry attempt (for logging/observability) */
  onRetry?: (context: RetryContext) => void;
}

/**
 * Calculates delay with exponential backoff and jitter.
 *
 * @param attempt - The current attempt number (0-indexed)
 * @param baseDelayMs - Base delay in milliseconds
 * @param maxDelayMs - Maximum delay cap
 * @param jitterFactor - Jitter factor (0-1)
 * @returns The calculated delay in milliseconds
 */
function calculateDelayWithJitter(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number,
  jitterFactor: number,
): number {
  // Exponential backoff: baseDelay * 2^attempt
  const exponentialDelay = baseDelayMs * Math.pow(2, attempt);
  // Cap the delay
  const cappedDelay = Math.min(exponentialDelay, maxDelayMs);
  // Apply jitter: delay * (1 - jitterFactor + random * jitterFactor)
  // This gives a range of [delay * (1 - jitterFactor), delay]
  const jitteredDelay =
    cappedDelay * (1 - jitterFactor + Math.random() * jitterFactor);
  return Math.round(jitteredDelay);
}

/**
 * Checks if an error message indicates a client error (4xx) that should not be retried.
 * Client errors indicate issues with the request itself, not transient server issues.
 *
 * @param error - The error to check
 * @returns true if the error should be retried, false otherwise
 */
export function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return true; // Unknown error types are retried by default
  }

  // Check for HTTP 4xx client errors in the message
  // These are not retryable as the request itself is invalid
  const clientErrorPattern = /status:\s*\[4\d{2}\]/i;
  if (clientErrorPattern.test(error.message)) {
    return false;
  }

  // Network errors and 5xx server errors are retryable
  return true;
}

/**
 * Retries an async operation with exponential backoff, jitter, and smart error classification.
 *
 * Features:
 * - Exponential backoff with configurable base delay
 * - Jitter to prevent thundering herd problem
 * - Smart error classification (doesn't retry 4xx client errors by default)
 * - Observability via onRetry callback
 *
 * @param operation - Async function to execute on each attempt
 * @param options - Retry configuration
 * @returns The resolved value of the operation
 * @throws The last error if all retries are exhausted or if error is non-retryable
 *
 * @example
 * ```ts
 * const result = await retryWithDelay(
 *   () => fetchAuthTokens(),
 *   {
 *     maxRetries: 3,
 *     baseDelayMs: 1000,
 *     onRetry: ({ attempt, error, delayMs }) => {
 *       Logger.log(`Retry ${attempt + 1} after ${delayMs}ms: ${error.message}`);
 *     },
 *   },
 * );
 * ```
 */
export async function retryWithDelay<T>(
  operation: () => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  const {
    maxRetries,
    baseDelayMs = 1000,
    maxDelayMs = 10000,
    jitterFactor = 0.3,
    shouldRetry = isRetryableError,
    onRetry,
  } = options;

  const normalizedMaxRetries = Math.max(0, maxRetries);

  for (let attempt = 0; attempt <= normalizedMaxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      const isLastAttempt = attempt === normalizedMaxRetries;

      // Wrap shouldRetry in try-catch to prevent callback errors from
      // masking the original operation error. Default to not retrying
      // if the callback fails (safer to fail fast than mask errors).
      let isErrorRetryable: boolean;
      try {
        isErrorRetryable = shouldRetry(error);
      } catch {
        isErrorRetryable = false;
      }

      const willRetry = !isLastAttempt && isErrorRetryable;

      const delayMs = willRetry
        ? calculateDelayWithJitter(
            attempt,
            baseDelayMs,
            maxDelayMs,
            jitterFactor,
          )
        : 0;

      // Wrap onRetry in try-catch to prevent logging/observability errors
      // from masking the original operation error
      try {
        onRetry?.({ error, attempt, willRetry, delayMs });
      } catch {
        // Silently ignore callback errors to preserve the original error
      }

      if (!willRetry) {
        throw error;
      }

      // Wait before the next retry
      if (delayMs > 0) {
        await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  // This is technically unreachable because:
  // - If operation succeeds, we return
  // - If operation fails on last attempt or non-retryable error, we throw
  // But TypeScript needs this for type safety
  throw new Error('Retry attempts exhausted');
}
