/**
 * Public entry point for the WalletConnect multichain adapter layer.
 *
 * This module re-exports the orchestration helpers used by the WC2
 * session classes and provides per-request dispatchers
 * (`mapRequestForSnap` / `normalizeSnapResponse`) that pick the right
 * adapter from the request scope's CAIP-2 namespace.
 *
 * The WC2 classes only depend on this barrel — they never import a
 * specific chain (`./tron`, `./solana`, ...) directly.
 */

import type { NamespaceConfig, SnapMappedRequest } from './types';
import {
  parseCaipChainId,
  type CaipAccountId,
  type CaipChainId,
  type Json,
} from '@metamask/utils';
import Engine from '../../Engine';

export {
  buildAdapterNamespaces,
  proposalReferencedAdapterNamespaces,
  seedAdapterPermissions,
} from './namespaces';
export type { ApprovedNamespaces } from './namespaces';
import { getAdapter, getAllAdapters } from './registry';
export {
  getAdapter,
  getAllAdapters,
  getAllRegisteredNamespaces,
} from './registry';
export type {
  BuildNamespaceArgs,
  ChainAdapter,
  NamespaceConfig,
  ProposalLike,
  SnapMappedRequest,
} from './types';

/**
 * Build this chain's namespace slice from the wallet's current state
 * What the wallet is *capable of exposing* for this channel, independent of
 * any dapp proposal.
 */
export const buildAdapterScopedPermissionsNamespaces = ({
  channelId,
  permittedChains,
}: {
  channelId: string;
  permittedChains: CaipChainId[];
}): Record<string, NamespaceConfig> => {
  const namespaces: Record<string, NamespaceConfig> = {};
  for (const adapter of getAllAdapters()) {
    const config = adapter.buildScopedPermissionsNamespace({
      channelId,
      permittedChains,
    });
    if (config) {
      namespaces[adapter.namespace] = config;
    }
  }
  return namespaces;
};

/**
 * Normalize a CAIP chain id from WC into the shape the Snap expects.
 */
export const normalizeCaipChainIdInbound = (
  caipChainId: CaipChainId,
): CaipChainId => {
  for (const adapter of getAllAdapters()) {
    if (caipChainId.startsWith(`${adapter.namespace}:`)) {
      return adapter.normalizeCaipChainIdInbound(caipChainId);
    }
  }

  return caipChainId;
};

/**
 * Normalize a CAIP chain id from the Snap back into the shape WC expects.
 */
export const normalizeCaipChainIdOutbound = (
  caipChainId: CaipChainId,
): CaipChainId => {
  for (const adapter of getAllAdapters()) {
    if (caipChainId.startsWith(`${adapter.namespace}:`)) {
      return adapter.normalizeCaipChainIdOutbound(caipChainId);
    }
  }

  return caipChainId;
};

/**
 * Translate a WalletConnect request into the parameter shape the
 * Snap behind this scope expects. Falls through unchanged when no
 * adapter matches.
 */
export const mapRequestForSnap = ({
  scope,
  method,
  params,
}: {
  scope: CaipChainId;
  method: string;
  params: unknown;
}): SnapMappedRequest => {
  const { namespace } = parseCaipChainId(scope);
  const adapter = getAdapter(namespace);
  return adapter
    ? adapter.mapRequestForSnap({ method, params })
    : { method, params };
};

/**
 * Normalize the Snap result back into the shape the dapp expects.
 * Falls through unchanged when no adapter matches.
 */
export const normalizeSnapResponse = ({
  scope,
  method,
  params,
  result,
}: {
  scope: CaipChainId;
  method: string;
  params: unknown;
  result: unknown;
}): unknown => {
  const { namespace } = parseCaipChainId(scope);
  const adapter = getAdapter(namespace);
  return adapter
    ? adapter.normalizeSnapResponse({ method, params, result })
    : result;
};

/** Methods (across all chains) that should redirect the user back to the dapp. */
export const getRedirectMethodsForChain = (
  scope: CaipChainId,
): readonly string[] => {
  const { namespace } = parseCaipChainId(scope);
  const adapter = getAdapter(namespace);
  return adapter?.redirectMethods ?? [];
};

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
