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
  enrichCaveatValueWithAdapterPermissions,
  getAdaptersScopedPermissions,
  normalizeCaipChainIdInbound,
  normalizeCaipChainIdOutbound,
  normalizeCaipAccountIdInbound,
  normalizeCaipAccountIdOutbound,
  mapRequestInbound,
  mapRequestOutbound,
  getRedirectMethodsForChain,
  isRedirectMethodForChain,
} from './helpers';
export {
  collectRequestedChainsForNamespace,
  doesProposalIncludeNamespace,
  prioritizeSelectedNonEvmCaipAccountIds,
} from './utils';
export { callMultichainRoutingService } from './router';
export {
  getAdapter,
  getAllAdapters,
  getAllRegisteredNamespaces,
} from './registry';
export type {
  ChainAdapter,
  NamespaceConfig,
  ProposalParamsLight,
  SnapMappedRequest,
} from './types';
