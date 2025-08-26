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

// A valid, sample connection request payload for use in tests
const mockConnectionRequest: ConnectionRequest = {
  sessionRequest: {
    id: 'test-conn-id',
    dappPublicKey: 'dapp_pub_key',
    walletPublicKey: 'wallet_pub_key',
    channel: 'websocket-channel-id',
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
const validDeeplink = `metamask://connect/mwp/${encodeURIComponent(
  JSON.stringify(mockConnectionRequest),
)}`;

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

    registry = new ConnectionRegistry(
      RELAY_URL,
      mockKeyManager,
      mockHostApp,
      mockStore,
    );
  });

  describe('handleConnectDeeplink', () => {
    it('should successfully handle the full connection happy path', async () => {
      await registry.handleConnectDeeplink(validDeeplink);

      expect(mockHostApp.showLoading).toHaveBeenCalledTimes(1);
      expect(Connection.create).toHaveBeenCalledWith(
        mockConnectionRequest,
        mockKeyManager,
        RELAY_URL,
      );
      expect(mockConnection.connect).toHaveBeenCalledWith(
        mockConnectionRequest.sessionRequest,
      );
      expect(mockStore.save).toHaveBeenCalledWith({
        id: mockConnection.id,
        metadata: mockConnection.metadata,
      });
      expect(mockHostApp.syncConnectionList).toHaveBeenCalledWith([
        mockConnection,
      ]);
      expect(mockHostApp.hideLoading).toHaveBeenCalledTimes(1);
    });

    it('should call hideLoading and not save anything if the URL is invalid', async () => {
      const invalidDeeplink = 'metamask://connect/mwp/not-json';

      await registry.handleConnectDeeplink(invalidDeeplink);

      expect(mockHostApp.showLoading).toHaveBeenCalledTimes(1);
      expect(Connection.create).not.toHaveBeenCalled();
      expect(mockStore.save).not.toHaveBeenCalled();
      expect(mockHostApp.syncConnectionList).not.toHaveBeenCalled();
      expect(mockHostApp.hideLoading).toHaveBeenCalledTimes(1);
    });

    it('should attempt to disconnect and hide loading if the connect method fails', async () => {
      const connectionError = new Error('Connection failed');
      mockConnection.connect.mockRejectedValue(connectionError);

      const disconnectSpy = jest.spyOn(registry, 'disconnect');

      await registry.handleConnectDeeplink(validDeeplink);

      expect(mockHostApp.showLoading).toHaveBeenCalledTimes(1);
      expect(Connection.create).toHaveBeenCalledTimes(1);
      expect(mockConnection.connect).toHaveBeenCalledTimes(1);

      expect(disconnectSpy).toHaveBeenCalledWith(mockConnection.id);
      expect(mockStore.delete).toHaveBeenCalledWith(mockConnection.id);
      expect(mockHostApp.syncConnectionList).toHaveBeenCalledWith([]);

      expect(mockHostApp.hideLoading).toHaveBeenCalledTimes(1);

      disconnectSpy.mockRestore();
    });
  });

  describe('disconnect', () => {
    it('should disconnect a session, delete it from the store, and update the UI', async () => {
      await registry.handleConnectDeeplink(validDeeplink);

      jest.clearAllMocks();

      await registry.disconnect(mockConnection.id);

      expect(mockConnection.disconnect).toHaveBeenCalledTimes(1);
      expect(mockStore.delete).toHaveBeenCalledWith(mockConnection.id);
      // The final sync should be with an empty list
      expect(mockHostApp.syncConnectionList).toHaveBeenCalledWith([]);
      expect(mockHostApp.syncConnectionList).toHaveBeenCalledTimes(1);
    });
  });
});
