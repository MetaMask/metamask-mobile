/* eslint-disable @typescript-eslint/no-explicit-any */
import Logger from '../../../../util/Logger';
import Engine from '../../../Engine';
import { Minimizer } from '../../../NativeModules';
import { RPC_METHODS } from '../../SDKConnectConstants';
import handleBatchRpcResponse from '../../handlers/handleBatchRpcResponse';
import { wait } from '../../utils/wait.util';
import AndroidService from '../AndroidService';
import sendMessage from './sendMessage';

jest.mock('../../../Engine');
jest.mock('../../../NativeModules', () => ({
  Minimizer: {
    goBack: jest.fn(),
  },
}));
jest.mock('../../../../util/Logger');
jest.mock('../../utils/wait.util', () => ({
  wait: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@metamask/preferences-controller');
jest.mock('../AndroidService');
jest.mock('../../handlers/handleBatchRpcResponse', () => jest.fn());
jest.mock('../../utils/DevLogger');

describe('sendMessage', () => {
  let instance: jest.Mocked<AndroidService>;
  let message: any;

  const mockGetId = jest.fn();
  const mockRemove = jest.fn();
  const mockIsEmpty = jest.fn().mockReturnValue(true);
  const mockGet = jest.fn();
  const mockSendMessage = jest.fn();
  const mockGetById = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    instance = {
      rpcQueueManager: {
        getId: mockGetId,
        remove: mockRemove,
        isEmpty: mockIsEmpty,
        get: mockGet,
      },
      communicationClient: {
        sendMessage: mockSendMessage,
      },
      batchRPCManager: {
        getById: mockGetById,
      },
      bridgeByClientId: {},
      currentClientId: 'test-client-id',
    } as unknown as jest.Mocked<AndroidService>;

    message = {
      data: {
        id: 'test-id',
        result: ['0x1', '0x2'],
      },
    };

    (Engine.context as any) = {
      PreferencesController: {
        state: {
          selectedAddress: '0x1',
        },
      },
    };
  });

  it('should send message with reordered accounts if selectedAddress is in result', async () => {
    mockGetId.mockReturnValue(RPC_METHODS.ETH_REQUESTACCOUNTS);

    await sendMessage(instance, message);

    expect(mockSendMessage).toHaveBeenCalledWith(
      JSON.stringify({
        ...message,
        data: {
          ...message.data,
          result: ['0x1', '0x2'],
        },
      }),
    );
  });

  it('should send message without reordering if selectedAddress is not in result', async () => {
    (Engine.context as any).PreferencesController.state.selectedAddress = '0x3';

    mockGetId.mockReturnValue(RPC_METHODS.ETH_REQUESTACCOUNTS);

    await sendMessage(instance, message);

    expect(mockSendMessage).toHaveBeenCalledWith(JSON.stringify(message));
  });

  it('should handle multichain rpc call responses separately', async () => {
    mockGetId.mockReturnValue('someMethod');
    mockGetById.mockReturnValue(['rpc1', 'rpc2']);
    (handleBatchRpcResponse as jest.Mock).mockResolvedValue(true);

    await sendMessage(instance, message);

    expect(handleBatchRpcResponse).toHaveBeenCalled();
    expect(mockRemove).toHaveBeenCalledWith('test-id');
    expect(mockSendMessage).toHaveBeenCalledWith(JSON.stringify(message));
  });

  it('should not call goBack if rpcQueueManager is not empty', async () => {
    mockGetId.mockReturnValue('someMethod');
    mockIsEmpty.mockReturnValue(false);

    await sendMessage(instance, message);

    expect(Minimizer.goBack).not.toHaveBeenCalled();
  });

  it('should handle error when waiting for empty rpc queue', async () => {
    mockGetId.mockReturnValue('someMethod');
    (wait as jest.Mock).mockRejectedValue(new Error('test error'));

    await sendMessage(instance, message);

    expect(Logger.log).toHaveBeenCalledWith(
      expect.any(Error),
      `AndroidService:: error waiting for empty rpc queue`,
    );
  });
});
