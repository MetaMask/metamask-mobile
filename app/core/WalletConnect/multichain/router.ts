import type { CaipAccountId, CaipChainId, Json } from '@metamask/utils';
import Engine from '../../Engine';
import type { SnapMappedRequest } from './types';

/**
 * Route a non-EVM request through the MultichainRoutingService.
 * Session classes can wrap this with approval/rejection logic.
 */
export const callMultichainRoutingService = async ({
  connectedAddresses,
  scope,
  requestId,
  mappedRequest,
}: {
  connectedAddresses: CaipAccountId[];
  scope: CaipChainId;
  requestId: number;
  mappedRequest: SnapMappedRequest;
}): Promise<unknown> =>
  Engine.controllerMessenger.call('MultichainRoutingService:handleRequest', {
    connectedAddresses,
    origin: 'metamask',
    scope,
    request: {
      jsonrpc: '2.0' as const,
      id: requestId,
      method: mappedRequest.method,
      ...(mappedRequest.params
        ? { params: mappedRequest.params as Record<string, Json> | Json[] }
        : {}),
    },
  });
