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

describe('Connection', () => {
  let mockKeyManager: KeyManager;
  let mockWalletClientInstance: jest.Mocked<WalletClient>;
  let mockBridgeInstance: jest.Mocked<RPCBridgeAdapter>;
  let onClientMessageCallback: (payload: unknown) => void;
  let onBridgeResponseCallback: (payload: unknown) => void;

  const RELAY_URL = 'wss://test-relay.example.com';
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
        mockConnectionRequest,
        mockKeyManager,
        RELAY_URL,
      );

      expect(WebSocketTransport.create).toHaveBeenCalledWith({
        url: RELAY_URL,
        kvstore: expect.any(KVStore),
      });
      expect(SessionStore).toHaveBeenCalledWith(expect.any(KVStore));
      expect(WalletClient).toHaveBeenCalledWith({
        transport: expect.anything(),
        sessionstore: expect.anything(),
        keymanager: mockKeyManager,
      });

      expect(connection).toBeInstanceOf(Connection);
      expect(connection.id).toBe(mockConnectionRequest.sessionRequest.id);
      expect(connection.metadata).toBe(mockConnectionRequest.metadata);
      expect(connection.client).toBe(mockWalletClientInstance);
      expect(connection.bridge).toBe(mockBridgeInstance);

      // Verify bridge is created with the connection
      expect(MockedRPCBridgeAdapter).toHaveBeenCalledWith(connection);

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
        mockConnectionRequest,
        mockKeyManager,
        RELAY_URL,
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
      await Connection.create(mockConnectionRequest, mockKeyManager, RELAY_URL);

      const dAppPayload = { id: 1, method: 'eth_accounts', params: [] };
      // Simulate the WalletClient receiving a message
      onClientMessageCallback(dAppPayload);

      expect(mockBridgeInstance.send).toHaveBeenCalledTimes(1);
      expect(mockBridgeInstance.send).toHaveBeenCalledWith(dAppPayload);
    });

    it('should forward responses from the bridge to the dApp (via client)', async () => {
      await Connection.create(mockConnectionRequest, mockKeyManager, RELAY_URL);

      const walletPayload = { id: 1, result: ['0x123'] };
      // Simulate the RPCBridgeAdapter emitting a response
      onBridgeResponseCallback(walletPayload);

      expect(mockWalletClientInstance.sendResponse).toHaveBeenCalledTimes(1);
      expect(mockWalletClientInstance.sendResponse).toHaveBeenCalledWith(
        walletPayload,
      );
    });
  });

  describe('disconnect', () => {
    it('should call disconnect on its WalletClient, dispose the bridge, and remove listeners', async () => {
      const connection = await Connection.create(
        mockConnectionRequest,
        mockKeyManager,
        RELAY_URL,
      );

      await connection.disconnect();

      expect(mockWalletClientInstance.disconnect).toHaveBeenCalledTimes(1);
      expect(mockBridgeInstance.dispose).toHaveBeenCalledTimes(1);
    });
  });
});
