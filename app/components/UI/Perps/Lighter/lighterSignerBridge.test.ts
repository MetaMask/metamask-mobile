import {
  connectLighterExecutor,
  lighterSignerBridge,
  resetLighterBridge,
} from './lighterSignerBridge';

describe('lighterSignerBridge', () => {
  afterEach(() => {
    resetLighterBridge();
  });

  it('queues calls until the executor connects, then executes them', async () => {
    const pending = lighterSignerBridge.execute({
      function: '_createAuthToken',
      params: [28, 7],
    });
    const executor = jest.fn().mockResolvedValue({ token: 'ok' });
    connectLighterExecutor(executor);
    await expect(pending).resolves.toStrictEqual({ token: 'ok' });
    expect(executor).toHaveBeenCalledWith({
      function: '_createAuthToken',
      params: [28, 7],
    });
  });

  it('rejects callers waiting on readiness when the WebView reloads', async () => {
    // The page-side WASM state is gone on reload; a queued caller must fail
    // fast and retry, not hang on a readiness promise that was re-armed.
    const pending = lighterSignerBridge.execute({
      function: '_signCreateOrder',
      params: [],
    });
    resetLighterBridge();
    await expect(pending).rejects.toThrow(
      'Lighter signer WebView reloaded; retry the operation',
    );
  });

  it('times out instead of queueing forever when the signer never mounts', async () => {
    jest.useFakeTimers();
    try {
      const pending = lighterSignerBridge.execute({
        function: '_createClient',
        params: [],
      });
      const assertion = await expect(pending).rejects.toThrow(
        'Lighter signer not ready within',
      );
      jest.advanceTimersByTime(90_001);
      await assertion;
    } finally {
      jest.useRealTimers();
    }
  });
});
