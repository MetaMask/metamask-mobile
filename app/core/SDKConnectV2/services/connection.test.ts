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
import { errorCodes, providerErrors } from '@metamask/rpc-errors';
import Engine from '../../Engine';
import NavigationService from '../../NavigationService';

jest.mock('@metamask/mobile-wallet-protocol-wallet-client');
jest.mock('@metamask/mobile-wallet-protocol-core', () => ({
  ...jest.requireActual('@metamask/mobile-wallet-protocol-core'),
  WebSocketTransport: {
    create: jest.fn(),
  },
  SessionStore: Object.assign(jest.fn(), {
    create: jest.fn(),
  }),
}));
jest.mock('../store/kv-store');
jest.mock('../adapters/rpc-bridge-adapter');
jest.mock('../../Engine', () => ({
  context: {
    ApprovalController: {
      getTotalApprovalCount: jest.fn(),
      clearRequests: jest.fn().mockResolvedValue(undefined),
    },
  },
}));
jest.mock('../../NavigationService', () => ({
  navigation: {
    goBack: jest.fn(),
  },
}));

const MockedWalletClient = WalletClient as jest.MockedClass<
  typeof WalletClient
>;
const MockedWebSocketTransport = WebSocketTransport as jest.Mocked<
  typeof WebSocketTransport
>;
const MockedSessionStore = SessionStore as jest.Mocked<typeof SessionStore> & {
  create: jest.Mock;
};
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
  showInternalError: jest.fn(),
  showMethodError: jest.fn(),
  showNotFoundError: jest.fn(),
  showConfirmationRejectionError: jest.fn(),
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
    MockedSessionStore.create.mockResolvedValue({} as SessionStore);
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
      expect(SessionStore.create).toHaveBeenCalledWith(expect.any(KVStore));
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

      const dAppPayload = {
        name: 'metamask-provider',
        data: { id: 1, method: 'eth_accounts', params: [] },
      };
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

      const walletPayload = {
        name: 'metamask-provider',
        data: { id: 1, result: ['0x123'] },
      };
      // Simulate the RPCBridgeAdapter emitting a response
      onBridgeResponseCallback(walletPayload);

      expect(mockWalletClientInstance.sendResponse).toHaveBeenCalledTimes(1);
      expect(mockWalletClientInstance.sendResponse).toHaveBeenCalledWith(
        walletPayload,
      );
    });

    describe('wallet_createSession request', () => {
      it('clears all pending approvals and navigates away from the open approval modal when there are pending approval requests', async () => {
        await Connection.create(
          mockConnectionInfo,
          mockKeyManager,
          RELAY_URL,
          mockHostApp,
        );

        (
          Engine.context.ApprovalController.getTotalApprovalCount as jest.Mock
        ).mockReturnValue(2);

        const walletCreateSessionPayload = {
          name: 'metamask-multichain-provider',
          data: {
            method: 'wallet_createSession',
            params: {},
            id: 1,
          },
        };

        await onClientMessageCallback(walletCreateSessionPayload);

        expect(NavigationService.navigation?.goBack).toHaveBeenCalledTimes(1);
        expect(
          Engine.context.ApprovalController.clearRequests,
        ).toHaveBeenCalledTimes(1);
        expect(
          Engine.context.ApprovalController.clearRequests,
        ).toHaveBeenCalledWith(
          providerErrors.userRejectedRequest({
            data: {
              cause: 'rejectAllApprovals',
            },
          }),
        );
        expect(mockBridgeInstance.send).toHaveBeenCalledWith(
          walletCreateSessionPayload,
        );
      });

      it('does not clear pending approvals or navigate away when there are no pending approval requests', async () => {
        await Connection.create(
          mockConnectionInfo,
          mockKeyManager,
          RELAY_URL,
          mockHostApp,
        );

        (
          Engine.context.ApprovalController.getTotalApprovalCount as jest.Mock
        ).mockReturnValue(0);

        const walletCreateSessionPayload = {
          name: 'metamask-multichain-provider',
          data: {
            method: 'wallet_createSession',
            params: {},
            id: 1,
          },
        };

        await onClientMessageCallback(walletCreateSessionPayload);

        expect(NavigationService.navigation?.goBack).not.toHaveBeenCalled();
        expect(
          Engine.context.ApprovalController.clearRequests,
        ).not.toHaveBeenCalled();
        expect(mockBridgeInstance.send).toHaveBeenCalledWith(
          walletCreateSessionPayload,
        );
      });
    });
  });

  describe('eager approval for direct deeplink connections', () => {
    const inlineRpc = {
      name: 'metamask-multichain-provider',
      data: { method: 'wallet_createSession', params: {}, id: 1 },
    };
    const sessionRequestWithInlineMessage = {
      ...mockConnectionRequest.sessionRequest,
      initialMessage: { type: 'message', payload: inlineRpc },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any as SessionRequest;

    it('forwards the inline initialMessage to the bridge immediately, in parallel with the handshake', async () => {
      const connection = await Connection.create(
        mockConnectionInfo,
        mockKeyManager,
        RELAY_URL,
        mockHostApp,
      );

      await connection.connect(sessionRequestWithInlineMessage);

      // The approval is driven from the inline payload without waiting on the relay.
      expect(mockBridgeInstance.send).toHaveBeenCalledWith(inlineRpc);
    });

    it('strips initialMessage before handing the request to the wallet client to avoid a duplicate approval', async () => {
      const connection = await Connection.create(
        mockConnectionInfo,
        mockKeyManager,
        RELAY_URL,
        mockHostApp,
      );

      await connection.connect(sessionRequestWithInlineMessage);

      expect(mockWalletClientInstance.connect).toHaveBeenCalledTimes(1);
      const callArg = (mockWalletClientInstance.connect as jest.Mock).mock
        .calls[0][0];
      expect(callArg.sessionRequest.initialMessage).toBeUndefined();
      expect(callArg.sessionRequest.id).toBe(
        sessionRequestWithInlineMessage.id,
      );
      expect(callArg.sessionRequest.channel).toBe(
        sessionRequestWithInlineMessage.channel,
      );
    });

    it('does not eagerly forward anything for QR flows (no initialMessage)', async () => {
      const connection = await Connection.create(
        mockConnectionInfo,
        mockKeyManager,
        RELAY_URL,
        mockHostApp,
      );

      await connection.connect(mockConnectionRequest.sessionRequest);

      expect(mockBridgeInstance.send).not.toHaveBeenCalled();
      expect(mockWalletClientInstance.connect).toHaveBeenCalledWith({
        sessionRequest: mockConnectionRequest.sessionRequest,
      });
    });

    it('rejects the eagerly-surfaced approval when the handshake fails', async () => {
      const connection = await Connection.create(
        mockConnectionInfo,
        mockKeyManager,
        RELAY_URL,
        mockHostApp,
      );

      mockWalletClientInstance.connect = jest
        .fn()
        .mockRejectedValue(new Error('handshake failed'));
      // First read (eager wallet_createSession handling) sees no pre-existing
      // approvals; the second read (rejectEagerApproval after the handshake
      // fails) sees the approval we just surfaced and clears it.
      (Engine.context.ApprovalController.getTotalApprovalCount as jest.Mock)
        .mockReturnValueOnce(0)
        .mockReturnValue(1);

      await expect(
        connection.connect(sessionRequestWithInlineMessage),
      ).rejects.toThrow('handshake failed');

      expect(NavigationService.navigation?.goBack).toHaveBeenCalledTimes(1);
      expect(
        Engine.context.ApprovalController.clearRequests,
      ).toHaveBeenCalledWith(
        providerErrors.userRejectedRequest({
          data: { cause: 'connectionFailed' },
        }),
      );
    });

    it('does not send a response until the handshake has completed', async () => {
      let resolveHandshake: () => void = () => undefined;
      mockWalletClientInstance.connect = jest.fn().mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolveHandshake = resolve;
          }),
      );

      const connection = await Connection.create(
        mockConnectionInfo,
        mockKeyManager,
        RELAY_URL,
        mockHostApp,
      );

      // Kick off the connect but leave the handshake pending.
      const connectPromise = connection.connect(
        sessionRequestWithInlineMessage,
      );

      // Approve before the handshake resolves: response must be held back.
      const responsePayload = {
        name: 'metamask-multichain-provider',
        data: { id: 1, result: { sessionScopes: {} } },
      };
      onBridgeResponseCallback(responsePayload);
      await Promise.resolve();
      await Promise.resolve();
      expect(mockWalletClientInstance.sendResponse).not.toHaveBeenCalled();

      // Once the handshake resolves, the held response is delivered.
      resolveHandshake();
      await connectPromise;
      await Promise.resolve();
      await Promise.resolve();
      expect(mockWalletClientInstance.sendResponse).toHaveBeenCalledWith(
        responsePayload,
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

    it('shows internal error toast for server-range error codes (-32000 to -32099)', async () => {
      await Connection.create(
        mockConnectionInfo,
        mockKeyManager,
        RELAY_URL,
        mockHostApp,
      );

      const errorResponsePayload = {
        data: {
          id: 1,
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'Server error',
          },
        },
      };

      onBridgeResponseCallback(errorResponsePayload);

      expect(mockHostApp.showInternalError).toHaveBeenCalledTimes(1);
      expect(mockHostApp.showInternalError).toHaveBeenCalledWith(
        mockConnectionInfo,
      );
      expect(mockHostApp.showMethodError).not.toHaveBeenCalled();
      expect(mockHostApp.showConfirmationRejectionError).not.toHaveBeenCalled();
      expect(mockHostApp.showReturnToApp).not.toHaveBeenCalled();

      expect(mockWalletClientInstance.sendResponse).toHaveBeenCalledTimes(1);
      expect(mockWalletClientInstance.sendResponse).toHaveBeenCalledWith(
        errorResponsePayload,
      );
    });

    it('shows internal error toast for JSON-RPC internal error code (-32603)', async () => {
      await Connection.create(
        mockConnectionInfo,
        mockKeyManager,
        RELAY_URL,
        mockHostApp,
      );

      const errorResponsePayload = {
        data: {
          id: 1,
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal error',
          },
        },
      };

      onBridgeResponseCallback(errorResponsePayload);

      expect(mockHostApp.showInternalError).toHaveBeenCalledTimes(1);
      expect(mockHostApp.showInternalError).toHaveBeenCalledWith(
        mockConnectionInfo,
      );
      expect(mockHostApp.showMethodError).not.toHaveBeenCalled();
      expect(mockHostApp.showReturnToApp).not.toHaveBeenCalled();

      expect(mockWalletClientInstance.sendResponse).toHaveBeenCalledTimes(1);
    });

    it('shows method error toast for non-rejection, non-internal error codes', async () => {
      await Connection.create(
        mockConnectionInfo,
        mockKeyManager,
        RELAY_URL,
        mockHostApp,
      );

      const errorResponsePayload = {
        data: {
          id: 1,
          jsonrpc: '2.0',
          error: {
            code: 53,
            reason: 'Invalid URL',
          },
        },
      };

      onBridgeResponseCallback(errorResponsePayload);

      expect(mockHostApp.showMethodError).toHaveBeenCalledTimes(1);
      expect(mockHostApp.showMethodError).toHaveBeenCalledWith(
        mockConnectionInfo,
      );
      expect(mockHostApp.showInternalError).not.toHaveBeenCalled();
      expect(mockHostApp.showConfirmationRejectionError).not.toHaveBeenCalled();
      expect(mockHostApp.showReturnToApp).not.toHaveBeenCalled();

      expect(mockWalletClientInstance.sendResponse).toHaveBeenCalledTimes(1);
      expect(mockWalletClientInstance.sendResponse).toHaveBeenCalledWith(
        errorResponsePayload,
      );
    });

    it('shows confirmation rejection error toast for EVM user rejected request (4001)', async () => {
      await Connection.create(
        mockConnectionInfo,
        mockKeyManager,
        RELAY_URL,
        mockHostApp,
      );

      const userRejectedErrorResponsePayload = {
        data: {
          id: 1,
          jsonrpc: '2.0',
          error: {
            code: errorCodes.provider.userRejectedRequest,
            message: 'User rejected the request',
          },
        },
      };

      onBridgeResponseCallback(userRejectedErrorResponsePayload);

      expect(mockHostApp.showConfirmationRejectionError).toHaveBeenCalledTimes(
        1,
      );
      expect(mockHostApp.showConfirmationRejectionError).toHaveBeenCalledWith(
        mockConnectionInfo,
      );
      expect(mockHostApp.showMethodError).not.toHaveBeenCalled();
      expect(mockHostApp.showInternalError).not.toHaveBeenCalled();
      expect(mockHostApp.showReturnToApp).not.toHaveBeenCalled();

      expect(mockWalletClientInstance.sendResponse).toHaveBeenCalledTimes(1);
      expect(mockWalletClientInstance.sendResponse).toHaveBeenCalledWith(
        userRejectedErrorResponsePayload,
      );
    });

    it('shows confirmation rejection error toast for Solana user rejection (5000)', async () => {
      await Connection.create(
        mockConnectionInfo,
        mockKeyManager,
        RELAY_URL,
        mockHostApp,
      );

      const solanaRejectionPayload = {
        data: {
          id: 1,
          jsonrpc: '2.0',
          error: {
            code: 5000,
            message: 'User rejected the request',
          },
        },
      };

      onBridgeResponseCallback(solanaRejectionPayload);

      expect(mockHostApp.showConfirmationRejectionError).toHaveBeenCalledTimes(
        1,
      );
      expect(mockHostApp.showConfirmationRejectionError).toHaveBeenCalledWith(
        mockConnectionInfo,
      );
      expect(mockHostApp.showMethodError).not.toHaveBeenCalled();
      expect(mockHostApp.showInternalError).not.toHaveBeenCalled();
      expect(mockHostApp.showReturnToApp).not.toHaveBeenCalled();

      expect(mockWalletClientInstance.sendResponse).toHaveBeenCalledTimes(1);
    });

    it('shows rejection toast when SnapKeyring strips the code but message contains rejection text', async () => {
      await Connection.create(
        mockConnectionInfo,
        mockKeyManager,
        RELAY_URL,
        mockHostApp,
      );

      const snapKeyringRejectionPayload = {
        data: {
          id: 1,
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Request rejected by user or snap.',
          },
        },
      };

      onBridgeResponseCallback(snapKeyringRejectionPayload);

      expect(mockHostApp.showConfirmationRejectionError).toHaveBeenCalledTimes(
        1,
      );
      expect(mockHostApp.showConfirmationRejectionError).toHaveBeenCalledWith(
        mockConnectionInfo,
      );
      expect(mockHostApp.showInternalError).not.toHaveBeenCalled();
      expect(mockHostApp.showMethodError).not.toHaveBeenCalled();
      expect(mockHostApp.showReturnToApp).not.toHaveBeenCalled();

      expect(mockWalletClientInstance.sendResponse).toHaveBeenCalledTimes(1);
    });

    it('shows rejection toast when error message contains "User rejected" regardless of code', async () => {
      await Connection.create(
        mockConnectionInfo,
        mockKeyManager,
        RELAY_URL,
        mockHostApp,
      );

      const wrappedRejectionPayload = {
        data: {
          id: 1,
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'User rejected the request',
          },
        },
      };

      onBridgeResponseCallback(wrappedRejectionPayload);

      expect(mockHostApp.showConfirmationRejectionError).toHaveBeenCalledTimes(
        1,
      );
      expect(mockHostApp.showInternalError).not.toHaveBeenCalled();
      expect(mockHostApp.showMethodError).not.toHaveBeenCalled();

      expect(mockWalletClientInstance.sendResponse).toHaveBeenCalledTimes(1);
    });

    it('logs error payload at warn level when error toast is shown', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      await Connection.create(
        mockConnectionInfo,
        mockKeyManager,
        RELAY_URL,
        mockHostApp,
      );

      const errorResponsePayload = {
        data: {
          id: 1,
          jsonrpc: '2.0',
          error: {
            code: 53,
            message: 'Invalid URL',
          },
        },
      };

      onBridgeResponseCallback(errorResponsePayload);

      expect(warnSpy).toHaveBeenCalledWith(
        '[SDKConnectV2]',
        'RPC error response',
        {
          connectionId: mockConnectionInfo.id,
          code: 53,
          message: 'Invalid URL',
        },
      );

      warnSpy.mockRestore();
    });

    it('shows success toast for successful response with result', async () => {
      await Connection.create(
        mockConnectionInfo,
        mockKeyManager,
        RELAY_URL,
        mockHostApp,
      );

      const successResponsePayload = {
        data: {
          id: 1,
          jsonrpc: '2.0',
          result: ['0x123'],
        },
      };

      // Simulate the RPCBridgeAdapter emitting a success response
      onBridgeResponseCallback(successResponsePayload);

      // Should show success toast, not error toast
      expect(mockHostApp.showReturnToApp).toHaveBeenCalledTimes(1);
      expect(mockHostApp.showReturnToApp).toHaveBeenCalledWith(
        mockConnectionInfo,
      );
      expect(mockHostApp.showConnectionError).not.toHaveBeenCalled();

      // And still send the response to the client
      expect(mockWalletClientInstance.sendResponse).toHaveBeenCalledTimes(1);
      expect(mockWalletClientInstance.sendResponse).toHaveBeenCalledWith(
        successResponsePayload,
      );
    });
  });

  describe('silent read-only methods', () => {
    it.each([['eth_accounts'], ['eth_chainId']])(
      'suppresses the return-to-app toast for a successful %s response but still relays it to the dapp',
      async (method) => {
        await Connection.create(
          mockConnectionInfo,
          mockKeyManager,
          RELAY_URL,
          mockHostApp,
        );

        const requestPayload = {
          name: 'metamask-provider',
          data: { id: 42, method, params: [] },
        };
        await onClientMessageCallback(requestPayload);

        const responsePayload = {
          name: 'metamask-provider',
          data: { id: 42, jsonrpc: '2.0', result: ['0xabc'] },
        };
        onBridgeResponseCallback(responsePayload);

        expect(mockHostApp.showReturnToApp).not.toHaveBeenCalled();
        expect(mockHostApp.showMethodError).not.toHaveBeenCalled();
        expect(mockHostApp.showInternalError).not.toHaveBeenCalled();
        expect(
          mockHostApp.showConfirmationRejectionError,
        ).not.toHaveBeenCalled();

        expect(mockWalletClientInstance.sendResponse).toHaveBeenCalledTimes(1);
        expect(mockWalletClientInstance.sendResponse).toHaveBeenCalledWith(
          responsePayload,
        );
      },
    );

    it.each([['eth_accounts'], ['eth_chainId']])(
      'suppresses error toasts for a failed %s response but still relays it to the dapp',
      async (method) => {
        await Connection.create(
          mockConnectionInfo,
          mockKeyManager,
          RELAY_URL,
          mockHostApp,
        );

        const requestPayload = {
          name: 'metamask-provider',
          data: { id: 7, method, params: [] },
        };
        await onClientMessageCallback(requestPayload);

        const errorResponsePayload = {
          name: 'metamask-provider',
          data: {
            id: 7,
            jsonrpc: '2.0',
            error: { code: -32603, message: 'Internal error' },
          },
        };
        onBridgeResponseCallback(errorResponsePayload);

        expect(mockHostApp.showReturnToApp).not.toHaveBeenCalled();
        expect(mockHostApp.showMethodError).not.toHaveBeenCalled();
        expect(mockHostApp.showInternalError).not.toHaveBeenCalled();
        expect(
          mockHostApp.showConfirmationRejectionError,
        ).not.toHaveBeenCalled();

        expect(mockWalletClientInstance.sendResponse).toHaveBeenCalledTimes(1);
        expect(mockWalletClientInstance.sendResponse).toHaveBeenCalledWith(
          errorResponsePayload,
        );
      },
    );

    it('still shows the return-to-app toast for non-silent methods', async () => {
      await Connection.create(
        mockConnectionInfo,
        mockKeyManager,
        RELAY_URL,
        mockHostApp,
      );

      const requestPayload = {
        name: 'metamask-provider',
        data: { id: 9, method: 'personal_sign', params: [] },
      };
      await onClientMessageCallback(requestPayload);

      const responsePayload = {
        name: 'metamask-provider',
        data: { id: 9, jsonrpc: '2.0', result: '0xsignature' },
      };
      onBridgeResponseCallback(responsePayload);

      expect(mockHostApp.showReturnToApp).toHaveBeenCalledTimes(1);
      expect(mockHostApp.showReturnToApp).toHaveBeenCalledWith(
        mockConnectionInfo,
      );
      expect(mockWalletClientInstance.sendResponse).toHaveBeenCalledWith(
        responsePayload,
      );
    });

    it('only suppresses toasts once per tracked id (subsequent responses with the same id are treated normally)', async () => {
      await Connection.create(
        mockConnectionInfo,
        mockKeyManager,
        RELAY_URL,
        mockHostApp,
      );

      const requestPayload = {
        name: 'metamask-provider',
        data: { id: 1, method: 'eth_accounts', params: [] },
      };
      await onClientMessageCallback(requestPayload);

      const responsePayload = {
        name: 'metamask-provider',
        data: { id: 1, jsonrpc: '2.0', result: ['0xabc'] },
      };
      onBridgeResponseCallback(responsePayload);
      onBridgeResponseCallback(responsePayload);

      expect(mockHostApp.showReturnToApp).toHaveBeenCalledTimes(1);
      expect(mockWalletClientInstance.sendResponse).toHaveBeenCalledTimes(2);
    });
  });
});
