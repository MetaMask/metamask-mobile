/* eslint-disable @typescript-eslint/ban-ts-comment */
import { Linking } from 'react-native';
import Engine from '../../../core/Engine';
import Logger from '../../../util/Logger';
import BackgroundBridge from '../../BackgroundBridge/BackgroundBridge';
import SDKConnect from '../SDKConnect';
import handleBatchRpcResponse from '../handlers/handleBatchRpcResponse';
import handleCustomRpcCalls from '../handlers/handleCustomRpcCalls';
import DevLogger from '../utils/DevLogger';
import DeeplinkProtocolService from './DeeplinkProtocolService';
import AppConstants from '../../AppConstants';
import { DappClient } from '../dapp-sdk-types';
import { createMockInternalAccount } from '../../../util/test/accountsControllerTestUtils';
import { toChecksumHexAddress } from '@metamask/controller-utils';
import { analytics } from '@metamask/sdk-analytics';

jest.mock('../SDKConnect');
jest.mock('react-native');
jest.mock('../utils/wait.util', () => ({
  wait: jest.fn().mockResolvedValue(undefined),
  waitForKeychainUnlocked: jest.fn().mockResolvedValue(true),
}));
jest.mock('@metamask/sdk-analytics', () => ({
  analytics: {
    track: jest.fn(),
  },
}));
jest.mock('../../BackgroundBridge/BackgroundBridge');
jest.mock('../utils/DevLogger');
jest.mock('../../../util/Logger');
jest.mock('../handlers/handleCustomRpcCalls');
jest.mock('../handlers/handleBatchRpcResponse');
jest.mock('../../Permissions', () => ({
  ...jest.requireActual('../../Permissions'),
  getPermittedAccounts: jest.fn().mockReturnValue([]),
}));

const MOCK_ADDRESS = '0xc4955c0d639d99699bfd7ec54d9fafee40e4d272';
const mockInternalAccount = createMockInternalAccount(
  MOCK_ADDRESS,
  'Account 1',
);

describe('DeeplinkProtocolService', () => {
  let service: DeeplinkProtocolService;

  beforeEach(() => {
    jest.clearAllMocks();
    (SDKConnect.getInstance as jest.Mock).mockReturnValue({
      loadDappConnections: jest.fn().mockResolvedValue({
        connection1: {
          id: 'connection1',
          originatorInfo: { url: 'test.com', title: 'Test' },
          validUntil: Date.now(),
          scheme: 'scheme1',
        },
      }),
      addDappConnection: jest.fn().mockResolvedValue(null),
    });

    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Engine.context as any) = {
      PermissionController: {
        requestPermissions: jest.fn().mockResolvedValue(null),
        getPermissions: jest
          .fn()
          .mockReturnValue({ eth_accounts: { caveats: [{ value: [] }] } }),
      },
      KeyringController: { unlock: jest.fn() },
      NetworkController: {
        getNetworkClientById: () => ({
          configuration: {
            chainId: '0x1',
          },
        }),
      },
      AccountsController: {
        getSelectedAccount: jest.fn().mockReturnValue(mockInternalAccount),
      },
    };

    (Linking.openURL as jest.Mock).mockResolvedValue(null);
    service = new DeeplinkProtocolService();
  });

  describe('init', () => {
    it('should initialize and load connections', async () => {
      const spy = jest.spyOn(SDKConnect.getInstance(), 'loadDappConnections');
      await service.init();
      expect(spy).toHaveBeenCalled();
      expect(service.isInitialized).toBe(true);
    });

    it('should handle initialization error', async () => {
      (
        SDKConnect.getInstance().loadDappConnections as jest.Mock
      ).mockRejectedValue(new Error('Failed to load connections'));
      await service.init().catch(() => {
        expect(service.isInitialized).toBe(false);
        expect(Logger.log).toHaveBeenCalledWith(
          expect.any(Error),
          'DeeplinkProtocolService:: error initializing',
        );
      });
    });

    it('should initialize with raw connections', async () => {
      await service.init();
      expect(service.connections.connection1).toBeDefined();
    });
  });

  describe('setupBridge', () => {
    it('should set up a bridge for the client', () => {
      const clientInfo = {
        clientId: 'client1',
        originatorInfo: {
          url: 'test.com',
          title: 'Test',
          platform: 'test',
          dappId: 'dappId',
        },
        connected: false,
        validUntil: Date.now(),
        scheme: 'test',
      };
      service.setupBridge(clientInfo);
      expect(service.bridgeByClientId[clientInfo.clientId]).toBeInstanceOf(
        BackgroundBridge,
      );
    });

    it('should return early if bridge already exists', () => {
      const clientInfo = {
        clientId: 'client1',
        originatorInfo: {
          url: 'test.com',
          title: 'Test',
          platform: 'test',
          dappId: 'dappId',
        },
        connected: false,
        validUntil: Date.now(),
        scheme: 'test',
      };
      service.bridgeByClientId.client1 = {} as BackgroundBridge;
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const setupBridgeSpy = jest.spyOn(service as any, 'setupBridge');
      service.setupBridge(clientInfo);
      expect(setupBridgeSpy).toHaveReturned();
    });

    it('should throw error when originatorInfo.url is "metamask"', () => {
      const clientInfo: DappClient = {
        clientId: 'client1',
        originatorInfo: {
          url: 'metamask',
          title: 'Test',
          platform: 'test',
          dappId: 'dappId',
        },
        connected: false,
        validUntil: Date.now(),
        scheme: 'test',
      };

      expect(() => service.setupBridge(clientInfo)).toThrow(
        'Connections from metamask origin are not allowed',
      );
      expect(service.bridgeByClientId[clientInfo.clientId]).toBeUndefined();
    });

    it('should throw error when originatorInfo.title is "metamask"', () => {
      const clientInfo: DappClient = {
        clientId: 'client1',
        originatorInfo: {
          url: 'https://example.com',
          title: 'metamask',
          platform: 'test',
          dappId: 'dappId',
        },
        connected: false,
        validUntil: Date.now(),
        scheme: 'test',
      };

      expect(() => service.setupBridge(clientInfo)).toThrow(
        'Connections from metamask origin are not allowed',
      );
      expect(service.bridgeByClientId[clientInfo.clientId]).toBeUndefined();
    });

    it('should allow connection when originatorInfo contains "metamask" as substring', () => {
      const clientInfo: DappClient = {
        clientId: 'client1',
        originatorInfo: {
          url: 'https://my-metamask-dapp.com',
          title: 'My MetaMask App',
          platform: 'test',
          dappId: 'dappId',
        },
        connected: false,
        validUntil: Date.now(),
        scheme: 'test',
      };

      expect(() => service.setupBridge(clientInfo)).not.toThrow();
      expect(service.bridgeByClientId[clientInfo.clientId]).toBeInstanceOf(
        BackgroundBridge,
      );
    });

    it('should allow connection when originatorInfo has valid url and title', () => {
      const clientInfo: DappClient = {
        clientId: 'client1',
        originatorInfo: {
          url: 'https://example.com',
          title: 'Example Dapp',
          platform: 'test',
          dappId: 'dappId',
        },
        connected: false,
        validUntil: Date.now(),
        scheme: 'test',
      };

      expect(() => service.setupBridge(clientInfo)).not.toThrow();
      expect(service.bridgeByClientId[clientInfo.clientId]).toBeInstanceOf(
        BackgroundBridge,
      );
    });
  });
  describe('sendMessage', () => {
    it('should handle sending messages correctly', async () => {
      service.rpcQueueManager.getId = jest.fn().mockReturnValue('rpcMethod');
      service.batchRPCManager.getById = jest.fn().mockReturnValue(null);
      service.rpcQueueManager.isEmpty = jest.fn().mockReturnValue(true);
      service.rpcQueueManager.remove = jest.fn(); // Mock the remove method

      await service.sendMessage({ data: { id: '1' } }, true);
      expect(service.rpcQueueManager.remove).toHaveBeenCalledWith('1');
    });

    it('should handle batch RPC responses', async () => {
      const mockChainRPCs = [{ id: '1' }];
      const mockMessage = {
        data: { id: '1', accounts: [], chainId: '0x1', error: null },
      };
      service.batchRPCManager.getById = jest
        .fn()
        .mockReturnValue(mockChainRPCs);
      (handleBatchRpcResponse as jest.Mock).mockResolvedValue(true);

      service.currentClientId = 'client1';
      service.bridgeByClientId.client1 = new BackgroundBridge({
        webview: null,
        channelId: 'client1',
        isMMSDK: true,
        url: 'test-url',
        isRemoteConn: true,
        sendMessage: jest.fn(),
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      await service.sendMessage(mockMessage, true);
      expect(handleBatchRpcResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          chainRpcs: mockChainRPCs,
          msg: mockMessage,
          backgroundBridge: expect.any(BackgroundBridge),
          batchRPCManager: expect.anything(),
          sendMessage: expect.any(Function),
        }),
      );
    });

    it('should handle error in message data', async () => {
      const mockMessage = {
        data: {
          id: '1',
          accounts: [],
          chainId: '0x1',
          error: new Error('Test error'),
        },
      };
      const openDeeplinkSpy = jest.spyOn(service, 'openDeeplink');

      service.currentClientId = 'client1';
      service.bridgeByClientId.client1 = new BackgroundBridge({
        webview: null,
        channelId: 'client1',
        isMMSDK: true,
        url: 'test-url',
        isRemoteConn: true,
        sendMessage: jest.fn(),
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      await service.sendMessage(mockMessage, true);
      expect(openDeeplinkSpy).toHaveBeenCalledWith({
        message: mockMessage,
        clientId: 'client1',
      });
    });

    it('should skip goBack if no rpc method and forceRedirect is not true', async () => {
      const mockMessage = { data: { id: '1' } };
      const devLoggerSpy = jest.spyOn(DevLogger, 'log');

      service.rpcQueueManager.getId = jest.fn().mockReturnValue(undefined);
      service.rpcQueueManager.isEmpty = jest.fn().mockReturnValue(true);

      await service.sendMessage(mockMessage);
      expect(devLoggerSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'no rpc method --- rpcMethod=undefined forceRedirect=undefined --- skip goBack()',
        ),
      );
    });

    it('should handle non-final batch RPC response and error in message data', async () => {
      const mockChainRPCs = [{ id: '1' }];
      const mockMessage = {
        data: {
          id: '1',
          accounts: [],
          chainId: '0x1',
          error: new Error('Test error'),
        },
      };
      const devLoggerSpy = jest.spyOn(DevLogger, 'log');
      const openDeeplinkSpy = jest.spyOn(service, 'openDeeplink');
      service.batchRPCManager.getById = jest
        .fn()
        .mockReturnValue(mockChainRPCs);
      (handleBatchRpcResponse as jest.Mock).mockResolvedValue(false);

      service.currentClientId = 'client1';
      service.bridgeByClientId.client1 = new BackgroundBridge({
        webview: null,
        channelId: 'client1',
        isMMSDK: true,
        url: 'test-url',
        isRemoteConn: true,
        sendMessage: jest.fn(),
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      service.rpcQueueManager.remove = jest.fn();

      await service.sendMessage(mockMessage, true);
      expect(devLoggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('NOT last rpc --- skip goBack()'),
        mockChainRPCs,
      );
      expect(service.rpcQueueManager.remove).toHaveBeenCalledWith('1');
      expect(openDeeplinkSpy).toHaveBeenCalledWith({
        message: mockMessage,
        clientId: 'client1',
      });
    });

    it('should update connection state and skip bridge setup if session exists', async () => {
      const connectionParams = {
        dappPublicKey: 'key',
        url: 'url',
        scheme: 'scheme',
        channelId: 'channel1',
        originatorInfo: Buffer.from(
          JSON.stringify({
            originatorInfo: {
              url: 'test.com',
              title: 'Test',
              platform: 'test',
              dappId: 'dappId',
            },
          }),
        ).toString('base64'),
      };
      service.connections.channel1 = {
        clientId: 'channel1',
        originatorInfo: {
          url: 'test.com',
          title: 'Test',
          platform: 'test',
          dappId: 'dappId',
        },
        connected: false,
        validUntil: Date.now(),
        scheme: 'scheme',
      };

      await service.handleConnection(connectionParams);

      expect(service.connections.channel1.connected).toBe(true);
    });
  });

  describe('openDeeplink', () => {
    it('should open a deeplink with the provided message', async () => {
      const spy = jest.spyOn(Linking, 'openURL');
      await service.openDeeplink({
        message: { test: 'test' },
        clientId: 'client1',
      });
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('checkPermission', () => {
    it('should request permissions', async () => {
      const spy = jest.spyOn(
        Engine.context.PermissionController,
        'requestPermissions',
      );
      await service.checkPermission({
        channelId: 'channel1',
        originatorInfo: {
          url: 'test.com',
          title: 'Test',
          platform: 'test',
          dappId: 'dappId',
        },
      });
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('handleConnection', () => {
    it('should handle a new connection', async () => {
      const connectionParams = {
        dappPublicKey: 'key',
        url: 'url',
        scheme: 'scheme',
        channelId: 'channel1',
        originatorInfo: Buffer.from(
          JSON.stringify({
            originatorInfo: { url: 'test.com', title: 'Test' },
          }),
        ).toString('base64'),
      };
      await service.handleConnection(connectionParams);
      expect(service.connections.connection1).toBeDefined();
    });
  });

  describe('handleConnectionEventAsync', () => {
    let clientInfo: DappClient;

    let params: {
      dappPublicKey: string;
      url: string;
      scheme: string;
      channelId: string;
      originatorInfo?: string;
      request?: string;
    };

    beforeEach(() => {
      clientInfo = {
        clientId: 'client1',
        originatorInfo: {
          url: 'test.com',
          title: 'Test',
          platform: 'test',
          dappId: 'dappId',
        },
        connected: false,
        validUntil: Date.now(),
        scheme: 'scheme1',
      };
      params = {
        dappPublicKey: 'key',
        url: 'url',
        scheme: 'scheme1',
        channelId: 'client1',
        originatorInfo: Buffer.from(
          JSON.stringify({
            originatorInfo: {
              url: 'test.com',
              title: 'Test',
              platform: 'test',
              dappId: 'dappId',
            },
          }),
        ).toString('base64'),
        request: JSON.stringify({ id: '1', method: 'test', params: [] }),
      };

      // Mocking methods
      service.checkPermission = jest.fn().mockResolvedValue(null);
      service.setupBridge = jest.fn();
      service.sendMessage = jest.fn().mockResolvedValue(null);
      service.processDappRpcRequest = jest.fn().mockResolvedValue(null);
      service.openDeeplink = jest.fn().mockResolvedValue(null);

      (Engine.context as unknown) = {
        PermissionController: {
          requestPermissions: jest.fn().mockResolvedValue(null),
        },
        KeyringController: {
          unlock: jest.fn().mockResolvedValue(null),
          isUnlocked: jest.fn().mockReturnValue(true),
        },
      };
    });

    it('should setup a new client bridge if the connection does not exist', async () => {
      await service.handleConnectionEventAsync({ clientInfo, params });
      expect(service.checkPermission).toHaveBeenCalledWith({
        originatorInfo: clientInfo.originatorInfo,
        channelId: clientInfo.clientId,
      });
      expect(service.setupBridge).toHaveBeenCalledWith(clientInfo);
      expect(SDKConnect.getInstance().addDappConnection).toHaveBeenCalledWith({
        id: clientInfo.clientId,
        lastAuthorized: expect.any(Number),
        origin: AppConstants.MM_SDK.IOS_SDK,
        originatorInfo: clientInfo.originatorInfo,
        otherPublicKey: service.dappPublicKeyByClientId[clientInfo.clientId],
        validUntil: expect.any(Number),
        scheme: clientInfo.scheme,
      });
    });

    it('should update existing client connection and process request if exists', async () => {
      service.connections[clientInfo.clientId] = clientInfo;
      await service.handleConnectionEventAsync({ clientInfo, params });
      expect(service.processDappRpcRequest).toHaveBeenCalledWith(params);
    });

    it('should send error message if connection event fails', async () => {
      (service.checkPermission as jest.Mock).mockRejectedValue(
        new Error('Permission error'),
      );
      await service.handleConnectionEventAsync({ clientInfo, params });
      expect(service.sendMessage).toHaveBeenCalledWith({
        data: {
          error: new Error('Permission error'),
          jsonrpc: '2.0',
        },
        name: 'metamask-provider',
      });
      expect(service.openDeeplink).toHaveBeenCalledWith({
        message: {
          data: {
            error: new Error('Permission error'),
            jsonrpc: '2.0',
          },
          name: 'metamask-provider',
        },
        clientId: '',
        scheme: clientInfo.scheme,
      });
    });
  });

  describe('processDappRpcRequest', () => {
    it('should process a dapp RPC request', async () => {
      const params = {
        dappPublicKey: 'key',
        url: 'url',
        scheme: 'scheme',
        channelId: 'channel1',
        originatorInfo: 'info',
        request: JSON.stringify({ id: '1', method: 'test', params: [] }),
      };
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      service.bridgeByClientId.channel1 = { onMessage: jest.fn() } as any;
      await service.processDappRpcRequest(params);
      expect(handleCustomRpcCalls).toHaveBeenCalled();
    });
  });

  describe('handleMessage', () => {
    it('should handle an incoming message', () => {
      const params = {
        dappPublicKey: 'key',
        url: 'url',
        message: Buffer.from(
          JSON.stringify({ id: '1', method: 'test', params: [] }),
        ).toString('base64'),
        channelId: 'channel1',
        scheme: 'scheme',
        account: `${toChecksumHexAddress(MOCK_ADDRESS)}@1`,
      };
      service.handleMessage(params);
      expect(DevLogger.log).toHaveBeenCalled();
    });
  });

  describe('removeConnection', () => {
    it('should remove a connection', () => {
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      service.connections.channel1 = {} as any;
      service.removeConnection('channel1');
      expect(service.connections.channel1).toBeUndefined();
    });
  });

  describe('processDappRpcRequest analytics', () => {
    const originatorInfoPayload = {
      originatorInfo: {
        url: 'https://test-dapp.com',
        title: 'Test Dapp',
        platform: 'web',
        dappId: 'test',
        anonId: 'rpc-anon-id-456',
      },
    };

    it('tracks wallet_action_received with rpc_method', async () => {
      await service.init();

      // Pre-seed the connection with originatorInfo containing anonId
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (service as any).connections = {
        'rpc-channel-001': {
          id: 'rpc-channel-001',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          originatorInfo: originatorInfoPayload.originatorInfo as any,
          validUntil: Date.now() + 60000,
          scheme: 'testapp',
          connected: true,
        },
      };

      // Pre-seed the bridge (processDappRpcRequest needs this.bridgeByClientId[channelId])
      const mockBridge = { onMessage: jest.fn() };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (service as any).bridgeByClientId = {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        'rpc-channel-001': mockBridge as any,
      };

      (handleCustomRpcCalls as jest.Mock).mockResolvedValueOnce({
        id: '1',
        method: 'eth_sendTransaction',
        params: [],
      });

      await service.processDappRpcRequest({
        dappPublicKey: 'test-pub-key',
        url: 'https://test-dapp.com',
        scheme: 'testapp',
        channelId: 'rpc-channel-001',
        request: JSON.stringify({
          id: '1',
          method: 'eth_sendTransaction',
          params: [],
        }),
      });

      expect(analytics.track).toHaveBeenCalledWith(
        'wallet_action_received',
        expect.objectContaining({
          anon_id: 'rpc-anon-id-456',
          transport: 'deeplink_protocol',
          rpc_method: 'eth_sendTransaction',
        }),
      );
    });

    it('does not track when anonId is absent', async () => {
      await service.init();

      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const noAnonOriginatorInfo: any = {
        url: 'https://test.com',
        title: 'Test',
        platform: 'web',
        dappId: 'test',
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (service as any).connections = {
        'rpc-no-anon-channel': {
          id: 'rpc-no-anon-channel',
          originatorInfo: noAnonOriginatorInfo,
          validUntil: Date.now() + 60000,
          scheme: 'testapp',
          connected: true,
        },
      };

      const mockBridge = { onMessage: jest.fn() };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (service as any).bridgeByClientId = {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        'rpc-no-anon-channel': mockBridge as any,
      };

      (handleCustomRpcCalls as jest.Mock).mockResolvedValueOnce({
        id: '1',
        method: 'eth_sendTransaction',
        params: [],
      });

      await service.processDappRpcRequest({
        dappPublicKey: 'test-pub-key',
        url: 'https://test-dapp.com',
        scheme: 'testapp',
        channelId: 'rpc-no-anon-channel',
        request: JSON.stringify({
          id: '1',
          method: 'eth_sendTransaction',
          params: [],
        }),
      });

      expect(analytics.track).not.toHaveBeenCalledWith(
        'wallet_action_received',
        expect.anything(),
      );
    });
  });

  describe('handleMessage analytics', () => {
    const originatorInfoPayload = {
      originatorInfo: {
        url: 'https://test-dapp.com',
        title: 'Test Dapp',
        platform: 'web',
        dappId: 'test',
        anonId: 'msg-anon-id-789',
      },
    };

    it('tracks wallet_action_received for RPC messages', async () => {
      await service.init();

      // Pre-seed connection with anonId
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (service as any).connections = {
        'msg-channel-001': {
          id: 'msg-channel-001',
          originatorInfo: originatorInfoPayload.originatorInfo,
          validUntil: Date.now() + 60000,
          scheme: 'testapp',
          connected: true,
        },
      };

      // Pre-seed bridge
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockBridge: any = { onMessage: jest.fn() };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (service as any).bridgeByClientId = { 'msg-channel-001': mockBridge };

      (handleCustomRpcCalls as jest.Mock).mockResolvedValueOnce({
        id: '1',
        method: 'personal_sign',
        params: [],
      });

      const rpcMessage = { id: '1', method: 'personal_sign', params: [] };
      const base64Message = Buffer.from(JSON.stringify(rpcMessage)).toString(
        'base64',
      );

      // Use checksummed address so it matches walletSelectedAddress (no account-changed early exit)
      service.handleMessage({
        dappPublicKey: 'test-pub-key',
        url: 'https://test-dapp.com',
        message: base64Message,
        channelId: 'msg-channel-001',
        scheme: 'testapp',
        account: `${toChecksumHexAddress(MOCK_ADDRESS)}@0x1`,
      });

      // handleMessage fires async internally — wait for it
      await new Promise((resolve) => setTimeout(resolve, 300));

      expect(analytics.track).toHaveBeenCalledWith(
        'wallet_action_received',
        expect.objectContaining({
          anon_id: 'msg-anon-id-789',
          transport: 'deeplink_protocol',
          rpc_method: 'personal_sign',
        }),
      );
    });

    it('does not track when anonId is absent', async () => {
      await service.init();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (service as any).connections = {
        'msg-no-anon-channel': {
          id: 'msg-no-anon-channel',
          originatorInfo: {
            url: 'https://test.com',
            title: 'Test',
            platform: 'web',
            dappId: 'test',
          },
          validUntil: Date.now() + 60000,
          scheme: 'testapp',
          connected: true,
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockBridgeNoAnon: any = { onMessage: jest.fn() };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (service as any).bridgeByClientId = {
        'msg-no-anon-channel': mockBridgeNoAnon,
      };

      (handleCustomRpcCalls as jest.Mock).mockResolvedValueOnce({
        id: '1',
        method: 'personal_sign',
        params: [],
      });

      const rpcMessage = { id: '1', method: 'personal_sign', params: [] };
      const base64Message = Buffer.from(JSON.stringify(rpcMessage)).toString(
        'base64',
      );

      service.handleMessage({
        dappPublicKey: 'test-pub-key',
        url: 'https://test-dapp.com',
        message: base64Message,
        channelId: 'msg-no-anon-channel',
        scheme: 'testapp',
        account: `${toChecksumHexAddress(MOCK_ADDRESS)}@0x1`,
      });

      await new Promise((resolve) => setTimeout(resolve, 300));

      expect(analytics.track).not.toHaveBeenCalledWith(
        'wallet_action_received',
        expect.anything(),
      );
    });
  });

  describe('handleConnection analytics', () => {
    const originatorInfoPayload = {
      originatorInfo: {
        url: 'https://test-dapp.com',
        title: 'Test Dapp',
        platform: 'web',
        dappId: 'test',
        anonId: 'test-anon-id-123',
      },
    };
    const base64OriginatorInfo = Buffer.from(
      JSON.stringify(originatorInfoPayload),
    ).toString('base64');

    it('tracks wallet_connection_request_received with new_session for new connections', async () => {
      await service.init();

      await service.handleConnection({
        dappPublicKey: 'test-pub-key',
        url: 'https://test-dapp.com',
        scheme: 'testapp',
        channelId: 'new-channel-123',
        originatorInfo: base64OriginatorInfo,
        sdkVersion: '2',
      });

      expect(analytics.track).toHaveBeenCalledWith(
        'wallet_connection_request_received',
        expect.objectContaining({
          anon_id: 'test-anon-id-123',
          transport: 'deeplink_protocol',
          connection_type: 'new_session',
          sdk_version: '2',
        }),
      );
    });

    it('tracks wallet_connection_request_received with reconnect for existing connections', async () => {
      await service.init();

      // Pre-seed the connection to simulate an existing session (handleConnectionEventAsync is
      // fire-and-forget, so connections are not populated synchronously by the first call)
      service.connections['reconnect-channel-456'] = {
        clientId: 'reconnect-channel-456',
        originatorInfo: originatorInfoPayload.originatorInfo,
        connected: true,
        validUntil: Date.now(),
        scheme: 'testapp',
      };

      // Second connection = reconnect
      await service.handleConnection({
        dappPublicKey: 'test-pub-key',
        url: 'https://test-dapp.com',
        scheme: 'testapp',
        channelId: 'reconnect-channel-456',
        originatorInfo: base64OriginatorInfo,
      });

      expect(analytics.track).toHaveBeenCalledWith(
        'wallet_connection_request_received',
        expect.objectContaining({
          anon_id: 'test-anon-id-123',
          transport: 'deeplink_protocol',
          connection_type: 'reconnect',
        }),
      );
    });

    it('does not track when anonId is absent from originatorInfo', async () => {
      const noAnonPayload = {
        originatorInfo: {
          url: 'https://test-dapp.com',
          title: 'Test Dapp',
          platform: 'web',
          dappId: 'test',
          // no anonId
        },
      };
      const base64NoAnon = Buffer.from(JSON.stringify(noAnonPayload)).toString(
        'base64',
      );

      await service.init();

      await service.handleConnection({
        dappPublicKey: 'test-pub-key',
        url: 'https://test-dapp.com',
        scheme: 'testapp',
        channelId: 'no-anon-channel-789',
        originatorInfo: base64NoAnon,
      });

      expect(analytics.track).not.toHaveBeenCalledWith(
        'wallet_connection_request_received',
        expect.anything(),
      );
    });
  });
});
