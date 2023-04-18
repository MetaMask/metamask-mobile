// eslint-disable-next-line import/no-nodejs-modules
import { inspect } from 'util';
import type { JsonRpcRequest, PendingJsonRpcResponse } from 'json-rpc-engine';
import type {
  Transaction,
  TransactionController,
  WalletDevice,
} from '@metamask/transaction-controller';
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

/**
 * Get a mock implementation of `TransactionController.addTransaction`.
 *
 * A return value or some type of error must be provided.
 *
 * @param arguments - Named arguments for this function.
 * @param arguments.addTransactionerror - An error to throw when adding the transaction.
 * @param arguments.expectedOrigin - The origin this is mock is expected to be called with.
 * @param arguments.expectedTransaction - The transaction parameters this is mock is expected to be
 * called with.
 * @param arguments.processTransactionError - An error to throw when the transaction is being
 * processed, after it was successfully added.
 * @param arguments.returnValue - The hash to return once the transaction has succeeded.
 */
function getMockAddTransaction({
  addTransactionError,
  expectedOrigin,
  expectedTransaction,
  processTransactionError,
  returnValue,
}: {
  addTransactionError?: Error;
  expectedOrigin?: Parameters<TransactionController['addTransaction']>[1];
  expectedTransaction?: Parameters<TransactionController['addTransaction']>[0];
  processTransactionError?: Error;
  returnValue?: string;
}) {
  if (addTransactionError && processTransactionError) {
    throw new Error('Only one type of error can be provided');
  } else if ((addTransactionError || processTransactionError) && returnValue) {
    throw new Error('Must provide either an error or a return value, not both');
  } else if (!addTransactionError && !processTransactionError && !returnValue) {
    throw new Error('No return value or error provided');
  }

  return jest
    .fn()
    .mockImplementation(
      async (
        transaction: Transaction,
        origin: string,
        deviceConfirmedOn: WalletDevice,
      ) => {
        expect(deviceConfirmedOn).toBe('metamask_mobile');
        if (expectedOrigin) {
          expect(origin).toBe(expectedOrigin);
        }
        if (expectedTransaction) {
          expect(transaction).toBe(expectedTransaction);
        }

        if (addTransactionError) {
          throw addTransactionError;
        } else if (processTransactionError) {
          return {
            result: Promise.reject(processTransactionError),
          };
        } else {
          return {
            result: Promise.resolve('fake-hash'),
          };
        }
      },
    );
}

describe('eth_sendTransaction', () => {
  it('sends the transaction and returns the resulting hash', async () => {
    const mockAddress = '0x0000000000000000000000000000000000000001';
    const mockTransactionParameters = { from: mockAddress };
    const expectedResult = 'fake-hash';
    const pendingResult = constructPendingJsonRpcResponse();

    await eth_sendTransaction({
      hostname: 'example.metamask.io',
      req: constructSendTransactionRequest([mockTransactionParameters]),
      res: pendingResult,
      sendTransaction: getMockAddTransaction({
        expectedTransaction: mockTransactionParameters,
        expectedOrigin: 'example.metamask.io',
        returnValue: expectedResult,
      }),
      validateAccountAndChainId: jest.fn(),
    });

    expect(pendingResult.result).toBe(expectedResult);
  });

  const invalidParameters = [null, undefined, '', {}];
  for (const invalidParameter of invalidParameters) {
    it(`throws a JSON-RPC invalid parameters error if given "${inspect(
      invalidParameter,
    )}"`, async () => {
      await expect(
        async () =>
          await eth_sendTransaction({
            hostname: 'example.metamask.io',
            req: constructSendTransactionRequest(invalidParameter),
            res: constructPendingJsonRpcResponse(),
            sendTransaction: getMockAddTransaction({
              returnValue: 'fake-hash',
            }),
            validateAccountAndChainId: jest.fn(),
          }),
      ).rejects.toThrow('Invalid parameters: expected an array');
    });
  }

  const invalidTransactionParameters = [null, undefined, '', []];
  for (const invalidTransactionParameter of invalidTransactionParameters) {
    it(`throws a JSON-RPC invalid parameters error if given "${inspect(
      invalidTransactionParameter,
    )}" transaction parameters`, async () => {
      const invalidParameter = [invalidTransactionParameter];

      await expect(
        async () =>
          await eth_sendTransaction({
            hostname: 'example.metamask.io',
            req: constructSendTransactionRequest(invalidParameter),
            res: constructPendingJsonRpcResponse(),
            sendTransaction: getMockAddTransaction({
              returnValue: 'fake-hash',
            }),
            validateAccountAndChainId: jest.fn(),
          }),
      ).rejects.toThrow(
        'Invalid parameters: expected the first parameter to be an object',
      );
    });
  }

  it('throws any validation errors', async () => {
    const mockAddress = '0x0000000000000000000000000000000000000001';
    const mockTransactionParameters = { from: mockAddress };

    await expect(
      async () =>
        await eth_sendTransaction({
          hostname: 'example.metamask.io',
          req: constructSendTransactionRequest([mockTransactionParameters]),
          res: constructPendingJsonRpcResponse(),
          sendTransaction: getMockAddTransaction({
            returnValue: 'fake-hash',
          }),
          validateAccountAndChainId: jest.fn().mockImplementation(async () => {
            throw new Error('test validation error');
          }),
        }),
    ).rejects.toThrow('test validation error');
  });

  it('throws if the sendTransaction function throws', async () => {
    const mockAddress = '0x0000000000000000000000000000000000000001';
    const mockTransactionParameters = { from: mockAddress };

    await expect(
      async () =>
        await eth_sendTransaction({
          hostname: 'example.metamask.io',
          req: constructSendTransactionRequest([mockTransactionParameters]),
          res: constructPendingJsonRpcResponse(),
          sendTransaction: getMockAddTransaction({
            expectedTransaction: mockTransactionParameters,
            expectedOrigin: 'example.metamask.io',
            addTransactionError: new Error('Failed to add transaction'),
          }),
          validateAccountAndChainId: jest.fn(),
        }),
    ).rejects.toThrow('Failed to add transaction');
  });

  it('throws if the transaction fails after approval', async () => {
    const mockAddress = '0x0000000000000000000000000000000000000001';
    const mockTransactionParameters = { from: mockAddress };

    await expect(
      async () =>
        await eth_sendTransaction({
          hostname: 'example.metamask.io',
          req: constructSendTransactionRequest([mockTransactionParameters]),
          res: constructPendingJsonRpcResponse(),
          sendTransaction: getMockAddTransaction({
            expectedTransaction: mockTransactionParameters,
            expectedOrigin: 'example.metamask.io',
            processTransactionError: new Error('User rejected the transaction'),
          }),
          validateAccountAndChainId: jest.fn(),
        }),
    ).rejects.toThrow('User rejected the transaction');
  });
});
