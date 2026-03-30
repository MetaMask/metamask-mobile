/**
 * Generic non-EVM request dispatcher for WalletConnect.
 *
 * Resolves the chain adapter for the inbound CAIP scope, applies its
 * request/response shape mapping, and routes through the
 * `MultichainRoutingService` controller messenger action so the chain's
 * Snap can handle the JSON-RPC method.
 */

import type { CaipAccountId, CaipChainId, Json } from '@metamask/utils';

import Engine from '../../Engine';
import DevLogger from '../../SDKConnect/utils/DevLogger';

import { getNonEvmAdapterForCaipChainId } from './registry';
import type { NonEvmRoutingHost, NonEvmSessionRequest } from './types';

/**
 * Route a non-EVM WalletConnect request to its registered chain Snap.
 * The adapter owns request/response normalization so this function stays
 * chain-agnostic.
 */
export const routeNonEvmToSnap = async ({
  requestEvent,
  scope,
  connectedAddresses,
  host,
}: {
  requestEvent: NonEvmSessionRequest;
  scope: CaipChainId;
  connectedAddresses: CaipAccountId[];
  host: NonEvmRoutingHost;
}): Promise<void> => {
  const adapter = getNonEvmAdapterForCaipChainId(scope);
  if (!adapter) {
    await host.rejectRequest({
      id: String(requestEvent.id),
      error: new Error(`No non-EVM adapter registered for scope ${scope}`),
    });
    return;
  }

  const normalizedScope = (
    adapter.normalizeCaipChainId ? adapter.normalizeCaipChainId(scope) : scope
  ) as CaipChainId;

  const { method, params } = requestEvent.params.request;
  const mapped = adapter.mapRequest
    ? adapter.mapRequest({ method, params })
    : { method, params };

  DevLogger.log(
    `WC2::routeNonEvmToSnap namespace=${adapter.namespace} scope=${normalizedScope} method=${method} mapped=${mapped.method}`,
  );

  try {
    const result = await Engine.controllerMessenger.call(
      'MultichainRoutingService:handleRequest',
      {
        connectedAddresses,
        origin: 'metamask',
        scope: normalizedScope,
        request: {
          jsonrpc: '2.0' as const,
          id: requestEvent.id,
          method: mapped.method,
          ...(mapped.params
            ? { params: mapped.params as Record<string, Json> | Json[] }
            : {}),
        },
      },
    );

    const response = adapter.mapResponse
      ? adapter.mapResponse({ method, params, result })
      : result;

    await host.approveRequest({
      id: String(requestEvent.id),
      result: response,
    });
  } catch (error) {
    await host.rejectRequest({ id: String(requestEvent.id), error });
  }
};
