import BackgroundBridge from '../../BackgroundBridge/BackgroundBridge';
import BatchRPCManager from '../BatchRPCManager';
import { wait } from '../utils/wait.util';
import handleBatchRpcResponse from './handleBatchRpcResponse';

jest.mock('../BatchRPCManager');
jest.mock('../../BackgroundBridge/BackgroundBridge');
jest.mock('../utils/DevLogger');
jest.mock('../utils/wait.util');

describe('handleBatchRpcResponse', () => {
  let batchRPCManager = {} as unknown as BatchRPCManager;
  let backgroundBridge = {} as unknown as BackgroundBridge;
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let chainRpcs = {} as any;
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let msg = {} as any;

  const sendMessage = jest.fn();
  const mockOnMessage = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    batchRPCManager = {
      addResponse: jest.fn(),
      remove: jest.fn(),
    } as unknown as BatchRPCManager;
    backgroundBridge = {
      onMessage: mockOnMessage,
    } as unknown as BackgroundBridge;

    chainRpcs = {
      baseId: '1',
      index: 0,
      rpcs: [
        { method: 'method1', response: 'response1' },
        { method: 'method2' },
        { method: 'method3' },
      ],
    };

    msg = {
      data: { result: 'result2' },
    };
  });

  it('should handle error in RPC response', async () => {
    msg.data.error = 'Some error';
    const expectedResponse = {
      data: {
        id: '1',
        jsonrpc: '2.0',
        result: ['response1', 'result2'],
        error: 'Some error',
      },
      name: 'metamask-provider',
    };

    const result = await handleBatchRpcResponse({
      chainRpcs,
      batchRPCManager,
      backgroundBridge,
      msg,
      sendMessage,
    });

    expect(sendMessage).toHaveBeenCalledWith({ msg: expectedResponse });
    expect(batchRPCManager.remove).toHaveBeenCalledWith(chainRpcs.baseId);
    expect(result).toBe(true);
  });

  it('should send response for the last RPC', async () => {
    chainRpcs.index = chainRpcs.rpcs.length - 1;
    const expectedResponse = {
      data: {
        id: '1',
        jsonrpc: '2.0',
        result: ['response1', 'result2'],
      },
      name: 'metamask-provider',
    };

    const result = await handleBatchRpcResponse({
      chainRpcs,
      batchRPCManager,
      backgroundBridge,
      msg,
      sendMessage,
    });

    expect(sendMessage).toHaveBeenCalledWith({ msg: expectedResponse });
    expect(batchRPCManager.remove).toHaveBeenCalledWith(chainRpcs.baseId);
    expect(result).toBe(true);
  });

  it('should save response and send the next RPC method', async () => {
    const nextRpc = {
      ...chainRpcs.rpcs[1],
      id: '1_1',
      jsonrpc: '2.0',
    };

    await handleBatchRpcResponse({
      chainRpcs,
      batchRPCManager,
      backgroundBridge,
      msg,
      sendMessage,
    });

    expect(batchRPCManager.addResponse).toHaveBeenCalledWith({
      id: chainRpcs.baseId,
      index: chainRpcs.index,
      response: 'result2',
    });
    expect(wait).toHaveBeenCalledWith(500);
    expect(backgroundBridge.onMessage).toHaveBeenCalledWith({
      name: 'metamask-provider',
      data: nextRpc,
      origin: 'sdk',
    });
  });

  it('should handle incorrect RPC ID', async () => {
    chainRpcs.baseId = 'invalid_id';
    msg.data.error = 'Some error';

    const result = await handleBatchRpcResponse({
      chainRpcs,
      batchRPCManager,
      backgroundBridge,
      msg,
      sendMessage,
    });

    expect(result).toBe(true);
    expect(sendMessage).toHaveBeenCalled();
    expect(batchRPCManager.remove).toHaveBeenCalledWith('invalid_id');
  });

  it('should not send the next RPC method if there is no background bridge', async () => {
    backgroundBridge = undefined as unknown as BackgroundBridge;

    await handleBatchRpcResponse({
      chainRpcs,
      batchRPCManager,
      backgroundBridge,
      msg,
      sendMessage,
    });

    expect(batchRPCManager.addResponse).toHaveBeenCalledWith({
      id: chainRpcs.baseId,
      index: chainRpcs.index,
      response: 'result2',
    });
    expect(wait).toHaveBeenCalledWith(500);
    expect(mockOnMessage).not.toHaveBeenCalled();
  });
});
