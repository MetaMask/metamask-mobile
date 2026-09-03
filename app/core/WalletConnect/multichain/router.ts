import type { CaipAccountId, CaipChainId, Json } from '@metamask/utils';
import type { OriginMetadata } from '@metamask/snaps-sdk';
import Engine from '../../Engine';
import type { RpcMethod, RpcResponse, RpcSpec } from './types';

/**
 * Build a Snap caller bound to one Snap RPC spec, routing each request
 * through the MultichainRoutingService.
 */
export function createSnapCaller<Spec extends RpcSpec<Spec>>() {
  return async <Method extends RpcMethod<Spec>>({
    origin,
    originMetadata,
    connectedAddresses,
    scope,
    requestId,
    request,
  }: {
    /**
     * Unspoofable identifier of the requesting WalletConnect session (the
     * wallet-generated channel id). Forwarded to the Snap as the request
     * origin so each session remains a distinct principal. Never pass the
     * dapp's self-reported URL or a shared transport-wide constant here.
     */
    origin: string;
    originMetadata: OriginMetadata;
    connectedAddresses: CaipAccountId[];
    scope: CaipChainId;
    requestId: number;
    request: { method: Method; params: Spec[Method]['params'] };
  }): Promise<RpcResponse<Spec, Method>> =>
    Engine.controllerMessenger.call('MultichainRoutingService:handleRequest', {
      connectedAddresses,
      origin,
      originMetadata,
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
