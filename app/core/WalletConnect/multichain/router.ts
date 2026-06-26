import type { CaipAccountId, CaipChainId, Json } from '@metamask/utils';
import Engine from '../../Engine';
import type { RpcMethod, RpcResponse, RpcSpec } from './types';

/**
 * Build a Snap caller bound to one Snap RPC spec, routing each request
 * through the MultichainRoutingService.
 */
export function createSnapCaller<Spec extends RpcSpec<Spec>>() {
  return async <Method extends RpcMethod<Spec>>({
    origin,
    connectedAddresses,
    scope,
    requestId,
    request,
  }: {
    origin: string;
    connectedAddresses: CaipAccountId[];
    scope: CaipChainId;
    requestId: number;
    request: { method: Method; params: Spec[Method]['params'] };
  }): Promise<RpcResponse<Spec, Method>> =>
    Engine.controllerMessenger.call('MultichainRoutingService:handleRequest', {
      connectedAddresses,
      origin,
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
