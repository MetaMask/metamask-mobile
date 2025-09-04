import {
  createWalletMiddleware,
  ProcessSendCallsHook,
  GetCapabilitiesHook,
  GetCallsStatusHook,
} from '@metamask/eth-json-rpc-middleware';
import { JsonRpcRequest } from '@metamask/utils';

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
  return createWalletMiddleware({
    getAccounts,
    getCallsStatus,
    getCapabilities,
    processSendCalls,
  });
}
