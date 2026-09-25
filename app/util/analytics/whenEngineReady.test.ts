// Undo the global mock from testSetup.js so we test the real implementation
jest.unmock('./whenEngineReady');

import { whenEngineReady } from './whenEngineReady';

const mockEngine = { context: {} as Record<string, unknown> | null };

jest.mock('../../core/Engine/Engine', () => ({
  default: mockEngine,
}));

/**
 * Each retry awaits a setTimeout before checking again, so we must
 * interleave timer advances with microtask flushes.
 * Delays: 1000, 2000, 4000, 8000, 16000
 */
const advanceThroughAllRetries = async () => {
  for (let attempt = 0; attempt < 5; attempt++) {
    // Native async functions can require more than one microtask turn before
    // scheduling the next retry. The async timer API drains those continuations
    // before returning, unlike advanceTimersByTime + one Promise.resolve().
    await jest.advanceTimersByTimeAsync(1000 * Math.pow(2, attempt));
  }
};

describe('whenEngineReady', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockEngine.context = {};
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('resolves immediately when Engine is already ready', async () => {
    const promise = whenEngineReady();
    await promise;
  });

  it('resolves after Engine becomes ready on first retry', async () => {
    mockEngine.context = null;

    const promise = whenEngineReady();

    // Fire first retry timer; set engine ready before microtask continues the loop
    jest.advanceTimersByTime(1000);
    mockEngine.context = {};
    await Promise.resolve();

    await promise;
  });

  it('throws after max retries when Engine never becomes ready', async () => {
    mockEngine.context = null;

    // Attach the rejection handler before advancing async timers; otherwise
    // the native async function can reject before the assertion is registered.
    const rejection = whenEngineReady().catch((error: unknown) => error);
    await advanceThroughAllRetries();

    await expect(rejection).resolves.toEqual(
      new Error('Engine did not become ready after 5 retries'),
    );
  });

  it('treats Engine throwing as not ready and retries', async () => {
    Object.defineProperty(mockEngine, 'context', {
      get: () => {
        throw new Error('Engine not initialized');
      },
      configurable: true,
    });

    const rejection = whenEngineReady().catch((error: unknown) => error);
    await advanceThroughAllRetries();

    await expect(rejection).resolves.toEqual(
      new Error('Engine did not become ready after 5 retries'),
    );

    // Restore data property for subsequent tests
    Object.defineProperty(mockEngine, 'context', {
      value: {},
      writable: true,
      configurable: true,
    });
  });
});
