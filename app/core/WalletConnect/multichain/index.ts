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
  buildSessionPropertiesFromAdapters,
  enrichCaveatValueWithAdapterPermissions,
  filterNamespacesByProposal,
  getAdaptersScopedPermissions,
  normalizeCaipChainIdInbound,
  handleAdapterRequest,
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
  registerAdapter,
} from './registry';
export type {
  AdapterHandleRequestArgs,
  ChainAdapter,
  NamespaceConfig,
  ProposalParamsLight,
  SnapMappedRequest,
} from './types';
