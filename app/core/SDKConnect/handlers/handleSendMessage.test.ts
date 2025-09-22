/* eslint-disable @typescript-eslint/no-empty-function */
import Device from '../../../util/device';
import { Connection } from '../Connection';
import { RPC_METHODS } from '../SDKConnectConstants';
import DevLogger from '../utils/DevLogger';
import { wait } from '../utils/wait.util';
import handleBatchRpcResponse from './handleBatchRpcResponse';
import handleSendMessage from './handleSendMessage'; // Adjust the import path as necessary
import { analytics } from '@metamask/sdk-analytics';
import {
  isAnalyticsTrackedRpcMethod,
  OriginatorInfo,
} from '@metamask/sdk-communication-layer';

// --- Start of Mocks ---
jest.mock('@metamask/sdk-analytics', () => ({
  analytics: {
    track: jest.fn(),
  },
}));

jest.mock('@metamask/sdk-communication-layer', () => ({
  ...jest.requireActual('@metamask/sdk-communication-layer'), // Preserve other exports
  isAnalyticsTrackedRpcMethod: jest.fn(),
}));

jest.mock('../../../util/device');
jest.mock('../utils/DevLogger');
jest.mock('./handleBatchRpcResponse');
jest.mock('../utils/wait.util');
jest.mock('../../../util/Logger');
jest.mock('../../NativeModules', () => ({
  Minimizer: {
    goBack: jest.fn(),
  },
}));
jest.mock('../../../util/device');

describe('handleSendMessage', () => {
  let mockConnection = {} as unknown as Connection;
  const mockHandleBatchRpcResponse = handleBatchRpcResponse as jest.Mock;
  const mockWait = wait as jest.Mock;
  const mockDevLogger = DevLogger.log as jest.MockedFunction<
    typeof DevLogger.log
  >;

  const mockSendMessage = jest.fn();
  const mockSetLoading = jest.fn();
  const mockRemove = jest.fn();
  const mockCanRedirect = jest.fn();
  const mockRpcQueueManagerGetId = jest.fn();
  const mockBatchRPCManagerGetById = jest.fn();
  const mockNavigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockConnection = {
      navigation: {
        navigate: mockNavigate,
      },
      remote: {
        sendMessage: mockSendMessage,
      },
      rpcQueueManager: {
        remove: mockRemove,
        canRedirect: mockCanRedirect,
        getId: mockRpcQueueManagerGetId,
      },
      batchRPCManager: {
        getById: mockBatchRPCManagerGetById,
      },
      setLoading: mockSetLoading,
      trigger: '',
    } as unknown as Connection;

    mockHandleBatchRpcResponse.mockResolvedValue(true);
    mockSendMessage.mockResolvedValue(true);
  });

  describe('Analytics tracking', () => {
    const mockIsAnalyticsTrackedRpcMethod =
      isAnalyticsTrackedRpcMethod as jest.Mock;

    beforeEach(() => {
      mockRpcQueueManagerGetId.mockReturnValue(RPC_METHODS.ETH_REQUESTACCOUNTS); // Example tracked method
      mockIsAnalyticsTrackedRpcMethod.mockReturnValue(true);
      mockConnection.originatorInfo = {
        anonId: 'test-anon-id',
      } as OriginatorInfo;
    });

    it('should track wallet_action_user_approved when msg has no error', async () => {
      const msg = { data: { id: '123' } };
      await handleSendMessage({ msg, connection: mockConnection });

      expect(analytics.track).toHaveBeenCalledWith(
        'wallet_action_user_approved',
        {
          anon_id: 'test-anon-id',
        },
      );
    });

    it('should track wallet_action_user_rejected when msg has an error', async () => {
      const msg = { data: { id: '123', error: 'User rejected' } };
      await handleSendMessage({ msg, connection: mockConnection });

      expect(analytics.track).toHaveBeenCalledWith(
        'wallet_action_user_rejected',
        {
          anon_id: 'test-anon-id',
        },
      );
    });

    it('should not track if method is not analytics tracked', async () => {
      mockIsAnalyticsTrackedRpcMethod.mockReturnValue(false);
      const msg = { data: { id: '123' } };
      await handleSendMessage({ msg, connection: mockConnection });

      expect(analytics.track).not.toHaveBeenCalled();
    });

    it('should not track if msgId is undefined', async () => {
      const msg = {
        data: {
          /* id is missing */
        },
      };
      await handleSendMessage({ msg, connection: mockConnection });

      expect(analytics.track).not.toHaveBeenCalled();
    });

    it('should not track if anonId is missing', async () => {
      mockConnection.originatorInfo = {} as OriginatorInfo; // No anonId
      const msg = { data: { id: '123' } };
      await handleSendMessage({ msg, connection: mockConnection });

      expect(analytics.track).not.toHaveBeenCalled();
    });
  });

  describe('Initial operations and validations', () => {
    beforeEach(() => {
      mockRpcQueueManagerGetId.mockReturnValue('1');
    });
    it('should log the received message', async () => {
      await handleSendMessage({ msg: {}, connection: mockConnection });

      expect(mockDevLogger).toHaveBeenCalledWith('[handleSendMessage] msg', {});
    });
    it('should set loading to false', async () => {
      await handleSendMessage({ msg: {}, connection: mockConnection });

      expect(mockSetLoading).toHaveBeenCalledWith(false);
    });
    it('should handle undefined or null message gracefully', async () => {
      await handleSendMessage({ msg: undefined, connection: mockConnection });
      await handleSendMessage({ msg: null, connection: mockConnection });

      expect(mockSetLoading).toHaveBeenCalledWith(false);
    });
  });

  describe('Handling batch RPC responses', () => {
    beforeEach(() => {
      mockRpcQueueManagerGetId.mockReturnValue('1');
      mockBatchRPCManagerGetById.mockReturnValue([
        {
          id: 1,
          method: RPC_METHODS.METAMASK_BATCH,
          params: ['eth_chainId'],
        },
      ]);
    });
    it('should process batch RPC responses if available', async () => {
      mockHandleBatchRpcResponse.mockResolvedValue(true);

      await handleSendMessage({ msg: {}, connection: mockConnection });

      expect(mockHandleBatchRpcResponse).toHaveBeenCalledWith({
        batchRPCManager: mockConnection.batchRPCManager,
        backgroundBridge: mockConnection.backgroundBridge,
        chainRpcs: [
          {
            id: 1,
            method: RPC_METHODS.METAMASK_BATCH,
            params: ['eth_chainId'],
          },
        ],
        msg: {},
        sendMessage: expect.any(Function),
      });
    });
    it('should return early if last RPC or error occurred during batch processing', async () => {
      mockHandleBatchRpcResponse.mockResolvedValue(false);

      await handleSendMessage({ msg: {}, connection: mockConnection });

      expect(mockHandleBatchRpcResponse).toHaveBeenCalledWith({
        batchRPCManager: mockConnection.batchRPCManager,
        backgroundBridge: mockConnection.backgroundBridge,
        chainRpcs: [
          {
            id: 1,
            method: RPC_METHODS.METAMASK_BATCH,
            params: ['eth_chainId'],
          },
        ],
        msg: {},
        sendMessage: expect.any(Function),
      });
    });
  });

  describe('RPC Queue Manager interactions', () => {
    beforeEach(() => {
      mockRpcQueueManagerGetId.mockReturnValue('1');

      mockCanRedirect.mockReturnValue(true);

      mockHandleBatchRpcResponse.mockResolvedValue(true);
    });
    it('should remove the message ID from the RPC queue', async () => {
      await handleSendMessage({
        msg: {
          data: {
            id: 1,
          },
        },
        connection: mockConnection,
      });

      expect(mockRemove).toHaveBeenCalledWith('1');
    });

    it('should check if redirection is allowed for the method', async () => {
      await handleSendMessage({
        msg: {
          data: {
            id: 1,
          },
        },
        connection: mockConnection,
      });

      expect(mockCanRedirect).toHaveBeenCalledWith({
        method: 'metamask_batch',
      });
    });
  });

  describe('Message sending', () => {
    beforeEach(() => {
      mockRpcQueueManagerGetId.mockReturnValue('1');
      mockCanRedirect.mockReturnValue(true);
    });
    it('should attempt to send the message', async () => {
      await handleSendMessage({
        msg: {
          data: {
            id: 1,
          },
        },
        connection: mockConnection,
      });

      expect(mockSendMessage).toHaveBeenCalledWith({
        data: {
          id: 1,
        },
      });
    });
  });

  describe('Redirection logic', () => {
    describe('When redirection is allowed', () => {
      beforeEach(() => {
        mockRpcQueueManagerGetId.mockReturnValue('1');
        mockCanRedirect.mockReturnValue(true);
        mockConnection.trigger = 'deeplink';
      });
      it('should wait for specific methods', async () => {
        mockRpcQueueManagerGetId.mockReturnValue(RPC_METHODS.METAMASK_BATCH);

        await handleSendMessage({
          msg: {
            data: {
              id: 1,
            },
          },
          connection: mockConnection,
        });

        expect(mockWait).toHaveBeenCalledWith(1200);
      });
      it('should handle platform-specific behavior for iOS 17 and above', async () => {
        const spyIsIos = jest.spyOn(Device, 'isIos');
        spyIsIos.mockReturnValue(true);

        jest.mock('react-native/Libraries/Utilities/Platform', () => ({
          OS: 'ios',
          Version: 17,
        }));

        await handleSendMessage({
          msg: {
            data: {
              id: 1,
            },
          },
          connection: mockConnection,
        });

        expect(mockNavigate).toHaveBeenCalledWith('RootModalFlow', {
          isPostNetworkSwitch: false,
          screen: 'ReturnToDappModal',
        });
      });
    });
  });

  describe('Final state update', () => {
    beforeEach(() => {
      mockRpcQueueManagerGetId.mockReturnValue('1');
      mockCanRedirect.mockReturnValue(true);
    });
    it('should update the trigger to resume after processing', async () => {
      mockConnection.trigger = 'deeplink';

      await handleSendMessage({
        msg: {
          data: {
            id: 1,
          },
        },
        connection: mockConnection,
      });

      expect(mockConnection.trigger).toBe('resume');
    });
  });

  describe('Confirmation popup message', () => {
    beforeEach(() => {
      mockRpcQueueManagerGetId.mockReturnValue(
        RPC_METHODS.WALLET_SWITCHETHEREUMCHAIN,
      );
      // mockCanRedirect.mockReturnValue(true);
      mockBatchRPCManagerGetById.mockReturnValue(undefined);
    });
    it('should handle specific behavior for network switch', async () => {
      mockConnection.trigger = 'deeplink';

      await handleSendMessage({
        msg: {
          data: {
            id: 1,
          },
        },
        connection: mockConnection,
      });

      expect(mockNavigate).toHaveBeenCalledWith('RootModalFlow', {
        isPostNetworkSwitch: true,
        screen: 'ReturnToDappModal',
      });
    });
  });
});
