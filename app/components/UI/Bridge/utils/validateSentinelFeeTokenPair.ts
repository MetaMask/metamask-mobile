import { assetIdsMatch } from '@metamask/bridge-controller';
import {
  parseCaipAssetType,
  type CaipAssetType,
  type CaipChainId,
} from '@metamask/utils';
import type {
  SentinelFeeToken,
  SentinelFeeTokensByChain,
} from '../api/sentinelFeeTokens';

interface ValidateSentinelFeeTokenPairParams {
  sentinelFeeTokens: SentinelFeeTokensByChain;
  chainId: CaipChainId;
  sourceAssetId: CaipAssetType;
  destinationAssetId: CaipAssetType;
}

function tokenMatchesAsset(
  token: SentinelFeeToken,
  assetId: CaipAssetType,
  chainId: CaipChainId,
): boolean {
  if (assetIdsMatch(token.assetId, assetId)) return true;
  if (!token.aliasAddress) return false;

  const parsedAsset = parseCaipAssetType(assetId);
  return (
    parsedAsset.chainId === chainId &&
    parsedAsset.assetReference.toLowerCase() ===
      token.aliasAddress.toLowerCase()
  );
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
    (token) =>
      tokenMatchesAsset(token, sourceAssetId, chainId) ||
      tokenMatchesAsset(token, destinationAssetId, chainId),
  );
}
