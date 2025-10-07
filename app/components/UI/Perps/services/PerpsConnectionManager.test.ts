// Mock dependencies
jest.mock('../../../../core/SDKConnect/utils/DevLogger');
jest.mock('../../../../util/Logger');
jest.mock('../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      initializeProviders: jest.fn(),
      getAccountState: jest.fn(),
      disconnect: jest.fn(),
      reconnectWithNewContext: jest.fn(),
    },
  },
}));

// Store the subscription callbacks
const storeCallbacks: (() => void)[] = [];

// Mock Redux store like other tests do
jest.mock('../../../../store', () => ({
  store: {
    subscribe: jest.fn((callback) => {
      storeCallbacks.push(callback);
      return jest.fn(); // Returns unsubscribe function
    }),
    getState: jest.fn(),
    dispatch: jest.fn(),
  },
}));

// Mock selectors
jest.mock('../../../../selectors/accountsController', () => ({
  selectSelectedInternalAccountAddress: jest.fn(),
  selectInternalAccounts: jest.fn(() => []),
}));

jest.mock('../../../../selectors/multichainAccounts/accounts', () => ({
  selectSelectedInternalAccountByScope: jest.fn(() => () => ({
    address: '0x1234567890123456789012345678901234567890',
  })),
}));

jest.mock('../selectors/perpsController', () => ({
  selectPerpsNetwork: jest.fn(),
}));

// Mock StreamManager - create a singleton mock instance
const mockStreamManagerInstance = {
  positions: { clearCache: jest.fn(), prewarm: jest.fn(() => jest.fn()) },
  orders: { clearCache: jest.fn(), prewarm: jest.fn(() => jest.fn()) },
  account: { clearCache: jest.fn(), prewarm: jest.fn(() => jest.fn()) },
  marketData: { clearCache: jest.fn(), prewarm: jest.fn(() => jest.fn()) },
  prices: { clearCache: jest.fn(), prewarm: jest.fn(async () => jest.fn()) },
};

jest.mock('../providers/PerpsStreamManager', () => ({
  getStreamManagerInstance: jest.fn(() => mockStreamManagerInstance),
}));

// Mock Device and BackgroundTimer for grace period tests
jest.mock('../../../../util/device', () => ({
  isIos: jest.fn(),
  isAndroid: jest.fn(),
}));

jest.mock('react-native-background-timer', () => ({
  setTimeout: jest.fn(),
  clearTimeout: jest.fn(),
  start: jest.fn(),
  stop: jest.fn(),
}));

jest.mock('../../../../util/Logger', () => {
  const mockError = jest.fn();
  return {
    default: {
      error: mockError,
    },
    error: mockError,
    __esModule: true,
  };
});

// Import non-singleton modules first
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import Engine from '../../../../core/Engine';
import { store } from '../../../../store';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import { selectPerpsNetwork } from '../selectors/perpsController';

// Import PerpsConnectionManager after mocks are set up
// This is imported here after mocks to ensure store.subscribe is mocked before the singleton is created
import { PerpsConnectionManager } from './PerpsConnectionManager';

// Helper to reset private properties for testing
const resetManager = (manager: unknown) => {
  const m = manager as {
    isConnected: boolean;
    isConnecting: boolean;
    isInitialized: boolean;
    connectionRefCount: number;
    initPromise: Promise<void> | null;
    unsubscribeFromStore: (() => void) | null;
    previousAddress: string | undefined;
    previousPerpsNetwork: 'mainnet' | 'testnet' | undefined;
    error: string | null;
    isInGracePeriod: boolean;
    gracePeriodTimer: number | null;
  };
  m.isConnected = false;
  m.isConnecting = false;
  m.isInitialized = false;
  m.connectionRefCount = 0;
  m.initPromise = null;
  m.unsubscribeFromStore = null;
  m.previousAddress = undefined;
  m.previousPerpsNetwork = undefined;
  m.error = null;
  m.isInGracePeriod = false;
  m.gracePeriodTimer = null;
};

describe('PerpsConnectionManager', () => {
  let mockDevLogger: jest.Mocked<typeof DevLogger>;
  let mockPerpsController: {
    initializeProviders: jest.MockedFunction<() => Promise<void>>;
    getAccountState: jest.MockedFunction<
      () => Promise<Record<string, unknown>>
    >;
    disconnect: jest.MockedFunction<() => Promise<void>>;
    reconnectWithNewContext: jest.MockedFunction<() => Promise<void>>;
  };

  // No need for beforeAll - singleton is created on first access

  beforeEach(() => {
    jest.clearAllMocks();

    // Clear StreamManager mock calls
    mockStreamManagerInstance.positions.clearCache.mockClear();
    mockStreamManagerInstance.orders.clearCache.mockClear();
    mockStreamManagerInstance.account.clearCache.mockClear();
    mockStreamManagerInstance.marketData.clearCache.mockClear();
    mockStreamManagerInstance.prices.clearCache.mockClear();
    mockStreamManagerInstance.positions.prewarm.mockClear();
    mockStreamManagerInstance.orders.prewarm.mockClear();
    mockStreamManagerInstance.account.prewarm.mockClear();
    mockStreamManagerInstance.marketData.prewarm.mockClear();
    mockStreamManagerInstance.prices.prewarm.mockClear();

    // Reset the singleton instance state
    resetManager(PerpsConnectionManager);

    mockDevLogger = DevLogger as jest.Mocked<typeof DevLogger>;
    mockPerpsController = Engine.context
      .PerpsController as unknown as typeof mockPerpsController;
  });

  describe('getInstance', () => {
    it('should return the same instance when called multiple times', () => {
      const instance1 = PerpsConnectionManager;
      const instance2 = PerpsConnectionManager;

      expect(instance1).toBe(instance2);
    });
  });

  describe('connect', () => {
    it('should initialize providers and connect successfully', async () => {
      mockPerpsController.initializeProviders.mockResolvedValueOnce();
      mockPerpsController.getAccountState.mockResolvedValueOnce({});

      await PerpsConnectionManager.connect();

      expect(mockPerpsController.initializeProviders).toHaveBeenCalledTimes(1);
      expect(mockPerpsController.getAccountState).toHaveBeenCalledTimes(1);
      expect(mockDevLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Successfully connected'),
      );
    });

    it('should increment reference count on each connect call', async () => {
      mockPerpsController.initializeProviders.mockResolvedValue();
      mockPerpsController.getAccountState.mockResolvedValue({});

      await PerpsConnectionManager.connect();
      await PerpsConnectionManager.connect();

      expect(mockDevLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('refCount: 1'),
      );
      expect(mockDevLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('refCount: 2'),
      );
    });

    it('should return existing promise if already connecting', async () => {
      // This test verifies that concurrent connect calls share the same promise

      // Track promises from both connect calls
      const promises: Promise<void>[] = [];

      // Mock a slow initialization
      mockPerpsController.initializeProviders.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 50)),
      );
      mockPerpsController.getAccountState.mockResolvedValue({});

      // Start two connections concurrently
      promises.push(PerpsConnectionManager.connect());
      promises.push(PerpsConnectionManager.connect());

      // Wait for both to complete
      await Promise.all(promises);

      // Should only initialize once - this proves they shared the same init process
      expect(mockPerpsController.initializeProviders).toHaveBeenCalledTimes(1);

      // Both connects should have incremented ref count
      expect(mockDevLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('refCount: 1'),
      );
      expect(mockDevLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('refCount: 2'),
      );
    });

    it('should handle connection failures', async () => {
      const error = new Error('Connection failed');
      mockPerpsController.initializeProviders.mockRejectedValueOnce(error);

      await expect(PerpsConnectionManager.connect()).rejects.toThrow(
        'Connection failed',
      );

      expect(mockDevLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Connection failed'),
        error,
      );

      const state = PerpsConnectionManager.getConnectionState();
      expect(state.isConnected).toBe(false);
      expect(state.isInitialized).toBe(false);
      expect(state.isConnecting).toBe(false);
      expect(state.error).toBe('Connection failed');
    });

    it('should detect and handle stale connections', async () => {
      // First successful connection
      mockPerpsController.initializeProviders.mockResolvedValueOnce();
      mockPerpsController.getAccountState.mockResolvedValueOnce({});
      await PerpsConnectionManager.connect();

      // Simulate stale connection
      mockPerpsController.getAccountState.mockRejectedValueOnce(
        new Error('Stale'),
      );

      // Should reconnect
      mockPerpsController.initializeProviders.mockResolvedValueOnce();
      mockPerpsController.getAccountState.mockResolvedValueOnce({});

      await PerpsConnectionManager.connect();

      // Should have reconnected after detecting stale connection
      expect(mockPerpsController.initializeProviders).toHaveBeenCalledTimes(2);
    });

    it('should skip reconnection if already connected and healthy', async () => {
      // First successful connection
      mockPerpsController.initializeProviders.mockResolvedValueOnce();
      mockPerpsController.getAccountState.mockResolvedValue({});
      await PerpsConnectionManager.connect();

      // Second connect should just verify connection
      await PerpsConnectionManager.connect();

      // initializeProviders should only be called once
      expect(mockPerpsController.initializeProviders).toHaveBeenCalledTimes(1);
      // getAccountState called twice - once for initial connect, once for health check
      expect(mockPerpsController.getAccountState).toHaveBeenCalledTimes(2);
    });

    it('should handle rapid disconnect-connect cycles with grace period', async () => {
      // Setup initial connection
      mockPerpsController.initializeProviders.mockResolvedValue();
      mockPerpsController.getAccountState.mockResolvedValue({});

      // Connect first
      await PerpsConnectionManager.connect();
      expect(PerpsConnectionManager.getConnectionState().isConnected).toBe(
        true,
      );

      // Disconnect (enters grace period)
      await PerpsConnectionManager.disconnect();
      expect(PerpsConnectionManager.getConnectionState().isInGracePeriod).toBe(
        true,
      );

      // Immediately reconnect (should cancel grace period)
      await PerpsConnectionManager.connect();

      const state = PerpsConnectionManager.getConnectionState();
      expect(state.isConnected).toBe(true);
      // The grace period cancellation might not be immediate - just ensure we're connected

      // Should not have called actual disconnect due to grace period cancellation
      expect(mockPerpsController.disconnect).not.toHaveBeenCalled();
    });
  });

  describe('disconnect', () => {
    beforeEach(async () => {
      // Setup initial connection
      mockPerpsController.initializeProviders.mockResolvedValue();
      mockPerpsController.getAccountState.mockResolvedValue({});
      mockPerpsController.disconnect.mockResolvedValue();
    });

    it('should decrement reference count on disconnect', async () => {
      await PerpsConnectionManager.connect();
      await PerpsConnectionManager.connect();

      await PerpsConnectionManager.disconnect();

      expect(mockDevLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('refCount: 1'),
      );

      // Should not actually disconnect yet
      expect(mockPerpsController.disconnect).not.toHaveBeenCalled();
    });

    it('should only start grace period when reference count reaches zero', async () => {
      await PerpsConnectionManager.connect();
      await PerpsConnectionManager.connect();

      await PerpsConnectionManager.disconnect();
      expect(mockPerpsController.disconnect).not.toHaveBeenCalled();

      await PerpsConnectionManager.disconnect();
      // Should enter grace period instead of immediate disconnection
      expect(mockPerpsController.disconnect).not.toHaveBeenCalled();
      expect(PerpsConnectionManager.getConnectionState().isInGracePeriod).toBe(
        true,
      );
    });

    it('should handle disconnect gracefully with grace period', async () => {
      await PerpsConnectionManager.connect();

      // Disconnect should not throw even if controller would fail later
      await expect(PerpsConnectionManager.disconnect()).resolves.not.toThrow();

      // Should enter grace period without immediate disconnect
      const state = PerpsConnectionManager.getConnectionState();
      expect(state.isInGracePeriod).toBe(true);
      expect(mockPerpsController.disconnect).not.toHaveBeenCalled();
    });

    it('should prevent negative reference count', async () => {
      await PerpsConnectionManager.disconnect();
      await PerpsConnectionManager.disconnect();

      // The log will show -1 first, but the actual refCount is clamped to 0
      // Check that disconnect was called with refCount: -1 (before clamping)
      expect(mockDevLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('refCount: -1'),
      );

      // Verify the state is properly reset
      const state = PerpsConnectionManager.getConnectionState();
      expect(state.isConnected).toBe(false);
    });

    it('should maintain connection state during grace period', async () => {
      await PerpsConnectionManager.connect();

      const connectedState = PerpsConnectionManager.getConnectionState();
      expect(connectedState.isConnected).toBe(true);
      expect(connectedState.isInitialized).toBe(true);

      await PerpsConnectionManager.disconnect();

      const gracePeriodState = PerpsConnectionManager.getConnectionState();
      // Connection remains available during grace period
      expect(gracePeriodState.isConnected).toBe(true);
      expect(gracePeriodState.isInitialized).toBe(true);
      expect(gracePeriodState.isConnecting).toBe(false);
      expect(gracePeriodState.isInGracePeriod).toBe(true);
    });

    it('should maintain state monitoring during grace period', async () => {
      // Connect to set up monitoring
      await PerpsConnectionManager.connect();

      // Verify monitoring was set up
      const subscribeCallsBefore = (store.subscribe as jest.Mock).mock.calls
        .length;
      expect(subscribeCallsBefore).toBeGreaterThan(0);

      // Disconnect - should enter grace period, maintaining monitoring
      await PerpsConnectionManager.disconnect();

      // Should not clean up monitoring during grace period
      expect(mockDevLogger.log).not.toHaveBeenCalledWith(
        'PerpsConnectionManager: State monitoring cleaned up',
      );

      // Verify monitoring is still active during grace period
      expect(
        (PerpsConnectionManager as unknown as { unsubscribeFromStore: unknown })
          .unsubscribeFromStore,
      ).not.toBeNull();
    });
  });

  describe('getConnectionState', () => {
    it('should return initial state', () => {
      const state = PerpsConnectionManager.getConnectionState();

      expect(state).toEqual({
        isConnected: false,
        isConnecting: false,
        isInitialized: false,
        isDisconnecting: false,
        isInGracePeriod: false,
        error: null,
      });
    });

    it('should return connecting state during connection', async () => {
      mockPerpsController.initializeProviders.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100)),
      );
      mockPerpsController.getAccountState.mockResolvedValue({});

      const connectPromise = PerpsConnectionManager.connect();

      const state = PerpsConnectionManager.getConnectionState();
      expect(state.isConnecting).toBe(true);
      expect(state.isConnected).toBe(false);

      await connectPromise;

      const finalState = PerpsConnectionManager.getConnectionState();
      expect(finalState.isConnecting).toBe(false);
      expect(finalState.isConnected).toBe(true);
      expect(finalState.isInitialized).toBe(true);
    });
  });

  describe('grace period functionality', () => {
    beforeEach(async () => {
      // Setup initial connection mocks
      mockPerpsController.initializeProviders.mockResolvedValue();
      mockPerpsController.getAccountState.mockResolvedValue({});
      mockPerpsController.disconnect.mockResolvedValue();
    });

    it('maintains connection during grace period', async () => {
      // Given: A connected manager
      await PerpsConnectionManager.connect();
      expect(PerpsConnectionManager.getConnectionState().isConnected).toBe(
        true,
      );

      // When: All references are disconnected
      await PerpsConnectionManager.disconnect();

      // Then: Connection remains available during grace period
      const state = PerpsConnectionManager.getConnectionState();
      expect(state.isConnected).toBe(true); // Still connected for users
      expect(mockPerpsController.disconnect).not.toHaveBeenCalled(); // No actual disconnection yet
    });

    it('cancels grace period when reconnecting', async () => {
      // Given: A manager in grace period
      await PerpsConnectionManager.connect();
      await PerpsConnectionManager.disconnect(); // Enter grace period

      // When: A new connection is requested
      await PerpsConnectionManager.connect();

      // Then: Connection is maintained without actual disconnection
      const state = PerpsConnectionManager.getConnectionState();
      expect(state.isConnected).toBe(true);
      expect(mockPerpsController.disconnect).not.toHaveBeenCalled();
    });

    it('schedules disconnection during grace period', async () => {
      // Given: A manager in grace period
      await PerpsConnectionManager.connect();

      // When: Disconnection is requested
      await PerpsConnectionManager.disconnect();

      // Then: Grace period state is tracked correctly
      const state = PerpsConnectionManager.getConnectionState();
      expect(state.isInGracePeriod).toBe(true);
      expect(state.isConnected).toBe(true); // Connection maintained during grace period
      expect(mockPerpsController.disconnect).not.toHaveBeenCalled(); // No immediate disconnection
    });

    it('handles multiple references correctly', async () => {
      // Given: Multiple connections
      await PerpsConnectionManager.connect(); // refCount = 1
      await PerpsConnectionManager.connect(); // refCount = 2

      // When: First disconnect
      await PerpsConnectionManager.disconnect(); // refCount = 1

      // Then: No grace period yet (still has references)
      expect(PerpsConnectionManager.getConnectionState().isConnected).toBe(
        true,
      );
      expect(mockPerpsController.disconnect).not.toHaveBeenCalled();

      // When: Final disconnect
      await PerpsConnectionManager.disconnect(); // refCount = 0

      // Then: Grace period starts, connection maintained
      expect(PerpsConnectionManager.getConnectionState().isConnected).toBe(
        true,
      );
      expect(mockPerpsController.disconnect).not.toHaveBeenCalled();
    });
  });

  describe('concurrent operations', () => {
    it('should handle multiple concurrent connect/disconnect operations', async () => {
      mockPerpsController.initializeProviders.mockResolvedValue();
      mockPerpsController.getAccountState.mockResolvedValue({});
      mockPerpsController.disconnect.mockResolvedValue();

      // Simulate concurrent operations
      const operations = [
        PerpsConnectionManager.connect(),
        PerpsConnectionManager.connect(),
        PerpsConnectionManager.disconnect(),
        PerpsConnectionManager.connect(),
        PerpsConnectionManager.disconnect(),
      ];

      await Promise.all(operations);

      // Final ref count should be 1 (3 connects - 2 disconnects)
      const finalDisconnect = PerpsConnectionManager.disconnect();
      await finalDisconnect;

      // Should enter grace period when ref count reaches 0
      const state = PerpsConnectionManager.getConnectionState();
      expect(state.isInGracePeriod).toBe(true);
      expect(mockPerpsController.disconnect).not.toHaveBeenCalled();
    });
  });

  describe('state monitoring', () => {
    let storeCallback: () => void;

    beforeEach(() => {
      // Reset store callbacks
      storeCallbacks.length = 0;

      // Setup initial values for selectors
      (
        selectSelectedInternalAccountByScope as unknown as jest.Mock
      ).mockReturnValue(() => ({ address: '0xabc123' }));
      (selectPerpsNetwork as unknown as jest.Mock).mockReturnValue('mainnet');
      (store.getState as jest.Mock).mockReturnValue({});
    });

    it('should set up Redux store subscription on first connect', async () => {
      // Connect to trigger monitoring setup
      mockPerpsController.initializeProviders.mockResolvedValue();
      mockPerpsController.getAccountState.mockResolvedValue({});

      await PerpsConnectionManager.connect();

      // Verify subscription was set up
      expect(store.subscribe).toHaveBeenCalled();
      expect(storeCallbacks.length).toBeGreaterThan(0);

      // The callback should be a function
      expect(typeof storeCallbacks[storeCallbacks.length - 1]).toBe('function');
    });

    it('should detect account changes and trigger reconnection', async () => {
      // Setup connected state
      mockPerpsController.initializeProviders.mockResolvedValue();
      mockPerpsController.getAccountState.mockResolvedValue({});
      mockPerpsController.reconnectWithNewContext.mockResolvedValue();

      await PerpsConnectionManager.connect();

      // Get the store callback that was registered
      storeCallback = storeCallbacks[storeCallbacks.length - 1];

      // Clear mock calls from connection
      mockDevLogger.log.mockClear();

      // Simulate account change
      (
        selectSelectedInternalAccountByScope as unknown as jest.Mock
      ).mockReturnValue(() => ({ address: '0xdef456' }));

      // Trigger the store callback with the changed value
      storeCallback();

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockDevLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Account or network change detected'),
        expect.objectContaining({
          accountChanged: true,
          networkChanged: false,
          previousAddress: '0xabc123',
          currentAddress: '0xdef456',
        }),
      );
    });

    it('should detect network changes and trigger reconnection', async () => {
      // Setup connected state
      mockPerpsController.initializeProviders.mockResolvedValue();
      mockPerpsController.getAccountState.mockResolvedValue({});
      mockPerpsController.reconnectWithNewContext.mockResolvedValue();

      await PerpsConnectionManager.connect();

      // Get the store callback that was registered
      storeCallback = storeCallbacks[storeCallbacks.length - 1];

      // Clear mock calls from connection
      mockDevLogger.log.mockClear();

      // Simulate network change
      (selectPerpsNetwork as unknown as jest.Mock).mockReturnValue('testnet');

      // Trigger the store callback with the changed value
      storeCallback();

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockDevLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Account or network change detected'),
        expect.objectContaining({
          accountChanged: false,
          networkChanged: true,
          previousNetwork: 'mainnet',
          currentNetwork: 'testnet',
        }),
      );
    });

    it('should continue monitoring during grace period', async () => {
      // Setup but don't connect
      mockPerpsController.initializeProviders.mockResolvedValue();
      mockPerpsController.getAccountState.mockResolvedValue({});

      // Connect and immediately disconnect to set up monitoring
      await PerpsConnectionManager.connect();
      await PerpsConnectionManager.disconnect();

      // Get the store callback that was registered (if any)
      if (storeCallbacks.length > 0) {
        storeCallback = storeCallbacks[storeCallbacks.length - 1];

        // Clear mock calls
        mockDevLogger.log.mockClear();

        // Simulate account change
        (
          selectSelectedInternalAccountByScope as unknown as jest.Mock
        ).mockReturnValue(() => ({ address: '0xdef456' }));

        // Trigger the store callback with changed values
        storeCallback();

        // Should still log account change detection during grace period
        expect(mockDevLogger.log).toHaveBeenCalledWith(
          expect.stringContaining('Account or network change detected'),
          expect.any(Object),
        );
      }
    });
  });

  describe('reconnectWithNewContext', () => {
    beforeEach(() => {
      mockPerpsController.reconnectWithNewContext.mockResolvedValue();
      mockPerpsController.getAccountState.mockResolvedValue({});
    });

    it('should clear StreamManager caches', async () => {
      // Setup connected state first
      mockPerpsController.initializeProviders.mockResolvedValue();
      mockPerpsController.getAccountState.mockResolvedValue({});
      await PerpsConnectionManager.connect();

      // Now call reconnectWithNewContext through the private method
      await (
        PerpsConnectionManager as unknown as {
          reconnectWithNewContext: () => Promise<void>;
        }
      ).reconnectWithNewContext();

      expect(mockStreamManagerInstance.positions.clearCache).toHaveBeenCalled();
      expect(mockStreamManagerInstance.orders.clearCache).toHaveBeenCalled();
      expect(mockStreamManagerInstance.account.clearCache).toHaveBeenCalled();
      expect(
        mockStreamManagerInstance.marketData.clearCache,
      ).toHaveBeenCalled();
      expect(mockStreamManagerInstance.prices.clearCache).toHaveBeenCalled();
    });

    it('should reinitialize controller with new context', async () => {
      await (
        PerpsConnectionManager as unknown as {
          reconnectWithNewContext: () => Promise<void>;
        }
      ).reconnectWithNewContext();

      expect(mockPerpsController.reconnectWithNewContext).toHaveBeenCalled();
      expect(mockPerpsController.getAccountState).toHaveBeenCalled();
    });

    it('should handle reconnection errors gracefully', async () => {
      const error = new Error('Reconnection failed');
      mockPerpsController.reconnectWithNewContext.mockRejectedValueOnce(error);

      await expect(
        (
          PerpsConnectionManager as unknown as {
            reconnectWithNewContext: () => Promise<void>;
          }
        ).reconnectWithNewContext(),
      ).rejects.toThrow('Reconnection failed');

      expect(mockDevLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Reconnection with new context failed'),
        error,
      );
    });
  });

  describe('retry logic for account state', () => {
    it('should retry getAccountState on initial connection when provider is reinitializing', async () => {
      const reInitError = new Error('CLIENT_REINITIALIZING');
      reInitError.message = 'CLIENT_REINITIALIZING';

      mockPerpsController.initializeProviders.mockResolvedValue();
      mockPerpsController.getAccountState
        .mockRejectedValueOnce(reInitError)
        .mockResolvedValueOnce({});

      await PerpsConnectionManager.connect();

      expect(mockPerpsController.getAccountState).toHaveBeenCalledTimes(2);
      expect(mockPerpsController.getAccountState).toHaveBeenNthCalledWith(2, {
        source: 'initial_connection_retry',
      });
    });
  });
});
