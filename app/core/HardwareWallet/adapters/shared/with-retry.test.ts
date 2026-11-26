import { MAX_DISCONNECT_RETRIES, RETRY_DELAY_MS } from './ledger-constants';
import { withTransientRetry } from './with-retry';

describe('withTransientRetry', () => {
  const transientError = new Error('Device disconnected');
  const fatalError = new Error('Bluetooth is off');

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns the first successful result without retrying', async () => {
    const operation = jest.fn().mockResolvedValue('ready');
    const onRetry = jest.fn();

    await expect(
      withTransientRetry(operation, {
        isTransient: () => true,
        onRetry,
      }),
    ).resolves.toBe('ready');

    expect(operation).toHaveBeenCalledTimes(1);
    expect(onRetry).not.toHaveBeenCalled();
  });

  it('retries a transient failure after the delay and resolves', async () => {
    const operation = jest
      .fn()
      .mockRejectedValueOnce(transientError)
      .mockResolvedValueOnce('ready');
    const onRetry = jest.fn().mockResolvedValue(undefined);

    const pending = withTransientRetry(operation, {
      isTransient: (error) => error === transientError,
      onRetry,
    });

    await jest.advanceTimersByTimeAsync(RETRY_DELAY_MS);
    await expect(pending).resolves.toBe('ready');

    expect(operation).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith(transientError, 1);
  });

  it('does not retry a non-transient failure', async () => {
    const operation = jest.fn().mockRejectedValue(fatalError);
    const onRetry = jest.fn();

    await expect(
      withTransientRetry(operation, {
        isTransient: (error) => error === transientError,
        onRetry,
      }),
    ).rejects.toBe(fatalError);

    expect(operation).toHaveBeenCalledTimes(1);
    expect(onRetry).not.toHaveBeenCalled();
  });

  it('throws the last transient error once attempts are exhausted', async () => {
    const lastError = new Error('Still disconnected');
    const operation = jest
      .fn()
      .mockRejectedValueOnce(transientError)
      .mockRejectedValueOnce(transientError)
      .mockRejectedValue(lastError);
    const onRetry = jest.fn().mockResolvedValue(undefined);

    const pending = withTransientRetry(operation, {
      isTransient: (error) => error instanceof Error,
      onRetry,
    });
    pending.catch(() => undefined);

    await jest.advanceTimersByTimeAsync(
      RETRY_DELAY_MS * MAX_DISCONNECT_RETRIES,
    );

    await expect(pending).rejects.toBe(lastError);
    expect(operation).toHaveBeenCalledTimes(MAX_DISCONNECT_RETRIES);
    expect(onRetry).toHaveBeenCalledTimes(MAX_DISCONNECT_RETRIES - 1);
  });

  it('honours custom attempt and delay options', async () => {
    const operation = jest
      .fn()
      .mockRejectedValueOnce(transientError)
      .mockResolvedValueOnce('ready');

    const pending = withTransientRetry(operation, {
      isTransient: () => true,
      maxAttempts: 2,
      delayMs: 100,
    });

    await jest.advanceTimersByTimeAsync(100);
    await expect(pending).resolves.toBe('ready');

    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('surfaces a rejected onRetry hook instead of retrying', async () => {
    const operation = jest.fn().mockRejectedValue(transientError);
    const onRetry = jest.fn().mockRejectedValue(new Error('cleanup failed'));

    await expect(
      withTransientRetry(operation, { isTransient: () => true, onRetry }),
    ).rejects.toThrow('cleanup failed');

    expect(operation).toHaveBeenCalledTimes(1);
  });
});
