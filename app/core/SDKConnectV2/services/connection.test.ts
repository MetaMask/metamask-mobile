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

jest.mock('@metamask/mobile-wallet-protocol-wallet-client');
jest.mock('@metamask/mobile-wallet-protocol-core', () => ({
  ...jest.requireActual('@metamask/mobile-wallet-protocol-core'),
  WebSocketTransport: {
    create: jest.fn(),
  },
  SessionStore: jest.fn(),
}));
jest.mock('../store/kv-store');

const MockedWalletClient = WalletClient as jest.MockedClass<
  typeof WalletClient
>;
const MockedWebSocketTransport = WebSocketTransport as jest.Mocked<
  typeof WebSocketTransport
>;

describe('Connection', () => {
  let mockKeyManager: KeyManager;
  let mockWalletClientInstance: jest.Mocked<WalletClient>;

  const RELAY_URL = 'wss://test-relay.example.com';
  const mockConnectionRequest: ConnectionRequest = {
    sessionRequest: {
      id: 'test-session-id',
      dappPublicKey: 'dapp_pub_key',
      walletPublicKey: 'wallet_pub_key',
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

    MockedWalletClient.mockImplementation(
      () => mockWalletClientInstance as WalletClient,
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

  describe('disconnect', () => {
    it('should call disconnect on its WalletClient and remove the message listener', async () => {
      const connection = await Connection.create(
        mockConnectionRequest,
        mockKeyManager,
        RELAY_URL,
      );

      await connection.disconnect();

      expect(mockWalletClientInstance.disconnect).toHaveBeenCalledTimes(1);
    });
  });
});
