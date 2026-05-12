/**
 * Public entry point for the WalletConnect multichain adapter layer.
 *
 * This module re-exports the orchestration helpers used by the WC2
 * session classes and provides per-request dispatchers
 * (`mapRequestInbound` / `mapRequestOutbound`) that pick the right
 * adapter from the request scope's CAIP-2 namespace.
 *
 * The WC2 classes only depend on this barrel — they never import a
 * specific chain (`./tron`, `./solana`, ...) directly.
 */

export {
  seedAdapterPermissions,
  buildAdapterNamespaces,
  proposalReferencedAdapterNamespaces,
  buildAdapterScopedPermissionsNamespaces,
  normalizeCaipChainIdInbound,
  normalizeCaipChainIdOutbound,
  normalizeCaipAccountIdInbound,
  normalizeCaipAccountIdOutbound,
  mapRequestInbound,
  mapRequestOutbound,
  getRedirectMethodsForChain,
  isRedirectMethodForChain,
} from './helpers';
export { callMultichainRoutingService } from './router';
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
