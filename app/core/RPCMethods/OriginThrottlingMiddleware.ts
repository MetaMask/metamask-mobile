import {
  JsonRpcEngineNextCallback,
  JsonRpcMiddleware,
} from '@metamask/json-rpc-engine';
import type {
  Json,
  JsonRpcParams,
  JsonRpcRequest,
  PendingJsonRpcResponse,
} from '@metamask/utils';

import { store } from '../../store';
import {
  ExtendedJSONRPCRequest,
  processOriginThrottlingRejection,
  validateOriginThrottling,
} from './spam';

export function createOriginThrottlingMiddleware(): JsonRpcMiddleware<
  JsonRpcParams,
  Json
> {
  return (
    req: JsonRpcRequest<JsonRpcParams>,
    res: PendingJsonRpcResponse<Json>,
    next: JsonRpcEngineNextCallback,
  ) => {
    validateOriginThrottling({ req: req as ExtendedJSONRPCRequest, store });

    next((callback: () => void) => {
      if (res.error) {
        processOriginThrottlingRejection({
          req: req as ExtendedJSONRPCRequest,
          error: res.error as {
            message: string;
            code?: number;
          },
          store,
        });
      }
      callback();
    });
    return;
  };
}
