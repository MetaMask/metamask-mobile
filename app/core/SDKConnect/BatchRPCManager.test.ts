import BatchRPCManager, { RPCMethod } from './BatchRPCManager';

jest.mock('./utils/DevLogger');

describe('BatchRPCManager', () => {
  let batchRPCManager: BatchRPCManager;
  const testChannelId = 'testChannelId';

  beforeEach(() => {
    jest.clearAllMocks();
    batchRPCManager = new BatchRPCManager(testChannelId);
  });

  describe('add', () => {
    it('should add a batch of RPC methods', () => {
      const testId = 'testId';
      const testRpcs: RPCMethod[] = [
        {
          id: 'testId1',
          method: 'testMethod1',
          params: {},
          jsonrpc: '2.0',
        },
        {
          id: 'testId2',
          method: 'testMethod2',
          params: {},
          jsonrpc: '2.0',
        },
      ];
      batchRPCManager.add({ id: testId, rpcs: testRpcs });
      expect(batchRPCManager.getAll()).toEqual({
        [testId]: testRpcs,
      });
    });
  });

  describe('addResponse', () => {
    it('should add a response to a specific RPC method', () => {
      const testId = 'testId';
      const testRpcs: RPCMethod[] = [
        {
          id: 'testId1',
          method: 'testMethod1',
          params: {},
          jsonrpc: '2.0',
        },
        {
          id: 'testId2',
          method: 'testMethod2',
          params: {},
          jsonrpc: '2.0',
        },
      ];
      batchRPCManager.add({ id: testId, rpcs: testRpcs });
      expect(batchRPCManager.getAll()).toEqual({
        [testId]: testRpcs,
      });
      const testIndex = 1;
      const testResponse = {
        test: 'test',
      };
      batchRPCManager.addResponse({
        id: testId,
        index: testIndex,
        response: testResponse,
      });
      expect(batchRPCManager.getAll()).toEqual({
        [testId]: [
          {
            id: 'testId1',
            method: 'testMethod1',
            params: {},
            jsonrpc: '2.0',
          },
          {
            id: 'testId2',
            method: 'testMethod2',
            params: {},
            jsonrpc: '2.0',
            response: testResponse,
          },
        ],
      });
    });

    it('should throw an error if the RPC method is not found', () => {
      const testId = 'testId';
      const testRpcs: RPCMethod[] = [
        {
          id: 'testId1',
          method: 'testMethod1',
          params: {},
          jsonrpc: '2.0',
        },
        {
          id: 'testId2',
          method: 'testMethod2',
          params: {},
          jsonrpc: '2.0',
        },
      ];
      batchRPCManager.add({ id: testId, rpcs: testRpcs });
      expect(batchRPCManager.getAll()).toEqual({
        [testId]: testRpcs,
      });
      const testIndex = 1;
      const testResponse = {
        test: 'test',
      };
      expect(() => {
        batchRPCManager.addResponse({
          id: 'notFoundId',
          index: testIndex,
          response: testResponse,
        });
      }).toThrowError('RPC method notFoundId not found in chain');
    });
  });

  describe('reset', () => {
    it('should reset the RPC chain', () => {
      const testId = 'testId';
      const testRpcs: RPCMethod[] = [
        {
          id: 'testId1',
          method: 'testMethod1',
          params: {},
          jsonrpc: '2.0',
        },
        {
          id: 'testId2',
          method: 'testMethod2',
          params: {},
          jsonrpc: '2.0',
        },
      ];
      batchRPCManager.add({ id: testId, rpcs: testRpcs });
      expect(batchRPCManager.getAll()).toEqual({
        [testId]: testRpcs,
      });
      batchRPCManager.reset();
      expect(batchRPCManager.getAll()).toEqual({});
    });
  });

  describe('remove', () => {
    it('should remove an RPC method by id', () => {
      const testId = 'testId';
      const testRpcs: RPCMethod[] = [
        {
          id: 'testId1',
          method: 'testMethod1',
          params: {},
          jsonrpc: '2.0',
        },
        {
          id: 'testId2',
          method: 'testMethod2',
          params: {},
          jsonrpc: '2.0',
        },
      ];
      batchRPCManager.add({ id: testId, rpcs: testRpcs });
      expect(batchRPCManager.getAll()).toEqual({
        [testId]: testRpcs,
      });
      batchRPCManager.remove(testId);
      expect(batchRPCManager.getAll()).toEqual({});
    });
  });

  describe('getAll', () => {
    it('should get all RPC methods', () => {
      const testId = 'testId';
      const testRpcs: RPCMethod[] = [
        {
          id: 'testId1',
          method: 'testMethod1',
          params: {},
          jsonrpc: '2.0',
        },
        {
          id: 'testId2',
          method: 'testMethod2',
          params: {},
          jsonrpc: '2.0',
        },
      ];
      batchRPCManager.add({ id: testId, rpcs: testRpcs });
      expect(batchRPCManager.getAll()).toEqual({
        [testId]: testRpcs,
      });
    });
  });

  describe('getById', () => {
    const baseId = 'testId';
    const index = '1';

    const testId = `${baseId}_${index}`;
    it('should get an RPC method by id', () => {
      const testRpcs: RPCMethod[] = [
        {
          id: baseId,
          method: 'testMethod1',
          params: {},
          jsonrpc: '2.0',
        },
        {
          id: baseId,
          method: 'testMethod2',
          params: {},
          jsonrpc: '2.0',
        },
      ];

      batchRPCManager.add({ id: baseId, rpcs: testRpcs });

      expect(batchRPCManager.getById(testId)).toEqual({
        baseId,
        rpcs: testRpcs,
        index: parseInt(index, 10),
      });
    });

    it('should return undefined if the RPC method is not found', () => {
      expect(batchRPCManager.getById(testId)).toBeUndefined();
    });
  });
});
