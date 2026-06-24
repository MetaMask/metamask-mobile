import type { CaipAccountId, CaipChainId, Json } from '@metamask/utils';
import Engine from '../../Engine';
import type { RpcMethod, RpcResponse, RpcSpec } from './types';

/**
 * Stable origin reported to non-EVM Snaps for every WalletConnect request.
 * Replaces the per-session channelId, which must never be treated as a dapp
 * origin. MUST stay in sync with the Snaps' known-origin label map key
 * ('wallet-connect' -> 'WalletConnect').
 */
export const WALLET_CONNECT_ORIGIN = 'wallet-connect';

/**
 * Build a Snap caller bound to one Snap RPC spec, routing each request
 * through the MultichainRoutingService.
 */
export function createSnapCaller<Spec extends RpcSpec<Spec>>() {
  return async <Method extends RpcMethod<Spec>>({
    connectedAddresses,
    scope,
    requestId,
    request,
  }: {
    connectedAddresses: CaipAccountId[];
    scope: CaipChainId;
    requestId: number;
    request: { method: Method; params: Spec[Method]['params'] };
  }): Promise<RpcResponse<Spec, Method>> =>
    Engine.controllerMessenger.call('MultichainRoutingService:handleRequest', {
      connectedAddresses,
      origin: WALLET_CONNECT_ORIGIN,
      scope,
      request: {
        jsonrpc: '2.0' as const,
        id: requestId,
        method: request.method,
        ...(request.params
          ? { params: request.params as Record<string, Json> | Json[] }
          : {}),
      },
    }) as Promise<RpcResponse<Spec, Method>>;
}
