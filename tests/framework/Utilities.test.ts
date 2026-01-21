import Utilities from './Utilities';
import { RetryOptions } from './types';

describe('Utilities.executeWithRetry', () => {
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    jest.clearAllMocks();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe('Successful execution', () => {
    it('should execute operation successfully on first attempt', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');
      const options: RetryOptions = {
        timeout: 1000,
        interval: 100,
        description: 'test operation',
      };

      const result = await Utilities.executeWithRetry(mockOperation, options);

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should succeed after retries and log success message', async () => {
      const mockOperation = jest
        .fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'))
        .mockResolvedValue('success');

      const options: RetryOptions = {
        timeout: 1000,
        interval: 50,
        description: 'test operation',
        elemDescription: 'test element',
      };

      const result = await Utilities.executeWithRetry(mockOperation, options);

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(3);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          '✅ test operation succeeded after 2 retries for test element.',
        ),
      );
    });

    it('should handle single retry success correctly', async () => {
      const mockOperation = jest
        .fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockResolvedValue('success');

      const options: RetryOptions = {
        timeout: 1000,
        interval: 50,
        description: 'test operation',
        elemDescription: 'test element',
      };

      const result = await Utilities.executeWithRetry(mockOperation, options);

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(2);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          '✅ test operation succeeded after 1 retry for test element.',
        ),
      );
    });
  });

  describe('Retry scenarios', () => {
    it('should retry on failure and log retry message', async () => {
      const mockOperation = jest
        .fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockResolvedValue('success');

      const options: RetryOptions = {
        timeout: 1000,
        interval: 50,
        description: 'test operation',
        elemDescription: 'test element',
      };

      await Utilities.executeWithRetry(mockOperation, options);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          '⚠️  test operation failed (attempt 1) on element: test element. Retrying... (timeout: 1000ms)',
        ),
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('🔍 Error: First failure'),
      );
    });

    it('should handle missing elemDescription in retry messages', async () => {
      const mockOperation = jest
        .fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockResolvedValue('success');

      const options: RetryOptions = {
        timeout: 1000,
        interval: 50,
        description: 'test operation',
      };

      await Utilities.executeWithRetry(mockOperation, options);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          '⚠️  test operation failed (attempt 1) on element. Retrying... (timeout: 1000ms)',
        ),
      );
    });
  });

  describe('Timeout and maxRetries scenarios', () => {
    it('should fail after timeout is exceeded', async () => {
      const mockOperation = jest
        .fn()
        .mockRejectedValue(new Error('Persistent failure'));

      const options: RetryOptions = {
        timeout: 200,
        interval: 50,
        description: 'test operation',
        elemDescription: 'test element',
      };

      await expect(
        Utilities.executeWithRetry(mockOperation, options),
      ).rejects.toThrow(
        /test operation failed after \d+ attempt\(s\) over \d+ms/,
      );

      expect(mockOperation).toHaveBeenCalledTimes(Math.floor(200 / 50));
    });

    it('should fail after maxRetries is exceeded', async () => {
      const mockOperation = jest
        .fn()
        .mockRejectedValue(new Error('Persistent failure'));

      const options: RetryOptions = {
        timeout: 10000,
        interval: 50,
        maxRetries: 3,
        description: 'test operation',
        elemDescription: 'test element',
      };

      await expect(
        Utilities.executeWithRetry(mockOperation, options),
      ).rejects.toThrow(/test operation failed after 3 attempt\(s\)/);

      expect(mockOperation).toHaveBeenCalledTimes(3);
    });
  });
});
