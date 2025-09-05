import BatchRPCManager from '../BatchRPCManager';
import { RPC_METHODS } from '../SDKConnectConstants';
import handleCustomRpcCalls from './handleCustomRpcCalls';
import overwriteRPCWith from './handleRpcOverwrite';

jest.mock('../BatchRPCManager');
jest.mock('./handleRpcOverwrite');
jest.mock('../utils/DevLogger');
jest.mock('../utils/wait.util');
jest.mock('../../../util/Logger');
jest.mock('../../NavigationService', () => ({
  navigation: jest.fn(),
}));

describe('handleCustomRpcCalls', () => {
  const mockOverwriteRPCWith = overwriteRPCWith as jest.MockedFunction<
    typeof overwriteRPCWith
  >;
  let batchRPCManager = {} as unknown as BatchRPCManager;
  const selectedAddress = '0x123';
  const selectedChainId = '1';
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let rpc = {} as any;

  beforeEach(() => {
    jest.clearAllMocks();

    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockOverwriteRPCWith.mockImplementation((params) => params as any);

    batchRPCManager = {
      add: jest.fn(),
    } as unknown as BatchRPCManager;

    rpc = {
      id: '1',
      method: '',
      params: [],
    };
  });

  it('should process metamask_connectWith RPC call', async () => {
    rpc.method = RPC_METHODS.METAMASK_CONNECTWITH;
    rpc.params = [{ someParam: 'value' }];

    const result = await handleCustomRpcCalls({
      rpc,
      batchRPCManager,
      selectedAddress,
      selectedChainId,
    });

    if (!result) {
      throw new Error('result is undefined');
    }

    expect(result.method).toBe(rpc.params[0].method);
    expect(result.params).toEqual(rpc.params[0].params);
  });

  it('should process metamask_connectSign RPC call', async () => {
    rpc.method = RPC_METHODS.METAMASK_CONNECTSIGN;
    rpc.params = ['param1', 'param2'];

    const result = await handleCustomRpcCalls({
      rpc,
      batchRPCManager,
      selectedAddress,
      selectedChainId,
    });

    if (!result) {
      throw new Error('result is undefined');
    }

    expect(result.method).toBe(RPC_METHODS.PERSONAL_SIGN);
    expect(result.params).toEqual([...rpc.params, selectedAddress]);
  });

  it('should process metamask_batch RPC call', async () => {
    rpc.method = RPC_METHODS.METAMASK_BATCH;
    rpc.params = [
      { method: 'method1', params: ['param1'] },
      { method: 'method2', params: ['param2'] },
    ];

    const result = await handleCustomRpcCalls({
      rpc,
      batchRPCManager,
      selectedAddress,
      selectedChainId,
    });

    expect(batchRPCManager.add).toHaveBeenCalledWith({
      id: rpc.id,
      rpcs: rpc.params,
    });

    if (!result) {
      throw new Error('result is undefined');
    }
    expect(result.method).toBe(rpc.params[0].method);
    expect(result.params).toEqual(rpc.params[0].params);
  });

  it('should throw an error for invalid message format', async () => {
    rpc.method = RPC_METHODS.METAMASK_CONNECTWITH;
    rpc.params = []; // Empty params should trigger error

    await expect(
      handleCustomRpcCalls({
        rpc,
        batchRPCManager,
        selectedAddress,
        selectedChainId,
      }),
    ).rejects.toThrow('Invalid message format');
  });

  // Additional tests can be added for other scenarios and edge cases.
});
