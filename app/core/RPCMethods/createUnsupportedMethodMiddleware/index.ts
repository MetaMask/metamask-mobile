import { rpcErrors } from '@metamask/rpc-errors';
import type { JsonRpcMiddleware } from '@metamask/json-rpc-engine';

import { UNSUPPORTED_RPC_METHODS } from '../utils';
import { Json, JsonRpcParams } from '@metamask/utils';

/**
 * Create a middleware that rejects explicitly unsupported RPC methods with the
 * appropriate error.
 *
 * @param unsupportedMethods - The unsupported methods set.
 * @returns The middleware.
 */
const createUnsupportedMethodMiddleware = (
  unsupportedMethods: Set<string> = UNSUPPORTED_RPC_METHODS,
): JsonRpcMiddleware<JsonRpcParams, Json> =>
  async function unsupportedMethodMiddleware(req, _res, next, end) {
    if (unsupportedMethods.has(req.method)) {
      return end(rpcErrors.methodNotSupported());
    }
    return next();
  };

export default createUnsupportedMethodMiddleware;
