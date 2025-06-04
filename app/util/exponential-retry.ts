/**
 * Calculates exponential retry delay with jitter and maximum cap
 *
 * @param retryCount - Current retry attempt (0-based)
 * @param baseDelay - Base delay in milliseconds (default: 1000ms)
 * @param maxDelay - Maximum delay cap in milliseconds (default: 30000ms)
 * @param jitter - Whether to add random jitter to prevent thundering herd (default: false)
 * @returns Calculated delay in milliseconds
 */
export function calculateExponentialRetryDelay(
  retryCount: number,
  baseDelay: number = 1000,
  maxDelay: number = 30000,
  jitter: boolean = false,
): number {
  const exponentialDelay = baseDelay * Math.pow(2, retryCount);
  const cappedDelay = Math.min(exponentialDelay, maxDelay);

  if (jitter) {
    // Add up to 10% jitter to prevent synchronized retries
    const jitterAmount = cappedDelay * 0.1;
    return cappedDelay + (Math.random() * jitterAmount);
  }

  return cappedDelay;
}

/**
 * Generic retry function with exponential delay
 *
 * @param asyncFn - Async function to retry
 * @param maxRetries - Maximum number of retries (default: 3)
 * @param baseDelay - Base delay in milliseconds (default: 1000ms)
 * @param maxDelay - Maximum delay cap in milliseconds (default: 30000ms)
 * @param jitter - Whether to add random jitter (default: false)
 * @returns Promise that resolves with the result or rejects with the last error
 */
export async function retryWithExponentialDelay<T>(
  asyncFn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  maxDelay: number = 30000,
  jitter: boolean = false,
): Promise<T> {
  let lastError: Error | undefined;

  for (let retryCount = 0; retryCount <= maxRetries; retryCount++) {
    try {
      return await asyncFn();
    } catch (error) {
      lastError = error as Error;

      if (retryCount === maxRetries) {
        throw lastError;
      }

      const delay = calculateExponentialRetryDelay(retryCount, baseDelay, maxDelay, jitter);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // This should never be reached due to the logic above, but satisfies TypeScript
  throw lastError || new Error('Retry function failed with unknown error');
}
