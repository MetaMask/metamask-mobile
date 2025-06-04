import { calculateExponentialRetryDelay, retryWithExponentialDelay } from './exponential-retry';

describe('Exponential Retry Utils', () => {
  describe('calculateExponentialRetryDelay', () => {
    it('should calculate exponential delay correctly', () => {
      expect(calculateExponentialRetryDelay(0, 1000)).toBe(1000); // 1000 * 2^0 = 1000
      expect(calculateExponentialRetryDelay(1, 1000)).toBe(2000); // 1000 * 2^1 = 2000
      expect(calculateExponentialRetryDelay(2, 1000)).toBe(4000); // 1000 * 2^2 = 4000
      expect(calculateExponentialRetryDelay(3, 1000)).toBe(8000); // 1000 * 2^3 = 8000
    });

    it('should respect maximum delay cap', () => {
      const maxDelay = 5000;
      expect(calculateExponentialRetryDelay(4, 1000, maxDelay)).toBe(5000); // 16000 capped to 5000
      expect(calculateExponentialRetryDelay(10, 1000, maxDelay)).toBe(5000); // Large value capped to 5000
    });

    it('should use default values correctly', () => {
      expect(calculateExponentialRetryDelay(0)).toBe(1000); // Default baseDelay
      expect(calculateExponentialRetryDelay(1)).toBe(2000);
      expect(calculateExponentialRetryDelay(10)).toBe(30000); // Default maxDelay cap
    });

    it('should add jitter when enabled', () => {
      const baseDelay = 1000;
      const delay = calculateExponentialRetryDelay(0, baseDelay, 30000, true);

      // Should be within 10% jitter range
      expect(delay).toBeGreaterThanOrEqual(baseDelay);
      expect(delay).toBeLessThanOrEqual(baseDelay * 1.1);
    });

    it('should not add jitter when disabled', () => {
      const baseDelay = 1000;
      const delay = calculateExponentialRetryDelay(0, baseDelay, 30000, false);

      expect(delay).toBe(baseDelay);
    });

    it('should handle edge cases', () => {
      expect(calculateExponentialRetryDelay(0, 0)).toBe(0);
      expect(calculateExponentialRetryDelay(5, 100, 50)).toBe(50); // Immediately capped
    });
  });

  describe('retryWithExponentialDelay', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      jest.clearAllTimers();
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should succeed on first attempt', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');

      const result = await retryWithExponentialDelay(mockFn, 3);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const mockFn = jest.fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockResolvedValue('success');

      const promise = retryWithExponentialDelay(mockFn, 3, 100);

      // Fast-forward through the delays
      jest.runAllTimers();

      const result = await promise;

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should throw final error after all retries exhausted', async () => {
      const finalError = new Error('final failure');
      const mockFn = jest.fn().mockRejectedValue(finalError);

      const promise = retryWithExponentialDelay(mockFn, 2, 100);

      // Fast-forward through the delays
      jest.runAllTimers();

      await expect(promise).rejects.toThrow('final failure');
      expect(mockFn).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should use correct delay intervals', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('fail'));
      const baseDelay = 1000;

      const promise = retryWithExponentialDelay(mockFn, 2, baseDelay);

      // First retry should happen after 1000ms (2^0 * 1000)
      expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 1000);

      jest.advanceTimersByTime(1000);

      // Second retry should happen after 2000ms (2^1 * 1000)
      expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 2000);

      jest.advanceTimersByTime(2000);

      await expect(promise).rejects.toThrow();
    });

    it('should handle async function that returns different types', async () => {
      const mockFnNumber = jest.fn().mockResolvedValue(42);
      const mockFnObject = jest.fn().mockResolvedValue({ data: 'test' });
      const mockFnArray = jest.fn().mockResolvedValue([1, 2, 3]);

      expect(await retryWithExponentialDelay(mockFnNumber)).toBe(42);
      expect(await retryWithExponentialDelay(mockFnObject)).toEqual({ data: 'test' });
      expect(await retryWithExponentialDelay(mockFnArray)).toEqual([1, 2, 3]);
    });

    it('should respect maxDelay parameter', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('fail'));
      const maxDelay = 500;

      const promise = retryWithExponentialDelay(mockFn, 3, 1000, maxDelay);

      // All delays should be capped at maxDelay
      jest.runAllTimers();

      const calls = (setTimeout as jest.MockedFunction<typeof setTimeout>).mock.calls;
      calls.forEach(call => {
        expect(call[1]).toBeLessThanOrEqual(maxDelay);
      });

      await expect(promise).rejects.toThrow();
    });

    it('should throw generic error if no error was captured', async () => {
      // This is a edge case scenario to test the fallback error
      const mockFn = jest.fn();
      // Simulate a scenario where somehow no error is captured
      mockFn.mockImplementation(() => {
        throw undefined;
      });

      const promise = retryWithExponentialDelay(mockFn, 0, 100);

      await expect(promise).rejects.toThrow('Retry function failed with unknown error');
    });
  });
});
