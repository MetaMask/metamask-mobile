import { createWalletMiddleware } from '@metamask/eth-json-rpc-middleware';
import { JsonRpcMiddleware } from '@metamask/json-rpc-engine';
import { JsonRpcParams } from '@metamask/eth-query';
import { Json } from '@metamask/utils';

import {
  getAccounts,
  getCapabilities,
  getCallsStatus,
  processSendCalls,
} from './eip5792';

export const createAsyncWalletMiddleware = (): JsonRpcMiddleware<
  JsonRpcParams,
  Json
> =>
  createWalletMiddleware({
    getAccounts,
    processSendCalls,
    getCallsStatus,
    getCapabilities,
  }) as JsonRpcMiddleware<JsonRpcParams, Json>;
