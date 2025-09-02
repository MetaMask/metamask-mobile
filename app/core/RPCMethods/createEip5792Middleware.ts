import { createWalletMiddleware } from '@metamask/eth-json-rpc-middleware';

// TODO: [ffmcgee] export types from package to simplify function typing here
export function createEip5792Middleware({
  getAccounts,
  getCallsStatus,
  getCapabilities,
  processSendCalls,
}) {
  return createWalletMiddleware({
    getAccounts,
    getCallsStatus,
    getCapabilities,
    processSendCalls,
  });
}
