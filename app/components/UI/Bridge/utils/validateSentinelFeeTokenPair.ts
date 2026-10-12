import { assetIdsMatch } from '@metamask/bridge-controller';
import type { CaipAssetType, CaipChainId } from '@metamask/utils';
import type { SentinelFeeTokensByChain } from '../api/sentinelFeeTokens';

interface ValidateSentinelFeeTokenPairParams {
  sentinelFeeTokens: SentinelFeeTokensByChain;
  chainId: CaipChainId;
  sourceAssetId: CaipAssetType;
  destinationAssetId: CaipAssetType;
}

/**
 * Checks whether Sentinel can take its fee from either asset in an order.
 *
 * @param params - Sentinel tokens and the CAIP identifiers of the order pair.
 * @returns Whether Sentinel accepts the source or destination asset on the
 * order chain.
 */
export function validateSentinelFeeTokenPair({
  sentinelFeeTokens,
  chainId,
  sourceAssetId,
  destinationAssetId,
}: ValidateSentinelFeeTokenPairParams): boolean {
  const tokensForChain = sentinelFeeTokens[chainId] ?? [];

  return tokensForChain.some(
    ({ assetId }) =>
      assetIdsMatch(assetId, sourceAssetId) ||
      assetIdsMatch(assetId, destinationAssetId),
  );
}
