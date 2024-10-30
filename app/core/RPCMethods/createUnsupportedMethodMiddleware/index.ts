import { rpcErrors } from '@metamask/rpc-errors';
import type { JsonRpcMiddleware } from '@metamask/json-rpc-engine';
import type { Json, JsonRpcParams } from '@metamask/utils';
import { UNSUPPORTED_RPC_METHODS } from '../utils';

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
