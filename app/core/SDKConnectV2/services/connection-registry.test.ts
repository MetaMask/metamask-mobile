import { AppState, AppStateStatus } from 'react-native';
import { ConnectionRegistry } from './connection-registry';
import { HostApplicationAdapter } from '../adapters/host-application-adapter';
import { ConnectionStore } from '../store/connection-store';
import { KeyManager } from './key-manager';
import { Connection } from './connection';
import { ConnectionRequest } from '../types/connection-request';

jest.mock('../adapters/host-application-adapter');
jest.mock('../store/connection-store');
jest.mock('./key-manager');
jest.mock('./connection');
jest.mock('react-native');
jest.mock('@sentry/react-native');
jest.mock('../../Permissions');

// A valid, sample connection request payload for use in tests
const mockConnectionRequest: ConnectionRequest = {
  sessionRequest: {
    id: 'test-conn-id',
    publicKeyB64: 'AoBDLWxRbJNe8yUv5bmmoVnNo8DCilzbFz/nWD+RKC2V',
    channel: 'websocket-channel-id',
    mode: 'trusted',
    expiresAt: 1757410033264,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any,
  metadata: {
    dapp: {
      name: 'Test DApp',
      url: 'https://test.dapp',
    },
    sdk: {
      version: '2.0.0',
      platform: 'JavaScript',
    },
  },
};

// A valid deeplink URL containing the encoded connection request
const validDeeplink = `metamask://connect/mwp?p=${encodeURIComponent(
  JSON.stringify(mockConnectionRequest),
)}`;

// Factory functions for creating mock objects
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createMockConnection = (id: string, overrides: any = {}) => ({
  id,
  metadata: {
    dapp: { name: `DApp ${id}`, url: `https://dapp-${id}.com` },
    sdk: { version: '2.0.0', platform: 'JavaScript' },
  },
  client: {
    reconnect: jest.fn().mockResolvedValue(undefined),
  },
  resume: jest.fn().mockResolvedValue(undefined),
  connect: jest.fn(),
  disconnect: jest.fn(),
  ...overrides,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createPersistedConnection = (id: string, overrides: any = {}) => ({
  id,
  metadata: {
    dapp: { name: `DApp ${id}`, url: `https://dapp-${id}.com` },
    sdk: { version: '2.0.0', platform: 'JavaScript' },
    ...overrides.metadata,
  },
});

describe('ConnectionRegistry', () => {
  let registry: ConnectionRegistry;
  let mockHostApp: jest.Mocked<HostApplicationAdapter>;
  let mockStore: jest.Mocked<ConnectionStore>;
  let mockKeyManager: jest.Mocked<KeyManager>;
  let mockConnection: jest.Mocked<Connection>;

  const RELAY_URL = 'wss://test-relay.example.com';

  beforeEach(() => {
    jest.clearAllMocks();

    mockHostApp =
      new HostApplicationAdapter() as jest.Mocked<HostApplicationAdapter>;
    mockStore = new ConnectionStore(
      'test-prefix',
    ) as jest.Mocked<ConnectionStore>;
    mockKeyManager = new KeyManager() as jest.Mocked<KeyManager>;

    mockStore.list = jest.fn().mockResolvedValue([]);
    mockStore.save = jest.fn().mockResolvedValue(undefined);
    mockStore.delete = jest.fn().mockResolvedValue(undefined);
    mockStore.get = jest.fn().mockResolvedValue(null);

    mockConnection = {
      id: mockConnectionRequest.sessionRequest.id,
      metadata: mockConnectionRequest.metadata,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      client: {} as any,
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      resume: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<Connection>;

    (Connection.create as jest.Mock).mockResolvedValue(mockConnection);
  });

  describe('handleConnectDeeplink', () => {
    it('should successfully handle the full connection happy path', async () => {
      // Given: a registry ready to handle connections
      registry = new ConnectionRegistry(
        RELAY_URL,
        mockKeyManager,
        mockHostApp,
        mockStore,
      );

      await registry.handleConnectDeeplink(validDeeplink);

      // UI loading state is properly managed
      expect(mockHostApp.showLoading).toHaveBeenCalledTimes(1);

      // Connection is created and established with correct parameters
      expect(Connection.create).toHaveBeenCalledWith(
        mockConnectionRequest,
        mockKeyManager,
        RELAY_URL,
      );
      expect(mockConnection.connect).toHaveBeenCalledWith(
        mockConnectionRequest.sessionRequest,
      );

      // Connection data is persisted to storage
      expect(mockStore.save).toHaveBeenCalledWith({
        id: mockConnection.id,
        metadata: mockConnection.metadata,
      });

      // UI is synchronized with the new connection
      expect(mockHostApp.syncConnectionList).toHaveBeenCalledWith([
        mockConnection,
      ]);
      expect(mockHostApp.hideLoading).toHaveBeenCalledTimes(1);
    });

    it('should handle invalid URL gracefully', async () => {
      // Given: a registry ready to handle connections
      registry = new ConnectionRegistry(
        RELAY_URL,
        mockKeyManager,
        mockHostApp,
        mockStore,
      );

      const invalidDeeplink = 'invalid-url';
      await registry.handleConnectDeeplink(invalidDeeplink);

      // Error alert is shown
      expect(mockHostApp.showAlert).toHaveBeenCalledWith(
        'Connection Error',
        'The connection request failed. Please try again.',
      );

      // Nothing else happens
      expect(mockHostApp.showLoading).not.toHaveBeenCalled();
      expect(Connection.create).not.toHaveBeenCalled();
      expect(mockStore.save).not.toHaveBeenCalled();
      expect(mockHostApp.syncConnectionList).not.toHaveBeenCalled();
      expect(mockHostApp.hideLoading).toHaveBeenCalledTimes(1);
    });

    it('should call hideLoading and not save anything if the URL is invalid', async () => {
      // Given: a registry ready to handle connections
      registry = new ConnectionRegistry(
        RELAY_URL,
        mockKeyManager,
        mockHostApp,
        mockStore,
      );

      const invalidDeeplink = 'metamask://connect/mwp?p=not-json';

      await registry.handleConnectDeeplink(invalidDeeplink);

      // Error alert is shown
      expect(mockHostApp.showAlert).toHaveBeenCalledWith(
        'Connection Error',
        'The connection request failed. Please try again.',
      );

      // Nothing else happens
      expect(mockHostApp.showLoading).not.toHaveBeenCalled();
      expect(Connection.create).not.toHaveBeenCalled();

      // No data is persisted or UI updates made for invalid requests
      expect(mockConnection.disconnect).not.toHaveBeenCalled();
      expect(mockStore.save).not.toHaveBeenCalled();
      expect(mockHostApp.syncConnectionList).not.toHaveBeenCalled();
      expect(mockHostApp.hideLoading).toHaveBeenCalledTimes(1);
    });

    it('should attempt to disconnect and hide loading if the connect method fails', async () => {
      // Given: a registry ready to handle connections
      registry = new ConnectionRegistry(
        RELAY_URL,
        mockKeyManager,
        mockHostApp,
        mockStore,
      );

      const connectionError = new Error('Connection failed');
      mockConnection.connect.mockRejectedValue(connectionError);

      const disconnectSpy = jest.spyOn(registry, 'disconnect');

      await registry.handleConnectDeeplink(validDeeplink);

      // Connection creation is attempted but fails during handshake
      expect(mockHostApp.showAlert).toHaveBeenCalledWith(
        'Connection Error',
        'The connection request failed. Please try again.',
      );

      // Nothing else happens
      expect(mockHostApp.showLoading).toHaveBeenCalledTimes(1);
      expect(Connection.create).toHaveBeenCalledTimes(1);
      expect(mockConnection.connect).toHaveBeenCalledTimes(1);

      // Failed connection is cleaned up properly
      expect(disconnectSpy).toHaveBeenCalledWith(mockConnection.id);
      expect(mockStore.delete).toHaveBeenCalledWith(mockConnection.id);
      expect(mockHostApp.syncConnectionList).toHaveBeenCalledWith([]);

      expect(mockHostApp.hideLoading).toHaveBeenCalledTimes(1);

      disconnectSpy.mockRestore();
    });
  });

  describe('disconnect', () => {
    it('should handle a non-existent connection', async () => {
      // Given: a registry ready to handle connections
      registry = new ConnectionRegistry(
        RELAY_URL,
        mockKeyManager,
        mockHostApp,
        mockStore,
      );

      await registry.disconnect('non-existent-id');

      // Gracefully handles cleanup for non-existent connections
      expect(mockStore.delete).toHaveBeenCalledWith('non-existent-id');
      expect(mockHostApp.syncConnectionList).toHaveBeenCalledWith([]);
    });

    it('should disconnect a session, delete it from the store, and update the UI', async () => {
      // Given: a registry with an established connection
      registry = new ConnectionRegistry(
        RELAY_URL,
        mockKeyManager,
        mockHostApp,
        mockStore,
      );

      await registry.handleConnectDeeplink(validDeeplink);

      jest.clearAllMocks();

      // When: disconnecting the connection
      await registry.disconnect(mockConnection.id);

      // Then: connection is properly terminated
      expect(mockConnection.disconnect).toHaveBeenCalledTimes(1);

      // Connection data is removed from storage
      expect(mockStore.delete).toHaveBeenCalledWith(mockConnection.id);

      // UI reflects the disconnection
      expect(mockHostApp.syncConnectionList).toHaveBeenCalledWith([]);
      expect(mockHostApp.syncConnectionList).toHaveBeenCalledTimes(1);
    });
  });

  describe('initialize', () => {
    it('should resume connections from store on startup', async () => {
      // Given: some persisted connections in the store
      const persistedConnections = [
        createPersistedConnection('conn-1'),
        createPersistedConnection('conn-2'),
      ];

      const mockConnection1 = createMockConnection('conn-1');
      const mockConnection2 = createMockConnection('conn-2');

      mockStore.list.mockResolvedValue(persistedConnections);
      (Connection.create as jest.Mock)
        .mockClear()
        .mockResolvedValueOnce(mockConnection1)
        .mockResolvedValueOnce(mockConnection2);

      // When: creating a new registry with persisted connections
      registry = new ConnectionRegistry(
        RELAY_URL,
        mockKeyManager,
        mockHostApp,
        mockStore,
      );

      // Wait for initialization
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Then: connections should be created and resumed
      expect(mockStore.list).toHaveBeenCalledTimes(1);
      expect(Connection.create).toHaveBeenCalledTimes(2);
      expect(mockConnection1.resume).toHaveBeenCalledTimes(1);
      expect(mockConnection2.resume).toHaveBeenCalledTimes(1);
    });

    it('should handle errors gracefully when some connections fail to resume', async () => {
      // Given: some connections where one will fail to resume
      const persistedConnections = [
        createPersistedConnection('conn-1'),
        createPersistedConnection('conn-2'),
        createPersistedConnection('conn-3'),
      ];

      const mockConnection1 = createMockConnection('conn-1');
      const mockConnection2 = createMockConnection('conn-2', {
        resume: jest.fn().mockRejectedValue(new Error('Network error')),
      });
      const mockConnection3 = createMockConnection('conn-3');

      // Clear any previous mock calls before setting up this test
      mockStore.list.mockClear();
      mockStore.list.mockResolvedValue(persistedConnections);
      (Connection.create as jest.Mock)
        .mockClear()
        .mockResolvedValueOnce(mockConnection1)
        .mockResolvedValueOnce(mockConnection2)
        .mockResolvedValueOnce(mockConnection3);

      // When: creating a new registry (which triggers initialize)
      // This should not throw even though conn-2 fails
      registry = new ConnectionRegistry(
        RELAY_URL,
        mockKeyManager,
        mockHostApp,
        mockStore,
      );

      // Wait for initialization
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Then: other connections should still be resumed successfully
      expect(mockConnection1.resume).toHaveBeenCalledTimes(1);
      expect(mockConnection2.resume).toHaveBeenCalledTimes(1); // Attempted
      expect(mockConnection3.resume).toHaveBeenCalledTimes(1);

      // Verify that the initialization completed without throwing
      expect(mockStore.list).toHaveBeenCalledTimes(1);
      expect(Connection.create).toHaveBeenCalledTimes(3);
    });
  });

  describe('setupAppStateListener', () => {
    it('should handle app state transitions correctly', async () => {
      // Given: capture the app state handler
      let appStateHandler: ((state: AppStateStatus) => void) | undefined;
      const mockAddEventListener = AppState.addEventListener as jest.Mock;
      mockAddEventListener.mockClear();
      mockAddEventListener.mockImplementation((event, handler) => {
        if (event === 'change') {
          appStateHandler = handler;
        }
      });

      // Set up some connections to verify reconnectAll behavior
      const mockConnection1 = createMockConnection('conn-1');
      const mockConnection2 = createMockConnection('conn-2');

      const persistedConnections = [
        createPersistedConnection('conn-1'),
        createPersistedConnection('conn-2'),
      ];

      mockStore.list.mockResolvedValue(persistedConnections);
      (Connection.create as jest.Mock)
        .mockClear()
        .mockResolvedValueOnce(mockConnection1)
        .mockResolvedValueOnce(mockConnection2);

      // When: creating a new registry with connections
      registry = new ConnectionRegistry(
        RELAY_URL,
        mockKeyManager,
        mockHostApp,
        mockStore,
      );
      if (!appStateHandler) {
        throw new Error('AppState handler was not set');
      }

      // Wait for initialization
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Clear reconnect mocks from initialization
      mockConnection1.client.reconnect.mockClear();
      mockConnection2.client.reconnect.mockClear();

      // Test 1: First 'active' event (cold start) should NOT trigger reconnect
      appStateHandler('active');
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockConnection1.client.reconnect).not.toHaveBeenCalled();
      expect(mockConnection2.client.reconnect).not.toHaveBeenCalled();

      // Test 2: Other app states should NOT trigger reconnect
      appStateHandler('background');
      appStateHandler('inactive');
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockConnection1.client.reconnect).not.toHaveBeenCalled();
      expect(mockConnection2.client.reconnect).not.toHaveBeenCalled();

      // Test 3: Second 'active' event (foreground) SHOULD trigger reconnect
      appStateHandler('active');
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockConnection1.client.reconnect).toHaveBeenCalledTimes(1);
      expect(mockConnection2.client.reconnect).toHaveBeenCalledTimes(1);
    });
  });

  describe('reconnectAll', () => {
    it('should reconnect all active connections', async () => {
      // Given: some active connections
      const mockConnection1 = createMockConnection('conn-1');
      const mockConnection2 = createMockConnection('conn-2');

      const persistedConnections = [
        createPersistedConnection('conn-1'),
        createPersistedConnection('conn-2'),
      ];

      mockStore.list.mockResolvedValue(persistedConnections);
      (Connection.create as jest.Mock)
        .mockClear()
        .mockResolvedValueOnce(mockConnection1)
        .mockResolvedValueOnce(mockConnection2);

      // Create registry with connections and let it initialize
      registry = new ConnectionRegistry(
        RELAY_URL,
        mockKeyManager,
        mockHostApp,
        mockStore,
      );

      await new Promise((resolve) => setTimeout(resolve, 0));

      // Clear mocks from initialization
      mockConnection1.client.reconnect.mockClear();
      mockConnection2.client.reconnect.mockClear();

      // When: calling reconnectAll
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (registry as any).reconnectAll();

      // Then: all connections should be reconnected
      expect(mockConnection1.client.reconnect).toHaveBeenCalledTimes(1);
      expect(mockConnection2.client.reconnect).toHaveBeenCalledTimes(1);
    });

    it('should handle errors gracefully when some connections fail to reconnect', async () => {
      // Given: some connections where one will fail to reconnect
      const mockConnection1 = createMockConnection('conn-1');
      const mockConnection2 = createMockConnection('conn-2', {
        client: {
          reconnect: jest.fn().mockRejectedValue(new Error('Network error')),
        },
      });
      const mockConnection3 = createMockConnection('conn-3');

      const persistedConnections = [
        createPersistedConnection('conn-1'),
        createPersistedConnection('conn-2'),
        createPersistedConnection('conn-3'),
      ];

      mockStore.list.mockResolvedValue(persistedConnections);
      (Connection.create as jest.Mock)
        .mockClear()
        .mockResolvedValueOnce(mockConnection1)
        .mockResolvedValueOnce(mockConnection2)
        .mockResolvedValueOnce(mockConnection3);

      // Create registry and let it initialize
      registry = new ConnectionRegistry(
        RELAY_URL,
        mockKeyManager,
        mockHostApp,
        mockStore,
      );

      await new Promise((resolve) => setTimeout(resolve, 0));

      // Clear mocks from initialization
      mockConnection1.client.reconnect.mockClear();
      mockConnection2.client.reconnect.mockClear();
      mockConnection3.client.reconnect.mockClear();

      // When: calling reconnectAll (should not throw)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const reconnectPromise = (registry as any).reconnectAll();
      await expect(reconnectPromise).resolves.not.toThrow();

      // Then: all connections should be attempted, even if one fails
      expect(mockConnection1.client.reconnect).toHaveBeenCalledTimes(1);
      expect(mockConnection2.client.reconnect).toHaveBeenCalledTimes(1); // Attempted even though it fails
      expect(mockConnection3.client.reconnect).toHaveBeenCalledTimes(1);
    });
  });
});
