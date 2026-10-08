import type { CaipAssetType, CaipChainId } from '@metamask/utils';

/**
 * Stable representation consumed by the Sentinel fee-token cache and
 * validators. The API adapter supplies placeholder symbols until Sentinel
 * returns token objects with real symbols.
 *
 * TODO: Replace this temporary model with the finalized Sentinel fee-token
 * response type once the backend contract is finalized.
 */
export interface SentinelFeeToken {
  assetId: CaipAssetType;
  symbol: string;
}

export type SentinelFeeTokensByChain = Partial<
  Record<CaipChainId, SentinelFeeToken[]>
>;
