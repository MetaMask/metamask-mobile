// eslint-disable-next-line import/no-nodejs-modules
import { inspect } from 'util';
import type { JsonRpcRequest, PendingJsonRpcResponse } from 'json-rpc-engine';
import eth_sendTransaction from './eth_sendTransaction';

/**
 * Construct a `eth_sendTransaction` JSON-RPC request.
 *
 * @param params - The request parameters.
 * @returns The JSON-RPC request.
 */
function constructSendTransactionRequest(
  params: unknown,
): JsonRpcRequest<unknown> & { method: 'eth_sendTransaction' } {
  return {
    jsonrpc: '2.0',
    id: 1,
    method: 'eth_sendTransaction',
    params,
  };
}

/**
 * Construct a pending JSON-RPC response.
 *
 * @returns A pending JSON-RPC response.
 */
function constructPendingJsonRpcResponse(): PendingJsonRpcResponse<unknown> {
  return {
    jsonrpc: '2.0',
    id: 1,
  };
}

describe('eth_sendTransaction', () => {
  it('invokes next middleware for a valid request', async () => {
    const nextMock = jest.fn();
    const minimalValidParams = [{}];

    await eth_sendTransaction({
      next: nextMock,
      req: constructSendTransactionRequest(minimalValidParams),
      res: constructPendingJsonRpcResponse(),
      validateAccountAndChainId: jest.fn(),
    });

    expect(nextMock).toHaveBeenCalledTimes(1);
  });

  const invalidParameters = [null, undefined, '', {}];
  for (const invalidParameter of invalidParameters) {
    it(`throws a JSON-RPC invalid parameters error if given "${inspect(
      invalidParameter,
    )}"`, async () => {
      const nextMock = jest.fn();

      await expect(
        async () =>
          await eth_sendTransaction({
            next: nextMock,
            req: constructSendTransactionRequest(invalidParameter),
            res: constructPendingJsonRpcResponse(),
            validateAccountAndChainId: jest.fn(),
          }),
      ).rejects.toThrow('Invalid parameters: expected an array');
      expect(nextMock).not.toHaveBeenCalled();
    });
  }

  const invalidTransactionParameters = [null, undefined, '', []];
  for (const invalidTransactionParameter of invalidTransactionParameters) {
    it(`throws a JSON-RPC invalid parameters error if given "${inspect(
      invalidTransactionParameter,
    )}" transaction parameters`, async () => {
      const nextMock = jest.fn();
      const invalidParameter = [invalidTransactionParameter];

      await expect(
        async () =>
          await eth_sendTransaction({
            next: nextMock,
            req: constructSendTransactionRequest(invalidParameter),
            res: constructPendingJsonRpcResponse(),
            validateAccountAndChainId: jest.fn(),
          }),
      ).rejects.toThrow(
        'Invalid parameters: expected the first parameter to be an object',
      );
      expect(nextMock).not.toHaveBeenCalled();
    });
  }

  it('throws any validation errors', async () => {
    const nextMock = jest.fn();
    const minimalValidParams = [{}];

    await expect(
      async () =>
        await eth_sendTransaction({
          next: nextMock,
          req: constructSendTransactionRequest(minimalValidParams),
          res: constructPendingJsonRpcResponse(),
          validateAccountAndChainId: jest.fn().mockImplementation(async () => {
            throw new Error('test validation error');
          }),
        }),
    ).rejects.toThrow('test validation error');
    expect(nextMock).not.toHaveBeenCalled();
  });
});
