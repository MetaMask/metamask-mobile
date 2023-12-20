/* eslint-disable @typescript-eslint/ban-ts-comment */
import { RPCQueueManager } from './RPCQueueManager';
import { METHODS_TO_REDIRECT, RPC_METHODS } from './SDKConnectConstants';

jest.mock('./utils/DevLogger');

describe('RPCQueueManager', () => {
  let rpcQueueManager: RPCQueueManager;

  beforeEach(() => {
    jest.clearAllMocks();
    rpcQueueManager = new RPCQueueManager();
  });

  describe('add', () => {
    it('should add an RPC method to the queue', () => {
      rpcQueueManager.add({
        id: 'id',
        method: 'method',
      });

      // @ts-ignore
      expect(rpcQueueManager.rpcQueue).toEqual({ id: 'method' });
    });
  });

  describe('reset', () => {
    it('should clear the RPC queue', () => {
      rpcQueueManager.reset();

      // @ts-ignore
      expect(rpcQueueManager.rpcQueue).toEqual({});
    });

    it('should warn if there are RPCs in the queue on reset', () => {
      const spyConsoleWarn = jest
        .spyOn(console, 'warn')
        .mockImplementation(() => {
          // do nothing
        });

      // @ts-ignore
      rpcQueueManager.rpcQueue = [{ method: 'method', params: 'params' }];

      rpcQueueManager.reset();

      expect(spyConsoleWarn).toHaveBeenCalledWith(
        'RPCQueueManager: 1 RPCs still in the queue',
        [{ method: 'method', params: 'params' }],
      );
    });
  });

  describe('isEmpty', () => {
    it('should return true if the queue is empty', () => {
      // @ts-ignore
      rpcQueueManager.rpcQueue = [];

      expect(rpcQueueManager.isEmpty()).toBe(true);
    });

    it('should return false if the queue is not empty', () => {
      // @ts-ignore
      rpcQueueManager.rpcQueue = [{ method: 'method', params: 'params' }];

      expect(rpcQueueManager.isEmpty()).toBe(false);
    });
  });

  describe('canRedirect', () => {
    it('should return true if method is redirectable and queue is empty', () => {
      // @ts-ignore
      rpcQueueManager.rpcQueue = [];

      const result = rpcQueueManager.canRedirect({
        method: RPC_METHODS.ETH_REQUESTACCOUNTS,
      });

      expect(result).toBe(true);
    });

    it('should return false if method is not redirectable', () => {
      // @ts-ignore
      rpcQueueManager.rpcQueue = [];

      // @ts-ignore
      METHODS_TO_REDIRECT.method = false;

      const result = rpcQueueManager.canRedirect({ method: 'method' });

      expect(result).toBe(false);
    });
  });

  describe('remove', () => {
    it('should remove an RPC method from the queue', () => {
      // @ts-ignore
      rpcQueueManager.rpcQueue = {
        id: 'method',
      };

      rpcQueueManager.remove('id');

      // @ts-ignore
      expect(rpcQueueManager.rpcQueue).toEqual({});
    });
  });

  describe('get', () => {
    it('should return the current state of the RPC queue', () => {
      // @ts-ignore
      rpcQueueManager.rpcQueue = [{ method: 'method', params: 'params' }];

      const result = rpcQueueManager.get();

      // @ts-ignore
      expect(result).toEqual([{ method: 'method', params: 'params' }]);
    });
  });

  describe('getId', () => {
    it('should return the method for a given ID', () => {
      // @ts-ignore
      rpcQueueManager.rpcQueue = {
        id: 'method',
      };

      const result = rpcQueueManager.getId('id');

      expect(result).toEqual('method');
    });
  });
});
