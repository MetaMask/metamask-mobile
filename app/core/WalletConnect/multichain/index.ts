/**
 * Public barrel for the WalletConnect multichain adapter layer. The WC2
 * classes only depend on this entry point and never import a specific
 * chain directly.
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
