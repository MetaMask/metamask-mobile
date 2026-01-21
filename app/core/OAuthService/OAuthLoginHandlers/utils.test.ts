import { retryWithDelay, isRetryableError, RetryContext } from './utils';
import { OAuthError, OAuthErrorType } from '../error';

describe('isRetryableError', () => {
  it('returns false for 400 Bad Request errors', () => {
    const error = new Error('request failed with status: [400]: Bad Request');
    expect(isRetryableError(error)).toBe(false);
  });

  it('returns false for 401 Unauthorized errors', () => {
    const error = new Error('request failed with status: [401]: Unauthorized');
    expect(isRetryableError(error)).toBe(false);
  });

  it('returns false for 403 Forbidden errors', () => {
    const error = new Error('request failed with status: [403]: Forbidden');
    expect(isRetryableError(error)).toBe(false);
  });

  it('returns false for 404 Not Found errors', () => {
    const error = new Error('request failed with status: [404]: Not Found');
    expect(isRetryableError(error)).toBe(false);
  });

  it('returns true for 500 Internal Server Error', () => {
    const error = new Error(
      'request failed with status: [500]: Internal Server Error',
    );
    expect(isRetryableError(error)).toBe(true);
  });

  it('returns true for 502 Bad Gateway errors', () => {
    const error = new Error('request failed with status: [502]: Bad Gateway');
    expect(isRetryableError(error)).toBe(true);
  });

  it('returns true for 503 Service Unavailable errors', () => {
    const error = new Error(
      'request failed with status: [503]: Service Unavailable',
    );
    expect(isRetryableError(error)).toBe(true);
  });

  it('returns true for network errors', () => {
    const error = new Error('Network request failed');
    expect(isRetryableError(error)).toBe(true);
  });

  it('returns true for timeout errors', () => {
    const error = new Error('Request timeout');
    expect(isRetryableError(error)).toBe(true);
  });

  it('returns true for OAuthError with 5xx status', () => {
    const error = new OAuthError(
      'request failed with status: [500]: Server Error',
      OAuthErrorType.AuthServerError,
    );
    expect(isRetryableError(error)).toBe(true);
  });

  it('returns false for OAuthError with 4xx status', () => {
    const error = new OAuthError(
      'request failed with status: [400]: Bad Request',
      OAuthErrorType.AuthServerError,
    );
    expect(isRetryableError(error)).toBe(false);
  });

  it('returns true for non-Error objects', () => {
    expect(isRetryableError('string error')).toBe(true);
    expect(isRetryableError({ message: 'object error' })).toBe(true);
    expect(isRetryableError(null)).toBe(true);
    expect(isRetryableError(undefined)).toBe(true);
  });
});

describe('retryWithDelay', () => {
  // Use minimal delays for fast tests
  const fastRetryOptions = {
    baseDelayMs: 1,
    maxDelayMs: 10,
    jitterFactor: 0,
  };

  describe('successful execution', () => {
    it('returns immediately on first success', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await retryWithDelay(operation, {
        maxRetries: 3,
        ...fastRetryOptions,
      });

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('succeeds after retries when operation eventually succeeds', async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('status: [500]'))
        .mockRejectedValueOnce(new Error('status: [500]'))
        .mockResolvedValue('success');

      const result = await retryWithDelay(operation, {
        maxRetries: 3,
        ...fastRetryOptions,
      });

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });
  });

  describe('failure handling', () => {
    it('throws after exhausting all retries', async () => {
      const error = new Error('status: [500]: Server Error');
      const operation = jest.fn().mockRejectedValue(error);

      await expect(
        retryWithDelay(operation, { maxRetries: 2, ...fastRetryOptions }),
      ).rejects.toThrow('status: [500]: Server Error');

      expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('does not retry 4xx client errors by default', async () => {
      const error = new Error('status: [400]: Bad Request');
      const operation = jest.fn().mockRejectedValue(error);

      await expect(
        retryWithDelay(operation, { maxRetries: 3, ...fastRetryOptions }),
      ).rejects.toThrow('status: [400]: Bad Request');

      expect(operation).toHaveBeenCalledTimes(1); // No retries
    });

    it('does not retry 401 errors', async () => {
      const error = new Error('status: [401]: Unauthorized');
      const operation = jest.fn().mockRejectedValue(error);

      await expect(
        retryWithDelay(operation, { maxRetries: 3, ...fastRetryOptions }),
      ).rejects.toThrow('status: [401]: Unauthorized');

      expect(operation).toHaveBeenCalledTimes(1);
    });
  });

  describe('custom shouldRetry', () => {
    it('respects custom shouldRetry returning false', async () => {
      const error = new Error('Custom error');
      const operation = jest.fn().mockRejectedValue(error);
      const shouldRetry = jest.fn().mockReturnValue(false);

      await expect(
        retryWithDelay(operation, {
          maxRetries: 3,
          shouldRetry,
          ...fastRetryOptions,
        }),
      ).rejects.toThrow('Custom error');

      expect(operation).toHaveBeenCalledTimes(1);
      expect(shouldRetry).toHaveBeenCalledWith(error);
    });

    it('respects custom shouldRetry returning true', async () => {
      const error = new Error('status: [400]: Should not retry by default');
      const operation = jest.fn().mockRejectedValue(error);
      const shouldRetry = jest.fn().mockReturnValue(true); // Override default

      await expect(
        retryWithDelay(operation, {
          maxRetries: 2,
          shouldRetry,
          ...fastRetryOptions,
        }),
      ).rejects.toThrow();

      expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
  });

  describe('onRetry callback', () => {
    it('calls onRetry for each retry attempt', async () => {
      const error = new Error('status: [500]');
      const operation = jest.fn().mockRejectedValue(error);
      const onRetry = jest.fn();

      await expect(
        retryWithDelay(operation, {
          maxRetries: 2,
          onRetry,
          ...fastRetryOptions,
        }),
      ).rejects.toThrow();

      // Called for each failed attempt
      expect(onRetry).toHaveBeenCalledTimes(3);

      // First call - will retry
      expect(onRetry).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          attempt: 0,
          willRetry: true,
          error,
        }),
      );

      // Second call - will retry
      expect(onRetry).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          attempt: 1,
          willRetry: true,
          error,
        }),
      );

      // Third call - won't retry (last attempt)
      expect(onRetry).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({
          attempt: 2,
          willRetry: false,
          error,
        }),
      );
    });

    it('calls onRetry with willRetry=false for non-retryable errors', async () => {
      const error = new Error('status: [400]');
      const operation = jest.fn().mockRejectedValue(error);
      const onRetry = jest.fn();

      await expect(
        retryWithDelay(operation, {
          maxRetries: 3,
          onRetry,
          ...fastRetryOptions,
        }),
      ).rejects.toThrow();

      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith(
        expect.objectContaining({
          attempt: 0,
          willRetry: false,
        }),
      );
    });

    it('does not call onRetry on success', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      const onRetry = jest.fn();

      const result = await retryWithDelay(operation, {
        maxRetries: 3,
        onRetry,
        ...fastRetryOptions,
      });

      expect(result).toBe('success');
      expect(onRetry).not.toHaveBeenCalled();
    });
  });

  describe('delay calculation', () => {
    it('uses exponential backoff', async () => {
      const error = new Error('status: [500]');
      const operation = jest.fn().mockRejectedValue(error);
      const onRetry = jest.fn();

      // Disable jitter for predictable delays
      await expect(
        retryWithDelay(operation, {
          maxRetries: 3,
          baseDelayMs: 10,
          maxDelayMs: 1000,
          jitterFactor: 0, // No jitter
          onRetry,
        }),
      ).rejects.toThrow();

      // Check delays: 10, 20, 40 (exponential)
      const delays = onRetry.mock.calls
        .filter((call: [RetryContext]) => call[0].willRetry)
        .map((call: [RetryContext]) => call[0].delayMs);

      expect(delays[0]).toBe(10); // 10 * 2^0
      expect(delays[1]).toBe(20); // 10 * 2^1
      expect(delays[2]).toBe(40); // 10 * 2^2
    });

    it('caps delay at maxDelayMs', async () => {
      const error = new Error('status: [500]');
      const operation = jest.fn().mockRejectedValue(error);
      const onRetry = jest.fn();

      await expect(
        retryWithDelay(operation, {
          maxRetries: 5,
          baseDelayMs: 10,
          maxDelayMs: 30,
          jitterFactor: 0,
          onRetry,
        }),
      ).rejects.toThrow();

      const delays = onRetry.mock.calls
        .filter((call: [RetryContext]) => call[0].willRetry)
        .map((call: [RetryContext]) => call[0].delayMs);

      // 10, 20, 30 (capped), 30 (capped), 30 (capped)
      expect(delays[0]).toBe(10);
      expect(delays[1]).toBe(20);
      expect(delays[2]).toBe(30);
      expect(delays[3]).toBe(30);
      expect(delays[4]).toBe(30);
    });

    it('applies jitter to delays', async () => {
      const error = new Error('status: [500]');
      const operation = jest.fn().mockRejectedValue(error);
      const onRetry = jest.fn();

      // Mock Math.random to return predictable values
      const mockRandom = jest.spyOn(Math, 'random').mockReturnValue(0.5);

      await expect(
        retryWithDelay(operation, {
          maxRetries: 1,
          baseDelayMs: 1000,
          maxDelayMs: 10000,
          jitterFactor: 0.3,
          onRetry,
        }),
      ).rejects.toThrow();

      // With jitterFactor=0.3 and random=0.5:
      // delay = 1000 * (1 - 0.3 + 0.5 * 0.3) = 1000 * 0.85 = 850
      const delay = onRetry.mock.calls[0][0].delayMs;
      expect(delay).toBe(850);

      mockRandom.mockRestore();
    });
  });

  describe('edge cases', () => {
    it('throws if maxRetries is 0', async () => {
      const error = new Error('status: [500]');
      const operation = jest.fn().mockRejectedValue(error);

      await expect(
        retryWithDelay(operation, { maxRetries: 0, ...fastRetryOptions }),
      ).rejects.toThrow();

      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('throws if maxRetries is negative', async () => {
      const error = new Error('status: [500]');
      const operation = jest.fn().mockRejectedValue(error);

      await expect(
        retryWithDelay(operation, { maxRetries: -5, ...fastRetryOptions }),
      ).rejects.toThrow();

      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('throws if options are not provided', async () => {
      const error = new Error('status: [500]');
      const operation = jest.fn().mockRejectedValue(error);
      const onRetry = jest.fn();

      await expect(
        retryWithDelay(operation, {
          maxRetries: 1,
          baseDelayMs: 1,
          maxDelayMs: 10,
          onRetry,
        }),
      ).rejects.toThrow();

      // Check that delay was calculated
      const delay = onRetry.mock.calls[0][0].delayMs;
      expect(delay).toBeGreaterThan(0);
      expect(delay).toBeLessThanOrEqual(10);
    });
  });
});
