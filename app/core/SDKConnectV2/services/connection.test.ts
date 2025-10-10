import { Connection } from './connection';
import { ConnectionRequest } from '../types/connection-request';
import { KeyManager } from './key-manager';
import {
  WalletClient,
  SessionRequest,
} from '@metamask/mobile-wallet-protocol-wallet-client';
import {
  WebSocketTransport,
  SessionStore,
} from '@metamask/mobile-wallet-protocol-core';
import { KVStore } from '../store/kv-store';
import { RPCBridgeAdapter } from '../adapters/rpc-bridge-adapter';
import { ConnectionInfo } from '../types/connection-info';
import { HostApplicationAdapter } from '../adapters/host-application-adapter';

jest.mock('@metamask/mobile-wallet-protocol-wallet-client');
jest.mock('@metamask/mobile-wallet-protocol-core', () => ({
  ...jest.requireActual('@metamask/mobile-wallet-protocol-core'),
  WebSocketTransport: {
    create: jest.fn(),
  },
  SessionStore: jest.fn(),
}));
jest.mock('../store/kv-store');
jest.mock('../adapters/rpc-bridge-adapter');

const MockedWalletClient = WalletClient as jest.MockedClass<
  typeof WalletClient
>;
const MockedWebSocketTransport = WebSocketTransport as jest.Mocked<
  typeof WebSocketTransport
>;
const MockedRPCBridgeAdapter = RPCBridgeAdapter as jest.MockedClass<
  typeof RPCBridgeAdapter
>;

const mockConnectionRequest: ConnectionRequest = {
  sessionRequest: {
    id: 'test-session-id',
    publicKeyB64: 'AoBDLWxRbJNe8yUv5bmmoVnNo8DCilzbFz/nWD+RKC2V',
    mode: 'trusted',
    expiresAt: 1757410033264,
    channel: 'channel-id',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any,
  metadata: {
    dapp: { name: 'Test DApp', url: 'https://test.dapp' },
    sdk: { version: '1.0.0', platform: 'JavaScript' },
  },
};

const mockConnectionInfo: ConnectionInfo = {
  id: mockConnectionRequest.sessionRequest.id,
  metadata: mockConnectionRequest.metadata,
  expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days from now
};

const mockHostApp: jest.Mocked<HostApplicationAdapter> = {
  showConnectionLoading: jest.fn(),
  hideConnectionLoading: jest.fn(),
  showConnectionError: jest.fn(),
  showReturnToApp: jest.fn(),
  syncConnectionList: jest.fn(),
  revokePermissions: jest.fn(),
};

describe('Connection', () => {
  let mockKeyManager: KeyManager;
  let mockWalletClientInstance: jest.Mocked<WalletClient>;
  let mockBridgeInstance: jest.Mocked<RPCBridgeAdapter>;
  let onClientMessageCallback: (payload: unknown) => void;
  let onBridgeResponseCallback: (payload: unknown) => void;

  const RELAY_URL = 'wss://test-relay.example.com';

  beforeEach(() => {
    jest.clearAllMocks();

    mockKeyManager = new KeyManager();
    mockWalletClientInstance = new MockedWalletClient({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      transport: {} as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sessionstore: {} as any,
      keymanager: mockKeyManager,
    }) as jest.Mocked<WalletClient>;

    // Capture the client message callback
    mockWalletClientInstance.on = jest.fn((event, callback) => {
      if (event === 'message') {
        onClientMessageCallback = callback;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any;

    mockWalletClientInstance.sendResponse = jest.fn();
    mockWalletClientInstance.resume = jest.fn().mockResolvedValue(undefined);

    MockedWalletClient.mockImplementation(
      () => mockWalletClientInstance as WalletClient,
    );

    // Mock bridge instance
    mockBridgeInstance = {
      on: jest.fn((event, callback) => {
        if (event === 'response') {
          onBridgeResponseCallback = callback;
        }
      }),
      send: jest.fn(),
      dispose: jest.fn(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    MockedRPCBridgeAdapter.mockImplementation(
      () => mockBridgeInstance as RPCBridgeAdapter,
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (MockedWebSocketTransport.create as jest.Mock).mockResolvedValue({} as any);
  });

  describe('create', () => {
    it('should correctly initialize dependencies and create a Connection instance', async () => {
      const connection = await Connection.create(
        mockConnectionInfo,
        mockKeyManager,
        RELAY_URL,
        mockHostApp,
      );

      expect(WebSocketTransport.create).toHaveBeenCalledWith({
        url: RELAY_URL,
        kvstore: expect.any(KVStore),
        useSharedConnection: true,
      });
      expect(SessionStore).toHaveBeenCalledWith(expect.any(KVStore));
      expect(WalletClient).toHaveBeenCalledWith({
        transport: expect.anything(),
        sessionstore: expect.anything(),
        keymanager: mockKeyManager,
      });

      expect(connection).toBeInstanceOf(Connection);
      expect(connection.id).toBe(mockConnectionInfo.id);
      expect(connection.info.metadata).toBe(mockConnectionInfo.metadata);
      expect(connection.client).toBe(mockWalletClientInstance);
      expect(connection.bridge).toBe(mockBridgeInstance);

      // Verify bridge is created with the connection info
      expect(MockedRPCBridgeAdapter).toHaveBeenCalledWith(mockConnectionInfo);

      // Verify event listeners are set up
      expect(mockWalletClientInstance.on).toHaveBeenCalledWith(
        'message',
        expect.any(Function),
      );
      expect(mockBridgeInstance.on).toHaveBeenCalledWith(
        'response',
        expect.any(Function),
      );
    });
  });

  describe('connect', () => {
    it('should call connect on its WalletClient with the sessionRequest', async () => {
      const connection = await Connection.create(
        mockConnectionInfo,
        mockKeyManager,
        RELAY_URL,
        mockHostApp,
      );
      const sessionRequest: SessionRequest =
        mockConnectionRequest.sessionRequest;

      await connection.connect(sessionRequest);

      expect(mockWalletClientInstance.connect).toHaveBeenCalledTimes(1);
      expect(mockWalletClientInstance.connect).toHaveBeenCalledWith({
        sessionRequest,
      });
    });
  });

  describe('Message Forwarding', () => {
    it('should forward messages from the dApp (via client) to the bridge', async () => {
      await Connection.create(
        mockConnectionInfo,
        mockKeyManager,
        RELAY_URL,
        mockHostApp,
      );

      const dAppPayload = { id: 1, method: 'eth_accounts', params: [] };
      // Simulate the WalletClient receiving a message
      onClientMessageCallback(dAppPayload);

      expect(mockBridgeInstance.send).toHaveBeenCalledTimes(1);
      expect(mockBridgeInstance.send).toHaveBeenCalledWith(dAppPayload);
    });

    it('should forward responses from the bridge to the dApp (via client)', async () => {
      await Connection.create(
        mockConnectionInfo,
        mockKeyManager,
        RELAY_URL,
        mockHostApp,
      );

      const walletPayload = { id: 1, result: ['0x123'] };
      // Simulate the RPCBridgeAdapter emitting a response
      onBridgeResponseCallback(walletPayload);

      expect(mockWalletClientInstance.sendResponse).toHaveBeenCalledTimes(1);
      expect(mockWalletClientInstance.sendResponse).toHaveBeenCalledWith(
        walletPayload,
      );
    });
  });

  describe('resume', () => {
    it('should call resume on its WalletClient with the connection ID', async () => {
      const connection = await Connection.create(
        mockConnectionInfo,
        mockKeyManager,
        RELAY_URL,
        mockHostApp,
      );

      await connection.resume();

      expect(mockWalletClientInstance.resume).toHaveBeenCalledTimes(1);
      expect(mockWalletClientInstance.resume).toHaveBeenCalledWith(
        mockConnectionInfo.id,
      );
    });
  });

  describe('disconnect', () => {
    it('should call disconnect on its WalletClient, dispose the bridge, and remove listeners', async () => {
      const connection = await Connection.create(
        mockConnectionInfo,
        mockKeyManager,
        RELAY_URL,
        mockHostApp,
      );

      await connection.disconnect();

      expect(mockWalletClientInstance.disconnect).toHaveBeenCalledTimes(1);
      expect(mockBridgeInstance.dispose).toHaveBeenCalledTimes(1);
    });
  });

  describe('showReturnToApp notification', () => {
    it('should show return to app notification when bridge response includes an id', async () => {
      await Connection.create(
        mockConnectionInfo,
        mockKeyManager,
        RELAY_URL,
        mockHostApp,
      );

      const responsePayload = {
        data: { id: 1, result: ['0x123'] },
      };

      // Simulate the RPCBridgeAdapter emitting a response with an id
      onBridgeResponseCallback(responsePayload);

      // Should show return to app notification
      expect(mockHostApp.showReturnToApp).toHaveBeenCalledTimes(1);
      expect(mockHostApp.showReturnToApp).toHaveBeenCalledWith(
        mockConnectionInfo,
      );

      // And still send the response to the client
      expect(mockWalletClientInstance.sendResponse).toHaveBeenCalledTimes(1);
      expect(mockWalletClientInstance.sendResponse).toHaveBeenCalledWith(
        responsePayload,
      );
    });

    it('should not show return to app notification when bridge response is a notification without id', async () => {
      await Connection.create(
        mockConnectionInfo,
        mockKeyManager,
        RELAY_URL,
        mockHostApp,
      );

      const notificationPayload = {
        data: { method: 'accountsChanged', params: [] },
      };

      // Simulate the RPCBridgeAdapter emitting a notification without an id
      onBridgeResponseCallback(notificationPayload);

      // Should not show return to app notification
      expect(mockHostApp.showReturnToApp).not.toHaveBeenCalled();

      // But still send the notification to the client
      expect(mockWalletClientInstance.sendResponse).toHaveBeenCalledTimes(1);
      expect(mockWalletClientInstance.sendResponse).toHaveBeenCalledWith(
        notificationPayload,
      );
    });

    it('should not show return to app notification when response data does not have id property', async () => {
      await Connection.create(
        mockConnectionInfo,
        mockKeyManager,
        RELAY_URL,
        mockHostApp,
      );

      const responsePayload = {
        data: { someOtherProp: 'value' },
      };

      // Simulate the RPCBridgeAdapter emitting a response without an id
      onBridgeResponseCallback(responsePayload);

      // Should not show return to app notification
      expect(mockHostApp.showReturnToApp).not.toHaveBeenCalled();

      // But still send the response to the client
      expect(mockWalletClientInstance.sendResponse).toHaveBeenCalledTimes(1);
      expect(mockWalletClientInstance.sendResponse).toHaveBeenCalledWith(
        responsePayload,
      );
    });
  });
});
