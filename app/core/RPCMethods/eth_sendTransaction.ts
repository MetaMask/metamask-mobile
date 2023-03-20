import type {
  AsyncJsonRpcEngineNextCallback,
  JsonRpcRequest,
  PendingJsonRpcResponse,
} from 'json-rpc-engine';
import { isObject, hasProperty } from '@metamask/utils';
import { ethErrors } from 'eth-json-rpc-errors';

/**
 * Handle a `eth_sendTransaction` request.
 *
 * @param args - Named arguments.
 * @param args.checkActiveAccountAndChainId - A function that validates the account and chain ID
 * used in the transaction.
 * @param args.req - The JSON-RPC request.
 * @param args.res - The JSON-RPC response.
 */
async function eth_sendTransaction({
  next,
  req,
  res: _res,
  validateAccountAndChainId,
}: {
  validateAccountAndChainId: (args: {
    from: string;
    chainId?: number;
  }) => Promise<void>;
  next: AsyncJsonRpcEngineNextCallback;
  req: JsonRpcRequest<unknown> & { method: 'eth_sendTransaction' };
  res: PendingJsonRpcResponse<unknown>;
}) {
  if (
    !Array.isArray(req.params) &&
    !(isObject(req.params) && hasProperty(req.params, 0))
  ) {
    throw ethErrors.rpc.invalidParams({
      message: `Invalid parameters: expected an array`,
    });
  }
  const transactionParameters = req.params[0];
  if (!isObject(transactionParameters)) {
    throw ethErrors.rpc.invalidParams({
      message: `Invalid parameters: expected the first parameter to be an object`,
    });
  }
  await validateAccountAndChainId({
    from: req.params[0].from,
    chainId: req.params[0].chainId,
  });

  // This is handled later in the network middleware
  next();
}

export default eth_sendTransaction;
