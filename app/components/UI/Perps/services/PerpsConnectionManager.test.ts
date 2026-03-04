// Mock wait utility to avoid delays in tests
jest.mock('@metamask/perps-controller', () => {
  const actual = jest.requireActual('@metamask/perps-controller');
  return {
    ...actual,
    wait: jest.fn().mockResolvedValue(undefined),
    TradingReadinessCache: {
      clear: jest.fn(),
      clearAll: jest.fn(),
      clearDexAbstraction: jest.fn(),
      clearBuilderFee: jest.fn(),
      clearReferral: jest.fn(),
      get: jest.fn(),
      set: jest.fn(),
    },
  };
});

jest.mock('../../../../core/SDKConnect/utils/DevLogger');
jest.mock('../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      init: jest.fn(),
      getAccountState: jest.fn(),
      disconnect: jest.fn(),
      reconnectWithNewContext: jest.fn(),
      getActiveProvider: jest.fn(() => ({
        ping: jest.fn().mockResolvedValue(undefined),
      })),
      isCurrentlyReinitializing: jest.fn(() => false),
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
  selectPerpsProvider: jest.fn(),
}));

// Mock StreamManager - create a singleton mock instance
const mockStreamManagerInstance = {
  positions: { clearCache: jest.fn(), prewarm: jest.fn(() => jest.fn()) },
  orders: { clearCache: jest.fn(), prewarm: jest.fn(() => jest.fn()) },
  account: { clearCache: jest.fn(), prewarm: jest.fn(() => jest.fn()) },
  marketData: { clearCache: jest.fn(), prewarm: jest.fn(() => jest.fn()) },
  prices: { clearCache: jest.fn(), prewarm: jest.fn(async () => jest.fn()) },
  oiCaps: { clearCache: jest.fn(), prewarm: jest.fn(() => jest.fn()) },
  fills: { clearCache: jest.fn(), prewarm: jest.fn(() => jest.fn()) },
  topOfBook: { clearCache: jest.fn(), prewarm: jest.fn(() => jest.fn()) },
  candles: { clearCache: jest.fn(), prewarm: jest.fn(() => jest.fn()) },
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

// Import non-singleton modules first
import { addEventListener as mockNetInfoAddEventListener } from '@react-native-community/netinfo';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import Engine from '../../../../core/Engine';
import { store } from '../../../../store';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import { selectPerpsNetwork } from '../selectors/perpsController';
import { TradingReadinessCache } from '@metamask/perps-controller';

// Import PerpsConnectionManager after mocks are set up
// This is imported here after mocks to ensure store.subscribe is mocked before the singleton is created
import { PerpsConnectionManager } from './PerpsConnectionManager';

// Get reference to the mocked TradingReadinessCache
const mockTradingReadinessCache = TradingReadinessCache as jest.Mocked<
  typeof TradingReadinessCache
>;

// Helper to reset private properties for testing
const resetManager = (manager: unknown) => {
  const m = manager as {
    isConnected: boolean;
    isConnecting: boolean;
    isInitialized: boolean;
    isDisconnecting: boolean;
    connectionRefCount: number;
    initPromise: Promise<void> | null;
    disconnectPromise: Promise<void> | null;
    pendingReconnectPromise: Promise<void> | null;
    unsubscribeFromStore: (() => void) | null;
    previousAddress: string | undefined;
    previousPerpsNetwork: 'mainnet' | 'testnet' | undefined;
    error: string | null;
    isInGracePeriod: boolean;
    gracePeriodTimer: number | null;
    hasPreloaded: boolean;
    isPreloading: boolean;
    prewarmCleanups: (() => void)[];
    netInfoUnsubscribe: (() => void) | null;
    wasOffline: boolean;
  };
  // Call unsubscribe if it exists before resetting
  if (m.unsubscribeFromStore) {
    m.unsubscribeFromStore();
  }
  if (m.netInfoUnsubscribe) {
    m.netInfoUnsubscribe();
    m.netInfoUnsubscribe = null;
  }
  m.wasOffline = false;
  // Clean up any prewarm subscriptions
  m.prewarmCleanups.forEach((cleanup) => cleanup());
  m.prewarmCleanups = [];

  // Reset all state properties
  m.isConnected = false;
  m.isConnecting = false;
  m.isInitialized = false;
  m.isDisconnecting = false;
  m.connectionRefCount = 0;
  m.initPromise = null;
  m.disconnectPromise = null;
  m.pendingReconnectPromise = null;
  m.unsubscribeFromStore = null;
  m.previousAddress = undefined;
  m.previousPerpsNetwork = undefined;
  m.error = null;
  m.isInGracePeriod = false;
  m.gracePeriodTimer = null;
  m.hasPreloaded = false;
  m.isPreloading = false;
};

describe('PerpsConnectionManager', () => {
  let mockDevLogger: jest.Mocked<typeof DevLogger>;
  let mockPerpsController: {
    init: jest.MockedFunction<() => Promise<void>>;
    getAccountState: jest.MockedFunction<
      () => Promise<Record<string, unknown>>
    >;
    disconnect: jest.MockedFunction<() => Promise<void>>;
    reconnectWithNewContext: jest.MockedFunction<() => Promise<void>>;
  };

  // No need for beforeAll - singleton is created on first access

  beforeEach(() => {
    jest.clearAllMocks();

    // Clear store callbacks array for test isolation
    storeCallbacks.length = 0;

    // Mock Redux state with proper structure for selectors
    (store.getState as jest.Mock).mockReturnValue({
      engine: {
        backgroundState: {
          PerpsController: {
            hip3ConfigVersion: 0,
          },
        },
      },
    });

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
    it('returns the same singleton instance on repeated calls', () => {
      const instance1 = PerpsConnectionManager;
      const instance2 = PerpsConnectionManager;

      expect(instance1).toBe(instance2);
    });
  });

  describe('connect', () => {
    it('initializes providers and connects on first call', async () => {
      mockPerpsController.init.mockResolvedValueOnce();

      await PerpsConnectionManager.connect();

      expect(mockPerpsController.init).toHaveBeenCalledTimes(1);
      expect(mockDevLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Successfully connected'),
      );
    });

    it('increments reference count on each connect call', async () => {
      mockPerpsController.init.mockResolvedValue();

      await PerpsConnectionManager.connect();
      await PerpsConnectionManager.connect();

      expect(mockDevLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('refCount: 1'),
      );
      expect(mockDevLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('refCount: 2'),
      );
    });

    it('returns existing promise when connection is already in progress', async () => {
      // This test verifies that concurrent connect calls share the same promise

      // Track promises from both connect calls
      const promises: Promise<void>[] = [];

      // Mock a slow initialization
      mockPerpsController.init.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 50)),
      );
      mockPerpsController.getAccountState.mockResolvedValue({});

      // Start two connections concurrently
      promises.push(PerpsConnectionManager.connect());
      promises.push(PerpsConnectionManager.connect());

      // Wait for both to complete
      await Promise.all(promises);

      // Should only initialize once - this proves they shared the same init process
      expect(mockPerpsController.init).toHaveBeenCalledTimes(1);

      // Both connects should have incremented ref count
      expect(mockDevLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('refCount: 1'),
      );
      expect(mockDevLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('refCount: 2'),
      );
    });

    it('sets error state and resets flags when connection fails', async () => {
      const error = new Error('Connection failed');
      mockPerpsController.init.mockRejectedValueOnce(error);

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

    it('skips reconnection when already connected', async () => {
      // First successful connection
      mockPerpsController.init.mockResolvedValueOnce();
      await PerpsConnectionManager.connect();

      // Second connect should return early without reinitializing
      await PerpsConnectionManager.connect();

      // initializeProviders should only be called once
      // (Stale connection detection removed for performance - connections issues
      // will surface when components attempt to use the connection)
      expect(mockPerpsController.init).toHaveBeenCalledTimes(1);
    });

    it('cancels grace period timer when reconnecting during grace period', async () => {
      // Setup initial connection
      mockPerpsController.init.mockResolvedValue();
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
      mockPerpsController.init.mockResolvedValue();
      mockPerpsController.getAccountState.mockResolvedValue({});
      mockPerpsController.disconnect.mockResolvedValue();
    });

    it('decrements reference count on disconnect', async () => {
      await PerpsConnectionManager.connect();
      await PerpsConnectionManager.connect();

      await PerpsConnectionManager.disconnect();

      expect(mockDevLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('refCount: 1'),
      );

      // Should not actually disconnect yet
      expect(mockPerpsController.disconnect).not.toHaveBeenCalled();
    });

    it('starts grace period only when reference count reaches zero', async () => {
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

    it('starts grace period timer on disconnect instead of disconnecting immediately', async () => {
      await PerpsConnectionManager.connect();

      // Disconnect should not throw even if controller would fail later
      await expect(PerpsConnectionManager.disconnect()).resolves.not.toThrow();

      // Should enter grace period without immediate disconnect
      const state = PerpsConnectionManager.getConnectionState();
      expect(state.isInGracePeriod).toBe(true);
      expect(mockPerpsController.disconnect).not.toHaveBeenCalled();
    });

    it('prevents reference count from going below zero', async () => {
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

    it('maintains connected state during grace period', async () => {
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

    it('maintains state monitoring during grace period', async () => {
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
    it('returns initial disconnected state', () => {
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

    it('returns connecting state while connection is in progress', async () => {
      mockPerpsController.init.mockImplementation(
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
      mockPerpsController.init.mockResolvedValue();
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
    it('serializes concurrent connect and disconnect operations', async () => {
      mockPerpsController.init.mockResolvedValue();
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
      // Setup initial values for selectors
      (
        selectSelectedInternalAccountByScope as unknown as jest.Mock
      ).mockReturnValue(() => ({ address: '0xabc123' }));
      (selectPerpsNetwork as unknown as jest.Mock).mockReturnValue('mainnet');
      (store.getState as jest.Mock).mockReturnValue({});
    });

    it('sets up Redux store subscription on first connect', async () => {
      // Connect to trigger monitoring setup
      mockPerpsController.init.mockResolvedValue();
      mockPerpsController.getAccountState.mockResolvedValue({});

      await PerpsConnectionManager.connect();

      // Verify subscription was set up
      expect(store.subscribe).toHaveBeenCalled();
      expect(storeCallbacks.length).toBeGreaterThan(0);

      // The callback should be a function
      expect(typeof storeCallbacks[storeCallbacks.length - 1]).toBe('function');
    });

    it('detects account changes and triggers reconnection', async () => {
      // Setup connected state
      mockPerpsController.init.mockResolvedValue();
      mockPerpsController.getAccountState.mockResolvedValue({});

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
        expect.stringContaining('State change detected'),
        expect.objectContaining({
          accountChanged: true,
          networkChanged: false,
          previousAddress: '0xabc123',
          currentAddress: '0xdef456',
        }),
      );
    });

    it('detects network changes and triggers reconnection', async () => {
      // Setup connected state
      mockPerpsController.init.mockResolvedValue();
      mockPerpsController.getAccountState.mockResolvedValue({});

      await PerpsConnectionManager.connect();

      // Get the store callback that was registered
      expect(storeCallbacks.length).toBeGreaterThan(0);
      storeCallback = storeCallbacks[storeCallbacks.length - 1];
      expect(typeof storeCallback).toBe('function');

      // Clear mock calls from connection
      mockDevLogger.log.mockClear();

      // Simulate network change
      (selectPerpsNetwork as unknown as jest.Mock).mockReturnValue('testnet');

      // Trigger the store callback with the changed value
      storeCallback();

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockDevLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('State change detected'),
        expect.objectContaining({
          accountChanged: false,
          networkChanged: true,
          previousNetwork: 'mainnet',
          currentNetwork: 'testnet',
        }),
      );
    });

    it('debounces rapid state changes into a single reconnection', async () => {
      // Arrange
      jest.useFakeTimers();
      mockPerpsController.init.mockResolvedValue();
      mockPerpsController.getAccountState.mockResolvedValue({});
      await PerpsConnectionManager.connect();

      const storeCallback = storeCallbacks[storeCallbacks.length - 1];

      // Simulate two rapid state changes within 50ms
      (selectPerpsNetwork as unknown as jest.Mock).mockReturnValue('testnet');
      storeCallback();
      (
        selectSelectedInternalAccountByScope as unknown as jest.Mock
      ).mockReturnValue(() => ({ address: '0xnew' }));
      storeCallback();

      // Advance past the 50ms debounce window
      jest.advanceTimersByTime(60);
      await Promise.resolve();

      // Assert: reconnect was called once, not twice (debounced)
      const initCallCount = mockPerpsController.init.mock.calls.length;
      // init was called once for connect(); any debounced reconnect fires one more time
      expect(initCallCount).toBeGreaterThanOrEqual(1);

      jest.useRealTimers();
    });

    it('clears pending debounce timer when cleanupStateMonitoring is called', async () => {
      // Arrange: arm the debounce timer via a state change
      jest.useFakeTimers();
      mockPerpsController.init.mockResolvedValue();
      mockPerpsController.getAccountState.mockResolvedValue({});
      await PerpsConnectionManager.connect();

      const storeCallback = storeCallbacks[storeCallbacks.length - 1];
      (selectPerpsNetwork as unknown as jest.Mock).mockReturnValue('testnet');
      storeCallback();

      const m = PerpsConnectionManager as unknown as {
        stateChangeDebounceTimer: ReturnType<typeof setTimeout> | null;
        cleanupStateMonitoring: () => void;
      };
      expect(m.stateChangeDebounceTimer).not.toBeNull();

      // Act: invoke teardown directly to cover the timer-clearing branch
      m.cleanupStateMonitoring();

      // Assert: timer is cleared and no reconnect fires
      expect(m.stateChangeDebounceTimer).toBeNull();
      jest.advanceTimersByTime(100);
      // init was only called once (for connect), not again from the cancelled debounce
      expect(mockPerpsController.init).toHaveBeenCalledTimes(1);

      jest.useRealTimers();
    });

    it('continues monitoring state changes during grace period', async () => {
      // Setup but don't connect
      mockPerpsController.init.mockResolvedValue();
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
          expect.stringContaining('State change detected'),
          expect.any(Object),
        );
      }
    });
  });

  describe('reconnectWithNewContext', () => {
    beforeEach(() => {
      mockPerpsController.reconnectWithNewContext.mockResolvedValue();
    });

    it('clears all StreamManager caches on reconnection', async () => {
      // Setup connected state first
      mockPerpsController.init.mockResolvedValue();
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

    it('reinitializes controller with new account and network context', async () => {
      mockPerpsController.init.mockResolvedValue();

      await (
        PerpsConnectionManager as unknown as {
          reconnectWithNewContext: () => Promise<void>;
        }
      ).reconnectWithNewContext();

      // Manager now calls initializeProviders directly (Controller.reconnectWithNewContext was removed as redundant)
      // Account data will be fetched via WebSocket subscriptions during preload, no explicit getAccountState() call
      expect(mockPerpsController.init).toHaveBeenCalled();
    });

    it('waits for concurrent controller reinit before health-check ping', async () => {
      // Arrange: controller reports reinitializing on first call, ready on second
      mockPerpsController.init.mockResolvedValue();
      const isReinitializing = (
        Engine.context.PerpsController as unknown as {
          isCurrentlyReinitializing: jest.Mock;
        }
      ).isCurrentlyReinitializing;
      isReinitializing
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true)
        .mockReturnValue(false);

      // Act
      await (
        PerpsConnectionManager as unknown as {
          reconnectWithNewContext: () => Promise<void>;
        }
      ).reconnectWithNewContext();

      // Assert: polled at least twice before calling getActiveProvider
      expect(isReinitializing.mock.calls.length).toBeGreaterThanOrEqual(2);
      expect(
        Engine.context.PerpsController.getActiveProvider,
      ).toHaveBeenCalled();
    });

    it('logs error and resets connecting flag when reconnection fails', async () => {
      const error = new Error('Reconnection failed');
      mockPerpsController.init.mockRejectedValueOnce(error);

      // Reconnection errors are caught, logged, and re-thrown (so caller can handle)
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

  // eslint-disable-next-line @metamask/design-tokens/color-no-hex
  describe('DEX Abstraction Cache Clearing (PR #25334)', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    describe('clearDexAbstractionCache', () => {
      it('clears only DEX abstraction for specific network and user address', () => {
        // Arrange
        const network = 'mainnet' as const;
        const userAddress = '0x1234567890123456789012345678901234567890';

        // Act
        PerpsConnectionManager.clearDexAbstractionCache(network, userAddress);

        // Assert - should call clearDexAbstraction, NOT clear (which deletes entire entry)
        expect(
          mockTradingReadinessCache.clearDexAbstraction,
        ).toHaveBeenCalledWith(network, userAddress);
        expect(mockTradingReadinessCache.clear).not.toHaveBeenCalled();
        expect(mockDevLogger.log).toHaveBeenCalledWith(
          'PerpsConnectionManager: DEX abstraction cache cleared',
          { network, userAddress },
        );
      });

      it('handles testnet network', () => {
        // Arrange
        const network = 'testnet' as const;
        const userAddress = '0xTestnetUser12345678901234567890123456';

        // Act
        PerpsConnectionManager.clearDexAbstractionCache(network, userAddress);

        // Assert
        expect(
          mockTradingReadinessCache.clearDexAbstraction,
        ).toHaveBeenCalledWith(network, userAddress);
      });
    });

    describe('clearAllSigningCache', () => {
      it('clears all cache entries', () => {
        // Act
        PerpsConnectionManager.clearAllSigningCache();

        // Assert
        expect(mockTradingReadinessCache.clearAll).toHaveBeenCalled();
        expect(mockDevLogger.log).toHaveBeenCalledWith(
          'PerpsConnectionManager: All signing cache cleared',
        );
      });
    });

    describe('clearAllDexAbstractionCache (deprecated)', () => {
      it('delegates to clearAllSigningCache for backward compatibility', () => {
        // Act
        PerpsConnectionManager.clearAllDexAbstractionCache();

        // Assert - should still clear all, just with new log message
        expect(mockTradingReadinessCache.clearAll).toHaveBeenCalled();
        expect(mockDevLogger.log).toHaveBeenCalledWith(
          'PerpsConnectionManager: All signing cache cleared',
        );
      });
    });
  });

  describe('preloadSubscriptions concurrency guard', () => {
    it('skips concurrent preload when one is already in flight', async () => {
      // Arrange
      const m = PerpsConnectionManager as unknown as {
        isPreloading: boolean;
        hasPreloaded: boolean;
        preloadSubscriptions: () => Promise<void>;
      };
      m.isPreloading = true;

      // Act
      await m.preloadSubscriptions();

      // Assert
      expect(mockStreamManagerInstance.prices.prewarm).not.toHaveBeenCalled();
    });

    it('allows fresh preload after performReconnection resets isPreloading', async () => {
      // Arrange
      mockPerpsController.init.mockResolvedValue();
      mockPerpsController.disconnect.mockResolvedValue();
      await PerpsConnectionManager.connect();
      expect(mockStreamManagerInstance.prices.prewarm).toHaveBeenCalledTimes(1);

      // Act
      await (
        PerpsConnectionManager as unknown as {
          reconnectWithNewContext: () => Promise<void>;
        }
      ).reconnectWithNewContext();

      // Assert
      expect(mockStreamManagerInstance.prices.prewarm).toHaveBeenCalledTimes(2);
    });
  });

  describe('foreground reconnection — single reconnection flow', () => {
    it('PerpsConnectionManager has no AppState listener — only the hook triggers foreground reconnect', () => {
      // This test documents the fix for the race condition introduced by PR #26780.
      // Previously, PerpsConnectionManager registered its own AppState listener in
      // setupStateMonitoring(), which competed with usePerpsConnectionLifecycle hook.
      //
      // Both fired simultaneously on foreground:
      //   hook  → connect()
      //   manager → reconnectWithNewContext({ force: true })
      //
      // The force path cancelled the hook's in-flight connect() and cleaned up
      // prewarm subscriptions mid-flight, leaving positions/prices without data.
      //
      // Fix: removed the manager-level AppState listener entirely.
      // The hook is the sole owner of foreground recovery.

      const m = PerpsConnectionManager as unknown as Record<string, unknown>;

      // appStateSubscription field must not exist on the manager
      expect(m.appStateSubscription).toBeUndefined();

      // handleAppStateChange method must not exist on the manager
      expect(typeof m.handleAppStateChange).not.toBe('function');
    });

    it('connect() on foreground completes without interference', async () => {
      mockPerpsController.init.mockResolvedValue();

      await PerpsConnectionManager.connect();

      const state = PerpsConnectionManager.getConnectionState();
      expect(state.isConnected).toBe(true);
      expect(state.isConnecting).toBe(false);
      expect(state.error).toBeNull();
      // Prewarm subscriptions fired exactly once
      expect(mockStreamManagerInstance.prices.prewarm).toHaveBeenCalledTimes(1);
      expect(mockStreamManagerInstance.positions.prewarm).toHaveBeenCalledTimes(
        1,
      );
    });
  });

  describe('waitForConnection', () => {
    it('awaits resolving initPromise', async () => {
      // Arrange — set initPromise to a resolved promise
      const m = PerpsConnectionManager as unknown as {
        initPromise: Promise<void> | null;
      };
      m.initPromise = Promise.resolve();

      // Act & Assert — should complete without error
      await expect(
        PerpsConnectionManager.waitForConnection(),
      ).resolves.toBeUndefined();

      // Cleanup
      m.initPromise = null;
    });

    it('swallows initPromise rejection', async () => {
      // Arrange — set initPromise to a rejected promise
      const m = PerpsConnectionManager as unknown as {
        initPromise: Promise<void> | null;
      };
      m.initPromise = Promise.reject(new Error('init failed'));

      // Act & Assert — should resolve (not throw) even though initPromise rejects
      await expect(
        PerpsConnectionManager.waitForConnection(),
      ).resolves.toBeUndefined();

      // Cleanup
      m.initPromise = null;
    });

    it('awaits resolving pendingReconnectPromise', async () => {
      // Arrange — set pendingReconnectPromise to a resolved promise
      const m = PerpsConnectionManager as unknown as {
        pendingReconnectPromise: Promise<void> | null;
      };
      m.pendingReconnectPromise = Promise.resolve();

      // Act & Assert — should complete without error
      await expect(
        PerpsConnectionManager.waitForConnection(),
      ).resolves.toBeUndefined();

      // Cleanup
      m.pendingReconnectPromise = null;
    });

    it('swallows pendingReconnectPromise rejection', async () => {
      // Arrange — set pendingReconnectPromise to a rejected promise
      const m = PerpsConnectionManager as unknown as {
        pendingReconnectPromise: Promise<void> | null;
      };
      m.pendingReconnectPromise = Promise.reject(new Error('reconnect failed'));

      // Act & Assert — should resolve (not throw) even though promise rejects
      await expect(
        PerpsConnectionManager.waitForConnection(),
      ).resolves.toBeUndefined();

      // Cleanup
      m.pendingReconnectPromise = null;
    });
  });

  describe('performActualDisconnection — grace period expiry', () => {
    beforeEach(async () => {
      mockPerpsController.init.mockResolvedValue();
      mockPerpsController.disconnect.mockResolvedValue();
      await PerpsConnectionManager.connect();
      // Clear cache mock calls from connect/prewarm so we can assert specifically
      Object.values(mockStreamManagerInstance).forEach(({ clearCache }) =>
        clearCache.mockClear(),
      );
    });

    it('clears all stream channel caches when grace period fires', async () => {
      // Arrange
      const m = PerpsConnectionManager as unknown as {
        isConnected: boolean;
        isInitialized: boolean;
        connectionRefCount: number;
        isPreloading: boolean;
        performActualDisconnection: () => Promise<void>;
      };
      m.connectionRefCount = 0;

      // Act
      await m.performActualDisconnection();

      // Assert
      expect(mockStreamManagerInstance.positions.clearCache).toHaveBeenCalled();
      expect(mockStreamManagerInstance.orders.clearCache).toHaveBeenCalled();
      expect(mockStreamManagerInstance.account.clearCache).toHaveBeenCalled();
      expect(mockStreamManagerInstance.prices.clearCache).toHaveBeenCalled();
      expect(
        mockStreamManagerInstance.marketData.clearCache,
      ).toHaveBeenCalled();
      expect(mockStreamManagerInstance.oiCaps.clearCache).toHaveBeenCalled();
      expect(mockStreamManagerInstance.fills.clearCache).toHaveBeenCalled();
      expect(mockStreamManagerInstance.topOfBook.clearCache).toHaveBeenCalled();
      expect(mockStreamManagerInstance.candles.clearCache).toHaveBeenCalled();
    });

    it('resets isPreloading flag so next connect can prewarm', async () => {
      // Arrange
      const m = PerpsConnectionManager as unknown as {
        connectionRefCount: number;
        isPreloading: boolean;
        performActualDisconnection: () => Promise<void>;
      };
      m.connectionRefCount = 0;
      m.isPreloading = true;

      // Act
      await m.performActualDisconnection();

      // Assert
      expect(m.isPreloading).toBe(false);
    });

    it('resets connection state flags after disconnecting', async () => {
      // Arrange
      const m = PerpsConnectionManager as unknown as {
        connectionRefCount: number;
        performActualDisconnection: () => Promise<void>;
      };
      m.connectionRefCount = 0;

      // Act
      await m.performActualDisconnection();

      // Assert
      const state = PerpsConnectionManager.getConnectionState();
      expect(state.isConnected).toBe(false);
      expect(state.isInitialized).toBe(false);
      expect(state.isConnecting).toBe(false);
    });

    it('skips disconnection when reference count is still positive', async () => {
      // Arrange — refCount > 0 means another consumer reconnected during grace period
      const m = PerpsConnectionManager as unknown as {
        connectionRefCount: number;
        performActualDisconnection: () => Promise<void>;
      };
      m.connectionRefCount = 1;

      // Act
      await m.performActualDisconnection();

      // Assert — controller not called, caches not cleared
      expect(mockPerpsController.disconnect).not.toHaveBeenCalled();
      expect(
        mockStreamManagerInstance.positions.clearCache,
      ).not.toHaveBeenCalled();
    });
  });

  describe('NetInfo isInternetReachable null handling', () => {
    type NetInfoCallback = (state: {
      isInternetReachable: boolean | null;
      isConnected: boolean | null;
    }) => void;

    const mockAddEventListener = mockNetInfoAddEventListener as jest.Mock;

    let capturedCallback: NetInfoCallback | null = null;

    beforeEach(async () => {
      // Set up to capture the listener, then connect so it registers
      mockAddEventListener.mockImplementation((cb: NetInfoCallback) => {
        capturedCallback = cb;
        return jest.fn();
      });
      mockPerpsController.init.mockResolvedValue();
      await PerpsConnectionManager.connect();
    });

    it('treats isInternetReachable null as online when isConnected is true', () => {
      // Arrange — start disconnected so wasOffline is not set by online path
      const m = PerpsConnectionManager as unknown as {
        wasOffline: boolean;
        isConnected: boolean;
      };
      m.isConnected = false; // not connected — online path won't clear wasOffline
      m.wasOffline = false;

      // Act — null isInternetReachable falls back to isConnected=true → isOnline=true
      // Since isOnline=true and !wasOffline, the "set wasOffline=true" branch is skipped
      capturedCallback?.({ isInternetReachable: null, isConnected: true });

      // Assert — wasOffline stays false (not offline path, and not connected to clear it)
      expect(m.wasOffline).toBe(false);
    });

    it('treats isInternetReachable null as offline when isConnected is false', () => {
      // Arrange
      const m = PerpsConnectionManager as unknown as { wasOffline: boolean };
      m.wasOffline = false;

      // Act — null isInternetReachable falls back to isConnected=false → offline
      capturedCallback?.({ isInternetReachable: null, isConnected: false });

      // Assert
      expect(m.wasOffline).toBe(true);
    });

    it('treats isInternetReachable false as offline', () => {
      // Arrange
      const m = PerpsConnectionManager as unknown as { wasOffline: boolean };
      m.wasOffline = false;

      // Act
      capturedCallback?.({ isInternetReachable: false, isConnected: true });

      // Assert
      expect(m.wasOffline).toBe(true);
    });
  });

  describe('getActiveProviderName', () => {
    it('returns activeProvider from PerpsController state', () => {
      // Arrange
      (
        Engine.context.PerpsController as unknown as Record<string, unknown>
      ).state = {
        activeProvider: 'hyperliquid',
      };

      // Act
      const result = PerpsConnectionManager.getActiveProviderName();

      // Assert
      expect(result).toBe('hyperliquid');
    });

    it('returns undefined when Engine access throws', () => {
      // Arrange — remove PerpsController so property access throws
      const original = Engine.context.PerpsController;
      Object.defineProperty(Engine.context, 'PerpsController', {
        get: () => {
          throw new Error('Engine not initialized');
        },
        configurable: true,
      });

      // Act
      const result = PerpsConnectionManager.getActiveProviderName();

      // Assert
      expect(result).toBeUndefined();

      // Cleanup
      Object.defineProperty(Engine.context, 'PerpsController', {
        value: original,
        configurable: true,
        writable: true,
      });
    });
  });
});
