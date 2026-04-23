import type { CaipAccountId, CaipChainId, Json } from '@metamask/utils';
import type { WalletKitTypes } from '@reown/walletkit';

import Engine from '../Engine';
import DevLogger from '../SDKConnect/utils/DevLogger';

import { mapRequest, mapResponse } from './multichain';

/** Callback surface exposed by the session to its routing helpers. */
export interface RoutingHostContext {
  approveRequest: (args: { id: string; result: unknown }) => Promise<void>;
  rejectRequest: (args: { id: string; error: unknown }) => Promise<void>;
}

/**
 * Route a WalletConnect session request to a Snap. The chain adapter owns
 * any request shape mapping and response re-assembly so this function stays
 * chain-agnostic.
 */
export const routeToSnap = async ({
  requestEvent,
  connectedAddresses,
  scope,
  host,
}: {
  requestEvent: WalletKitTypes.SessionRequest;
  connectedAddresses: CaipAccountId[];
  scope: CaipChainId;
  host: RoutingHostContext;
}): Promise<void> => {
  const { method, params } = requestEvent.params.request;
  const namespace = scope.split(':')[0];
  const mappedRequest = mapRequest(namespace, { method, params });

  DevLogger.log(
    `WC2::routeToSnap scope=${scope} method=${method} mappedMethod=${mappedRequest.method}`,
  );

  try {
    const result = await Engine.controllerMessenger.call(
      'MultichainRoutingService:handleRequest',
      {
        connectedAddresses,
        origin: 'metamask',
        scope,
        request: {
          jsonrpc: '2.0' as const,
          id: requestEvent.id,
          method: mappedRequest.method,
          ...(mappedRequest.params
            ? {
                params: mappedRequest.params as Record<string, Json> | Json[],
              }
            : {}),
        },
      },
    );

    const walletConnectResult = mapResponse(namespace, {
      method,
      params,
      result,
    });

    await host.approveRequest({
      id: String(requestEvent.id),
      result: walletConnectResult,
    });
  } catch (error) {
    await host.rejectRequest({ id: String(requestEvent.id), error });
  }
};
