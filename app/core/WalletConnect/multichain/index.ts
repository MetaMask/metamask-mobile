/**
 * Public barrel for the WalletConnect multichain adapter layer. The WC2
 * classes only depend on this entry point and never import a specific
 * chain directly.
 */
export {
  buildSessionPropertiesByAdapters,
  enrichCaveatValueByAdapters,
  getScopedPermissionsByAdapters,
  normalizeCaipChainIdInboundByAdapter,
  handleRequestByAdapter,
  isRedirectMethodByAdapterChain,
} from './helpers';
export {
  doesProposalIncludeNamespace,
  filterNamespacesByProposal,
  filterNamespacesBySession,
} from './utils';
export type {
  AdapterHandleRequestArgs,
  ChainAdapter,
  NamespaceConfig,
  ProposalParamsLight,
} from './types';
