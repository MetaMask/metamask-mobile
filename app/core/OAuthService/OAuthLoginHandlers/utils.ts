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

interface RetryOptions {
  retries: number;
  delayMs: number | number[];
  shouldRetry?: (error: unknown, attempt: number) => boolean;
}

/**
 * Retries an operation with a delay between attempts.
 *
 * @param operation - Function to execute on each attempt.
 * @param options - Retry configuration.
 * @returns The resolved value of the operation.
 */
export async function retryWithDelay<T>(
  operation: () => Promise<T> | T,
  options: RetryOptions,
): Promise<T> {
  const normalizedRetries = Math.max(0, options.retries);
  const normalizedDelayMs = Array.isArray(options.delayMs)
    ? options.delayMs.map((delayMs) => Math.max(0, delayMs))
    : Math.max(0, options.delayMs);

  const getDelayMsForAttempt = (attempt: number): number => {
    if (!Array.isArray(normalizedDelayMs)) {
      return normalizedDelayMs;
    }

    if (normalizedDelayMs.length === 0) {
      return 0;
    }

    return normalizedDelayMs[attempt] ?? normalizedDelayMs.at(-1) ?? 0;
  };

  for (let attempt = 0; attempt <= normalizedRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      const isLastAttempt = attempt === normalizedRetries;
      if (
        isLastAttempt ||
        options.shouldRetry?.(error, attempt + 1) === false
      ) {
        throw error;
      }

      const delayMs = getDelayMsForAttempt(attempt);
      if (delayMs > 0) {
        await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw new Error('Retry attempts exhausted');
}
