import type { CaipAssetType, CaipChainId } from '@metamask/utils';

/**
 * Representation consumed by the Sentinel fee-token cache and validators,
 * normalized from the token objects returned by `GET /getSentinelFeeTokens`.
 */
export interface SentinelFeeToken {
  assetId: CaipAssetType;
  symbol: string;
}

export type SentinelFeeTokensByChain = Partial<
  Record<CaipChainId, SentinelFeeToken[]>
>;
