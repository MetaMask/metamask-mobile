import { rpcErrors } from '@metamask/rpc-errors';
import type { JsonRpcMiddleware } from '@metamask/json-rpc-engine';

import { UNSUPPORTED_RPC_METHODS } from '../utils';
import { Json, JsonRpcParams } from '@metamask/utils';

/**
 * Creates a middleware that rejects explicitly unsupported RPC methods with the
 * appropriate error.
 */
const createUnsupportedMethodMiddleware = (): JsonRpcMiddleware<
  JsonRpcParams,
  Json
> =>
  async function unsupportedMethodMiddleware(req, _res, next, end) {
    if ((UNSUPPORTED_RPC_METHODS as Set<string>).has(req.method)) {
      return end(rpcErrors.methodNotSupported());
    }
    return next();
  };

export default createUnsupportedMethodMiddleware;
