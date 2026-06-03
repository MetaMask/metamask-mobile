import type { CaipAccountId, CaipChainId, Json } from '@metamask/utils';
import Engine from '../../Engine';
import type { SnapMappedRequest } from './types';

/**
 * Route a non-EVM request through the MultichainRoutingService.
 */
export async function callMultichainRoutingService({
  origin,
  connectedAddresses,
  scope,
  requestId,
  mappedRequest,
}: {
  origin: string;
  connectedAddresses: CaipAccountId[];
  scope: CaipChainId;
  requestId: number;
  mappedRequest: SnapMappedRequest;
}): Promise<unknown> {
  return Engine.controllerMessenger.call(
    'MultichainRoutingService:handleRequest',
    {
      connectedAddresses,
      origin,
      scope,
      request: {
        jsonrpc: '2.0' as const,
        id: requestId,
        method: mappedRequest.method,
        ...(mappedRequest.params
          ? { params: mappedRequest.params as Record<string, Json> | Json[] }
          : {}),
      },
    },
  );
}
