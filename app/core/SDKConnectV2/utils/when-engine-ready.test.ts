/* eslint-disable @typescript-eslint/no-explicit-any */
import Engine from '../../Engine';
import { whenEngineReady } from './when-engine-ready';

jest.mock('../../Engine', () => ({
  __esModule: true,
  default: {},
}));

describe('when-engine-ready', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('whenEngineReady', () => {
    it('should resolve immediately if the engine is already ready', async () => {
      // Mock Engine.context to be defined
      Object.defineProperty(Engine, 'context', {
        get: () => ({ someProperty: true }),
        configurable: true,
      });

      const promise = whenEngineReady();
      await expect(promise).resolves.toBeUndefined();
    });

    it('should wait and then resolve when the engine becomes ready', async () => {
      // Initially, Engine.context is undefined
      Object.defineProperty(Engine, 'context', {
        get: jest
          .fn()
          .mockReturnValueOnce(undefined)
          .mockReturnValueOnce(undefined)
          .mockReturnValue({ someProperty: true }),
        configurable: true,
      });

      const promise = whenEngineReady();

      // Fast-forward time to trigger the check intervals
      await jest.advanceTimersByTimeAsync(2000);

      await expect(promise).resolves.toBeUndefined();
    });

    it('should handle errors when accessing Engine.context', async () => {
      // Mock Engine.context to throw an error initially, then succeed
      let callCount = 0;
      Object.defineProperty(Engine, 'context', {
        get: () => {
          callCount++;
          if (callCount < 3) {
            throw new Error('Engine not initialized');
          }
          return { someProperty: true };
        },
        configurable: true,
      });

      const promise = whenEngineReady();

      // Fast-forward time to trigger the check intervals
      await jest.advanceTimersByTimeAsync(3000);

      await expect(promise).resolves.toBeUndefined();
    });
  });
});
