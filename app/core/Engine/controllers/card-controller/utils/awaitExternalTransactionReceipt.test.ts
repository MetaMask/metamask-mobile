import { awaitExternalTransactionReceipt } from './awaitExternalTransactionReceipt';

describe('awaitExternalTransactionReceipt', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('resolves when receipt status is success', async () => {
    const getReceipt = jest.fn().mockResolvedValue({ status: '0x1' });

    const resultPromise = awaitExternalTransactionReceipt({
      txHash: '0xabc',
      getReceipt,
      intervalMs: 1000,
      timeoutMs: 5000,
    });

    const result = await resultPromise;
    expect(result.pollAttempts).toBe(1);
    expect(getReceipt).toHaveBeenCalledTimes(1);
  });

  it('throws ExternalTransactionRevertedError when status is 0', async () => {
    const getReceipt = jest.fn().mockResolvedValue({ status: '0x0' });

    await expect(
      awaitExternalTransactionReceipt({
        txHash: '0xabc',
        getReceipt,
        intervalMs: 1000,
        timeoutMs: 5000,
      }),
    ).rejects.toMatchObject({ name: 'ExternalTransactionRevertedError' });
  });

  it('times out with pollAttempts and lastPollErrorCode', async () => {
    const getReceipt = jest
      .fn()
      .mockRejectedValue(
        Object.assign(new Error('rpc down'), { name: 'RpcError' }),
      );

    const resultPromise = awaitExternalTransactionReceipt({
      txHash: '0xabc',
      getReceipt,
      intervalMs: 1000,
      timeoutMs: 2500,
    });
    // Prevent unhandled rejection noise while timers advance.
    resultPromise.catch(() => undefined);

    await jest.advanceTimersByTimeAsync(3000);

    await expect(resultPromise).rejects.toMatchObject({
      name: 'ExternalTransactionReceiptTimeoutError',
      lastPollErrorCode: 'RpcError',
      elapsedMs: expect.any(Number),
    });
  });

  it('times out when getReceipt never resolves', async () => {
    const getReceipt = jest.fn().mockReturnValue(new Promise(() => undefined));

    const resultPromise = awaitExternalTransactionReceipt({
      txHash: '0xabc',
      getReceipt,
      intervalMs: 1000,
      timeoutMs: 2500,
    });
    resultPromise.catch(() => undefined);

    await jest.advanceTimersByTimeAsync(2500);

    await expect(resultPromise).rejects.toMatchObject({
      name: 'ExternalTransactionReceiptTimeoutError',
      pollAttempts: 1,
    });
    expect(getReceipt).toHaveBeenCalledTimes(1);
  });

  it('times out when remaining budget is exhausted after a pending poll', async () => {
    jest.setSystemTime(0);
    const getReceipt = jest.fn().mockImplementation(() => {
      jest.setSystemTime(Date.now() + 2500);
      return Promise.resolve(null);
    });

    await expect(
      awaitExternalTransactionReceipt({
        txHash: '0xabc',
        getReceipt,
        intervalMs: 1000,
        timeoutMs: 2500,
      }),
    ).rejects.toMatchObject({
      name: 'ExternalTransactionReceiptTimeoutError',
      pollAttempts: 1,
    });
  });

  it('stops polling when shouldContinue returns false', async () => {
    const getReceipt = jest.fn().mockResolvedValue(null);
    let cancelled = false;

    const resultPromise = awaitExternalTransactionReceipt({
      txHash: '0xabc',
      getReceipt,
      shouldContinue: () => !cancelled,
      intervalMs: 1000,
      timeoutMs: 60000,
    });
    // Prevent unhandled rejection noise while timers advance.
    resultPromise.catch(() => undefined);

    await jest.advanceTimersByTimeAsync(1000);
    cancelled = true;
    await jest.advanceTimersByTimeAsync(1000);

    await expect(resultPromise).rejects.toMatchObject({
      name: 'ExternalTransactionMonitorCancelledError',
    });
    const attemptsAtCancel = getReceipt.mock.calls.length;
    await jest.advanceTimersByTimeAsync(5000);
    expect(getReceipt).toHaveBeenCalledTimes(attemptsAtCancel);
  });
});
