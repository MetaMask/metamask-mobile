/**
 * Public surface of the non-EVM multichain layer for WalletConnect.
 *
 * The main `WalletConnect2Session.ts` and `WalletConnectV2.ts` only ever
 * import from this index. New chains (Solana, Stellar, …) plug in via the
 * registry without touching the main code path.
 */

export {
  getAllNonEvmAdapters,
  getNonEvmAdapter,
  getNonEvmAdapterForCaipChainId,
  isNonEvmCaipChainId,
} from './registry';

export {
  addNonEvmNamespacesIfRequested,
  proposalReferencesNamespace,
} from './namespaces';

export { routeNonEvmToSnap } from './handle-request';

export type {
  MappedRequest,
  NamespaceConfig,
  NonEvmChainAdapter,
  NonEvmRoutingHost,
  NonEvmSessionRequest,
  ProposalLike,
} from './types';
