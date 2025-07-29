import {
  calculateExponentialRetryDelay,
  retryWithExponentialDelay,
} from './exponential-retry';

describe('Exponential Retry Utils', () => {
  describe('calculateExponentialRetryDelay', () => {
    it('should calculate exponential delay correctly', () => {
      expect(calculateExponentialRetryDelay(0, 1000)).toBe(1000); // 1000 * 2^0
      expect(calculateExponentialRetryDelay(1, 1000)).toBe(2000); // 1000 * 2^1
      expect(calculateExponentialRetryDelay(2, 1000)).toBe(4000); // 1000 * 2^2
      expect(calculateExponentialRetryDelay(3, 1000)).toBe(8000); // 1000 * 2^3
    });

    it('should respect maximum delay cap', () => {
      const maxDelay = 5000;
      expect(calculateExponentialRetryDelay(4, 1000, maxDelay)).toBe(maxDelay); // 16000 capped
      expect(calculateExponentialRetryDelay(10, 1000, maxDelay)).toBe(maxDelay); // Large value capped
    });

    it('should use default values correctly', () => {
      expect(calculateExponentialRetryDelay(0)).toBe(1000); // Default baseDelay = 1000
      expect(calculateExponentialRetryDelay(1)).toBe(2000);
      // Default maxDelay = 30000. 1000 * 2^10 = 1024000, capped at 30000
      expect(calculateExponentialRetryDelay(10)).toBe(30000);
    });

    it('should add jitter when enabled', () => {
      const baseDelay = 1000;
      const delayAttempt0 = calculateExponentialRetryDelay(
        0,
        baseDelay,
        30000,
        true,
      );
      // Jitter is +/- 10% of baseDelay for the first attempt (retryCount 0)
      // So, for baseDelay 1000, delay should be between 1000 and 1000 * 1.1 = 1100
      expect(delayAttempt0).toBeGreaterThanOrEqual(baseDelay);
      expect(delayAttempt0).toBeLessThanOrEqual(baseDelay * 1.1);

      const delayAttempt3 = calculateExponentialRetryDelay(
        3,
        baseDelay,
        30000,
        true,
      ); // 1000 * 2^3 = 8000
      // Jitter is +/- 10% of the current calculated delay (8000)
      // So, delay should be between 8000 and 8000 * 1.1 = 8800
      const expectedBaseForAttempt3 = baseDelay * Math.pow(2, 3); // 8000
      expect(delayAttempt3).toBeGreaterThanOrEqual(expectedBaseForAttempt3);
      expect(delayAttempt3).toBeLessThanOrEqual(expectedBaseForAttempt3 * 1.1);
    });

    it('should not add jitter when disabled', () => {
      const baseDelay = 1000;
      const delay = calculateExponentialRetryDelay(0, baseDelay, 30000, false);
      expect(delay).toBe(baseDelay);
    });

    it('should handle edge cases', () => {
      expect(calculateExponentialRetryDelay(0, 0)).toBe(0);
      expect(calculateExponentialRetryDelay(5, 100, 50)).toBe(50); // Capped
    });
  });

  describe('retryWithExponentialDelay', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should succeed on the first attempt if function resolves', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      const result = await retryWithExponentialDelay(mockFn, 3, 100);
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should retry and eventually succeed', async () => {
      const mockFn = jest
        .fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockResolvedValue('success');

      const result = await retryWithExponentialDelay(mockFn, 3, 50); // Small delay for faster test

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should throw the final error after all retries are exhausted', async () => {
      const finalError = new Error('final failure');
      const mockFn = jest.fn().mockRejectedValue(finalError);

      await expect(retryWithExponentialDelay(mockFn, 2, 10)).rejects.toThrow(
        finalError,
      );
      expect(mockFn).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should throw generic error if function throws undefined', async () => {
      const mockFn = jest.fn().mockImplementation(() => {
        throw undefined; // Simulate throwing a non-Error
      });

      await expect(retryWithExponentialDelay(mockFn, 0, 100)).rejects.toThrow(
        'Retry function failed with unknown error',
      );
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should throw error with string representation for non-Error objects', async () => {
      const mockFn = jest.fn().mockImplementation(() => {
        throw 'string error'; // Simulate throwing a string
      });

      await expect(retryWithExponentialDelay(mockFn, 0, 100)).rejects.toThrow(
        'Retry function failed: string error',
      );
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should handle async function that returns different types', async () => {
      const mockFnNumber = jest.fn().mockResolvedValue(42);
      const mockFnObject = jest.fn().mockResolvedValue({ data: 'test' });

      expect(await retryWithExponentialDelay(mockFnNumber, 1)).toBe(42);
      expect(await retryWithExponentialDelay(mockFnObject, 1)).toEqual({
        data: 'test',
      });
    });
  });
});
