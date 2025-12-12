/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-var-requires */
import { whenStoreReady } from './when-store-ready';

jest.mock('../../../store', () => ({
  __esModule: true,
  store: undefined,
}));

describe('when-store-ready', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('whenStoreReady', () => {
    it('should resolve immediately if the store is already ready', async () => {
      const mockStore = {
        dispatch: jest.fn(),
        getState: jest.fn().mockImplementation(() => ({
          engine: { backgroundState: { NetworkController: true } },
        })),
      };

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const storeModule = require('../../../store');
      Object.defineProperty(storeModule, 'store', {
        get: () => mockStore,
        configurable: true,
      });

      const promise = whenStoreReady();

      await expect(promise).resolves.toBeUndefined();
    });

    it('should wait and then resolve when the store becomes ready', async () => {
      // Arrange: Initially, store is undefined, then becomes ready
      let callCount = 0;
      const mockStore = {
        dispatch: jest.fn(),
        getState: jest.fn().mockImplementation(() => ({
          engine: { backgroundState: { NetworkController: true } },
        })),
      };

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const storeModule = require('../../../store');
      Object.defineProperty(storeModule, 'store', {
        get: () => {
          callCount++;
          if (callCount < 3) {
            return undefined;
          }
          return mockStore;
        },
        configurable: true,
      });

      const promise = whenStoreReady();

      // Fast-forward time to trigger the check intervals
      await jest.advanceTimersByTimeAsync(2000);

      await expect(promise).resolves.toBeUndefined();
    });

    it('should wait if store is defined but dispatch is not a function', async () => {
      // Arrange: Store exists but dispatch is not ready
      let callCount = 0;
      const mockStore = {
        dispatch: jest.fn(),
        getState: jest.fn().mockImplementation(() => ({
          engine: { backgroundState: { NetworkController: true } },
        })),
      };

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const storeModule = require('../../../store');
      Object.defineProperty(storeModule, 'store', {
        get: () => {
          callCount++;
          if (callCount < 3) {
            return { dispatch: null }; // dispatch exists but is not a function
          }
          return mockStore;
        },
        configurable: true,
      });

      const promise = whenStoreReady();

      // Fast-forward time to trigger the check intervals
      await jest.advanceTimersByTimeAsync(2000);

      await expect(promise).resolves.toBeUndefined();
    });

    it('should wait if NetworkController is not available in store state', async () => {
      let callCount = 0;
      const mockReadyStore = {
        dispatch: jest.fn(),
        getState: jest.fn().mockImplementation(() => ({
          engine: { backgroundState: { NetworkController: true } },
        })),
      };

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const storeModule = require('../../../store');
      Object.defineProperty(storeModule, 'store', {
        get: () => {
          callCount++;
          if (callCount < 3) {
            return {
              dispatch: jest.fn(),
              getState: jest.fn().mockImplementation(() => ({
                engine: { backgroundState: {} }, // NetworkController not set
              })),
            };
          }
          return mockReadyStore;
        },
        configurable: true,
      });

      const promise = whenStoreReady();

      // Fast-forward time to trigger the check intervals
      await jest.advanceTimersByTimeAsync(2000);

      await expect(promise).resolves.toBeUndefined();
    });
  });
});
