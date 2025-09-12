import {
  type ProcessSendCallsHook,
  type GetCapabilitiesHook,
  type GetCallsStatusHook,
  walletGetCallsStatus,
  walletGetCapabilities,
  walletSendCalls,
} from '@metamask/eip-5792-middleware';
import {
  createAsyncMiddleware,
  createScaffoldMiddleware,
} from '@metamask/json-rpc-engine';
import type { JsonRpcRequest } from '@metamask/utils';

export function createEip5792Middleware({
  getAccounts,
  getCallsStatus,
  getCapabilities,
  processSendCalls,
}: {
  getAccounts: (req: JsonRpcRequest) => Promise<string[]>;
  getCallsStatus: GetCallsStatusHook;
  getCapabilities: GetCapabilitiesHook;
  processSendCalls: ProcessSendCallsHook;
}) {
  return createScaffoldMiddleware({
    wallet_getCapabilities: createAsyncMiddleware(async (req, res) =>
      walletGetCapabilities(req, res, {
        getAccounts,
        getCapabilities,
      }),
    ),
    wallet_sendCalls: createAsyncMiddleware(async (req, res) =>
      walletSendCalls(req, res, {
        getAccounts,
        processSendCalls,
      }),
    ),
    wallet_getCallsStatus: createAsyncMiddleware(async (req, res) =>
      walletGetCallsStatus(req, res, {
        getCallsStatus,
      }),
    ),
  });
}
