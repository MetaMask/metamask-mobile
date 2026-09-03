import {
  MoneyAccountUpgradeStepError,
  TerminalUpgradeError,
} from '@metamask/money-account-upgrade-controller';
import {
  MoneyAccountUpgradeAbortedError,
  isMoneyAccountUpgradeAbortedError,
  upgradeAccountWithRetry,
} from './upgrade-account-with-retry';

const ADDRESS = '0x1111111111111111111111111111111111111111' as const;

const retryableError = () =>
  new MoneyAccountUpgradeStepError('associate-address', new Error('http 500'));

const terminalError = () =>
  new MoneyAccountUpgradeStepError(
    'associate-address',
    new TerminalUpgradeError('address belongs to another profile'),
  );

describe('upgradeAccountWithRetry', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('resolves after a single successful attempt', async () => {
    const upgradeAccount = jest.fn().mockResolvedValue(undefined);

    await upgradeAccountWithRetry(upgradeAccount, ADDRESS);

    expect(upgradeAccount).toHaveBeenCalledTimes(1);
    expect(upgradeAccount).toHaveBeenCalledWith(ADDRESS);
  });

  it('retries a non-terminal step error and resolves when a later attempt succeeds', async () => {
    const upgradeAccount = jest
      .fn()
      .mockRejectedValueOnce(retryableError())
      .mockResolvedValueOnce(undefined);

    const run = upgradeAccountWithRetry(upgradeAccount, ADDRESS);
    await jest.advanceTimersByTimeAsync(10_000);
    await run;

    expect(upgradeAccount).toHaveBeenCalledTimes(2);
  });

  it('waits with capped exponential backoff between attempts', async () => {
    const upgradeAccount = jest.fn().mockRejectedValue(retryableError());
    const abortController = new AbortController();

    const run = upgradeAccountWithRetry(upgradeAccount, ADDRESS, {
      signal: abortController.signal,
    });
    const settled = run.catch((error: unknown) => error);

    // Attempts fire at t = 0, 10s, 30s, 70s, then every 60s (delays
    // 10/20/40, capped at 60 thereafter).
    expect(upgradeAccount).toHaveBeenCalledTimes(1);
    for (const [delay, attempts] of [
      [10_000, 2],
      [20_000, 3],
      [40_000, 4],
      [60_000, 5],
      [60_000, 6],
      [60_000, 7],
    ] as const) {
      await jest.advanceTimersByTimeAsync(delay - 1);
      expect(upgradeAccount).toHaveBeenCalledTimes(attempts - 1);
      await jest.advanceTimersByTimeAsync(1);
      expect(upgradeAccount).toHaveBeenCalledTimes(attempts);
    }

    abortController.abort();
    expect(await settled).toBeInstanceOf(MoneyAccountUpgradeAbortedError);
  });

  it('keeps retrying at the capped delay until the signal aborts', async () => {
    const upgradeAccount = jest.fn().mockRejectedValue(retryableError());
    const abortController = new AbortController();

    const run = upgradeAccountWithRetry(upgradeAccount, ADDRESS, {
      signal: abortController.signal,
    });
    const settled = run.catch((error: unknown) => error);

    // Walk through the ramp-up (attempts at t = 0, 10s, 30s, 70s), then a
    // further 100 minutes at the 60s cap: one attempt per minute.
    await jest.advanceTimersByTimeAsync(70_000);
    expect(upgradeAccount).toHaveBeenCalledTimes(4);
    await jest.advanceTimersByTimeAsync(100 * 60_000);
    expect(upgradeAccount).toHaveBeenCalledTimes(104);

    abortController.abort();
    expect(await settled).toBeInstanceOf(MoneyAccountUpgradeAbortedError);
  });

  it('rethrows a terminal step error without retrying', async () => {
    const error = terminalError();
    const upgradeAccount = jest.fn().mockRejectedValue(error);

    await expect(upgradeAccountWithRetry(upgradeAccount, ADDRESS)).rejects.toBe(
      error,
    );

    expect(upgradeAccount).toHaveBeenCalledTimes(1);
  });

  it('rethrows a non-step error without retrying', async () => {
    const error = new Error('controller not initialized');
    const upgradeAccount = jest.fn().mockRejectedValue(error);

    await expect(upgradeAccountWithRetry(upgradeAccount, ADDRESS)).rejects.toBe(
      error,
    );

    expect(upgradeAccount).toHaveBeenCalledTimes(1);
  });

  it('calls onRetry with each retried failure and its attempt number', async () => {
    const firstError = retryableError();
    const secondError = retryableError();
    const upgradeAccount = jest
      .fn()
      .mockRejectedValueOnce(firstError)
      .mockRejectedValueOnce(secondError)
      .mockResolvedValueOnce(undefined);
    const onRetry = jest.fn();

    const run = upgradeAccountWithRetry(upgradeAccount, ADDRESS, { onRetry });
    await jest.advanceTimersByTimeAsync(30_000);
    await run;

    expect(onRetry.mock.calls).toEqual([
      [firstError, 1],
      [secondError, 2],
    ]);
  });

  it('does not call onRetry for failures that end the run', async () => {
    const onRetry = jest.fn();

    await expect(
      upgradeAccountWithRetry(
        jest.fn().mockRejectedValue(terminalError()),
        ADDRESS,
        { onRetry },
      ),
    ).rejects.toBeInstanceOf(MoneyAccountUpgradeStepError);
    await expect(
      upgradeAccountWithRetry(
        jest.fn().mockRejectedValue(new Error('not a step error')),
        ADDRESS,
        { onRetry },
      ),
    ).rejects.toThrow('not a step error');

    expect(onRetry).not.toHaveBeenCalled();
  });

  it('calls onRetry for a retryable failure even when the signal aborts the subsequent wait', async () => {
    const abortController = new AbortController();
    const error = retryableError();
    const upgradeAccount = jest.fn().mockImplementation(() => {
      abortController.abort();
      return Promise.reject(error);
    });
    const onRetry = jest.fn();

    await expect(
      upgradeAccountWithRetry(upgradeAccount, ADDRESS, {
        signal: abortController.signal,
        onRetry,
      }),
    ).rejects.toBeInstanceOf(MoneyAccountUpgradeAbortedError);

    expect(onRetry.mock.calls).toEqual([[error, 1]]);
  });

  it('rejects without attempting when the signal is already aborted', async () => {
    const upgradeAccount = jest.fn();
    const abortController = new AbortController();
    abortController.abort();

    await expect(
      upgradeAccountWithRetry(upgradeAccount, ADDRESS, {
        signal: abortController.signal,
      }),
    ).rejects.toBeInstanceOf(MoneyAccountUpgradeAbortedError);

    expect(upgradeAccount).not.toHaveBeenCalled();
  });

  it('rejects promptly when the signal aborts during a backoff wait', async () => {
    const upgradeAccount = jest.fn().mockRejectedValue(retryableError());
    const abortController = new AbortController();

    const run = upgradeAccountWithRetry(upgradeAccount, ADDRESS, {
      signal: abortController.signal,
    });
    const settled = run.catch((error: unknown) => error);
    await jest.advanceTimersByTimeAsync(1_000);
    abortController.abort();

    expect(await settled).toBeInstanceOf(MoneyAccountUpgradeAbortedError);
    expect(upgradeAccount).toHaveBeenCalledTimes(1);
  });

  it('lets an in-flight attempt finish and resolves when it succeeds after the signal aborts', async () => {
    const abortController = new AbortController();
    let resolveAttempt: () => void = () => undefined;
    const upgradeAccount = jest.fn().mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveAttempt = resolve;
        }),
    );

    const run = upgradeAccountWithRetry(upgradeAccount, ADDRESS, {
      signal: abortController.signal,
    });
    abortController.abort();
    resolveAttempt();

    await expect(run).resolves.toBeUndefined();
    expect(upgradeAccount).toHaveBeenCalledTimes(1);
  });

  it('does not retry once the signal aborts while an attempt is in flight', async () => {
    const abortController = new AbortController();
    const upgradeAccount = jest.fn().mockImplementation(() => {
      abortController.abort();
      return Promise.reject(retryableError());
    });

    await expect(
      upgradeAccountWithRetry(upgradeAccount, ADDRESS, {
        signal: abortController.signal,
      }),
    ).rejects.toBeInstanceOf(MoneyAccountUpgradeAbortedError);

    expect(upgradeAccount).toHaveBeenCalledTimes(1);
  });
});

describe('isMoneyAccountUpgradeAbortedError', () => {
  it('accepts the abort error', () => {
    expect(
      isMoneyAccountUpgradeAbortedError(new MoneyAccountUpgradeAbortedError()),
    ).toBe(true);
  });

  it('rejects other errors and non-errors', () => {
    expect(
      isMoneyAccountUpgradeAbortedError(
        new Error('Money Account upgrade retry aborted'),
      ),
    ).toBe(false);
    expect(isMoneyAccountUpgradeAbortedError(retryableError())).toBe(false);
    expect(isMoneyAccountUpgradeAbortedError(undefined)).toBe(false);
    expect(isMoneyAccountUpgradeAbortedError('aborted')).toBe(false);
  });
});
