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

type JsonRpcRequestWithOrigin = JsonRpcRequest & { origin: string };

export function createEip5792Middleware({
  getPermittedAccounts,
  getCallsStatus,
  getCapabilities,
  processSendCalls,
}: {
  getPermittedAccounts: (origin: string) => Promise<string[]>;
  getCallsStatus: GetCallsStatusHook;
  getCapabilities: GetCapabilitiesHook;
  processSendCalls: ProcessSendCallsHook;
}) {
  return createScaffoldMiddleware({
    wallet_getCapabilities: createAsyncMiddleware(async (req, res) => {
      const request = req as unknown as JsonRpcRequestWithOrigin;
      return walletGetCapabilities(request, res, {
        getPermittedAccountsForOrigin: () =>
          getPermittedAccounts(request.origin),
        getCapabilities,
      });
    }),
    wallet_sendCalls: createAsyncMiddleware(async (req, res) => {
      const request = req as unknown as JsonRpcRequestWithOrigin;
      return walletSendCalls(request, res, {
        getPermittedAccountsForOrigin: () =>
          getPermittedAccounts(request.origin),
        processSendCalls,
      });
    }),
    wallet_getCallsStatus: createAsyncMiddleware(async (req, res) =>
      walletGetCallsStatus(req, res, {
        getCallsStatus,
      }),
    ),
  });
}
