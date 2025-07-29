/* eslint-disable @typescript-eslint/ban-ts-comment */
import { KeyringController } from '@metamask/keyring-controller';
import { NetworkController } from '@metamask/network-controller';
import {
  CommunicationLayerMessage,
  MessageType,
  isAnalyticsTrackedRpcMethod,
  OriginatorInfo,
} from '@metamask/sdk-communication-layer';
import Engine from '../../Engine';
import { Connection } from '../Connection';
import DevLogger from '../utils/DevLogger';
import {
  waitForConnectionReadiness,
  waitForKeychainUnlocked,
} from '../utils/wait.util';
import checkPermissions from './checkPermissions';
import handleConnectionMessage from './handleConnectionMessage';
import handleCustomRpcCalls from './handleCustomRpcCalls';
import handleSendMessage from './handleSendMessage';
import { createMockInternalAccount } from '../../../util/test/accountsControllerTestUtils';
import { AccountsController } from '@metamask/accounts-controller';
import { toChecksumHexAddress } from '@metamask/controller-utils';
import { NETWORKS_CHAIN_ID } from '../../../../app/constants/network';
import { mockNetworkState } from '../../../util/test/network';
import { analytics } from '@metamask/sdk-analytics';

jest.mock('@metamask/sdk-analytics', () => ({
  analytics: {
    track: jest.fn(),
  },
}));

jest.mock('@metamask/sdk-communication-layer', () => ({
  ...jest.requireActual('@metamask/sdk-communication-layer'),
  isAnalyticsTrackedRpcMethod: jest.fn(),
  SendAnalytics: jest.fn(),
}));

jest.mock('../../Engine');
jest.mock('@metamask/keyring-controller');
jest.mock('@metamask/network-controller');
jest.mock('@metamask/accounts-controller');
jest.mock('@metamask/sdk-communication-layer');
jest.mock('../utils/DevLogger');
jest.mock('../../../util/Logger');
jest.mock('../utils/wait.util');
jest.mock('./checkPermissions');
jest.mock('./handleCustomRpcCalls');
jest.mock('./handleSendMessage');

const MOCK_ADDRESS = '0xc4955c0d639d99699bfd7ec54d9fafee40e4d272';
const MOCK_INTERNAL_ACCOUNT = createMockInternalAccount(
  MOCK_ADDRESS,
  'Account 1',
);

describe('handleConnectionMessage', () => {
  const mockHandleSendMessage = handleSendMessage as jest.MockedFunction<
    typeof handleSendMessage
  >;

  const mockHandleCustomRpcCalls = handleCustomRpcCalls as jest.MockedFunction<
    typeof handleCustomRpcCalls
  >;

  const mockCheckPermissions = checkPermissions as jest.MockedFunction<
    typeof checkPermissions
  >;

  const mockWaitForConnectionReadiness =
    waitForConnectionReadiness as jest.MockedFunction<
      typeof waitForConnectionReadiness
    >;

  const mockWaitForKeychainUnlocked =
    waitForKeychainUnlocked as jest.MockedFunction<
      typeof waitForKeychainUnlocked
    >;

  const mockDevLoggerLog = DevLogger.log as jest.MockedFunction<
    typeof DevLogger.log
  >;

  const mockSetLoading = jest.fn();
  const mockOnTerminate = jest.fn();
  const mockSendAuthorized = jest.fn();
  const mockBackgroundBridgeOnMessage = jest.fn();

  let connection = {} as unknown as Connection;
  let message = {
    id: '01',
    method: 'eth_requestAccounts',
    params: [],
  } as unknown as CommunicationLayerMessage;

  const mockGetId = jest.fn();
  const mockAdd = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    connection = {
      channelId: '1',
      setLoading: mockSetLoading,
      onTerminate: mockOnTerminate,
      sendAuthorized: mockSendAuthorized,
      rpcQueueManager: {
        getId: mockGetId,
        add: mockAdd,
      },
      remote: {
        hasRelayPersistence: () => false,
      },
      backgroundBridge: {
        onMessage: mockBackgroundBridgeOnMessage,
      },
    } as unknown as Connection;

    (Engine.context as unknown) = {
      KeyringController: {} as unknown as KeyringController,
      NetworkController: {
        getNetworkClientById: () => ({
          configuration: {
            chainId: '0x1',
          },
        }),
        state: {
          ...mockNetworkState({
            chainId: '0x1',
            id: 'mainnet',
            nickname: 'Ethereum Mainnet',
            ticker: 'ETH',
            blockExplorerUrl: 'https://goerli.lineascan.build',
          }),
        },
      } as unknown as NetworkController,
      AccountsController: {
        getSelectedAccount: jest.fn().mockReturnValue(MOCK_INTERNAL_ACCOUNT),
      } as unknown as AccountsController,
    };

    message = {
      type: MessageType.OTP,
      method: '',
      id: '',
    } as unknown as CommunicationLayerMessage;

    message.type = MessageType.JSONRPC;
    message.method = 'eth_requestAccounts';
    message.id = '1';

    mockHandleSendMessage.mockResolvedValue();
  });

  describe('Analytics tracking for wallet_action_received', () => {
    const mockIsAnalyticsTrackedRpcMethod =
      isAnalyticsTrackedRpcMethod as jest.Mock;

    beforeEach(() => {
      mockIsAnalyticsTrackedRpcMethod.mockClear();
      (analytics.track as jest.Mock).mockClear();

      connection.originatorInfo = {
        url: 'https://test-dapp.com',
        title: 'Test Dapp',
        platform: 'web',
        dappId: 'test-dapp-id',
        icon: 'https://test-dapp.com/icon.png',
        scheme: 'https',
        source: 'browser',
        apiVersion: '1.0.0',
        connector: 'metamask',
        anonId: 'test-anon-id',
      } as OriginatorInfo;
      message.method = 'eth_requestAccounts';
      message.id = 'rpc-123';
      message.type = MessageType.JSONRPC;
    });

    it('should track wallet_action_received when anonId is present and method is tracked', async () => {
      mockIsAnalyticsTrackedRpcMethod.mockReturnValue(true);

      await handleConnectionMessage({ message, engine: Engine, connection });

      expect(analytics.track).toHaveBeenCalledWith('wallet_action_received', {
        anon_id: 'test-anon-id',
      });
      expect(analytics.track).toHaveBeenCalledTimes(1);
      expect(mockIsAnalyticsTrackedRpcMethod).toHaveBeenCalledWith(
        'eth_requestAccounts',
      );
    });

    it('should not track wallet_action_received if anonId is missing', async () => {
      mockIsAnalyticsTrackedRpcMethod.mockReturnValue(true);
      if (connection.originatorInfo) {
        connection.originatorInfo.anonId = undefined;
      }

      await handleConnectionMessage({ message, engine: Engine, connection });

      expect(analytics.track).not.toHaveBeenCalled();
    });

    it('should not track wallet_action_received if method is not analytics tracked', async () => {
      mockIsAnalyticsTrackedRpcMethod.mockReturnValue(false);

      await handleConnectionMessage({ message, engine: Engine, connection });

      expect(analytics.track).not.toHaveBeenCalled();
    });

    it('should not track wallet_action_received if message.method is undefined', async () => {
      mockIsAnalyticsTrackedRpcMethod.mockReturnValue(true);

      // Create a new message object for this specific test case to avoid type issues
      const messageWithUndefinedMethod: CommunicationLayerMessage = {
        // Explicitly define all required fields of CommunicationLayerMessage
        id: 'rpc-invalid',
        type: MessageType.JSONRPC,
        method: undefined as unknown as string, // Force method to be undefined here, then cast to string via unknown
        params: [], // Provide a default or appropriate value
        jsonrpc: '2.0', // Assuming this is part of the type or a default
        // Add any other mandatory fields from CommunicationLayerMessage
      };

      await handleConnectionMessage({
        message: messageWithUndefinedMethod,
        engine: Engine,
        connection,
      });

      expect(analytics.track).not.toHaveBeenCalled();
      // The DevLogger for invalid message should be hit earlier in this case
      expect(mockDevLoggerLog).toHaveBeenCalledWith(
        `Connection::onMessage invalid message`,
        expect.objectContaining({ method: undefined }),
      );
    });
  });

  describe('Handling specific message types', () => {
    it('should handle termination messages correctly', async () => {
      message.type = MessageType.TERMINATE;

      await handleConnectionMessage({ message, engine: Engine, connection });

      expect(connection.onTerminate).toHaveBeenCalledTimes(1);
      expect(connection.onTerminate).toHaveBeenCalledWith({
        channelId: connection.channelId,
      });
    });
    it('should log and return on ping messages', async () => {
      message.type = MessageType.PING;

      await handleConnectionMessage({ message, engine: Engine, connection });

      expect(mockDevLoggerLog).toHaveBeenCalledTimes(1);
      expect(mockDevLoggerLog).toHaveBeenCalledWith(
        `Connection::ping id=${connection.channelId}`,
      );
    });
    it('should log and return on invalid messages', async () => {
      // @ts-ignore
      message.type = 'fsdfsdf';
      message.method = '';
      message.id = '';

      await handleConnectionMessage({ message, engine: Engine, connection });

      expect(mockDevLoggerLog).toHaveBeenCalledTimes(1);
      expect(mockDevLoggerLog).toHaveBeenCalledWith(
        `Connection::onMessage invalid message`,
        message,
      );
    });
  });

  describe('General message handling', () => {
    beforeEach(() => {
      message.type = MessageType.JSONRPC;
      message.method = 'eth_requestAccounts';
      message.id = '1';
    });
    it('should set loading to false', async () => {
      await handleConnectionMessage({ message, engine: Engine, connection });

      expect(mockSetLoading).toHaveBeenCalledTimes(1);
      expect(mockSetLoading).toHaveBeenCalledWith(false);
    });
    it('should wait for keychain to be unlocked before handling RPC calls', async () => {
      await handleConnectionMessage({ message, engine: Engine, connection });

      expect(mockWaitForKeychainUnlocked).toHaveBeenCalledTimes(1);
      expect(mockWaitForKeychainUnlocked).toHaveBeenCalledWith({
        keyringController: Engine.context.KeyringController,
        context: 'connection::on_message',
      });
    });
    it('should retrieve necessary data from the engine context', async () => {
      await handleConnectionMessage({ message, engine: Engine, connection });

      expect(Engine.context.KeyringController).toBeDefined();
      expect(Engine.context.NetworkController).toBeDefined();
      expect(Engine.context.AccountsController).toBeDefined();
    });
    it('should wait for connection readiness', async () => {
      await handleConnectionMessage({ message, engine: Engine, connection });

      expect(mockWaitForConnectionReadiness).toHaveBeenCalledTimes(1);
      expect(mockWaitForConnectionReadiness).toHaveBeenCalledWith({
        connection,
      });
    });
    it('should handle the sendAuthorized process', async () => {
      await handleConnectionMessage({ message, engine: Engine, connection });

      expect(mockSendAuthorized).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error handling during permissions check', () => {
    beforeEach(() => {
      mockCheckPermissions.mockRejectedValueOnce(new Error('test error'));
    });

    it('should send error message using handleSendMessage on permission error', async () => {
      await handleConnectionMessage({ message, engine: Engine, connection });

      expect(mockCheckPermissions).toBeCalledTimes(1);

      expect(mockHandleSendMessage).toHaveBeenCalledTimes(1);
      expect(mockHandleSendMessage).toHaveBeenCalledWith({
        connection,
        msg: {
          data: {
            error: new Error('test error'),
            id: message.id,
            jsonrpc: '2.0',
          },
          name: 'metamask-provider',
        },
      });
    });
  });

  describe('Handling custom RPC calls', () => {
    beforeEach(() => {
      mockCheckPermissions.mockResolvedValueOnce(true);
    });
    it('should process custom RPC calls correctly', async () => {
      await handleConnectionMessage({ message, engine: Engine, connection });

      expect(mockHandleCustomRpcCalls).toHaveBeenCalledTimes(1);
      expect(mockHandleCustomRpcCalls).toHaveBeenCalledWith({
        batchRPCManager: connection.batchRPCManager,
        navigation: undefined,
        connection,
        selectedAddress: toChecksumHexAddress(MOCK_ADDRESS),
        selectedChainId: NETWORKS_CHAIN_ID.MAINNET,
        rpc: {
          method: message.method,
          params: message.params,
          id: message.id,
        },
      });
    });
  });

  describe('RPC Queue Manager interactions', () => {
    beforeEach(() => {
      mockCheckPermissions.mockResolvedValueOnce(true);
      mockGetId.mockReturnValue(null); // Simulate that the message hasn't been processed
    });

    describe('When handleCustomRpcCalls return processedRpc', () => {
      let processedRpc: {
        method: string;
        id: string;
        params: unknown[];
        jsonrpc: string;
      };

      beforeEach(() => {
        processedRpc = {
          method: 'eth_requestAccounts',
          id: '1',
          params: [],
          jsonrpc: '2.0',
        };

        mockHandleCustomRpcCalls.mockResolvedValueOnce(processedRpc);
      });

      it('should add processed RPC to the RPC queue', async () => {
        await handleConnectionMessage({ message, engine: Engine, connection });

        expect(mockAdd).toHaveBeenCalledTimes(1);
        expect(mockAdd).toHaveBeenCalledWith({
          id: processedRpc.id,
          method: processedRpc.method,
        });
      });
    });

    describe('When handleCustomRpcCalls do NOT return processedRpc', () => {
      beforeEach(() => {
        mockHandleCustomRpcCalls.mockResolvedValueOnce(undefined);
      });

      it('should not add processed RPC to the RPC queue', async () => {
        await handleConnectionMessage({ message, engine: Engine, connection });

        expect(mockAdd).not.toHaveBeenCalled();
      });
    });
  });

  describe('Background Bridge interactions', () => {
    let processedRpc: {
      method: string;
      id: string;
      params: unknown[];
      jsonrpc: string;
    };
    beforeEach(() => {
      processedRpc = {
        method: 'eth_requestAccounts',
        id: '1',
        params: [],
        jsonrpc: '2.0',
      };

      mockHandleCustomRpcCalls.mockResolvedValueOnce(processedRpc);
      mockCheckPermissions.mockResolvedValueOnce(true);
    });

    it('should send the processed RPC message to the background bridge', async () => {
      await handleConnectionMessage({ message, engine: Engine, connection });

      expect(mockBackgroundBridgeOnMessage).toHaveBeenCalledTimes(1);
      expect(mockBackgroundBridgeOnMessage).toHaveBeenCalledWith({
        name: 'metamask-provider',
        data: processedRpc,
        origin: 'sdk',
      });
    });
  });
});
