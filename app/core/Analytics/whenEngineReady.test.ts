import { whenEngineReady } from './whenEngineReady';
import Engine from '../Engine/Engine';

let mockContextValue: typeof Engine.context | null = null;

jest.mock('../Engine/Engine', () => ({
  __esModule: true,
  default: {
    get context() {
      return mockContextValue as typeof Engine.context;
    },
  },
}));

describe('whenEngineReady', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockContextValue = null;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('resolves immediately when Engine.context is available', async () => {
    mockContextValue = {} as typeof Engine.context;

    const promise = whenEngineReady();

    await expect(promise).resolves.toBeUndefined();
  });

  it('polls until Engine.context becomes available', async () => {
    mockContextValue = null;

    const promise = whenEngineReady();

    // Fast-forward time to simulate first retry (1s)
    jest.advanceTimersByTime(1000);

    // Still not ready
    await Promise.resolve();
    expect(Engine.context).toBeNull();

    // Set context available
    mockContextValue = {} as typeof Engine.context;

    // Fast-forward again to trigger next poll (2s)
    jest.advanceTimersByTime(2000);

    await expect(promise).resolves.toBeUndefined();
  });

  it('continues polling when Engine.context access throws error', async () => {
    // Mock Engine to throw error when accessing context
    const originalContext = Object.getOwnPropertyDescriptor(Engine, 'context');
    Object.defineProperty(Engine, 'context', {
      get: jest.fn(() => {
        throw new Error('Access error');
      }),
      configurable: true,
    });

    const promise = whenEngineReady();

    // Should continue polling despite error (1s delay)
    jest.advanceTimersByTime(1000);
    await Promise.resolve();

    // Restore context to null
    if (originalContext) {
      Object.defineProperty(Engine, 'context', originalContext);
    }
    mockContextValue = null;
    jest.advanceTimersByTime(2000);
    await Promise.resolve();

    // Set context available
    mockContextValue = {} as typeof Engine.context;
    jest.advanceTimersByTime(4000);

    await expect(promise).resolves.toBeUndefined();
  });

  it('uses exponential backoff delays', async () => {
    mockContextValue = null;
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

    const promise = whenEngineReady();

    // First retry: 1s (1000ms)
    jest.advanceTimersByTime(1000);
    await Promise.resolve();

    // Second retry: 2s (2000ms)
    jest.advanceTimersByTime(2000);
    await Promise.resolve();

    // Third retry: 4s (4000ms) - make it ready
    mockContextValue = {} as typeof Engine.context;
    jest.advanceTimersByTime(4000);

    await expect(promise).resolves.toBeUndefined();

    // Verify setTimeout was called with exponential backoff delays
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 1000);
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 2000);
    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 4000);

    setTimeoutSpy.mockRestore();
  });

  it('throws error after maximum retries', async () => {
    mockContextValue = null;

    const promise = whenEngineReady();

    // Advance through all 5 retries: 1s + 2s + 4s + 8s + 16s = 31s
    jest.advanceTimersByTime(1000); // Retry 1
    await Promise.resolve();
    jest.advanceTimersByTime(2000); // Retry 2
    await Promise.resolve();
    jest.advanceTimersByTime(4000); // Retry 3
    await Promise.resolve();
    jest.advanceTimersByTime(8000); // Retry 4
    await Promise.resolve();
    jest.advanceTimersByTime(16000); // Retry 5
    await Promise.resolve();

    await expect(promise).rejects.toThrow(
      'Engine did not become ready after 5 retries',
    );
  });
});
