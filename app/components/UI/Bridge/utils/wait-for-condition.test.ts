import { waitForCondition } from './wait-for-condition';

describe('waitForCondition', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should resolve immediately when condition is already true', async () => {
    const mockFn = jest.fn().mockReturnValue(true);

    const promise = waitForCondition({ fn: mockFn });

    await expect(promise).resolves.toBeUndefined();
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should wait and resolve when condition becomes true', async () => {
    const mockFn = jest.fn()
      .mockReturnValueOnce(false)
      .mockReturnValue(true);

    const promise = waitForCondition({ fn: mockFn });

    jest.advanceTimersByTime(10); // Default initial wait
    await Promise.resolve();

    await expect(promise).resolves.toBeUndefined();
    expect(mockFn).toHaveBeenCalledTimes(2);
  });

  it('should throw error when timeout is exceeded', async () => {
    const mockFn = jest.fn().mockReturnValue(false);

    const promise = waitForCondition({
      fn: mockFn,
      timeout: 100
    });

    jest.advanceTimersByTime(200); // Exceed timeout
    await Promise.resolve();

    await expect(promise).rejects.toThrow('waitForCondition timed out after 100ms');
  });

  it('should use custom initial wait time', async () => {
    const mockFn = jest.fn()
      .mockReturnValueOnce(false)
      .mockReturnValue(true);

    const promise = waitForCondition({
      fn: mockFn,
      initialWaitTime: 50
    });

    jest.advanceTimersByTime(50);
    await Promise.resolve();

    await expect(promise).resolves.toBeUndefined();
    expect(mockFn).toHaveBeenCalledTimes(2);
  });
});
