export type {
  ChainAdapter,
  NamespaceConfig,
  ProposalLike,
  SnapMappedRequest,
} from './types';

export {
  getAdapter,
  getAdapterForCaipChainId,
  getAdapterForMethod,
  getAllAdapters,
} from './registry';

export {
  buildApprovedNamespaces,
  collectRequestedNamespaceKeys,
  filterToRequestedNamespaces,
  getRedirectMethodsForChain,
  isEmptyApprovedNamespaces,
  mergeApprovedWithSession,
  normalizeSessionNamespaces,
  resolveProposalNamespaceKey,
} from './namespaces';
export type { ApprovedNamespaces } from './namespaces';

export { getChainChangedEmission, shouldEmitChainChanged } from './emission';
export type {
  ChainChangedEmission,
  ChainChangedEmitDecision,
  ChainChangedSkipReason,
} from './emission';
