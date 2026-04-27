export type {
  ChainAdapter,
  NamespaceConfig,
  ProposalLike,
  RequestMapper,
  ResponseMapper,
  SnapMappedRequest,
} from './types';

export {
  getAdapter,
  getAdapterForCaipChainId,
  getAdapterForMethod,
  getAllAdapters,
  mapRequest,
  mapResponse,
  normalizeCaipChainId,
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

export {
  getChainChangedEmission,
  getEventEmissionChainId,
  shouldEmitChainChanged,
} from './emission';
export type {
  ChainChangedEmission,
  ChainChangedEmitDecision,
  ChainChangedSkipReason,
  EventChainEmission,
} from './emission';
