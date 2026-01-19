import { AppState, AppStateStatus } from 'react-native';
import { ConnectionRegistry } from './connection-registry';
import { HostApplicationAdapter } from '../adapters/host-application-adapter';
import { ConnectionStore } from '../store/connection-store';
import { KeyManager } from './key-manager';
import { Connection } from './connection';
import { ConnectionRequest } from '../types/connection-request';
import { ConnectionInfo } from '../types/connection-info';
import Engine from '../../Engine';

jest.mock('../adapters/host-application-adapter');
jest.mock('../store/connection-store');
jest.mock('./key-manager');
jest.mock('./connection');
jest.mock('react-native');
jest.mock('@sentry/react-native');
jest.mock('../../Permissions');
jest.mock('../../../store', () => ({
  store: {
    dispatch: jest.fn(),
    getState: jest.fn().mockImplementation(() => ({
      engine: { backgroundState: { NetworkController: {} } },
    })),
  },
}));

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

// A valid, sample connection request payload for use in tests
const mockConnectionInfo: ConnectionInfo = {
  id: 'test-conn-id',
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
  expiresAt: 1757410033264,
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
  expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days from now
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
  expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days from now
});

describe('ConnectionRegistry', () => {
  let registry: ConnectionRegistry;
  let mockHostApp: jest.Mocked<HostApplicationAdapter>;
  let mockStore: jest.Mocked<ConnectionStore>;
  let mockKeyManager: jest.Mocked<KeyManager>;
  let mockConnection: jest.Mocked<Connection>;

  const RELAY_URL = 'wss://test-relay.example.com';

  beforeEach(async () => {
    jest.clearAllMocks();

    Engine.context.KeyringController.isUnlocked = jest
      .fn()
      .mockReturnValue(true);

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
      info: {
        id: mockConnectionRequest.sessionRequest.id,
        metadata: mockConnectionRequest.metadata,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      client: {} as any,
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      resume: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<Connection>;

    (Connection.create as jest.Mock).mockResolvedValue(mockConnection);

    // Wait for initialization to complete
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  describe('isMwpDeeplink', () => {
    it('should return true for valid MWP connect deeplinks', () => {
      registry = new ConnectionRegistry(
        RELAY_URL,
        mockKeyManager,
        mockHostApp,
        mockStore,
      );

      expect(registry.isMwpDeeplink(validDeeplink)).toBe(true);
      expect(registry.isMwpDeeplink('metamask://connect/mwp?p=somedata')).toBe(
        true,
      );
    });

    it('should return false for non-MWP deeplinks', () => {
      registry = new ConnectionRegistry(
        RELAY_URL,
        mockKeyManager,
        mockHostApp,
        mockStore,
      );

      expect(registry.isMwpDeeplink('metamask://some-other-path')).toBe(false);
      expect(registry.isMwpDeeplink('https://example.com')).toBe(false);
      expect(registry.isMwpDeeplink('metamask://connect/other')).toBe(false);
    });

    it('should return false for non-string values', () => {
      registry = new ConnectionRegistry(
        RELAY_URL,
        mockKeyManager,
        mockHostApp,
        mockStore,
      );

      expect(registry.isMwpDeeplink(null)).toBe(false);
      expect(registry.isMwpDeeplink(undefined)).toBe(false);
      expect(registry.isMwpDeeplink(123)).toBe(false);
      expect(registry.isMwpDeeplink({})).toBe(false);
    });
  });

  describe('handleMwpDeeplink', () => {
    it('should handle a valid simple deeplink', async () => {
      registry = new ConnectionRegistry(
        RELAY_URL,
        mockKeyManager,
        mockHostApp,
        mockStore,
      );

      const simpleDeeplink = 'metamask://connect/mwp?id=1-1-1-1';
      const spyHandleSimpleDeeplink = jest
        .spyOn(registry, 'handleSimpleDeeplink')
        .mockResolvedValue(undefined);

      await registry.handleMwpDeeplink(simpleDeeplink);

      expect(spyHandleSimpleDeeplink).toHaveBeenCalledWith('1-1-1-1');
      spyHandleSimpleDeeplink.mockRestore();
    });

    it('should handle a valid connect deeplink', async () => {
      registry = new ConnectionRegistry(
        RELAY_URL,
        mockKeyManager,
        mockHostApp,
        mockStore,
      );

      const connectDeeplink = validDeeplink;
      const spyHandleConnectDeeplink = jest
        .spyOn(registry, 'handleConnectDeeplink')
        .mockResolvedValue(undefined);

      await registry.handleMwpDeeplink(connectDeeplink);

      expect(spyHandleConnectDeeplink).toHaveBeenCalledWith(connectDeeplink);
      spyHandleConnectDeeplink.mockRestore();
    });

    it('should throw for unsupported or malformed deeplink', async () => {
      registry = new ConnectionRegistry(
        RELAY_URL,
        mockKeyManager,
        mockHostApp,
        mockStore,
      );

      const invalidDeeplink = 'metamask://bad/path';

      await expect(registry.handleMwpDeeplink(invalidDeeplink)).rejects.toThrow(
        'Invalid MWP deeplink: metamask://bad/path',
      );
    });

    it('should throw when deeplink is not a string', async () => {
      registry = new ConnectionRegistry(
        RELAY_URL,
        mockKeyManager,
        mockHostApp,
        mockStore,
      );

      // @ts-expect-error test non-string input
      await expect(registry.handleMwpDeeplink(null)).rejects.toThrow(
        'Invalid MWP deeplink: null',
      );
    });
  });

  describe('handleSimpleDeeplink', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should not show error if connection is found in the store', async () => {
      const persistedConnInfo = {
        ...mockConnectionInfo,
        id: 'mock-conn-id',
        metadata: { ...mockConnectionInfo.metadata },
        expiresAt: Date.now() + 100000,
      };

      registry = new ConnectionRegistry(
        RELAY_URL,
        mockKeyManager,
        mockHostApp,
        mockStore,
      );

      mockStore.get.mockResolvedValue(persistedConnInfo);

      await registry.handleSimpleDeeplink('mock-conn-id');

      expect(mockStore.get).toHaveBeenCalledWith('mock-conn-id');

      expect(mockHostApp.showNotFoundError).not.toHaveBeenCalled();
    });

    describe('when the connection is not found in the store', () => {
      it('should show error when the keyring is unlocked', async () => {
        registry = new ConnectionRegistry(
          RELAY_URL,
          mockKeyManager,
          mockHostApp,
          mockStore,
        );

        await registry.handleSimpleDeeplink('mock-conn-id');
        await jest.advanceTimersByTimeAsync(1000);

        expect(mockStore.get).toHaveBeenCalledWith('mock-conn-id');
        expect(mockHostApp.showNotFoundError).toHaveBeenCalled();
      });

      it('should show error if the keyring is not unlocked but becomes unlocked later', async () => {
        registry = new ConnectionRegistry(
          RELAY_URL,
          mockKeyManager,
          mockHostApp,
          mockStore,
        );

        (
          Engine.context.KeyringController.isUnlocked as jest.Mock
        ).mockReturnValueOnce(false);

        Engine.controllerMessenger.unsubscribe = jest.fn();

        const promise = registry.handleSimpleDeeplink('mock-conn-id');

        expect(mockHostApp.showNotFoundError).not.toHaveBeenCalled();

        await jest.advanceTimersByTimeAsync(1000);
        expect(mockHostApp.showNotFoundError).not.toHaveBeenCalled();

        // Trigger the subscription handler
        (Engine.controllerMessenger.subscribe as jest.Mock).mock.calls[0][1]();

        await jest.advanceTimersByTimeAsync(1000);
        expect(Engine.controllerMessenger.unsubscribe).toHaveBeenCalled();

        await promise;

        expect(mockStore.get).toHaveBeenCalledWith('mock-conn-id');
        expect(mockHostApp.showNotFoundError).toHaveBeenCalled();
      });
    });
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
      expect(mockHostApp.showConnectionLoading).toHaveBeenCalledTimes(1);
      expect(mockHostApp.showConnectionLoading).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockConnectionInfo.id,
          metadata: mockConnectionInfo.metadata,
          expiresAt: expect.any(Number),
        }),
      );

      // Connection is created and established with correct parameters
      expect(Connection.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockConnectionInfo.id,
          metadata: mockConnectionInfo.metadata,
          expiresAt: expect.any(Number),
        }),
        mockKeyManager,
        RELAY_URL,
        mockHostApp,
      );
      expect(mockConnection.connect).toHaveBeenCalledWith(
        mockConnectionRequest.sessionRequest,
      );

      // Connection data is persisted to storage
      expect(mockStore.save).toHaveBeenCalledWith({
        id: mockConnection.id,
        metadata: mockConnection.info.metadata,
        expiresAt: expect.any(Number),
      });

      // UI is synchronized with the new connection
      expect(mockHostApp.syncConnectionList).toHaveBeenCalledWith([
        mockConnection,
      ]);
      expect(mockHostApp.hideConnectionLoading).toHaveBeenCalledTimes(1);
      expect(mockHostApp.hideConnectionLoading).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockConnectionInfo.id,
          metadata: mockConnectionInfo.metadata,
          expiresAt: expect.any(Number),
        }),
      );
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
      expect(mockHostApp.showConnectionError).toHaveBeenCalledTimes(1);

      // Nothing else happens
      expect(mockHostApp.showConnectionLoading).not.toHaveBeenCalled();
      expect(Connection.create).not.toHaveBeenCalled();
      expect(mockStore.save).not.toHaveBeenCalled();
      expect(mockHostApp.syncConnectionList).not.toHaveBeenCalled();
      expect(mockHostApp.hideConnectionLoading).not.toHaveBeenCalled();
    });

    it('should show error and not save anything if the URL is invalid', async () => {
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
      expect(mockHostApp.showConnectionError).toHaveBeenCalledTimes(1);

      // Nothing else happens
      expect(mockHostApp.showConnectionLoading).not.toHaveBeenCalled();
      expect(Connection.create).not.toHaveBeenCalled();

      // No data is persisted or UI updates made for invalid requests
      expect(mockConnection.disconnect).not.toHaveBeenCalled();
      expect(mockStore.save).not.toHaveBeenCalled();
      expect(mockHostApp.syncConnectionList).not.toHaveBeenCalled();
      expect(mockHostApp.hideConnectionLoading).not.toHaveBeenCalled();
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
      expect(mockHostApp.showConnectionError).toHaveBeenCalledTimes(1);

      // Nothing else happens
      expect(mockHostApp.showConnectionLoading).toHaveBeenCalledTimes(1);
      expect(mockHostApp.showConnectionLoading).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockConnectionInfo.id,
          metadata: mockConnectionInfo.metadata,
          expiresAt: expect.any(Number),
        }),
      );
      expect(Connection.create).toHaveBeenCalledTimes(1);
      expect(mockConnection.connect).toHaveBeenCalledTimes(1);

      // Failed connection is cleaned up properly
      expect(disconnectSpy).toHaveBeenCalledWith(mockConnection.id);
      expect(mockStore.delete).toHaveBeenCalledWith(mockConnection.id);
      expect(mockHostApp.syncConnectionList).toHaveBeenCalledWith([]);

      expect(mockHostApp.hideConnectionLoading).toHaveBeenCalledTimes(1);
      expect(mockHostApp.hideConnectionLoading).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockConnectionInfo.id,
          metadata: mockConnectionInfo.metadata,
          expiresAt: expect.any(Number),
        }),
      );

      disconnectSpy.mockRestore();
    });

    it('should be idempotent and ignore duplicate deeplink calls', async () => {
      // Given: a registry ready to handle connections
      registry = new ConnectionRegistry(
        RELAY_URL,
        mockKeyManager,
        mockHostApp,
        mockStore,
      );

      // When: handling the same deeplink twice in parallel
      const promise1 = registry.handleConnectDeeplink(validDeeplink);
      const promise2 = registry.handleConnectDeeplink(validDeeplink);

      await Promise.all([promise1, promise2]);

      // Then: connection should only be created once
      expect(Connection.create).toHaveBeenCalledTimes(1);
      expect(mockConnection.connect).toHaveBeenCalledTimes(1);
      expect(mockStore.save).toHaveBeenCalledTimes(1);
    });

    it('should handle deeplinks with no payload parameter', async () => {
      // Given: a registry ready to handle connections
      registry = new ConnectionRegistry(
        RELAY_URL,
        mockKeyManager,
        mockHostApp,
        mockStore,
      );

      const invalidDeeplink = 'metamask://connect/mwp';

      await registry.handleConnectDeeplink(invalidDeeplink);

      // Then: error should be shown
      expect(mockHostApp.showConnectionError).toHaveBeenCalledTimes(1);
      expect(Connection.create).not.toHaveBeenCalled();
      expect(mockStore.save).not.toHaveBeenCalled();
    });

    it('should reject payloads larger than 1MB', async () => {
      // Given: a registry ready to handle connections
      registry = new ConnectionRegistry(
        RELAY_URL,
        mockKeyManager,
        mockHostApp,
        mockStore,
      );

      // Create a large payload (over 1MB)
      const largePayload = 'x'.repeat(1024 * 1024 + 1);
      const largeDeeplink = `metamask://connect/mwp?p=${encodeURIComponent(
        largePayload,
      )}`;

      await registry.handleConnectDeeplink(largeDeeplink);

      // Then: error should be shown
      expect(mockHostApp.showConnectionError).toHaveBeenCalledTimes(1);
      expect(Connection.create).not.toHaveBeenCalled();
      expect(mockStore.save).not.toHaveBeenCalled();
    });

    it('should handle malformed connection request structure', async () => {
      // Given: a registry ready to handle connections
      registry = new ConnectionRegistry(
        RELAY_URL,
        mockKeyManager,
        mockHostApp,
        mockStore,
      );

      const invalidRequest = { invalidStructure: true };
      const invalidDeeplink = `metamask://connect/mwp?p=${encodeURIComponent(
        JSON.stringify(invalidRequest),
      )}`;

      await registry.handleConnectDeeplink(invalidDeeplink);

      // Then: error should be shown
      expect(mockHostApp.showConnectionError).toHaveBeenCalledTimes(1);
      expect(Connection.create).not.toHaveBeenCalled();
      expect(mockStore.save).not.toHaveBeenCalled();
    });

    it('should handle connection creation failure', async () => {
      // Given: a registry where connection creation fails
      registry = new ConnectionRegistry(
        RELAY_URL,
        mockKeyManager,
        mockHostApp,
        mockStore,
      );

      const creationError = new Error('Connection creation failed');
      (Connection.create as jest.Mock).mockRejectedValueOnce(creationError);

      await registry.handleConnectDeeplink(validDeeplink);

      // Then: error should be shown and cleanup should occur
      expect(mockHostApp.showConnectionError).toHaveBeenCalledTimes(1);
      expect(mockHostApp.showConnectionLoading).toHaveBeenCalledTimes(1);
      expect(mockHostApp.hideConnectionLoading).toHaveBeenCalledTimes(1);
      expect(mockStore.save).not.toHaveBeenCalled();
    });

    it('blocks connection requests with `metamask` as origin', async () => {
      registry = new ConnectionRegistry(
        RELAY_URL,
        mockKeyManager,
        mockHostApp,
        mockStore,
      );

      const blockedRequest = {
        ...mockConnectionRequest,
        metadata: {
          ...mockConnectionRequest.metadata,
          dapp: {
            ...mockConnectionRequest.metadata.dapp,
            url: 'metamask',
          },
        },
      };

      const blockedDeeplink = `metamask://connect/mwp?p=${encodeURIComponent(
        JSON.stringify(blockedRequest),
      )}`;

      await registry.handleConnectDeeplink(blockedDeeplink);

      expect(mockHostApp.showConnectionError).toHaveBeenCalledTimes(1);
      expect(Connection.create).not.toHaveBeenCalled();
      expect(mockStore.save).not.toHaveBeenCalled();
    });

    it('blocks connection requests with `metamask` as dapp name', async () => {
      registry = new ConnectionRegistry(
        RELAY_URL,
        mockKeyManager,
        mockHostApp,
        mockStore,
      );

      const blockedRequest = {
        ...mockConnectionRequest,
        metadata: {
          ...mockConnectionRequest.metadata,
          dapp: {
            ...mockConnectionRequest.metadata.dapp,
            name: 'metamask',
          },
        },
      };

      const blockedDeeplink = `metamask://connect/mwp?p=${encodeURIComponent(
        JSON.stringify(blockedRequest),
      )}`;

      await registry.handleConnectDeeplink(blockedDeeplink);
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
      const persistedConnections: ConnectionInfo[] = [
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
      const persistedConnections: ConnectionInfo[] = [
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

    it('should handle errors when store.list fails during initialization', async () => {
      // Given: store.list fails
      mockStore.list.mockRejectedValue(new Error('Storage error'));

      // When: creating a new registry
      registry = new ConnectionRegistry(
        RELAY_URL,
        mockKeyManager,
        mockHostApp,
        mockStore,
      );

      // Wait for initialization to complete
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Then: initialization should complete without throwing
      expect(mockStore.list).toHaveBeenCalledTimes(1);
      expect(Connection.create).not.toHaveBeenCalled();
      expect(mockHostApp.syncConnectionList).toHaveBeenCalledWith([]);
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

      const persistedConnections: ConnectionInfo[] = [
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

      const persistedConnections: ConnectionInfo[] = [
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

      const persistedConnections: ConnectionInfo[] = [
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
