import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import Engine from '../../../../core/Engine';
import { PerpsConnectionManager } from './PerpsConnectionManager';

// Mock dependencies
jest.mock('../../../../core/SDKConnect/utils/DevLogger');
jest.mock('../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      initializeProviders: jest.fn(),
      getAccountState: jest.fn(),
      disconnect: jest.fn(),
    },
  },
}));

// Helper to reset private properties for testing
const resetManager = (manager: unknown) => {
  const m = manager as {
    isConnected: boolean;
    isConnecting: boolean;
    isInitialized: boolean;
    connectionRefCount: number;
    initPromise: Promise<void> | null;
  };
  m.isConnected = false;
  m.isConnecting = false;
  m.isInitialized = false;
  m.connectionRefCount = 0;
  m.initPromise = null;
};

describe('PerpsConnectionManager', () => {
  let mockDevLogger: jest.Mocked<typeof DevLogger>;
  let mockPerpsController: {
    initializeProviders: jest.MockedFunction<() => Promise<void>>;
    getAccountState: jest.MockedFunction<
      () => Promise<Record<string, unknown>>
    >;
    disconnect: jest.MockedFunction<() => Promise<void>>;
  };

  beforeEach(() => {
    jest.clearAllMocks();

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

      expect(mockDevLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Stale connection detected'),
      );
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

    it('should only disconnect when reference count reaches zero', async () => {
      await PerpsConnectionManager.connect();
      await PerpsConnectionManager.connect();

      await PerpsConnectionManager.disconnect();
      expect(mockPerpsController.disconnect).not.toHaveBeenCalled();

      await PerpsConnectionManager.disconnect();
      expect(mockPerpsController.disconnect).toHaveBeenCalledTimes(1);
    });

    it('should handle disconnect errors gracefully', async () => {
      const error = new Error('Disconnect failed');
      mockPerpsController.disconnect.mockRejectedValueOnce(error);

      await PerpsConnectionManager.connect();
      await expect(PerpsConnectionManager.disconnect()).resolves.not.toThrow();

      expect(mockDevLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Disconnection error'),
        error,
      );
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

    it('should reset connection state on disconnect', async () => {
      await PerpsConnectionManager.connect();

      const connectedState = PerpsConnectionManager.getConnectionState();
      expect(connectedState.isConnected).toBe(true);
      expect(connectedState.isInitialized).toBe(true);

      await PerpsConnectionManager.disconnect();

      const disconnectedState = PerpsConnectionManager.getConnectionState();
      expect(disconnectedState.isConnected).toBe(false);
      expect(disconnectedState.isInitialized).toBe(false);
      expect(disconnectedState.isConnecting).toBe(false);
    });
  });

  describe('getConnectionState', () => {
    it('should return initial state', () => {
      const state = PerpsConnectionManager.getConnectionState();

      expect(state).toEqual({
        isConnected: false,
        isConnecting: false,
        isInitialized: false,
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

      // Should disconnect when ref count reaches 0
      expect(mockPerpsController.disconnect).toHaveBeenCalledTimes(1);
    });
  });
});
