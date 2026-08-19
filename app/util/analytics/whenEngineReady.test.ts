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
    jest.advanceTimersByTime(1000 * Math.pow(2, attempt));
    // Let the awaited promise resolve so the next iteration can schedule its timer
    await Promise.resolve();
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

    const promise = whenEngineReady();
    await advanceThroughAllRetries();

    await expect(promise).rejects.toThrow(
      'Engine did not become ready after 5 retries',
    );
  });

  it('treats Engine throwing as not ready and retries', async () => {
    Object.defineProperty(mockEngine, 'context', {
      get: () => {
        throw new Error('Engine not initialized');
      },
      configurable: true,
    });

    const promise = whenEngineReady();
    await advanceThroughAllRetries();

    await expect(promise).rejects.toThrow(
      'Engine did not become ready after 5 retries',
    );

    // Restore data property for subsequent tests
    Object.defineProperty(mockEngine, 'context', {
      value: {},
      writable: true,
      configurable: true,
    });
  });
});
