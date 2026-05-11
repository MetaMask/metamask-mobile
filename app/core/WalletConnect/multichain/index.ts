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

import { getAdapter } from './registry';
import type { NamespaceConfig, SnapMappedRequest } from './types';
import {
  CaipAccountId,
  CaipChainId,
  Json,
  KnownCaipNamespace,
} from '@metamask/utils';
import Engine from '../../Engine';
///: BEGIN:ONLY_INCLUDE_IF(tron)
import { buildTronScopedPermissionsNamespace } from './tron';
///: END:ONLY_INCLUDE_IF

export {
  buildAdapterNamespaces,
  proposalReferencedAdapterNamespaces,
  seedAdapterPermissions,
} from './namespaces';
export type { ApprovedNamespaces } from './namespaces';
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

const splitNamespace = (scope: string): string => scope.split(':')[0];

export const buildAdapterScopedPermissionsNamespaces = ({
  channelId,
  permittedChains,
}: {
  channelId: string;
  permittedChains: string[];
}): Record<string, NamespaceConfig> => {
  const namespaces: Record<string, NamespaceConfig> = {};
  ///: BEGIN:ONLY_INCLUDE_IF(tron)
  const tronNamespace = buildTronScopedPermissionsNamespace({
    channelId,
    permittedChains,
  });
  if (tronNamespace) {
    namespaces[KnownCaipNamespace.Tron] = tronNamespace;
  }
  ///: END:ONLY_INCLUDE_IF
  return namespaces;
};

export const normalizeCaipChainIdInboundForWalletConnect = (
  caipChainId: string,
): string => {
  if (!caipChainId.startsWith(`${KnownCaipNamespace.Tron}:`)) {
    return caipChainId;
  }
  const chainRef = caipChainId.slice(`${KnownCaipNamespace.Tron}:`.length);
  if (!chainRef.startsWith('0x')) {
    return caipChainId;
  }
  return `${KnownCaipNamespace.Tron}:${parseInt(chainRef, 16)}`;
};

export const normalizeCaipChainIdOutboundForWalletConnect = (
  caipChainId: string,
): string => {
  if (!caipChainId.startsWith(`${KnownCaipNamespace.Tron}:`)) {
    return caipChainId;
  }
  const chainRef = caipChainId.slice(`${KnownCaipNamespace.Tron}:`.length);
  if (chainRef.startsWith('0x')) {
    return caipChainId;
  }
  if (!/^\d+$/.test(chainRef)) {
    return caipChainId;
  }
  return `${KnownCaipNamespace.Tron}:0x${parseInt(chainRef, 10).toString(16)}`;
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
  scope: string;
  method: string;
  params: unknown;
}): SnapMappedRequest => {
  const adapter = getAdapter(splitNamespace(scope));
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
  scope: string;
  method: string;
  params: unknown;
  result: unknown;
}): unknown => {
  const adapter = getAdapter(splitNamespace(scope));
  return adapter
    ? adapter.normalizeSnapResponse({ method, params, result })
    : result;
};

/** Methods (across all chains) that should redirect the user back to the dapp. */
export const getRedirectMethodsForChain = (
  scope: string,
): readonly string[] => {
  const adapter = getAdapter(splitNamespace(scope));
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
